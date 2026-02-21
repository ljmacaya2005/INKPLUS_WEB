document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Menu Toggle ---
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const sidebar = document.getElementById('sidebar');

    const toggleSidebar = () => {
        if (sidebar) sidebar.classList.toggle('show');
    };

    if (mobileToggle) mobileToggle.addEventListener('click', toggleSidebar);
    if (mobileNavToggle) mobileNavToggle.addEventListener('click', toggleSidebar);

    // Close menus on outside click
    document.addEventListener('click', (e) => {
        const isOutsideSidebar = sidebar && !sidebar.contains(e.target);
        const isNotMobileToggle = !mobileToggle?.contains(e.target);
        const isNotNavToggle = !mobileNavToggle?.contains(e.target);

        if (sidebar && sidebar.classList.contains('show') && isOutsideSidebar && isNotMobileToggle && isNotNavToggle) {
            sidebar.classList.remove('show');
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
        fullScreenBtn.addEventListener('click', toggleFullScreen);
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

        // 2. Fetch User & Roles (Robust Join)
        const { data: userData, error } = await sb
            .from('users')
            .select(`
                user_id,
                roles (*)
            `)
            .eq('user_id', userId)
            .single();

        if (error || !userData || !userData.roles) {
            console.error('[RBAC] Failed to fetch permissions or no role assigned.', error);
            return;
        }

        // Handle Potential Array vs Object response from Supabase Join
        const perms = Array.isArray(userData.roles) ? userData.roles[0] : userData.roles;
        // console.log('[RBAC] Config:', perms);

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
                    if (s === 'completed' || s === 'resolved' || s === 'picked up') {
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

                const dateObj = new Date(t.created_at);
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                htmlPayload += `
                <div class="col-12 animate__animated animate__fadeInUp" style="animation-delay: ${(i * 0.05).toFixed(2)}s">
                    <div class="card border-0 shadow-sm rounded-4 h-100 bg-body-tertiary transition-all" style="transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='var(--bs-box-shadow)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--bs-box-shadow-sm)';">
                        <div class="card-body p-3 p-sm-4 d-flex align-items-center flex-wrap gap-3">
                            <div class="${iconClass} shadow-sm d-flex align-items-center justify-content-center rounded-circle" style="width: 48px; height: 48px; min-width: 48px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
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
});

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

// --- Global Session Guard & Live Heartbeat ---
const startSessionGuard = () => {
    const userId = localStorage.getItem('user_id');
    const sessionId = localStorage.getItem('session_record_id');
    if (!userId || !window.sb) return;

    // 1. Ensure marked online initially (handles rapid page refreshes seamlessly)
    window.sb.from('users').update({ is_online: true, updated_at: new Date().toISOString() }).eq('user_id', userId);

    // 2. Establish Native Supabase Realtime Presence Channel
    window.presenceChannel = window.sb.channel('global:presence_mesh', {
        config: { presence: { key: userId } }
    });

    window.presenceChannel
        .on('presence', { event: 'join' }, () => {
            // Someone came online! Instant trigger to update any visible grids
            if (typeof window.fetchUsers === 'function') window.fetchUsers();
            if (typeof window.fetchAndRenderSessions === 'function') window.fetchAndRenderSessions(false);
        })
        .on('presence', { event: 'leave' }, () => {
            // Someone disconnected or closed their tab! Instant trigger
            if (typeof window.fetchUsers === 'function') window.fetchUsers();
            if (typeof window.fetchAndRenderSessions === 'function') window.fetchAndRenderSessions(false);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await window.presenceChannel.track({
                    online_at: new Date().toISOString(),
                    user_id: userId
                });
            }
        });

    // 3. Continuous Heartbeat (Polls every 15 seconds)
    setInterval(async () => {
        try {
            const { data, error } = await window.sb.from('users').select('is_online').eq('user_id', userId).single();

            // If the database marks them as offline (e.g., terminated by an administrator from sessions.html)
            if (data && data.is_online === false) {
                console.warn("[Session Guard] Account terminated remotely or revoked. Executing strict logout.");

                // Close session record
                if (sessionId) {
                    await window.sb.from('login_sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionId);
                }

                await window.sb.auth.signOut();
                localStorage.clear();
                window.location.replace('index.html');
            } else {
                // Ping 'updated_at' so the master node knows the user is breathing
                window.sb.from('users').update({ updated_at: new Date().toISOString() }).eq('user_id', userId);
            }
        } catch (e) {
            // Ignore minor network hiccups
        }
    }, 15000);
};

// Start the guard if Supabase is initialized
const verifySB = setInterval(() => {
    if (window.sb) {
        clearInterval(verifySB);
        startSessionGuard();
    }
}, 500);

// --- Browser Tab Closure Detection (Unload) ---
window.isNavigatingInternal = false;

document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && (!link.href.startsWith('http') || link.href.startsWith(window.location.origin))) {
        window.isNavigatingInternal = true;
    }
});

document.addEventListener('submit', () => { window.isNavigatingInternal = true; });

// Detect keyboard reload (F5 or Ctrl/Cmd + R)
document.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r') || (e.metaKey && e.key.toLowerCase() === 'r')) {
        window.isNavigatingInternal = true;
    }
});

const handleTabClose = () => {
    // If the user is just navigating internally or refreshing the page, SKIP the offline ping!
    if (window.isNavigatingInternal) return;

    // When the tab dies completely, use native Fetch Keepalive to guarantee the network request
    // reaches Supabase before the process memory shuts down.
    const userId = localStorage.getItem('user_id');
    const token = localStorage.getItem('sb_token');
    const sessionId = localStorage.getItem('session_record_id');

    if (userId && token && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        // Drop user to offline
        const urlUsers = `${window.SUPABASE_URL}/rest/v1/users?user_id=eq.${userId}`;
        fetch(urlUsers, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': window.SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ is_online: false }),
            keepalive: true
        }).catch(() => { });

        // End the session log boundary
        if (sessionId) {
            const urlSesh = `${window.SUPABASE_URL}/rest/v1/login_sessions?id=eq.${sessionId}`;
            fetch(urlSesh, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': window.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ ended_at: new Date().toISOString() }),
                keepalive: true
            }).catch(() => { });
        }
    }
};

// Standard Desktop
window.addEventListener('beforeunload', handleTabClose);

// Mobile Safari / Chrome App Backgrounding Edge Cases
window.addEventListener('pagehide', handleTabClose);

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // App was minimized or tab backgrounded on mobile, mark as away temporarily
        handleTabClose();
    } else if (document.visibilityState === 'visible' && !window.isNavigatingInternal) {
        // Returned to tab, re-initialize Online Status
        const userId = localStorage.getItem('user_id');
        if (userId && window.sb) {
            window.sb.from('users').update({ is_online: true, updated_at: new Date().toISOString() }).eq('user_id', userId);
        }
    }
});

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
