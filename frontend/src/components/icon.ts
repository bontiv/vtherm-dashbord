import { html } from "lit";
import type { TemplateResult } from "lit";

/**
 * Show an icon of Home Assistant, such as `mdi:cog`. The element `ha-icon` is the one of Home Assistant.
 *
 * @param icon - The name of the icon.
 */
export function renderIcon(icon: string | undefined): TemplateResult | undefined {
  return icon === undefined ? undefined : html`<ha-icon .icon=${icon} aria-hidden="true"></ha-icon>`;
}
