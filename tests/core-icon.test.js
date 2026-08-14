import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCoreIconSvg, resolveCoreIcon } from '../lib/icons/core-icon-catalog.js';

test('resolveCoreIcon returns known semantic icons', () => {
    assert.ok(resolveCoreIcon('edit'));
    assert.ok(resolveCoreIcon('delete'));
    assert.ok(resolveCoreIcon('story'));
});

test('resolveCoreIcon returns null for unknown names', () => {
    assert.equal(resolveCoreIcon('unknown-icon'), null);
});

test('createCoreIconSvg renders svg for known icons', () => {
    const svg = createCoreIconSvg('edit', { size: 16 });
    assert.ok(svg);
    assert.equal(svg.tagName.toLowerCase(), 'svg');
    assert.equal(svg.getAttribute('width'), '16');
});

test('createCoreIconSvg returns null for unknown icons', () => {
    assert.equal(createCoreIconSvg('missing'), null);
});
