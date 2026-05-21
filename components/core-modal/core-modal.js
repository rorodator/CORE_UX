import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountHtml } from '../../lib/utils/dom.js';
import { hasBoolAttr } from '../../lib/utils/ux-attributes.js';
import { registerCoreComponent } from '../../lib/utils/register-component.js';

/**
 * Modal dialog. Open with `open` attribute. Body/footer via light DOM.
 */
export class CoreModal extends Core_UXSlotElement {

    static get observedAttributes() {
        return ['open', 'title', 'size'];
    }

    constructor() {
        super();
        this._footerContent = '';
        this._uid = Math.random().toString(36).slice(2, 9);
        this._onKeyDown = this._onKeyDown.bind(this);
    }

    onConnect() {
        if (!this._slotCaptured) {
            this._captureParts();
            this._slotCaptured = true;
        }
        this.render();
        this._syncOpen();
    }

    onDisconnect() {
        document.removeEventListener('keydown', this._onKeyDown);
    }

    attributeChangedCallback(name) {
        if (!this.isConnected) {
            return;
        }
        if (name === 'open') {
            this._syncOpen();
            return;
        }
        if (this._slotCaptured) {
            this.render();
            this._syncOpen();
        }
    }

    _captureParts() {
        const temp = document.createElement('div');
        temp.innerHTML = this.innerHTML.trim();
        const footer = temp.querySelector('[data-core-footer]');
        if (footer) {
            this._footerContent = footer.innerHTML;
            footer.remove();
        }
        this._slotContent = temp.innerHTML.trim();
    }

    get open() {
        return hasBoolAttr(this, 'open');
    }

    get title() {
        return this.getAttribute('title') || '';
    }

    get dialogId() {
        return this.getAttribute('id') || `core-modal-${this._uid}`;
    }

    get sizeClass() {
        const size = this.getAttribute('size');
        if (size === 'sm' || size === 'lg' || size === 'full') {
            return `core-modal--${size}`;
        }
        return '';
    }

    ui_render() {
        const host = createElement('div', {
            className: 'core-modal-host',
            attrs: { hidden: true, role: 'presentation' }
        });
        host.appendChild(createElement('div', {
            className: 'core-modal-backdrop',
            attrs: { 'data-core-modal-backdrop': true }
        }));

        const modalClasses = ['core-modal', this.sizeClass].filter(Boolean).join(' ');
        const dialogAttrs = {
            role: 'dialog',
            'aria-modal': 'true'
        };
        if (this.title) {
            dialogAttrs['aria-labelledby'] = `${this.dialogId}-title`;
        }
        const dialog = createElement('div', { className: modalClasses, attrs: dialogAttrs });

        const header = createElement('header', { className: 'core-modal__header' });
        if (this.title) {
            header.appendChild(createElement('h2', {
                className: 'core-modal__title',
                text: this.title,
                attrs: { id: `${this.dialogId}-title` }
            }));
        }
        header.appendChild(createElement('button', {
            className: 'core-modal__close',
            text: '\u00D7',
            attrs: {
                type: 'button',
                'data-core-modal-close': true,
                'aria-label': 'Close'
            }
        }));
        dialog.appendChild(header);

        const body = createElement('div', { className: 'core-modal__body' });
        mountHtml(body, this._slotContent);
        dialog.appendChild(body);

        if (this._footerContent) {
            const footer = createElement('footer', { className: 'core-modal__footer' });
            mountHtml(footer, this._footerContent);
            dialog.appendChild(footer);
        }

        host.appendChild(dialog);
        this.replaceChildren(host);
    }

    _syncOpen() {
        const host = this.querySelector('.core-modal-host');
        if (!host) {
            return;
        }
        if (this.open) {
            host.removeAttribute('hidden');
            document.addEventListener('keydown', this._onKeyDown);
            this.querySelector('[data-core-modal-close]')?.focus();
        } else {
            host.setAttribute('hidden', '');
            document.removeEventListener('keydown', this._onKeyDown);
        }
    }

    _onKeyDown(event) {
        if (event.key === 'Escape' && this.open) {
            this._close('escape');
        }
    }

    _close(reason) {
        this.removeAttribute('open');
        this.dispatchEvent(new CustomEvent('core-modal-close', {
            bubbles: true,
            detail: { reason }
        }));
    }

    ui_toFunctional() {
        this.querySelector('[data-core-modal-backdrop]')
            ?.addEventListener('click', () => this._close('backdrop'));
        this.querySelectorAll('[data-core-modal-close]').forEach((btn) => {
            btn.addEventListener('click', () => this._close('close'));
        });
    }

    cleanFunctional() {
        document.removeEventListener('keydown', this._onKeyDown);
    }
}

registerCoreComponent('core-modal', CoreModal);
