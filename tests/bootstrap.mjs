import { register } from 'node:module';
import { parseHTML } from 'linkedom';

register('./test-loader.mjs', import.meta.url);

const { document, customElements, HTMLElement } = parseHTML(
    '<!DOCTYPE html><html><body></body></html>'
);
globalThis.document = document;
globalThis.customElements = customElements;
globalThis.HTMLElement = HTMLElement;
globalThis.Element = document.defaultView.Element;
