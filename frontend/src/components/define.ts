/**
 * Define a custom element once.
 *
 * A module can be evaluated twice, for example when two bundles hold it, and a second definition of the same name throws.
 *
 * @param tag - The tag name.
 * @param element - The class of the element.
 */
export function defineElement(tag: string, element: CustomElementConstructor): void {
  if (customElements.get(tag) === undefined) {
    customElements.define(tag, element);
  }
}
