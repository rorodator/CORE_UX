const NATIVE_FOCUSABLE_SELECTOR = 'button, a[href], input, select, textarea';

const FOCUSABLE_SELECTOR = [
    NATIVE_FOCUSABLE_SELECTOR,
    '[tabindex]',
    '[contenteditable]'
].join(',');

const NON_FIELD_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'image', 'hidden']);

/**
 * Controllers currently managing an open overlay, in activation order.
 * Used only to pick which overlay may handle a shared document Escape —
 * not a business modal coordinator.
 *
 * @type {OverlayFocusController[]}
 */
const activeControllers = [];

/**
 * @param {OverlayFocusController} controller
 */
function registerActiveController(controller) {
    const index = activeControllers.indexOf(controller);
    if (index !== -1) {
        activeControllers.splice(index, 1);
    }
    activeControllers.push(controller);
}

/**
 * @param {OverlayFocusController} controller
 */
function unregisterActiveController(controller) {
    const index = activeControllers.indexOf(controller);
    if (index !== -1) {
        activeControllers.splice(index, 1);
    }
}

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
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isEditableContent(element) {
    const value = element.getAttribute('contenteditable');
    return value !== null && value.toLowerCase() !== 'false';
}

/**
 * Returns whether an element is enabled, rendered, and natively or explicitly focusable.
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} boundary
 * @returns {boolean}
 */
function isFocusCandidate(element, boundary) {
    return !(
        element.hasAttribute('disabled')
        || element.getAttribute('aria-disabled') === 'true'
        || (
            element.tagName === 'INPUT'
            && (element.getAttribute('type') || '').toLowerCase() === 'hidden'
        )
        || isUnavailable(element, boundary)
    );
}

/**
 * Returns whether an element can currently receive sequential focus.
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} boundary
 * @returns {boolean}
 */
function isSequentiallyFocusable(element, boundary) {
    if (!isFocusCandidate(element, boundary)) {
        return false;
    }

    const tabIndexAttribute = element.getAttribute('tabindex');
    if (tabIndexAttribute !== null) {
        return Number.parseInt(tabIndexAttribute, 10) >= 0;
    }
    return element.matches(NATIVE_FOCUSABLE_SELECTOR) || isEditableContent(element);
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
 * Resolves an author-designated focus target: the element itself when it can be
 * focused (including `tabindex="-1"` static targets), otherwise its first
 * focusable descendant (e.g. the inner input of a form-control host).
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} boundary
 * @returns {HTMLElement|null}
 */
export function resolveFocusTarget(element, boundary) {
    if (!isFocusCandidate(element, boundary)) {
        return null;
    }
    if (
        element.hasAttribute('tabindex')
        || element.matches(NATIVE_FOCUSABLE_SELECTOR)
        || isEditableContent(element)
    ) {
        return element;
    }
    return getFocusableElements(element)[0] || null;
}

/**
 * Returns whether a focusable element is an editable form field (not a button-like input).
 *
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isEditableField(element) {
    if (element.hasAttribute('readonly') || element.getAttribute('aria-readonly') === 'true') {
        return false;
    }
    if (element.tagName === 'INPUT') {
        return !NON_FIELD_INPUT_TYPES.has((element.getAttribute('type') || 'text').toLowerCase());
    }
    return element.tagName === 'SELECT'
        || element.tagName === 'TEXTAREA'
        || isEditableContent(element);
}

/**
 * Finds the first enabled, editable form field inside a region of an overlay.
 *
 * @param {HTMLElement} region
 * @param {HTMLElement} boundary
 * @returns {HTMLElement|null}
 */
export function findFirstEditableField(region, boundary) {
    return getFocusableElements(boundary)
        .find((element) => region.contains(element) && isEditableField(element)) || null;
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
     *   onEscape: () => void,
     *   getInitialFocus?: (dialog: HTMLElement) => HTMLElement|null
     * }} options
     *   `getInitialFocus` lets an overlay choose its opening target; when it is
     *   omitted or returns nothing usable, the first focusable element (or the
     *   dialog itself) receives focus.
     */
    constructor({ getDialog, onEscape, getInitialFocus = null }) {
        this._getDialog = getDialog;
        this._onEscape = onEscape;
        this._getInitialFocus = getInitialFocus;
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
        registerActiveController(this);
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
        unregisterActiveController(this);
        document.removeEventListener('keydown', this._onKeyDown);

        const previousFocus = this._previousFocus;
        this._previousFocus = null;
        if (restoreFocus && canRestoreFocus(previousFocus)) {
            focusElement(previousFocus);
        }
    }

    /**
     * Moves focus back to the initial target when it escaped the active dialog
     * (e.g. after a denied close request). No-op when focus is already inside.
     */
    ensureFocusWithin() {
        if (!this._active) {
            return;
        }
        const dialog = this._getDialog();
        if (!dialog || dialog.contains(document.activeElement)) {
            return;
        }
        this._focusInitial();
    }

    /**
     * @param {HTMLElement} dialog
     * @returns {HTMLElement}
     */
    _resolveInitialTarget(dialog) {
        const preferred = this._getInitialFocus?.(dialog);
        if (preferred instanceof HTMLElement && dialog.contains(preferred)) {
            return preferred;
        }
        return getFocusableElements(dialog)[0] || dialog;
    }

    _focusInitial() {
        const dialog = this._getDialog();
        if (!dialog) {
            return;
        }
        const target = this._resolveInitialTarget(dialog);
        if (target === dialog && !dialog.hasAttribute('tabindex')) {
            dialog.setAttribute('tabindex', '-1');
        }
        focusElement(target);
    }

    /**
     * @returns {boolean}
     */
    _dialogContainsFocus() {
        const dialog = this._getDialog();
        const focus = document.activeElement;
        return Boolean(dialog && focus instanceof Node && (focus === dialog || dialog.contains(focus)));
    }

    /**
     * One Escape is owned by the innermost overlay that currently has focus.
     * If focus is outside every overlay, the most recently activated overlay owns it.
     *
     * @returns {boolean}
     */
    _isEscapeTarget() {
        if (this._dialogContainsFocus()) {
            const dialog = this._getDialog();
            return !activeControllers.some((other) => {
                if (other === this || !other._active) {
                    return false;
                }
                const otherDialog = other._getDialog();
                return Boolean(
                    otherDialog
                    && dialog.contains(otherDialog)
                    && other._dialogContainsFocus()
                );
            });
        }
        const focusOwned = activeControllers.some((other) => other._dialogContainsFocus());
        return !focusOwned && activeControllers[activeControllers.length - 1] === this;
    }

    /**
     * @param {KeyboardEvent} event
     */
    _onKeyDown(event) {
        if (!this._active) {
            return;
        }
        if (event.key === 'Escape') {
            if (event.isComposing) {
                return;
            }
            // An inner widget (menu, listbox, link panel…) already consumed Escape.
            if (event.defaultPrevented) {
                return;
            }
            if (!this._isEscapeTarget()) {
                return;
            }
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
