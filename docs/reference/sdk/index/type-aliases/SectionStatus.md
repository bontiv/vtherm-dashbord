[**@vtherm/dashboard-sdk**](../../index.md)

***

# Type Alias: SectionStatus

> **SectionStatus** = [`CompleteStatus`](../interfaces/CompleteStatus.md) \| [`InheritedStatus`](../interfaces/InheritedStatus.md) \| [`OffStatus`](../interfaces/OffStatus.md) \| [`IncompleteStatus`](../interfaces/IncompleteStatus.md)

What a configuration section says about itself in the menu: nothing required is missing (`complete`), its values come from the
central configuration (`inherited`, with `off` when those values turn the section off), its values turn it off (`off`), or `missing`
required values have no value (`incomplete`). The dashboard adds the statuses that it knows itself: `off` when the feature of the
section is off, `refused` when the last save refused a value of the section.
