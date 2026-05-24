import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountTrustedHtml, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { parseTrustedHtmlFragment, readTrustedLightDom } from '../../lib/dom/trusted-html.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

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
        if (!this._slotCaptured) {
            return;
        }
        if (name === 'title') {
            this._syncTitle();
            this._syncOpen();
            return;
        }
        if (name === 'size') {
            this._syncSize();
            this._syncOpen();
            return;
        }
    }

    _captureParts() {
        const temp = parseTrustedHtmlFragment(readTrustedLightDom(this));
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
        mountTrustedHtml(body, this._slotContent);
        dialog.appendChild(body);

        if (this._footerContent) {
            const footer = createElement('footer', { className: 'core-modal__footer' });
            mountTrustedHtml(footer, this._footerContent);
            dialog.appendChild(footer);
        }

        host.appendChild(dialog);
        this.replaceChildren(host);
    }

    /**
     * Updates the dialog title without rebuilding body/footer slot content.
     */
    _syncTitle() {
        const dialog = this.querySelector('.core-modal');
        const header = dialog?.querySelector('.core-modal__header');
        if (!dialog || !header) {
            this.render();
            return;
        }

        const title = this.title;
        let titleEl = header.querySelector('.core-modal__title');

        if (title) {
            dialog.setAttribute('aria-labelledby', `${this.dialogId}-title`);
            if (titleEl) {
                titleEl.textContent = title;
            } else {
                titleEl = createElement('h2', {
                    className: 'core-modal__title',
                    text: title,
                    attrs: { id: `${this.dialogId}-title` }
                });
                header.insertBefore(titleEl, header.firstChild);
            }
            return;
        }

        dialog.removeAttribute('aria-labelledby');
        titleEl?.remove();
    }

    /**
     * Updates modal size classes without rebuilding slot content.
     */
    _syncSize() {
        const dialog = this.querySelector('.core-modal');
        if (!dialog) {
            this.render();
            return;
        }
        dialog.classList.remove('core-modal--sm', 'core-modal--lg', 'core-modal--full');
        if (this.sizeClass) {
            dialog.classList.add(this.sizeClass);
        }
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
        this.bindDelegated('click', '[data-core-modal-backdrop]', () => this._close('backdrop'));
        this.bindDelegated('click', '[data-core-modal-close]', () => this._close('close'));
    }

    cleanFunctional() {
        super.cleanFunctional();
        document.removeEventListener('keydown', this._onKeyDown);
    }
}

registerCoreComponent('core-modal', CoreModal);
