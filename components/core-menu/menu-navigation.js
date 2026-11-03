/** @type {readonly string[]} */
export const MENU_CHILD_TAGS = ['core-menu-item', 'core-menu-separator', 'core-menu-submenu'];

/**
 * Gathers declarative menu nodes from the host or an existing in-host panel.
 * Mirrors the historical `CoreMenu` collection: portaled panels are invisible
 * to this query, so callers must repatriate before re-rendering.
 *
 * @param {HTMLElement} host
 * @param {string} shellClass Wrapper class (`core-menu` or `core-menu-submenu`)
 * @returns {HTMLElement[]}
 */
export function collectMenuNodes(host, shellClass) {
    /** @type {HTMLElement[]} */
    const nodes = [];

    Array.from(host.children).forEach((child) => {
        if (MENU_CHILD_TAGS.includes(child.localName)) {
            nodes.push(/** @type {HTMLElement} */ (child));
        }
    });

    const panel = host.querySelector(`:scope > .${shellClass} > .core-menu__panel`);
    if (panel) {
        Array.from(panel.children).forEach((child) => {
            if (MENU_CHILD_TAGS.includes(child.localName) && !nodes.includes(child)) {
                nodes.push(/** @type {HTMLElement} */ (child));
            }
        });
    }

    return nodes;
}

/**
 * Direct activable menuitems of one panel. Nested panels are not walked.
 *
 * @param {HTMLElement|null|undefined} panel
 * @returns {HTMLElement[]}
 */
export function getDirectMenuItems(panel) {
    if (!panel) {
        return [];
    }

    /** @type {HTMLElement[]} */
    const items = [];

    Array.from(panel.children).forEach((child) => {
        if (!child || child.nodeType !== 1) {
            return;
        }
        if (child.localName === 'core-menu-item') {
            const button = child.querySelector(':scope > [role="menuitem"]:not([disabled])');
            if (button) {
                items.push(/** @type {HTMLElement} */ (button));
            }
            return;
        }
        if (child.localName === 'core-menu-submenu') {
            const submenu = /** @type {HTMLElement & { disabled?: boolean, triggerElement?: HTMLElement|null }} */ (child);
            if (submenu.disabled) {
                return;
            }
            const trigger = submenu.triggerElement;
            if (trigger && !trigger.hasAttribute('disabled')) {
                items.push(trigger);
            }
        }
    });

    return items;
}

/**
 * @param {HTMLElement|null|undefined} panel
 * @returns {HTMLElement[]}
 */
export function directSubmenus(panel) {
    if (!panel) {
        return [];
    }
    return Array.from(panel.children).filter((child) => child.localName === 'core-menu-submenu');
}

/**
 * @param {HTMLElement[]} items
 * @param {number} index
 */
export function focusMenuItem(items, index) {
    if (!items.length) {
        return;
    }
    const normalized = ((index % items.length) + items.length) % items.length;
    items.forEach((item, idx) => {
        item.setAttribute('tabindex', idx === normalized ? '0' : '-1');
    });
    items[normalized].focus();
}

/**
 * @param {HTMLElement[]} items
 * @param {Element|null|undefined} activeElement
 * @returns {number}
 */
export function menuFocusIndex(items, activeElement) {
    const index = items.findIndex((item) => item === activeElement);
    return index >= 0 ? index : 0;
}

/**
 * @param {HTMLElement[]} items
 */
export function resetMenuTabindex(items) {
    items.forEach((item, index) => {
        item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
}

/**
 * Shared menu key handler. Flat menus pass no-op submenu callbacks.
 *
 * @param {KeyboardEvent} event
 * @param {{
 *   getItems: () => HTMLElement[],
 *   focusAt: (index: number) => void,
 *   currentIndex: () => number,
 *   onEscape: () => void,
 *   onTab: () => void,
 *   onOpenSubmenu: (item: HTMLElement) => boolean,
 *   onCloseSubmenu: () => boolean,
 *   isSubmenuTrigger: (item: HTMLElement) => boolean,
 * }} controller
 */
export function handleMenuKeydown(event, controller) {
    const items = controller.getItems();
    if (!items.length) {
        return;
    }

    let nextIndex = controller.currentIndex();

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            nextIndex = nextIndex >= items.length - 1 ? 0 : nextIndex + 1;
            controller.focusAt(nextIndex);
            break;
        case 'ArrowUp':
            event.preventDefault();
            nextIndex = nextIndex <= 0 ? items.length - 1 : nextIndex - 1;
            controller.focusAt(nextIndex);
            break;
        case 'Home':
            event.preventDefault();
            controller.focusAt(0);
            break;
        case 'End':
            event.preventDefault();
            controller.focusAt(items.length - 1);
            break;
        case 'Escape':
            event.preventDefault();
            controller.onEscape();
            break;
        case 'Tab':
            controller.onTab();
            break;
        case 'ArrowRight': {
            const item = items[nextIndex];
            if (item && controller.isSubmenuTrigger(item) && controller.onOpenSubmenu(item)) {
                event.preventDefault();
            }
            break;
        }
        case 'ArrowLeft':
            if (controller.onCloseSubmenu()) {
                event.preventDefault();
            }
            break;
        case 'Enter':
        case ' ': {
            const item = items[nextIndex];
            if (item && controller.isSubmenuTrigger(item)) {
                event.preventDefault();
                controller.onOpenSubmenu(item);
            }
            break;
        }
        default:
            break;
    }
}
