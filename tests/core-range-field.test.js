import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../components/core-range-field/core-range-field.js';

/**
 * @param {string} html
 */
function mount(html) {
    document.body.innerHTML = html;
    return document.body.firstElementChild;
}

test('partial range is valid and reversed bounds stay raw', async () => {
    const host = mount(`<core-range-field label="Amount" name="amount" value-type="decimal" locale="en" value='{"min":"10","max":null}'></core-range-field>`);
    await customElements.whenDefined('core-range-field');
    const min = host.querySelector('[data-bound="min"]');
    const max = host.querySelector('[data-bound="max"]');
    assert.equal(min.getAttribute('type'), 'text');
    assert.equal(max.getAttribute('type'), 'text');
    assert.equal(min.getAttribute('aria-label'), 'Minimum');
    assert.equal(max.getAttribute('aria-label'), 'Maximum');
    assert.equal(min.name, 'amount-min');
    assert.equal(max.name, 'amount-max');
    assert.equal(host.getValueState().status, 'valid');
    assert.deepEqual(host.getValueState().value, { min: '10', max: null });
    assert.equal(min.value, '10');
    assert.equal(max.value, '');

    let events = 0;
    host.addEventListener('core-range-field-input', () => {
        events += 1;
    });
    host.addEventListener('core-range-field-change', () => {
        events += 1;
    });
    host.setAttribute('value', '{"min":"0","max":null}');
    assert.equal(events, 0);
    assert.equal(min.value, '0');

    min.value = '20';
    max.value = '10';
    min.dispatchEvent(new Event('input', { bubbles: true }));
    min.dispatchEvent(new Event('focusout', { bubbles: true }));
    const state = host.getValueState();
    assert.equal(state.status, 'invalid');
    assert.equal(state.value, null);
    assert.equal(state.errors[0].code, 'E_RANGE_ORDER');
    assert.deepEqual(state.errors[0].details.exact, { min: '20', max: '10' });
    assert.equal(min.value, '20');
    assert.equal(max.value, '10');
    assert.equal(host.hasAttribute('value'), false);
    assert.ok(host.querySelector('[data-core-parse-error]'));
});

test('French partial bound and focus survive an error attribute', async () => {
    const host = mount('<core-range-field value-type="decimal" locale="fr" label="Montant"></core-range-field>');
    await customElements.whenDefined('core-range-field');
    const min = host.querySelector('[data-bound="min"]');
    const max = host.querySelector('[data-bound="max"]');
    const group = host.querySelector('[role="group"]');
    assert.equal(group.getAttribute('aria-labelledby'), host.querySelector('label').id);

    min.value = '1 234,5';
    min.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(min.value, '1 234,5');
    assert.equal(host.getValueState().status, 'valid');
    assert.equal(host.hasAttribute('value'), false);
    min.dispatchEvent(new Event('focusout', { bubbles: true }));
    assert.equal(host.getAttribute('value'), '{"min":"1234.5","max":null}');
    assert.equal(min.value, '1\u00A0234,5');
    assert.equal(max.value, '');

    min.focus();
    min.value = '1\u00A0234,50';
    if (typeof min.setSelectionRange === 'function') {
        min.setSelectionRange(2, 4);
    }
    host.setAttribute('error', 'Check the range');
    assert.equal(host.querySelector('[data-bound="min"]'), min);
    assert.equal(min.value, '1\u00A0234,50');
    if (typeof min.selectionStart === 'number') {
        assert.equal(min.selectionStart, 2);
        assert.equal(min.selectionEnd, 4);
    }
    assert.equal(min.getAttribute('aria-invalid'), 'true');
    assert.equal(max.getAttribute('aria-invalid'), 'true');
});

test('a programmatic range received during focus is applied when focus leaves', async () => {
    const host = mount(`<core-range-field value-type="integer" value='{"min":"12","max":null}'></core-range-field>`);
    await customElements.whenDefined('core-range-field');
    const min = host.querySelector('[data-bound="min"]');
    let events = 0;
    host.addEventListener('core-range-field-input', () => {
        events += 1;
    });
    host.addEventListener('core-range-field-change', () => {
        events += 1;
    });
    min.focus();
    if (typeof min.setSelectionRange === 'function') {
        min.setSelectionRange(1, 1);
    }
    host.setAttribute('value', '{"min":"99","max":null}');
    assert.equal(events, 0);
    assert.equal(min.value, '12');
    if (typeof min.selectionStart === 'number') {
        assert.equal(min.selectionStart, 1);
    }
    min.dispatchEvent(new Event('focusout', { bubbles: true }));
    assert.equal(events, 0);
    assert.equal(min.value, '99');
    assert.deepEqual(host.getValueState().value, { min: '99', max: null });
});

test('last write wins for a range, including focus moving from min to max', async () => {
    const host = mount(`<core-range-field value-type="integer" value='{"min":"12","max":null}'></core-range-field>`);
    await customElements.whenDefined('core-range-field');
    const min = host.querySelector('[data-bound="min"]');
    const max = host.querySelector('[data-bound="max"]');
    let events = 0;
    host.addEventListener('core-range-field-input', () => {
        events += 1;
    });
    host.addEventListener('core-range-field-change', () => {
        events += 1;
    });

    min.focus();
    min.value = '7';
    min.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(events, 1);
    host.setAttribute('value', '{"min":"99","max":"3"}');
    assert.equal(events, 1);
    assert.equal(min.value, '7');
    min.dispatchEvent(new Event('focusout', { bubbles: true }));
    assert.equal(events, 1);
    assert.equal(min.value, '99');
    assert.equal(max.value, '3');
    assert.equal(host.getAttribute('value'), '{"min":"99","max":"3"}');

    max.value = '';
    min.focus();
    host.setAttribute('value', '{"min":"40","max":null}');
    assert.equal(events, 1);
    min.value = '8';
    min.dispatchEvent(new Event('input', { bubbles: true }));
    min.dispatchEvent(new Event('focusout', { bubbles: true }));
    assert.equal(host.getAttribute('value'), '{"min":"8","max":null}');
    assert.equal(min.value, '8');

    min.focus();
    const before = events;
    host.setAttribute('value', '{"min":"1","max":null}');
    host.setAttribute('value', '{"min":"2","max":null}');
    host.setAttribute('value', '{"min":"3","max":null}');
    assert.equal(events, before);
    assert.equal(min.value, '8');
    min.dispatchEvent(new Event('focusout', { bubbles: true }));
    assert.equal(events, before);
    assert.equal(min.value, '3');

    min.focus();
    min.value = '42';
    min.dispatchEvent(new Event('input', { bubbles: true }));
    const moved = events;
    const move = new Event('focusout', { bubbles: true });
    Object.defineProperty(move, 'relatedTarget', { value: max });
    min.dispatchEvent(move);
    max.focus();
    assert.equal(min.value, '42');
    assert.equal(max.value, '');
    assert.equal(host.getAttribute('value'), '{"min":"3","max":null}');
    host.setAttribute('value', '{"min":"1","max":"2"}');
    assert.equal(events, moved);
    assert.equal(min.value, '42');
    assert.equal(max.value, '');
    max.dispatchEvent(new Event('focusout', { bubbles: true }));
    assert.equal(events, moved);
    assert.equal(min.value, '1');
    assert.equal(max.value, '2');
});

test('a pending range bound stays on screen after blur', async () => {
    const host = mount('<core-range-field value-type="decimal" locale="fr"></core-range-field>');
    await customElements.whenDefined('core-range-field');
    const min = host.querySelector('[data-bound="min"]');
    const max = host.querySelector('[data-bound="max"]');
    min.value = '12,';
    min.dispatchEvent(new Event('input', { bubbles: true }));
    min.dispatchEvent(new Event('focusout', { bubbles: true }));
    assert.equal(host.getValueState().status, 'pending');
    assert.equal(min.value, '12,');
    assert.equal(max.value, '');
    assert.equal(host.hasAttribute('value'), false);
    assert.equal(host.querySelector('[data-core-parse-error]'), null);
});

test('date range uses text inputs and English month labels', async () => {
    const host = mount(`<core-range-field value-type="date" value='{"min":"2026-11-02","max":null}'></core-range-field>`);
    await customElements.whenDefined('core-range-field');
    const min = host.querySelector('[data-bound="min"]');
    const max = host.querySelector('[data-bound="max"]');
    assert.equal(min.getAttribute('type'), 'text');
    assert.equal(min.value, '02 Nov 2026');
    assert.equal(max.value, '');
    assert.equal(host.getValueState().status, 'valid');
});
