import { registerCustomElement } from 'CORE_JS/lib/utils/dom.js';

/**
 * Registers a CORE_UX custom element tag (core-*).
 *
 * @param {string} tagName
 * @param {typeof HTMLElement} Class
 */
export function registerCoreComponent(tagName, Class) {
    registerCustomElement(tagName, Class);
}
