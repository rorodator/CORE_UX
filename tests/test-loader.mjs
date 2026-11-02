import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const shimBase = pathToFileURL(path.join(root, 'doc/assets/')).href;

/**
 * @param {string} specifier
 * @param {import('node:module').ResolveHookContext} context
 * @param {import('node:module').ResolveHook} nextResolve
 */
export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'CORE_JS/lib/utils/dom.js') {
        return {
            url: `${shimBase}core-dom-shim.js`,
            shortCircuit: true,
        };
    }
    if (specifier === 'CORE_JS/lib/base/core-html-element.js') {
        return {
            url: `${shimBase}core-html-element-shim.js`,
            shortCircuit: true,
        };
    }
    if (specifier.startsWith('CORE_JS/lib/value/')) {
        const rel = specifier.slice('CORE_JS/'.length);
        return {
            url: pathToFileURL(path.resolve(root, '../core_js', rel)).href,
            shortCircuit: true,
        };
    }
    return nextResolve(specifier, context);
}
