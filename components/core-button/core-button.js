import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import '../core-icon/core-icon.js';
import '../core-tooltip/core-tooltip.js';

/**
 * Button — variants: primary | secondary | ghost | danger; sizes: sm | lg; optional icon-only mode.
 */
export class CoreButton extends Core_UXElement {

    static get observedAttributes() {
        return [
            'variant',
            'size',
            'type',
            'label',
            'icon',
            'icon-only',
            'icon-danger',
            'block',
            'disabled',
        ];
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

    get iconName() {
        return this.getAttribute('icon') || '';
    }

    get iconOnly() {
        return hasBoolAttr(this, 'icon-only');
    }

    get iconDanger() {
        return hasBoolAttr(this, 'icon-danger');
    }

    ui_render() {
        const button = this._buildButton();
        if (this.iconOnly && this.label.trim()) {
            const tooltip = createElement('core-tooltip', {
                attrs: {
                    text: this.label,
                    position: 'top',
                },
            });
            tooltip.appendChild(button);
            this.replaceChildren(tooltip);
            return;
        }
        this.replaceChildren(button);
    }

    _buildButton() {
        const classes = [
            'core-btn',
            `core-btn--${this.variant}`,
            this.sizeClass ? `core-btn--${this.sizeClass}` : '',
            hasBoolAttr(this, 'block') ? 'core-btn--block' : '',
            this.iconOnly ? 'core-btn--icon-only' : '',
            this.iconOnly && this.iconDanger ? 'core-btn--icon-danger' : '',
        ].filter(Boolean).join(' ');

        const attrs = {
            type: this.buttonType,
            disabled: hasBoolAttr(this, 'disabled') || false,
        };
        if (this.iconOnly) {
            attrs['aria-label'] = this.label;
        }

        const button = createElement('button', {
            className: classes,
            attrs,
        });

        if (this.iconOnly && this.iconName) {
            button.appendChild(createElement('core-icon', {
                attrs: {
                    name: this.iconName,
                    size: this.sizeClass === 'sm' ? '15' : '16',
                },
            }));
        } else {
            button.textContent = this.label;
        }

        return button;
    }
}

registerCoreComponent('core-button', CoreButton);
