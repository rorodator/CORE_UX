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
