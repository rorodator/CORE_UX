import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';
import { applyThemeContext, clearThemeContext } from '../../lib/floating/floating-overlay.js';

/** @type {string[]} */
const POSITIONS = ['top-start', 'top-end', 'bottom-start', 'bottom-end'];

/**
 * Fixed viewport corner stack for {@link CoreNotif} toasts.
 * Portals to document.body while connected. Imperative API: show(), clear().
 */
export class CoreNotifHost extends Core_UXElement {

    static get observedAttributes() {
        return [
            'position', 'offset-top', 'offset-bottom', 'offset-left', 'offset-right', 'gap'
        ];
    }

    constructor() {
        super();
        /** @type {HTMLElement|null} */
        this._mountPoint = null;
        /** @type {boolean} */
        this._portaled = false;
    }

    onConnect() {
        this.render();
        this._portalToBody();
    }

    onDisconnect() {
        this._unportal();
    }

    attributeChangedCallback() {
        if (this.isConnected) {
            this._syncLayout();
            this.className = this._hostClassName();
        }
    }

    get position() {
        const value = this.getAttribute('position');
        return POSITIONS.includes(value) ? value : 'top-end';
    }

    /**
     * @param {{ variant?: string, message: string, duration?: number, dismissible?: boolean }} options
     * @returns {HTMLElement}
     */
    show(options) {
        if (!options?.message) {
            throw new Error('core-notif-host.show() requires a message');
        }

        const notif = document.createElement('core-notif');
        notif.setAttribute('message', String(options.message));

        if (options.variant) {
            notif.setAttribute('variant', String(options.variant));
        }
        if (options.duration != null) {
            notif.setAttribute('duration', String(options.duration));
        }
        if (options.dismissible === false) {
            notif.setAttribute('dismissible', 'false');
        }

        this._stack()?.appendChild(notif);
        return notif;
    }

    clear() {
        this.querySelectorAll('core-notif').forEach((notif) => {
            if (typeof notif.close === 'function') {
                notif.close();
            } else {
                notif.remove();
            }
        });
    }

    ui_render() {
        const orphans = [...this.querySelectorAll(':scope > core-notif')];
        let stack = this.querySelector('.core-notif-host__stack');

        if (!stack) {
            stack = createElement('div', {
                className: 'core-notif-host__stack',
                attrs: {
                    role: 'region',
                    'aria-live': 'polite',
                    'aria-label': 'Notifications'
                }
            });
        }

        orphans.forEach((notif) => stack.appendChild(notif));
        this.replaceChildren(stack);
        this.className = this._hostClassName();
        this._syncLayout();
    }

    /**
     * @returns {string}
     */
    _hostClassName() {
        return `core-notif-host core-notif-host--${this.position}`;
    }

    _syncLayout() {
        const top = this.getAttribute('offset-top');
        const bottom = this.getAttribute('offset-bottom');
        const left = this.getAttribute('offset-left');
        const right = this.getAttribute('offset-right');
        const gap = this.getAttribute('gap');

        this.style.setProperty('--core-notif-offset-top', top || '1rem');
        this.style.setProperty('--core-notif-offset-bottom', bottom || '1rem');
        this.style.setProperty('--core-notif-offset-left', left || '1rem');
        this.style.setProperty('--core-notif-offset-right', right || '1rem');
        this.style.setProperty('--core-notif-gap', gap || '0.5rem');
    }

    /** @returns {HTMLElement|null} */
    _stack() {
        return this.querySelector('.core-notif-host__stack');
    }

    _portalToBody() {
        if (this._portaled || this.parentElement === document.body) {
            this._portaled = true;
            return;
        }

        this._mountPoint = this.parentElement;
        applyThemeContext(this, this);
        document.body.appendChild(this);
        this._portaled = true;
    }

    _unportal() {
        if (!this._portaled) {
            return;
        }

        clearThemeContext(this);

        if (this.parentElement === document.body && this._mountPoint) {
            this._mountPoint.appendChild(this);
        }

        this._portaled = false;
    }
}

registerCoreComponent('core-notif-host', CoreNotifHost);
