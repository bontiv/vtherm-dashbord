"""The script that fills the recorder of the development environment with a simulated week (scripts/dev/seed_history.py)."""

from __future__ import annotations

import fcntl
import importlib.util
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fnv_hash_fast import fnv1a_32
from homeassistant.components.recorder.db_schema import SCHEMA_VERSION, Base
from homeassistant.helpers.json import json_bytes
from sqlalchemy import create_engine

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "dev" / "seed_history.py"
END = datetime(2026, 11, 18, 9, 0, tzinfo=timezone.utc).timestamp()
START = END - 7 * 86400
CLIMATE = "climate.living_room"
ROOM = "sensor.room_temperature"
ARGUMENTS = [
    *("--climate", CLIMATE, "--room-sensor", ROOM, "--outdoor-sensor", "sensor.outdoor_temperature"),
    *("--end", "2026-11-18T09:00:00+00:00", "--time-zone", "Europe/Paris"),
]


def _load_script():
    """Import the script by its path: scripts/ is not a package."""
    spec = importlib.util.spec_from_file_location("seed_history", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


seed_history = _load_script()


def _insert_state(connection: sqlite3.Connection, metadata_id: int, moment: float, old_state_id: int | None) -> int:
    """Insert a row of the climate, as an existing history."""
    attributes_id = connection.execute("INSERT INTO state_attributes (hash, shared_attrs) VALUES (1, ?)", (f'{{"at":{moment}}}',)).lastrowid
    query = "INSERT INTO states (state, last_updated_ts, old_state_id, attributes_id, metadata_id) VALUES ('off', ?, ?, ?, ?)"
    return connection.execute(query, (moment, old_state_id, attributes_id, metadata_id)).lastrowid


@pytest.fixture(name="database")
def database_fixture(tmp_path: Path) -> Path:
    """A database with the schema of the recorder of the installed Home Assistant, and three rows of the climate.

    One row before the simulated period, one inside it and one after it.
    """
    path = tmp_path / "home-assistant_v2.db"
    engine = create_engine(f"sqlite:///{path}")
    Base.metadata.create_all(engine)
    engine.dispose()
    with sqlite3.connect(path) as connection:
        connection.execute("INSERT INTO schema_changes (schema_version, changed) VALUES (?, '2026-11-01 00:00:00')", (SCHEMA_VERSION,))
        metadata_id = connection.execute("INSERT INTO states_meta (entity_id) VALUES (?)", (CLIMATE,)).lastrowid
        before = _insert_state(connection, metadata_id, START - 3600, None)
        inside = _insert_state(connection, metadata_id, START + 3600, before)
        _insert_state(connection, metadata_id, END + 3600, inside)
    return path


def _rows(path: Path, entity_id: str) -> list[tuple]:
    """The rows of an entity, oldest first: id, state, last updated, last changed, old state id, attributes."""
    with sqlite3.connect(path) as connection:
        return connection.execute(
            "SELECT s.state_id, s.state, s.last_updated_ts, s.last_changed_ts, s.old_state_id, a.shared_attrs FROM states s "
            "JOIN states_meta m ON m.metadata_id = s.metadata_id LEFT JOIN state_attributes a ON a.attributes_id = s.attributes_id "
            "WHERE m.entity_id = ? ORDER BY s.last_updated_ts",
            (entity_id,),
        ).fetchall()


def test_the_week_is_written_with_the_two_aerations_and_the_silence(database: Path) -> None:
    """Each entity has rows over the week; the room sensor is silent once for 70 minutes; the slope shows the two aerations."""
    assert seed_history.main([*ARGUMENTS, "--db", str(database)]) == 0

    for entity_id in (CLIMATE, ROOM, "sensor.outdoor_temperature", "sensor.living_room_power_percent", "sensor.living_room_temperature_slope"):
        rows = _rows(database, entity_id)
        inside = [row for row in rows if START <= row[2] <= END]
        assert len(inside) > 500, entity_id
    room = [row[2] for row in _rows(database, ROOM)]
    long_gaps = [(later - earlier) / 60 for earlier, later in zip(room, room[1:]) if later - earlier >= 3600]
    assert len(long_gaps) == 1 and 70 <= long_gaps[0] < 78
    drops = [row[2] for row in _rows(database, "sensor.living_room_temperature_slope") if float(row[1]) < -3]
    episodes = [moment for index, moment in enumerate(drops) if index == 0 or moment - drops[index - 1] > 3600]
    assert len(episodes) == 2
    targets = {json.loads(row[5])["temperature"] for row in _rows(database, CLIMATE) if START <= row[2] <= END}
    assert targets == {seed_history.COMFORT, seed_history.ECO}


def test_the_rows_are_those_of_the_recorder(database: Path) -> None:
    """Attributes shared by hash, the chain of old states joined to the rows around the period, the rows inside it replaced."""
    assert seed_history.main([*ARGUMENTS, "--db", str(database)]) == 0

    with sqlite3.connect(database) as connection:
        assert not connection.execute("PRAGMA foreign_key_check").fetchall()
        for digest, shared in connection.execute("SELECT hash, shared_attrs FROM state_attributes WHERE hash != 1"):
            assert digest == fnv1a_32(shared.encode("utf-8"))
            assert shared == json_bytes(json.loads(shared)).decode("utf-8")
        assert not connection.execute("SELECT COUNT(*) FROM state_attributes WHERE hash = 1 AND shared_attrs LIKE ?", (f'{{"at":{START + 3600}}}',)).fetchone()[0]
    rows = _rows(database, CLIMATE)
    assert [row[2] for row in rows if START <= row[2] <= END and row[1] == "off"] == []
    assert rows[1][4] == rows[0][0] and rows[-1][4] == rows[-2][0]
    assert all(later[4] == earlier[0] for earlier, later in zip(rows, rows[1:]))
    seeded = [row for row in rows if START <= row[2] <= END]
    assert seeded[0][3] is None and all(row[3] == seeded[0][2] for row in seeded[1:])


def test_nothing_is_written_while_home_assistant_holds_its_lock(database: Path, capsys: pytest.CaptureFixture) -> None:
    """The lock file of Home Assistant next to the database is locked: the script refuses and writes nothing."""
    lock_path = database.parent / seed_history.LOCK_FILE_NAME
    lock_path.write_text('{"pid": 1}', encoding="utf-8")
    with lock_path.open(encoding="utf-8") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        assert seed_history.main([*ARGUMENTS, "--db", str(database)]) == 1
    assert "Home Assistant is running" in capsys.readouterr().err
    assert len(_rows(database, CLIMATE)) == 3

    assert seed_history.main([*ARGUMENTS, "--db", str(database)]) == 0
    assert len(_rows(database, CLIMATE)) > 3


def test_a_dry_run_writes_nothing(database: Path, capsys: pytest.CaptureFixture) -> None:
    """A dry run tells what it would write and replace."""
    assert seed_history.main([*ARGUMENTS, "--db", str(database), "--dry-run"]) == 0
    output = capsys.readouterr().out
    assert f"{CLIMATE}: would write" in output and "replace 1" in output
    assert len(_rows(database, CLIMATE)) == 3
    assert not _rows(database, ROOM)


def test_the_share_is_the_tpi_formula() -> None:
    """The simulated share of the case of the specification: 60 % for the room, 15.5 % for the outdoor."""
    assert seed_history.tpi_share(0.6, 0.01, 20.5, 19.5, 5.0) == pytest.approx(0.755)
    assert seed_history.tpi_share(0.6, 0.01, 20.0, 22.0, 5.0) == 0.0
    assert seed_history.tpi_share(0.6, 0.01, 20.0, 15.0, 5.0) == 1.0
