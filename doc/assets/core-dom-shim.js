/**
 * Doc demo shim — mirrors CORE_JS/lib/utils/dom.js for static pages (php -S from CORE_UX).
 * Keep in sync when dom helpers change in CORE_JS.
 */

export function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className) {
        el.className = options.className;
    }
    if (options.text != null && options.text !== '') {
        el.textContent = options.text;
    }
    if (options.html) {
        el.innerHTML = options.html;
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

export function mountHtml(parent, html) {
    if (!html) {
        return;
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    while (wrap.firstChild) {
        parent.appendChild(wrap.firstChild);
    }
}

export function hasBoolAttr(el, name) {
    if (!el.hasAttribute(name)) {
        return false;
    }
    const value = el.getAttribute(name);
    return value === '' || value === 'true';
}

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

export function mirrorAttributes(host, target, names) {
    names.forEach((name) => {
        if (host.hasAttribute(name)) {
            target.setAttribute(name, host.getAttribute(name) || '');
        } else {
            target.removeAttribute(name);
        }
    });
}

export function registerCustomElement(tagName, Class) {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, Class);
    }
}
