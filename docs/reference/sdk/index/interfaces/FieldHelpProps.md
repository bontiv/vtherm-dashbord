[**@vtherm/dashboard-sdk**](../../index.md)

***

# Interface: FieldHelpProps

The properties of the element of the help of a field (`FIELD_HELP_ELEMENT`).

The hint is shown under the control; the button (i) opens a panel with the diagram, then the explanation. The button appears only
when there is an explanation or a diagram. A plugin can put its own SVG in the slot `diagram` of the element, instead of a diagram of
the library.

## Properties

### diagram?

> `readonly` `optional` **diagram?**: `"tpi_cycle"` \| `"tpi_formula"` \| `"min_on_off"` \| `"tpi_thresholds"` \| `"valve_curve"` \| `"send_threshold"` \| `"window_delay"` \| `"window_slope"` \| `"motion"` \| `"safety"` \| `"override"` \| `"failure"` \| `"correction"` \| `"stagger"`

The diagram of the library shown in the panel.

***

### highlight?

> `readonly` `optional` **highlight?**: `string`

The key of the setting that the diagram highlights: the field that has the focus, or the field of the help. It is not named `focus`,
which is a method of every element.

***

### hint?

> `readonly` `optional` **hint?**: `string`

The short hint, one sentence, shown under the control.

***

### info?

> `readonly` `optional` **info?**: `string`

The detailed explanation, shown in the panel.

***

### label

> `readonly` **label**: `string`

The translated name of the field, which names the button (i) for the assistive technologies.

***

### values?

> `readonly` `optional` **values?**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

The values of the settings that the diagram illustrates, by key of Versatile Thermostat: the diagram is drawn with them.
