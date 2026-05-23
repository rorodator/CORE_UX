/**
 * Doc demo shim — mirrors CORE_JS/lib/utils/dom.js for static pages (php -S from CORE_UX).
 * Keep in sync when dom helpers change in CORE_JS.
 *
 * SECURITY: use `trustedHtml` / `mountTrustedHtml` only for author-controlled markup
 * (compiled templates, static UI fragments). Never pass user input or API data — use `text`.
 */

/**
 * @param {string} tag
 * @param {{ className?: string, text?: string, trustedHtml?: string, attrs?: Record<string, string|boolean>, children?: Node[] }} [options]
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) {
        el.className = options.className;
    }
    if (options.text != null && options.text !== '') {
        el.textContent = options.text;
    }
    if (options.trustedHtml) {
        el.innerHTML = options.trustedHtml;
    }
    if (options.attrs) {
        Object.entries(options.attrs).forEach(([name, value]) => {
            if (value === false || value == null) {
                return;
            }
            if (value === true) {
                el.setAttribute(name, '');
            } else {
                el.setAttribute(name, String(value));
            }
        });
    }
    (options.children || []).forEach((child) => {
        if (child) {
            el.appendChild(child);
        }
    });
    return el;
}

/**
 * @param {HTMLElement} parent
 * @param {string} trustedHtml Author-controlled HTML only.
 */
export function mountTrustedHtml(parent, trustedHtml) {
    if (!trustedHtml) {
        return;
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = trustedHtml;
    while (wrap.firstChild) {
        parent.appendChild(wrap.firstChild);
    }
}

/**
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

/**
 * @param {string} tagName
 * @param {typeof HTMLElement} Class
 */
export function registerCustomElement(tagName, Class) {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, Class);
    }
}
