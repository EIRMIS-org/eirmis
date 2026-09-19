/* =============================================================================
   EIRMIS — Shared Mockup Runtime (Production Visual Edition)
   Manages session state, global toast notifications, cross-portal navigation,
   and shared mock data across all 5 EIRMIS portals.
   ============================================================================= */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'eirmis.mockup.v2';

    /* ---------------------------------------------------------------------------
     * Default seed data — realistic sample records shared across portals
     * ------------------------------------------------------------------------- */
    var DEFAULT_STATE = {
        session: {
            role: 'Organizer',
            name: 'Sarah Jenkins',
            email: 'sarah.jenkins@example.com',
            initials: 'SJ'
        },
        events: [
            {
                id: 'evt-tech-forward',
                title: 'Tech Forward Annual Gala 2026',
                slug: 'tech-forward-2026',
                venue: 'Marina Bay Sands Grand Ballroom, Singapore',
                date: 'Nov 18, 2026',
                time: '6:30 PM SGT',
                capacity: 150,
                rsvp: 112,
                status: 'published',
                visibility: 'open_registration'
            },
            {
                id: 'evt-health-summit',
                title: 'Apex Healthcare Summit',
                slug: 'apex-healthcare-summit',
                venue: 'Raffles City Convention Centre, Singapore',
                date: 'Dec 02, 2026',
                time: '9:00 AM SGT',
                capacity: 300,
                rsvp: 214,
                status: 'published',
                visibility: 'invite_only'
            },
            {
                id: 'evt-leadership',
                title: 'Global Leadership Forum',
                slug: 'global-leadership-forum',
                venue: 'Suntec Singapore Convention Centre',
                date: 'Jan 15, 2027',
                time: '8:30 AM SGT',
                capacity: 500,
                rsvp: 0,
                status: 'draft',
                visibility: 'invite_only'
            }
        ],
        organizers: [
            { id: 'org-1', name: 'Arthur Vance', email: 'arthur.vance@techventures.co', org: 'Tech Ventures Guild', status: 'pending', registeredAt: 'Sep 08, 2026 09:12 AM' },
            { id: 'org-2', name: 'Marissa Liu', email: 'marissa.liu.events@example.com', org: 'Apex Healthcare Summit', status: 'pending', registeredAt: 'Sep 08, 2026 11:45 AM' },
            { id: 'org-3', name: 'Sarah Jenkins', email: 'sarah.jenkins@example.com', org: 'University Faculty Association', status: 'active', registeredAt: 'Aug 14, 2026 02:20 PM' },
            { id: 'org-4', name: 'Gabriel Silva', email: 'gabriel.silva@global-summit.org', org: 'Global Leadership Summit', status: 'active', registeredAt: 'Aug 20, 2026 10:05 AM' }
        ],
        guests: [
            { id: 'g-1', name: 'Elena Rostova', email: 'elena.rostova@example.com', eventId: 'evt-tech-forward', status: 'accepted', party: 2, maxParty: 3 },
            { id: 'g-2', name: 'Dr. Aris Thorne', email: 'aris.thorne@biotech-innovate.org', eventId: 'evt-tech-forward', status: 'accepted', party: 2, maxParty: 2 },
            { id: 'g-3', name: 'Carlos Gutierrez', email: 'carlos.g@venturecap.co', eventId: 'evt-tech-forward', status: 'tentative', party: 0, maxParty: 2 },
            { id: 'g-4', name: 'Mei-Ling Zhou', email: 'ml.zhou@cloudfoundry.net', eventId: 'evt-tech-forward', status: 'pending', party: 0, maxParty: 4 }
        ],
        checkedIn: 48
    };

    /* ---------------------------------------------------------------------------
     * Store — load from localStorage or seed
     * ------------------------------------------------------------------------- */
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                return Object.assign({}, DEFAULT_STATE, parsed);
            }
        } catch (e) { /* ignore corrupt storage */ }
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    var state = loadState();

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* storage may be unavailable */ }
    }

    function reset() {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        save();
    }

    /* ---------------------------------------------------------------------------
     * Production Toast Notification with Progress Bar
     * ------------------------------------------------------------------------- */
    var toastEl = null;
    var toastTimer = null;

    var ICONS = {
        success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
        info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    function ensureToast() {
        if (toastEl) return toastEl;
        toastEl = document.createElement('div');
        toastEl.className = 'eirmis-toast';
        toastEl.innerHTML =
            '<span class="eirmis-toast-icon"></span>' +
            '<span class="eirmis-toast-msg"></span>' +
            '<button class="eirmis-toast-close" onclick="EIRMIS.hideToast()" aria-label="Close">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
            '</button>' +
            '<div class="eirmis-toast-progress"></div>';
        document.body.appendChild(toastEl);
        return toastEl;
    }

    function toast(message, type) {
        var el = ensureToast();
        type = type || 'success';
        el.className = 'eirmis-toast ' + type;
        el.querySelector('.eirmis-toast-icon').innerHTML = ICONS[type] || ICONS.success;
        el.querySelector('.eirmis-toast-msg').textContent = message;

        // Restart animation
        void el.offsetWidth;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.classList.remove('show');
        }, 3200);
    }

    function hideToast() {
        if (toastEl) toastEl.classList.remove('show');
        clearTimeout(toastTimer);
    }

    /* ---------------------------------------------------------------------------
     * Session Management & Quick Switcher
     * ------------------------------------------------------------------------- */
    var PRESET_USERS = {
        organizer: { role: 'Organizer', name: 'Sarah Jenkins', email: 'sarah.jenkins@example.com', initials: 'SJ' },
        admin: { role: 'Administrator', name: 'Root Admin', email: 'admin@eirmis.internal', initials: 'RA' },
        guest: { role: 'Guest', name: 'Elena Rostova', email: 'elena.rostova@example.com', initials: 'ER' },
        staff: { role: 'Check-in Staff', name: 'Marcus Staff', email: 'marcus.staff@events.org', initials: 'MS' }
    };

    function signIn(role, name, email) {
        var initials = (name || '?').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
        state.session = { role: role, name: name, email: email, initials: initials };
        save();
        renderSession();
    }

    function switchPresetUser(userKey) {
        var u = PRESET_USERS[userKey];
        if (u) {
            signIn(u.role, u.name, u.email);
            toast('Switched identity to ' + u.name + ' (' + u.role + ')', 'info');
        }
    }

    function signOut() {
        state.session = null;
        save();
        renderSession();
        toast('Signed out of session', 'info');
    }

    function currentSession() {
        return state.session;
    }

    /* ---------------------------------------------------------------------------
     * Global Navigation Bar
     * ------------------------------------------------------------------------- */
    var PORTALS = [
        { key: 'landing', label: 'Public Hub', href: 'landing/landing.html' },
        { key: 'organizer', label: 'Organizer Portal', href: 'organizer-portal/organizer-portal.html' },
        { key: 'admin', label: 'Admin Portal', href: 'admin-portal/admin-portal.html' },
        { key: 'guest', label: 'Guest Portal', href: 'guest-portal/guest-portal.html' },
        { key: 'staff', label: 'Staff Scanner', href: 'checkin-staff-portal/checkin-staff-portal.html' }
    ];

    function basePath() {
        var path = window.location.pathname;
        var parts = path.split('/').filter(Boolean);
        var last = parts[parts.length - 1] || '';
        if (last.indexOf('.html') !== -1) {
            return '../';
        }
        return '';
    }

    function renderNav(activePortal) {
        var existing = document.getElementById('eirmis-global-nav');
        if (existing) existing.remove();

        var nav = document.createElement('nav');
        nav.id = 'eirmis-global-nav';
        nav.className = 'eirmis-global-nav';

        var base = basePath();
        var linksHtml = PORTALS.map(function (p) {
            var active = p.key === activePortal ? ' active' : '';
            return '<a class="eirmis-nav-link' + active + '" href="' + base + p.href + '">' + p.label + '</a>';
        }).join('');

        nav.innerHTML =
            '<div class="eirmis-global-nav-inner">' +
            '<a class="eirmis-nav-brand" href="' + base + 'landing/landing.html">' +
            '<span class="eirmis-nav-logo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>' +
            '<span class="eirmis-nav-brand-name">EIRMIS</span>' +
            '<span class="eirmis-nav-pill-badge">PRODUCTION PREVIEW</span>' +
            '</a>' +
            '<div class="eirmis-nav-links">' + linksHtml + '</div>' +
            '<div class="eirmis-nav-session" id="eirmis-nav-session"></div>' +
            '</div>';

        document.body.insertBefore(nav, document.body.firstChild);
        renderSession();
    }

    function renderSession() {
        var container = document.getElementById('eirmis-nav-session');
        if (!container) return;
        var s = state.session;
        if (!s) {
            container.innerHTML =
                '<a class="eirmis-btn eirmis-btn-primary" style="padding:6px 14px;font-size:12px;" href="' + basePath() + 'landing/landing.html#login">Sign in</a>';
            return;
        }

        container.innerHTML =
            '<div class="eirmis-session-pill" title="Signed in as ' + s.email + '">' +
            '<span class="eirmis-session-avatar">' + s.initials + '</span>' +
            '<span style="max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + s.name + '</span>' +
            '<span class="eirmis-session-role">' + s.role + '</span>' +
            '</div>' +
            '<button class="eirmis-nav-signout" onclick="EIRMIS.signOut()">Sign out</button>';
    }

    /* ---------------------------------------------------------------------------
     * Boot Loading Shimmer Overlay
     * ------------------------------------------------------------------------- */
    function showBootOverlay() {
        var overlay = document.createElement('div');
        overlay.id = 'eirmis-boot-overlay';
        overlay.style.cssText =
            'position:fixed;inset:0;z-index:5000;background:#F8FAFC;display:flex;' +
            'flex-direction:column;align-items:center;justify-content:center;gap:16px;' +
            'transition:opacity 0.25s ease;';
        overlay.innerHTML =
            '<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#4F46E5,#312E81);' +
            'display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 6px 20px rgba(79,70,229,0.35);">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
            '<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line>' +
            '<line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>' +
            '<div style="font-family:Inter,system-ui,sans-serif;font-size:13.5px;color:#0F172A;font-weight:700;">' +
            'EIRMIS Architecture</div>' +
            '<div style="width:140px;height:4px;background:#E2E8F0;border-radius:999px;overflow:hidden;">' +
            '<div style="height:100%;width:45%;background:#4F46E5;border-radius:999px;animation:eirmisBootBar 0.85s ease-in-out infinite;"></div></div>';
        document.body.appendChild(overlay);

        var style = document.createElement('style');
        style.textContent = '@keyframes eirmisBootBar{0%{transform:translateX(-100%)}100%{transform:translateX(320%)}}';
        document.head.appendChild(style);

        setTimeout(function () {
            overlay.style.opacity = '0';
            setTimeout(function () { overlay.remove(); }, 250);
        }, 350);
    }

    /* ---------------------------------------------------------------------------
     * Public API
     * ------------------------------------------------------------------------- */
    global.EIRMIS = {
        init: function (opts) {
            opts = opts || {};
            renderNav(opts.portal || 'landing');
            showBootOverlay();
        },
        toast: toast,
        hideToast: hideToast,
        signIn: signIn,
        switchPresetUser: switchPresetUser,
        signOut: signOut,
        session: currentSession,
        getState: function () { return state; },
        save: save,
        reset: reset,
        basePath: basePath
    };
})(window);