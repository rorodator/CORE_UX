/**
 * @param {Record<string, Record<string, string>>} data
 * @param {HTMLElement} elt
 * @param {string} defaultContainer
 */
function processLangElement(data, elt, defaultContainer) {
    const raw = elt.getAttribute('data-core-lang');
    if (!raw) {
        return;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (_) {
        return;
    }
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    entries.forEach((info) => {
        if (!info?.container || !info?.name) {
            return;
        }
        const target = info.child
            ? elt.querySelector(String(info.child).trim())
            : elt;
        if (!target) {
            return;
        }
        let value = data[info.container]?.[info.name]
            ?? data[defaultContainer]?.[info.name];
        if (!value) {
            value = 'Label not found';
        }
        if (info.attribute) {
            target.setAttribute(info.attribute, value);
        } else if (info.rich === true) {
            target.innerHTML = value;
        } else {
            target.textContent = value;
        }
    });
}

/**
 * Mirrors {@link Core_LangService#process}: descendants only, root is excluded.
 *
 * @param {Record<string, Record<string, string>>} data
 * @param {HTMLElement} root
 * @param {string} [defaultContainer]
 */
function processLangTree(data, root, defaultContainer = 'global') {
    root.querySelectorAll('[data-core-lang]').forEach((elt) => {
        processLangElement(data, elt, defaultContainer);
    });
}

/**
 * Mirrors {@link CoreRichText#_processHostLangEntries}.
 *
 * @param {HTMLElement} host
 * @param {{ processOneElement: (elt: HTMLElement, info: object) => void }} lang
 */
export function processHostLangEntries(host, lang) {
    const raw = host.getAttribute('data-core-lang');
    if (!raw) {
        return;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (_) {
        return;
    }
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    entries.forEach((info) => {
        if (info?.container && info?.name) {
            lang.processOneElement(host, info);
        }
    });
}

/**
 * Mirrors {@link CoreRichText#_applyLangProcessing} lang branch (process + host entries).
 *
 * @param {HTMLElement} host
 * @param {{ process: (root?: HTMLElement|null) => void, processOneElement: (elt: HTMLElement, info: object) => void }} lang
 */
export function applyRichTextLangProcessing(host, lang) {
    lang.process(host);
    processHostLangEntries(host, lang);
}

/** @type {Record<string, Record<string, string>>|null} */
let currentLabels = null;

/** @type {{ process: (root?: HTMLElement|null) => void, processOneElement: (elt: HTMLElement, info: object) => void, getData: () => { subscribe: (fn: Function) => { unsubscribe: Function } } }|null} */
let langService = null;

/**
 * Installs minimal `$svc` wiring aligned with Core_LangService semantics.
 *
 * @param {Record<string, Record<string, string>>} labels
 */
export function installLangService(labels) {
    currentLabels = labels;
    langService = {
        process(root = document.body) {
            processLangTree(currentLabels || {}, root || document.body, 'global');
        },
        processOneElement(elt, info) {
            if (!info?.container || !info?.name) {
                return;
            }
            const target = info.child
                ? elt.querySelector(String(info.child).trim())
                : elt;
            if (!target) {
                return;
            }
            let value = currentLabels?.[info.container]?.[info.name]
                ?? currentLabels?.global?.[info.name]
                ?? 'Label not found';
            if (info.attribute) {
                target.setAttribute(info.attribute, value);
            } else if (info.rich === true) {
                target.innerHTML = value;
            } else {
                target.textContent = value;
            }
        },
        getData() {
            return {
                subscribe(callback) {
                    callback(currentLabels);
                    return { unsubscribe() {} };
                },
            };
        },
    };

    globalThis.$svc = (name) => {
        if (name === 'default') {
            return {
                lang: {
                    isActivated: true,
                    globalContainer: 'global',
                    api: '/lang',
                },
            };
        }
        if (name === 'log') {
            return { error: () => {} };
        }
        if (name === 'resource') {
            return { lock: () => false, unlock: () => {} };
        }
        if (name === 'lang') {
            return langService;
        }
        throw new Error(`Unexpected $svc("${name}") in rich-text tests`);
    };
}

export function uninstallLangService() {
    delete globalThis.$svc;
    langService = null;
    currentLabels = null;
}

/**
 * @param {Record<string, Record<string, string>>} labels
 */
export function setLangLabels(labels) {
    currentLabels = labels;
}

/**
 * @returns {{ process: (root?: HTMLElement|null) => void, processOneElement: (elt: HTMLElement, info: object) => void, getData: () => { subscribe: (fn: Function) => { unsubscribe: Function } } }|null}
 */
export function getLangService() {
    return langService;
}

/**
 * @param {HTMLElement} root
 */
export function processLang(root) {
    langService?.process(root || document.body);
}
