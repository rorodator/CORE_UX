/**
 * Creates a DOM element with optional class, text, attributes and children.
 *
 * @param {string} tag
 * @param {{ className?: string, text?: string, html?: string, attrs?: Record<string, string|boolean>, children?: Node[] }} [options]
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

/**
 * Appends parsed HTML fragment nodes into a parent element.
 *
 * @param {HTMLElement} parent
 * @param {string} html
 */
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
