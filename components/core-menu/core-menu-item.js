import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, hasBoolAttr, mountTrustedHtml } from 'CORE_JS/lib/utils/dom.js';
import { readTrustedLightDom } from '../../lib/dom/trusted-html.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/** Stable hook for data-core-lang child on {@link CoreMenuItem}. */
const MENU_ITEM_LABEL_CHILD = '[data-core-menu-item-label]';

/**
 * Interactive menu entry — button menuitem inside {@link CoreMenu}.
 */
export class CoreMenuItem extends Core_UXElement {

    static get observedAttributes() {
        return ['value', 'label', 'disabled'];
    }

    constructor() {
        super();
        /** @type {string} */
        this._slotContent = '';
        /** @type {boolean} */
        this._slotCaptured = false;
    }

    onConnect() {
        this._captureSlot();
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
        }
    }

    get value() {
        return this.getAttribute('value') || '';
    }

    /**
     * Adds child selector to host data-core-lang so lang.process targets the inner label hook.
     */
    _patchLangAttr() {
        const raw = this.getAttribute('data-core-lang');
        if (!raw) {
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            const isArray = Array.isArray(parsed);
            const entries = isArray ? parsed : [parsed];
            let changed = false;

            entries.forEach((entry) => {
                if (entry?.container && entry?.name && !entry.child) {
                    entry.child = MENU_ITEM_LABEL_CHILD;
                    changed = true;
                }
            });

            if (changed) {
                this.setAttribute(
                    'data-core-lang',
                    JSON.stringify(isArray ? entries : entries[0]),
                );
            }
        } catch (_) {
            // Invalid JSON — Core_LangService logs on process.
        }
    }

    /**
     * Captures author light-DOM markup once (icons, rich labels).
     */
    _captureSlot() {
        if (this._slotCaptured) {
            return;
        }
        this._slotContent = readTrustedLightDom(this);
        this._slotCaptured = true;
    }

    render() {
        this._patchLangAttr();
        super.render();
    }

    ui_render() {
        const btn = createElement('button', {
            className: 'core-menu__item',
            attrs: {
                type: 'button',
                role: 'menuitem',
                'data-core-menu-item': true,
                'data-value': this.value,
                tabindex: '-1',
                disabled: hasBoolAttr(this, 'disabled') || undefined,
            },
        });

        const labelEl = createElement('span', {
            className: 'core-menu__item-label',
            attrs: { 'data-core-menu-item-label': true },
        });

        if (this._slotContent) {
            mountTrustedHtml(labelEl, this._slotContent);
        } else if (!this.getAttribute('data-core-lang') && this.getAttribute('label')) {
            labelEl.textContent = this.getAttribute('label') || '';
        }

        btn.appendChild(labelEl);
        this.replaceChildren(btn);
    }

    ui_toFunctional() {
        this.bindDelegated('click', '[data-core-menu-item]', (event) => {
            if (hasBoolAttr(this, 'disabled')) {
                return;
            }
            event.preventDefault();
            this.dispatchEvent(new CustomEvent('core-menu-item-select', {
                bubbles: true,
                detail: { value: this.value },
            }));
        });
    }
}

registerCoreComponent('core-menu-item', CoreMenuItem);
