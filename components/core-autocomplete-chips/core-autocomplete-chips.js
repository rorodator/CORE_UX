import { CoreAutocomplete } from '../core-autocomplete/core-autocomplete.js';
import { createElement } from '../../lib/utils/dom.js';
import { registerCoreComponent } from '../../lib/utils/register-component.js';
import { getItemText, getItemValue } from '../../lib/autocomplete/autocomplete-helpers.js';

/**
 * Multi-select autocomplete with removable chips.
 *
 * Events: chips-change, chips-add, chips-remove (+ inherited autocomplete-*)
 */
export class CoreAutocompleteChips extends CoreAutocomplete {

    /** @type {(item: unknown) => string} */
    #getLabel = (item) => this.#resolveLabel(item);

    /** @type {(item: unknown) => unknown} */
    #getValue = (item) => this.#resolveValue(item);

    #itemLabelKey = '';
    #itemValueKey = '';
    #clearOnSelect = true;
    /** @type {number|null} */
    #maxChips = null;
    #unique = true;
    /** @type {'above'|'below'} */
    #chipsPosition = 'above';

    /** @type {Array<{ label: string, value: unknown, raw: unknown }>} */
    #selected = [];
    /** @type {Set<unknown>} */
    #selectedValues = new Set();
    /** @type {HTMLElement|null} */
    #chipsContainer = null;

    onConnect() {
        this.#readAttributes();
        super.onConnect();
    }

    ui_toFunctional() {
        super.ui_toFunctional();
        this.#mountChipsContainer();
        this.addEventListener('autocomplete-select', (event) => {
            const raw = event.detail?.result?.raw ?? event.detail?.result ?? event.detail;
            this.#handleSelect(raw);
        });
    }

    /**
     * @param {unknown} results
     */
    updateResults(results) {
        const arr = results && typeof results === 'object' && results.results
            ? results.results
            : results;
        const source = Array.isArray(arr) ? arr : [];
        const filtered = source.filter((item) => !this.#selectedValues.has(this.#getValue(item)));
        return super.updateResults({ results: filtered });
    }

    /**
     * @param {(item: unknown) => string} fn
     */
    setItemLabelGetter(fn) {
        if (typeof fn === 'function') {
            this.#getLabel = fn;
        }
    }

    /**
     * @param {(item: unknown) => unknown} fn
     */
    setItemValueGetter(fn) {
        if (typeof fn === 'function') {
            this.#getValue = fn;
        }
    }

    /**
     * @param {unknown[]} valuesOrItems
     */
    setSelected(valuesOrItems) {
        this.clearSelection();
        if (!Array.isArray(valuesOrItems)) {
            return;
        }
        for (const entry of valuesOrItems) {
            const value = (typeof entry === 'object' && entry !== null)
                ? this.#getValue(entry)
                : entry;
            const label = (typeof entry === 'object' && entry !== null)
                ? this.#getLabel(entry)
                : String(entry);
            if (this.#unique && this.#selectedValues.has(value)) {
                continue;
            }
            this.#selectedValues.add(value);
            this.#selected.push({ label, value, raw: entry });
            this.#renderChip(label, value);
        }
        this.#emitChange();
    }

    getSelectedValues() {
        return this.#selected.map((entry) => entry.value);
    }

    getSelectedItems() {
        return this.#selected.slice();
    }

    /**
     * @param {unknown} itemOrValue
     */
    add(itemOrValue) {
        this.#handleSelect(itemOrValue);
    }

    /**
     * @param {unknown} value
     */
    remove(value) {
        const idx = this.#selected.findIndex((entry) => entry.value === value);
        if (idx < 0) {
            return;
        }
        this.#selected.splice(idx, 1);
        this.#selectedValues.delete(value);
        const chip = this.#chipsContainer?.querySelector(
            `.core-autocomplete__chip[data-value="${CSS.escape(String(value))}"]`
        );
        chip?.remove();
        this.dispatchEvent(new CustomEvent('chips-remove', {
            bubbles: true,
            detail: { value }
        }));
        this.#emitChange();
    }

    clearSelection() {
        this.#selected = [];
        this.#selectedValues.clear();
        if (this.#chipsContainer) {
            this.#chipsContainer.replaceChildren();
        }
        this.#emitChange();
    }

    /**
     * @param {'above'|'below'} position
     */
    setChipsPosition(position) {
        const pos = String(position || '').toLowerCase();
        if (pos !== 'above' && pos !== 'below') {
            return;
        }
        this.#chipsPosition = pos;
        const root = this.querySelector('.core-autocomplete');
        if (!root || !this.#chipsContainer?.parentNode) {
            return;
        }
        this.#chipsContainer.classList.toggle('core-autocomplete__chips--below', pos === 'below');
        this.#chipsContainer.classList.toggle('core-autocomplete__chips--above', pos === 'above');
        if (pos === 'below') {
            root.parentNode.insertBefore(this.#chipsContainer, root.nextSibling);
        } else {
            root.parentNode.insertBefore(this.#chipsContainer, root);
        }
    }

    #mountChipsContainer() {
        const root = this.querySelector('.core-autocomplete');
        if (!root || !root.parentNode) {
            return;
        }
        this.#chipsContainer = createElement('div', {
            className: [
                'core-autocomplete__chips',
                this.#chipsPosition === 'below'
                    ? 'core-autocomplete__chips--below'
                    : 'core-autocomplete__chips--above'
            ].join(' ')
        });
        if (this.#chipsPosition === 'below') {
            root.parentNode.insertBefore(this.#chipsContainer, root.nextSibling);
        } else {
            root.parentNode.insertBefore(this.#chipsContainer, root);
        }
    }

    /**
     * @param {unknown} rawItem
     */
    #handleSelect(rawItem) {
        const value = this.#getValue(rawItem);
        const label = this.#getLabel(rawItem);
        if (this.#unique && this.#selectedValues.has(value)) {
            this.clear();
            return;
        }
        if (this.#maxChips !== null && this.#selected.length >= this.#maxChips) {
            this.clear();
            return;
        }
        this.#selectedValues.add(value);
        this.#selected.push({ label, value, raw: rawItem });
        this.#renderChip(label, value);
        this.dispatchEvent(new CustomEvent('chips-add', {
            bubbles: true,
            detail: { item: { label, value, raw: rawItem } }
        }));
        this.#emitChange();
        if (this.#clearOnSelect) {
            this.clear();
            this.focus();
        }
    }

    /**
     * @param {string} label
     * @param {unknown} value
     */
    #renderChip(label, value) {
        if (!this.#chipsContainer) {
            return;
        }
        const chip = createElement('span', {
            className: 'core-autocomplete__chip',
            attrs: { 'data-value': String(value) }
        });
        chip.appendChild(createElement('span', {
            className: 'core-autocomplete__chip-label',
            text: label
        }));
        chip.appendChild(createElement('button', {
            className: 'core-autocomplete__chip-remove',
            text: '\u00D7',
            attrs: { type: 'button', 'aria-label': 'Remove' }
        }));
        chip.querySelector('.core-autocomplete__chip-remove')
            ?.addEventListener('click', (event) => {
                event.preventDefault();
                this.remove(value);
            });
        this.#chipsContainer.appendChild(chip);
    }

    #emitChange() {
        this.dispatchEvent(new CustomEvent('chips-change', {
            bubbles: true,
            detail: {
                values: this.getSelectedValues(),
                items: this.getSelectedItems()
            }
        }));
    }

    /**
     * @param {unknown} item
     * @returns {string}
     */
    #resolveLabel(item) {
        if (this.#itemLabelKey && item && typeof item === 'object' && this.#itemLabelKey in item) {
            return String(item[this.#itemLabelKey] ?? '');
        }
        if (item && typeof item === 'object' && item.title) {
            return String(item.title);
        }
        return getItemText(item);
    }

    /**
     * @param {unknown} item
     * @returns {unknown}
     */
    #resolveValue(item) {
        if (this.#itemValueKey && item && typeof item === 'object' && this.#itemValueKey in item) {
            return item[this.#itemValueKey];
        }
        if (item && typeof item === 'object' && 'value' in item) {
            return item.value;
        }
        return getItemValue(item);
    }

    #readAttributes() {
        if (this.hasAttribute('item-label-key')) {
            this.#itemLabelKey = this.getAttribute('item-label-key') || '';
        }
        if (this.hasAttribute('item-value-key')) {
            this.#itemValueKey = this.getAttribute('item-value-key') || '';
        }
        if (this.hasAttribute('clear-on-select')) {
            this.#clearOnSelect = this.getAttribute('clear-on-select') === 'true';
        }
        if (this.hasAttribute('max-chips')) {
            const parsed = parseInt(this.getAttribute('max-chips') || '', 10);
            if (!Number.isNaN(parsed)) {
                this.#maxChips = parsed;
            }
        }
        if (this.hasAttribute('unique')) {
            this.#unique = this.getAttribute('unique') !== 'false';
        }
        if (this.hasAttribute('chips-position')) {
            const pos = (this.getAttribute('chips-position') || '').toLowerCase();
            if (pos === 'below' || pos === 'above') {
                this.#chipsPosition = pos;
            }
        }
    }
}

registerCoreComponent('core-autocomplete-chips', CoreAutocompleteChips);

/** @deprecated Use CoreAutocompleteChips — alias for apps extending the base class. */
export const AutocompleteChipsComponent = CoreAutocompleteChips;
