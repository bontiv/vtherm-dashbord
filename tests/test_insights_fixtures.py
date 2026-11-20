"""Run the rules of Versatile Thermostat that the setting insights port, and keep their results as fixtures for the TypeScript tests.

The functions of `frontend/src/insights/` port code of Versatile Thermostat (see `docs/contributing/setting-insights.md`). This test runs
that code from the folder of `VTHERM_VERSATILE_THERMOSTAT_DIR` on fixed cases and compares the results to the JSON files of `frontend/test/fixtures/insights/`, which
`frontend/test/insights-fixtures.test.ts` compares to the TypeScript functions. When this test fails after a change of
`external-refs.txt`, Versatile Thermostat changed a rule: read the difference, update the ported function, then write the new fixtures
with `UPDATE_INSIGHTS_FIXTURES=1 pytest tests/test_insights_fixtures.py` and commit them. A missing fixture is written.
"""

from __future__ import annotations

import importlib
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Any

import pytest

import custom_components

from .conftest import EXTERNAL_VTHERM, requires_vtherm

pytestmark = requires_vtherm

FIXTURES = Path(__file__).resolve().parent.parent / "frontend" / "test" / "fixtures" / "insights"
UPDATE = os.environ.get("UPDATE_INSIGHTS_FIXTURES") == "1"

START_MS = 1_767_600_000_000
"""2026-01-05T08:00:00Z, the start of the series of the fixtures, in milliseconds since the epoch."""


@pytest.fixture(name="vt", scope="module")
def vt_fixture():
    """The modules of Versatile Thermostat of the external folder, imported without Home Assistant running."""
    path = str(EXTERNAL_VTHERM)
    custom_components.__path__.append(path)
    try:
        names = ["const", "prop_algo_tpi", "cycle_scheduler", "ema", "open_window_algorithm", "vtherm_hvac_mode"]
        modules: dict[str, ModuleType] = {name: importlib.import_module(f"custom_components.versatile_thermostat.{name}") for name in names}
        yield SimpleNamespace(**modules)
    finally:
        # The path of a namespace package has no remove(): its list is private.
        custom_components.__path__._path = [entry for entry in custom_components.__path__._path if entry != path]  # pylint: disable=protected-access,no-member


def check_fixture(name: str, data: Any) -> None:
    """Compare the results to the fixture, or write it when it is missing or UPDATE_INSIGHTS_FIXTURES=1."""
    path = FIXTURES / name
    text = json.dumps(data, indent=2) + "\n"
    if UPDATE or not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    expected = json.loads(path.read_text(encoding="utf-8"))
    assert expected == json.loads(
        text
    ), f"Versatile Thermostat gives other results than {path.name}: read the difference, update frontend/src/insights/, then run with UPDATE_INSIGHTS_FIXTURES=1"


def at(ms: int) -> datetime:
    """A time of the fixtures as an aware datetime."""
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)


TPI_CASES: list[dict[str, Any]] = [
    # The detailed calculation of the spec, with and without minimal delays.
    {"name": "detailed", "coef_int": 0.6, "coef_ext": 0.01, "target": 20.5, "room": 19.5, "outdoor": 5.0, "slope": None, "cycle_min": 5, "min_on": 0, "min_off": 0},
    {"name": "detailed_with_delays", "coef_int": 0.6, "coef_ext": 0.01, "target": 20.5, "room": 19.5, "outdoor": 5.0, "slope": 0.4, "cycle_min": 10, "min_on": 30, "min_off": 30},
    {"name": "no_outdoor", "coef_int": 0.6, "coef_ext": 0.01, "target": 20.5, "room": 19.5, "outdoor": None, "slope": None, "cycle_min": 5, "min_on": 0, "min_off": 0},
    {"name": "too_short", "coef_int": 0.6, "coef_ext": 0.0, "target": 20.0, "room": 19.9, "outdoor": None, "slope": None, "cycle_min": 5, "min_on": 30, "min_off": 0},
    {
        "name": "off_too_short",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 21.0,
        "room": 19.9,
        "outdoor": 5.0,
        "slope": None,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 60,
        "max_on": None,
    },
    {"name": "capped_high", "coef_int": 0.6, "coef_ext": 0.01, "target": 22.0, "room": 19.0, "outdoor": -5.0, "slope": None, "cycle_min": 5, "min_on": 0, "min_off": 0},
    {"name": "capped_low", "coef_int": 0.6, "coef_ext": 0.01, "target": 19.0, "room": 21.0, "outdoor": 10.0, "slope": None, "cycle_min": 5, "min_on": 0, "min_off": 0},
    {"name": "max_on", "coef_int": 0.6, "coef_ext": 0.01, "target": 21.0, "room": 20.0, "outdoor": 0.0, "slope": None, "cycle_min": 5, "min_on": 0, "min_off": 0, "max_on": 0.5},
    {
        "name": "max_on_after_rounding",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 21.0,
        "room": 20.0,
        "outdoor": 0.0,
        "slope": None,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 0,
        "max_on": 0.555,
    },
    {
        "name": "threshold_stop",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 20.0,
        "room": 20.6,
        "outdoor": -20.0,
        "slope": 0.3,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 0,
        "low": 0.2,
        "high": 0.5,
    },
    {
        "name": "threshold_rising_below_high",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 20.0,
        "room": 20.4,
        "outdoor": 5.0,
        "slope": 0.3,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 0,
        "low": 0.2,
        "high": 0.5,
    },
    {
        "name": "threshold_hold",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 20.0,
        "room": 20.3,
        "outdoor": 5.0,
        "slope": -0.3,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 0,
        "low": 0.2,
        "high": 0.5,
    },
    {
        "name": "threshold_resume",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 20.0,
        "room": 20.1,
        "outdoor": 5.0,
        "slope": -0.3,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 0,
        "low": 0.2,
        "high": 0.5,
    },
    {
        "name": "threshold_flat",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 20.0,
        "room": 20.8,
        "outdoor": -40.0,
        "slope": 0.0,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 0,
        "low": 0.2,
        "high": 0.5,
    },
    {
        "name": "threshold_unknown_slope",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 20.0,
        "room": 20.8,
        "outdoor": -40.0,
        "slope": None,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 0,
        "low": 0.2,
        "high": 0.5,
    },
    {
        "name": "threshold_one_zero",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 20.0,
        "room": 20.6,
        "outdoor": -20.0,
        "slope": 0.3,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 0,
        "low": 0.0,
        "high": 0.5,
    },
    {"name": "cooling", "coef_int": 0.6, "coef_ext": 0.01, "target": 24.0, "room": 25.0, "outdoor": 32.0, "slope": 0.5, "cycle_min": 5, "min_on": 0, "min_off": 0, "cooling": True},
    {
        "name": "cooling_threshold",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 24.0,
        "room": 23.0,
        "outdoor": 32.0,
        "slope": -0.5,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 0,
        "cooling": True,
        "low": 0.2,
        "high": 0.5,
    },
    {"name": "rounding_tie", "coef_int": 0.125, "coef_ext": 0.0, "target": 21.0, "room": 20.0, "outdoor": None, "slope": None, "cycle_min": 8, "min_on": 0, "min_off": 0},
    {
        "name": "delays_longer_than_cycle",
        "coef_int": 0.6,
        "coef_ext": 0.01,
        "target": 18.0,
        "room": 21.0,
        "outdoor": 10.0,
        "slope": None,
        "cycle_min": 5,
        "min_on": 0,
        "min_off": 400,
    },
    {"name": "cycle_zero", "coef_int": 0.6, "coef_ext": 0.01, "target": 20.5, "room": 19.5, "outdoor": 5.0, "slope": None, "cycle_min": 0, "min_on": 0, "min_off": 0},
]


def run_tpi(vt: SimpleNamespace, case: dict[str, Any]) -> dict[str, Any]:
    """Run TpiAlgorithm, the clamp of ThermostatProp.on_percent and calculate_cycle_times on a case."""
    modes = vt.vtherm_hvac_mode
    max_on = case.get("max_on")
    low, high = case.get("low", 0.0), case.get("high", 0.0)
    # TPIHandler.init_algorithm: both thresholds are 0 when one is 0, no outdoor coefficient without outdoor sensor.
    if low == 0.0 or high == 0.0:
        low, high = 0.0, 0.0
    coef_ext = case["coef_ext"] if case["outdoor"] is not None else 0
    algo = vt.prop_algo_tpi.TpiAlgorithm(case["coef_int"], coef_ext, "climate.fixture", max_on_percent=max_on, tpi_threshold_low=low, tpi_threshold_high=high)
    mode = modes.VThermHvacMode_COOL if case.get("cooling") else modes.VThermHvacMode_HEAT
    algo.calculate(case["target"], case["room"], case["outdoor"], case["slope"], mode)
    on_percent = algo.on_percent
    # ThermostatProp.on_percent: clamp with max_on_percent again (issue 538 of Versatile Thermostat).
    if max_on is not None and on_percent > max_on:
        on_percent = max_on
    # BaseThermostat.post_init: cycle_min is at least 1.
    cycle_min = max(1, case["cycle_min"])
    on_sec, off_sec, forced = vt.cycle_scheduler.calculate_cycle_times(on_percent, cycle_min, case["min_on"], case["min_off"])
    return {"calculated_on_percent": algo.calculated_on_percent, "on_percent": on_percent, "on_time_sec": on_sec, "off_time_sec": off_sec, "forced_by_timing": forced}


def test_tpi_fixture(vt) -> None:
    """The share, the on and off times of TPI cases."""
    check_fixture("tpi.json", [{"input": case, "output": run_tpi(vt, case)} for case in TPI_CASES])


CYCLE_CASES = [
    (0.0, 5, 0, 0),
    (0.07, 5, 30, 0),
    (0.1, 5, 30, 0),
    (0.95, 5, 0, 30),
    (0.9, 5, 0, 30),
    (1.0, 5, 30, 30),
    (0.5, 10, 30, 30),
    (0.33, 7, 10, 10),
    (1.4, 5, 0, 0),
    (-0.2, 5, 0, 0),
    (0.0, 5, 0, 400),
    (0.76, 5, 0, 0),
    (0.29, 15, 0, 0),
]


def test_cycle_times_fixture(vt) -> None:
    """The on and off times of calculate_cycle_times, minimal delays included."""
    rows = []
    for on_percent, cycle_min, min_on, min_off in CYCLE_CASES:
        on_sec, off_sec, forced = vt.cycle_scheduler.calculate_cycle_times(on_percent, cycle_min, min_on, min_off)
        rows.append({"input": [on_percent, cycle_min, min_on, min_off], "output": [on_sec, off_sec, forced]})
    check_fixture("cycle-times.json", rows)


ROUNDING_VALUES = [0.125, 0.375, -0.125, 2.675, 1.005, 0.755, 0.285, 1e-10, -0.004, 12.345, 0.6 + 0.155, 0.1 + 0.2, 19.995, -3.465, 0.0]


def test_rounding_fixture() -> None:
    """Python's round(value, 2), which Versatile Thermostat applies to the share and the slope."""
    check_fixture("rounding.json", [[value, round(value, 2)] for value in ROUNDING_VALUES])


def room_series() -> list[list[float]]:
    """A room of 6 hours: steady, an aeration, a recovery, an aberrant point, a silence of 70 minutes and a slow drop."""
    points: list[list[float]] = []
    t = START_MS + 37_000
    temperature = 20.0
    step = 0
    while t < START_MS + 6 * 3_600_000:
        minute = (t - START_MS) / 60_000
        if 60 <= minute < 80:
            temperature -= 0.6  # an aeration: about -5 °C/h
        elif 80 <= minute < 140:
            temperature += 0.12
        elif minute >= 300:
            temperature -= 0.05
        elif not 200 <= minute < 270:
            temperature += 0.1 * math.sin(step)
        value = round(temperature, 1)
        if not 200 <= minute < 270:
            points.append([t, value])
        if step == 26:
            # A glitch of the sensor: VT ignores the slope above 120 °C/h that it gives, even after the smoothing.
            points.append([t + 61_000, value + 20.0])
            points.append([t + 122_000, value])
        t += 413_000
        step += 1
    return points


def slope_events(vt: SimpleNamespace, room: list[list[float]], ticks: list[int], thresholds: tuple[float, float]) -> list[dict[str, Any]]:
    """Feed the measurements and the cycles to the EMA and the window algorithm as BaseThermostat does, and record each evaluation."""
    params = vt.const.DEFAULT_SHORT_EMA_PARAMS
    ema = vt.ema.ExponentialMovingAverage("fixture", params.get("halflife_sec"), timezone.utc, params.get("precision"), params.get("max_alpha"))
    algo = vt.open_window_algorithm.WindowOpenDetectionAlgorithm(alert_threshold=thresholds[0], end_alert_threshold=thresholds[1])
    events = sorted([(int(t), "measure", v) for t, v in room] + [(tick, "cycle", None) for tick in ticks])
    ema_temperature = None
    rows = []
    for t, kind, value in events:
        if kind == "measure":
            # BaseThermostat._async_update_temp, then FeatureWindowManager.manage_window_auto(), then async_control_heating.
            ema_temperature = ema.calculate_ema(value, at(t))
            algo.add_temp_measurement(temperature=ema_temperature, datetime_measure=at(t))
        # FeatureWindowManager.manage_window_auto(in_cycle=True) in async_control_heating.
        algo.check_age_last_measurement(temperature=ema_temperature, datetime_now=at(t))
        nb_point = algo._nb_point  # pylint: disable=protected-access
        rows.append(
            {
                "t": t,
                "kind": kind,
                "ema": ema_temperature,
                "slope": algo.last_slope,
                "nb_point": nb_point,
                "open": algo.is_window_open_detected(),
                "close": algo.is_window_close_detected(),
            }
        )
    return rows


def test_slope_fixture(vt) -> None:
    """The EMA of the room temperature and the slope of the window detection, at each measurement and at each cycle."""
    cycle_ms = 5 * 60_000
    thresholds = (3.0, 0.0)
    room = room_series()
    end = START_MS + 6 * 3_600_000
    # The cycles every 5 minutes from the first measurement (async_track_time_interval of the thermostat), none at a measurement time.
    ticks = [room[0][0] + k * cycle_ms for k in range(1, (end - room[0][0]) // cycle_ms + 1)]
    assert not {int(t) for t, _ in room}.intersection(ticks), "a cycle falls on a measurement: change the series"
    rows = slope_events(vt, room, ticks, thresholds)
    check_fixture(
        "slope.json",
        {"cycle_min": 5, "open_threshold": thresholds[0], "close_threshold": thresholds[1], "start": START_MS, "end": end, "room": room, "events": rows},
    )


def test_constants_fixture(vt) -> None:
    """The constants of Versatile Thermostat that the TypeScript functions copy."""
    check_fixture(
        "constants.json",
        {
            "DEFAULT_SHORT_EMA_PARAMS": vt.const.DEFAULT_SHORT_EMA_PARAMS,
            "DEFAULT_SAFETY_MIN_ON_PERCENT": vt.const.DEFAULT_SAFETY_MIN_ON_PERCENT,
            "DEFAULT_SAFETY_DEFAULT_ON_PERCENT": vt.const.DEFAULT_SAFETY_DEFAULT_ON_PERCENT,
            "MIN_TIME_DECAY_SEC": vt.ema.MIN_TIME_DECAY_SEC,
            "MIN_DELTA_T_SEC": vt.open_window_algorithm.MIN_DELTA_T_SEC,
            "MAX_SLOPE_VALUE": vt.open_window_algorithm.MAX_SLOPE_VALUE,
            "MAX_DURATION_MIN": vt.open_window_algorithm.MAX_DURATION_MIN,
            "MIN_NB_POINT": vt.open_window_algorithm.MIN_NB_POINT,
        },
    )
