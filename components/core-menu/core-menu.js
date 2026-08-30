import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import './core-menu-item.js';
import './core-menu-separator.js';

/** @type {readonly string[]} */
const MENU_CHILD_TAGS = ['core-menu-item', 'core-menu-separator'];

/**
 * One open {@link CoreMenu} per Document. Distinct documents stay independent.
 *
 * @type {WeakMap<Document, CoreMenu>}
 */
const OPEN_MENU_BY_DOCUMENT = new WeakMap();

/**
 * Dropdown menu shell — trigger + panel; keeps declarative children alive inside the panel.
 */
export class CoreMenu extends Core_UXElement {

    static get observedAttributes() {
        return ['label', 'align', 'open', 'disabled'];
    }

    constructor() {
        super();
        /** @type {((event: MouseEvent) => void)|null} */
        this._onDocumentClick = null;
        /** @type {Document|null} */
        this._clickDocument = null;
        this._uid = Math.random().toString(36).slice(2, 9);
    }

    onConnect() {
        this.render();
        this._syncOpen();
    }

    onDisconnect() {
        this._releaseOpenExclusive();
    }

    attributeChangedCallback(name) {
        if (!this.isConnected) {
            return;
        }
        if (name === 'label') {
            this._syncLabel();
            return;
        }
        if (name === 'align') {
            this.render();
            this._syncOpen();
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

    get alignClass() {
        return this.getAttribute('align') === 'start' ? 'core-menu--align-start' : 'core-menu--align-end';
    }

    get triggerId() {
        return `${this.id || `core-menu-${this._uid}`}-trigger`;
    }

    get panelId() {
        return `${this.id || `core-menu-${this._uid}`}-panel`;
    }

    /**
     * Gathers declarative menu nodes from the host or an existing panel (re-render safe).
     *
     * @returns {HTMLElement[]}
     */
    _collectMenuNodes() {
        /** @type {HTMLElement[]} */
        const nodes = [];

        Array.from(this.children).forEach((child) => {
            if (MENU_CHILD_TAGS.includes(child.localName)) {
                nodes.push(/** @type {HTMLElement} */ (child));
            }
        });

        const panel = this.querySelector(':scope > .core-menu > .core-menu__panel');
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
     * @returns {HTMLElement[]}
     */
    _getFocusableItems() {
        const panel = this.querySelector('.core-menu__panel');
        if (!panel) {
            return [];
        }
        return Array.from(panel.querySelectorAll('[role="menuitem"]:not([disabled])'));
    }

    /**
     * @param {number} index
     */
    _focusItemAt(index) {
        const items = this._getFocusableItems();
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
     * @returns {number}
     */
    _currentFocusIndex() {
        const items = this._getFocusableItems();
        const active = this.ownerDocument.activeElement;
        const index = items.findIndex((item) => item === active);
        return index >= 0 ? index : 0;
    }

    ui_render() {
        const menuNodes = this._collectMenuNodes();

        const wrap = createElement('div', {
            className: `core-menu ${this.alignClass}`.trim(),
        });

        const trigger = createElement('button', {
            className: 'core-menu__trigger',
            attrs: {
                type: 'button',
                id: this.triggerId,
                'data-core-menu-trigger': true,
                'aria-haspopup': 'menu',
                'aria-controls': this.panelId,
                'aria-expanded': this.open ? 'true' : 'false',
                disabled: this.disabled || false,
            },
        });

        trigger.appendChild(createElement('span', {
            className: 'core-menu__label',
            text: this.label,
            attrs: { 'data-core-menu-label': true },
        }));
        trigger.appendChild(createElement('span', {
            className: 'core-menu__chevron',
            text: '\u25BE',
            attrs: { 'aria-hidden': 'true' },
        }));
        wrap.appendChild(trigger);

        const panel = createElement('div', {
            className: 'core-menu__panel',
            attrs: {
                id: this.panelId,
                role: 'menu',
                'aria-labelledby': this.triggerId,
                hidden: !this.open || undefined,
            },
        });

        menuNodes.forEach((node) => {
            panel.appendChild(node);
        });

        wrap.appendChild(panel);
        this.replaceChildren(wrap);
    }

    /**
     * Updates trigger label without rebuilding the panel.
     *
     * @param {string} label
     */
    setLabel(label) {
        this.setAttribute('label', label);
    }

    /**
     * Rebuilds the shell (e.g. after dynamic children are appended).
     */
    refresh() {
        this.render();
        this._syncOpen();
    }

    _syncLabel() {
        const labelEl = this.querySelector('[data-core-menu-label]');
        if (labelEl) {
            labelEl.textContent = this.label;
        }
    }

    _syncOpen() {
        const panel = this.querySelector('.core-menu__panel');
        const trigger = this.querySelector('[data-core-menu-trigger]');
        if (!panel || !trigger) {
            return;
        }
        if (this.open) {
            this._claimOpenExclusive();
            panel.removeAttribute('hidden');
            trigger.setAttribute('aria-expanded', 'true');
            this._bindDocumentClick();
            this._resetMenuTabindex();
            return;
        }
        this._releaseOpenExclusive();
        panel.setAttribute('hidden', '');
        trigger.setAttribute('aria-expanded', 'false');
        this._unbindDocumentClick();
    }

    /**
     * Registers this menu as the single open menu for {@link ownerDocument}.
     * Closes any other open peer without restoring that peer's trigger focus.
     * If the peer currently owned focus, moves focus to this trigger so it does
     * not remain inside a now-hidden panel (attribute-open path).
     */
    _claimOpenExclusive() {
        const ownerDocument = this.ownerDocument;
        if (!ownerDocument) {
            return;
        }
        const previous = OPEN_MENU_BY_DOCUMENT.get(ownerDocument);
        if (previous && previous !== this) {
            const active = ownerDocument.activeElement;
            const focusWasInPrevious = Boolean(active instanceof Node && previous.contains(active));
            previous._closeMenu({ restoreFocus: false, emitEvent: true });
            if (focusWasInPrevious) {
                this.querySelector('[data-core-menu-trigger]')?.focus();
            }
        }
        OPEN_MENU_BY_DOCUMENT.set(ownerDocument, this);
    }

    /**
     * Drops this menu from the document registry when it is the recorded open menu.
     * Must not run from {@link cleanFunctional} during render — only on real close/disconnect.
     */
    _releaseOpenExclusive() {
        const ownerDocument = this.ownerDocument;
        if (!ownerDocument) {
            return;
        }
        if (OPEN_MENU_BY_DOCUMENT.get(ownerDocument) === this) {
            OPEN_MENU_BY_DOCUMENT.delete(ownerDocument);
        }
    }

    _resetMenuTabindex() {
        const items = this._getFocusableItems();
        items.forEach((item, index) => {
            item.setAttribute('tabindex', index === 0 ? '0' : '-1');
        });
    }

    openMenu() {
        if (this.disabled || this.open) {
            return;
        }
        this.setAttribute('open', '');
        this._syncOpen();
        this._focusItemAt(0);
        this.dispatchEvent(new CustomEvent('core-menu-open', { bubbles: true }));
    }

    closeMenu() {
        this._closeMenu({ restoreFocus: true, emitEvent: true });
    }

    /**
     * @param {{ restoreFocus?: boolean, emitEvent?: boolean }} [options]
     */
    _closeMenu({ restoreFocus = true, emitEvent = true } = {}) {
        if (!this.open) {
            return;
        }
        this.removeAttribute('open');
        this._syncOpen();
        if (restoreFocus) {
            this.querySelector('[data-core-menu-trigger]')?.focus();
        }
        if (emitEvent) {
            this.dispatchEvent(new CustomEvent('core-menu-close', { bubbles: true }));
        }
    }

    toggleMenu() {
        if (this.open) {
            this.closeMenu();
            return;
        }
        this.openMenu();
    }

    _bindDocumentClick() {
        if (this._onDocumentClick) {
            return;
        }
        const ownerDocument = this.ownerDocument;
        if (!ownerDocument) {
            return;
        }
        this._onDocumentClick = (event) => {
            if (!this.open) {
                return;
            }
            const target = event.target;
            if (target instanceof Element && target.closest('core-menu') === this) {
                return;
            }
            this.closeMenu();
        };
        this._clickDocument = ownerDocument;
        ownerDocument.addEventListener('click', this._onDocumentClick);
    }

    _unbindDocumentClick() {
        if (!this._onDocumentClick) {
            return;
        }
        this._clickDocument?.removeEventListener('click', this._onDocumentClick);
        this._onDocumentClick = null;
        this._clickDocument = null;
    }

    _handleMenuKeydown(event) {
        if (!this.open) {
            return;
        }

        const items = this._getFocusableItems();
        if (!items.length) {
            return;
        }

        let nextIndex = this._currentFocusIndex();

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                nextIndex = nextIndex >= items.length - 1 ? 0 : nextIndex + 1;
                this._focusItemAt(nextIndex);
                break;
            case 'ArrowUp':
                event.preventDefault();
                nextIndex = nextIndex <= 0 ? items.length - 1 : nextIndex - 1;
                this._focusItemAt(nextIndex);
                break;
            case 'Home':
                event.preventDefault();
                this._focusItemAt(0);
                break;
            case 'End':
                event.preventDefault();
                this._focusItemAt(items.length - 1);
                break;
            case 'Escape':
                event.preventDefault();
                this.closeMenu();
                break;
            case 'Tab':
                this.closeMenu();
                break;
            default:
                break;
        }
    }

    ui_toFunctional() {
        this.bindDelegated('click', '[data-core-menu-trigger]', (event) => {
            if (this.disabled) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            this.toggleMenu();
        });

        this.bindDelegated('core-menu-item-select', 'core-menu-item', (event) => {
            if (this.disabled) {
                return;
            }
            event.stopPropagation();
            const value = event.detail?.value || '';
            this.closeMenu();
            this.dispatchEvent(new CustomEvent('core-menu-select', {
                bubbles: true,
                detail: { value },
            }));
        });

        this.bindUI('keydown', (event) => {
            const target = event.target;
            const onTrigger = target instanceof Element && Boolean(target.closest('[data-core-menu-trigger]'));

            if (onTrigger) {
                if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (!this.open) {
                        this.openMenu();
                    } else {
                        this._focusItemAt(0);
                    }
                    return;
                }
                if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    if (!this.open) {
                        this.openMenu();
                        this._focusItemAt(this._getFocusableItems().length - 1);
                    }
                    return;
                }
                if (event.key === 'Escape' && this.open) {
                    event.preventDefault();
                    this.closeMenu();
                }
                return;
            }

            if (target instanceof Element && target.closest('.core-menu__panel')) {
                this._handleMenuKeydown(event);
            }
        });
    }

    cleanFunctional() {
        super.cleanFunctional();
        this._unbindDocumentClick();
    }
}

registerCoreComponent('core-menu', CoreMenu);
