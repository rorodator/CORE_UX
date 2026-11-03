import { register } from 'node:module';
import { parseHTML, DOMParser } from 'linkedom';

register('./test-loader.mjs', import.meta.url);

const { document, customElements, HTMLElement } = parseHTML(
    '<!DOCTYPE html><html><body></body></html>'
);
const { defaultView } = document;
globalThis.document = document;
globalThis.window = defaultView;
globalThis.customElements = customElements;
globalThis.HTMLElement = HTMLElement;
globalThis.HTMLInputElement = defaultView.HTMLInputElement;
globalThis.Element = defaultView.Element;
globalThis.Node = defaultView.Node;
globalThis.DOMParser = DOMParser;
globalThis.Event = defaultView.Event;
globalThis.CustomEvent = defaultView.CustomEvent;
globalThis.KeyboardEvent = defaultView.KeyboardEvent;
globalThis.MouseEvent = defaultView.MouseEvent;
globalThis.FocusEvent = defaultView.FocusEvent;
globalThis.DOMParser = DOMParser;
defaultView.requestAnimationFrame = (callback) => setTimeout(callback, 0);

// linkedom ignores AbortSignal on addEventListener. The kit's bindUI / bindDelegated
// rely on it, so without this patch every render stacks another listener.
// Patch Element only: AbortSignal stays on EventTarget and must not re-enter this wrapper.
const elementPrototype = defaultView.Element?.prototype;
if (elementPrototype && !elementPrototype.addEventListener?.__coreAbortSignalPatched) {
    const originalAdd = elementPrototype.addEventListener
        || defaultView.EventTarget.prototype.addEventListener;
    function addEventListener(type, listener, options) {
        originalAdd.call(this, type, listener, options);
        const signal = options && typeof options === 'object' ? options.signal : null;
        if (!signal || typeof listener !== 'function') {
            return;
        }
        const remove = () => {
            this.removeEventListener(type, listener, options);
        };
        if (signal.aborted) {
            remove();
            return;
        }
        signal.addEventListener('abort', remove, { once: true });
    }
    addEventListener.__coreAbortSignalPatched = true;
    elementPrototype.addEventListener = addEventListener;
}
