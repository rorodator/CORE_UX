import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement } from 'CORE_JS/lib/utils/dom.js';
import {
    getPlainTextFromHtml,
    normalizeRichTextHtml,
    sanitizeRichTextHtml,
    sanitizeRichTextHref,
} from '../../lib/html/rich-text-html.js';
import { createCoreIconSvg } from '../../lib/icons/core-icon-catalog.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/** @typedef {{ id: string, label: string, icon?: string, command?: string, value?: string, type?: string }} RichTextToolbarItem */

/** @type {RichTextToolbarItem[]} */
const DEFAULT_TOOLBAR = [
    { id: 'bold', label: 'Bold', icon: 'bold', command: 'bold' },
    { id: 'italic', label: 'Italic', icon: 'italic', command: 'italic' },
    { id: 'underline', label: 'Underline', icon: 'underline', command: 'underline' },
    { id: 'separator-1', label: '', type: 'separator' },
    { id: 'bullet-list', label: 'Bullet list', icon: 'list', command: 'insertUnorderedList' },
    { id: 'ordered-list', label: 'Numbered list', icon: 'list-ordered', command: 'insertOrderedList' },
    { id: 'separator-2', label: '', type: 'separator' },
    { id: 'link', label: 'Insert link', icon: 'link', command: 'createLink' },
    { id: 'text-color', label: 'Text color', icon: 'palette', type: 'color' },
    { id: 'separator-3', label: '', type: 'separator' },
    { id: 'align-left', label: 'Align left', icon: 'align-left', command: 'justifyLeft' },
    { id: 'align-center', label: 'Align center', icon: 'align-center', command: 'justifyCenter' },
    { id: 'align-right', label: 'Align right', icon: 'align-right', command: 'justifyRight' },
    { id: 'separator-4', label: '', type: 'separator' },
    { id: 'remove-format', label: 'Clear formatting', icon: 'remove-format', command: 'removeFormat' },
];

/**
 * WYSIWYG rich-text field with toolbar formatting and HTML sanitization helpers.
 */
export class CoreRichText extends Core_UXFormControl {

    constructor() {
        super();
        /** @type {boolean} */
        this._suppressInputEvent = false;
    }

    static get observedAttributes() {
        return [
            'label', 'hint', 'error', 'name', 'value', 'placeholder',
            'input-id', 'required', 'disabled', 'min-height', 'sanitize',
        ];
    }

    get structuralAttributes() {
        return ['min-height', 'placeholder'];
    }

    get minHeight() {
        const parsed = parseInt(this.getAttribute('min-height') || '8', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
    }

    get shouldSanitize() {
        return !(this.hasAttribute('sanitize') && this.getAttribute('sanitize') === 'false');
    }

    onConnect() {
        this.render();
    }

    /**
     * @returns {HTMLElement|null}
     */
    _getEditor() {
        return this.querySelector('.core-rich-text__editor');
    }

    /**
     * @returns {HTMLInputElement|null}
     */
    _getHiddenInput() {
        return this.querySelector('input[type="hidden"]');
    }

    _getControl() {
        return this._getEditor();
    }

    /**
     * @returns {string}
     */
    getHtml() {
        const editor = this._getEditor();
        const raw = editor ? editor.innerHTML : '';
        return this.shouldSanitize ? normalizeRichTextHtml(raw) : raw.trim();
    }

    /**
     * @returns {string}
     */
    getText() {
        return getPlainTextFromHtml(this.getHtml());
    }

    /**
     * @param {string} html
     */
    setHtml(html) {
        const editor = this._getEditor();
        if (!editor) {
            this.setAttribute('value', html || '');
            return;
        }
        const safe = this.shouldSanitize ? sanitizeRichTextHtml(html || '') : (html || '');
        this._suppressInputEvent = true;
        editor.innerHTML = safe || '';
        this._syncHiddenValue();
        this._suppressInputEvent = false;
        this.setAttribute('value', this.getHtml());
    }

    /**
     * @param {string} name
     */
    _handleAttributeChange(name) {
        if (name === 'value') {
            this._syncValue();
            return;
        }
        if (name === 'min-height') {
            const editor = this._getEditor();
            if (editor) {
                editor.style.minHeight = `${this.minHeight}rem`;
            }
            return;
        }
        if (name === 'disabled') {
            this._syncDisabled();
            return;
        }
        super._handleAttributeChange(name);
    }

    _syncValue() {
        const editor = this._getEditor();
        if (!editor || !this.hasAttribute('value')) {
            return;
        }
        if (document.activeElement === editor) {
            return;
        }
        const next = this.getAttribute('value') || '';
        const current = this.getHtml();
        if (current !== next) {
            this.setHtml(next);
        }
    }

    _syncHiddenValue() {
        const hidden = this._getHiddenInput();
        if (hidden) {
            hidden.value = this.getHtml();
        }
    }

    _syncDisabled() {
        const editor = this._getEditor();
        const shell = this.querySelector('.core-rich-text');
        const toolbar = this.querySelector('.core-rich-text__toolbar');
        if (editor) {
            editor.setAttribute('contenteditable', this.disabled ? 'false' : 'true');
        }
        shell?.classList.toggle('core-rich-text--disabled', this.disabled);
        toolbar?.querySelectorAll('button, input').forEach((control) => {
            control.disabled = this.disabled;
        });
    }

    /**
     * @param {HTMLElement} editor
     */
    _wireEditor(editor) {
        editor.id = this.fieldId;
        editor.setAttribute('role', 'textbox');
        editor.setAttribute('aria-multiline', 'true');
        editor.setAttribute('contenteditable', this.disabled ? 'false' : 'true');
        editor.style.minHeight = `${this.minHeight}rem`;
        if (this.hasAttribute('placeholder')) {
            editor.dataset.placeholder = this.getAttribute('placeholder') || '';
        } else {
            delete editor.dataset.placeholder;
        }
        if (this.hasAttribute('name')) {
            const hidden = this._getHiddenInput();
            if (hidden) {
                hidden.name = this.getAttribute('name') || '';
            }
        }
        this._syncControlAccessibility(editor);
    }

    /**
     * @param {string} command
     * @param {string} [value]
     */
    _execCommand(command, value) {
        const editor = this._getEditor();
        if (!editor || this.disabled) {
            return;
        }
        editor.focus();
        if (command === 'createLink') {
            this._insertLink();
            return;
        }
        document.execCommand(command, false, value);
        this._onEditorInput();
    }

    _insertLink() {
        const selection = document.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return;
        }
        const url = window.prompt('Link URL (https://, mailto:, or relative path)');
        if (url == null) {
            return;
        }
        const safeHref = sanitizeRichTextHref(url.trim());
        if (!safeHref) {
            return;
        }
        document.execCommand('createLink', false, safeHref);
        this._onEditorInput();
    }

    _onEditorInput() {
        const html = this.getHtml();
        this._syncHiddenValue();
        this.setAttribute('value', html);
        if (this._suppressInputEvent) {
            return;
        }
        this.dispatchEvent(new CustomEvent('core-rich-text-input', {
            bubbles: true,
            detail: { html, text: this.getText() },
        }));
    }

    /**
     * @returns {HTMLElement}
     */
    _createToolbar() {
        const toolbar = createElement('div', {
            className: 'core-rich-text__toolbar',
            attrs: {
                role: 'toolbar',
                'aria-label': 'Text formatting',
            },
        });

        DEFAULT_TOOLBAR.forEach((item) => {
            if (item.type === 'separator') {
                toolbar.appendChild(createElement('span', {
                    className: 'core-rich-text__toolbar-sep',
                    attrs: { role: 'separator', 'aria-orientation': 'vertical' },
                }));
                return;
            }
            if (item.type === 'color') {
                const wrap = createElement('label', {
                    className: 'core-rich-text__toolbar-btn core-rich-text__toolbar-btn--color',
                    attrs: { title: item.label, 'aria-label': item.label },
                });
                const input = createElement('input', {
                    className: 'core-rich-text__color-input',
                    attrs: {
                        type: 'color',
                        value: '#111827',
                        'data-rich-text-color': '',
                        'aria-label': item.label,
                    },
                });
                const iconHost = createElement('span', { className: 'core-rich-text__toolbar-icon' });
                const svg = createCoreIconSvg(item.icon || 'palette', { size: 16 });
                if (svg) {
                    iconHost.appendChild(svg);
                }
                wrap.appendChild(input);
                wrap.appendChild(iconHost);
                toolbar.appendChild(wrap);
                return;
            }

            const button = createElement('button', {
                className: 'core-rich-text__toolbar-btn',
                attrs: {
                    type: 'button',
                    title: item.label,
                    'aria-label': item.label,
                    'data-rich-text-command': item.command || '',
                },
            });
            const iconHost = createElement('span', { className: 'core-rich-text__toolbar-icon' });
            const svg = createCoreIconSvg(item.icon || '', { size: 16 });
            if (svg) {
                iconHost.appendChild(svg);
            } else {
                iconHost.textContent = item.label.slice(0, 1);
            }
            button.appendChild(iconHost);
            toolbar.appendChild(button);
        });

        return toolbar;
    }

    ui_render() {
        const field = this.createFieldShell();
        this.appendLabel(field);

        const shell = createElement('div', { className: 'core-rich-text' });
        shell.appendChild(this._createToolbar());

        const editor = createElement('div', {
            className: `core-rich-text__editor core-control${this.hasError ? ' core-control--error' : ''}`,
        });
        shell.appendChild(editor);

        const hidden = createElement('input', {
            attrs: { type: 'hidden' },
        });
        shell.appendChild(hidden);

        field.appendChild(shell);
        this.appendHint(field);
        this.appendError(field);
        this.replaceChildren(field);
    }

    ui_toFunctional() {
        const editor = this._getEditor();
        const hidden = this._getHiddenInput();
        if (!editor || !hidden) {
            return;
        }

        this._wireEditor(editor);
        if (this.hasAttribute('value')) {
            this.setHtml(this.getAttribute('value') || '');
        } else {
            this._syncHiddenValue();
        }
        this._syncDisabled();

        this.bindUI('input', () => this._onEditorInput());
        this.bindUI('blur', () => {
            this.dispatchEvent(new CustomEvent('core-rich-text-change', {
                bubbles: true,
                detail: { html: this.getHtml(), text: this.getText() },
            }));
        });

        this.bindDelegated('click', '[data-rich-text-command]', (event, target) => {
            event.preventDefault();
            const command = target.getAttribute('data-rich-text-command');
            if (command) {
                this._execCommand(command);
            }
        });

        this.bindDelegated('input', '[data-rich-text-color]', (_event, target) => {
            this._execCommand('foreColor', target.value);
        });

        this.bindDelegated('mousedown', '.core-rich-text__toolbar-btn, .core-rich-text__toolbar-btn--color', (event) => {
            event.preventDefault();
        });
    }
}

registerCoreComponent('core-rich-text', CoreRichText);

export {
    escapeHtml,
    getPlainTextFromHtml,
    normalizeRichTextHtml,
    sanitizeRichTextHtml,
    sanitizeRichTextHref,
    sanitizeRichTextStyle,
} from '../../lib/html/rich-text-html.js';
