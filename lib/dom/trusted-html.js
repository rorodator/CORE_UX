/**
 * Helpers for author-controlled HTML in CORE_UX (templates, static light DOM).
 * Aligns with CORE_JS dom.js: `text` for user/API strings, `trustedHtml` / `mountTrustedHtml` for markup.
 */

/**
 * Reads trimmed innerHTML from a host element (light DOM written in templates).
 *
 * @param {HTMLElement} el
 * @returns {string}
 */
export function readTrustedLightDom(el) {
    return el.innerHTML.trim();
}

/**
 * Parses author-controlled HTML into a detached container (slot/footer extraction).
 *
 * @param {string} trustedHtml
 * @returns {HTMLDivElement}
 */
export function parseTrustedHtmlFragment(trustedHtml) {
    const temp = document.createElement('div');
    if (trustedHtml) {
        temp.innerHTML = trustedHtml;
    }
    return temp;
}
