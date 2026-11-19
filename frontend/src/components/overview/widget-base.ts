/**
 * What the native widgets share to stay cheap: they draw again only when an entity that they read changes, and they read a history only
 * once their card is visible.
 */

import type { CentralContext, Hass } from "@vtherm/dashboard-sdk";
import { LitElement } from "lit";
import type { PropertyValues } from "lit";

/**
 * Whether a new state of Home Assistant changes what a widget shows: the state of one of its entities, the language, the units or the
 * registries. Home Assistant gives a new object for each state that changes, so a state that did not change is the same object.
 *
 * @param previous - The state of Home Assistant that the widget drew.
 * @param next - The new state of Home Assistant.
 * @param entityIds - The entities that the widget reads.
 */
export function readEntitiesChanged(previous: Hass | undefined, next: Hass | undefined, entityIds: readonly string[]): boolean {
  if (previous === undefined || next === undefined) {
    return previous !== next;
  }
  if (previous.language !== next.language || previous.locale !== next.locale || previous.config !== next.config) {
    return true;
  }
  if (previous.entities !== next.entities || previous.devices !== next.devices) {
    return true;
  }
  return entityIds.some((entityId) => previous.states[entityId] !== next.states[entityId]);
}

/**
 * Call `onVisible` once, when the element enters the visible part of the page. Without `IntersectionObserver`, it is called at once.
 *
 * @param element - The element to watch.
 * @param onVisible - What to do when it is visible, for example read a history.
 * @returns A function that stops watching.
 */
export function whenVisible(element: Element, onVisible: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    onVisible();
    return () => undefined;
  }
  const observer = new IntersectionObserver((records) => {
    if (records.some((record) => record.isIntersecting)) {
      observer.disconnect();
      onVisible();
    }
  });
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * The base of a native widget: the properties that the grid gives, a redraw limited to the entities that the widget reads, and a signal
 * that is set once the card is visible, to read a history then.
 */
export abstract class VThermOverviewWidget extends LitElement {
  static override properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    thermostatId: { type: String },
    central: { attribute: false },
    visible: { state: true },
  };

  /** The state of Home Assistant. */
  declare hass: Hass | undefined;

  /** Whether the screen is narrow. */
  declare narrow: boolean;

  /** The configuration entry of the thermostat of a thermostat widget. */
  declare thermostatId: string;

  /** The central configuration, for a widget of the Overview page. */
  declare central: CentralContext | undefined;

  /** Whether the card has been visible: a widget reads its history only then. */
  declare visible: boolean;

  private stopWatching: (() => void) | undefined;

  constructor() {
    super();
    this.hass = undefined;
    this.narrow = false;
    this.thermostatId = "";
    this.central = undefined;
    this.visible = false;
  }

  /** The entities that the widget reads: a change of another entity does not draw it again. */
  protected abstract readEntities(): readonly string[];

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.visible) {
      this.stopWatching = whenVisible(this, () => {
        this.visible = true;
      });
    }
  }

  override disconnectedCallback(): void {
    this.stopWatching?.();
    this.stopWatching = undefined;
    super.disconnectedCallback();
  }

  protected override shouldUpdate(changed: PropertyValues): boolean {
    if (changed.size === 1 && changed.has("hass") && this.hasUpdated) {
      return readEntitiesChanged(changed.get("hass") as Hass | undefined, this.hass, this.readEntities());
    }
    return true;
  }
}
