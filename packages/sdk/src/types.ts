/**
 * Types of the contract between the Versatile Thermostat dashboard and its UI plugins.
 *
 * A plugin declares its contributions with `registerUiPlugin`. Each contribution targets one hook, which is a place of
 * the dashboard, and says where it goes with one placement.
 *
 * @packageDocumentation
 */

import type { AnyTranslations } from "./translations.js";

/** The places of the dashboard where a plugin can contribute. */
export const HOOK_NAMES = ["top_tab", "tab_page", "global_page", "global_widget", "general_config", "thermostat_config", "thermostat_widget"] as const;

/**
 * A place of the dashboard where a plugin can contribute.
 *
 * - `top_tab`: a tab of the top bar.
 * - `tab_page`: an entry of the left menu of a top tab, chosen with `tab`.
 * - `global_page`: an entry of the left menu of the Dashboard tab.
 * - `global_widget`: a widget of the Overview page.
 * - `general_config`: a section of the general configuration of Versatile Thermostat.
 * - `thermostat_config`: an entry of the menu of a thermostat, in particular a configuration section.
 * - `thermostat_widget`: a widget of the overview of a thermostat.
 */
export type HookName = (typeof HOOK_NAMES)[number];

/** The hooks whose contributions show a custom element. A `top_tab` only adds a tab, its pages are `tab_page` contributions. */
export type ComponentHookName = Exclude<HookName, "top_tab">;

/** The forms of a placement and the type of their value. */
export interface PlacementForms {
  /** Put the contribution at the start of its hook. */
  first: true;
  /** Put the contribution at the end of its hook. This is the default. */
  last: true;
  /** Put the contribution just before the contribution with this identifier. */
  before: string;
  /** Put the contribution just after the contribution with this identifier. */
  after: string;
  /** Take the place of the contribution with this identifier, which is no longer shown. */
  replace: string;
  /** Remove the contribution with this identifier. */
  remove: string;
}

/**
 * Where a contribution goes in its hook. Exactly one form is allowed, and no numeric order exists.
 *
 * - `{ first: true }` and `{ last: true }`: at the start or at the end. `last` is the default.
 * - `{ before: id }` and `{ after: id }`: next to the contribution `id`.
 * - `{ replace: id }`: in the place of the contribution `id`, which is no longer shown.
 * - `{ remove: id }`: removes the contribution `id`. It shows nothing itself.
 */
export type Placement = {
  [Form in keyof PlacementForms]: { readonly [Key in Form]: PlacementForms[Form] } & { readonly [Other in Exclude<keyof PlacementForms, Form>]?: never };
}[keyof PlacementForms];

/** What to do when the target of a `before`, `after`, `replace` or `remove` does not exist: go `last`, or `skip` the contribution. */
export type OnMissing = "last" | "skip";

/** The regional settings of the user. */
export interface HassLocale {
  /** The language of the user, for example `fr` or `pt-BR`. */
  readonly language: string;
  /** The number format, for example `comma_decimal`. */
  readonly number_format?: string;
  /** The time format, `12` or `24`. */
  readonly time_format?: string;
}

/** The state of an entity of Home Assistant. */
export interface HassState {
  /** The identifier of the entity, for example `climate.living_room`. Home Assistant always gives it; a test can leave it out. */
  readonly entity_id?: string;
  /** The state, for example `heat` or `19.5`. */
  readonly state: string;
  /** The attributes of the entity. */
  readonly attributes: Readonly<Record<string, unknown>>;
  /** When the state last changed, as an ISO 8601 date. */
  readonly last_changed?: string;
  /** When the state or an attribute was last written, as an ISO 8601 date. */
  readonly last_updated?: string;
}

/**
 * An entity of the registry that Home Assistant gives to its frontend for display, `hass.entities`. It is a subset of the full registry:
 * in particular it has no `config_entry_id`, so the entities of a configuration entry are found through their device, see
 * `getEntryEntities`.
 */
export interface HassEntityRegistryEntry {
  /** The identifier of the entity, for example `sensor.living_room_power_percent`. */
  readonly entity_id: string;
  /** The integration that created the entity, for example `versatile_thermostat`. */
  readonly platform?: string;
  /** The device of the entity, when it has one. */
  readonly device_id?: string | null;
  /** The key of the name of the entity in the translations of its integration, for example `power_percent`. */
  readonly translation_key?: string | null;
  /** The area of the entity, when it differs from the area of its device. */
  readonly area_id?: string | null;
}

/** A device of the registry of the devices of Home Assistant, `hass.devices`. */
export interface HassDeviceRegistryEntry {
  /** The identifier of the device. */
  readonly id: string;
  /** The identifiers that the integrations gave to the device, as pairs of a domain and an identifier. */
  readonly identifiers?: readonly (readonly [string, string])[];
  /** The configuration entries of the device. */
  readonly config_entries?: readonly string[];
  /** The area of the device. */
  readonly area_id?: string | null;
  /** The name of the device. */
  readonly name?: string | null;
}

/** The user of the session. */
export interface HassUser {
  /** Whether the user is an administrator. */
  readonly is_admin: boolean;
}

/** The configuration of Home Assistant. */
export interface HassConfig {
  /** The units of the instance. */
  readonly unit_system?: {
    /** The unit of the temperatures, `°C` or `°F`. */
    readonly temperature?: string;
  };
}

/** The subset of the Home Assistant frontend state that the dashboard gives to the plugins. */
export interface Hass {
  /** The language of the user profile. */
  readonly language: string;
  /** The regional settings of the user. */
  readonly locale?: HassLocale;
  /** The states of the entities, by entity id. */
  readonly states: Readonly<Record<string, HassState>>;
  /** The user of the session. */
  readonly user?: HassUser;
  /** The configuration of Home Assistant, in particular the unit of the temperatures. */
  readonly config?: HassConfig;
  /**
   * The registry of the entities for display, by entity id. Undefined in a version of Home Assistant that does not give it, and in the
   * fake `hass` of the tests unless the test gives it.
   */
  readonly entities?: Readonly<Record<string, HassEntityRegistryEntry>> | undefined;
  /** The registry of the devices, by device id. Undefined in a version of Home Assistant that does not give it. */
  readonly devices?: Readonly<Record<string, HassDeviceRegistryEntry>> | undefined;
  /**
   * Format the state of an entity as Home Assistant shows it: translated, with its unit and its precision. Undefined when Home Assistant
   * does not give it, for example in the test harness: format the value with `locale` then.
   */
  readonly formatEntityState?: (stateObj: HassState, state?: string) => string;
  /** Format the value of an attribute of an entity as Home Assistant shows it, with its unit. Undefined when Home Assistant does not give it. */
  readonly formatEntityAttributeValue?: (stateObj: HassState, attribute: string, value?: unknown) => string;
  /** Call a service of Home Assistant. */
  callService(domain: string, service: string, data?: Readonly<Record<string, unknown>>): Promise<unknown>;
  /** Send a WebSocket message to Home Assistant. */
  callWS<Result>(message: Readonly<Record<string, unknown>>): Promise<Result>;
}

/** The values of a configuration, by field key. */
export type ConfigValues = Readonly<Record<string, unknown>>;

/** The validation errors of a configuration, by field key. The value is a stable error code of the server, such as `unknown_entity`. */
export type ConfigErrors = Readonly<Record<string, string>>;

/** The type of a Versatile Thermostat thermostat. */
export type ThermostatType = "over_switch" | "over_climate" | "over_valve";

/** The properties of every component of a contribution. */
export interface BaseProps {
  /** The state of Home Assistant. */
  hass: Hass;
}

/** What every component of a contribution is told about the display. Visibility conditions do not receive it. */
export interface DisplayProps {
  /**
   * Whether the dashboard is shown on a narrow screen, such as a phone: its menu is then a drawer and its pages take the whole width.
   * It changes without a reload when the width of the window crosses the threshold, so a component that uses it must draw again.
   */
  narrow: boolean;
}

/** The central configuration of Versatile Thermostat, as the widgets of the Overview page receive it. */
export interface CentralContext {
  /**
   * The identifier of the configuration entry of the central configuration. Give it to `getEntryEntities` to find the entities of the
   * central device, such as the `select` of the central mode.
   */
  readonly entryId: string;
  /** The values of the central configuration. Empty while they are being read. */
  readonly values: ConfigValues;
}

/** What the widgets of the Overview page receive, besides `hass`. */
export interface GlobalWidgetProps extends BaseProps {
  /** The central configuration. Absent when there is none. */
  central?: CentralContext;
}

/** The properties of the components that are shown for one thermostat. */
export interface ThermostatProps extends BaseProps {
  /** The identifier of the thermostat. */
  thermostatId: string;
}

/** The outcome of a save: everything was written, nothing was written, or the configuration was written but not every preset temperature. */
export type SaveResult = "success" | "error" | "partial";

/** A message about the draft, translated, to show above the save actions. */
export interface DraftMessage {
  /** The kind of message: `info` for the unsaved changes, `warning` for a partial save, `error` for a refused or failed save. */
  readonly type: "info" | "warning" | "error";
  /** The translated text. */
  readonly text: string;
  /** An action that the message offers, such as opening the section that the last save refused. Draw it as a button of the message. */
  readonly action?: DraftMessageAction;
}

/** The action of a message about the draft. */
export interface DraftMessageAction {
  /** The translated label of the button. */
  readonly label: string;
  /** Do the action. */
  run(): void;
}

/**
 * The state of the draft of the edited configuration and its commands, to draw the save actions at the foot of a card, as the
 * configuration pages of Home Assistant do. The draft is shared by every section of the configuration: saving writes all of it.
 */
export interface DraftControls {
  /** Whether the draft has changes that are not saved. */
  readonly dirty: boolean;
  /** Whether a save is in progress. */
  readonly saving: boolean;
  /** The messages to show above the actions: the unsaved changes, the general errors of a refused save, a partial save. */
  readonly messages: readonly DraftMessage[];
  /** Save the whole draft. It never rejects: a failure of the connection gives `error`, with a message in `messages`. */
  save(): Promise<SaveResult>;
  /** Drop every change of the draft, in every section, without confirmation. */
  discard(): void;
}

/** What a configuration component receives, and how it proposes changes. It never writes the configuration itself: the dashboard saves the draft. */
export interface ConfigProps {
  /** The current values of the edited configuration, draft included. */
  values: ConfigValues;
  /** The validation errors of the fields, after a refused save. */
  errors: ConfigErrors;
  /** Propose changes to the draft. The real configuration is not changed until the user saves. */
  proposeChanges(changes: ConfigValues): void;
  /**
   * The state of the draft and its commands. A new object is given at each change of the draft. It is undefined when the configuration
   * cannot be saved, for example when it is read-only: no save action is drawn then.
   */
  draft?: DraftControls;
}

/** The properties of a component of `general_config`. It has no thermostat identifier. */
export interface GeneralConfigProps extends BaseProps, ConfigProps {}

/** The properties of a component of `thermostat_config`. */
export interface ThermostatConfigProps extends ThermostatProps, ConfigProps {
  /** The values of the central configuration, to show the inherited values. */
  centralValues: ConfigValues;
}

/** The properties that the dashboard gives to the custom element of a contribution, by hook. */
export interface HookPropsMap {
  /** The properties of the pages of the left menu of a top tab. */
  tab_page: BaseProps & DisplayProps;
  /** The properties of the pages of the Dashboard tab. */
  global_page: BaseProps & DisplayProps;
  /** The properties of the widgets of the Overview page. */
  global_widget: GlobalWidgetProps & DisplayProps;
  /** The properties of the sections of the general configuration. */
  general_config: GeneralConfigProps & DisplayProps;
  /** The properties of the entries of the menu of a thermostat. */
  thermostat_config: ThermostatConfigProps & DisplayProps;
  /** The properties of the widgets of the overview of a thermostat. */
  thermostat_widget: ThermostatProps & DisplayProps;
}

/** The properties of the custom element of a contribution of the hook `H`. */
export type HookProps<H extends ComponentHookName> = HookPropsMap[H];

/** What the visibility condition of a general configuration section can read. */
export interface GeneralConfigVisibilityContext extends BaseProps {
  /** The current values of the general configuration, draft included. */
  values: ConfigValues;
}

/** What the visibility condition of a contribution shown for a thermostat can read. */
export interface ThermostatVisibilityContext extends ThermostatProps {
  /** The type of the thermostat. */
  thermostatType: ThermostatType;
  /** The current values of the configuration of the thermostat, draft included. */
  values: ConfigValues;
  /** The values of the central configuration. */
  centralValues: ConfigValues;
}

/** What a visibility condition can read, by hook. A condition is a pure function and must not change anything. */
export interface VisibilityContextMap {
  /** The context of the tabs of the top bar. */
  top_tab: BaseProps;
  /** The context of the pages of the left menu of a top tab. */
  tab_page: BaseProps;
  /** The context of the pages of the Dashboard tab. */
  global_page: BaseProps;
  /** The context of the widgets of the Overview page, with the central configuration when there is one. */
  global_widget: GlobalWidgetProps;
  /** The context of the sections of the general configuration. */
  general_config: GeneralConfigVisibilityContext;
  /** The context of the entries of the menu of a thermostat. */
  thermostat_config: ThermostatVisibilityContext;
  /** The context of the widgets of the overview of a thermostat. */
  thermostat_widget: ThermostatVisibilityContext;
}

/** The context given to the visibility condition of a contribution of the hook `H`. */
export type VisibilityContext<H extends HookName> = VisibilityContextMap[H];

/** The fields that every contribution that shows something has. */
interface ContributionBase<H extends HookName> {
  /** The identifier of the contribution. It starts with the identifier of the plugin and a dot, for example `smartpi.tab.main`. */
  readonly id: string;
  /** Where the contribution goes. Without it, the contribution goes `last`. */
  readonly placement?: Placement;
  /** What to do when the target of the placement does not exist. `last` by default. */
  readonly on_missing?: OnMissing;
  /**
   * A condition that decides whether the contribution is shown. It is evaluated again at each change of the context.
   * A hidden contribution keeps its place, so the placements of the other contributions do not move.
   */
  readonly visible?: (context: VisibilityContext<H>) => boolean;
}

/** The fields of a contribution that has an entry in the navigation. */
interface NavigationFields {
  /** The key of the title in the translation catalog of the plugin. It is used in the menu and in the breadcrumb. */
  readonly title: string;
  /** The icon, for example `mdi:thermometer`. Without it, only the title is shown. */
  readonly icon?: string;
}

/** The fields of a contribution that is an entry of a left menu. */
interface MenuEntryFields extends NavigationFields {
  /**
   * The key of the group in the translation catalog of the plugin, or one of the groups shared by the core (`CORE_MENU_GROUPS`), whose
   * heading the dashboard translates. A consecutive run of entries of one group shares one heading.
   */
  readonly group?: string;
}

/** The fields of a contribution that shows a custom element. */
interface ComponentFields {
  /** The tag name of the custom element that the plugin defines, for example `smartpi-tab`. */
  readonly component: string;
}

/** A tab of the top bar. */
export interface TopTabContribution extends ContributionBase<"top_tab">, NavigationFields {
  /** The area of the bar: `start` (default) or `end`. A placement is resolved in the area of the tab. */
  readonly zone?: "start" | "end";
}

/** An entry of the left menu of a top tab. */
export interface TabPageContribution extends ContributionBase<"tab_page">, MenuEntryFields, ComponentFields {
  /** The identifier of the top tab where the entry is shown. The Thermostats tab does not accept `tab_page`, use `thermostat_config`. */
  readonly tab: string;
}

/** An entry of the left menu of the Dashboard tab. */
export interface GlobalPageContribution extends ContributionBase<"global_page">, MenuEntryFields, ComponentFields {}

/** The values of `columns` of a widget size: a number of columns of the grid, or `full` for the whole row. */
export const WIDGET_COLUMNS = [1, 2, 3, "full"] as const;

/** The values of `rows` of a widget size: a number of units of height of 140 px. */
export const WIDGET_ROWS = [1, 2, 3] as const;

/**
 * The size of a widget in the grid of its page. Without it, a widget takes one column and the height of its content.
 *
 * - `columns`: how many columns of the grid it takes (a column is at least 280 px wide), or `full` for the whole row. A width larger
 *   than the grid is reduced to the grid, and a narrow screen has one column.
 * - `rows`: a minimal height of `rows` units of 140 px, plus the gaps between them. The card grows when its content is higher.
 */
export interface WidgetSize {
  /** How many columns the widget takes, or `full` for the whole row. 1 by default. */
  readonly columns?: (typeof WIDGET_COLUMNS)[number];
  /** The minimal height of the widget, in units of 140 px. Without it, the height follows the content. */
  readonly rows?: (typeof WIDGET_ROWS)[number];
}

/** The fields of a widget contribution. */
interface WidgetFields {
  /** The size of the widget in the grid. Without it, the widget takes one column and the height of its content. */
  readonly size?: WidgetSize;
}

/** A widget of the Overview page. */
export interface GlobalWidgetContribution extends ContributionBase<"global_widget">, ComponentFields, WidgetFields {}

/**
 * What a configuration section says about itself in the menu: nothing required is missing (`complete`), its values come from the
 * central configuration (`inherited`, with `off` when those values turn the section off), its values turn it off (`off`), or `missing`
 * required values have no value (`incomplete`). The dashboard adds the statuses that it knows itself: `off` when the feature of the
 * section is off, `refused` when the last save refused a value of the section.
 */
export type SectionStatus = CompleteStatus | InheritedStatus | OffStatus | IncompleteStatus;

/** Nothing required is missing in the section: the menu shows a check mark. */
export interface CompleteStatus {
  /** The kind of status. */
  readonly kind: "complete";
}

/** The values of the section come from the central configuration: the menu shows `Central`, or `Central (off)` with `off`. */
export interface InheritedStatus {
  /** The kind of status. */
  readonly kind: "inherited";
  /** True when the central values that the section uses turn it off, while its own values do not. */
  readonly off?: boolean;
}

/**
 * The values of the section turn it off, for a section that has no feature switch: the menu shows `Off`, and the page of the section
 * is shown as usual, without the switch that the dashboard draws for a feature.
 */
export interface OffStatus {
  /** The kind of status. */
  readonly kind: "off";
}

/** Required values of the section have no value: the menu shows how many. */
export interface IncompleteStatus {
  /** The kind of status. */
  readonly kind: "incomplete";
  /** How many required values have no value. */
  readonly missing: number;
}

/** The fields of a configuration contribution. */
interface ConfigFields<H extends "general_config" | "thermostat_config"> {
  /**
   * Who draws the save actions (save, discard) of the section: `component` when the component draws them at the foot of its own card
   * from `draft`, `dashboard` (default) when the dashboard draws them in a card under the component.
   */
  readonly save_actions?: "component" | "dashboard";
  /**
   * The status of the section, shown in the menu. A pure function of the context, called at each drawing of the menu: it must be quick
   * and must not change anything. `undefined` shows no status. A function that raises or returns another value shows no status, and the
   * development mode reports it.
   */
  readonly status?: (context: VisibilityContext<H>) => SectionStatus | undefined;
  /**
   * The key of the boolean value that turns the feature of the section on, for example `use_window_feature`. While it is off, the
   * section stays in the menu with the status `off`, and its page shows an explanation and a switch drawn by the dashboard instead of
   * the component. The explanation is the key `feature_intro.<feature>` of the catalog of the plugin.
   */
  readonly feature?: string;
}

/** A section of the general configuration of Versatile Thermostat. */
export interface GeneralConfigContribution extends ContributionBase<"general_config">, MenuEntryFields, ComponentFields, ConfigFields<"general_config"> {}

/** An entry of the menu of a thermostat, in particular a configuration section. */
export interface ThermostatConfigContribution extends ContributionBase<"thermostat_config">, MenuEntryFields, ComponentFields, ConfigFields<"thermostat_config"> {}

/** A widget of the overview of a thermostat. */
export interface ThermostatWidgetContribution extends ContributionBase<"thermostat_widget">, ComponentFields, WidgetFields {}

/** The placement of a contribution that removes another one. */
export interface RemovalPlacement {
  /** The identifier of the contribution to remove. */
  readonly remove: string;
  /** Not allowed: a placement has one form. */
  readonly first?: never;
  /** Not allowed: a placement has one form. */
  readonly last?: never;
  /** Not allowed: a placement has one form. */
  readonly before?: never;
  /** Not allowed: a placement has one form. */
  readonly after?: never;
  /** Not allowed: a placement has one form. */
  readonly replace?: never;
}

/** A contribution that removes another one. It shows nothing, so it needs no title or component. */
export interface RemovalContribution {
  /** The identifier of the contribution. */
  readonly id: string;
  /** The contribution to remove. */
  readonly placement: RemovalPlacement;
  /** What to do when the target does not exist. */
  readonly on_missing?: OnMissing;
}

/** The contributions that show something, by hook. */
export interface ContributionMap {
  /** A tab of the top bar. */
  top_tab: TopTabContribution;
  /** An entry of the left menu of a top tab. */
  tab_page: TabPageContribution;
  /** An entry of the left menu of the Dashboard tab. */
  global_page: GlobalPageContribution;
  /** A widget of the Overview page. */
  global_widget: GlobalWidgetContribution;
  /** A section of the general configuration. */
  general_config: GeneralConfigContribution;
  /** An entry of the menu of a thermostat. */
  thermostat_config: ThermostatConfigContribution;
  /** A widget of the overview of a thermostat. */
  thermostat_widget: ThermostatWidgetContribution;
}

/** A contribution to the hook `H`: one that shows something, or one that removes another contribution. */
export type Contribution<H extends HookName> = ContributionMap[H] | RemovalContribution;

/** The contributions of a plugin, grouped by hook. */
export type Contributions = { readonly [H in HookName]?: readonly Contribution<H>[] };

/** The declaration of a UI plugin, given to `registerUiPlugin`. */
export interface UiPluginDefinition {
  /** The identifier of the plugin. It is the one registered in Python. */
  readonly id: string;
  /**
   * The translations of the plugin, made with `defineTranslations`. The English catalog is required. The titles and the groups of the
   * contributions are keys of these catalogs.
   */
  readonly translations: AnyTranslations;
  /** The contributions of the plugin, by hook. */
  readonly contributions: Contributions;
}
