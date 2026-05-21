import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Horizontal divider, optional centred label.
 */
export class CoreDivider extends Core_UXElement {

    static get observedAttributes() {
        return ['label'];
    }

    onConnect() {
        this.render();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this.render();
        }
    }

    ui_render() {
        const label = this.getAttribute('label') || '';
        if (label) {
            this.replaceChildren(createElement('div', {
                className: 'core-divider core-divider--label',
                text: label,
                attrs: { role: 'separator' }
            }));
            return;
        }
        this.replaceChildren(createElement('hr', { className: 'core-divider' }));
    }
}

registerCoreComponent('core-divider', CoreDivider);
