import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Badge — variants: neutral | primary | success | warning | error.
 */
export class CoreBadge extends Core_UXElement {

    static get observedAttributes() {
        return ['variant', 'label'];
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
        const allowed = ['primary', 'success', 'warning', 'error'];
        return allowed.includes(value) ? value : 'neutral';
    }

    ui_render() {
        this.replaceChildren(createElement('span', {
            className: `core-badge core-badge--${this.variant}`,
            text: this.getAttribute('label') || ''
        }));
    }
}

registerCoreComponent('core-badge', CoreBadge);
