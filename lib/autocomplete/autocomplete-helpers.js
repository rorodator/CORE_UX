/**
 * Shared autocomplete data helpers.
 */

/**
 * @param {unknown} item
 * @returns {string}
 */
export function getItemText(item) {
    if (typeof item === 'string') {
        return item;
    }
    if (item && typeof item === 'object') {
        if (item.title) {
            return String(item.title);
        }
        if (item.text) {
            return String(item.text);
        }
        if (item.name) {
            return String(item.name);
        }
        if (item.label) {
            return String(item.label);
        }
    }
    return String(item ?? '');
}

/**
 * @param {unknown} item
 * @returns {string}
 */
export function getItemDescription(item) {
    if (item && typeof item === 'object' && item.description) {
        return String(item.description);
    }
    return '';
}

/**
 * @param {unknown} item
 * @returns {unknown}
 */
export function getItemValue(item) {
    if (item && typeof item === 'object' && 'value' in item) {
        return item.value;
    }
    return getItemText(item);
}

/**
 * @param {unknown[]} data
 * @param {string} query
 * @param {number} maxResults
 * @returns {unknown[]}
 */
export function filterArrayData(data, query, maxResults) {
    const lowerQuery = query.toLowerCase();
    return data
        .filter((item) => getItemText(item).toLowerCase().includes(lowerQuery))
        .slice(0, maxResults);
}

/**
 * @param {unknown} results
 * @returns {unknown[]}
 */
export function normalizeResults(results) {
    if (results && typeof results === 'object' && Array.isArray(results.results)) {
        return results.results;
    }
    return Array.isArray(results) ? results : [];
}
