/**
 * i18n keys and fallbacks for {@link core-rich-text}.
 * Apps merge {@link RICH_TEXT_LANG_CONTAINER} from `lang/labels-*.json` into their label API.
 */

/** @type {string} */
export const RICH_TEXT_LANG_CONTAINER = 'core_ux';

/** @type {Record<string, string>} */
export const RICH_TEXT_LABEL_KEYS = {
    toolbar: 'rich_text_toolbar',
    bold: 'rich_text_bold',
    italic: 'rich_text_italic',
    underline: 'rich_text_underline',
    bulletList: 'rich_text_bullet_list',
    orderedList: 'rich_text_ordered_list',
    link: 'rich_text_link',
    textColor: 'rich_text_text_color',
    alignLeft: 'rich_text_align_left',
    alignCenter: 'rich_text_align_center',
    alignRight: 'rich_text_align_right',
    removeFormat: 'rich_text_remove_format',
    linkDialogTitle: 'rich_text_link_dialog_title',
    linkUrlLabel: 'rich_text_link_url_label',
    linkApply: 'rich_text_link_apply',
    linkCancel: 'rich_text_link_cancel',
    linkInvalidUrl: 'rich_text_link_invalid_url',
};

/** English fallbacks when `$svc('lang')` is unavailable (doc demos, tests). */
/** @type {Record<string, string>} */
export const RICH_TEXT_DEFAULT_LABELS = {
    [RICH_TEXT_LABEL_KEYS.toolbar]: 'Text formatting',
    [RICH_TEXT_LABEL_KEYS.bold]: 'Bold',
    [RICH_TEXT_LABEL_KEYS.italic]: 'Italic',
    [RICH_TEXT_LABEL_KEYS.underline]: 'Underline',
    [RICH_TEXT_LABEL_KEYS.bulletList]: 'Bullet list',
    [RICH_TEXT_LABEL_KEYS.orderedList]: 'Numbered list',
    [RICH_TEXT_LABEL_KEYS.link]: 'Insert link',
    [RICH_TEXT_LABEL_KEYS.textColor]: 'Text color',
    [RICH_TEXT_LABEL_KEYS.alignLeft]: 'Align left',
    [RICH_TEXT_LABEL_KEYS.alignCenter]: 'Align center',
    [RICH_TEXT_LABEL_KEYS.alignRight]: 'Align right',
    [RICH_TEXT_LABEL_KEYS.removeFormat]: 'Clear formatting',
    [RICH_TEXT_LABEL_KEYS.linkDialogTitle]: 'Insert link',
    [RICH_TEXT_LABEL_KEYS.linkUrlLabel]: 'Link URL',
    [RICH_TEXT_LABEL_KEYS.linkApply]: 'Apply',
    [RICH_TEXT_LABEL_KEYS.linkCancel]: 'Cancel',
    [RICH_TEXT_LABEL_KEYS.linkInvalidUrl]: 'Enter a valid URL (https://, mailto:, or relative path).',
};

/** Maps toolbar tool ids to label keys. */
/** @type {Record<string, string>} */
export const RICH_TEXT_TOOL_LABEL_KEYS = {
    bold: RICH_TEXT_LABEL_KEYS.bold,
    italic: RICH_TEXT_LABEL_KEYS.italic,
    underline: RICH_TEXT_LABEL_KEYS.underline,
    'bullet-list': RICH_TEXT_LABEL_KEYS.bulletList,
    'ordered-list': RICH_TEXT_LABEL_KEYS.orderedList,
    link: RICH_TEXT_LABEL_KEYS.link,
    'text-color': RICH_TEXT_LABEL_KEYS.textColor,
    'align-left': RICH_TEXT_LABEL_KEYS.alignLeft,
    'align-center': RICH_TEXT_LABEL_KEYS.alignCenter,
    'align-right': RICH_TEXT_LABEL_KEYS.alignRight,
    'remove-format': RICH_TEXT_LABEL_KEYS.removeFormat,
};

/**
 * @param {string} key
 * @param {Record<string, Record<string, string>>|null|undefined} repo
 * @returns {string}
 */
export function resolveRichTextLabel(key, repo) {
    if (repo?.[RICH_TEXT_LANG_CONTAINER]?.[key]) {
        return repo[RICH_TEXT_LANG_CONTAINER][key];
    }
    return RICH_TEXT_DEFAULT_LABELS[key] || key;
}

/**
 * Builds {@link data-core-lang} entries for toolbar and link-dialog hooks.
 *
 * @returns {object[]}
 */
export function buildRichTextLangEntries() {
    /** @type {object[]} */
    const entries = [
        {
            container: RICH_TEXT_LANG_CONTAINER,
            name: RICH_TEXT_LABEL_KEYS.toolbar,
            attribute: 'aria-label',
            child: '[data-rich-text-toolbar]',
        },
        {
            container: RICH_TEXT_LANG_CONTAINER,
            name: RICH_TEXT_LABEL_KEYS.linkDialogTitle,
            child: '[data-rich-text-link-title]',
        },
        {
            container: RICH_TEXT_LANG_CONTAINER,
            name: RICH_TEXT_LABEL_KEYS.linkUrlLabel,
            attribute: 'aria-label',
            child: '[data-rich-text-link-url]',
        },
        {
            container: RICH_TEXT_LANG_CONTAINER,
            name: RICH_TEXT_LABEL_KEYS.linkApply,
            child: '[data-rich-text-link-apply]',
        },
        {
            container: RICH_TEXT_LANG_CONTAINER,
            name: RICH_TEXT_LABEL_KEYS.linkCancel,
            child: '[data-rich-text-link-cancel]',
        },
        {
            container: RICH_TEXT_LANG_CONTAINER,
            name: RICH_TEXT_LABEL_KEYS.linkInvalidUrl,
            child: '[data-rich-text-link-error]',
        },
    ];

    Object.entries(RICH_TEXT_TOOL_LABEL_KEYS).forEach(([toolId, labelKey]) => {
        entries.push({
            container: RICH_TEXT_LANG_CONTAINER,
            name: labelKey,
            attribute: 'aria-label',
            child: `[data-rich-text-tool="${toolId}"]`,
        });
        entries.push({
            container: RICH_TEXT_LANG_CONTAINER,
            name: labelKey,
            attribute: 'title',
            child: `[data-rich-text-tool="${toolId}"]`,
        });
    });

    return entries;
}

/**
 * Applies fallback labels when lang service is not active.
 *
 * @param {HTMLElement} host
 */
export function applyRichTextFallbackLabels(host) {
    const toolbar = host.querySelector('[data-rich-text-toolbar]');
    if (toolbar) {
        toolbar.setAttribute('aria-label', RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.toolbar]);
    }

    Object.entries(RICH_TEXT_TOOL_LABEL_KEYS).forEach(([toolId, labelKey]) => {
        const control = host.querySelector(`[data-rich-text-tool="${toolId}"]`);
        if (!control) {
            return;
        }
        const label = RICH_TEXT_DEFAULT_LABELS[labelKey];
        control.setAttribute('aria-label', label);
        control.setAttribute('title', label);
    });

    const linkTitle = host.querySelector('[data-rich-text-link-title]');
    if (linkTitle) {
        linkTitle.textContent = RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.linkDialogTitle];
    }
    const linkUrl = host.querySelector('[data-rich-text-link-url]');
    if (linkUrl) {
        linkUrl.setAttribute('aria-label', RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.linkUrlLabel]);
    }
    const linkApply = host.querySelector('[data-rich-text-link-apply]');
    if (linkApply) {
        linkApply.textContent = RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.linkApply];
    }
    const linkCancel = host.querySelector('[data-rich-text-link-cancel]');
    if (linkCancel) {
        linkCancel.textContent = RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.linkCancel];
    }
    const linkError = host.querySelector('[data-rich-text-link-error]');
    if (linkError) {
        linkError.textContent = RICH_TEXT_DEFAULT_LABELS[RICH_TEXT_LABEL_KEYS.linkInvalidUrl];
    }
}
