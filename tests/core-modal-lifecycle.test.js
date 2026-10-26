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

const FORM_CONTENT = `
    <p>Intro</p>
    <button id="help" type="button">Help</button>
    <input id="hidden-input" type="hidden">
    <input id="readonly-input" readonly>
    <input id="disabled-input" disabled>
    <input id="name" name="name">
    <textarea id="notes"></textarea>
    <div data-core-footer>
        <button id="cancel" type="button" data-core-modal-close>Cancel</button>
        <button id="save" type="submit">Save</button>
    </div>
`;

const CONFIRM_CONTENT = `
    <p>This action cannot be undone.</p>
    <div data-core-footer>
        <button id="cancel" type="button" data-core-modal-close>Cancel</button>
        <button id="delete" type="button">Delete</button>
    </div>
`;

/**
 * @param {Element|null} element
 * @returns {string}
 */
function describe(element) {
    if (!element) {
        return 'null';
    }
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${String(element.className).trim().split(/\s+/).join('.')}` : '';
    return `${element.tagName.toLowerCase()}${id}${classes}`;
}

/**
 * Compares by identity with a compact message (DOM node diffs are huge in linkedom).
 *
 * @param {Element|null} expected
 * @param {string} [message]
 */
function assertFocused(expected, message = '') {
    assert.ok(
        expected && document.activeElement === expected,
        `${message} expected focus on ${describe(expected)}, got ${describe(document.activeElement)}`
    );
}

/**
 * @param {Element|null} unexpected
 * @param {string} [message]
 */
function assertNotFocused(unexpected, message = '') {
    assert.ok(
        document.activeElement !== unexpected,
        `${message} focus must not be on ${describe(unexpected)}`
    );
}

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
 * @param {{ content?: string, attrs?: string, tag?: string }} [options]
 * @returns {{ modal: HTMLElement, trigger: HTMLButtonElement }}
 */
function mount({ content = FORM_CONTENT, attrs = '', tag = 'core-modal' } = {}) {
    document.body.replaceChildren();
    focusedElement = null;

    const trigger = document.createElement('button');
    trigger.id = 'trigger';
    trigger.textContent = 'Open';
    document.body.appendChild(trigger);
    trigger.focus();

    const holder = document.createElement('div');
    holder.innerHTML = `<${tag} title="Dialog title" ${attrs}>${content}</${tag}>`;
    const modal = holder.firstElementChild;
    document.body.appendChild(modal);
    return { modal, trigger };
}

/**
 * @param {HTMLElement} target
 */
function click(target) {
    target.dispatchEvent(createEvent('click'));
}

function pressEscape() {
    document.dispatchEvent(createEvent('keydown', { key: 'Escape' }));
}

/**
 * @param {boolean} [shiftKey]
 * @returns {Event}
 */
function pressTab(shiftKey = false) {
    const event = createEvent('keydown', { key: 'Tab', shiftKey });
    document.dispatchEvent(event);
    return event;
}

/**
 * Records request-close and close events, optionally denying requests.
 *
 * @param {HTMLElement} modal
 * @param {{ deny?: () => boolean }} [options]
 */
function recordCloseEvents(modal, { deny = () => false } = {}) {
    const log = { requests: [], closes: [] };
    modal.addEventListener('core-modal-request-close', (event) => {
        log.requests.push(event.detail.reason);
        if (deny(event)) {
            event.preventDefault();
        }
    });
    modal.addEventListener('core-modal-close', (event) => {
        log.closes.push(event.detail.reason);
    });
    return log;
}

/**
 * @param {HTMLElement} modal
 * @returns {HTMLElement}
 */
function dialogOf(modal) {
    return modal.querySelector('.core-modal');
}

// —— Initial focus ——

test('core-modal focuses the first enabled editable body field, not the header close button', () => {
    const { modal } = mount();
    modal.setAttribute('open', '');

    assertFocused(modal.querySelector('#name'));
    assertNotFocused(modal.querySelector('[data-core-modal-close]'));
});

test('core-modal honors an explicit data-core-initial-focus target', () => {
    const { modal } = mount({
        content: '<input id="first"><textarea id="explicit" data-core-initial-focus></textarea>'
    });
    modal.setAttribute('open', '');

    assertFocused(modal.querySelector('#explicit'));
});

test('core-modal resolves an initial-focus wrapper to its first focusable descendant', () => {
    const { modal } = mount({
        content: '<input id="first"><div data-core-initial-focus><span>Label</span><input id="wrapped"></div>'
    });
    modal.setAttribute('open', '');

    assertFocused(modal.querySelector('#wrapped'));
});

test('core-modal accepts a tabindex="-1" static element as explicit initial focus', () => {
    const { modal } = mount({
        content: '<h3 id="summary" tabindex="-1" data-core-initial-focus>Summary</h3><input id="first">'
    });
    modal.setAttribute('open', '');

    assertFocused(modal.querySelector('#summary'));
});

test('core-modal skips disabled or hidden initial-focus targets and falls back to the field policy', () => {
    const { modal } = mount({
        content: `
            <input id="disabled-target" disabled data-core-initial-focus>
            <div hidden><input id="hidden-target" data-core-initial-focus></div>
            <input id="invisible-target" style="display: none" data-core-initial-focus>
            <input id="first-field">
        `
    });
    modal.setAttribute('open', '');

    assertFocused(modal.querySelector('#first-field'));
});

test('core-modal uses the next usable initial-focus marker when the first is unavailable', () => {
    const { modal } = mount({
        content: `
            <input id="disabled-target" disabled data-core-initial-focus>
            <input id="first-field">
            <select id="usable-target" data-core-initial-focus><option>One</option></select>
        `
    });
    modal.setAttribute('open', '');

    assertFocused(modal.querySelector('#usable-target'));
});

test('core-modal confirmation without fields focuses the dialog, never the destructive action', () => {
    const { modal } = mount({ content: CONFIRM_CONTENT });
    modal.setAttribute('open', '');
    const dialog = dialogOf(modal);

    assertFocused(dialog);
    assert.equal(dialog.getAttribute('tabindex'), '-1');
    assertNotFocused(modal.querySelector('#delete'));

    pressTab();
    assertFocused(modal.querySelector('.core-modal__close'));
    pressTab(true);
    assertFocused(modal.querySelector('#delete'));
});

test('core-modal confirmation can mark the safe action as initial focus', () => {
    const { modal } = mount({
        content: CONFIRM_CONTENT.replace('id="cancel"', 'id="cancel" data-core-initial-focus')
    });
    modal.setAttribute('open', '');

    assertFocused(modal.querySelector('#cancel'));
});

test('core-modal does not pick footer fields or body action buttons implicitly', () => {
    const { modal } = mount({
        content: `
            <button id="body-action" type="button">Remove item</button>
            <div data-core-footer><input id="footer-field"><button type="button">OK</button></div>
        `
    });
    modal.setAttribute('open', '');

    assertFocused(dialogOf(modal));
});

// —— Open API ——

test('core-modal legacy open attribute present before connect opens on connect', () => {
    const { modal } = mount({ attrs: 'open' });

    assert.equal(modal.open, true);
    assert.equal(modal.querySelector('.core-modal-host').hasAttribute('hidden'), false);
    assertFocused(modal.querySelector('#name'));
});

test('core-modal open property, show(), and close() reflect the open attribute', () => {
    const { modal, trigger } = mount();

    modal.open = true;
    assert.equal(modal.hasAttribute('open'), true);
    assertFocused(modal.querySelector('#name'));

    modal.open = false;
    assert.equal(modal.hasAttribute('open'), false);
    assertFocused(trigger);

    modal.show();
    assert.equal(modal.hasAttribute('open'), true);
    modal.close();
    assert.equal(modal.hasAttribute('open'), false);
    assert.ok(modal.querySelector('.core-modal-host').hasAttribute('hidden'));
    assertFocused(trigger);
});

test('core-modal open="false" stays closed', () => {
    const { modal } = mount({ attrs: 'open="false"' });

    assert.equal(modal.open, false);
    assert.ok(modal.querySelector('.core-modal-host').hasAttribute('hidden'));
});

// —— Controlled closing ——

for (const gesture of [
    { name: 'Escape', reason: 'escape', run: () => pressEscape() },
    { name: 'backdrop', reason: 'backdrop', run: (modal) => click(modal.querySelector('[data-core-modal-backdrop]')) },
    { name: 'header close button', reason: 'close', run: (modal) => click(modal.querySelector('.core-modal__close')) },
    { name: 'author close control', reason: 'close', run: (modal) => click(modal.querySelector('#cancel')) },
    { name: 'requestClose()', reason: 'request', run: (modal) => modal.requestClose() }
]) {
    test(`core-modal ${gesture.name} close is allowed by default and reports core-modal-close`, () => {
        const { modal, trigger } = mount();
        const log = recordCloseEvents(modal);
        modal.setAttribute('open', '');

        gesture.run(modal);

        assert.deepEqual(log.requests, [gesture.reason]);
        assert.deepEqual(log.closes, [gesture.reason]);
        assert.equal(modal.hasAttribute('open'), false);
        assertFocused(trigger);
    });

    test(`core-modal ${gesture.name} close can be denied with preventDefault`, () => {
        const { modal, trigger } = mount();
        const log = recordCloseEvents(modal, { deny: () => true });
        modal.setAttribute('open', '');
        const name = modal.querySelector('#name');
        assertFocused(name);

        gesture.run(modal);

        assert.deepEqual(log.requests, [gesture.reason]);
        assert.deepEqual(log.closes, [], 'no successful close is reported');
        assert.equal(modal.hasAttribute('open'), true);
        assert.equal(modal.querySelector('.core-modal-host').hasAttribute('hidden'), false);
        assertNotFocused(trigger, 'focus is not restored');
        assert.ok(dialogOf(modal).contains(document.activeElement));

        modal.querySelector('#save').focus();
        pressTab();
        assertFocused(modal.querySelector('.core-modal__close'), 'Tab stays trapped');
    });
}

test('core-modal requestClose() returns whether the modal closed and forwards custom reasons', () => {
    const { modal } = mount();
    let busy = true;
    const log = recordCloseEvents(modal, { deny: () => busy });

    assert.equal(modal.requestClose(), false, 'closed modal ignores requests');
    assert.deepEqual(log.requests, []);

    modal.setAttribute('open', '');
    assert.equal(modal.requestClose('cancel'), false);
    busy = false;
    assert.equal(modal.requestClose('cancel'), true);
    assert.deepEqual(log.requests, ['cancel', 'cancel']);
    assert.deepEqual(log.closes, ['cancel']);
});

test('core-modal request-close event is cancelable and bubbles with the reason', () => {
    const { modal } = mount();
    let captured = null;
    document.body.addEventListener('core-modal-request-close', (event) => {
        captured = event;
    });
    modal.setAttribute('open', '');
    pressEscape();

    assert.ok(captured);
    assert.equal(captured.cancelable, true);
    assert.equal(captured.bubbles, true);
    assert.deepEqual(captured.detail, { reason: 'escape' });
});

test('core-modal backdrop mousedown keeps focus from leaving the dialog', () => {
    const { modal } = mount();
    modal.setAttribute('open', '');
    const mousedown = createEvent('mousedown');

    modal.querySelector('[data-core-modal-backdrop]').dispatchEvent(mousedown);

    assert.equal(mousedown.defaultPrevented, true);
});

test('core-modal returns focus inside after a denied close moved focus out', () => {
    const { modal, trigger } = mount();
    recordCloseEvents(modal, { deny: () => true });
    modal.setAttribute('open', '');

    // Simulates a pointer interaction that moved focus outside the dialog.
    focusedElement = document.body;
    click(modal.querySelector('[data-core-modal-backdrop]'));

    assertFocused(modal.querySelector('#name'));
    assertNotFocused(trigger);

    pressEscape();
    assert.equal(modal.hasAttribute('open'), true);
    modal.querySelector('#save').focus();
    pressTab();
    assertFocused(modal.querySelector('.core-modal__close'));
});

test('core-modal can be closed programmatically while user closes are blocked by a critical operation', () => {
    const { modal, trigger } = mount();
    let critical = true;
    const log = recordCloseEvents(modal, { deny: () => critical });
    modal.setAttribute('open', '');

    pressEscape();
    click(modal.querySelector('.core-modal__close'));
    click(modal.querySelector('[data-core-modal-backdrop]'));
    assert.equal(modal.hasAttribute('open'), true);
    assert.deepEqual(log.closes, []);

    modal.close();
    critical = false;

    assert.equal(modal.hasAttribute('open'), false);
    assertFocused(trigger);
    assert.deepEqual(log.closes, [], 'programmatic close stays silent like removing the attribute');

    modal.setAttribute('open', '');
    critical = true;
    modal.removeAttribute('open');
    assert.equal(modal.hasAttribute('open'), false);
    assertFocused(trigger);
});

test('core-modal request-close listener may close the modal itself without a duplicate close event', () => {
    const { modal, trigger } = mount();
    const log = recordCloseEvents(modal);
    modal.addEventListener('core-modal-request-close', () => modal.close());
    modal.setAttribute('open', '');

    assert.equal(modal.requestClose('cancel'), true);
    assert.equal(modal.hasAttribute('open'), false);
    assert.deepEqual(log.closes, []);
    assertFocused(trigger);
});

// —— Legacy event & lifecycle ——

test('core-modal legacy core-modal-close bubbles, carries the reason, and fires after closing', () => {
    const { modal } = mount();
    let observed = null;
    document.body.addEventListener('core-modal-close', (event) => {
        observed = {
            reason: event.detail.reason,
            bubbles: event.bubbles,
            cancelable: event.cancelable,
            openDuringEvent: modal.hasAttribute('open')
        };
    });
    modal.setAttribute('open', '');
    click(modal.querySelector('.core-modal__close'));

    assert.deepEqual(observed, {
        reason: 'close',
        bubbles: true,
        cancelable: false,
        openDuringEvent: false
    });
});

test('core-modal repeated open/close cycles reapply initial focus and restore focus each time', () => {
    const { modal, trigger } = mount();
    const log = recordCloseEvents(modal);
    const name = modal.querySelector('#name');

    for (let index = 0; index < 3; index += 1) {
        modal.setAttribute('open', '');
        assertFocused(name);
        modal.querySelector('#notes').focus();
        modal.setAttribute('open', '');
        assertFocused(modal.querySelector('#notes'), 'open-to-open does not refocus');
        if (index % 2 === 0) {
            pressEscape();
        } else {
            modal.close();
        }
        assert.equal(modal.hasAttribute('open'), false);
        assertFocused(trigger);
    }
    assert.deepEqual(log.closes, ['escape', 'escape']);
    assert.ok(modal.querySelector('#name') === name, 'slot content is not rebuilt across cycles');
});

test('core-modal title and size changes while open keep focus, field state, and the accessible name', () => {
    const { modal } = mount();
    modal.setAttribute('open', '');
    const notes = modal.querySelector('#notes');
    notes.value = 'Draft in progress';
    notes.focus();

    modal.setAttribute('title', 'Renamed dialog');
    modal.setAttribute('size', 'lg');
    modal.setAttribute('size', 'full');

    const dialog = dialogOf(modal);
    const title = dialog.querySelector('.core-modal__title');
    assertFocused(notes);
    assert.ok(modal.querySelector('#notes') === notes, 'field element is preserved');
    assert.equal(notes.value, 'Draft in progress');
    assert.equal(title.textContent, 'Renamed dialog');
    assert.equal(dialog.getAttribute('aria-labelledby'), title.id);
    assert.equal(dialog.getAttribute('role'), 'dialog');
    assert.equal(dialog.getAttribute('aria-modal'), 'true');
    assert.ok(dialog.classList.contains('core-modal--full'));
    assert.equal(dialog.classList.contains('core-modal--lg'), false);
});

test('core-modal keeps footer slot content and wires author close controls', () => {
    const { modal } = mount();
    const footer = modal.querySelector('.core-modal__footer');

    assert.ok(footer);
    assert.ok(footer.querySelector('#cancel'));
    assert.ok(footer.querySelector('#save'));
    assert.equal(modal.querySelector('.core-modal__body #cancel'), null);
});

test('core-modal ignores close controls belonging to a nested modal', () => {
    const { modal } = mount({
        content: '<input id="outer-field"><core-modal id="inner" title="Inner"><p>Nested</p></core-modal>'
    });
    const outerRequests = [];
    modal.addEventListener('core-modal-request-close', (event) => {
        if (event.target === modal) {
            outerRequests.push(event.detail.reason);
        }
    });
    modal.setAttribute('open', '');
    const inner = modal.querySelector('#inner');
    inner.setAttribute('open', '');

    click(inner.querySelector('.core-modal__close'));

    assert.equal(inner.hasAttribute('open'), false);
    assert.equal(modal.hasAttribute('open'), true);
    assert.deepEqual(outerRequests, []);
});

// —— core-side-panel compatibility ——

test('core-side-panel keeps first-focusable initial focus and immediate closes', () => {
    const { modal: panel, trigger } = mount({ tag: 'core-side-panel' });
    let requests = 0;
    const closes = [];
    panel.addEventListener('core-modal-request-close', () => {
        requests += 1;
    });
    panel.addEventListener('core-side-panel-close', (event) => {
        closes.push(event.detail.reason);
    });

    panel.setAttribute('open', '');
    assertFocused(panel.querySelector('[data-core-side-panel-close]'));

    pressEscape();
    assert.equal(panel.hasAttribute('open'), false);
    assertFocused(trigger);

    panel.setAttribute('open', '');
    click(panel.querySelector('[data-core-side-panel-backdrop]'));
    assert.equal(panel.hasAttribute('open'), false);

    assert.deepEqual(closes, ['escape', 'backdrop']);
    assert.equal(requests, 0);
});
