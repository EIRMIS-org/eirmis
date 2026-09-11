/* =============================================================================
   EIRMIS — Shared Mockup Runtime
   Provides a lightweight "backend" simulation so the mockups feel like a real
   product: a persistent session, a localStorage-backed data store, a global
   toast system, a cross-portal navigation bar, and a boot loading overlay.

   Load this AFTER the page's own markup (before </body>), and call
   EIRMIS.init({ portal: 'landing' }) to mount the global chrome.
   ============================================================================= */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'eirmis.mockup.v1';

    /* ---------------------------------------------------------------------------
     * Default seed data — realistic sample records shared across portals.
     * ------------------------------------------------------------------------- */
    var DEFAULT_STATE = {
        session: null, // { role, name, email, initials }
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
     * Store — load from localStorage or seed, with a save() helper.
     * ------------------------------------------------------------------------- */
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                // shallow-merge over defaults so new fields don't break old saves
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
     * Toast
     * ------------------------------------------------------------------------- */
    var toastEl = null;
    var toastTimer = null;

    function ensureToast() {
        if (toastEl) return toastEl;
        toastEl = document.createElement('div');
        toastEl.className = 'eirmis-toast';
        toastEl.innerHTML =
            '<span class="eirmis-toast-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>' +
            '<span class="eirmis-toast-msg"></span>';
        document.body.appendChild(toastEl);
        return toastEl;
    }

    function toast(message, type) {
        var el = ensureToast();
        type = type || 'success';
        el.className = 'eirmis-toast ' + type;
        el.querySelector('.eirmis-toast-msg').textContent = message;
        // force reflow to restart animation
        void el.offsetWidth;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
    }

    /* ---------------------------------------------------------------------------
     * Session
     * ------------------------------------------------------------------------- */
    function signIn(role, name, email) {
        var initials = (name || '?').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
        state.session = { role: role, name: name, email: email, initials: initials };
        save();
        renderSession();
    }

    function signOut() {
        state.session = null;
        save();
        renderSession();
        toast('Signed out', 'info');
    }

    function currentSession() {
        return state.session;
    }

    /* ---------------------------------------------------------------------------
     * Global navigation bar
     * ------------------------------------------------------------------------- */
    var PORTALS = [
        { key: 'landing', label: 'Home', href: 'LandingPage/index.html' },
        { key: 'organizer', label: 'Organizer', href: 'Organizer Portal/index.html' },
        { key: 'admin', label: 'Admin', href: 'Admin Portal/index.html' },
        { key: 'guest', label: 'Guest', href: 'Guest Portal/index.html' },
        { key: 'staff', label: 'Check-in', href: 'Check-in Staff Portal/index.html' }
    ];

    function basePath() {
        // Determine whether we're at MockupPlan root or inside a portal folder.
        var path = window.location.pathname;
        var parts = path.split('/').filter(Boolean);
        // If the last segment is a folder (no .html), we're at root; otherwise inside a folder.
        var last = parts[parts.length - 1] || '';
        if (last.indexOf('.html') !== -1) {
            // inside a portal folder -> assets are one level up
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
            '<a class="eirmis-nav-brand" href="' + base + 'LandingPage/index.html">' +
            '<span class="eirmis-nav-logo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>' +
            '<span class="eirmis-nav-brand-name">EIRMIS</span>' +
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
            container.innerHTML = '<a class="eirmis-btn eirmis-btn-primary" style="padding:6px 14px;font-size:12px;" href="' + basePath() + 'LandingPage/index.html">Sign in</a>';
            return;
        }
        container.innerHTML =
            '<div class="eirmis-session-pill">' +
            '<span class="eirmis-session-avatar">' + s.initials + '</span>' +
            '<span>' + s.name + '</span>' +
            '<span class="eirmis-session-role">' + s.role + '</span>' +
            '</div>' +
            '<button class="eirmis-nav-signout" onclick="EIRMIS.signOut()">Sign out</button>';
    }

    /* ---------------------------------------------------------------------------
     * Boot loading overlay — simulates an initial data fetch so the app feels
     * like it's talking to a real backend on first paint.
     * ------------------------------------------------------------------------- */
    function showBootOverlay() {
        var overlay = document.createElement('div');
        overlay.id = 'eirmis-boot-overlay';
        overlay.style.cssText =
            'position:fixed;inset:0;z-index:5000;background:#F8FAFC;display:flex;' +
            'flex-direction:column;align-items:center;justify-content:center;gap:16px;' +
            'transition:opacity 0.35s ease;';
        overlay.innerHTML =
            '<div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#4F46E5,#3730A3);' +
            'display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 14px rgba(79,70,229,0.35);">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
            '<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line>' +
            '<line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>' +
            '<div style="font-family:Inter,system-ui,sans-serif;font-size:13px;color:#64748B;font-weight:600;">' +
            'Loading EIRMIS…</div>' +
            '<div style="width:120px;height:4px;background:#E2E8F0;border-radius:999px;overflow:hidden;">' +
            '<div style="height:100%;width:40%;background:#4F46E5;border-radius:999px;animation:eirmis-bootbar 0.9s ease-in-out infinite;"></div></div>';
        document.body.appendChild(overlay);

        var style = document.createElement('style');
        style.textContent = '@keyframes eirmis-bootbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}';
        document.head.appendChild(style);

        setTimeout(function () {
            overlay.style.opacity = '0';
            setTimeout(function () { overlay.remove(); }, 380);
        }, 550);
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
        signIn: signIn,
        signOut: signOut,
        session: currentSession,
        getState: function () { return state; },
        save: save,
        reset: reset,
        basePath: basePath
    };
})(window);