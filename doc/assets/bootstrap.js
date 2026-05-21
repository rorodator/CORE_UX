/**
 * Minimal CORE_JS stub so CORE_UX demos render without a full AppCore bootstrap.
 */
(function detectFileProtocol() {
    if (window.location.protocol !== 'file:') {
        return;
    }
    document.documentElement.classList.add('core-ux-doc-file-protocol');
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('core-ux-file-banner')) {
            return;
        }
        const banner = document.createElement('div');
        banner.id = 'core-ux-file-banner';
        banner.className = 'doc-file-banner';
        banner.innerHTML = '<strong>Live demos require a local HTTP server.</strong> '
            + 'Opening HTML from Finder (<code>file://</code>) blocks ES modules (CORS). '
            + 'Run <code>php -S localhost:8765 -t CORE_UX</code> then visit '
            + '<code>http://localhost:8765/doc/</code>.';
        document.body.prepend(banner);
        showDocLoadError('file:// protocol');
    });
})();

globalThis.$svc = function docSvc(name) {
    if (name === 'default') {
        return { lang: { isActivated: false } };
    }
    if (name === 'lang') {
        const noopSub = { unsubscribe() {} };
        return {
            getData() {
                return { subscribe() { return noopSub; } };
            },
            process() {}
        };
    }
    return {};
};

window.addEventListener('error', (event) => {
    if (!event.message || !String(event.filename || '').includes('CORE_UX')) {
        return;
    }
    showDocLoadError(event.message);
});

window.addEventListener('unhandledrejection', (event) => {
    showDocLoadError(String(event.reason));
});

function showDocLoadError(detail) {
    if (document.documentElement.classList.contains('core-ux-doc-error')) {
        return;
    }
    document.documentElement.classList.add('core-ux-doc-error');
    console.error('[CORE_UX doc] Kit load error:', detail);
    document.querySelectorAll('.demo__preview').forEach((el) => {
        if (el.querySelector('.demo-load-error')) {
            return;
        }
        const msg = document.createElement('p');
        msg.className = 'demo-load-error';
        msg.textContent = 'Components failed to load. Use a local HTTP server (not file://). '
            + 'From CORE_UX: php -S localhost:8765 -t . then open /doc/';
        el.appendChild(msg);
    });
}
