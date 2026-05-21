/**
 * Default autocomplete configuration and attribute parsing.
 */

export const DEFAULT_AUTOCOMPLETE_CONFIG = {
    placeholder: 'Type to search...',
    placeholderContainer: '',
    placeholderKey: '',
    labelText: '',
    labelContainer: '',
    labelKey: '',
    minCharacters: 3,
    delay: 300,
    maxResults: 10,
    showNoResults: true,
    allowAdditions: false,
    forceSelection: false,
    clearable: false,
    loading: false,
    noResultsText: 'No results',
    noResultsContainer: '',
    noResultsKey: ''
};

/**
 * @param {HTMLElement} el
 * @param {Record<string, unknown>} config
 */
export function readAutocompleteAttributes(el, config) {
    if (el.hasAttribute('placeholder')) {
        config.placeholder = el.getAttribute('placeholder') || '';
    }
    if (el.hasAttribute('placeholder-container')) {
        config.placeholderContainer = el.getAttribute('placeholder-container') || '';
    }
    if (el.hasAttribute('placeholder-key')) {
        config.placeholderKey = el.getAttribute('placeholder-key') || '';
    }
    if (el.hasAttribute('label')) {
        config.labelText = el.getAttribute('label') || '';
    }
    if (el.hasAttribute('label-container')) {
        config.labelContainer = el.getAttribute('label-container') || '';
    }
    if (el.hasAttribute('label-key')) {
        config.labelKey = el.getAttribute('label-key') || '';
    }
    if (el.hasAttribute('min-characters')) {
        config.minCharacters = parseInt(el.getAttribute('min-characters') || '3', 10);
    }
    if (el.hasAttribute('delay')) {
        config.delay = parseInt(el.getAttribute('delay') || '300', 10);
    }
    if (el.hasAttribute('max-results')) {
        config.maxResults = parseInt(el.getAttribute('max-results') || '10', 10);
    }
    if (el.hasAttribute('allow-additions')) {
        config.allowAdditions = el.getAttribute('allow-additions') === 'true';
    }
    if (el.hasAttribute('force-selection')) {
        config.forceSelection = el.getAttribute('force-selection') === 'true';
    }
    if (el.hasAttribute('clearable')) {
        config.clearable = el.getAttribute('clearable') === 'true';
    }
    if (el.hasAttribute('no-results')) {
        config.noResultsText = el.getAttribute('no-results') || config.noResultsText;
    }
    if (el.hasAttribute('no-results-container')) {
        config.noResultsContainer = el.getAttribute('no-results-container') || '';
    }
    if (el.hasAttribute('no-results-key')) {
        config.noResultsKey = el.getAttribute('no-results-key') || '';
    }
}

/**
 * @param {Record<string, unknown>|null} repo
 * @param {Record<string, unknown>} config
 */
export function resolveAutocompleteI18n(repo, config) {
    const resolved = { ...config };

    if (repo && config.placeholderContainer && config.placeholderKey) {
        const container = repo[config.placeholderContainer] || {};
        resolved.placeholder = container[config.placeholderKey] || config.placeholder;
    }

    if (repo && config.labelContainer && config.labelKey) {
        const container = repo[config.labelContainer] || {};
        resolved.labelText = container[config.labelKey] || config.labelText;
    }

    if (repo && config.noResultsContainer && config.noResultsKey) {
        const container = repo[config.noResultsContainer] || {};
        resolved.noResultsText = container[config.noResultsKey] || config.noResultsText;
    }

    return resolved;
}
