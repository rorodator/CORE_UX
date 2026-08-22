const FOCUSABLE_SELECTOR = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[tabindex]'
].join(',');

/**
 * Returns whether an element or one of its ancestors is unavailable to users.
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} boundary
 * @returns {boolean}
 */
function isUnavailable(element, boundary) {
    let current = element;
    while (current) {
        const view = current.ownerDocument?.defaultView;
        const computedStyle = typeof view?.getComputedStyle === 'function'
            ? view.getComputedStyle(current)
            : null;
        if (
            current.hasAttribute('hidden')
            || current.getAttribute('aria-hidden') === 'true'
            || current.style?.display === 'none'
            || current.style?.visibility === 'hidden'
            || computedStyle?.display === 'none'
            || computedStyle?.visibility === 'hidden'
        ) {
            return true;
        }
        if (current === boundary) {
            break;
        }
        current = current.parentElement;
    }
    return false;
}

/**
 * Returns whether an element can currently receive sequential focus.
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} boundary
 * @returns {boolean}
 */
function isSequentiallyFocusable(element, boundary) {
    if (
        element.hasAttribute('disabled')
        || element.getAttribute('aria-disabled') === 'true'
        || (
            element.tagName === 'INPUT'
            && (element.getAttribute('type') || '').toLowerCase() === 'hidden'
        )
        || isUnavailable(element, boundary)
    ) {
        return false;
    }

    const tabIndexAttribute = element.getAttribute('tabindex');
    if (tabIndexAttribute !== null) {
        return Number.parseInt(tabIndexAttribute, 10) >= 0;
    }
    return element.matches('button, a[href], input, select, textarea');
}

/**
 * Finds elements available to sequential keyboard focus inside an overlay.
 *
 * @param {HTMLElement} container
 * @returns {HTMLElement[]}
 */
export function getFocusableElements(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((element) => isSequentiallyFocusable(element, container));
}

/**
 * Focuses an element without requiring support for focus options.
 *
 * @param {HTMLElement} element
 */
function focusElement(element) {
    try {
        element.focus({ preventScroll: true });
    } catch (_) {
        element.focus();
    }
}

/**
 * Returns whether a previously active element remains safe to restore.
 *
 * @param {Element|null} element
 * @returns {boolean}
 */
function canRestoreFocus(element) {
    if (!(element instanceof HTMLElement) || !element.isConnected) {
        return false;
    }
    return isSequentiallyFocusable(element, document.documentElement);
}

/**
 * Small lifecycle controller for modal focus, Escape, and focus restoration.
 */
export class OverlayFocusController {

    /**
     * @param {{
     *   getDialog: () => HTMLElement|null,
     *   onEscape: () => void
     * }} options
     */
    constructor({ getDialog, onEscape }) {
        this._getDialog = getDialog;
        this._onEscape = onEscape;
        this._active = false;
        this._previousFocus = null;
        this._onKeyDown = this._onKeyDown.bind(this);
    }

    get active() {
        return this._active;
    }

    /**
     * Activates focus management only on the closed-to-open transition.
     */
    activate() {
        if (this._active) {
            return;
        }
        this._active = true;
        this._previousFocus = document.activeElement;
        document.addEventListener('keydown', this._onKeyDown);
        this._focusInitial();
    }

    /**
     * Removes listeners and optionally restores the pre-open focus target.
     *
     * @param {{ restoreFocus?: boolean }} [options]
     */
    deactivate({ restoreFocus = true } = {}) {
        if (!this._active) {
            return;
        }
        this._active = false;
        document.removeEventListener('keydown', this._onKeyDown);

        const previousFocus = this._previousFocus;
        this._previousFocus = null;
        if (restoreFocus && canRestoreFocus(previousFocus)) {
            focusElement(previousFocus);
        }
    }

    _focusInitial() {
        const dialog = this._getDialog();
        if (!dialog) {
            return;
        }
        const focusable = getFocusableElements(dialog);
        const target = focusable[0] || dialog;
        if (target === dialog && !dialog.hasAttribute('tabindex')) {
            dialog.setAttribute('tabindex', '-1');
        }
        focusElement(target);
    }

    /**
     * @param {KeyboardEvent} event
     */
    _onKeyDown(event) {
        if (!this._active) {
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            this._onEscape();
            return;
        }
        if (event.key !== 'Tab') {
            return;
        }

        const dialog = this._getDialog();
        if (!dialog) {
            return;
        }
        const focusable = getFocusableElements(dialog);
        if (!focusable.length) {
            event.preventDefault();
            if (!dialog.hasAttribute('tabindex')) {
                dialog.setAttribute('tabindex', '-1');
            }
            focusElement(dialog);
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;
        if (!focusable.includes(activeElement)) {
            event.preventDefault();
            focusElement(event.shiftKey ? last : first);
        } else if (event.shiftKey && activeElement === first) {
            event.preventDefault();
            focusElement(last);
        } else if (!event.shiftKey && activeElement === last) {
            event.preventDefault();
            focusElement(first);
        }
    }
}
