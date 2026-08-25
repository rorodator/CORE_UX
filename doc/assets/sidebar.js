(function () {
    var nav = document.getElementById('doc-nav');
    if (!nav) {
        return;
    }

    var active = nav.getAttribute('data-active') || '';
    var inComponents = /\/components\//.test(window.location.pathname)
        || /\/components\\/.test(window.location.pathname);
    var root = inComponents ? '../' : '';
    var comp = inComponents ? '' : 'components/';

    var groups = [
        {
            title: 'Overview',
            links: [
                { id: 'index', href: root + 'index.html', label: 'Home' },
                { id: 'getting-started', href: root + 'getting-started.html', label: 'Getting started' },
                { id: 'theming', href: root + 'theming.html', label: 'Theming' },
                { id: 'form-controls', href: root + 'form-controls.html', label: 'Form controls' }
            ]
        },
        {
            title: 'Actions',
            links: [
                { id: 'core-icon', href: comp + 'core-icon.html', label: 'core-icon' },
                { id: 'core-button', href: comp + 'core-button.html', label: 'core-button' },
                { id: 'core-link', href: comp + 'core-link.html', label: 'core-link' },
                { id: 'core-menu', href: comp + 'core-menu.html', label: 'core-menu' }
            ]
        },
        {
            title: 'Forms',
            links: [
                { id: 'core-field', href: comp + 'core-field.html', label: 'core-field' },
                { id: 'core-textarea', href: comp + 'core-textarea.html', label: 'core-textarea' },
                { id: 'core-select', href: comp + 'core-select.html', label: 'core-select' },
                { id: 'core-checkbox', href: comp + 'core-checkbox.html', label: 'core-checkbox' },
                { id: 'core-radio-group', href: comp + 'core-radio-group.html', label: 'core-radio-group' },
                { id: 'core-autocomplete', href: comp + 'core-autocomplete.html', label: 'core-autocomplete' },
                { id: 'core-autocomplete-chips', href: comp + 'core-autocomplete-chips.html', label: 'core-autocomplete-chips' },
                { id: 'core-multi-select', href: comp + 'core-multi-select.html', label: 'core-multi-select' }
            ]
        },
        {
            title: 'Feedback',
            links: [
                { id: 'core-alert', href: comp + 'core-alert.html', label: 'core-alert' },
                { id: 'core-notif', href: comp + 'core-notif.html', label: 'core-notif' },
                { id: 'core-tooltip', href: comp + 'core-tooltip.html', label: 'core-tooltip' },
                { id: 'core-badge', href: comp + 'core-badge.html', label: 'core-badge' },
                { id: 'core-spinner', href: comp + 'core-spinner.html', label: 'core-spinner' }
            ]
        },
        {
            title: 'Layout',
            links: [
                { id: 'core-container', href: comp + 'core-container.html', label: 'core-container' },
                { id: 'core-stack', href: comp + 'core-stack.html', label: 'core-stack' },
                { id: 'core-grid', href: comp + 'core-grid.html', label: 'core-grid' },
                { id: 'core-divider', href: comp + 'core-divider.html', label: 'core-divider' },
                { id: 'core-card', href: comp + 'core-card.html', label: 'core-card' },
                { id: 'core-tabs', href: comp + 'core-tabs.html', label: 'core-tabs' }
            ]
        },
        {
            title: 'Overlay',
            links: [
                { id: 'core-modal', href: comp + 'core-modal.html', label: 'core-modal' },
                { id: 'core-side-panel', href: comp + 'core-side-panel.html', label: 'core-side-panel' }
            ]
        }
    ];

    var html = '<div class="sidebar__brand"><h1><a href="' + root + 'index.html">CORE_UX</a></h1>'
        + '<p>Doc + live demos · 25 pages · 30 tags</p></div>';

    groups.forEach(function (group) {
        html += '<div class="nav-group"><div class="nav-group__title">' + group.title + '</div>';
        group.links.forEach(function (link) {
            var cls = link.id === active ? ' class="is-active"' : '';
            html += '<a href="' + link.href + '"' + cls + '>' + link.label + '</a>';
        });
        html += '</div>';
    });

    nav.innerHTML = html;
    nav.setAttribute('aria-label', 'Table of contents');
})();
