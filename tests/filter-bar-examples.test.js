import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('filter bar examples cover the minimal catalog, formats, and a subscriber', () => {
    const file = path.resolve(import.meta.dirname, '../doc/filter-bar.html');
    const source = fs.readFileSync(file, 'utf8');
    assert.equal(source.includes("{ id: 'name', type: 'string' }"), true);
    assert.equal(source.includes("{ id: 'amount', type: 'decimal' }"), true);
    assert.equal(source.includes("{ id: 'tradeDate', type: 'date' }"), true);
    assert.equal(source.includes("options: ['EUR', 'USD', 'GBP']"), true);
    assert.equal(source.includes('decimalSeparator'), true);
    assert.equal(source.includes("format: 'dd MMM yyyy'"), true);
    assert.equal(source.includes('ctx.signal.addEventListener'), true);
    assert.equal(source.includes('state$.subscribe'), true);
    assert.equal(source.includes('events$.subscribe'), true);
    assert.equal(source.includes('getCriteria()'), true);
    assert.equal(source.includes('1234567.89'), true);
    assert.equal(source.includes('Outside V1'), true);
    const script = source.slice(source.lastIndexOf('<script type="module">'));
    assert.equal(/ag-grid|agGrid|\bSQL\b|DataSource/i.test(script), false);
});
