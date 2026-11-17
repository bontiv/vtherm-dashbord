[**@vtherm/dashboard-sdk**](../../index.md)

***

# Variable: DIAGRAM\_IDS

> `const` **DIAGRAM\_IDS**: readonly \[`"tpi_cycle"`, `"tpi_formula"`, `"min_on_off"`, `"tpi_thresholds"`, `"valve_curve"`, `"send_threshold"`, `"window_delay"`, `"window_slope"`, `"motion"`, `"safety"`, `"override"`, `"failure"`, `"correction"`, `"stagger"`\]

The diagrams of the library of the dashboard, by their stable identifier.

- `tpi_cycle`: the cycle of heating of TPI, on then off.
- `tpi_formula`: the part of the cycle that TPI computes from the room and the outside.
- `min_on_off`: the minimal delays of activation and deactivation.
- `tpi_thresholds`: the thresholds where TPI stops and starts again.
- `valve_curve`: the opening sent to a valve for the opening asked.
- `send_threshold`: the threshold and the period of the regulation, which decide when a setpoint is sent.
- `window_delay`: the delays before and after an open window.
- `window_slope`: the detection of an open window by a drop of the temperature.
- `motion`: the presets of a room with and without motion, and their delays.
- `safety`: what the thermostat does when its sensors stop reporting.
- `override`: the duration of a manual override.
- `failure`: the detection of a heating failure.
- `correction`: the correction of the setpoint by the automatic regulation.
- `stagger`: the start of several switches spread over the cycle.
