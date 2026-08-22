import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../components/core-modal/core-modal.js';
import '../components/core-side-panel/core-side-panel.js';

let focusedElement = null;
Object.defineProperty(document, 'activeElement', {
    configurable: true,
    get: () => focusedElement
});
HTMLElement.prototype.focus = function focus() {
    focusedElement = this;
};
HTMLElement.prototype.blur = function blur() {
    if (focusedElement === this) {
        focusedElement = null;
    }
};

const overlays = [
    {
        name: 'core-modal',
        tag: 'core-modal',
        dialog: '.core-modal',
        host: '.core-modal-host',
        close: '[data-core-modal-close]',
        backdrop: '[data-core-modal-backdrop]',
        closeEvent: 'core-modal-close'
    },
    {
        name: 'core-side-panel',
        tag: 'core-side-panel',
        dialog: '.core-side-panel',
        host: '.core-side-panel-host',
        close: '[data-core-side-panel-close]',
        backdrop: '[data-core-side-panel-backdrop]',
        closeEvent: 'core-side-panel-close'
    }
];

/**
 * @param {string} type
 * @param {{ key?: string, shiftKey?: boolean }} [properties]
 * @returns {Event}
 */
function createEvent(type, properties = {}) {
    const event = new document.defaultView.Event(type, {
        bubbles: true,
        cancelable: true
    });
    Object.entries(properties).forEach(([name, value]) => {
        Object.defineProperty(event, name, { value });
    });
    return event;
}

/**
 * @param {typeof overlays[number]} config
 * @param {{ title?: string, ariaLabel?: string, content?: string }} [options]
 */
function mount(config, options = {}) {
    document.body.replaceChildren();
    focusedElement = null;

    const trigger = document.createElement('button');
    trigger.textContent = 'Open';
    document.body.appendChild(trigger);

    const overlay = document.createElement(config.tag);
    if (options.title !== null) {
        overlay.setAttribute('title', options.title ?? 'Overlay title');
    }
    if (options.ariaLabel) {
        overlay.setAttribute('aria-label', options.ariaLabel);
    }
    overlay.innerHTML = options.content
        ?? '<button id="content-first">First</button><input id="content-last">';
    document.body.appendChild(overlay);
    trigger.focus();
    return { overlay, trigger };
}

/**
 * @param {HTMLElement} overlay
 */
function open(overlay) {
    overlay.setAttribute('open', '');
}

/**
 * @param {HTMLElement} target
 */
function click(target) {
    target.dispatchEvent(createEvent('click'));
}

for (const config of overlays) {
    test(`${config.name} traps Tab and restores focus after programmatic close`, () => {
        const { overlay, trigger } = mount(config);
        open(overlay);

        const dialog = overlay.querySelector(config.dialog);
        const closeButton = overlay.querySelector(config.close);
        const last = overlay.querySelector('#content-last');
        assert.equal(document.activeElement, closeButton);
        assert.ok(dialog.contains(document.activeElement));

        last.focus();
        document.dispatchEvent(createEvent('keydown', { key: 'Tab', shiftKey: false }));
        assert.equal(document.activeElement, closeButton);

        closeButton.focus();
        document.dispatchEvent(createEvent('keydown', { key: 'Tab', shiftKey: true }));
        assert.equal(document.activeElement, last);

        overlay.removeAttribute('open');
        assert.equal(document.activeElement, trigger);
        assert.ok(overlay.querySelector(config.host).hasAttribute('hidden'));
    });

    test(`${config.name} falls back to focusing the dialog when no control is available`, () => {
        const { overlay } = mount(config, { content: '<p>Read-only content</p>' });
        overlay.querySelector(config.close).setAttribute('disabled', '');
        open(overlay);

        const dialog = overlay.querySelector(config.dialog);
        assert.equal(document.activeElement, dialog);
        assert.equal(dialog.getAttribute('tabindex'), '-1');

        document.dispatchEvent(createEvent('keydown', { key: 'Tab' }));
        assert.equal(document.activeElement, dialog);
    });

    test(`${config.name} closes with Escape and restores focus`, () => {
        const { overlay, trigger } = mount(config);
        let reason = null;
        overlay.addEventListener(config.closeEvent, (event) => {
            reason = event.detail.reason;
        });
        open(overlay);

        document.dispatchEvent(createEvent('keydown', { key: 'Escape' }));

        assert.equal(overlay.hasAttribute('open'), false);
        assert.equal(reason, 'escape');
        assert.equal(document.activeElement, trigger);
    });

    test(`${config.name} closes with its close button and restores focus`, () => {
        const { overlay, trigger } = mount(config);
        let reason = null;
        overlay.addEventListener(config.closeEvent, (event) => {
            reason = event.detail.reason;
        });
        open(overlay);

        click(overlay.querySelector(config.close));

        assert.equal(overlay.hasAttribute('open'), false);
        assert.equal(reason, 'close');
        assert.equal(document.activeElement, trigger);
    });

    test(`${config.name} closes with its backdrop and restores focus`, () => {
        const { overlay, trigger } = mount(config);
        let reason = null;
        overlay.addEventListener(config.closeEvent, (event) => {
            reason = event.detail.reason;
        });
        open(overlay);

        click(overlay.querySelector(config.backdrop));

        assert.equal(overlay.hasAttribute('open'), false);
        assert.equal(reason, 'backdrop');
        assert.equal(document.activeElement, trigger);
    });

    test(`${config.name} keeps current focus during title and size syncs`, () => {
        const { overlay } = mount(config);
        open(overlay);
        const input = overlay.querySelector('#content-last');
        input.focus();

        overlay.setAttribute('title', 'Updated title');
        assert.equal(document.activeElement, input);
        overlay.setAttribute('size', 'lg');
        assert.equal(document.activeElement, input);
    });

    test(`${config.name} uses title through aria-labelledby`, () => {
        const { overlay } = mount(config, {
            title: 'Named overlay',
            ariaLabel: 'Lower-priority label'
        });
        const dialog = overlay.querySelector(config.dialog);
        const title = dialog.querySelector('h2');

        assert.equal(dialog.getAttribute('aria-labelledby'), title.id);
        assert.equal(title.textContent, 'Named overlay');
        assert.equal(dialog.hasAttribute('aria-label'), false);
    });

    test(`${config.name} transfers a live aria-label when title is absent`, () => {
        const { overlay } = mount(config, {
            title: null,
            ariaLabel: 'Initial label'
        });
        const dialog = overlay.querySelector(config.dialog);

        assert.equal(dialog.getAttribute('aria-label'), 'Initial label');
        assert.equal(dialog.hasAttribute('aria-labelledby'), false);

        overlay.setAttribute('aria-label', 'Updated label');
        assert.equal(dialog.getAttribute('aria-label'), 'Updated label');
    });

    test(`${config.name} warns when no accessible name is provided`, () => {
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => {
            warnings.push(args.join(' '));
        };
        try {
            mount(config, { title: null });
            assert.ok(warnings.some((message) => message.includes('title or aria-label')));
        } finally {
            console.warn = originalWarn;
        }
    });

    test(`${config.name} skips focus restoration for removed or disabled triggers`, () => {
        const { overlay, trigger } = mount(config);
        open(overlay);
        trigger.remove();

        assert.doesNotThrow(() => overlay.removeAttribute('open'));
        assert.equal(trigger.isConnected, false);

        const secondMount = mount(config);
        open(secondMount.overlay);
        secondMount.trigger.setAttribute('disabled', '');
        secondMount.overlay.removeAttribute('open');
        assert.notEqual(document.activeElement, secondMount.trigger);
    });

    test(`${config.name} removes document listeners after disconnect`, () => {
        const originalAdd = document.addEventListener;
        const originalRemove = document.removeEventListener;
        const listeners = new Set();
        document.addEventListener = function addEventListener(type, listener, options) {
            if (type === 'keydown') {
                listeners.add(listener);
            }
            return originalAdd.call(this, type, listener, options);
        };
        document.removeEventListener = function removeEventListener(type, listener, options) {
            if (type === 'keydown') {
                listeners.delete(listener);
            }
            return originalRemove.call(this, type, listener, options);
        };

        try {
            const { overlay } = mount(config);
            open(overlay);
            assert.equal(listeners.size, 1);
            overlay.remove();
            assert.equal(listeners.size, 0);
        } finally {
            document.addEventListener = originalAdd;
            document.removeEventListener = originalRemove;
        }
    });

    test(`${config.name} does not duplicate listeners across repeated open cycles`, () => {
        const originalAdd = document.addEventListener;
        const originalRemove = document.removeEventListener;
        const listeners = new Set();
        let addCalls = 0;
        document.addEventListener = function addEventListener(type, listener, options) {
            if (type === 'keydown') {
                addCalls += 1;
                listeners.add(listener);
            }
            return originalAdd.call(this, type, listener, options);
        };
        document.removeEventListener = function removeEventListener(type, listener, options) {
            if (type === 'keydown') {
                listeners.delete(listener);
            }
            return originalRemove.call(this, type, listener, options);
        };

        try {
            const { overlay } = mount(config);
            for (let index = 0; index < 3; index += 1) {
                open(overlay);
                overlay.setAttribute('open', '');
                overlay.setAttribute('title', `Cycle ${index}`);
                assert.equal(listeners.size, 1);
                overlay.removeAttribute('open');
                assert.equal(listeners.size, 0);
            }
            assert.equal(addCalls, 3);
        } finally {
            document.addEventListener = originalAdd;
            document.removeEventListener = originalRemove;
        }
    });
}

test('core-side-panel preserves input state during position and size syncs', () => {
    const config = overlays[1];
    const { overlay } = mount(config, {
        content: '<input id="draft" value="initial">'
    });
    open(overlay);
    const input = overlay.querySelector('#draft');
    input.value = 'typed state';
    input.focus();

    overlay.setAttribute('position', 'left');
    overlay.setAttribute('size', 'lg');
    overlay.setAttribute('title', 'Updated panel');

    assert.equal(overlay.querySelector('#draft'), input);
    assert.equal(input.value, 'typed state');
    assert.equal(document.activeElement, input);
    assert.ok(overlay.querySelector(config.dialog).classList.contains('core-side-panel--left'));
    assert.ok(overlay.querySelector(config.dialog).classList.contains('core-side-panel--lg'));
});
