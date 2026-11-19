/**
 * The base of the native widgets of the overview of a thermostat: the translations of their plugin, the thermostat that they read, and
 * the card in which they draw. They only show: none calls a service of Home Assistant.
 */

import type { AnyTranslations, ConfigValues } from "@vtherm/dashboard-sdk";
import { css } from "lit";
import type { CSSResultGroup } from "lit";

import { defineElement } from "../../components/define.ts";
import { NEW_THERMOSTAT } from "../../router.ts";
import { TAB_DEFINITIONS } from "../tab-definitions.ts";
import { narrowStyles } from "../../components/narrow-styles.ts";
import "../../components/overview/age.ts";
import "../../components/overview/bar.ts";
import "../../components/overview/gauge.ts";
import "../../components/overview/state-icon.ts";
import "../../components/overview/value-row.ts";
import "../../components/overview/widget-card.ts";
import { VThermOverviewWidget } from "../../components/overview/widget-base.ts";
import type { WidgetText } from "../../components/overview/format.ts";
import { runtimeOf } from "./runtime.ts";
import type { Runtime } from "./runtime.ts";

/** The styles that every native widget shares. */
export const widgetStyles: CSSResultGroup = [
  narrowStyles,
  css`
    :host {
      display: block;
      min-width: 0;
      height: 100%;
      color: var(--primary-text-color);
    }
    .lines {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .note {
      margin: 0;
      color: var(--secondary-text-color);
      overflow-wrap: anywhere;
    }
  `,
];

/** A native widget: it knows the translations of its plugin, and reads its thermostat from `hass`. */
export abstract class NativeWidget extends VThermOverviewWidget {
  static override properties = { ...VThermOverviewWidget.properties, language: { type: String }, values: { attribute: false }, centralValues: { attribute: false } };

  /** The translations of the plugin of the widget, given when the element is defined. */
  static translations: AnyTranslations | undefined;

  /** Changes with the language of the user, so that the texts are drawn again. */
  declare language: string;

  /**
   * The values of the configuration of the thermostat and of the central configuration, that the grid gives to the widgets of a
   * thermostat: what Versatile Thermostat does not publish, such as the outdoor sensor, is read there. Empty while they are read.
   */
  declare values: ConfigValues;
  declare centralValues: ConfigValues;

  constructor() {
    super();
    this.language = "";
    this.values = {};
    this.centralValues = {};
  }

  /** Translate a key of the catalog of the plugin of the widget. */
  protected readonly text: WidgetText = (key, params) => {
    const translations = (this.constructor as typeof NativeWidget).translations;
    return translations === undefined ? key : (translations.t as unknown as WidgetText)(key, params);
  };

  /** Whether the catalog of the plugin has a key: a code that Versatile Thermostat adds later has none, and is shown as it is. */
  protected knows(key: string): boolean {
    const english = (this.constructor as typeof NativeWidget).translations?.english as Readonly<Record<string, unknown>> | undefined;
    return english !== undefined && key in english;
  }

  /** The thermostat that the widget shows. */
  protected get runtime(): Runtime {
    return runtimeOf(this.hass, this.thermostatId);
  }

  protected readEntities(): readonly string[] {
    const runtime = this.runtime;
    return [...(runtime.climateId === undefined ? [] : [runtime.climateId]), ...runtime.entities.entities.map((entity) => entity.entityId)];
  }
}

/**
 * Define the element of a native widget with the translations of its plugin, once.
 *
 * @param tag - The tag name of the element.
 * @param widget - The class of the widget.
 * @param translations - The translations of its plugin.
 */
export function defineWidget(tag: string, widget: abstract new () => NativeWidget, translations: AnyTranslations): void {
  defineElement(
    tag,
    class extends (widget as unknown as typeof NativeWidget) {
      static override translations = translations;
    } as unknown as CustomElementConstructor,
  );
}

/** Whether a thermostat exists in Home Assistant: a thermostat being created has no entity yet, so its widgets would be empty. */
export const existingThermostat = ({ thermostatId }: { readonly thermostatId: string }): boolean => thermostatId !== "" && thermostatId !== NEW_THERMOSTAT;

/**
 * The values that apply to a thermostat for a section that can use the central configuration: the central ones when the thermostat
 * uses them (its option is not false), its own otherwise.
 *
 * @param values - The values of the thermostat.
 * @param central - The values of the central configuration.
 * @param option - The option that says whether the section uses the central configuration, for example `use_advanced_central_config`.
 */
export function sectionValues(values: ConfigValues, central: ConfigValues, option: string): ConfigValues {
  return Object.keys(central).length > 0 && values[option] !== false ? central : values;
}

/**
 * Whether the section of a native plugin applies to a thermostat, by the rule of its tab (`tab-definitions.ts`): its feature is on, and
 * for the auto start and stop, the thermostat is over a climate without a regulation by valve.
 *
 * @param plugin - The native plugin of the section, for example `core_window`.
 * @param values - The values of the thermostat.
 */
export function sectionApplies(plugin: string, values: ConfigValues): boolean {
  return TAB_DEFINITIONS.find((definition) => definition.plugin === plugin)?.applies(values, "thermostat") === true;
}
