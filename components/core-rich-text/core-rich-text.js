import { Core_UXFormControl } from '../../lib/base/core-ux-form-control.js';
import { createElement, mirrorAttributes } from 'CORE_JS/lib/utils/dom.js';
import {
    getPlainTextFromHtml,
    getRichTextPlainLength,
    normalizeRichTextHtml,
    sanitizeRichTextHtml,
    sanitizeRichTextHref,
    sanitizeRichTextPaste,
} from '../../lib/html/rich-text-html.js';
import { createCoreIconSvg } from '../../lib/icons/core-icon-catalog.js';
import {
    applyRichTextFallbackLabels,
    buildRichTextLangEntries,
    RICH_TEXT_DEFAULT_LABELS,
    RICH_TEXT_LABEL_KEYS,
    RICH_TEXT_TOOL_LABEL_KEYS,
} from '../../lib/rich-text/rich-text-i18n.js';
import { resolveRichTextToolbarItems } from '../../lib/rich-text/rich-text-toolbar.js';
import { registerCoreComponent } from '../../lib/register-core-component.js';

/**
 * WYSIWYG rich-text field with toolbar formatting and HTML sanitization helpers.
 */
export class CoreRichText extends Core_UXFormControl {

    constructor() {
        super();
        /** @type {boolean} */
        this._suppressInputEvent = false;
        /** @type {Range|null} */
        this._savedLinkRange = null;
        /** @type {Record<string, Record<string, string>>|null} */
        this._labelsRepo = null;
    }

    static get observedAttributes() {
        return [
            'label', 'hint', 'error', 'name', 'value', 'placeholder',
            'input-id', 'required', 'disabled', 'min-height', 'sanitize',
            'maxlength', 'toolbar',
        ];
    }

    get structuralAttributes() {
        return ['min-height', 'placeholder', 'toolbar'];
    }

    get minHeight() {
        const parsed = parseInt(this.getAttribute('min-height') || '8', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
    }

    get maxLength() {
        const parsed = parseInt(this.getAttribute('maxlength') || '', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    get toolbarPreset() {
        return (this.getAttribute('toolbar') || 'full').trim().toLowerCase();
    }

    get shouldSanitize() {
        return !(this.hasAttribute('sanitize') && this.getAttribute('sanitize') === 'false');
    }

    onConnect() {
        this.render();
        this._setupLangSubscription();
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
     * @returns {boolean}
     */
    isMaxLengthExceeded() {
        if (!this.maxLength) {
            return false;
        }
        return this.getText().length > this.maxLength;
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
        this._syncMaxLengthState();
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
        if (name === 'maxlength') {
            this._syncMaxLengthState();
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
        const linkPanel = this.querySelector('.core-rich-text__link-panel');
        if (editor) {
            editor.setAttribute('contenteditable', this.disabled ? 'false' : 'true');
        }
        shell?.classList.toggle('core-rich-text--disabled', this.disabled);
        toolbar?.querySelectorAll('button, input').forEach((control) => {
            control.disabled = this.disabled;
        });
        if (this.disabled) {
            this._closeLinkPanel();
        }
        if (linkPanel) {
            linkPanel.querySelectorAll('button, input').forEach((control) => {
                control.disabled = this.disabled;
            });
        }
    }

    _syncMaxLengthState() {
        const editor = this._getEditor();
        if (!editor) {
            return;
        }
        const exceeded = this.isMaxLengthExceeded();
        editor.toggleAttribute('data-maxlength-exceeded', exceeded);
        if (this.hasError) {
            editor.setAttribute('aria-invalid', 'true');
            return;
        }
        if (exceeded) {
            editor.setAttribute('aria-invalid', 'true');
        } else {
            editor.removeAttribute('aria-invalid');
        }
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
        if (this.maxLength) {
            editor.setAttribute('data-maxlength', String(this.maxLength));
        } else {
            editor.removeAttribute('data-maxlength');
        }
        if (this.hasAttribute('name')) {
            const hidden = this._getHiddenInput();
            if (hidden) {
                hidden.name = this.getAttribute('name') || '';
            }
        }
        mirrorAttributes(this, editor, ['data-core-lang', 'aria-label', 'autocomplete']);
        this._syncControlAccessibility(editor);
        this._syncMaxLengthState();
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
            this._openLinkPanel();
            return;
        }
        document.execCommand(command, false, value);
        this._onEditorInput();
    }

    _saveSelection() {
        const selection = document.getSelection();
        if (!selection || selection.rangeCount === 0) {
            this._savedLinkRange = null;
            return;
        }
        this._savedLinkRange = selection.getRangeAt(0).cloneRange();
    }

    _restoreSelection() {
        if (!this._savedLinkRange) {
            return;
        }
        const selection = document.getSelection();
        if (!selection) {
            return;
        }
        selection.removeAllRanges();
        selection.addRange(this._savedLinkRange);
    }

    _openLinkPanel() {
        const editor = this._getEditor();
        const panel = this.querySelector('.core-rich-text__link-panel');
        const urlInput = this.querySelector('[data-rich-text-link-url]');
        if (!editor || !panel || !urlInput) {
            return;
        }
        this._saveSelection();
        if (!this._savedLinkRange || this._savedLinkRange.collapsed) {
            return;
        }
        panel.hidden = false;
        urlInput.value = '';
        urlInput.classList.remove('core-control--error');
        const errorEl = this.querySelector('[data-rich-text-link-error]');
        if (errorEl) {
            errorEl.hidden = true;
        }
        urlInput.focus();
    }

    _closeLinkPanel() {
        const panel = this.querySelector('.core-rich-text__link-panel');
        const urlInput = this.querySelector('[data-rich-text-link-url]');
        if (panel) {
            panel.hidden = true;
        }
        if (urlInput) {
            urlInput.value = '';
            urlInput.classList.remove('core-control--error');
        }
        const errorEl = this.querySelector('[data-rich-text-link-error]');
        if (errorEl) {
            errorEl.hidden = true;
        }
        this._savedLinkRange = null;
    }

    _applyLink() {
        const urlInput = this.querySelector('[data-rich-text-link-url]');
        const errorEl = this.querySelector('[data-rich-text-link-error]');
        if (!urlInput) {
            return;
        }
        const safeHref = sanitizeRichTextHref(urlInput.value.trim());
        if (!safeHref) {
            urlInput.classList.add('core-control--error');
            if (errorEl) {
                errorEl.hidden = false;
            }
            urlInput.focus();
            return;
        }
        this._restoreSelection();
        document.execCommand('createLink', false, safeHref);
        this._closeLinkPanel();
        this._getEditor()?.focus();
        this._onEditorInput();
    }

    _handlePaste(event) {
        if (this.disabled || !this.shouldSanitize) {
            return;
        }
        const clipboard = event.clipboardData;
        if (!clipboard) {
            return;
        }
        event.preventDefault();
        const safeHtml = sanitizeRichTextPaste(
            clipboard.getData('text/html'),
            clipboard.getData('text/plain'),
        );
        if (!safeHtml) {
            return;
        }
        document.execCommand('insertHTML', false, safeHtml);
        this._onEditorInput();
    }

    _onEditorInput() {
        const html = this.getHtml();
        this._syncHiddenValue();
        this._syncMaxLengthState();
        this.setAttribute('value', html);
        if (this._suppressInputEvent) {
            return;
        }
        this.dispatchEvent(new CustomEvent('core-rich-text-input', {
            bubbles: true,
            detail: {
                html,
                text: this.getText(),
                maxLengthExceeded: this.isMaxLengthExceeded(),
            },
        }));
    }

    _patchLangAttr() {
        const entries = buildRichTextLangEntries();
        this.setAttribute('data-core-lang', JSON.stringify(entries));
    }

    _setupLangSubscription() {
        try {
            this.addSub(
                $svc('lang').getData().subscribe((labels) => {
                    this._labelsRepo = labels;
                    if (labels) {
                        try {
                            $svc('lang').process(this);
                        } catch (_) {
                            applyRichTextFallbackLabels(this);
                        }
                    } else {
                        applyRichTextFallbackLabels(this);
                    }
                }),
            );
        } catch (_) {
            applyRichTextFallbackLabels(this);
        }
    }

    /**
     * @param {import('../../lib/rich-text/rich-text-toolbar.js').RichTextToolbarItem} item
     * @returns {HTMLElement}
     */
    _createToolbarControl(item) {
        if (item.type === 'color') {
            const labelKey = RICH_TEXT_TOOL_LABEL_KEYS[item.id];
            const fallback = RICH_TEXT_DEFAULT_LABELS[labelKey] || item.id;
            const wrap = createElement('label', {
                className: 'core-rich-text__toolbar-btn core-rich-text__toolbar-btn--color',
                attrs: {
                    title: fallback,
                    'aria-label': fallback,
                    'data-rich-text-tool': item.id,
                },
            });
            const input = createElement('input', {
                className: 'core-rich-text__color-input',
                attrs: {
                    type: 'color',
                    value: '#111827',
                    'data-rich-text-color': '',
                    'aria-label': fallback,
                },
            });
            const iconHost = createElement('span', { className: 'core-rich-text__toolbar-icon' });
            const svg = createCoreIconSvg(item.icon || 'palette', { size: 16 });
            if (svg) {
                iconHost.appendChild(svg);
            }
            wrap.appendChild(input);
            wrap.appendChild(iconHost);
            return wrap;
        }

        const labelKey = RICH_TEXT_TOOL_LABEL_KEYS[item.id];
        const fallback = RICH_TEXT_DEFAULT_LABELS[labelKey] || item.id;
        const button = createElement('button', {
            className: 'core-rich-text__toolbar-btn',
            attrs: {
                type: 'button',
                title: fallback,
                'aria-label': fallback,
                'data-rich-text-tool': item.id,
                'data-rich-text-command': item.command || '',
            },
        });
        const iconHost = createElement('span', { className: 'core-rich-text__toolbar-icon' });
        const svg = createCoreIconSvg(item.icon || '', { size: 16 });
        if (svg) {
            iconHost.appendChild(svg);
        } else {
            iconHost.textContent = fallback.slice(0, 1);
        }
        button.appendChild(iconHost);
        return button;
    }

    /**
     * @returns {HTMLElement}
     */
    _createToolbar() {
        const toolbar = createElement('div', {
            className: 'core-rich-text__toolbar',
            attrs: {
                role: 'toolbar',
                'aria-label': RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.toolbar],
                'data-rich-text-toolbar': '',
            },
        });

        resolveRichTextToolbarItems(this.toolbarPreset).forEach((item) => {
            if (item.type === 'separator') {
                toolbar.appendChild(createElement('span', {
                    className: 'core-rich-text__toolbar-sep',
                    attrs: { role: 'separator', 'aria-orientation': 'vertical' },
                }));
                return;
            }
            toolbar.appendChild(this._createToolbarControl(item));
        });

        return toolbar;
    }

    /**
     * @returns {HTMLElement}
     */
    _createLinkPanel() {
        const panel = createElement('div', {
            className: 'core-rich-text__link-panel',
            attrs: {
                role: 'dialog',
                'aria-modal': 'false',
                hidden: '',
            },
        });

        panel.appendChild(createElement('p', {
            className: 'core-rich-text__link-title',
            text: RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.linkDialogTitle],
            attrs: { 'data-rich-text-link-title': '', id: `${this.fieldId}-link-title` },
        }));

        const row = createElement('div', { className: 'core-rich-text__link-row' });
        row.appendChild(createElement('input', {
            className: 'core-rich-text__link-input core-control',
            attrs: {
                type: 'url',
                inputmode: 'url',
                autocomplete: 'off',
                'aria-label': RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.linkUrlLabel],
                'aria-describedby': `${this.fieldId}-link-error`,
                'data-rich-text-link-url': '',
            },
        }));
        row.appendChild(createElement('button', {
            className: 'core-rich-text__link-btn core-rich-text__link-btn--apply',
            text: RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.linkApply],
            attrs: {
                type: 'button',
                'data-rich-text-link-apply': '',
            },
        }));
        row.appendChild(createElement('button', {
            className: 'core-rich-text__link-btn core-rich-text__link-btn--cancel',
            text: RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.linkCancel],
            attrs: {
                type: 'button',
                'data-rich-text-link-cancel': '',
            },
        }));
        panel.appendChild(row);

        panel.appendChild(createElement('p', {
            className: 'core-rich-text__link-error',
            text: RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.linkInvalidUrl],
            attrs: {
                'data-rich-text-link-error': '',
                id: `${this.fieldId}-link-error`,
                role: 'alert',
                hidden: '',
            },
        }));

        return panel;
    }

    render() {
        this._patchLangAttr();
        super.render();
    }

    ui_render() {
        const field = this.createFieldShell();
        this.appendLabel(field);

        const shell = createElement('div', { className: 'core-rich-text' });
        shell.appendChild(this._createToolbar());
        shell.appendChild(this._createLinkPanel());

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

        try {
            if (typeof $svc === 'function' && $svc('default')?.lang?.isActivated) {
                $svc('lang').process(this);
            } else {
                applyRichTextFallbackLabels(this);
            }
        } catch (_) {
            applyRichTextFallbackLabels(this);
        }

        this.bindUI('input', () => this._onEditorInput());
        this.bindUI('paste', (event) => this._handlePaste(event));
        this.bindUI('blur', () => {
            this._closeLinkPanel();
            this.dispatchEvent(new CustomEvent('core-rich-text-change', {
                bubbles: true,
                detail: {
                    html: this.getHtml(),
                    text: this.getText(),
                    maxLengthExceeded: this.isMaxLengthExceeded(),
                },
            }));
        });

        this.bindDelegated('click', '[data-rich-text-command]', (event, target) => {
            event.preventDefault();
            const command = target.getAttribute('data-rich-text-command');
            if (command) {
                this._execCommand(command);
            }
        });

        this.bindDelegated('click', '[data-rich-text-link-apply]', (event) => {
            event.preventDefault();
            this._applyLink();
        });

        this.bindDelegated('click', '[data-rich-text-link-cancel]', (event) => {
            event.preventDefault();
            this._closeLinkPanel();
            this._restoreSelection();
            this._getEditor()?.focus();
        });

        this.bindDelegated('keydown', '[data-rich-text-link-url]', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this._applyLink();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this._closeLinkPanel();
                this._restoreSelection();
                this._getEditor()?.focus();
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
    getRichTextPlainLength,
    normalizeRichTextHtml,
    sanitizeRichTextHtml,
    sanitizeRichTextHref,
    sanitizeRichTextPaste,
    sanitizeRichTextStyle,
} from '../../lib/html/rich-text-html.js';

export {
    RICH_TEXT_DEFAULT_LABELS,
    RICH_TEXT_LABEL_KEYS,
    RICH_TEXT_LANG_CONTAINER,
} from '../../lib/rich-text/rich-text-i18n.js';

export { RICH_TEXT_TOOLBAR_PRESETS } from '../../lib/rich-text/rich-text-toolbar.js';
