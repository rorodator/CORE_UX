/**
 * Maps core-formatted-field / core-range-field attributes onto CORE_JS value primitives.
 * The widgets stay usable without FilterBar.
 */
import { compareValues, formatValue, parseValue } from 'CORE_JS/lib/value/core-value-registry.js';

/** @type {Record<string, string>} */
const TYPE_BY_ATTRIBUTE = {
    integer: 'integer',
    decimal: 'decimal',
    date: 'date',
    time: 'time',
    datetime: 'datetime',
    'relative-date': 'relativeDate'
};

/**
 * @param {string|null|undefined} attribute
 * @returns {string}
 */
export function registryTypeFromAttribute(attribute) {
    return TYPE_BY_ATTRIBUTE[attribute || ''] || 'decimal';
}

/**
 * @param {string} type
 * @param {'local'|'offset'} temporal
 * @returns {string|undefined}
 */
export function defaultFormat(type, temporal) {
    if (type === 'date') {
        return 'dd MMM yyyy';
    }
    if (type === 'time') {
        return 'HH:mm:ss';
    }
    if (type === 'datetime') {
        return temporal === 'offset'
            ? 'dd MMM yyyy HH:mm:ss xxx'
            : 'dd MMM yyyy HH:mm:ss';
    }
    return undefined;
}

/**
 * @param {string|null} raw
 * @returns {number|undefined}
 */
function readCount(raw) {
    if (raw == null || raw === '') {
        return undefined;
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
        return undefined;
    }
    return parsed;
}

/**
 * @param {HTMLElement} host
 * @returns {{ type: string, options: Record<string, unknown> }}
 */
export function readFormattedOptions(host) {
    const type = registryTypeFromAttribute(host.getAttribute('value-type'));
    const temporal = host.getAttribute('temporal') === 'offset' ? 'offset' : 'local';
    /** @type {Record<string, unknown>} */
    const options = {
        locale: host.getAttribute('locale') || 'en',
        temporal,
        excessPrecision: host.getAttribute('excess-precision') === 'keep' ? 'keep' : 'reject'
    };
    if (host.hasAttribute('decimal-separator')) {
        options.decimalSeparator = host.getAttribute('decimal-separator') ?? '';
    }
    if (host.hasAttribute('group-separator')) {
        options.groupSeparator = host.getAttribute('group-separator') ?? '';
    }
    const maxFractionDigits = readCount(host.getAttribute('max-fraction-digits'));
    if (maxFractionDigits != null) {
        options.maxFractionDigits = maxFractionDigits;
    }
    const fractionDigits = readCount(host.getAttribute('fraction-digits'));
    if (fractionDigits != null) {
        options.fractionDigits = fractionDigits;
    }
    const format = host.getAttribute('format') || defaultFormat(type, temporal);
    if (format) {
        options.format = format;
    }
    options.valueType = type;
    return { type, options };
}

/**
 * @param {string} type
 * @param {unknown} value
 * @returns {string}
 */
export function serializeCanonical(type, value) {
    if (value == null) {
        return '';
    }
    if (type === 'relativeDate' || (typeof value === 'object' && value !== null)) {
        return JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    return String(value);
}

export { compareValues, formatValue, parseValue };
