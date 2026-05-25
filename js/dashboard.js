document.addEventListener('DOMContentLoaded', function() {
    const session = localStorage.getItem('vwrt_session');
    if (!session) { window.location.href = 'index.html'; return; }

    if(typeof HeaderModule !== 'undefined') {
        HeaderModule.init();
        SettingsModule.init();
    }

    if(typeof MobileModule !== 'undefined') MobileModule.init();
    if(typeof WifiModule !== 'undefined') WifiModule.init();
    if(typeof SmsModule !== 'undefined') SmsModule.init();

    if(typeof SystemModule !== 'undefined') SystemModule.init();
    if(typeof NetworkModule !== 'undefined') NetworkModule.init();
    if(typeof ClientsModule !== 'undefined') ClientsModule.init();

    if(typeof ThemeModule !== 'undefined') {
        ThemeModule.init();
    }

    // Utility cards (Network status / MultiWAN / AdBlock / Tailscale) —
    // surfaced on dashboard instead of hidden in sidebar.
    if(typeof UtilCards !== 'undefined') {
        UtilCards.init();
    }

    // Sidebar nav: scroll-to-section + active highlight. The phase-2 design
    // shell has a left sidebar; nav-links point at #sec-* anchors which we
    // resolve to actual card IDs on the page (existing cards weren't renamed).
    // WiFi has no card on the dashboard, so it opens the topbar WiFi popup
    // instead of trying to scroll.
    (function wireSidebarNav() {
        const sectionMap = {
            'sec-overview':  null,                  // top — scroll to top
            'sec-modem':     'card-mobile',
            'sec-clients':   'clients-container',
            'sec-wifi':      { popup: 'nav-wifi' }, // open WiFi popup in topbar
            'sec-multiwan':  'util-mwan-list',
            'sec-tailscale': 'util-ts-detail',
            'sec-sms':       'dashboard-sms-list',
            'sec-adguard':   'util-agh-stats',
        };
        const page = document.querySelector('.page');
        const links = document.querySelectorAll('.sidebar .nav-link[data-section]');

        function scrollPageTo(el) {
            if (!page || !el) return;
            // Use getBoundingClientRect because .page isn't position:relative,
            // so offsetParent walks past it and produces wrong offsets.
            const top = el.getBoundingClientRect().top
                      - page.getBoundingClientRect().top
                      + page.scrollTop;
            page.scrollTo({ top: Math.max(0, top - 16), behavior: 'auto' });
        }

        function openTopbarPopup(navItemId) {
            const item = document.getElementById(navItemId);
            if (!item) return;
            // Defer so HeaderModule's document-level click handler (which closes
            // popups whose nav-item doesn't contain the click target) runs first.
            setTimeout(() => {
                document.querySelectorAll('.nav-item .popup-box').forEach(p => p.classList.add('hidden'));
                const popup = item.querySelector('.popup-box');
                if (popup) popup.classList.remove('hidden');
            }, 0);
        }

        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('data-section');
                const mapping = sectionMap[target];

                if (mapping && typeof mapping === 'object' && mapping.popup) {
                    openTopbarPopup(mapping.popup);
                } else if (!mapping || target === 'sec-overview') {
                    if (page) page.scrollTo({ top: 0, behavior: 'auto' });
                } else {
                    scrollPageTo(document.getElementById(mapping));
                }

                links.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    })();

    const btnLogout = document.getElementById('btnTopLogout');
    if(btnLogout) {
        btnLogout.addEventListener('click', function(e) {
            e.preventDefault();
            if(typeof Modal !== 'undefined') {
                Modal.confirm("Đăng xuất", "Bạn muốn thoát?", () => {
                    localStorage.removeItem('vwrt_session');
                    localStorage.removeItem('vwrt_user');
                    window.location.href = 'index.html';
                });
            }
        });
    }
    
    // === UNIFIED POLLING (MASTER LOOP) ===
    let dashboardInterval = null;
    let errorCount = 0;

    function fetchDashboardStats() {
        fetch('/cgi-bin/dashboard/stats')
            .then(r => r.json())
            .then(data => {
                errorCount = 0; // Reset error count on success
                if (typeof SystemModule !== 'undefined' && data.sys) {
                    SystemModule.render(data.sys);
                }
                if (typeof MobileModule !== 'undefined' && data.mob) {
                    MobileModule.updateFromDashboard(data.mob);
                }
            })
            .catch(e => {
                console.error("Unified Poll Error:", e);
                errorCount++;
                if (errorCount === 3) {
                    if(typeof Toast !== 'undefined') Toast.show("Mất kết nối với Router...", "error");
                }
            });
    }

    function startDashboardLoop() {
        if (!dashboardInterval) {
            fetchDashboardStats();
            dashboardInterval = setInterval(fetchDashboardStats, 3000);
        }
    }

    function stopDashboardLoop() {
        if (dashboardInterval) {
            clearInterval(dashboardInterval);
            dashboardInterval = null;
        }
    }

    // Start Loop
    startDashboardLoop();
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopDashboardLoop();
        else startDashboardLoop();
    });

    window.togglePass = function(id) {
        const input = document.getElementById(id);
        if (input) input.type = input.type === "password" ? "text" : "password";
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const elVer = document.getElementById('app-version');
    
    if (elVer) {
        fetch('/cgi-bin/system/version')
            .then(response => response.json())
            .then(data => {
                if (data && data.dashboard && data.dashboard.version) {
                    elVer.innerText = `| v${data.dashboard.version}`;
                }
            })
            .catch(() => {

            });
    }
});