/**
 * Reads a boolean host attribute (present and not "false").
 *
 * @param {HTMLElement} el
 * @param {string} name
 * @returns {boolean}
 */
export function hasBoolAttr(el, name) {
    if (!el.hasAttribute(name)) {
        return false;
    }
    const value = el.getAttribute(name);
    return value === '' || value === 'true';
}

/**
 * Parses a JSON attribute safely.
 *
 * @param {HTMLElement} el
 * @param {string} name
 * @param {*} fallback
 * @returns {*}
 */
export function parseJsonAttr(el, name, fallback = []) {
    const raw = el.getAttribute(name);
    if (!raw) {
        return fallback;
    }
    try {
        return JSON.parse(raw);
    } catch (_) {
        return fallback;
    }
}

/**
 * Mirrors listed attributes from host to a child element.
 *
 * @param {HTMLElement} host
 * @param {HTMLElement} target
 * @param {string[]} names
 */
export function mirrorAttributes(host, target, names) {
    names.forEach((name) => {
        if (host.hasAttribute(name)) {
            target.setAttribute(name, host.getAttribute(name) || '');
        } else {
            target.removeAttribute(name);
        }
    });
}
