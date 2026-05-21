import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement } from '../../lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/utils/register-component.js';

/**
 * Loading spinner — sizes: sm | md | lg.
 */
export class CoreSpinner extends Core_UXElement {

    static get observedAttributes() {
        return ['size', 'label'];
    }

    onConnect() {
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
        }
    }

    get size() {
        const value = this.getAttribute('size');
        return value === 'sm' || value === 'lg' ? value : 'md';
    }

    ui_render() {
        const spinner = createElement('span', {
            className: `core-spinner core-spinner--${this.size}`,
            attrs: { role: 'status', 'aria-live': 'polite' }
        });
        spinner.appendChild(createElement('span', {
            className: 'sr-only',
            text: this.getAttribute('label') || 'Loading'
        }));
        this.replaceChildren(spinner);
    }
}

registerCoreComponent('core-spinner', CoreSpinner);
