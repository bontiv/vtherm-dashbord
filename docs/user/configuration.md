# Configuring thermostats
Audience: users.

The dashboard edits the configuration of Versatile Thermostat without the screens of Home Assistant. It uses the same rules as
those screens: a value that the flow of Versatile Thermostat refuses is refused here too, with the same message.

## Where to configure
- **Thermostats tab**: open a thermostat, then one of the sections of its menu.
- **Configuration gear, group "Versatile Thermostat"**: the sections of the central configuration, which the thermostats can share.

## Change, save, discard
A change is kept in a draft. The bar at the bottom of the page then says "Unsaved changes" and offers **Save** and **Discard**.

- **Save** writes the whole draft at once. If a field is refused, nothing is written, and the error shows under the field. The
  temperatures of the presets are applied after the configuration. If one of them fails, the configuration is still saved and the
  bar says so.
- **Discard** goes back to the saved values.
- You can go from a section to another of the same thermostat: the draft stays. Leaving the thermostat, or the central
  configuration, asks you to confirm, and drops the draft. Closing the browser tab asks too.

A thermostat saved by a newer Versatile Thermostat than the dashboard knows is shown read-only, with a message. Change it in the
screens of Home Assistant, or update the dashboard.

## The fields
The fields are those of Home Assistant, as in its own settings:

- An entity is chosen in the entity picker, with its search, its name, its device and its area. Each field only offers the entities
  that Versatile Thermostat accepts there: a temperature sensor offers the `sensor` entities of class temperature and the
  `input_number` and `number` entities. An entity already saved stays shown even if the picker would not offer it.
- The underlyings of a thermostat are a list of entities, in an order that you can change by dragging. The commands and the opening
  degrees go with the underlyings by position.
- The commands of a thermostat on switch are given for each underlying, in front of it: a service, chosen in the service picker of
  Home Assistant, and an optional attribute with its value (`option:comfort`). They are required for an underlying that is not a
  switch; a switch uses its default commands. A command that the picker cannot show (another format, a service that Home Assistant
  does not list) is shown as it is, in a text field.
- The services of the central boiler are an entity, a service and an optional attribute.
- A delay is a number with its unit, minutes or seconds, as Versatile Thermostat stores it.
- Long groups of settings, such as those of Auto TPI, are in a panel that opens; it is open when one of its fields is refused.
- An entity of the central configuration shown in a section opens its card of Home Assistant when you click it.

When the dashboard is opened directly, its sections may show "Loading the controls of Home Assistant" for a moment. A version of
Home Assistant without these controls (they were checked on Home Assistant 2026.10) shows plain fields instead, with the same values.

## Create the central configuration
Until it exists, the section "Central configuration" of the gear offers to create it. Its assistant asks for the main
attributes, then creates the central configuration with the default TPI and advanced parameters, so that the thermostats that use
it can start.

## Create a thermostat
In the Thermostats tab, **Create a thermostat** opens an assistant. Choose the type (over a switch, over a climate, over a valve),
then fill in the main attributes and the underlying devices. The **Create** button stays off while a required field is empty,
and the assistant says which ones. When there is a central configuration, a new thermostat uses it by default.

## Use the central configuration
Most sections have a switch "Use the central configuration". While it is on, the section shows the values of the central
configuration, read-only. Turn it off to give this thermostat its own values. The switch is off, and says so, while there is no
central configuration.

## The sections, one by one
The sections follow the menu of the config flow of Versatile Thermostat. A section appears only when it applies to the thermostat.

| Section | Appears when | What it configures |
| --- | --- | --- |
| Main attributes | always | Name, temperature sensors, cycle, and whether the thermostat uses the central configuration. |
| Features | always | The features to turn on: window, motion, power, presence, and others. |
| Underlyings | thermostat only | The devices that the thermostat controls. The form depends on the type. |
| TPI parameters | the proportional function is TPI, or a valve regulates | The TPI coefficients, and Auto TPI with its learning type. |
| Presets | switch, climate and valve thermostats | The temperature of each preset. They are `number` entities, saved after the configuration. |
| Central boiler | central configuration, when the feature is on | The services that start and stop the central boiler. |
| Window | the window feature is on | A window sensor, or the automatic detection thresholds, not both. |
| Motion | the motion feature is on | The motion sensor, the delays and the presets. |
| Power | the power feature is on | The power sensors and the shedding. |
| Presence | the presence feature is on | The presence sensor and the presets. |
| Auto start and stop | climate thermostat, the feature is on | The automatic start and stop of the device. |
| Valve regulation | a climate that regulates with a valve | The valves, their offsets and their opening. |
| Sync device internal temperature | the option is on | The synchronization of the internal temperature of the device. |
| Advanced | always | The advanced parameters. |
| Lock | always | The lock of the thermostat, with an optional code. |
| Humidity | thermostat only | A humidity sensor. The dashboard suggests the one of the same device. |
| Heating failure detection | the feature is on | The thresholds of the detection. |

The identifiers of these sections, which a plugin can use to place its own tab, are in [Native plugins](../plugins/native-plugins.md).
