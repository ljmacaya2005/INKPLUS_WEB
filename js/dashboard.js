document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Menu Toggle & Overlay ---
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileNavToggle = document.getElementById('mobileNavToggle');

    // Dynamically inject overlay if missing
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay && sidebar) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        if (sidebar.parentNode) {
            // Inject just before the sidebar inside the wrapper to guarantee shared stacking context
            sidebar.parentNode.insertBefore(overlay, sidebar);
        } else {
            // Fallback for safety
            document.body.appendChild(overlay);
        }
    }

    const toggleSidebar = () => {
        if (sidebar) {
            const isShowing = sidebar.classList.toggle('show');
            if (overlay) overlay.classList.toggle('active', isShowing);
        }
    };

    if (mobileToggle) mobileToggle.addEventListener('click', toggleSidebar);
    if (mobileNavToggle) mobileNavToggle.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    // Close menus on outside click (redundancy)
    document.addEventListener('click', (e) => {
        const isOutsideSidebar = sidebar && !sidebar.contains(e.target);
        const isNotMobileToggle = mobileToggle?.contains(e.target) || mobileNavToggle?.contains(e.target);

        if (sidebar && sidebar.classList.contains('show') && isOutsideSidebar && !isNotMobileToggle) {
            sidebar.classList.remove('show');
            if (overlay) overlay.classList.remove('active');
        }
    });

    // --- Glass Dock Logic ---
    const refreshBtn = document.getElementById('fabRefresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            location.reload();
        });
    }

    const fullScreenBtn = document.getElementById('dockFull');
    if (fullScreenBtn) {
        fullScreenBtn.addEventListener('click', () => {
            if (typeof window.toggleFullScreen === 'function') {
                window.toggleFullScreen();
            }
        });
    }

    // Update Fullscreen Icon on change
    document.addEventListener('fullscreenchange', () => {
        if (fullScreenBtn) {
            if (document.fullscreenElement) {
                fullScreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
                fullScreenBtn.title = "Exit Fullscreen";
            } else {
                fullScreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
                fullScreenBtn.title = "Fullscreen";
            }
        }
    });

    // --- RBAC: Role-Based Access Control (Strict & Robust) ---
    const initRBAC = async () => {
        const waitForSupabase = () => new Promise(resolve => {
            if (window.sb) return resolve(window.sb);
            let attempts = 0;
            const i = setInterval(() => {
                attempts++;
                if (window.sb) {
                    clearInterval(i);
                    resolve(window.sb);
                } else if (attempts > 50) { // 5 seconds timeout
                    clearInterval(i);
                    resolve(null);
                }
            }, 100);
        });

        const sb = await waitForSupabase();
        if (!sb) return;

        // --- IP ALLOWLIST SECURITY CHECK ---
        // --- IP ALLOWLIST SECURITY CHECK (TERMINAL PERSISTENCE) ---
        const checkIPAllowlist = async () => {
            const deviceId = window.getPersistentDeviceId();
            if (!deviceId) return false;

            try {
                // 1. Get the current network footprint
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                const currentIp = ipData.ip;

                // 2. Fetch the registration status based on ONLY the Device ID for persistence
                const { data, error } = await sb
                    .from('ip_allowlist')
                    .select('*')
                    .eq('device_id', deviceId)
                    .maybeSingle();

                if (error || !data || !data.is_active) {
                    console.warn("[Security] Terminal not registered or access revoked for device:", deviceId);
                    return false;
                }

                // 3. SEAMLESS SYNC: If the IP has shifted (dynamic network), update the registry and user record
                if (data.ip_address !== currentIp) {
                    console.info("[Security] Terminal network shift detected. Synchronizing active footprint...");

                    // Update the IP in the Allowlist Table
                    await sb.from('ip_allowlist')
                        .update({
                            ip_address: currentIp
                        })
                        .eq('id', data.id);

                    // Also update the User's presence record if possible
                    const currentUid = localStorage.getItem('user_id');
                    if (currentUid && currentUid !== 'SYSTEM_SETUP_ID') {
                        await sb.from('users')
                            .update({
                                current_ip: currentIp,
                                updated_at: new Date().toISOString()
                            })
                            .eq('user_id', currentUid);
                    }
                }

                return true;
            } catch (err) {
                // Resilience: In case of API failures or network jitters, we allow the device if it's strictly a network issue
                return true;
            }
        };

        const isAuthorized = await checkIPAllowlist();
        if (!isAuthorized && localStorage.getItem('user_id') !== 'SYSTEM_SETUP_ID') {
            window.location.replace('index.html');
            return;
        }

        // 1. Get User ID
        let userId = localStorage.getItem('user_id');
        if (!userId) {
            const { data: sessionData } = await sb.auth.getSession();
            if (sessionData?.session?.user) {
                userId = sessionData.session.user.id;
                localStorage.setItem('user_id', userId);
            }
        }
        if (!userId) return;

        // --- EMPTY DATABASE SYSTEM SETUP BYPASS ---
        if (userId === 'SYSTEM_SETUP_ID') {
            console.warn("[RBAC] SYSTEM INITIALIZATION BYPASS ACTIVE");

            // Show all sidebar links explicitly and forcibly whitelist UI access
            const sidebarLinks = document.querySelectorAll('.sidebar-nav .nav-link');
            sidebarLinks.forEach(link => {
                const li = link.closest('li');
                if (li) {
                    li.style.removeProperty('display');
                    li.classList.add('reveal');
                    li.removeAttribute('aria-hidden');
                }
            });

            // Fake an Admin Header Profile
            const profileSpan = document.querySelector('.user-profile span');
            if (profileSpan) {
                profileSpan.classList.remove('d-none', 'd-sm-inline');
                profileSpan.innerHTML = `
                    <span class="d-none d-sm-inline">System Setup</span>
                    <span class="d-inline d-sm-none">Setup</span>
                `;
            }

            // Immediately exit the RBAC checks since this session has no real database rows yet
            return;
        }

        // 2. Fetch User & Roles (Robust Join)
        const { data: userData, error } = await sb
            .from('users')
            .select(`
                user_id,
                roles (*),
                profiles (first_name, last_name, profile_url)
            `)
            .eq('user_id', userId)
            .single();

        if (error || !userData || !userData.roles) {
            console.error('[RBAC] Failed to fetch permissions or no role assigned. Activating Failsafe Reveal.', error);
            // FAILSAFE: If we can't get roles, reveal all items to avoid a blank sidebar
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
                item.style.removeProperty('display');
                item.classList.add('reveal');
                item.removeAttribute('aria-hidden');
            });
            return;
        }

        // Handle Potential Array vs Object response from Supabase Join
        const perms = Array.isArray(userData.roles) ? userData.roles[0] : userData.roles;
        const profile = Array.isArray(userData.profiles) ? userData.profiles[0] : (userData.profiles || {});
        // console.log('[RBAC] Config:', perms);

        // --- GLOBAL PROFILE INJECTION ---
        // Instantly injects the true user data into the top right navigation corner of all dashboards
        const profileSpan = document.querySelector('.user-profile span');
        const profileImg = document.querySelector('.user-profile img');

        if (profileSpan || profileImg) {
            const firstName = profile.first_name || '';
            const lastName = profile.last_name || '';
            let fullName = `${firstName} ${lastName}`.trim();

            if (!fullName) fullName = (perms.role_name === 'Administrator' || perms.role_name === 'Admin') ? 'Administrator' : 'System User';

            if (profileSpan) {
                // Strip the exact CSS classes that were hiding it on mobile devices
                profileSpan.classList.remove('d-none', 'd-sm-inline');

                // Dynamically inject Full Name for desktop, but only First Name for mobile spacing
                profileSpan.innerHTML = `
                    <span class="d-none d-sm-inline">${fullName}</span>
                    <span class="d-inline d-sm-none">${firstName || fullName}</span>
                `;
            }

            if (profileImg) {
                const avatarUrl = profile.profile_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4A90A4&color=fff`;
                profileImg.src = avatarUrl;
            }

            // Also update the dashboard greeting explicitly on the Home view if it exists
            const welcomeBanner = document.querySelector('.dashboard-header p.small');
            if (welcomeBanner && welcomeBanner.textContent.includes('Welcome back')) {
                welcomeBanner.textContent = `Welcome back, ${firstName || fullName}`;
            }
        }

        // Safety Override: Administrator sees ALL
        let isAdmin = false;
        if (perms.role_name === 'Administrator' || perms.role_name === 'Admin') {
            isAdmin = true;
        }

        // Define Permission -> File Mapping
        const mapping = {
            'can_home': 'home.html',
            'can_scheduling': 'scheduling.html',
            'can_jobs': 'jobs.html',
            'can_history': 'history.html',
            'can_sessions': 'sessions.html',
            'can_users': 'users.html',
            'can_actions': 'actions.html',
            'can_services': 'services.html',
            'can_settings': 'settings.html'
        };

        // 3. Process Permissions (Hide Sidebar Items)
        let firstAllowedPage = null;

        Object.keys(mapping).forEach(key => {
            const href = mapping[key];

            // STRICT CHECK: Must be explicitly TRUE. 
            // If Admin, always true.
            // FIX: Use truthy check (!!perms[key]) instead of strictly true to handle potential type diffs
            const isAllowed = isAdmin ? true : !!perms[key];

            // Capture the first valid page for fallback redirection
            if (isAllowed && !firstAllowedPage) {
                firstAllowedPage = href;
            }

            // Show or Hide based on permission
            // Use querySelectorAll to catch any duplicate links (e.g. mobile drawers if any)
            const links = document.querySelectorAll(`.sidebar-nav .nav-link[href="${href}"]`);
            links.forEach(link => {
                const listItem = link.closest('li');
                if (listItem) {
                    if (isAllowed) {
                        listItem.style.removeProperty('display'); // Let class handle it
                        listItem.classList.add('reveal');
                        listItem.removeAttribute('aria-hidden');
                    } else {
                        // Ensure hidden for non-allowed
                        listItem.classList.remove('reveal');
                        listItem.style.setProperty('display', 'none', 'important');
                        listItem.setAttribute('aria-hidden', 'true');
                    }
                }
            });
        });

        // 4. Protect Current Page (Redirect if unauthorized)
        const path = window.location.pathname;
        const currentPage = path.split('/').pop(); // "users.html"

        // 5. Reveal Miscellaneous Items (Sign Out, etc.)
        // Any item that is NOT explicitly governed by the mapping should be revealed
        const allNavItems = document.querySelectorAll('.sidebar-nav .nav-item');
        allNavItems.forEach(item => {
            const link = item.querySelector('.nav-link');
            if (link) {
                const href = link.getAttribute('href');
                const isGoverned = Object.values(mapping).includes(href);
                if (!isGoverned) {
                    item.style.removeProperty('display');
                    item.classList.add('reveal');
                    item.removeAttribute('aria-hidden');
                }
            }
        });

        // Check if the current page is managed by RBAC
        const governedKey = Object.keys(mapping).find(key => mapping[key] === currentPage);

        if (governedKey) {
            const isAllowedHere = isAdmin ? true : (perms[governedKey] === true);

            if (!isAllowedHere) {
                console.warn(`[RBAC] Forbidden Access: ${currentPage}. Redirecting...`);

                if (firstAllowedPage) {
                    window.location.replace(firstAllowedPage);
                } else {
                    // Worst case: No pages allowed? Send to index or error.
                    window.location.replace('index.html');
                }
            }
        }

        // --- ENFORCE SYSTEM POLICIES (Settings Sync) ---
        window.initSystemPolicies(sb, isAdmin);
    };

    // --- Dashboard Data Fetch ---
    const fetchDashboardStats = async () => {
        const statsContainer = document.getElementById('recent-tickets-container');
        if (!statsContainer) return; // Only execute on the actual dashboard page

        const activeEl = document.getElementById('stats-active');
        const completedEl = document.getElementById('stats-completed');
        const pendingEl = document.getElementById('stats-pending');
        const customersEl = document.getElementById('stats-customers');

        // Verify Supabase is ready
        const waitForSupabase = () => new Promise(resolve => {
            if (window.sb) return resolve(window.sb);
            let attempts = 0;
            const i = setInterval(() => {
                attempts++;
                if (window.sb) {
                    clearInterval(i);
                    resolve(window.sb);
                } else if (attempts > 50) {
                    clearInterval(i);
                    resolve(null);
                }
            }, 100);
        });

        const sb = await waitForSupabase();
        if (!sb) {
            statsContainer.innerHTML = `<div class="col-12 text-center text-danger py-5">Database connection failed.</div>`;
            return;
        }

        try {
            // Count totals
            const { data: tickets, error: ticketsErr } = await sb
                .from('repair_tickets')
                .select(`
                    *,
                    customers:customer_id (
                        first_name,
                        last_name,
                        phone_number
                    )
                `)
                .order('created_at', { ascending: false });

            if (ticketsErr) throw ticketsErr;

            let cPending = 0;
            let cActive = 0;
            let cCompleted = 0;

            const recent = tickets ? tickets.slice(0, 5) : []; // top 5

            if (tickets) {
                tickets.forEach(t => {
                    const s = (t.status || 'Pending').toLowerCase();
                    if (['completed', 'resolved', 'picked up', 'done', 'failed', 'cancelled', 'unrepairable', 'refunded'].includes(s)) {
                        cCompleted++;
                    } else if (s === 'pending') {
                        cPending++;
                    } else {
                        cActive++; // Statuses like 'active', 'in progress', 'diagnosing', etc.
                    }
                });
            }

            // Get customer count using exact count to be efficient
            const { count: cCustomers, error: custErr } = await sb
                .from('customers')
                .select('*', { count: 'exact', head: true });

            if (custErr) throw custErr;

            // Animate number filling
            const animateValue = (el, endVal) => {
                if (!el) return;
                el.innerText = endVal;
                el.classList.add('animate__animated', 'animate__fadeIn');
            };

            animateValue(activeEl, cActive);
            animateValue(completedEl, cCompleted);
            animateValue(pendingEl, cPending);
            animateValue(customersEl, cCustomers || 0);

            // Print recents table
            if (recent.length === 0) {
                statsContainer.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <svg class="opacity-50 mb-3" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p class="mb-0">No jobs scheduled yet.</p>
                </div>`;
                return;
            }

            let htmlPayload = '';
            recent.forEach((t, i) => {
                const s = (t.status || 'Pending').toLowerCase();
                let statusBadge = '';
                let iconClass = '';

                if (s === 'completed' || s === 'resolved' || s === 'picked up') {
                    statusBadge = '<span class="badge bg-success bg-opacity-10 text-success rounded-pill px-3">Completed</span>';
                    iconClass = "bg-success bg-opacity-10 text-success";
                } else if (s === 'pending') {
                    statusBadge = '<span class="badge bg-warning bg-opacity-10 text-warning rounded-pill px-3">Pending</span>';
                    iconClass = "bg-warning bg-opacity-10 text-warning";
                } else {
                    statusBadge = '<span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3">Active</span>';
                    iconClass = "bg-primary bg-opacity-10 text-primary";
                }

                const custObj = Array.isArray(t.customers) ? t.customers[0] : t.customers;
                const custName = custObj ? `${custObj.first_name || ''} ${custObj.last_name || ''}`.trim() : 'Unknown Customer';

                const dateStr = window.formatDateTime ? window.formatDateTime(t.created_at) : new Date(t.created_at).toLocaleDateString();

                htmlPayload += `
                <div class="col-12 animate__animated animate__fadeInUp" style="animation-delay: ${(i * 0.05).toFixed(2)}s">
                    <div class="card border-0 shadow-sm rounded-4 h-100 bg-body-tertiary transition-all" style="transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='var(--bs-box-shadow)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--bs-box-shadow-sm)';">
                        <div class="card-body p-3 p-sm-4 d-flex align-items-center flex-wrap gap-3">
                            <div class="icon-box-wrapper">
                                <div class="${iconClass} shadow-sm d-flex align-items-center justify-content-center rounded-circle" style="width: 48px; height: 48px; min-width: 48px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </div>
                            </div>
                            <div class="flex-grow-1" style="min-width: 200px;">
                                <div class="d-flex align-items-center justify-content-between mb-1">
                                    <h6 class="fw-bold mb-0 tracking-tight text-main">${t.ticket_code || 'TKT-0000'}</h6>
                                    ${statusBadge}
                                </div>
                                <div class="small fw-semibold text-secondary mb-1">${custName}</div>
                                <div class="small text-secondary opacity-75 fst-italic text-truncate" style="max-width: 300px;">${t.issue_description || 'No description provided.'}</div>
                            </div>
                            <div class="ms-auto mt-2 mt-sm-0 ps-sm-3 border-light border-opacity-10 d-flex flex-column justify-content-center align-items-end" style="border-left: 1px solid var(--bs-border-color-translucent);">
                                <span class="small text-secondary fw-semibold d-block text-end mb-2">${dateStr}</span>
                                <button class="btn btn-sm btn-outline-info rounded-pill px-3 shadow-sm hover-lift view-job-btn" onclick="viewJobPanel(this)" data-ticket="${encodeURIComponent(JSON.stringify(t))}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-1"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> View
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
            });

            statsContainer.innerHTML = htmlPayload;

        } catch (error) {
            console.error('[Dashboard] Failed to fetch stats:', error);
            statsContainer.innerHTML = `
                <div class="col-12 text-center text-danger py-5">
                    <p class="mb-0">Failed to load statistics.</p>
                </div>`;
        }
    };

    initRBAC();
    fetchDashboardStats();


    // --- SYSTEM CONTROLLER: Settings & Policies ---
    window.initSystemPolicies = async (sb, isAdmin) => {
        try {
            let { data: config, error } = await sb.from('system_settings').select('*').eq('id', 1).maybeSingle();

            // Auto-Initialize if row 1 is missing
            if (!config && !error) {
                const defaultConfig = {
                    id: 1,
                    maintenance_mode: false,
                    splash_enabled: true,
                    system_id: 'PROD-CLUSTER-A',
                    lock_threshold: 5
                };
                const { data: newConfig } = await sb.from('system_settings').upsert([defaultConfig]).select().single();
                config = newConfig;
            }

            if (!config) return;

            window.systemConfig = config; // Expose globally for date formatting

            // 1. SYSTEM ISOLATION (Maintenance Mode / Deep Lockdown)
            if (config.maintenance_mode && !isAdmin) {
                document.body.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center vh-100 bg-dark text-white text-center p-5" style="background: radial-gradient(circle at center, #1a1a1a 0%, #000 100%);">
                    <div class="mb-4 animate__animated animate__pulse animate__infinite" style="filter: drop-shadow(0 0 15px rgba(220, 53, 69, 0.4));">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <h1 class="fw-bold mb-3 tracking-widest text-uppercase">System Isolation Active</h1>
                    <p class="lead opacity-75 mb-5 font-monospace" style="max-width: 600px;">The INKPlus platform is currently under deep maintenance. Access has been restricted to Administrative nodes only.</p>
                    <button class="btn btn-outline-danger btn-lg rounded-pill px-5 shadow-sm" onclick="window.forceLogout(false)">Return to Surface</button>
                    <div class="mt-5 small text-secondary">Node: ${config.system_id || 'PROD-CLUSTER'}</div>
                </div>
            `;
                // Block all future execution on this page
                throw new Error("[POLICY] System Locked");
            }

            // 2. SPLASH SCREEN (Once per session)
            if (config.splash_enabled && !sessionStorage.getItem('splashShown')) {
                const splash = document.createElement('div');
                splash.id = 'systemSplash';
                splash.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:var(--bg-gradient); background-attachment: fixed; z-index:10000; display:flex; flex-direction:column; align-items:center; justify-content:center; transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);';
                splash.innerHTML = `
                <div class="text-center animate__animated animate__fadeIn">
                    <div class="mb-4 d-flex justify-content-center">
                        <div style="width: 120px; height: 120px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items:center; justify-content:center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 0 30px rgba(74, 144, 164, 0.2);">
                            <img src="assets/logo1.png" style="max-width:80px;" class="animate__animated animate__pulse animate__infinite">
                        </div>
                    </div>
                    <h4 class="fw-bold tracking-widest text-uppercase mb-2" style="background: linear-gradient(45deg, #fff, rgba(255,255,255,0.5)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">INKPlus Console</h4>
                    <div class="progress mt-4 bg-dark bg-opacity-50" style="height: 4px; width: 200px; border-radius: 10px; margin: 0 auto;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" role="progressbar" style="width: 100%"></div>
                    </div>
                    <p class="mt-3 text-secondary small fw-bold tracking-widest text-uppercase opacity-50">Synchronizing Environment...</p>
                </div>
            `;
                document.body.style.overflow = 'hidden';
                document.body.appendChild(splash);
                sessionStorage.setItem('splashShown', 'true');

                setTimeout(() => {
                    splash.style.opacity = '0';
                    splash.style.transform = 'scale(1.1)';
                    document.body.style.overflow = '';
                    setTimeout(() => splash.remove(), 1000);
                }, 2500);
            }

            // 3. AUTO-LOCK (Strict Inactivity Compliance)
            const thresholdSelectValue = config.lock_threshold || '30';
            const timeoutMs = parseInt(thresholdSelectValue) * 60 * 1000;
            let idleTimer;
            let lastActivity = Date.now();

            const logoutUser = async () => {
                const timeSinceLastActivity = Date.now() - lastActivity;
                // Additional fallback check to ensure strictly timeoutMs has passed
                if (timeSinceLastActivity >= timeoutMs) {
                    // Terminate session record via telemetry explicitly
                    const userId = localStorage.getItem('user_id');
                    const sessionId = localStorage.getItem('session_record_id');

                    if (window.logAction) {
                        await window.logAction('AUTO_LOGOUT_TRIGGERED', 'user.security', { event: 'Inactivity Threshold Crossed', threshold_minutes: thresholdSelectValue }, 'warning');
                    }

                    if (sessionId && window.sb) {
                        await window.sb.from('login_sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionId);
                    }

                    if (userId && window.sb) {
                        await window.sb.from('users').update({ is_online: false }).eq('user_id', userId);
                    }

                    Swal.fire({
                        title: 'Security Timeout',
                        text: 'Your session has been terminated due to compliance inactivity.',
                        icon: 'warning',
                        showConfirmButton: false,
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        timer: 3000,
                        timerProgressBar: true
                    }).then(() => {
                        window.isNavigatingInternal = false;
                        window.forceLogout(false);
                    });
                } else {
                    resetIdleTimer(); // False positive, recalculate
                }
            };

            const resetIdleTimer = () => {
                lastActivity = Date.now();
                clearTimeout(idleTimer);
                idleTimer = setTimeout(logoutUser, timeoutMs);
            };

            // Events to reset the timer (throttle for performance)
            let debounceTimer;
            ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
                window.addEventListener(evt, () => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(resetIdleTimer, 500);
                }, { passive: true });
            });
            resetIdleTimer();

        } catch (err) {
            if (err.message !== "[POLICY] System Locked") {
                console.warn("[SystemPolicies] Error:", err);
            }
        }
    };

    // --- GLOBAL DATE/TIME FORMATTER ---
    window.formatDateTime = (isoString) => {
        if (!isoString) return 'N/A';
        const config = window.systemConfig || {};
        const date = new Date(isoString);

        // Fallback options
        const locale = 'en-US';
        const tz = config.timezone === 'UTC+8' ? 'Asia/Singapore' : (config.timezone === 'UTC-5' ? 'America/New_York' : 'UTC');
        const hc = config.time_format === '12h' ? 'h12' : 'h23';

        try {
            return date.toLocaleString(locale, {
                timeZone: tz,
                hourCycle: hc,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).replace(/\//g, '-');
        } catch (e) {
            return date.toISOString().replace('T', ' ').split('.')[0];
        }
    };

    // Global Fullscreen Toggle
    window.toggleFullScreen = function () {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // --- Global Telemetry Actions Logger ---
    window.logAction = async function (signature, subsystem, payload = {}, severity = 'info') {
        try {
            if (!window.sb) return;
            const userId = localStorage.getItem('user_id');

            // Asynchronously fire-and-forget log
            window.sb.from('audit_logs').insert([{
                user_id: userId || null,
                signature: signature,
                subsystem: subsystem,
                payload: payload,
                severity: severity
            }]).then(({ error }) => {
                if (error && error.code !== '42P01') console.warn("[Telemetry] Non-critical recording error", error);
            });
        } catch (e) {
            console.warn("[Telemetry] Failed to record action", e);
        }
    };

    // --- Global Session Guard & Live Heartbeat ---
    const startSessionGuard = () => {
        const userId = localStorage.getItem('user_id');
        const sessionId = localStorage.getItem('session_record_id');
        if (!userId || !window.sb || userId === 'SYSTEM_SETUP_ID') return;

        // 1. Ensure marked online initially (handles rapid page refreshes seamlessly)
        window.sb.from('users')
            .update({ is_online: true, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .then(({ error }) => {
                if (error) console.error("[Guard] Initial online update failed:", error);
                else console.info("[Guard] Presence confirmed for user:", userId);
            });

        // 2. Establish Native Supabase Realtime Presence Channel
        window.presenceChannel = window.sb.channel('global:presence_mesh', {
            config: { presence: { key: userId } }
        });

        window.presenceChannel
            .on('presence', { event: 'join' }, () => {
                console.log("[Presence] Peer discovered. Refreshing interfaces...");
                if (typeof window.fetchUsers === 'function') window.fetchUsers();
                if (typeof window.fetchAndRenderSessions === 'function') window.fetchAndRenderSessions();
            })
            .on('presence', { event: 'leave' }, () => {
                console.log("[Presence] Peer disconnected. Syncing registry...");
                if (typeof window.fetchUsers === 'function') window.fetchUsers();
                if (typeof window.fetchAndRenderSessions === 'function') window.fetchAndRenderSessions();
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await window.presenceChannel.track({
                        online_at: new Date().toISOString(),
                        user_id: userId
                    });
                }
            });

    };

    // Start the guard if Supabase is initialized
    const verifySB = setInterval(() => {
        if (window.sb) {
            clearInterval(verifySB);
            startSessionGuard();
        }
    }, 500);

    // Global: Open Job Details Panel
    window.viewJobPanel = function (btn) {
        try {
            const ticketStr = btn.getAttribute('data-ticket');
            const t = JSON.parse(decodeURIComponent(ticketStr));
            const custName = t.customers ? `${t.customers.first_name || ''} ${t.customers.last_name || ''}`.trim() : 'Unknown';
            const custPhone = t.customers?.phone_number || 'N/A';
            const dateStr = new Date(t.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

            let badgeClass = 'bg-secondary';
            if (t.status === 'Pending') badgeClass = 'bg-warning text-dark';
            if (t.status === 'Diagnosing') badgeClass = 'bg-info text-dark';
            if (t.status === 'Repairing') badgeClass = 'bg-primary text-white';
            if (t.status === 'Ready') badgeClass = 'bg-success text-white';

            Swal.fire({
                title: `<span class="fw-bold tracking-tight text-main ms-2">Job: <span class="font-monospace ms-2">${t.ticket_code}</span></span>`,
                html: `
                <div class="text-start mt-3 px-1" style="font-size: 0.95rem;">
                    <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-light border-opacity-10">
                        <span class="badge ${badgeClass} fs-6 px-3 py-2 rounded-pill shadow-sm">${t.status}</span>
                        <span class="small text-secondary fw-semibold bg-body-tertiary px-3 py-1 rounded-pill border border-light border-opacity-10 shadow-sm">${dateStr}</span>
                    </div>

                    <div class="row g-3 mb-4">
                        <div class="col-sm-6">
                            <label class="small text-muted fw-bold text-uppercase mb-1">Customer</label>
                            <div class="fw-bold text-main fs-5">${custName}</div>
                            <div class="small text-secondary mt-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1 opacity-50"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>${custPhone}</div>
                        </div>
                        <div class="col-sm-6">
                            <label class="small text-muted fw-bold text-uppercase mb-1">Device Details</label>
                            <div class="fw-bold text-main d-flex align-items-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" class="me-2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>${t.device_brand || ''} ${t.device_model || 'Unknown'}</div>
                            <div class="small text-secondary mt-1 badge bg-body border border-light border-opacity-10">${t.service_category || 'N/A'}</div>
                        </div>
                    </div>

                    <div class="bg-body-tertiary p-3 rounded-4 border border-light border-opacity-10 mb-3 shadow-sm transition-all hover-lift">
                        <label class="small text-muted fw-bold text-uppercase mb-2 d-flex align-items-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Accessories Included</label>
                        <p class="mb-0 text-main font-monospace small">${t.accessories_included || 'No accessories provided.'}</p>
                    </div>

                    <div class="bg-body-tertiary p-3 rounded-4 border border-light border-opacity-10 shadow-sm transition-all hover-lift">
                        <label class="small text-muted fw-bold text-uppercase mb-2 d-flex align-items-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Issue / Description</label>
                        <p class="mb-0 text-main fst-italic fw-medium" style="line-height: 1.6;">"${t.issue_description || 'No detailed issue description provided.'}"</p>
                    </div>
                </div>
            `,
                showCloseButton: true,
                showConfirmButton: false,
                width: '650px',
                background: 'var(--card-bg)',
                color: 'var(--text-main)',
                customClass: {
                    popup: 'rounded-4 shadow-lg border border-light border-opacity-10',
                    closeButton: 'text-main opacity-75',
                }
            });
        } catch (err) {
            console.error("Panel Error:", err);
            Swal.fire('Error', 'Could not open job panel.', 'error');
        }
    }
}); // End of DOMContentLoaded
