import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement } from '../../lib/utils/dom.js';
import { hasBoolAttr } from '../../lib/utils/ux-attributes.js';
import { registerCoreComponent } from '../../lib/utils/register-component.js';

/**
 * Button — variants: primary | secondary | ghost | danger; sizes: sm | lg.
 */
export class CoreButton extends Core_UXElement {

    static get observedAttributes() {
        return ['variant', 'size', 'type', 'label', 'block', 'disabled'];
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
        if (value === 'secondary' || value === 'ghost' || value === 'danger') {
            return value;
        }
        return 'primary';
    }

    get sizeClass() {
        const value = this.getAttribute('size');
        return value === 'sm' || value === 'lg' ? value : '';
    }

    get buttonType() {
        const value = this.getAttribute('type');
        return value === 'submit' || value === 'reset' ? value : 'button';
    }

    get label() {
        return this.getAttribute('label') || '';
    }

    ui_render() {
        const classes = [
            'core-btn',
            `core-btn--${this.variant}`,
            this.sizeClass ? `core-btn--${this.sizeClass}` : '',
            hasBoolAttr(this, 'block') ? 'core-btn--block' : ''
        ].filter(Boolean).join(' ');

        const button = createElement('button', {
            className: classes,
            text: this.label,
            attrs: {
                type: this.buttonType,
                disabled: hasBoolAttr(this, 'disabled') || false
            }
        });
        this.replaceChildren(button);
    }
}

registerCoreComponent('core-button', CoreButton);
