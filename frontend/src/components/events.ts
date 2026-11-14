/** The events that the components of the frame send to the panel. */

/** The event that asks the panel to open an address. */
export const NAVIGATE_EVENT = "vtherm-navigate";

/** The detail of the navigation event. */
export interface NavigateDetail {
  /** The address to open, under the path of the panel. */
  readonly path: string;
}

/**
 * Ask the panel to open an address.
 *
 * @param source - The element that sends the request. The event goes up through the shadow roots.
 * @param path - The address to open.
 */
export function navigate(source: HTMLElement, path: string): void {
  source.dispatchEvent(new CustomEvent<NavigateDetail>(NAVIGATE_EVENT, { detail: { path }, bubbles: true, composed: true }));
}

/** Open an address from a click on a link, unless the user wants a new tab or window. */
export function followLink(source: HTMLElement, event: MouseEvent, path: string): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  navigate(source, path);
}
