/**
 * Multi-select option parsing and filtering helpers.
 */

/**
 * @param {unknown} raw
 * @returns {unknown[]}
 */
export function normalizeOptions(raw) {
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw.map(normalizeOption).filter((item) => item !== null);
}

/**
 * @param {unknown} item
 * @returns {Record<string, unknown>|null}
 */
export function normalizeOption(item) {
    if (item == null || typeof item !== 'object') {
        return null;
    }
    const value = item.value;
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const label = item.label != null ? String(item.label) : String(value);
    return {
        value,
        label,
        selected: item.selected === true,
        image: item.image ? String(item.image) : '',
        imageAlt: item.imageAlt ? String(item.imageAlt) : label,
        html: item.html ? String(item.html) : '',
        description: item.description ? String(item.description) : '',
        keywords: item.keywords ? String(item.keywords) : '',
        disabled: item.disabled === true
    };
}

/**
 * @param {string|null} raw
 * @returns {unknown[]}
 */
export function parseSelectedValues(raw) {
    if (!raw) {
        return [];
    }
    const trimmed = raw.trim();
    if (!trimmed) {
        return [];
    }
    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }
    return trimmed.split(',').map((part) => part.trim()).filter(Boolean);
}

/**
 * @param {Record<string, unknown>} option
 * @param {string} query
 * @returns {boolean}
 */
export function optionMatchesQuery(option, query) {
    if (!query) {
        return true;
    }
    const haystack = [
        option.label,
        option.description,
        option.keywords,
        String(option.value)
    ].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
}

/**
 * @param {Record<string, unknown>[]} options
 * @param {string} query
 * @returns {Record<string, unknown>[]}
 */
export function filterOptions(options, query) {
    return options.filter((option) => optionMatchesQuery(option, query));
}
