import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountTrustedHtml, hasBoolAttr } from 'CORE_JS/lib/utils/dom.js';
import { parseTrustedHtmlFragment, readTrustedLightDom } from '../../lib/dom/trusted-html.js';
import {
    OverlayFocusController,
    findFirstEditableField,
    resolveFocusTarget
} from '../../lib/overlays/overlay-focus-controller.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

const INITIAL_FOCUS_SELECTOR = '[data-core-initial-focus]';

/**
 * Modal dialog. Open with the `open` attribute/property or `show()`. Body/footer via light DOM.
 *
 * User-requested closes (Escape, backdrop, `[data-core-modal-close]`, `requestClose()`)
 * dispatch a cancelable `core-modal-request-close` first; `core-modal-close` fires only
 * once the modal actually closed. Removing `open` / `close()` closes unconditionally.
 */
export class CoreModal extends Core_UXSlotElement {

    static get observedAttributes() {
        return ['open', 'title', 'size', 'aria-label'];
    }

    constructor() {
        super();
        this._footerContent = '';
        this._uid = Math.random().toString(36).slice(2, 9);
        this._nameWarningShown = false;
        this._focusController = new OverlayFocusController({
            getDialog: () => this.querySelector('.core-modal'),
            onEscape: () => this.requestClose('escape'),
            getInitialFocus: (dialog) => this._resolveInitialFocus(dialog)
        });
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
        this._focusController.deactivate();
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
            return;
        }
        if (name === 'size') {
            this._syncSize();
            return;
        }
        if (name === 'aria-label') {
            this._syncAccessibleName();
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

    /**
     * Reflects to the `open` attribute.
     *
     * @param {boolean} value
     */
    set open(value) {
        this.toggleAttribute('open', Boolean(value));
    }

    /**
     * Opens the modal (same as setting the `open` attribute).
     */
    show() {
        this.open = true;
    }

    /**
     * Closes the modal unconditionally (same as removing the `open` attribute).
     * Use after a confirmed operation; does not dispatch close events.
     */
    close() {
        this.open = false;
    }

    /**
     * Asks to close the modal as a user dismissal would. Dispatches the cancelable
     * `core-modal-request-close`; when not prevented, closes and dispatches `core-modal-close`.
     *
     * @param {string} [reason]
     * @returns {boolean} `true` when the modal closed.
     */
    requestClose(reason = 'request') {
        if (!this.open) {
            return false;
        }
        const request = new CustomEvent('core-modal-request-close', {
            bubbles: true,
            cancelable: true,
            detail: { reason }
        });
        if (!this.dispatchEvent(request)) {
            this._focusController.ensureFocusWithin();
            return false;
        }
        if (!this.open) {
            return true;
        }
        this.removeAttribute('open');
        this.dispatchEvent(new CustomEvent('core-modal-close', {
            bubbles: true,
            detail: { reason }
        }));
        return true;
    }

    get title() {
        return (this.getAttribute('title') || '').trim();
    }

    get accessibleLabel() {
        return (this.getAttribute('aria-label') || '').trim();
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
        } else if (this.accessibleLabel) {
            dialogAttrs['aria-label'] = this.accessibleLabel;
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
        this._warnIfUnnamed();
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
            dialog.removeAttribute('aria-label');
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
        this._syncAccessibleName();
    }

    /**
     * Mirrors the host aria-label when no visible title names the dialog.
     */
    _syncAccessibleName() {
        const dialog = this.querySelector('.core-modal');
        if (!dialog) {
            return;
        }
        if (this.title) {
            dialog.setAttribute('aria-labelledby', `${this.dialogId}-title`);
            dialog.removeAttribute('aria-label');
            return;
        }

        dialog.removeAttribute('aria-labelledby');
        if (this.accessibleLabel) {
            dialog.setAttribute('aria-label', this.accessibleLabel);
            return;
        }
        dialog.removeAttribute('aria-label');
        this._warnIfUnnamed();
    }

    _warnIfUnnamed() {
        if (this.title || this.accessibleLabel || this._nameWarningShown) {
            return;
        }
        this._nameWarningShown = true;
        console.warn('<core-modal> requires a non-empty title or aria-label.');
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
        if (this.open) {
            if (!host) {
                return;
            }
            host.removeAttribute('hidden');
            this._focusController.activate();
        } else {
            host?.setAttribute('hidden', '');
            this._focusController.deactivate();
        }
    }

    /**
     * Opening focus policy: first available `[data-core-initial-focus]` target, then
     * the first editable body field, then the dialog itself. Action buttons are never
     * chosen implicitly so a destructive confirmation is not pre-focused.
     *
     * @param {HTMLElement} dialog
     * @returns {HTMLElement}
     */
    _resolveInitialFocus(dialog) {
        for (const marked of dialog.querySelectorAll(INITIAL_FOCUS_SELECTOR)) {
            const target = resolveFocusTarget(marked, dialog);
            if (target) {
                return target;
            }
        }
        const body = dialog.querySelector('.core-modal__body');
        return (body && findFirstEditableField(body, dialog)) || dialog;
    }

    ui_toFunctional() {
        // Keeps focus inside the dialog when a backdrop click is denied.
        this.bindDelegated('mousedown', '[data-core-modal-backdrop]', (event, match) => {
            if (this._ownsControl(match)) {
                event.preventDefault();
            }
        });
        this.bindDelegated('click', '[data-core-modal-backdrop]', (_event, match) => {
            if (this._ownsControl(match)) {
                this.requestClose('backdrop');
            }
        });
        this.bindDelegated('click', '[data-core-modal-close]', (_event, match) => {
            if (this._ownsControl(match)) {
                this.requestClose('close');
            }
        });
    }

    /**
     * Ignores close controls that belong to a nested modal.
     *
     * @param {Element} control
     * @returns {boolean}
     */
    _ownsControl(control) {
        return control.closest('core-modal') === this;
    }

    cleanFunctional() {
        super.cleanFunctional();
    }
}

registerCoreComponent('core-modal', CoreModal);
