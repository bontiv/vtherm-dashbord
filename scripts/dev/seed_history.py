"""Fill the recorder database of the development Home Assistant with one simulated week of history for one thermostat.

The panels of estimation of the dashboard (TPI replay, replay of the open window detection, silences of the sensors) read the
history of the recorder. A fresh development instance has none, so this script writes one simulated week into its SQLite
database, for development and screenshots:

- the room temperature sensor, which follows a simple thermal model (losses to the outdoor, a radiator with some inertia);
- the outdoor temperature sensor, with a daily cycle and a slow drift over the week;
- the climate entity: its state (``heat``), its target temperature (attribute ``temperature``: comfort by day, eco by night),
  ``current_temperature``, ``hvac_action``, ``power_percent`` and, when the climate already recorded them, ``on_percent``,
  ``ema_temp``, ``preset_mode`` and the nested ``current_state``/``requested_state``;
- the sensor of the heating share of Versatile Thermostat, ``sensor.<name>_power_percent`` (state in %);
- the slope sensor of Versatile Thermostat, ``sensor.<name>_temperature_slope`` (°C/hour), unless ``--no-slope``.

The week contains two aerations (the room loses about 6 °C/hour for 15 and 12 minutes) and one silence of 70 minutes of the room
sensor (no state row at all). They are placed relative to the end of the period, so that the last 24 hours always show one aeration
and the silence: aerations at end - 4 days 2 hours and at end - 7 hours, silence at end - 14 hours.

The "recorded" heating share is NOT recorded by Versatile Thermostat: it is computed with the TPI formula, the same one as the
estimation of the dashboard (coef_int x (target - room) + coef_ext x (target - outdoor), clamped to 0..1, at the start of each cycle,
without the thresholds and the caps of Versatile Thermostat). The slope uses the formula of Versatile Thermostat
(open_window_algorithm.py). The script therefore serves development and screenshots: it does NOT validate the calculations of
the dashboard.

Rows are written as the recorder of Home Assistant 2026.10 (schema version 53, db_schema.py) writes them: one ``states_meta`` row
per entity, ``state_attributes`` shared by hash (FNV-1a 32 bits of the compact JSON), ``last_changed_ts`` empty when the state
changed with the row, ``last_reported_ts`` set on a row when a later report repeated it, the ``old_state_id`` chain of each entity,
a ULID context per row. Existing rows of these entities inside the simulated period are deleted and replaced; rows before and after
the period are kept, and the chain of ``old_state_id`` is joined to them.

Home Assistant must be stopped: the script takes the lock of Home Assistant (``.ha_run.lock`` next to the database, the one that
Home Assistant takes at its start) and refuses to write when it is held. ``--dry-run`` only reads the database and works while Home
Assistant runs. See docs/contributing/development-environment.md.
"""

from __future__ import annotations

import argparse
import copy
import fcntl
import json
import math
import random
import sqlite3
import sys
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

REPOSITORY = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE = REPOSITORY / "config" / "home-assistant_v2.db"
LOCK_FILE_NAME = ".ha_run.lock"
"""The lock file of Home Assistant (homeassistant/runner.py), in its configuration directory."""

SCHEMA_VERSION = 53
"""The version of the recorder schema that the script was written for (Home Assistant 2026.10)."""

REQUIRED_COLUMNS = {
    "states": {
        "state_id",
        "state",
        "last_changed_ts",
        "last_reported_ts",
        "last_updated_ts",
        "old_state_id",
        "attributes_id",
        "origin_idx",
        "context_id_bin",
        "metadata_id",
    },
    "state_attributes": {"attributes_id", "hash", "shared_attrs"},
    "states_meta": {"metadata_id", "entity_id"},
}

MINUTE = 60.0
HOUR = 3600.0
DAY = 86400.0

STEP = 30.0
"""Step of the thermal model, in seconds."""
BURN_IN = DAY
"""The model runs this long before the period, so that the room and the radiator start in a steady state."""

LOSS_PER_HOUR = 0.1
"""Losses of the room to the outdoor, per hour and per degree of difference."""
WINDOW_LOSS_PER_HOUR = 0.45
"""Additional losses while a window is open."""
HEATER_GAIN = 6.0
"""Degrees per hour that the radiator gives at full power."""
RADIATOR_TAU_HOURS = 0.35
"""Time constant of the radiator: the room keeps heating a little after the heater stops."""
DAY_GAIN = 0.15
"""Degrees per hour that the occupants and the appliances give by day."""

COMFORT = 20.0
ECO = 17.0
ROOM_REPORT = (180.0, 420.0)
OUTDOOR_REPORT = (600.0, 900.0)

FNV_OFFSET = 0x811C9DC5
FNV_PRIME = 0x01000193

CLIMATE_KEYS = ("current_temperature", "temperature", "hvac_action", "power_percent")
"""Attributes that the simulated climate always has; the other simulated attributes are written only when the climate had them."""


class SeedError(Exception):
    """An error that stops the script, with a message for the user."""


@dataclass(frozen=True)
class Entities:
    """The entities that the script writes, by role."""

    climate: str
    room: str
    outdoor: str
    power: str
    slope: str | None

    def by_role(self) -> dict[str, str]:
        """The entity of each role, without the slope when it is disabled."""
        roles = {"climate": self.climate, "room": self.room, "outdoor": self.outdoor, "power": self.power}
        if self.slope:
            roles["slope"] = self.slope
        return roles


@dataclass(frozen=True)
class Settings:
    """The settings of the simulation."""

    start: float
    end: float
    zone: ZoneInfo
    coef_int: float
    coef_ext: float
    cycle: float


@dataclass(frozen=True)
class Episode:
    """A simulated event: an aeration (a window open) or a silence of the room sensor."""

    kind: str
    start: float
    end: float

    def contains(self, moment: float) -> bool:
        """True while the event lasts."""
        return self.start <= moment < self.end


@dataclass
class Report:
    """A state that an entity reports: a new row, or a repetition of the last one."""

    moment: float
    state: str
    attributes: dict


@dataclass
class Row:
    """A row of the table ``states``, made of the reports of one state."""

    updated: float
    changed: float
    reported: float
    state: str
    attributes: dict


@dataclass
class Room:
    """The thermal model of the room: its temperature and the output of its radiator (0..1)."""

    temperature: float
    radiator: float = 0.0

    def step(self, hours: float, heating: bool, outdoor: float, window_open: bool, gain: float) -> None:
        """Advance the model by a few seconds."""
        self.radiator += ((1.0 if heating else 0.0) - self.radiator) * hours / RADIATOR_TAU_HOURS
        loss = LOSS_PER_HOUR + (WINDOW_LOSS_PER_HOUR if window_open else 0.0)
        self.temperature += (HEATER_GAIN * self.radiator - loss * (self.temperature - outdoor) + gain) * hours


@dataclass
class Slope:
    """The slope of the room temperature, computed like WindowOpenDetectionAlgorithm.add_temp_measurement of Versatile Thermostat."""

    moment: float | None = None
    temperature: float | None = None
    value: float | None = None

    def add(self, moment: float, temperature: float) -> float | None:
        """Add a measurement and return the slope in °C/hour."""
        if self.moment is None or self.temperature is None:
            self.moment, self.temperature = moment, temperature
            return None
        delta_hours = (moment - self.moment) / HOUR
        if delta_hours <= 0:
            return self.value
        new_slope = (temperature - self.temperature) / delta_hours
        if abs(new_slope) > 120:
            return self.value
        self.value = round(new_slope, 2) if self.value is None else round(0.2 * self.value + 0.8 * new_slope, 2)
        self.moment, self.temperature = moment, temperature
        return self.value


@dataclass
class Observed:
    """What Versatile Thermostat sees: the last reported temperatures, the target and the heating share of the cycle."""

    room: float = COMFORT
    outdoor: float = 5.0
    target: float = COMFORT
    on_percent: float = 0.0
    heat_until: float = 0.0
    slope: Slope = field(default_factory=Slope)


def tpi_share(coef_int: float, coef_ext: float, target: float, room: float, outdoor: float) -> float:
    """The heating share of the TPI: coef_int x (target - room) + coef_ext x (target - outdoor), clamped to 0..1.

    The same formula as the estimation of the dashboard, without the thresholds and the caps of Versatile Thermostat (prop_algo_tpi.py).
    """
    return min(1.0, max(0.0, coef_int * (target - room) + coef_ext * (target - outdoor)))


def target_at(moment: float, zone: ZoneInfo) -> float:
    """The target of the schedule: comfort from 6:30 (8:00 on weekends) to 22:30, eco at night."""
    local = datetime.fromtimestamp(moment, zone)
    hour = local.hour + local.minute / 60.0
    morning = 8.0 if local.weekday() >= 5 else 6.5
    return COMFORT if morning <= hour < 22.5 else ECO


def outdoor_at(moment: float, settings: Settings) -> float:
    """The outdoor temperature: 5 °C, a drift of ±3 °C over the week and a daily cycle of ±4 °C, warmest at 15:00."""
    local = datetime.fromtimestamp(moment, settings.zone)
    hour = local.hour + local.minute / 60.0
    drift = 3.0 * math.sin(2.0 * math.pi * (moment - settings.start) / (7.0 * DAY))
    return 5.0 + drift + 4.0 * math.cos(2.0 * math.pi * (hour - 15.0) / 24.0)


def plan_episodes(start: float, end: float) -> list[Episode]:
    """The aerations and the silence, relative to the end of the period; those before its start are left out."""
    candidates = [
        Episode("aeration", end - 4 * DAY - 2 * HOUR, end - 4 * DAY - 2 * HOUR + 15 * MINUTE),
        Episode("silence", end - 14 * HOUR, end - 14 * HOUR + 70 * MINUTE),
        Episode("aeration", end - 7 * HOUR, end - 7 * HOUR + 12 * MINUTE),
    ]
    return [episode for episode in candidates if episode.start >= start]


def climate_attributes(template: dict, observed: Observed, preset: str) -> dict:
    """The attributes of the climate: those it recorded last, with the simulated values."""
    attributes = copy.deepcopy(template)
    power_percent = round(observed.on_percent * 100.0, 0)
    values = {
        "current_temperature": observed.room,
        "temperature": observed.target,
        "hvac_action": "heating" if observed.on_percent > 0 else "idle",
        "preset_mode": preset,
        "hvac_mode": "heat",
        "ema_temp": observed.room,
        "on_percent": round(observed.on_percent, 4),
        "power_percent": power_percent,
    }
    for key, value in values.items():
        if key in attributes or key in CLIMATE_KEYS:
            attributes[key] = value
    nested = {"hvac_mode": "heat", "target_temperature": observed.target, "preset": preset}
    for name in ("current_state", "requested_state"):
        if isinstance(attributes.get(name), dict):
            attributes[name].update({key: value for key, value in nested.items() if key in attributes[name]})
    return attributes


def slope_attributes(template: dict, slope: float) -> dict:
    """The attributes of the slope sensor, with its icon that follows the sign of the slope, as in Versatile Thermostat."""
    attributes = dict(template)
    if "icon" in attributes:
        attributes["icon"] = "mdi:thermometer" if slope == 0 else "mdi:thermometer-chevron-up" if slope > 0 else "mdi:thermometer-chevron-down"
    return attributes


class Simulator:
    """Runs the thermal model and collects the reports of each role."""

    def __init__(self, settings: Settings, templates: dict[str, dict], seed: int) -> None:
        self.settings = settings
        self.templates = templates
        self.rng = random.Random(seed)
        self.episodes = plan_episodes(settings.start, settings.end)
        self.room = Room(temperature=ECO)
        self.observed = Observed()
        self.reports: dict[str, list[Report]] = {role: [] for role in ("climate", "room", "outdoor", "power", "slope")}

    def run(self) -> dict[str, list[Report]]:
        """Simulate the period and return the reports of each role, oldest first."""
        moment = self.settings.start - BURN_IN
        next_cycle = next_room = next_outdoor = moment
        while moment <= self.settings.end:
            outdoor = outdoor_at(moment, self.settings)
            if moment >= next_outdoor:
                self.report_outdoor(moment, outdoor)
                next_outdoor += self.rng.uniform(*OUTDOOR_REPORT)
            if moment >= next_room:
                if not self.during("silence", moment):
                    self.report_room(moment)
                next_room += self.rng.uniform(*ROOM_REPORT)
            target = target_at(moment, self.settings.zone)
            if target != self.observed.target:
                self.observed.target = target
                self.report_climate(moment)
            if moment >= next_cycle:
                self.start_cycle(moment)
                next_cycle += self.settings.cycle
            local_hour = datetime.fromtimestamp(moment, self.settings.zone).hour
            gain = DAY_GAIN if 7 <= local_hour < 23 else 0.0
            self.room.step(STEP / HOUR, moment < self.observed.heat_until, outdoor, self.during("aeration", moment), gain)
            moment += STEP
        return self.reports

    def during(self, kind: str, moment: float) -> bool:
        """True during an event of this kind."""
        return any(episode.kind == kind and episode.contains(moment) for episode in self.episodes)

    def emit(self, role: str, moment: float, state: str, attributes: dict) -> None:
        """Keep a report, when it is inside the period."""
        if self.settings.start <= moment <= self.settings.end:
            self.reports[role].append(Report(moment, state, attributes))

    def report_outdoor(self, moment: float, outdoor: float) -> None:
        """The outdoor sensor reports its temperature."""
        self.observed.outdoor = round(outdoor + self.rng.gauss(0.0, 0.05), 2)
        self.emit("outdoor", moment + self.rng.random(), str(self.observed.outdoor), self.templates["outdoor"])

    def report_room(self, moment: float) -> None:
        """The room sensor reports its temperature; Versatile Thermostat updates the climate and the slope."""
        reported = moment + self.rng.random()
        self.observed.room = round(self.room.temperature + self.rng.gauss(0.0, 0.02), 2)
        self.emit("room", reported, str(self.observed.room), self.templates["room"])
        slope = self.observed.slope.add(reported, self.observed.room)
        self.report_climate(reported + 0.01)
        if slope is not None:
            self.emit("slope", reported + 0.02, str(slope), slope_attributes(self.templates["slope"], slope))

    def report_climate(self, moment: float) -> None:
        """The climate reports its state and its attributes."""
        preset = "comfort" if self.observed.target == COMFORT else "eco"
        self.emit("climate", moment, "heat", climate_attributes(self.templates["climate"], self.observed, preset))

    def start_cycle(self, moment: float) -> None:
        """A new cycle: the heating share is computed with the TPI formula and the heater runs for its part of the cycle."""
        observed = self.observed
        observed.on_percent = tpi_share(self.settings.coef_int, self.settings.coef_ext, observed.target, observed.room, observed.outdoor)
        observed.heat_until = moment + observed.on_percent * self.settings.cycle
        self.report_climate(moment)
        self.emit("power", moment + 0.01, str(round(observed.on_percent * 100.0, 1)), self.templates["power"])


def collapse(reports: list[Report]) -> list[Row]:
    """Turn reports into rows: a report that repeats the state and the attributes of the last row only updates its last report."""
    rows: list[Row] = []
    for report in sorted(reports, key=lambda item: item.moment):
        last = rows[-1] if rows else None
        if last is not None and last.state == report.state and last.attributes == report.attributes:
            last.reported = report.moment
            continue
        changed = last.changed if last is not None and last.state == report.state else report.moment
        rows.append(Row(report.moment, changed, report.moment, report.state, report.attributes))
    return rows


def fnv1a_32(data: bytes) -> int:
    """FNV-1a on 32 bits, the hash of ``state_attributes`` (fnv_hash_fast.fnv1a_32 in Home Assistant)."""
    value = FNV_OFFSET
    for byte in data:
        value = ((value ^ byte) * FNV_PRIME) & 0xFFFFFFFF
    return value


def shared_attributes(attributes: dict) -> str:
    """The attributes as the recorder stores them: compact JSON, in UTF-8 (homeassistant.helpers.json.json_bytes)."""
    return json.dumps(attributes, separators=(",", ":"), ensure_ascii=False)


def ulid_bytes(moment: float, rng: random.Random) -> bytes:
    """A ULID for the context of a row: 48 bits of milliseconds and 80 random bits, as Home Assistant stores it (context_id_bin)."""
    return int(moment * 1000).to_bytes(6, "big") + rng.randbytes(10)


def chunks(values: list[int], size: int = 500) -> Iterator[list[int]]:
    """Split a list of identifiers for the IN clauses of SQLite."""
    for index in range(0, len(values), size):
        yield values[index : index + size]


class RecorderWriter:
    """Reads and writes the tables of the recorder."""

    def __init__(self, connection: sqlite3.Connection, rng: random.Random) -> None:
        self.connection = connection
        self.rng = rng
        self.attribute_ids: dict[str, int] = {}

    def check_schema(self) -> None:
        """Refuse a database without the columns that the script writes; warn when the schema version is not the expected one."""
        for table, columns in REQUIRED_COLUMNS.items():
            found = {row[1] for row in self.connection.execute(f"PRAGMA table_info({table})")}
            if missing := columns - found:
                raise SeedError(f"The table {table} has no column {', '.join(sorted(missing))}: is it a database of the recorder of Home Assistant?")
        version = self.connection.execute("SELECT MAX(schema_version) FROM schema_changes").fetchone()[0]
        if version != SCHEMA_VERSION:
            print(f"Warning: the recorder schema is version {version}, the script was written for version {SCHEMA_VERSION}.", file=sys.stderr)

    def metadata_id(self, entity_id: str, create: bool = True) -> int | None:
        """The identifier of the entity in ``states_meta``, created when it is missing."""
        row = self.connection.execute("SELECT metadata_id FROM states_meta WHERE entity_id = ?", (entity_id,)).fetchone()
        if row is not None:
            return row[0]
        if not create:
            return None
        return self.connection.execute("INSERT INTO states_meta (entity_id) VALUES (?)", (entity_id,)).lastrowid

    def latest_attributes(self, entity_id: str) -> dict | None:
        """The attributes of the last row of the entity, if it has one."""
        row = self.connection.execute(
            "SELECT a.shared_attrs FROM states s JOIN states_meta m ON m.metadata_id = s.metadata_id "
            "JOIN state_attributes a ON a.attributes_id = s.attributes_id WHERE m.entity_id = ? ORDER BY s.last_updated_ts DESC LIMIT 1",
            (entity_id,),
        ).fetchone()
        return json.loads(row[0]) if row and row[0] else None

    def count_rows(self, entity_id: str, start: float, end: float) -> int:
        """The number of rows of the entity inside the period."""
        metadata_id = self.metadata_id(entity_id, create=False)
        if metadata_id is None:
            return 0
        query = "SELECT COUNT(*) FROM states WHERE metadata_id = ? AND last_updated_ts BETWEEN ? AND ?"
        return self.connection.execute(query, (metadata_id, start, end)).fetchone()[0]

    def attributes_id(self, attributes: dict) -> int:
        """The identifier of these attributes in ``state_attributes``: an existing row with the same hash and content, or a new one."""
        shared = shared_attributes(attributes)
        if shared in self.attribute_ids:
            return self.attribute_ids[shared]
        digest = fnv1a_32(shared.encode("utf-8"))
        for attributes_id, existing in self.connection.execute("SELECT attributes_id, shared_attrs FROM state_attributes WHERE hash = ?", (digest,)):
            if existing == shared:
                self.attribute_ids[shared] = attributes_id
                return attributes_id
        attributes_id = self.connection.execute("INSERT INTO state_attributes (hash, shared_attrs) VALUES (?, ?)", (digest, shared)).lastrowid
        self.attribute_ids[shared] = attributes_id
        return attributes_id

    def replace(self, entity_id: str, rows: list[Row], start: float, end: float) -> int:
        """Replace the rows of the entity inside the period by these rows, and return the number of rows deleted."""
        metadata_id = self.metadata_id(entity_id)
        old = self.connection.execute("SELECT state_id, attributes_id FROM states WHERE metadata_id = ? AND last_updated_ts BETWEEN ? AND ?", (metadata_id, start, end)).fetchall()
        previous = self.neighbour(metadata_id, "last_updated_ts < ? ORDER BY last_updated_ts DESC", start)
        last_id = self.insert(metadata_id, rows, previous)
        following = self.neighbour(metadata_id, "last_updated_ts > ? ORDER BY last_updated_ts", end)
        if following is not None:
            self.connection.execute("UPDATE states SET old_state_id = ? WHERE state_id = ?", (last_id, following))
        self.delete(old)
        return len(old)

    def neighbour(self, metadata_id: int, condition: str, moment: float) -> int | None:
        """The row of the entity just before or just after the period."""
        row = self.connection.execute(f"SELECT state_id FROM states WHERE metadata_id = ? AND {condition} LIMIT 1", (metadata_id, moment)).fetchone()
        return row[0] if row else None

    def insert(self, metadata_id: int, rows: list[Row], previous: int | None) -> int | None:
        """Insert the rows of an entity, each one linked to the one before, and return the identifier of the last one.

        As the recorder does, a row gets ``last_reported_ts`` from its last report when a later row follows it or when a report
        repeated it, and ``last_changed_ts`` only when its state did not change with it.
        """
        last_id = previous
        for index, row in enumerate(rows):
            final = index == len(rows) - 1
            reported = None if final and row.reported == row.updated else row.reported
            changed = None if row.changed == row.updated else row.changed
            values = (row.state, changed, reported, row.updated, last_id, self.attributes_id(row.attributes), ulid_bytes(row.updated, self.rng), metadata_id)
            last_id = self.connection.execute(
                "INSERT INTO states (state, last_changed_ts, last_reported_ts, last_updated_ts, old_state_id, attributes_id, origin_idx, context_id_bin, metadata_id) "
                "VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)",
                values,
            ).lastrowid
        return last_id

    def delete(self, old: list[tuple[int, int | None]]) -> None:
        """Delete these rows, the links to them and the attributes that no row uses any more."""
        for ids in chunks([state_id for state_id, _ in old]):
            marks = ", ".join("?" * len(ids))
            self.connection.execute(f"UPDATE states SET old_state_id = NULL WHERE old_state_id IN ({marks})", ids)
            self.connection.execute(f"DELETE FROM states WHERE state_id IN ({marks})", ids)
        attribute_ids = sorted({attributes_id for _, attributes_id in old if attributes_id is not None})
        for ids in chunks(attribute_ids):
            marks = ", ".join("?" * len(ids))
            self.connection.execute(
                f"DELETE FROM state_attributes WHERE attributes_id IN ({marks}) "
                "AND NOT EXISTS (SELECT 1 FROM states WHERE states.attributes_id = state_attributes.attributes_id)",
                ids,
            )


def default_templates(entities: Entities) -> dict[str, dict]:
    """The attributes of each role for an entity that has no row yet."""

    def name(entity_id: str) -> str:
        return entity_id.split(".", 1)[1].replace("_", " ").capitalize()

    temperature = {"state_class": "measurement", "unit_of_measurement": "°C", "device_class": "temperature"}
    return {
        "climate": {"hvac_action": "idle", "friendly_name": name(entities.climate)},
        "room": {**temperature, "friendly_name": name(entities.room)},
        "outdoor": {**temperature, "friendly_name": name(entities.outdoor)},
        "power": {
            "state_class": "measurement",
            "unit_of_measurement": "%",
            "device_class": "power_factor",
            "icon": "mdi:meter-electric-outline",
            "friendly_name": name(entities.power),
        },
        "slope": {"state_class": "measurement", "unit_of_measurement": "°C/hour", "icon": "mdi:thermometer", "friendly_name": name(entities.slope or "sensor.slope")},
    }


def read_templates(writer: RecorderWriter, entities: Entities) -> dict[str, dict]:
    """The attributes of each role: those of the last row of the entity, or default ones."""
    templates = default_templates(entities)
    for role, entity_id in entities.by_role().items():
        if (recorded := writer.latest_attributes(entity_id)) is not None:
            templates[role] = recorded
    return templates


@contextmanager
def home_assistant_stopped(database: Path) -> Iterator[None]:
    """Hold the lock of Home Assistant while the database is written, and refuse when Home Assistant holds it.

    Home Assistant takes an exclusive ``flock`` on ``.ha_run.lock`` in its configuration directory for as long as it runs
    (homeassistant/runner.py, ensure_single_execution). Holding it here also stops Home Assistant from starting meanwhile.
    """
    lock_path = database.parent / LOCK_FILE_NAME
    if not lock_path.exists():
        yield
        return
    with lock_path.open(encoding="utf-8") as lock_file:
        try:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            details = lock_path.read_text(encoding="utf-8").strip()
            raise SeedError(
                f"Home Assistant is running ({lock_path} is locked: {details}). Stop it first (Ctrl+C in the terminal of "
                "bash .devcontainer/start-ha.sh), run the script again, then start Home Assistant again. Nothing was written."
            ) from error
        try:
            yield
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def read_time_zone(database: Path) -> str:
    """The time zone of Home Assistant (.storage/core.config next to the database), or UTC."""
    try:
        return json.loads((database.parent / ".storage" / "core.config").read_text(encoding="utf-8"))["data"]["time_zone"]
    except (OSError, ValueError, KeyError, TypeError):
        return "UTC"


def entity_argument(value: str) -> str:
    """An argument that must be an entity identifier."""
    domain, _, object_id = value.partition(".")
    if not domain or not object_id:
        raise argparse.ArgumentTypeError(f"{value!r} is not an entity identifier (domain.object_id)")
    return value


def parse_arguments(argv: list[str] | None) -> argparse.Namespace:
    """The command line."""
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0], formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("--climate", required=True, type=entity_argument, help="the climate entity of the thermostat, e.g. climate.living_room")
    parser.add_argument("--room-sensor", required=True, type=entity_argument, help="the room temperature sensor of the thermostat")
    parser.add_argument("--outdoor-sensor", required=True, type=entity_argument, help="the outdoor temperature sensor of the thermostat")
    parser.add_argument("--power-sensor", type=entity_argument, help="the heating share sensor (default: sensor.<name>_power_percent)")
    parser.add_argument("--slope-sensor", type=entity_argument, help="the slope sensor (default: sensor.<name>_temperature_slope)")
    parser.add_argument("--no-slope", action="store_true", help="do not write the slope sensor")
    parser.add_argument("--db", type=Path, default=DEFAULT_DATABASE, help="the SQLite database of the recorder")
    parser.add_argument("--end", help="the end of the simulated period, ISO 8601 (default: now); without offset, in the time zone of Home Assistant")
    parser.add_argument("--days", type=float, default=7.0, help="the length of the simulated period, in days")
    parser.add_argument("--time-zone", help="the time zone of the schedule (default: the one of Home Assistant, from .storage/core.config)")
    parser.add_argument("--coef-int", type=float, default=0.6, help="coef_int of the TPI formula of the simulated heating share")
    parser.add_argument("--coef-ext", type=float, default=0.01, help="coef_ext of the TPI formula of the simulated heating share")
    parser.add_argument("--cycle-min", type=float, default=5.0, help="the length of a TPI cycle, in minutes")
    parser.add_argument("--seed", type=int, default=1, help="the seed of the random noise, for a reproducible week")
    parser.add_argument("--dry-run", action="store_true", help="only read the database and print what would be written")
    return parser.parse_args(argv)


def build_settings(arguments: argparse.Namespace) -> Settings:
    """The period and the settings of the simulation."""
    zone = ZoneInfo(arguments.time_zone or read_time_zone(arguments.db))
    if arguments.end:
        end_time = datetime.fromisoformat(arguments.end)
        end = (end_time if end_time.tzinfo else end_time.replace(tzinfo=zone)).timestamp()
    else:
        end = time.time()
    if arguments.days <= 0 or arguments.cycle_min <= 0:
        raise SeedError("--days and --cycle-min must be positive.")
    return Settings(end - arguments.days * DAY, end, zone, arguments.coef_int, arguments.coef_ext, arguments.cycle_min * MINUTE)


def build_entities(arguments: argparse.Namespace) -> Entities:
    """The entities to write, with the sensors of Versatile Thermostat named after the climate by default."""
    name = arguments.climate.split(".", 1)[1]
    slope = None if arguments.no_slope else arguments.slope_sensor or f"sensor.{name}_temperature_slope"
    return Entities(arguments.climate, arguments.room_sensor, arguments.outdoor_sensor, arguments.power_sensor or f"sensor.{name}_power_percent", slope)


def connect(database: Path, read_only: bool) -> sqlite3.Connection:
    """Open the database; read-only for a dry run."""
    if not database.is_file():
        raise SeedError(f"No database at {database}: start Home Assistant once to create it, or give --db.")
    if read_only:
        return sqlite3.connect(f"file:{database}?mode=ro", uri=True)
    connection = sqlite3.connect(database)
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def describe(settings: Settings, episodes: list[Episode], room: str) -> list[str]:
    """The period and the events, in the time zone of the schedule."""

    def local(moment: float) -> str:
        return datetime.fromtimestamp(moment, settings.zone).strftime("%Y-%m-%d %H:%M")

    lines = [f"Simulated period: {local(settings.start)} to {local(settings.end)} ({settings.zone.key})"]
    for episode in episodes:
        what = f"silence of {room}" if episode.kind == "silence" else "aeration"
        lines.append(f"  {what}: {local(episode.start)} to {local(episode.end)} ({round((episode.end - episode.start) / MINUTE)} min)")
    return lines


def write_week(arguments: argparse.Namespace) -> list[str]:
    """Simulate the week and write it, or only describe it for a dry run; return the lines of the summary."""
    settings = build_settings(arguments)
    entities = build_entities(arguments)
    connection = connect(arguments.db, arguments.dry_run)
    try:
        writer = RecorderWriter(connection, random.Random(arguments.seed))
        writer.check_schema()
        simulator = Simulator(settings, read_templates(writer, entities), arguments.seed)
        reports = simulator.run()
        lines = describe(settings, simulator.episodes, entities.room)
        for role, entity in entities.by_role().items():
            rows = collapse(reports[role])
            if arguments.dry_run:
                lines.append(f"{entity}: would write {len(rows)} rows and replace {writer.count_rows(entity, settings.start, settings.end)}")
            else:
                deleted = writer.replace(entity, rows, settings.start, settings.end)
                lines.append(f"{entity}: wrote {len(rows)} rows, replaced {deleted}")
        connection.commit()
    finally:
        connection.close()
    return lines


def main(argv: list[str] | None = None) -> int:
    """Run the script; return the exit code."""
    arguments = parse_arguments(argv)
    try:
        if arguments.dry_run:
            lines = write_week(arguments)
        else:
            with home_assistant_stopped(arguments.db):
                lines = write_week(arguments)
    except (SeedError, sqlite3.Error, ValueError, ZoneInfoNotFoundError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print("\n".join(lines))
    if arguments.dry_run:
        print("Dry run: nothing was written.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
