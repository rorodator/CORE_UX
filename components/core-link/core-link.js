import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Styled anchor.
 */
export class CoreLink extends Core_UXElement {

    static get observedAttributes() {
        return ['href', 'label', 'external'];
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
        const attrs = { href: this.getAttribute('href') || '#' };
        if (hasBoolAttr(this, 'external')) {
            attrs.target = '_blank';
            attrs.rel = 'noopener noreferrer';
        }
        this.replaceChildren(createElement('a', {
            className: 'core-link',
            text: this.getAttribute('label') || this.getAttribute('href') || '',
            attrs
        }));
    }
}

registerCoreComponent('core-link', CoreLink);
