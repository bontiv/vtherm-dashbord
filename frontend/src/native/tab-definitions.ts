/**
 * The native tabs: which forms of Versatile Thermostat each tab shows, and when the tab applies.
 *
 * A tab of the dashboard is a step of the menu of the config flow of Versatile Thermostat. The rules of this file follow the menu
 * and the steps of that flow (`config_flow.py`), so that the tabs are the ones that the flow offers. The server checks them again:
 * a tab that the flow does not offer cannot be saved.
 */

import { defaultOf, missingRequired } from "./fields.ts";
import { fieldsOf } from "./schemas.ts";
import type { FieldSpec, SchemaName } from "./schemas.ts";

/** The values of a configuration, by key of Versatile Thermostat. */
export type Values = Readonly<Record<string, unknown>>;

/** The kind of configuration that a tab shows. */
export type ConfigKind = "thermostat" | "central";

/** The tabs of the flow, in the order of its menu. */
export const FLOW_TABS = [
  "main",
  "features",
  "type",
  "tpi",
  "presets",
  "central_boiler",
  "window",
  "motion",
  "power",
  "presence",
  "auto_start_stop",
  "valve_regulation",
  "sync_device_internal_temp",
  "advanced",
  "lock",
  "humidity",
  "heating_failure_detection",
] as const;

/** A tab of the flow. */
export type FlowTab = (typeof FLOW_TABS)[number];

/** What a tab shows for a kind of configuration. */
export interface TabLayout {
  /** The forms that are always shown. */
  readonly base: readonly SchemaName[];
  /** The option that makes the tab use the central configuration, if the tab has one. */
  readonly inherit?: string;
  /** The forms of the values that the central configuration gives when `inherit` is on, and that the tab sets when it is off. */
  readonly specific?: readonly SchemaName[];
  /** The forms that follow from other values, such as the settings of Auto TPI. */
  readonly extra?: readonly SchemaName[];
  /** True when the tab shows the preset temperatures, which are not values of the flow. */
  readonly presets?: boolean;
}

/** A native tab. */
export interface TabDefinition {
  /** The native plugin that contributes the tab. */
  readonly plugin: string;
  /** The step of the flow that the tab saves. */
  readonly tab: FlowTab;
  /** The layout of the tab for a thermostat, or undefined when the tab does not exist for a thermostat. */
  readonly thermostat?: (values: Values) => TabLayout;
  /** The layout of the tab for the central configuration, or undefined when the tab does not exist there. */
  readonly central?: (values: Values) => TabLayout;
  /** Whether the menu of the flow offers the tab for these values. */
  readonly applies: (values: Values, kind: ConfigKind) => boolean;
  /**
   * The value that turns the feature of the tab on, for the tabs of a feature. While it is off, the flow does not offer the tab, but the
   * menu of the dashboard keeps it, off, so that the feature can be found and turned on there (see `isAvailable`).
   */
  readonly feature?: string;
}

const SWITCH = "thermostat_over_switch";
const CLIMATE = "thermostat_over_climate";
const VALVE = "thermostat_over_valve";

/** The type of thermostat of a configuration. */
export const thermostatTypeOf = (values: Values): string => String(values["thermostat_type"] ?? "");

/** Whether an over_climate thermostat regulates with a valve. */
export const usesValveRegulation = (values: Values): boolean => values["auto_regulation_mode"] === "auto_regulation_valve";

/**
 * The options that Versatile Thermostat refuses when there is no central configuration (`validate_input` of its config flow): the
 * inheritance of each section, the control by the central mode and the control of the central boiler. `tests/test_central_options.py`
 * compares this list with the one of the Versatile Thermostat of the environment.
 */
export const CENTRAL_REQUIRED_OPTIONS: ReadonlySet<string> = new Set([
  "use_main_central_config",
  "use_tpi_central_config",
  "use_window_central_config",
  "use_motion_central_config",
  "use_power_central_config",
  "use_presence_central_config",
  "use_presets_central_config",
  "use_advanced_central_config",
  "use_lock_central_config",
  "use_central_mode",
  "used_by_controls_central_boiler",
]);

const isOn = (values: Values, key: string): boolean => values[key] === true;
const fixed = (layout: TabLayout) => (): TabLayout => layout;

/** The native tabs, in the order of the menu of the flow. */
export const TAB_DEFINITIONS: readonly TabDefinition[] = [
  {
    plugin: "core",
    tab: "main",
    thermostat: fixed({ base: ["STEP_MAIN_DATA_SCHEMA"], inherit: "use_main_central_config", specific: ["STEP_CENTRAL_SPEC_MAIN_DATA_SCHEMA"] }),
    central: fixed({ base: ["STEP_CENTRAL_MAIN_DATA_SCHEMA"] }),
    applies: () => true,
  },
  {
    plugin: "core",
    tab: "features",
    thermostat: (values) => {
      if (thermostatTypeOf(values) !== CLIMATE) {
        return { base: ["STEP_FEATURES_DATA_SCHEMA"] };
      }
      return { base: [usesValveRegulation(values) ? "STEP_CLIMATE_VALVE_FEATURES_DATA_SCHEMA" : "STEP_CLIMATE_FEATURES_DATA_SCHEMA"] };
    },
    central: fixed({ base: ["STEP_CENTRAL_FEATURES_DATA_SCHEMA"] }),
    applies: () => true,
  },
  {
    plugin: "core",
    tab: "type",
    thermostat: (values) => {
      const type = thermostatTypeOf(values);
      return { base: [type === SWITCH ? "build_step_thermostat_switch_schema" : type === VALVE ? "build_step_thermostat_valve_schema" : "STEP_THERMOSTAT_CLIMATE"] };
    },
    applies: (_values, kind) => kind === "thermostat",
  },
  {
    plugin: "core_tpi",
    tab: "tpi",
    thermostat: (values) => {
      const extra: SchemaName[] = [];
      if (isOn(values, "auto_tpi_mode") && !isOn(values, "use_tpi_central_config")) {
        extra.push("STEP_AUTO_TPI_CONFIGURATION_SCHEMA");
        if (isOn(values, "auto_tpi_enable_advanced_settings")) {
          extra.push(values["auto_tpi_calculation_method"] === "ema" ? "STEP_AUTO_TPI_EMA_SETTINGS_SCHEMA" : "STEP_AUTO_TPI_AVG_SETTINGS_SCHEMA");
        }
      }
      return { base: ["STEP_TPI_DATA_SCHEMA"], inherit: "use_tpi_central_config", specific: ["STEP_CENTRAL_TPI_DATA_SCHEMA"], extra };
    },
    central: fixed({ base: ["STEP_CENTRAL_TPI_DATA_SCHEMA_CENTRAL"] }),
    applies: (values, kind) => kind === "central" || values["proportional_function"] === "tpi" || usesValveRegulation(values),
  },
  {
    plugin: "core_presets",
    tab: "presets",
    thermostat: fixed({ base: ["STEP_PRESETS_DATA_SCHEMA"], inherit: "use_presets_central_config", presets: true }),
    // The flow has nothing to ask about the presets of the central configuration: only the temperatures are shown.
    central: fixed({ base: [], presets: true }),
    applies: (values, kind) => kind === "central" || [SWITCH, VALVE, CLIMATE].includes(thermostatTypeOf(values)),
  },
  {
    plugin: "core_central_boiler",
    tab: "central_boiler",
    feature: "use_central_boiler_feature",
    central: fixed({ base: ["STEP_CENTRAL_BOILER_SCHEMA"] }),
    applies: (values, kind) => kind === "central" && isOn(values, "use_central_boiler_feature"),
  },
  {
    plugin: "core_window",
    tab: "window",
    feature: "use_window_feature",
    thermostat: (values) => ({
      base: ["STEP_WINDOW_DATA_SCHEMA"],
      inherit: "use_window_central_config",
      // With a window sensor, the flow no longer offers the automatic detection.
      specific: [values["window_sensor_entity_id"] ? "STEP_CENTRAL_WINDOW_WO_AUTO_DATA_SCHEMA" : "STEP_CENTRAL_WINDOW_DATA_SCHEMA"],
    }),
    central: fixed({ base: ["STEP_CENTRAL_WINDOW_DATA_SCHEMA"] }),
    applies: (values) => isOn(values, "use_window_feature"),
  },
  {
    plugin: "core_motion",
    tab: "motion",
    feature: "use_motion_feature",
    thermostat: fixed({ base: ["STEP_MOTION_DATA_SCHEMA"], inherit: "use_motion_central_config", specific: ["STEP_CENTRAL_MOTION_DATA_SCHEMA"] }),
    central: fixed({ base: ["STEP_CENTRAL_MOTION_DATA_SCHEMA"] }),
    applies: (values) => isOn(values, "use_motion_feature"),
  },
  {
    plugin: "core_power",
    tab: "power",
    feature: "use_power_feature",
    thermostat: fixed({ base: ["STEP_POWER_DATA_SCHEMA"], inherit: "use_power_central_config", specific: ["STEP_NON_CENTRAL_POWER_DATA_SCHEMA"] }),
    central: fixed({ base: ["STEP_CENTRAL_POWER_DATA_SCHEMA"] }),
    applies: (values) => isOn(values, "use_power_feature"),
  },
  {
    plugin: "core_presence",
    tab: "presence",
    feature: "use_presence_feature",
    thermostat: fixed({ base: ["STEP_PRESENCE_DATA_SCHEMA"], inherit: "use_presence_central_config", specific: ["STEP_CENTRAL_PRESENCE_DATA_SCHEMA"] }),
    central: fixed({ base: ["STEP_CENTRAL_PRESENCE_DATA_SCHEMA"] }),
    applies: (values) => isOn(values, "use_presence_feature"),
  },
  {
    plugin: "core_auto_start_stop",
    tab: "auto_start_stop",
    feature: "use_auto_start_stop_feature",
    thermostat: fixed({ base: ["STEP_AUTO_START_STOP"] }),
    applies: (values, kind) => kind === "thermostat" && thermostatTypeOf(values) === CLIMATE && !usesValveRegulation(values) && isOn(values, "use_auto_start_stop_feature"),
  },
  {
    plugin: "core_valve_regulation",
    tab: "valve_regulation",
    thermostat: fixed({ base: ["STEP_VALVE_REGULATION"] }),
    applies: (values, kind) => kind === "thermostat" && usesValveRegulation(values),
  },
  {
    plugin: "core_sync_temp",
    tab: "sync_device_internal_temp",
    thermostat: fixed({ base: ["STEP_SYNC_DEVICE_INTERNAL_TEMP"] }),
    applies: (values, kind) => kind === "thermostat" && isOn(values, "sync_device_internal_temp"),
  },
  {
    plugin: "core_advanced",
    tab: "advanced",
    thermostat: fixed({ base: ["STEP_ADVANCED_DATA_SCHEMA"], inherit: "use_advanced_central_config", specific: ["STEP_CENTRAL_ADVANCED_DATA_SCHEMA"] }),
    central: fixed({ base: ["STEP_CENTRAL_ADVANCED_DATA_SCHEMA"] }),
    applies: () => true,
  },
  {
    plugin: "core_lock",
    tab: "lock",
    thermostat: fixed({ base: ["STEP_LOCK_DATA_SCHEMA"], inherit: "use_lock_central_config", specific: ["STEP_CENTRAL_LOCK_DATA_SCHEMA"] }),
    central: fixed({ base: ["STEP_CENTRAL_LOCK_DATA_SCHEMA"] }),
    applies: () => true,
  },
  {
    plugin: "core_humidity",
    tab: "humidity",
    thermostat: fixed({ base: ["STEP_HUMIDITY_DATA_SCHEMA"] }),
    applies: (_values, kind) => kind === "thermostat",
  },
  {
    plugin: "core_heating_failure",
    tab: "heating_failure_detection",
    feature: "use_heating_failure_detection_feature",
    thermostat: fixed({ base: ["STEP_HEATING_FAILURE_DETECTION_SCHEMA"], inherit: "use_heating_failure_detection_central_config", specific: ["STEP_CENTRAL_HEATING_FAILURE_DETECTION_SCHEMA"] }),
    central: fixed({ base: ["STEP_CENTRAL_HEATING_FAILURE_DETECTION_SCHEMA"] }),
    applies: (values) => isOn(values, "use_heating_failure_detection_feature"),
  },
];

/**
 * Whether a tab exists for this type of configuration, its feature aside: a tab of a feature exists when the form "features" of
 * Versatile Thermostat offers the feature for this type, and the other rules of the tab hold. The other tabs exist when the flow offers
 * them.
 *
 * @param definition - The tab.
 * @param values - The values of the configuration, draft included.
 * @param kind - A thermostat or the central configuration.
 */
export function isAvailable(definition: TabDefinition, values: Values, kind: ConfigKind): boolean {
  const feature = definition.feature;
  if (feature === undefined) {
    return definition.applies(values, kind);
  }
  const features = TAB_DEFINITIONS.find((candidate) => candidate.tab === "features");
  const layout = kind === "thermostat" ? features?.thermostat?.(values) : features?.central?.(values);
  const offered = (layout?.base ?? []).flatMap((name) => fieldsOf(name)).some((field) => field.key === feature);
  return offered && definition.applies({ ...values, [feature]: true }, kind);
}

/**
 * The last part of the identifier of the contribution of a tab.
 *
 * A native plugin with a single tab names it `main` (`core_tpi.tab.main`); the plugin `core`, which holds several tabs, names each
 * one after its tab (`core.tab.features`).
 */
const tabKey = (definition: TabDefinition): string => (TAB_DEFINITIONS.filter((candidate) => candidate.plugin === definition.plugin).length === 1 ? "main" : definition.tab);

/** The identifier of the contribution of a tab in the menu of a thermostat. */
export const thermostatContributionId = (definition: TabDefinition): string => `${definition.plugin}.tab.${tabKey(definition)}`;

/** The identifier of the contribution of a tab in the general configuration. */
export const centralContributionId = (definition: TabDefinition): string => `${definition.plugin}.general.${tabKey(definition)}`;

/** The native plugins that hold the tabs, in the order of the menu. */
export const NATIVE_TAB_PLUGINS: readonly string[] = [...new Set(TAB_DEFINITIONS.map((definition) => definition.plugin))];

/** Find the definition of the tab of a contribution, by the identifier of the contribution. */
export function definitionOfContribution(contributionId: string): { definition: TabDefinition; kind: ConfigKind } | undefined {
  for (const definition of TAB_DEFINITIONS) {
    if (thermostatContributionId(definition) === contributionId) {
      return { definition, kind: "thermostat" };
    }
    if (centralContributionId(definition) === contributionId) {
      return { definition, kind: "central" };
    }
  }
  return undefined;
}

/** The types of thermostat that a creation offers, as the flow names them. */
export const THERMOSTAT_TYPES = ["thermostat_over_switch", "thermostat_over_climate", "thermostat_over_valve"] as const;

/** The `thermostat_type` of the central configuration. */
export const CENTRAL_TYPE = "thermostat_central_config";

/**
 * The sections that a creation shows, in their order: the ones that a new configuration needs. The sections that depend on the type
 * of the thermostat (`type` holds its underlyings, then TPI) come after the main one. The type itself is chosen on a screen before.
 */
export const CREATION_TABS: Readonly<Record<ConfigKind, readonly FlowTab[]>> = {
  thermostat: ["main", "type", "tpi", "advanced"],
  central: ["main", "tpi", "advanced"],
};

const layoutFor = (definition: TabDefinition, kind: ConfigKind, values: Values): TabLayout | undefined => (kind === "thermostat" ? definition.thermostat : definition.central)?.(values);

const fieldsOfLayout = (layout: TabLayout): FieldSpec[] => [...layout.base, ...(layout.specific ?? []), ...(layout.extra ?? [])].flatMap((name) => fieldsOf(name));

const creationDefinitions = (kind: ConfigKind): TabDefinition[] => CREATION_TABS[kind].map((tab) => TAB_DEFINITIONS.find((definition) => definition.tab === tab) as TabDefinition);

/**
 * The values of a creation as the flow will see them: the draft over the defaults of the forms of the creation. A new draft does not
 * hold the defaults, but a rule such as "TPI applies when the function is `tpi`" reads them.
 */
export function creationValues(kind: ConfigKind, values: Values): Values {
  const defaults: Record<string, unknown> = {};
  for (const definition of creationDefinitions(kind)) {
    const layout = layoutFor(definition, kind, values);
    for (const field of layout === undefined ? [] : fieldsOfLayout(layout)) {
      const value = defaultOf(field, undefined);
      if (value !== undefined && value !== null && value !== "") {
        defaults[field.key] = value;
      }
    }
  }
  return { ...defaults, ...Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null)) };
}

/** The sections of a creation that apply for these values, in the order of the creation. */
export function creationTabs(kind: ConfigKind, values: Values): TabDefinition[] {
  const shown = creationValues(kind, values);
  return creationDefinitions(kind).filter((definition) => definition.applies(shown, kind));
}

/** The identifiers of the contributions of the sections of a creation, in order. */
export function creationContributionIds(kind: ConfigKind, values: Values): string[] {
  return creationTabs(kind, values).map((definition) => (kind === "thermostat" ? thermostatContributionId(definition) : centralContributionId(definition)));
}

/** The fields that the sections of a creation show for these values, by key, with the section that holds each one. */
export function creationFields(kind: ConfigKind, values: Values): ReadonlyMap<string, { readonly field: FieldSpec; readonly tab: FlowTab }> {
  const found = new Map<string, { field: FieldSpec; tab: FlowTab }>();
  const shown = creationValues(kind, values);
  for (const definition of creationTabs(kind, values)) {
    const layout = layoutFor(definition, kind, shown);
    for (const field of layout === undefined ? [] : fieldsOfLayout(layout)) {
      found.set(field.key, { field, tab: definition.tab });
    }
  }
  return found;
}

/**
 * The required fields that a creation still misses, by section. A section that uses the central configuration is not asked for its
 * specific values.
 *
 * @param kind - The kind of configuration that is created.
 * @param values - The values of the draft.
 * @param hasCentral - Whether a central configuration exists.
 */
export function creationMissing(kind: ConfigKind, values: Values, hasCentral: boolean): { readonly definition: TabDefinition; readonly fields: readonly FieldSpec[] }[] {
  const shown = creationValues(kind, values);
  return creationTabs(kind, values).flatMap((definition) => {
    const layout = layoutFor(definition, kind, shown);
    if (layout === undefined) {
      return [];
    }
    const inherited = layout.inherit !== undefined && hasCentral && shown[layout.inherit] !== false;
    const fields = missingRequired([...layout.base, ...(inherited ? [] : (layout.specific ?? []))].flatMap((name) => fieldsOf(name)), shown);
    return fields.length === 0 ? [] : [{ definition, fields }];
  });
}

/** Values that make every layout of the tabs appear, to list the forms that a tab can show. */
const SAMPLE_VALUES: readonly Values[] = (() => {
  const samples: Values[] = [];
  for (const thermostat_type of [SWITCH, CLIMATE, VALVE]) {
    for (const auto_regulation_mode of ["auto_regulation_none", "auto_regulation_valve"]) {
      for (const window_sensor_entity_id of [undefined, "binary_sensor.window"]) {
        for (const auto_tpi_calculation_method of ["average", "ema"]) {
          samples.push({
            thermostat_type,
            auto_regulation_mode,
            window_sensor_entity_id,
            auto_tpi_calculation_method,
            auto_tpi_mode: true,
            auto_tpi_enable_advanced_settings: true,
            use_tpi_central_config: false,
          });
        }
      }
    }
  }
  return samples;
})();

/**
 * List every form that a tab can show, whatever the values.
 *
 * @param definition - The tab.
 * @param kind - The kind of configuration.
 */
export function possibleSchemas(definition: TabDefinition, kind: ConfigKind): SchemaName[] {
  const layoutOf = kind === "thermostat" ? definition.thermostat : definition.central;
  if (layoutOf === undefined) {
    return [];
  }
  const found = new Set<SchemaName>();
  for (const values of SAMPLE_VALUES) {
    const layout = layoutOf(values);
    for (const name of [...layout.base, ...(layout.specific ?? []), ...(layout.extra ?? [])]) {
      found.add(name);
    }
  }
  return [...found].sort();
}

/** The fields that a native plugin shows: every field of every form of its tabs, for a thermostat and for the central configuration. */
export function fieldsOfPlugin(plugin: string): FieldSpec[] {
  const fields = new Map<string, FieldSpec>();
  for (const definition of TAB_DEFINITIONS.filter((candidate) => candidate.plugin === plugin)) {
    for (const kind of ["thermostat", "central"] as const) {
      for (const schema of possibleSchemas(definition, kind)) {
        for (const field of fieldsOf(schema)) {
          fields.set(`${field.key}|${field.translation_key ?? ""}`, field);
        }
      }
    }
  }
  return [...fields.values()];
}
