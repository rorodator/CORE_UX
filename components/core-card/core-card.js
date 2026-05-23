import { Core_UXSlotElement } from '../../lib/base/core-ux-slot-element.js';
import { createElement, mountTrustedHtml } from 'CORE_JS/lib/utils/dom.js';
import { parseTrustedHtmlFragment, readTrustedLightDom } from '../../lib/dom/trusted-html.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * Content card. Body = light DOM children; optional footer via `[data-core-footer]`.
 */
export class CoreCard extends Core_UXSlotElement {

    static get observedAttributes() {
        return ['title', 'subtitle'];
    }

    constructor() {
        super();
        this._footerContent = '';
    }

    onConnect() {
        if (!this._slotCaptured) {
            this.captureSlotParts();
            this._slotCaptured = true;
        }
        this.render();
    }

    attributeChangedCallback() {
        this.slotAttributeChanged();
    }

    captureSlotParts() {
        const temp = parseTrustedHtmlFragment(readTrustedLightDom(this));
        const footer = temp.querySelector('[data-core-footer]');
        if (footer) {
            this._footerContent = footer.innerHTML;
            footer.remove();
        }
        this._slotContent = temp.innerHTML.trim();
    }

    get title() {
        return this.getAttribute('title') || '';
    }

    get subtitle() {
        return this.getAttribute('subtitle') || '';
    }

    ui_render() {
        const article = createElement('article', { className: 'core-card' });

        if (this.title) {
            const header = createElement('header', { className: 'core-card__header' });
            header.appendChild(createElement('h2', {
                className: 'core-card__title',
                text: this.title
            }));
            if (this.subtitle) {
                header.appendChild(createElement('p', {
                    className: 'core-card__subtitle',
                    text: this.subtitle
                }));
            }
            article.appendChild(header);
        }

        const body = createElement('div', { className: 'core-card__body' });
        mountTrustedHtml(body, this._slotContent);
        article.appendChild(body);

        if (this._footerContent) {
            const footer = createElement('footer', { className: 'core-card__footer' });
            mountTrustedHtml(footer, this._footerContent);
            article.appendChild(footer);
        }

        this.replaceChildren(article);
    }
}

registerCoreComponent('core-card', CoreCard);
