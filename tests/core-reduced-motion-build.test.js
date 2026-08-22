import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const distPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../dist/core-ux.css'
);

test('built core-ux.css retains prefers-reduced-motion overrides', () => {
    const css = fs.readFileSync(distPath, 'utf8');
    const blockStart = css.indexOf('prefers-reduced-motion:reduce');
    assert.ok(blockStart >= 0);
    const block = css.slice(blockStart, blockStart + 500);
    assert.ok(block.includes('.core-spinner{animation:none')
        || block.includes('.core-spinner{animation: none'));
    assert.ok(block.includes('.core-notif'));
    assert.ok(block.includes('transition:none') || block.includes('transition: none'));
});
