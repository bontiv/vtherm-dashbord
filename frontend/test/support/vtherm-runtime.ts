/**
 * A thermostat of Versatile Thermostat in a fake `hass`: its device, its entities by translation key, and the attributes of its `climate`
 * entity as Versatile Thermostat publishes them, for the tests of the widgets of the overview of a thermostat.
 */

import { createFakeHass } from "@vtherm/dashboard-sdk/testing";
import type { FakeHass } from "@vtherm/dashboard-sdk/testing";

/** The configuration entry of the thermostat of the tests. */
export const ENTRY = "entry_salon";

/** The `climate` entity of the thermostat of the tests. */
export const CLIMATE = "climate.salon";

/** The types of thermostat of the tests. */
export type VthermKind = "over_switch" | "over_valve" | "over_climate" | "over_climate_valve";

/** The sensors that Versatile Thermostat creates for each type, by translation key. */
const SENSORS: Readonly<Record<VthermKind, readonly string[]>> = {
  over_switch: ["power_percent", "on_time", "off_time", "safety_state", "last_temperature_date"],
  over_valve: ["power_percent", "on_time", "off_time", "valve_open_percent", "safety_state"],
  over_climate: ["regulated_temperature", "safety_state"],
  over_climate_valve: ["power_percent", "valve_open_percent", "regulated_temperature", "safety_state"],
};

/** The entity of a sensor of the thermostat of the tests. */
export function sensorId(key: string): string {
  return `${key === "safety_state" ? "binary_sensor" : "sensor"}.salon_${key}`;
}

/** The attributes of the `climate` entity of a thermostat that works normally. */
export function climateAttributes(kind: VthermKind = "over_switch"): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    current_temperature: 19.5,
    temperature: 21,
    min_temp: 7,
    max_temp: 35,
    hvac_action: "heating",
    preset_mode: "comfort",
    is_ready: true,
    is_safety_configured: true,
    safety_manager: { safety_state: "off", safety_delay_min: 60, safety_min_on_percent: 0.5, safety_default_on_percent: 0.1 },
    requested_state: { hvac_mode: "heat", target_temperature: 21, preset: "comfort" },
    current_state: { hvac_mode: "heat", target_temperature: 21, preset: "comfort" },
    timed_preset_manager: { is_active: false, preset: null, original_preset: null, end_time: null, remaining_time_min: 0, is_manual_override: false, resume_preset: null, resume_end_time: null },
    specific_states: {
      ext_current_temperature: 6.2,
      last_central_mode: null,
      hvac_off_reason: null,
      hvac_mode_reason: null,
      is_sleeping: false,
      messages: [],
      not_initialized_entities: [],
      unavailable_underlying_entities: [],
      last_temperature_datetime: now,
      last_ext_temperature_datetime: now,
    },
    ...(kind === "over_switch" ? { power_percent: 62, on_percent: 0.62, vtherm_over_switch: { on_time_sec: 186, off_time_sec: 114 } } : {}),
    ...(kind === "over_valve" ? { power_percent: 40, on_percent: 0.4, valve_open_percent: 40 } : {}),
    ...(kind === "over_climate_valve" ? { power_percent: 40, on_percent: 0.4, valve_open_percent: 40 } : {}),
  };
}

/**
 * A fake `hass` with one thermostat of a type: its device, its entities, the state of its `climate` entity and of its sensors.
 *
 * @param kind - The type of the thermostat.
 * @param attributes - Attributes that replace those of a thermostat that works normally.
 * @param language - The language of the user.
 */
export function vthermHass(kind: VthermKind = "over_switch", attributes: Record<string, unknown> = {}, language = "en"): FakeHass {
  const hass = createFakeHass({ language });
  (hass as unknown as { config: unknown }).config = { unit_system: { temperature: "°C" } };
  hass.setDevice({ id: "device_salon", identifiers: [["versatile_thermostat", ENTRY]] });
  hass.setEntity({ entity_id: CLIMATE, device_id: "device_salon", platform: "versatile_thermostat" });
  for (const key of SENSORS[kind]) {
    hass.setEntity({ entity_id: sensorId(key), device_id: "device_salon", platform: "versatile_thermostat", translation_key: key });
  }
  hass.setState(CLIMATE, "heat", { ...climateAttributes(kind), ...attributes });
  hass.setState(sensorId("safety_state"), "off");
  return hass;
}

/** The text of a node and of the shadow roots under it, with the spaces made single. */
export function deepText(node: Node): string {
  const parts: string[] = [];
  const walk = (current: Node): void => {
    if (current.nodeType === 3) {
      parts.push(current.textContent ?? "");
    }
    const shadow = (current as Element).shadowRoot;
    if (shadow !== null && shadow !== undefined) {
      shadow.childNodes.forEach(walk);
    }
    current.childNodes.forEach(walk);
  };
  walk(node);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** The elements that match a selector in a node and in the shadow roots under it. */
export function deepFindAll<Found extends Element = HTMLElement>(node: Element | ShadowRoot, selector: string): Found[] {
  const found: Found[] = [...node.querySelectorAll<Found>(selector)];
  const roots = [...node.querySelectorAll("*")].map((element) => element.shadowRoot).filter((root): root is ShadowRoot => root !== null);
  if (node instanceof Element && node.shadowRoot !== null) {
    roots.push(node.shadowRoot);
  }
  return [...found, ...roots.flatMap((root) => deepFindAll<Found>(root, selector))];
}
