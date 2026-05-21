/**
 * Live theme presets for doc/theming.html — sets --core-* on .core-ux-root.
 * Uses event delegation (preset toolbar is outside core-stack; stable parent).
 */
(function () {
    var root = document.querySelector('.core-ux-root') || document.body;
    var toolbar = document.getElementById('theme-presets');
    var readout = document.getElementById('theme-readout');

    var presets = {
        default: {},
        indigo: {
            '--core-color-primary': '#6366f1',
            '--core-color-primary-hover': '#4f46e5',
            '--core-color-primary-subtle': '#eef2ff',
            '--core-color-info': '#6366f1',
            '--core-color-info-muted': '#eef2ff',
            '--core-color-info-border': 'rgba(99, 102, 241, 0.35)',
            '--core-color-primary-ring': 'rgba(99, 102, 241, 0.25)',
            '--core-color-primary-ring-strong': 'rgba(99, 102, 241, 0.35)',
            '--core-color-error': '#e11d48',
            '--core-color-error-hover': '#be123c',
            '--core-color-error-muted': '#ffe4e6',
            '--core-color-error-border': 'rgba(225, 29, 72, 0.35)',
            '--core-color-error-on-muted': '#9f1239',
            '--core-radius': '0.5rem'
        },
        forest: {
            '--core-color-primary': '#059669',
            '--core-color-primary-hover': '#047857',
            '--core-color-primary-subtle': '#ecfdf5',
            '--core-color-info': '#059669',
            '--core-color-info-muted': '#ecfdf5',
            '--core-color-info-border': 'rgba(5, 150, 105, 0.35)',
            '--core-color-primary-ring': 'rgba(5, 150, 105, 0.25)',
            '--core-color-primary-ring-strong': 'rgba(5, 150, 105, 0.35)',
            '--core-color-success': '#16a34a',
            '--core-color-success-muted': '#dcfce7',
            '--core-color-success-border': 'rgba(22, 163, 74, 0.35)',
            '--core-color-success-on-muted': '#14532d',
            '--core-color-error': '#dc2626',
            '--core-color-error-hover': '#b91c1c',
            '--core-radius': '0.75rem'
        },
        sunset: {
            '--core-color-primary': '#ea580c',
            '--core-color-primary-hover': '#c2410c',
            '--core-color-primary-subtle': '#fff7ed',
            '--core-color-info': '#ea580c',
            '--core-color-info-muted': '#ffedd5',
            '--core-color-info-border': 'rgba(234, 88, 12, 0.35)',
            '--core-color-primary-ring': 'rgba(234, 88, 12, 0.25)',
            '--core-color-primary-ring-strong': 'rgba(234, 88, 12, 0.35)',
            '--core-color-warning': '#d97706',
            '--core-color-warning-muted': '#fef3c7',
            '--core-color-warning-border': 'rgba(217, 119, 6, 0.35)',
            '--core-color-warning-on-muted': '#78350f',
            '--core-color-error': '#dc2626',
            '--core-color-error-hover': '#991b1b',
            '--core-radius': '0.25rem'
        }
    };

    var allTokenKeys = [];
    Object.keys(presets).forEach(function (name) {
        Object.keys(presets[name]).forEach(function (key) {
            if (allTokenKeys.indexOf(key) === -1) {
                allTokenKeys.push(key);
            }
        });
    });

    function syncReadout(name) {
        if (!readout) {
            return;
        }
        var primary = getComputedStyle(root).getPropertyValue('--core-color-primary').trim();
        var radius = getComputedStyle(root).getPropertyValue('--core-radius').trim();
        readout.textContent = 'Preset: ' + name + ' — --core-color-primary: ' + primary
            + ', --core-radius: ' + radius;
    }

    function applyPreset(name) {
        allTokenKeys.forEach(function (key) {
            root.style.removeProperty(key);
        });
        var tokens = presets[name] || presets.default;
        Object.keys(tokens).forEach(function (key) {
            root.style.setProperty(key, tokens[key]);
        });
        if (toolbar) {
            toolbar.querySelectorAll('[data-theme-preset]').forEach(function (btn) {
                btn.classList.toggle('is-active', btn.getAttribute('data-theme-preset') === name);
            });
        }
        syncReadout(name);
    }

    if (toolbar) {
        toolbar.addEventListener('click', function (event) {
            var btn = event.target.closest('[data-theme-preset]');
            if (!btn || !toolbar.contains(btn)) {
                return;
            }
            applyPreset(btn.getAttribute('data-theme-preset'));
        });
    }

    var darkToggle = document.getElementById('theme-dark-toggle');
    if (darkToggle) {
        darkToggle.addEventListener('change', function () {
            if (darkToggle.checked) {
                root.setAttribute('data-core-theme', 'dark');
            } else {
                root.removeAttribute('data-core-theme');
            }
            syncReadout(darkToggle.checked ? 'dark overlay' : 'current');
        });
    }

    applyPreset('default');
})();
