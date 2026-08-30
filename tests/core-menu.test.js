import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../components/core-menu/core-menu.js';

let focusedElement = null;
Object.defineProperty(document, 'activeElement', {
    configurable: true,
    get: () => focusedElement,
});
HTMLElement.prototype.focus = function focus() {
    focusedElement = this;
};
HTMLElement.prototype.blur = function blur() {
    if (focusedElement === this) {
        focusedElement = null;
    }
};

/**
 * @param {string} type
 * @param {{ key?: string }} [properties]
 * @returns {Event}
 */
function createEvent(type, properties = {}) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.entries(properties).forEach(([name, value]) => {
        Object.defineProperty(event, name, { value });
    });
    return event;
}

/**
 * @param {Element} target
 */
function click(target) {
    target.dispatchEvent(createEvent('click'));
}

/**
 * @param {Element} target
 * @param {string} key
 */
function press(target, key) {
    target.dispatchEvent(createEvent('keydown', { key }));
}

/**
 * @param {Element} menu
 * @returns {HTMLElement}
 */
function triggerOf(menu) {
    return menu.querySelector('[data-core-menu-trigger]');
}

/**
 * @param {Element} menu
 * @returns {HTMLElement}
 */
function firstItemOf(menu) {
    return menu.querySelector('[role="menuitem"]');
}

/**
 * @param {Element} menu
 * @returns {boolean}
 */
function isOpen(menu) {
    return menu.hasAttribute('open')
        && menu.querySelector('.core-menu__panel')?.hasAttribute('hidden') === false;
}

/**
 * @returns {{ a: Element, b: Element, c: Element, outside: HTMLElement }}
 */
function mountThreeMenus() {
    focusedElement = null;
    document.body.innerHTML = `
        <core-menu id="menu-a" label="Menu A">
            <core-menu-item value="a1" label="Alpha one"></core-menu-item>
            <core-menu-item value="a2" label="Alpha two"></core-menu-item>
        </core-menu>
        <core-menu id="menu-b" label="Menu B">
            <core-menu-item value="b1" label="Bravo one"></core-menu-item>
            <core-menu-item value="b2" label="Bravo two"></core-menu-item>
        </core-menu>
        <core-menu id="menu-c" label="Menu C">
            <core-menu-item value="c1" label="Charlie one"></core-menu-item>
        </core-menu>
        <button type="button" id="outside">Outside</button>
    `;
    return {
        a: document.getElementById('menu-a'),
        b: document.getElementById('menu-b'),
        c: document.getElementById('menu-c'),
        outside: document.getElementById('outside'),
    };
}

/**
 * @param {Element} menu
 * @returns {number}
 */
function openMenuCount() {
    return Array.from(document.querySelectorAll('core-menu')).filter((menu) => isOpen(menu)).length;
}

test('clicking successive triggers keeps a single open core-menu', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b, c } = mountThreeMenus();

    click(triggerOf(a));
    assert.equal(isOpen(a), true);
    assert.equal(isOpen(b), false);
    assert.equal(isOpen(c), false);

    click(triggerOf(b));
    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(isOpen(c), false);

    click(triggerOf(c));
    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), false);
    assert.equal(isOpen(c), true);
    assert.equal(openMenuCount(), 1);
});

test('opening B from its trigger does not restore focus to A', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    click(triggerOf(a));
    assert.equal(isOpen(a), true);

    triggerOf(b).focus();
    click(triggerOf(b));

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.notEqual(document.activeElement, triggerOf(a));
    assert.equal(document.activeElement, firstItemOf(b));
});

test('keyboard open of B closes A and focuses B items', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.openMenu();
    assert.equal(isOpen(a), true);

    triggerOf(b).focus();
    press(triggerOf(b), 'Enter');

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.notEqual(document.activeElement, triggerOf(a));
    assert.equal(document.activeElement, firstItemOf(b));
});

test('ArrowDown on trigger B closes A and focuses the first item of B', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.openMenu();
    triggerOf(b).focus();
    press(triggerOf(b), 'ArrowDown');

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(document.activeElement, firstItemOf(b));
});

test('programmatic openMenu keeps a single open menu', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.openMenu();
    b.openMenu();

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(openMenuCount(), 1);
});

test('programmatic open attribute keeps a single open menu', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.setAttribute('open', '');
    b.setAttribute('open', '');

    assert.equal(a.hasAttribute('open'), false);
    assert.equal(b.hasAttribute('open'), true);
    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(openMenuCount(), 1);
});

test('attribute-open of B moves focus off A when A owned focus', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.openMenu();
    assert.equal(document.activeElement, firstItemOf(a));

    b.setAttribute('open', '');

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.notEqual(document.activeElement, firstItemOf(a));
    assert.notEqual(document.activeElement, triggerOf(a));
    assert.equal(document.activeElement, triggerOf(b));
});

test('attribute-open of B does not steal focus when A did not own it', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b, outside } = mountThreeMenus();

    a.setAttribute('open', '');
    outside.focus();
    b.setAttribute('open', '');

    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
    assert.equal(document.activeElement, outside);
});

test('outside click closes the open menu', async () => {
    await customElements.whenDefined('core-menu');
    const { a, outside } = mountThreeMenus();

    a.openMenu();
    click(outside);

    assert.equal(isOpen(a), false);
    assert.equal(a.hasAttribute('open'), false);
});

test('Escape closes the open menu and restores trigger focus', async () => {
    await customElements.whenDefined('core-menu');
    const { a } = mountThreeMenus();

    a.openMenu();
    assert.equal(document.activeElement, firstItemOf(a));

    press(firstItemOf(a), 'Escape');

    assert.equal(isOpen(a), false);
    assert.equal(document.activeElement, triggerOf(a));
});

test('peer auto-close emits one close on A and one open on B', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    let aClose = 0;
    let aOpen = 0;
    let bClose = 0;
    let bOpen = 0;
    a.addEventListener('core-menu-close', () => {
        aClose += 1;
    });
    a.addEventListener('core-menu-open', () => {
        aOpen += 1;
    });
    b.addEventListener('core-menu-close', () => {
        bClose += 1;
    });
    b.addEventListener('core-menu-open', () => {
        bOpen += 1;
    });

    a.openMenu();
    b.openMenu();

    assert.equal(aOpen, 1);
    assert.equal(aClose, 1);
    assert.equal(bOpen, 1);
    assert.equal(bClose, 0);
});

test('render while open does not drop exclusive registration', async () => {
    await customElements.whenDefined('core-menu');
    const { a, b } = mountThreeMenus();

    a.openMenu();
    a.setAttribute('align', 'start');
    assert.equal(isOpen(a), true);

    b.openMenu();
    assert.equal(isOpen(a), false);
    assert.equal(isOpen(b), true);
});

test('same-menu trigger toggle still closes and restores focus', async () => {
    await customElements.whenDefined('core-menu');
    const { a } = mountThreeMenus();

    click(triggerOf(a));
    assert.equal(isOpen(a), true);

    click(triggerOf(a));
    assert.equal(isOpen(a), false);
    assert.equal(document.activeElement, triggerOf(a));
});
