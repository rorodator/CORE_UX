import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Alert banner — variants: info | success | warning | error.
 */
export class CoreAlert extends Core_UXElement {

    static get observedAttributes() {
        return ['variant', 'message', 'dismissible'];
    }

    onConnect() {
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
        }
    }

    get variant() {
        const value = this.getAttribute('variant');
        if (value === 'success' || value === 'warning' || value === 'error') {
            return value;
        }
        return 'info';
    }

    get message() {
        return this.getAttribute('message') || '';
    }

    ui_render() {
        const alert = createElement('div', {
            className: `core-alert core-alert--${this.variant}`,
            attrs: { role: 'alert' }
        });
        alert.appendChild(createElement('div', {
            className: 'core-alert__content',
            text: this.message
        }));
        if (hasBoolAttr(this, 'dismissible')) {
            alert.appendChild(createElement('button', {
                className: 'core-alert__dismiss',
                text: '\u00D7',
                attrs: {
                    type: 'button',
                    'data-core-alert-dismiss': true,
                    'aria-label': 'Dismiss'
                }
            }));
        }
        this.replaceChildren(alert);
    }

    ui_toFunctional() {
        this.querySelector('[data-core-alert-dismiss]')?.addEventListener('click', () => {
            this.hidden = true;
            this.dispatchEvent(new CustomEvent('core-alert-dismiss', { bubbles: true }));
        });
    }
}

registerCoreComponent('core-alert', CoreAlert);
