/**
 * Registers a custom element only if the tag is not already defined.
 *
 * @param {string} tagName
 * @param {typeof HTMLElement} Class
 */
export function registerCoreComponent(tagName, Class) {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, Class);
    }
}
