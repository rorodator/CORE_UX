/**
 * Toolbar presets and item definitions for {@link core-rich-text}.
 */

/** @typedef {{ id: string, icon?: string, command?: string, value?: string, type?: string }} RichTextToolbarItem */

/** @type {Record<string, RichTextToolbarItem>} */
export const RICH_TEXT_TOOLBAR_ITEMS = {
    bold: { id: 'bold', icon: 'bold', command: 'bold' },
    italic: { id: 'italic', icon: 'italic', command: 'italic' },
    underline: { id: 'underline', icon: 'underline', command: 'underline' },
    'bullet-list': { id: 'bullet-list', icon: 'list', command: 'insertUnorderedList' },
    'ordered-list': { id: 'ordered-list', icon: 'list-ordered', command: 'insertOrderedList' },
    link: { id: 'link', icon: 'link', command: 'createLink' },
    'text-color': { id: 'text-color', icon: 'palette', type: 'color' },
    'align-left': { id: 'align-left', icon: 'align-left', command: 'justifyLeft' },
    'align-center': { id: 'align-center', icon: 'align-center', command: 'justifyCenter' },
    'align-right': { id: 'align-right', icon: 'align-right', command: 'justifyRight' },
    'remove-format': { id: 'remove-format', icon: 'remove-format', command: 'removeFormat' },
};

/** @type {Record<string, string[]>} */
export const RICH_TEXT_TOOLBAR_PRESETS = {
    full: [
        'bold', 'italic', 'underline', '|',
        'bullet-list', 'ordered-list', '|',
        'link', 'text-color', '|',
        'align-left', 'align-center', 'align-right', '|',
        'remove-format',
    ],
    narrative: [
        'bold', 'italic', 'underline', '|',
        'bullet-list', 'ordered-list', '|',
        'link', 'text-color', '|',
        'remove-format',
    ],
    compact: [
        'bold', 'italic', 'underline', '|',
        'link', '|',
        'remove-format',
    ],
};

/**
 * @param {string|null|undefined} presetName
 * @returns {RichTextToolbarItem[]}
 */
export function resolveRichTextToolbarItems(presetName) {
    const key = (presetName || 'full').trim().toLowerCase();
    const layout = RICH_TEXT_TOOLBAR_PRESETS[key] || RICH_TEXT_TOOLBAR_PRESETS.full;
    /** @type {RichTextToolbarItem[]} */
    const items = [];
    let separatorIndex = 0;

    layout.forEach((token) => {
        if (token === '|') {
            separatorIndex += 1;
            items.push({ id: `separator-${separatorIndex}`, label: '', type: 'separator' });
            return;
        }
        const item = RICH_TEXT_TOOLBAR_ITEMS[token];
        if (item) {
            items.push({ ...item });
        }
    });

    return items;
}
