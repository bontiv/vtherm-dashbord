/**
 * The components of presentation of the native widgets: the card, the gauge, the bars, the icon of a state, the row of a value and the
 * age of a date, with the formats of the values and the base of a widget. They belong to the dashboard: the SDK does not export them.
 */

export { VThermAge } from "./age.ts";
export { VThermBar } from "./bar.ts";
export type { BarSegment, SegmentTone } from "./bar.ts";
export { MISSING, formatAge, formatAttributeValue, formatEntityValue, formatNumber, isMissingState, localeOf, temperatureUnit, withUnit } from "./format.ts";
export type { AttributeFormat, FormattedAge, FormattedValue, WidgetText } from "./format.ts";
export { VThermGauge } from "./gauge.ts";
export { VThermStateIcon } from "./state-icon.ts";
export type { StateTone } from "./state-icon.ts";
export { VThermValueRow } from "./value-row.ts";
export { VThermWidgetCard } from "./widget-card.ts";
export type { WidgetCardStatus } from "./widget-card.ts";
export { VThermOverviewWidget, readEntitiesChanged, whenVisible } from "./widget-base.ts";
