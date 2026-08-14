import {
    createElement as createLucideElement,
    MessageSquareText,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide';

/** @type {Record<string, import('lucide').IconNode>} */
const CORE_ICON_SOURCES = {
    edit: Pencil,
    delete: Trash2,
    story: MessageSquareText,
    add: Plus,
    close: X,
};

/**
 * @param {string} name
 * @returns {import('lucide').IconNode|null}
 */
export function resolveCoreIcon(name) {
    return CORE_ICON_SOURCES[name] ?? null;
}

/**
 * @param {string} name
 * @param {{size?: number|string}} [options]
 * @returns {SVGElement|null}
 */
export function createCoreIconSvg(name, options = {}) {
    const source = resolveCoreIcon(name);
    if (!source) {
        return null;
    }
    const size = Number(options.size) || 16;
    return createLucideElement(source, {
        width: size,
        height: size,
        'stroke-width': 2,
        'aria-hidden': 'true',
    });
}
