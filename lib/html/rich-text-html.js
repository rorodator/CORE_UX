/**
 * Rich-text HTML helpers for {@link core-rich-text}.
 * Use {@link sanitizeRichTextHtml} before persisting or rendering stored user HTML.
 * Use {@link escapeHtml} when inserting plain text into HTML contexts.
 */

/** @type {Set<string>} */
const ALLOWED_TAGS = new Set([
    'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'A', 'SPAN', 'DIV',
]);

/** @type {Record<string, Set<string>>} */
const ALLOWED_ATTRS = {
    A: new Set(['href', 'target', 'rel']),
    SPAN: new Set(['style']),
    P: new Set(['style']),
    DIV: new Set(['style']),
};

/** @type {RegExp} */
const SAFE_HREF = /^(https?:|mailto:|#|\/|\?)/i;

/** @type {RegExp} */
const UNSAFE_HREF = /^(javascript:|data:)/i;

/** @type {RegExp} */
const ALLOWED_STYLE = /^(?:color:\s*(#[0-9a-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|[a-z]+)\s*;?\s*)?(?:text-align:\s*(left|center|right|justify)\s*;?\s*)?$/i;

/**
 * Escapes plain text for safe insertion into HTML markup.
 *
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
    if (text == null || text === '') {
        return '';
    }
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Returns plain text extracted from an HTML fragment.
 *
 * @param {string} html
 * @returns {string}
 */
export function getPlainTextFromHtml(html) {
    if (!html) {
        return '';
    }
    if (typeof document !== 'undefined' && document.createElement) {
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        return wrap.textContent || '';
    }
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Sanitizes style attribute to color and text-align only.
 *
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
export function sanitizeRichTextStyle(raw) {
    if (!raw) {
        return null;
    }
    const normalized = String(raw)
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .filter((part) => /^color\s*:/i.test(part) || /^text-align\s*:/i.test(part))
        .join('; ');
    if (!normalized || !ALLOWED_STYLE.test(`${normalized};`)) {
        return null;
    }
    return normalized;
}

/**
 * Sanitizes href values on anchor tags.
 *
 * @param {string|null|undefined} href
 * @returns {string|null}
 */
export function sanitizeRichTextHref(href) {
    if (!href) {
        return null;
    }
    const value = String(href).trim();
    if (UNSAFE_HREF.test(value) || !SAFE_HREF.test(value)) {
        return null;
    }
    return value;
}

/**
 * Returns sanitized HTML suitable for paste or programmatic insertion.
 *
 * @param {string} html
 * @param {string} [plainText]
 * @returns {string}
 */
export function sanitizeRichTextPaste(html, plainText) {
    const trimmedHtml = (html || '').trim();
    if (trimmedHtml) {
        return sanitizeRichTextHtml(trimmedHtml);
    }
    const text = (plainText || '').replace(/\r\n/g, '\n');
    if (!text) {
        return '';
    }
    return text
        .split('\n')
        .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>'))
        .join('');
}

/**
 * Plain-text length used for maxlength validation (UTF-16 code units, same as HTML maxlength).
 *
 * @param {string} html
 * @returns {number}
 */
export function getRichTextPlainLength(html) {
    return getPlainTextFromHtml(html).length;
}

/**
 * @param {Document} doc
 * @param {Element} element
 */
function copyAllowedAttributes(doc, source, target) {
    const allowed = ALLOWED_ATTRS[source.tagName];
    if (!allowed) {
        return;
    }
    allowed.forEach((attr) => {
        if (!source.hasAttribute(attr)) {
            return;
        }
        const raw = source.getAttribute(attr);
        if (attr === 'href') {
            const safeHref = sanitizeRichTextHref(raw);
            if (safeHref) {
                target.setAttribute('href', safeHref);
                target.setAttribute('rel', 'noopener noreferrer');
                if (/^https?:/i.test(safeHref)) {
                    target.setAttribute('target', '_blank');
                }
            }
            return;
        }
        if (attr === 'style') {
            const safeStyle = sanitizeRichTextStyle(raw);
            if (safeStyle) {
                target.setAttribute('style', safeStyle);
            }
        }
    });
}

/**
 * @param {Document} doc
 * @param {Node} node
 * @returns {Node|null}
 */
function cleanNode(doc, node) {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.cloneNode(false);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const el = /** @type {Element} */ (node);
    const tag = el.tagName.toUpperCase();

    if (!ALLOWED_TAGS.has(tag)) {
        const fragment = doc.createDocumentFragment();
        Array.from(el.childNodes).forEach((child) => {
            const cleaned = cleanNode(doc, child);
            if (cleaned) {
                fragment.appendChild(cleaned);
            }
        });
        return fragment;
    }

    const out = doc.createElement(tag.toLowerCase());
    copyAllowedAttributes(doc, el, out);

    Array.from(el.childNodes).forEach((child) => {
        const cleaned = cleanNode(doc, child);
        if (!cleaned) {
            return;
        }
        if (cleaned.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            while (cleaned.firstChild) {
                out.appendChild(cleaned.firstChild);
            }
        } else {
            out.appendChild(cleaned);
        }
    });

    return out;
}

/**
 * Whitelist sanitizer aligned with {@link core-rich-text} formatting commands.
 *
 * @param {string} html
 * @returns {string}
 */
export function sanitizeRichTextHtml(html) {
    if (!html) {
        return '';
    }
    if (typeof document === 'undefined' || !document.createElement) {
        return String(html).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    }

    const doc = document;
    const source = doc.createElement('div');
    source.innerHTML = html;

    const cleanedRoot = doc.createElement('div');
    Array.from(source.childNodes).forEach((child) => {
        const cleaned = cleanNode(doc, child);
        if (!cleaned) {
            return;
        }
        if (cleaned.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            while (cleaned.firstChild) {
                cleanedRoot.appendChild(cleaned.firstChild);
            }
        } else {
            cleanedRoot.appendChild(cleaned);
        }
    });

    return cleanedRoot.innerHTML.trim();
}

/**
 * Normalizes editor output: empty paragraphs and stray wrappers.
 *
 * @param {string} html
 * @returns {string}
 */
export function normalizeRichTextHtml(html) {
    const sanitized = sanitizeRichTextHtml(html);
    if (!sanitized) {
        return '';
    }
    if (typeof document === 'undefined' || !document.createElement) {
        return sanitized;
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = sanitized;
    wrap.querySelectorAll('p,div').forEach((block) => {
        const text = (block.textContent || '').replace(/\u00a0/g, ' ').trim();
        const hasList = block.querySelector('ul,ol');
        if (!text && !hasList && block.innerHTML.replace(/<br\s*\/?>/gi, '').trim() === '') {
            block.remove();
        }
    });
    return wrap.innerHTML.trim();
}
