import { Core_UXElement } from '../../lib/base/core-ux-element.js';
import { createElement, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/** @type {string[]} */
const VARIANTS = ['info', 'success', 'warning', 'error'];

/**
 * Toast notification — use inside {@link CoreNotifHost} or via host.show().
 * Auto-dismiss after duration (default 5s); manual close via × or close().
 */
export class CoreNotif extends Core_UXElement {

    static get observedAttributes() {
        return ['variant', 'message', 'duration', 'dismissible'];
    }

    constructor() {
        super();
        /** @type {number|null} */
        this._timer = null;
        /** @type {boolean} */
        this._closing = false;
        /** @type {boolean} */
        this._shown = false;
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
        return VARIANTS.includes(value) ? value : 'info';
    }

    get message() {
        return this.getAttribute('message') || '';
    }

    /** @returns {number} Milliseconds; 0 disables auto-dismiss. */
    get duration() {
        if (!this.hasAttribute('duration')) {
            return 5000;
        }
        const parsed = parseInt(this.getAttribute('duration'), 10);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 5000;
    }

    /** @returns {boolean} */
    get dismissible() {
        if (!this.hasAttribute('dismissible')) {
            return true;
        }
        return hasBoolAttr(this, 'dismissible');
    }

    get liveRole() {
        return this.variant === 'warning' || this.variant === 'error' ? 'alert' : 'status';
    }

    ui_render() {
        const stateClasses = [
            'core-notif',
            `core-notif--${this.variant}`,
            this.classList.contains('core-notif--enter') ? 'core-notif--enter' : '',
            this.classList.contains('core-notif--closing') ? 'core-notif--closing' : ''
        ].filter(Boolean).join(' ');

        this.className = stateClasses;
        this.setAttribute('role', this.liveRole);

        const content = createElement('div', {
            className: 'core-notif__content',
            text: this.message
        });

        const children = [content];
        if (this.dismissible) {
            children.push(createElement('button', {
                className: 'core-notif__dismiss',
                text: '\u00D7',
                attrs: {
                    type: 'button',
                    'data-core-notif-dismiss': true,
                    'aria-label': 'Dismiss notification'
                }
            }));
        }
        this.replaceChildren(...children);
    }

    ui_toFunctional() {
        this.querySelector('[data-core-notif-dismiss]')
            ?.addEventListener('click', () => this.close());

        if (!this._shown) {
            this._shown = true;
            this._startEnterAnimation();
            this.dispatchEvent(new CustomEvent('core-notif-show', { bubbles: true }));
        }
        this._startTimer();
    }

    cleanFunctional() {
        this._clearTimer();
    }

    close() {
        if (this._closing) {
            return;
        }
        this._closing = true;
        this._clearTimer();

        let finished = false;
        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            this.dispatchEvent(new CustomEvent('core-notif-close', { bubbles: true }));
            this.remove();
        };

        if (this._prefersReducedMotion()) {
            finish();
            return;
        }

        this.classList.add('core-notif--closing');
        this.addEventListener('transitionend', (event) => {
            if (event.target === this && event.propertyName === 'opacity') {
                finish();
            }
        }, { once: true });
        window.setTimeout(finish, 300);
    }

    _startEnterAnimation() {
        if (this._prefersReducedMotion()) {
            return;
        }
        this.classList.add('core-notif--enter');
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                this.classList.remove('core-notif--enter');
            });
        });
    }

    /**
     * @returns {boolean}
     */
    _prefersReducedMotion() {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    }

    _startTimer() {
        this._clearTimer();
        if (this.duration <= 0) {
            return;
        }
        this._timer = window.setTimeout(() => this.close(), this.duration);
    }

    _clearTimer() {
        if (this._timer != null) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }
}

registerCoreComponent('core-notif', CoreNotif);
