# Setting insights: the ported rules of Versatile Thermostat
Audience: contributors.

The panels "What VT would do with these settings" of the tabs TPI, open window and advanced replay rules of Versatile Thermostat on the
recorded history of a thermostat. The rules are ported to TypeScript in `frontend/src/insights/`, as pure functions (no DOM, no Lit, no
Home Assistant), from the reference version of Versatile Thermostat named in `external-refs.txt` and checked out in `external/`. This page
lists what is ported from where, how the port is checked against the Python code, and what to do when the reference version changes.

## Conventions
- Times are milliseconds since the epoch, temperatures are in the unit of Home Assistant, shares are fractions 0..1, slopes are in
  degrees per hour.
- A series is a list of samples `{ t, v }` sorted by time, read as a step function: a value holds until the next sample, as Home Assistant
  records a state only when it changes.
- Each function cites, in its comment, the file and the function of Versatile Thermostat that it ports, and the rules it leaves out.
- Python's `round(value, 2)`, which Versatile Thermostat applies to the share and to the slope, rounds an exact tie to the even digit.
  `pyRound` reproduces it; do not replace it by `Math.round` or `toFixed`.

## The ported functions
| TypeScript (`frontend/src/insights/`) | Versatile Thermostat (`custom_components/versatile_thermostat/`) | Covered by fixtures |
| --- | --- | --- |
| `tpiDecision` (`tpi.ts`) | `prop_algo_tpi.py`: `TpiAlgorithm.calculate`, `TpiAlgorithm.on_percent`; `prop_handler_tpi.py`: `TPIHandler.init_algorithm` (thresholds, no outdoor sensor); `thermostat_prop.py`: `ThermostatProp.on_percent` (`max_on_percent`); `base_thermostat.py`: `post_init` (`cycle_min` at least 1); `cycle_scheduler.py`: `CycleScheduler.start_cycle` (share realized by a switch, valve) | Yes, `tpi.json` |
| `cycleTimes` (`tpi.ts`) | `cycle_scheduler.py`: `calculate_cycle_times` | Yes, `cycle-times.json` |
| `tpiHistory` (`tpi.ts`) | `tpiDecision` at each cycle; the slope of `slopeHistory` when no recorded slope is given | Through `tpiDecision` |
| `ExponentialMovingAverage` (`slope.ts`) | `ema.py`: `ExponentialMovingAverage.calculate_ema`, with `DEFAULT_SHORT_EMA_PARAMS` of `const.py` | Yes, `slope.json` |
| `WindowOpenDetectionAlgorithm` (`slope.ts`) | `open_window_algorithm.py`: `add_temp_measurement`, `check_age_last_measurement`, `is_window_open_detected`, `is_window_close_detected` | Yes, `slope.json` |
| `slopeHistory` (`slope.ts`) | `base_thermostat.py`: `_async_update_temp` and `async_control_heating`; `feature_window_manager.py`: `manage_window_auto` (the order of the calls) | Yes, `slope.json` |
| `windowDetections` (`window.ts`) | `feature_window_manager.py`: `post_init` (when the detection is configured), `manage_window_auto` (opening, closing, maximal duration, no heating) | Openings and closings, through the flags of `slope.json`; the maximal duration by unit tests only |
| `sensorGaps`, `safetyShareCondition` (`safety.ts`) | `feature_safety_manager.py`: `FeatureSafetyManager.refresh_state` (`delta_temp > safety_delay_min`, `switch_cond`), defaults of `const.py` | The defaults, `constants.json`; the conditions by unit tests only |
| `pyRound` (`round.ts`) | Python's `round` | Yes, `rounding.json` |
| `valueAt`, `resample`, `timeMean`, `temperatureHistory`, `comfortStats` | None: operations on the series and comfort indicators of the dashboard | No |

The rules that are not replayed, and why:
- The safety mode, the power shedding, the off and sleep modes, Auto TPI and the valve commands of `apply_valve_command_percent`: they
  depend on the state of the whole thermostat, not on the settings being edited.
- In `tpiHistory`, VT recomputes the share at each measurement and can start a cycle early when the running one is idle; the replay keeps
  one share per cycle, at regular cycles from the start of the period.
- In `slopeHistory`, the phase of the control cycles is not recorded: the cycles are placed every `cycle_min` from the first measurement.
  The checks that a change of the outdoor temperature triggers are not replayed.
- In `windowDetections`, the rule of 4 points (`MIN_NB_POINT`) only matters at the start of the history, which `slopeHistory` warms up with
  the measurements before the period; the window bypass is not replayed. The rule "no heating, no detection" applies only when the panel
  gives the share of heating.
- In `sensorGaps`, VT checks the age of the measurements at each cycle and each measurement, so a silence barely longer than the delay can
  end before a check; it is still marked. The safety mode also needs a share of at least `safety_min_on_percent` (default 0.5), and a
  thermostat over climate never enters it: the panel says so.

## The fixtures
`tests/test_insights_fixtures.py` imports the modules of Versatile Thermostat from `external/` (`prop_algo_tpi`, `cycle_scheduler`, `ema`,
`open_window_algorithm`, `const`), runs them on fixed cases and compares the results to the JSON files of
`frontend/test/fixtures/insights/`. `frontend/test/insights-fixtures.test.ts` compares the TypeScript functions to the same files. The
safety manager and the window manager need a whole thermostat: their decisions are covered by the unit tests of
`frontend/test/insights.test.ts`, and only their constants by the fixtures. The test of the slope drives the EMA and the algorithm of the
window in the order of `BaseThermostat`, which it copies.

| File | Content |
| --- | --- |
| `tpi.json` | TPI cases: the parts, the thresholds in heating and cooling, the caps, `max_on_percent`, the minimal delays, a rounding tie. |
| `cycle-times.json` | `calculate_cycle_times` on shares, cycles and delays, edge cases included. |
| `slope.json` | A room of 6 hours (aeration, recovery, aberrant point, silence of 70 minutes): the EMA, the slope, the number of points and the open and close tests at each measurement and each cycle. |
| `rounding.json` | Python's `round(value, 2)` on ties and on values whose binary form is just under or above a tie. |
| `constants.json` | The constants of Versatile Thermostat that the port copies. |

## When `external-refs.txt` changes
1. Run `npm run test:python -- tests/test_insights_fixtures.py`. A failure means that Versatile Thermostat gives other results on the
   fixed cases.
2. Whether it fails or not, read the diff of the ported files between the two references, for example
   `git -C external/versatile_thermostat diff <old> <new> -- custom_components/versatile_thermostat/prop_algo_tpi.py`, for each file of the
   table above (and `prop_handler_tpi.py`, `thermostat_prop.py`, `base_thermostat.py`, `feature_window_manager.py`,
   `feature_safety_manager.py`, `const.py`). A rule can change outside the fixed cases.
3. Update the ported functions and their comments, then the fixed cases of the Python test if a new rule needs one.
4. Write the new fixtures with `UPDATE_INSIGHTS_FIXTURES=1 npm run test:python -- tests/test_insights_fixtures.py`, run
   `npx vitest run frontend/test/insights.test.ts frontend/test/insights-fixtures.test.ts`, and commit the fixtures with the port.
