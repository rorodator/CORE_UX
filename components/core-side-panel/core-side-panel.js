import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountHtml } from '../../lib/utils/dom.js';
import { hasBoolAttr } from '../../lib/utils/ux-attributes.js';
import { registerCoreComponent } from '../../lib/utils/register-component.js';

/**
 * Side panel (drawer). Open with `open` attribute. Position: left | right | top | bottom.
 */
export class CoreSidePanel extends Core_UXSlotElement {

    static get observedAttributes() {
        return ['open', 'title', 'position', 'size'];
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

    get panelId() {
        return this.getAttribute('id') || `core-side-panel-${this._uid}`;
    }

    get position() {
        const value = (this.getAttribute('position') || 'right').toLowerCase();
        if (value === 'left' || value === 'top' || value === 'bottom') {
            return value;
        }
        return 'right';
    }

    get sizeClass() {
        const size = this.getAttribute('size');
        if (size === 'sm' || size === 'lg' || size === 'full') {
            return `core-side-panel--${size}`;
        }
        return 'core-side-panel--md';
    }

    ui_render() {
        const host = createElement('div', {
            className: 'core-side-panel-host',
            attrs: { hidden: true, role: 'presentation' }
        });
        host.appendChild(createElement('div', {
            className: 'core-side-panel-backdrop',
            attrs: { 'data-core-side-panel-backdrop': true }
        }));

        const panelClasses = [
            'core-side-panel',
            `core-side-panel--${this.position}`,
            this.sizeClass
        ].join(' ');

        const panelAttrs = {
            role: 'dialog',
            'aria-modal': 'true'
        };
        if (this.title) {
            panelAttrs['aria-labelledby'] = `${this.panelId}-title`;
        }

        const panel = createElement('aside', { className: panelClasses, attrs: panelAttrs });

        const header = createElement('header', { className: 'core-side-panel__header' });
        if (this.title) {
            header.appendChild(createElement('h2', {
                className: 'core-side-panel__title',
                text: this.title,
                attrs: { id: `${this.panelId}-title` }
            }));
        }
        header.appendChild(createElement('button', {
            className: 'core-side-panel__close',
            text: '\u00D7',
            attrs: {
                type: 'button',
                'data-core-side-panel-close': true,
                'aria-label': 'Close'
            }
        }));
        panel.appendChild(header);

        const body = createElement('div', { className: 'core-side-panel__body' });
        mountHtml(body, this._slotContent);
        panel.appendChild(body);

        if (this._footerContent) {
            const footer = createElement('footer', { className: 'core-side-panel__footer' });
            mountHtml(footer, this._footerContent);
            panel.appendChild(footer);
        }

        host.appendChild(panel);
        this.replaceChildren(host);
    }

    _syncOpen() {
        const host = this.querySelector('.core-side-panel-host');
        if (!host) {
            return;
        }
        if (this.open) {
            host.removeAttribute('hidden');
            host.classList.add('core-side-panel-host--open');
            document.addEventListener('keydown', this._onKeyDown);
            this.querySelector('[data-core-side-panel-close]')?.focus();
        } else {
            host.classList.remove('core-side-panel-host--open');
            host.setAttribute('hidden', '');
            document.removeEventListener('keydown', this._onKeyDown);
        }
    }

    _onKeyDown(event) {
        if (event.key === 'Escape' && this.open) {
            this._close('escape');
        }
    }

    /**
     * @param {string} reason
     */
    _close(reason) {
        this.removeAttribute('open');
        this.dispatchEvent(new CustomEvent('core-side-panel-close', {
            bubbles: true,
            detail: { reason }
        }));
    }

    ui_toFunctional() {
        this.querySelector('[data-core-side-panel-backdrop]')
            ?.addEventListener('click', () => this._close('backdrop'));
        this.querySelectorAll('[data-core-side-panel-close]').forEach((btn) => {
            btn.addEventListener('click', () => this._close('close'));
        });
    }

    cleanFunctional() {
        document.removeEventListener('keydown', this._onKeyDown);
    }
}

registerCoreComponent('core-side-panel', CoreSidePanel);
