import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { FLIP_MAP_ALL, FloatingOverlay } from '../../lib/floating/floating-overlay.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import {
    collectMenuNodes,
    directSubmenus,
    focusMenuItem,
    getDirectMenuItems,
    handleMenuKeydown,
    menuFocusIndex,
    resetMenuTabindex,
} from './menu-navigation.js';

/**
 * One level of a menu chain. Not a root: it never claims `OPEN_MENU_BY_DOCUMENT`.
 * The owning menu or submenu calls {@link CoreMenuSubmenu.attachMenuOwner}.
 */
export class CoreMenuSubmenu extends Core_UXElement {

    static get observedAttributes() {
        return ['label', 'open', 'disabled'];
    }

    constructor() {
        super();
        /** @type {((event: KeyboardEvent) => void)|null} */
        this._onPanelKeydown = null;
        /** @type {((event: CustomEvent) => void)|null} */
        this._onPanelSelect = null;
        /** @type {FloatingOverlay|null} */
        this._floating = null;
        /**
         * Parent `core-menu` or `core-menu-submenu`. Set by that parent.
         * @type {(HTMLElement & { open?: boolean, disabled?: boolean, _menuOwner?: HTMLElement|null, closeMenu?: () => void, closeSiblingSubmenus?: (except: HTMLElement) => void })|null}
         */
        this._menuOwner = null;
        this._uid = Math.random().toString(36).slice(2, 9);
    }

    /**
     * @param {HTMLElement} owner
     */
    attachMenuOwner(owner) {
        this._menuOwner = owner;
    }

    /**
     * Resolves the parent menu when this element was moved before upgrade.
     */
    _ensureMenuOwner() {
        if (this._menuOwner) {
            return;
        }
        let parent = this.parentElement;
        while (parent) {
            if (parent.localName === 'core-menu' || parent.localName === 'core-menu-submenu') {
                this._menuOwner = parent;
                return;
            }
            parent = parent.parentElement;
        }
    }

    onConnect() {
        // A parent may move this element into its panel before this class is
        // upgraded, so attachMenuOwner was not available yet.
        this._ensureMenuOwner();
        // Portal moves disconnect and reconnect this host under linkedom.
        // The shell and its live children must survive that round-trip.
        if (this._shellReady()) {
            this.ui_toFunctional();
            return;
        }
        this.render();
        this._syncOpen();
    }

    onDisconnect() {
        this._closeOpenSubmenus();
        this._floating?.destroy();
        this._floating = null;
    }

    /**
     * @param {string} name
     */
    attributeChangedCallback(name) {
        if (!this.isConnected) {
            return;
        }
        if (name === 'label') {
            this._syncLabel();
            return;
        }
        if (name === 'disabled') {
            this._syncDisabled();
            return;
        }
        if (name === 'open') {
            this._syncOpen();
        }
    }

    get open() {
        return hasBoolAttr(this, 'open');
    }

    get disabled() {
        return hasBoolAttr(this, 'disabled');
    }

    get label() {
        return this.getAttribute('label') || '';
    }

    get triggerId() {
        return `${this.id || `core-menu-submenu-${this._uid}`}-trigger`;
    }

    get panelId() {
        return `${this.id || `core-menu-submenu-${this._uid}`}-panel`;
    }

    /** @returns {HTMLElement|null} */
    get triggerElement() {
        return this.querySelector(':scope > .core-menu-submenu > [data-core-menu-submenu-trigger]');
    }

    /**
     * @returns {HTMLElement|null}
     */
    _getPanel() {
        return this._floating?.getPanel()
            || this.querySelector(':scope > .core-menu-submenu > .core-menu__panel');
    }

    /** @returns {HTMLElement[]} */
    _directSubmenus() {
        return directSubmenus(this._getPanel());
    }

    /** @returns {HTMLElement[]} */
    _getFocusableItems() {
        return getDirectMenuItems(this._getPanel());
    }

    /**
     * Every ancestor must be open and enabled. An orphan submenu cannot open.
     *
     * @returns {boolean}
     */
    _ancestorsAllow() {
        let current = this._menuOwner;
        if (!current) {
            return false;
        }
        while (current) {
            if (current.disabled || !current.open) {
                return false;
            }
            current = current._menuOwner || null;
        }
        return true;
    }

    /**
     * @returns {boolean}
     */
    _canShow() {
        return this.open && !this.disabled && this._ancestorsAllow();
    }

    _closeOpenSubmenus() {
        this._directSubmenus().forEach((submenu) => {
            if (typeof submenu.closeTree === 'function') {
                submenu.closeTree();
            }
        });
    }

    /**
     * @param {HTMLElement} except
     */
    closeSiblingSubmenus(except) {
        this._directSubmenus().forEach((submenu) => {
            if (submenu !== except && typeof submenu.closeTree === 'function') {
                submenu.closeTree();
            }
        });
    }

    /**
     * Closes this level and every descendant. Does not move focus and does not
     * emit a public menu event.
     */
    closeTree() {
        if (this._closing) {
            return;
        }
        this._closing = true;
        try {
            this._closeOpenSubmenus();
            if (this.hasAttribute('open')) {
                this.removeAttribute('open');
            }
            this._hidePanel();
        } finally {
            this._closing = false;
        }
    }

    /**
     * Closes this level and restores focus to its own menuitem when this tree
     * owned the focus and the trigger is still enabled.
     */
    closeSubmenu() {
        const trigger = this.triggerElement;
        const restore = this._treeHasFocus();
        this.closeTree();
        if (restore && trigger && !trigger.hasAttribute('disabled')) {
            trigger.focus();
        }
    }

    /**
     * Opens this level when every ancestor is open and enabled.
     *
     * @returns {boolean}
     */
    openSubmenu() {
        if (this.disabled || !this._ancestorsAllow()) {
            if (this.hasAttribute('open') || this._hasOpenDescendant()) {
                this.closeTree();
            }
            return false;
        }
        this._menuOwner?.closeSiblingSubmenus?.(this);
        if (!this.open) {
            this.setAttribute('open', '');
        }
        this._syncOpen();
        const items = this._getFocusableItems();
        if (items.length) {
            focusMenuItem(items, 0);
        }
        return true;
    }

    /**
     * @param {Node|null} target
     * @returns {boolean}
     */
    containsTarget(target) {
        if (!target || !this.ownerDocument) {
            return false;
        }
        const insideHost = this.contains(target);
        const insideFloating = Boolean(this._floating?.containsTarget(target));
        if (insideHost || insideFloating) {
            return true;
        }
        return this._directSubmenus().some((submenu) => (
            typeof submenu.containsTarget === 'function' && submenu.containsTarget(target)
        ));
    }

    ui_render() {
        const menuNodes = collectMenuNodes(this, 'core-menu-submenu');
        const visible = this._canShow();
        const wrap = createElement('div', { className: 'core-menu-submenu' });

        const trigger = createElement('button', {
            className: 'core-menu__item core-menu__item--submenu',
            attrs: {
                type: 'button',
                id: this.triggerId,
                role: 'menuitem',
                'data-core-menu-submenu-trigger': true,
                'aria-haspopup': 'menu',
                'aria-controls': this.panelId,
                'aria-expanded': visible ? 'true' : 'false',
                tabindex: '-1',
                disabled: this.disabled || false,
            },
        });

        trigger.appendChild(createElement('span', {
            className: 'core-menu__item-label',
            text: this.label,
            attrs: { 'data-core-menu-submenu-label': true },
        }));
        trigger.appendChild(createElement('span', {
            className: 'core-menu__submenu-indicator',
            text: '\u25B8',
            attrs: { 'aria-hidden': 'true' },
        }));
        wrap.appendChild(trigger);

        const panel = createElement('div', {
            className: 'core-menu__panel',
            attrs: {
                id: this.panelId,
                role: 'menu',
                'aria-labelledby': this.triggerId,
                hidden: !visible || undefined,
            },
        });

        menuNodes.forEach((node) => {
            if (node.localName === 'core-menu-submenu' && typeof node.attachMenuOwner === 'function') {
                node.attachMenuOwner(this);
            }
            panel.appendChild(node);
        });

        wrap.appendChild(panel);
        this.replaceChildren(wrap);
    }

    _syncLabel() {
        const labelEl = this.querySelector(
            ':scope > .core-menu-submenu > [data-core-menu-submenu-trigger] [data-core-menu-submenu-label]',
        );
        if (labelEl) {
            labelEl.textContent = this.label;
        }
    }

    _syncDisabled() {
        const trigger = this.triggerElement;
        const moveFocus = this.disabled && this._treeHasFocus();
        if (trigger) {
            if (this.disabled) {
                trigger.setAttribute('disabled', '');
            } else {
                trigger.removeAttribute('disabled');
            }
        }
        if (this.disabled && (this.open || this._hasOpenDescendant())) {
            this.closeTree();
        }
        if (moveFocus) {
            this._focusOwnerItem();
        }
    }

    /**
     * Moves focus to an enabled item of the nearest ancestor menu.
     * When the disabled submenu was that parent's only activable item, walks
     * upward. The root trigger is the last activable fallback. Focus must not
     * stay in the closed branch.
     */
    _focusOwnerItem() {
        /** @type {HTMLElement|null} */
        let owner = this._menuOwner;
        while (owner) {
            const items = typeof owner._getFocusableItems === 'function'
                ? owner._getFocusableItems().filter((item) => !item.hasAttribute('disabled'))
                : [];
            if (items.length) {
                focusMenuItem(items, 0);
                return;
            }
            const parent = owner._menuOwner || null;
            if (parent) {
                owner = parent;
                continue;
            }
            const trigger = owner.querySelector('[data-core-menu-trigger]');
            if (trigger && !owner.disabled && !trigger.hasAttribute('disabled')) {
                trigger.focus();
                return;
            }
            const active = this.ownerDocument?.activeElement;
            if (active && typeof active.blur === 'function') {
                active.blur();
            }
            return;
        }
    }

    /**
     * True once {@link ui_render} has built the trigger shell.
     * Reconnects after a portal move must not rebuild live children.
     *
     * @returns {boolean}
     */
    _shellReady() {
        const wrap = this.firstElementChild;
        return Boolean(wrap && wrap.classList.contains('core-menu-submenu'));
    }

    _syncOpen() {
        if (this.open && !this._canShow()) {
            this.closeTree();
            return;
        }
        if (this.open) {
            const panel = this._getPanel();
            const trigger = this.triggerElement;
            if (!panel || !trigger) {
                return;
            }
            this._menuOwner?.closeSiblingSubmenus?.(this);
            panel.removeAttribute('hidden');
            trigger.setAttribute('aria-expanded', 'true');
            resetMenuTabindex(this._getFocusableItems());
            this._floating?.open();
            this._bindPanelInteraction();
            return;
        }
        this._closeOpenSubmenus();
        this._hidePanel();
    }

    _hidePanel() {
        this._unbindPanelInteraction();
        this._floating?.close();
        const panel = this._getPanel();
        const trigger = this.triggerElement;
        if (panel) {
            panel.setAttribute('hidden', '');
        }
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * @returns {boolean}
     */
    _hasOpenDescendant() {
        return this._directSubmenus().some((submenu) => submenu.open || submenu._hasOpenDescendant?.());
    }

    /**
     * @returns {boolean}
     */
    _treeHasFocus() {
        const active = this.ownerDocument?.activeElement;
        if (!active) {
            return false;
        }
        if (active === this.triggerElement) {
            return true;
        }
        return this.containsTarget(active);
    }

    /**
     * @returns {HTMLElement|null}
     */
    _rootMenu() {
        let current = this._menuOwner;
        /** @type {HTMLElement|null} */
        let root = null;
        while (current) {
            root = current;
            current = current._menuOwner || null;
        }
        return root;
    }

    /**
     * @param {HTMLElement} item
     * @returns {boolean}
     */
    _openSubmenuFromItem(item) {
        const submenu = this._directSubmenus().find((candidate) => candidate.triggerElement === item);
        if (!submenu || typeof submenu.openSubmenu !== 'function') {
            return false;
        }
        return submenu.openSubmenu() === true;
    }

    _bindPanelInteraction() {
        const panel = this._getPanel();
        if (!panel) {
            return;
        }

        if (!this._onPanelKeydown) {
            this._onPanelKeydown = (event) => {
                this._handleMenuKeydown(event);
            };
            panel.addEventListener('keydown', this._onPanelKeydown);
        }

        if (!this._onPanelSelect) {
            this._onPanelSelect = (event) => {
                event.stopPropagation();
                const value = event.detail?.value || '';
                this.dispatchEvent(new CustomEvent('core-menu-item-select', {
                    bubbles: true,
                    detail: { value },
                }));
            };
            panel.addEventListener('core-menu-item-select', this._onPanelSelect);
        }
    }

    _unbindPanelInteraction() {
        const panel = this._floating?.getPanel()
            || this.querySelector(':scope > .core-menu-submenu > .core-menu__panel');
        if (panel && this._onPanelKeydown) {
            panel.removeEventListener('keydown', this._onPanelKeydown);
        }
        if (panel && this._onPanelSelect) {
            panel.removeEventListener('core-menu-item-select', this._onPanelSelect);
        }
        this._onPanelKeydown = null;
        this._onPanelSelect = null;
    }

    /**
     * @param {KeyboardEvent} event
     */
    _handleMenuKeydown(event) {
        if (!this.open) {
            return;
        }
        handleMenuKeydown(event, {
            getItems: () => this._getFocusableItems(),
            focusAt: (index) => focusMenuItem(this._getFocusableItems(), index),
            currentIndex: () => menuFocusIndex(this._getFocusableItems(), this.ownerDocument?.activeElement),
            onEscape: () => this.closeSubmenu(),
            onTab: () => {
                const root = this._rootMenu();
                if (root && typeof root.closeMenu === 'function') {
                    root.closeMenu();
                }
            },
            onOpenSubmenu: (item) => this._openSubmenuFromItem(item),
            onCloseSubmenu: () => {
                this.closeSubmenu();
                return true;
            },
            isSubmenuTrigger: (item) => item.hasAttribute('data-core-menu-submenu-trigger'),
        });
    }

    _initFloating() {
        this._floating?.destroy();
        this._floating = new FloatingOverlay({
            host: this,
            getPanel: () => this.querySelector(':scope > .core-menu-submenu > .core-menu__panel'),
            getAnchor: () => this.triggerElement,
            getMountPoint: () => this.querySelector(':scope > .core-menu-submenu'),
            getPlacement: () => 'right',
            flipMap: FLIP_MAP_ALL,
            crossAlign: 'start',
            align: 'start',
        });
    }

    ui_toFunctional() {
        this._initFloating();
        if (this._canShow()) {
            this._floating?.open();
        }

        this.bindDelegated('click', '[data-core-menu-submenu-trigger]', (event, match) => {
            if (match !== this.triggerElement) {
                return;
            }
            if (this.disabled) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (this.open) {
                this.closeSubmenu();
                return;
            }
            this.openSubmenu();
        });
    }

    cleanFunctional() {
        super.cleanFunctional();
        this._closeOpenSubmenus();
        this._unbindPanelInteraction();
        this._floating?.destroy();
        this._floating = null;
    }
}

registerCoreComponent('core-menu-submenu', CoreMenuSubmenu);
