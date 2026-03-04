/* Freshly Crafted Users JS with Robust Supabase Integration */

window.updateSlider = function (element) {
    const slider = document.getElementById('tabSlider');
    const container = element ? element.closest('.nav-pills-slider') : null;
    if (!slider || !element || !container) return;

    const allTabs = container.querySelectorAll('.nav-link');
    allTabs.forEach(t => t.classList.remove('active'));
    element.classList.add('active');

    // Bulletproof offset traversal for consistent cross-browser dimensions
    let leftPos = 0;
    let topPos = 0;
    let node = element;

    while (node && node !== container && container.contains(node)) {
        leftPos += node.offsetLeft;
        topPos += node.offsetTop;
        node = node.offsetParent;
    }

    // High Precision Positioning
    slider.style.width = element.offsetWidth + 'px';
    slider.style.height = element.offsetHeight + 'px';
    slider.style.transform = `translate(${leftPos}px, ${topPos}px)`;
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Tab Slider
    const firstTab = document.querySelector('#user-list-tab');
    if (firstTab) {
        setTimeout(() => window.updateSlider(firstTab), 150);
        window.addEventListener('resize', () => {
            const active = document.querySelector('.nav-link.active');
            if (active) window.updateSlider(active);
        });
    }

    // --- Supabase Integration ---

    const waitForSupabase = () => {
        return new Promise(resolve => {
            if (window.sb) return resolve(window.sb);
            const interval = setInterval(() => {
                if (window.sb) {
                    clearInterval(interval);
                    resolve(window.sb);
                }
            }, 100);
        });
    };

    try {
        await waitForSupabase();

        // Check if roles table is populated, if not, handle gracefully
        const ensureRolesExist = async () => {
            const { count } = await window.sb.from('roles').select('*', { count: 'exact', head: true });
            if (count === 0) {
                await window.sb.from('roles').insert([{
                    role_name: 'Administrator',
                    can_profile: true,
                    can_home: true,
                    can_scheduling: true,
                    can_jobs: true,
                    can_history: true,
                    can_sessions: true,
                    can_users: true,
                    can_actions: true,
                    can_services: true,
                    can_settings: true
                }]);
            }
        };
        ensureRolesExist();

        // --- RBAC: Reveal Restricted Tabs for Admins ---
        const rbacTabs = async () => {
            const userId = localStorage.getItem('user_id');
            if (!userId) return;

            const { data: userRole, error } = await window.sb
                .from('users')
                .select('roles(role_name)')
                .eq('user_id', userId)
                .single();

            if (error || !userRole || !userRole.roles) return;

            const perms = Array.isArray(userRole.roles) ? userRole.roles[0] : userRole.roles;
            const roleName = perms.role_name;

            // Strict check: Only "Administrator" sees these tabs
            if (roleName === 'Administrator' || roleName === 'Admin') {
                const roleTab = document.getElementById('role-mgmt-tab');
                const secTab = document.getElementById('security-tab');
                if (roleTab) roleTab.classList.remove('d-none');
                if (secTab) secTab.classList.remove('d-none');

                // Re-trigger visual slider to cover DOM reflow perfectly on all devices
                setTimeout(() => {
                    const activeTab = document.querySelector('.nav-pills-slider .nav-link.active');
                    if (activeTab) window.updateSlider(activeTab);
                }, 50); // fast DOM reaction
            }
        };
        await rbacTabs();

        // --- Fetch and Display Active Users (Globalized for Dashboard Presence) ---
        window.fetchUsers = async () => {
            const userGridArea = document.querySelector('#user-list-grid');
            const totalUsersLabel = document.querySelector('#user-list p.text-secondary');

            if (!userGridArea) return;

            userGridArea.innerHTML = `
                <div class="col-12 py-5 text-center w-100">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2 text-muted">Loading System Users...</p>
                </div>
            `;

            try {
                const { data: users, error } = await window.sb
                    .from('users')
                    .select(`
                        user_id,
                        is_active,
                        is_online,
                        last_ip,
                        roles ( role_name ),
                        profiles ( first_name, last_name, email )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (!users || users.length === 0) {
                    userGridArea.innerHTML = `
                        <div class="col-12 py-5 text-center w-100 text-muted">No users found in the system.</div>
                    `;
                    if (totalUsersLabel) totalUsersLabel.textContent = 'Total: 0 Accounts';
                    return;
                }

                if (totalUsersLabel) totalUsersLabel.textContent = `Total: ${users.length} Accounts Registered`;

                let html = '';
                users.forEach((user, index) => {
                    const userProfiles = user.profiles;
                    const profile = Array.isArray(userProfiles) ? (userProfiles[0] || {}) : (userProfiles || {});
                    const fullName = (profile.first_name || profile.last_name)
                        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                        : 'System User';

                    const email = profile.email || 'No Email Linked';
                    const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                    const role = Array.isArray(user.roles) ? (user.roles[0] || {}) : (user.roles || {});
                    const roleName = role.role_name || 'User';
                    const statusClass = user.is_active ? (user.is_online ? 'online' : 'offline') : 'bg-danger bg-opacity-75';
                    const statusText = user.is_active ? (user.is_online ? 'Online' : 'Offline') : 'Suspended';
                    const activityText = user.is_active ? (user.is_online ? 'Active Now' : 'Last seen recently') : 'Access Revoked';
                    const roleColor = user.is_active ? (roleName.toLowerCase().includes('admin') ? 'primary' : 'info') : 'secondary';
                    const cardOpacity = user.is_active ? '' : 'opacity-75 grayscale-effect';

                    html += `
                        <div class="col animate__animated animate__fadeInUp ${cardOpacity}" style="animation-delay: ${(index * 0.05).toFixed(2)}s;">
                            <div class="card h-100 border-0 shadow-sm rounded-4 position-relative overflow-hidden bg-body-tertiary transition-all" style="transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--bs-box-shadow-sm)';">
                                <div class="card-body p-4 d-flex flex-column">
                                    <div class="d-flex justify-content-between align-items-start mb-3">
                                        <div class="d-flex align-items-center gap-3">
                                            <div class="avatar-circle bg-${roleColor}-soft text-${roleColor} shadow-sm" style="width: 52px; height: 52px; font-size: 1.25rem;">${initials}</div>
                                            <div>
                                                <h6 class="fw-bold mb-1 tracking-tight text-main">${fullName}</h6>
                                                <div class="small text-secondary fw-medium">${email}</div>
                                            </div>
                                        </div>
                                        <div class="dropdown">
                                            <button class="btn btn-action rounded-circle bg-body shadow-sm border border-light border-opacity-10" data-bs-toggle="dropdown" style="width: 36px; height: 36px;">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3 mt-2">
                                                <li><button class="dropdown-item py-2 d-flex align-items-center gap-2 m-1 rounded-2" onclick="editUser('${user.user_id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> Configuration</button></li>
                                                <li><hr class="dropdown-divider"></li>
                                                <li>
                                                    <button class="dropdown-item text-${user.is_active ? 'warning' : 'success'} py-2 d-flex align-items-center gap-2 m-1 rounded-2" onclick="toggleUserStatus('${user.user_id}', ${user.is_active})">
                                                        ${user.is_active ?
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Suspend Access' :
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Re-activate'
                        }
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-4 mt-2">
                                        <span class="role-badge bg-${roleColor} shadow-sm px-3 py-1 bg-opacity-75">${roleName}</span>
                                    </div>
                                    
                                    <div class="d-flex align-items-center justify-content-between mt-auto pt-3 border-top border-light border-opacity-10">
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="status-indicator ${statusClass} m-0 shadow-sm" style="width: 10px; height: 10px;"></span>
                                            <span class="small fw-semibold text-main opacity-75">${statusText}</span>
                                        </div>
                                        <small class="text-secondary opacity-75" style="font-size: 0.75rem;">${activityText}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                userGridArea.innerHTML = html;

            } catch (err) {
                console.error("Error fetching users:", err);
                userGridArea.innerHTML = `<div class="col-12 py-4 text-center text-danger w-100">Error loading users. View console for details.</div>`;
            }
        };

        window.fetchUsers();

        // --- Fetch Pending Reset Requests ---
        const fetchResetRequests = async () => {
            const requestsGridArea = document.querySelector('#requests-list-grid');
            if (!requestsGridArea) return;

            requestsGridArea.innerHTML = `
                <div class="col-12 py-5 text-center w-100">
                    <div class="spinner-border text-info" role="status"></div>
                    <p class="mt-2 text-muted">Loading Pending Requests...</p>
                </div>
            `;

            try {
                // Fetch ALL from recovery_requests to act as a history log
                const { data: requests, error } = await window.sb
                    .from('recovery_requests')
                    .select(`
                        id,
                        user_id,
                        email,
                        reason,
                        status,
                        created_at,
                        users:user_id ( profiles ( first_name, last_name ) )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (!requests || requests.length === 0) {
                    requestsGridArea.innerHTML = `
                        <div class="col-12 py-5 text-center w-100 text-muted">No reset requests on record.</div>
                    `;
                    return;
                }

                let html = '';
                requests.forEach((req, index) => {
                    const userProfiles = req.users?.profiles;
                    const profile = Array.isArray(userProfiles) ? (userProfiles[0] || {}) : (userProfiles || {});

                    const isDeletedOrphan = !req.users; // True if the user row no longer exists

                    const fullName = isDeletedOrphan
                        ? '<span class="text-danger fst-italic">Account Deleted</span>'
                        : ((profile.first_name || profile.last_name)
                            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                            : 'Unknown User');

                    const timeAgo = new Date(req.created_at).toLocaleString();

                    let badgeClass = 'bg-secondary';
                    let badgeText = (req.status || 'unknown').toUpperCase();
                    if (req.status === 'pending') badgeClass = isDeletedOrphan ? 'bg-danger text-white' : 'bg-warning text-dark';
                    if (req.status === 'approved') badgeClass = 'bg-success text-white';
                    if (req.status === 'rejected') badgeClass = 'bg-danger text-white';

                    let actionsHtml = '';
                    if (isDeletedOrphan && req.status === 'pending') {
                        // User was deleted before request was resolved
                        badgeText = 'ORPHANED';
                        actionsHtml = `<button class="btn btn-outline-danger bg-body-tertiary w-100 rounded-pill px-3" disabled>User no longer exists.</button>`;
                    } else if (req.status === 'pending') {
                        actionsHtml = `
                            <button class="btn btn-info text-white rounded-pill px-3 flex-grow-1 shadow-sm fw-medium" autocomplete="off" onclick="approveReset(${req.id}, '${req.email}', '${req.user_id}')">Approve</button>
                            <button class="btn btn-outline-danger rounded-pill px-3 shadow-sm fw-medium" autocomplete="off" onclick="rejectReset(${req.id})">Reject</button>
                        `;
                    } else {
                        actionsHtml = `<button class="btn btn-light bg-body-tertiary text-muted w-100 rounded-pill px-3 border-0" disabled>Already resolved</button>`;
                    }

                    html += `
                        <div class="col animate__animated animate__fadeInUp" style="animation-delay: ${(index * 0.05).toFixed(2)}s;">
                            <div class="card h-100 border-0 shadow-sm rounded-4 position-relative overflow-hidden bg-body-tertiary transition-all" style="transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--bs-box-shadow-sm)';">
                                <div class="card-body p-4 d-flex flex-column">
                                    <div class="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h6 class="fw-bold mb-1 tracking-tight text-main">${fullName}</h6>
                                            <div class="small text-secondary fw-medium">${req.email}</div>
                                        </div>
                                        <span class="badge ${badgeClass} shadow-sm px-3 py-2 bg-opacity-75 rounded-pill">${badgeText}</span>
                                    </div>
                                    
                                    <div class="mb-4">
                                        <div class="small text-muted fst-italic">Reason: ${req.reason || 'None provided'}</div>
                                    </div>
                                    
                                    <div class="mt-auto pt-3 border-top border-light border-opacity-10">
                                        <div class="d-flex justify-content-between align-items-center mb-3">
                                            <small class="text-secondary opacity-75" style="font-size: 0.75rem;">${timeAgo}</small>
                                        </div>
                                        <div class="d-flex gap-2 w-100 mt-1">
                                            ${actionsHtml}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                requestsGridArea.innerHTML = html;

            } catch (err) {
                console.error("Error fetching requests:", err);
                requestsGridArea.innerHTML = `<div class="col-12 py-4 text-center text-danger w-100">Error loading requests. View console for details.</div>`;
            }
        };

        // Call fetchResetRequests when the tab is clicked, or initially if visible
        const securityTab = document.getElementById('security-tab');
        if (securityTab) {
            securityTab.addEventListener('click', () => {
                fetchResetRequests();
            });
        }

        // --- PREMIUM ROLE MANAGEMENT UI ---
        const fetchRolesMgmt = async () => {
            const container = document.getElementById('role-mgmt');
            if (!container) return;

            // Clean & Skeleton
            container.innerHTML = `
                <div class="dashboard-card p-0 overflow-hidden animate__animated animate__fadeIn border-0 bg-body-tertiary shadow-sm rounded-4" style="min-height: 600px;">
                    <div class="row g-0 h-100">
                        <!-- Left: Role List Sidebar -->
                        <div class="col-lg-4 col-xl-3 border-end border-light border-opacity-10 d-flex flex-column h-100" style="min-height: 600px;">
                            <div class="p-4 border-bottom border-light border-opacity-10 bg-primary bg-opacity-10">
                                <h6 class="fw-bold mb-3 text-uppercase small text-primary tracking-wide">System Roles</h6>
                                <button class="btn btn-primary w-100 rounded-pill d-flex align-items-center justify-content-center gap-2 fw-medium shadow-sm hover-lift border-0" onclick="addNewRole()">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    Add New Role
                                </button>
                            </div>
                            <div class="list-group list-group-flush p-3 gap-2 flex-grow-1 overflow-auto" id="roleListGroups">
                                <div class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></div>
                            </div>
                        </div>

                        <!-- Right: Permissions Config Area -->
                        <div class="col-lg-8 col-xl-9 d-flex flex-column h-100 bg-body rounded-end-4" style="min-height: 600px;">
                            <div id="permissionConfigArea" class="flex-grow-1 p-4 p-lg-5 overflow-auto d-flex flex-column">
                                <div class="h-100 d-flex flex-column justify-content-center align-items-center text-center opacity-75 flex-grow-1" style="min-height: 480px;">
                                    <div class="bg-primary bg-opacity-10 p-4 rounded-circle mb-3 align-items-center justify-content-center d-flex shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    </div>
                                    <h4 class="fw-bold text-main">No Role Selected</h4>
                                    <p class="text-secondary">Select a role from the sidebar to configure granular access control.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Fetch Roles
            const { data: roles, error } = await window.sb.from('roles').select('*').order('role_id');
            const listContainer = document.getElementById('roleListGroups');

            if (error || !roles) {
                listContainer.innerHTML = `<div class="text-danger small text-center p-3">Failed to load roles.</div>`;
                return;
            }

            // Render Sidebar List
            let listHtml = '';
            roles.forEach(r => {
                listHtml += `
                    <button class="btn list-group-item list-group-item-action border-0 rounded-4 p-3 d-flex justify-content-between align-items-center role-item-btn shadow-sm transition-all" 
                        style="background-color: var(--card-bg);"
                        onclick="loadPermissions(${r.role_id}, '${r.role_name}', this)">
                        <div class="d-flex align-items-center gap-3">
                            <div class="role-icon-placeholder bg-secondary bg-opacity-10 text-secondary rounded-circle d-flex align-items-center justify-content-center transition-all" style="width: 36px; height: 36px;">
                                <span class="fw-bold fs-6">${r.role_name.charAt(0).toUpperCase()}</span>
                            </div>
                            <span class="fw-medium text-main transition-all role-name-text">${r.role_name}</span>
                        </div>
                        <svg class="opacity-0 arrow-indicator transition-all text-primary" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                `;
            });
            listContainer.innerHTML = listHtml;

            // --- FUNCTION: Load Permissions View ---
            window.loadPermissions = (roleId, roleName, btnElement) => {
                // UI: Handle Active State
                document.querySelectorAll('.role-item-btn').forEach(b => {
                    b.classList.remove('active');
                    // Reset styling to default button look
                    b.style.backgroundColor = 'var(--card-bg)';
                    const iconPh = b.querySelector('.role-icon-placeholder');
                    iconPh.classList.remove('bg-primary', 'text-white', 'shadow-sm');
                    iconPh.classList.add('bg-secondary', 'bg-opacity-10', 'text-secondary');
                    b.querySelector('.role-name-text').classList.remove('text-primary', 'fw-bold');
                    b.querySelector('.role-name-text').classList.add('text-main');
                    b.querySelector('.arrow-indicator').classList.add('opacity-0');
                    b.style.transform = 'none';
                });

                // Set Active Class and styling
                btnElement.classList.add('active');
                btnElement.style.backgroundColor = 'var(--card-bg)';
                btnElement.style.borderLeft = '4px solid var(--primary-color)';
                btnElement.style.transform = 'translateX(4px)';

                const activeIconPh = btnElement.querySelector('.role-icon-placeholder');
                activeIconPh.classList.remove('bg-secondary', 'bg-opacity-10', 'text-secondary');
                activeIconPh.classList.add('bg-primary', 'text-white', 'shadow-sm');

                btnElement.querySelector('.role-name-text').classList.remove('text-main');
                btnElement.querySelector('.role-name-text').classList.add('text-primary', 'fw-bold');
                btnElement.querySelector('.arrow-indicator').classList.remove('opacity-0');

                // Logic: Render Permissions
                const roleData = roles.find(r => r.role_id === roleId);
                const configArea = document.getElementById('permissionConfigArea');

                // Icon Mapping - Strictly following the requested Schema
                const permConfig = [
                    { key: 'can_profile', label: 'My Profile', desc: 'Access personal account settings (profile.html).', icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
                    { key: 'can_home', label: 'Dashboard', desc: 'View main overview (home.html).', icon: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
                    { key: 'can_scheduling', label: 'Scheduling', desc: 'Manage tickets (scheduling.html).', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
                    { key: 'can_jobs', label: 'Jobs', desc: 'Process job orders (jobs.html).', icon: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
                    { key: 'can_history', label: 'History', desc: 'Access archives (history.html).', icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
                    { key: 'can_sessions', label: 'Sessions', desc: 'View login sessions (sessions.html).', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
                    { key: 'can_users', label: 'Users', desc: 'User management (users.html).', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' },
                    { key: 'can_actions', label: 'Actions', desc: 'Audit logs (actions.html).', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
                    { key: 'can_services', label: 'Service Catalog', desc: 'Manage dynamic services and brands (services.html).', icon: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>' },
                    { key: 'can_settings', label: 'Settings', desc: 'Global configuration (settings.html).', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15.0A10 10 0 0 0 16 9V7a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2A10 10 0 0 0 4.6 15.0"/><path d="M21.5 12.5a10 10 0 0 1-19 0"/>' }
                ];

                let cardsHtml = '';
                permConfig.forEach(p => {
                    const isChecked = roleData[p.key] ? 'checked' : '';
                    cardsHtml += `
                        <div class="col">
                            <div class="role-config-card h-100 p-4 d-flex align-items-center justify-content-between gap-3 position-relative overflow-hidden group-hover-effect rounded-4 shadow-sm transition-all hover-lift" style="background-color: var(--card-bg);">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="p-2 rounded-circle bg-primary bg-opacity-10 text-primary shadow-sm border border-primary border-opacity-10">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                            ${p.icon}
                                        </svg>
                                    </div>
                                    <div>
                                        <h6 class="fw-bold mb-1 text-main tracking-tight">${p.label}</h6>
                                        <small class="text-secondary opacity-75" style="font-size: 0.8rem;">${p.desc}</small>
                                    </div>
                                </div>
                                <div class="form-check form-switch custom-switch-lg mb-0 ps-0 d-flex justify-content-end">
                                    <input class="form-check-input mt-0 shadow-sm" type="checkbox" role="switch" id="${p.key}" ${isChecked} 
                                        onchange="updateRolePerm(${roleId}, '${p.key}', this.checked)" style="cursor: pointer; width: 2.8em; height: 1.4em; margin-left: 0.5rem; transition: background-color 0.2s;">
                                </div>
                            </div>
                        </div>
                    `;
                });

                configArea.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-primary border-opacity-10 animate__animated animate__fadeIn">
                        <div>
                            <h3 class="fw-bold mb-1 text-primary tracking-tight">${roleName}</h3>
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge bg-primary text-white shadow-sm rounded-pill px-3">Role ID: ${roleId}</span>
                                <span class="text-secondary small fw-medium"><svg class="me-1 opacity-50" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>Auto-saving enabled</span>
                            </div>
                        </div>
                    </div>
                    <div class="row row-cols-1 row-cols-xl-2 g-3 animate__animated animate__fadeInUp">
                        ${cardsHtml}
                    </div>
                `;
            };

            window.updateRolePerm = async (roleId, column, value) => {
                const toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true
                });

                try {
                    const { error } = await window.sb
                        .from('roles')
                        .update({ [column]: value })
                        .eq('role_id', roleId);

                    if (error) throw error;

                    const roleIndex = roles.findIndex(r => r.role_id === roleId);
                    if (roleIndex > -1) {
                        roles[roleIndex][column] = value;
                    }

                    // Fire Telemetry Action
                    if (window.logAction) {
                        window.logAction('ROLE_PERMS_UPDATED', 'user.security', { role_id: roleId, modified_column: column, new_value: value }, 'warning');
                    }

                    // Subtle success feedback
                    // toast.fire({ icon: 'success', title: 'Saved' });
                } catch (err) {
                    console.error('Update failed:', err);
                    toast.fire({ icon: 'error', title: 'Save Failed' });
                }
            };

            window.addNewRole = async () => {
                const { value: name } = await Swal.fire({
                    title: 'Create New Role',
                    text: 'Enter a unique name for this role',
                    input: 'text',
                    inputPlaceholder: 'e.g. Senior Technician',
                    showCancelButton: true,
                    confirmButtonText: 'Create Role',
                    confirmButtonColor: '#4A90A4',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    customClass: { popup: 'rounded-4 shadow-lg' },
                    inputValidator: (value) => {
                        if (!value) return 'Role name is required!'
                    }
                });

                if (name) {
                    const { error } = await window.sb.from('roles').insert([{ role_name: name }]);
                    if (error) Swal.fire('Error', error.message, 'error');
                    else {
                        // Fire Telemetry Action
                        if (window.logAction) {
                            window.logAction('ROLE_CREATED', 'user.management', { role_name: name }, 'warning');
                        }

                        Swal.fire({ icon: 'success', title: 'Role Created', timer: 1500, showConfirmButton: false, background: 'var(--card-bg)', color: 'var(--text-main)' });
                        fetchRolesMgmt(); // Reload
                    }
                }
            };
        };

        const roleTab = document.getElementById('role-mgmt-tab');
        if (roleTab) roleTab.addEventListener('click', fetchRolesMgmt);

        // --- PROVISIONING WITH ROLE SELECTION ---
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', async () => {
                // Fetch Roles first
                const { data: rolesList } = await window.sb.from('roles').select('role_id, role_name').order('role_name');
                let roleOpts = rolesList.map(r => `<option value="${r.role_id}">${r.role_name}</option>`).join('');

                Swal.fire({
                    title: 'Provision New Account',
                    html: `
                        <div class="text-start mt-2">
                            <p class="small text-muted mb-3 border-bottom pb-2">Create a new user and assign specific system access.</p>
                            
                            <div class="row g-2 mb-3">
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-secondary">First Name</label>
                                    <input id="swal-fname" class="form-control" placeholder="First Name">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-secondary">Last Name</label>
                                    <input id="swal-lname" class="form-control" placeholder="Last Name">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-secondary">Email Address</label>
                                <input type="email" id="swal-email" class="form-control" placeholder="user@inkplus.com">
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-secondary">Initial Password</label>
                                <input type="password" id="swal-pass" class="form-control" placeholder="••••••••">
                            </div>

                            <div class="mb-1">
                                <label class="form-label small fw-bold text-secondary">System Role</label>
                                <select id="swal-role" class="form-select">
                                    ${roleOpts}
                                </select>
                            </div>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Provision User',
                    confirmButtonColor: '#4A90A4',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    width: '500px',
                    customClass: {
                        popup: 'rounded-4 shadow-lg border-0',
                        confirmButton: 'rounded-pill px-4',
                        cancelButton: 'rounded-pill px-4'
                    },
                    preConfirm: async () => {
                        const fname = document.getElementById('swal-fname').value;
                        const lname = document.getElementById('swal-lname').value;
                        const email = document.getElementById('swal-email').value;
                        const password = document.getElementById('swal-pass').value;
                        const roleId = document.getElementById('swal-role').value;

                        if (!email || !password) Swal.showValidationMessage('Email and Password are required');
                        return { fname, lname, email, password, roleId };
                    }
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        const { fname, lname, email, password, roleId } = result.value;

                        // Use the secure internal admin client if available
                        let adminClient = window.getSupabaseAdmin();

                        if (!adminClient) {
                            const { value: key } = await Swal.fire({
                                title: 'Admin Authorization',
                                text: 'Enter Supabase Service Role Key. This is required to create a new user without automatically logging you out of your current session.',
                                input: 'password',
                                showCancelButton: true,
                                confirmButtonText: 'Authorize & Create',
                                confirmButtonColor: '#4A90A4',
                                background: 'var(--card-bg)',
                                color: 'var(--text-main)',
                                inputValidator: (val) => !val && 'Service Key is required!'
                            });

                            if (key) {
                                adminClient = (window.supabase && window.supabase.createClient)
                                    ? window.supabase.createClient(window.SUPABASE_URL, key)
                                    : supabase.createClient(window.SUPABASE_URL, key);
                            } else {
                                Swal.fire('Cancelled', 'User provision cancelled.', 'info');
                                return; // Abort
                            }
                        }

                        Swal.fire({ title: 'Creating...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), background: 'var(--card-bg)', color: 'var(--text-main)' });

                        try {
                            // 0.5 Pre-Flight Check: Verify existing email locally via Public Policy
                            const { data: existingUser } = await window.sb
                                .from('profiles')
                                .select('email')
                                .eq('email', email)
                                .maybeSingle();

                            if (existingUser) {
                                throw new Error('This email address is already officially registered in the system.');
                            }

                            // adminClient is already established from the step above
                            if (!adminClient) throw new Error("Supabase Admin Client not initialized.");

                            // 1. Auth Admin CreateUser (Bypasses Auto-Login completely!)
                            const { data, error } = await adminClient.auth.admin.createUser({
                                email: email,
                                password: password,
                                email_confirm: true, // Skips verification requirement
                                user_metadata: { first_name: fname, last_name: lname }
                            });

                            if (error) {
                                // Important: Let the user know if their key was bad
                                if (error.message.includes('401') || error.message.includes('authorized')) {
                                    window.SUPABASE_SERVICE_KEY = null;
                                }
                                throw error;
                            }
                            if (!data.user) throw new Error('No user returned from Supabase Admin API.');

                            // 2. Insert User with Role under their new ID
                            await window.sb.from('users').insert([{ user_id: data.user.id, role_id: roleId, is_active: true }]);

                            // 3. Insert Profile
                            await window.sb.from('profiles').insert([{ user_id: data.user.id, first_name: fname, last_name: lname, email }]);

                            // Fire Telemetry Action
                            if (window.logAction) {
                                window.logAction('USER_PROVISIONED', 'user.management', { email: email, role_id: roleId }, 'warning');
                            }

                            Swal.fire({
                                icon: 'success',
                                title: 'Account Created',
                                text: `User ${email} has been provisioned.`,
                                background: 'var(--card-bg)', color: 'var(--text-main)'
                            });
                            fetchUsers(); // Refresh Table
                        } catch (err) {
                            Swal.fire('Error', err.message, 'error');
                        }
                    }
                });
            });
        }

        // Also call immediately if needed or let it lazy load. Let's call it once.
        fetchResetRequests();

        // Global Action Functions
        window.approveReset = async (requestId, userEmail, userId) => {
            try {
                // 1. Fetch Secured Password
                const { data: requestData, error: fetchError } = await window.sb
                    .from('recovery_requests')
                    .select('hashed_preferred_pass')
                    .eq('id', requestId)
                    .single();

                if (fetchError || !requestData) throw new Error("Could not retrieve request details.");

                const encryptedPass = requestData.hashed_preferred_pass;
                if (!encryptedPass) throw new Error("No password attached to this request.");

                // 2. Decrypt Password (Client-Side 'Dehashing')
                let decryptedPass = null;
                if (typeof CryptoJS !== 'undefined' && window.APP_ENCRYPTION_KEY) {
                    const bytes = CryptoJS.AES.decrypt(encryptedPass, window.APP_ENCRYPTION_KEY);
                    decryptedPass = bytes.toString(CryptoJS.enc.Utf8);
                }

                if (!decryptedPass) throw new Error("Failed to decrypt the requested password. Security key mismatch.");

                // 3. Admin Client Check
                let adminClient = window.getSupabaseAdmin();

                if (!adminClient) {
                    const { value: key } = await Swal.fire({
                        title: 'Admin Authorization',
                        text: 'Enter Supabase Service Role Key to apply this password update.',
                        input: 'password',
                        showCancelButton: true,
                        confirmButtonText: 'Approve Update',
                        confirmButtonColor: '#4A90A4',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        inputValidator: (val) => !val && 'Service Key is required!'
                    });

                    if (key) {
                        adminClient = (window.supabase && window.supabase.createClient)
                            ? window.supabase.createClient(window.SUPABASE_URL, key)
                            : supabase.createClient(window.SUPABASE_URL, key);
                    }
                    else return;
                }

                // Show Loading
                Swal.fire({
                    title: 'Processing...',
                    html: 'Applying secure password update to user account.',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading(),
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)'
                });

                // Admin Client is ready

                // 4. Update User Password in Auth
                if (!userId || userId === 'undefined') {
                    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
                    if (listError) throw listError;
                    const user = users.users.find(u => u.email === userEmail);
                    if (!user) throw new Error("User ID missing and user not found.");
                    userId = user.id;
                }

                const { error: updateError } = await adminClient.auth.admin.updateUserById(
                    userId,
                    { password: decryptedPass }
                );

                if (updateError) throw updateError;

                // 5. Mark Request as Approved
                await window.sb
                    .from('recovery_requests')
                    .update({ status: 'approved' })
                    .eq('id', requestId);

                // Fire Telemetry Action
                if (window.logAction) {
                    window.logAction('RECOVERY_APPROVED', 'user.security', { target_email: userEmail }, 'critical');
                }

                // 6. Success
                Swal.fire({
                    title: 'Request Approved',
                    text: `User ${userEmail} can now log in with their new password.`,
                    icon: 'success',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)'
                });

                fetchResetRequests();

            } catch (err) {
                console.error(err);
                Swal.fire({
                    title: 'Approval Failed',
                    text: err.message,
                    icon: 'error',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)'
                });
                if (err.message.includes('401') || err.message.includes('authorized')) {
                    window.SUPABASE_SERVICE_KEY = null;
                }
            }
        };

        window.rejectReset = async (requestId) => {
            Swal.fire({
                title: 'Reject Request?',
                text: 'This will ignore the request and mark it as rejected.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Yes, Reject'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const { error } = await window.sb
                            .from('recovery_requests')
                            .update({ status: 'rejected' })
                            .eq('id', requestId);

                        if (error) throw error;

                        // Fire Telemetry Action
                        if (window.logAction) {
                            window.logAction('RECOVERY_REJECTED', 'user.security', { request_id: requestId }, 'info');
                        }

                        Swal.fire('Rejected', 'Request marked as rejected.', 'success');
                        fetchResetRequests();
                    } catch (err) {
                        Swal.fire('Error', err.message, 'error');
                    }
                }
            });
        };

        window.toggleUserStatus = async (userId, currentStatus) => {
            const actionText = currentStatus ? 'Suspend' : 'Re-activate';
            const confirmColor = currentStatus ? '#f59e0b' : '#10b981';
            const actionDesc = currentStatus ? 'User will no longer be able to log in. Historical data remains intact.' : 'User will regain access to log into the system.';

            Swal.fire({
                title: `${actionText} Account?`,
                text: actionDesc,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: confirmColor,
                confirmButtonText: `Yes, ${actionText}`
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const { error } = await window.sb
                            .from('users')
                            .update({ is_active: !currentStatus })
                            .eq('user_id', userId);

                        if (error) throw error;

                        // If we are deactivating the user, forcefully terminate their active sessions
                        if (currentStatus === true) {
                            // 1. Mark as offline visually
                            await window.sb.from('users').update({ is_online: false }).eq('user_id', userId);

                            // 2. Kill all active session records in the cloud
                            await window.sb.from('login_sessions').update({ ended_at: new Date().toISOString() }).eq('user_id', userId).is('ended_at', null);

                            // The user's dashboard heartbeat (dashboard.js) will detect is_active=false 
                            // within seconds and execute a local logout automatically.
                        }

                        // Fire Telemetry Action
                        if (window.logAction) {
                            window.logAction('USER_STATUS_TOGGLED', 'user.management', { target_id: userId, new_status: currentStatus ? 'suspended' : 'active' }, 'warning');
                        }

                        Swal.fire(`${actionText}ed`, `User access ${currentStatus ? 'suspended' : 'restored'}.`, 'success');
                        fetchUsers();
                    } catch (err) {
                        Swal.fire('Error', err.message, 'error');
                    }
                }
            });
        };

        window.editUser = async (userId) => {
            try {
                // Fetch User Details
                const { data: user, error: userError } = await window.sb
                    .from('users')
                    .select('role_id, profiles(first_name, last_name, email)')
                    .eq('user_id', userId)
                    .single();

                if (userError || !user) throw new Error("Could not fetch user details.");

                const userProfiles = user.profiles;
                const profile = Array.isArray(userProfiles) ? (userProfiles[0] || {}) : (userProfiles || {});

                // Fetch Roles
                const { data: rolesList, error: rolesError } = await window.sb.from('roles').select('role_id, role_name').order('role_name');
                if (rolesError) throw new Error("Could not fetch roles.");

                let roleOpts = rolesList.map(r => `<option value="${r.role_id}" ${r.role_id === user.role_id ? 'selected' : ''}>${r.role_name}</option>`).join('');

                const { value: formValues } = await Swal.fire({
                    title: 'Edit User Configuration',
                    html: `
                        <div class="text-start mt-2">
                            <div class="row g-2 mb-3">
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-secondary">First Name</label>
                                    <input id="swal-edit-fname" class="form-control" value="${profile.first_name || ''}">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-secondary">Last Name</label>
                                    <input id="swal-edit-lname" class="form-control" value="${profile.last_name || ''}">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label small fw-bold text-secondary">Email Address</label>
                                <input type="email" class="form-control" value="${profile.email || ''}" disabled>
                            </div>
                            <div class="mb-1">
                                <label class="form-label small fw-bold text-secondary">System Role</label>
                                <select id="swal-edit-role" class="form-select">
                                    ${roleOpts}
                                </select>
                            </div>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Save Changes',
                    confirmButtonColor: '#4A90A4',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    customClass: {
                        popup: 'rounded-4 shadow-lg border-0',
                        confirmButton: 'rounded-pill px-4',
                        cancelButton: 'rounded-pill px-4'
                    },
                    preConfirm: () => {
                        return {
                            fname: document.getElementById('swal-edit-fname').value,
                            lname: document.getElementById('swal-edit-lname').value,
                            roleId: document.getElementById('swal-edit-role').value
                        };
                    }
                });

                if (formValues) {
                    Swal.fire({ title: 'Saving...', didOpen: () => Swal.showLoading(), background: 'var(--card-bg)', color: 'var(--text-main)' });

                    // Update User Role
                    const { error: updateObjErr } = await window.sb.from('users').update({ role_id: formValues.roleId }).eq('user_id', userId);
                    if (updateObjErr) throw updateObjErr;

                    // Update Profile info
                    const { error: updateProfErr } = await window.sb.from('profiles').update({
                        first_name: formValues.fname,
                        last_name: formValues.lname
                    }).eq('user_id', userId);
                    if (updateProfErr) throw updateProfErr;

                    // Fire Telemetry Action
                    if (window.logAction) {
                        window.logAction('USER_CONFIG_UPDATED', 'user.management', { target_id: userId, new_role: formValues.roleId }, 'info');
                    }

                    Swal.fire({ icon: 'success', title: 'Updated successfully', showConfirmButton: false, timer: 1500, background: 'var(--card-bg)', color: 'var(--text-main)' });
                    fetchUsers(); // Refresh Table
                }
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        };

        // --- IP ALLOWLIST MANAGEMENT ---
        const fetchAllowlist = async () => {
            const listBody = document.getElementById('allowlist-list-body');
            if (!listBody) return;

            listBody.innerHTML = `<tr><td colspan="5" class="text-center py-4"><div class="spinner-border spinner-border-sm text-info me-2"></div>Loading Allowlist...</td></tr>`;

            try {
                const { data, error } = await window.sb
                    .from('ip_allowlist')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (!data || data.length === 0) {
                    listBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No IP addresses allowlisted yet.</td></tr>`;
                    return;
                }

                listBody.innerHTML = data.map(item => `
                    <tr class="animate__animated animate__fadeIn">
                        <td><code class="text-primary fw-bold" style="font-size: 0.95rem;">${item.ip_address}</code></td>
                        <td><small class="text-secondary font-monospace text-truncate-monospace" title="${item.device_id}">${item.device_id}</small></td>
                        <td><small class="text-muted">${new Date(item.created_at).toLocaleString()}</small></td>
                        <td>
                            <span class="badge ${item.is_active ? 'bg-success' : 'bg-danger'} bg-opacity-75 rounded-pill px-3" style="font-size: 0.75rem;">
                                ${item.is_active ? 'Authorized Access' : 'Access Restricted'}
                            </span>
                        </td>
                        <td class="text-end">
                            <div class="d-flex justify-content-end gap-2">
                                <button class="btn btn-sm btn-outline-${item.is_active ? 'warning' : 'success'} rounded-circle d-flex align-items-center justify-content-center" 
                                    onclick="toggleAllowlistStatus(${item.id}, ${item.is_active})" title="${item.is_active ? 'Revoke Access' : 'Authorize Access'}" style="width:32px; height:32px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                </button>
                                <button class="btn btn-sm btn-outline-danger rounded-circle d-flex align-items-center justify-content-center" onclick="deleteAllowlistEntry(${item.id})" title="Remove Device" style="width:32px; height:32px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            } catch (err) {
                console.error('Fetch Allowlist Error:', err);
                listBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Security table mismatch or network error.</td></tr>`;
            }
        };

        const allowlistTabElement = document.getElementById('allowlist-tab');
        if (allowlistTabElement) {
            allowlistTabElement.addEventListener('click', () => {
                setTimeout(fetchAllowlist, 100);
            });
        }

        window.toggleAllowlistStatus = async (id, currentStatus) => {
            try {
                const { error } = await window.sb
                    .from('ip_allowlist')
                    .update({ is_active: !currentStatus })
                    .eq('id', id);

                if (error) throw error;

                // Fire Telemetry Action
                if (window.logAction) {
                    window.logAction('ALLOWLIST_TOGGLED', 'system.security', { entry_id: id, active: !currentStatus }, 'warning');
                }

                fetchAllowlist();
            } catch (err) {
                Swal.fire('Sync Failed', err.message, 'error');
            }
        };

        window.deleteAllowlistEntry = async (id) => {
            const { isConfirmed } = await Swal.fire({
                title: 'Deauthorize Device?',
                text: 'This terminal will be immediately blocked from the security gate bypassing logic.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Yes, Deauthorize',
                background: 'var(--card-bg)',
                color: 'var(--text-main)'
            });

            if (isConfirmed) {
                try {
                    const { error } = await window.sb
                        .from('ip_allowlist')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;

                    if (window.logAction) {
                        window.logAction('ALLOWLIST_REMOVED', 'system.security', { entry_id: id }, 'critical');
                    }

                    fetchAllowlist();
                } catch (err) {
                    Swal.fire('Action Deleted', err.message, 'error');
                }
            }
        };

        // --- QR SCANNER ENGINE ---
        let html5QrCode = null;
        const SECURITY_KEY = 'inkplus-gate-key-2024';
        let currentFacingMode = "environment";

        window.startScanner = async () => {
            const scannerModalElement = document.getElementById('scannerModal');
            if (!scannerModalElement) return;

            const scannerModalInstance = new bootstrap.Modal(scannerModalElement);
            scannerModalInstance.show();

            const config = {
                fps: 15,
                qrbox: { width: 280, height: 280 },
                aspectRatio: 1.0
            };

            if (html5QrCode) {
                try { await html5QrCode.stop(); } catch (e) { }
            }

            // Reset Modal View to Camera on Open
            const camView = document.getElementById('camera-view');
            const manView = document.getElementById('manual-view');
            const toggleBtn = document.getElementById('toggleScanMode');
            if (camView) camView.classList.remove('d-none');
            if (manView) manView.classList.add('d-none');
            if (toggleBtn) toggleBtn.textContent = 'Use Manual Entry';

            html5QrCode = new Html5Qrcode("qr-reader");

            const onScanSuccess = async (decodedText) => {
                try {
                    await html5QrCode.stop();
                    document.getElementById('qr-reader-results').innerHTML = `<div class="spinner-border spinner-border-sm text-primary"></div> Authorizing...`;

                    // Decrypt Payload
                    const bytes = CryptoJS.AES.decrypt(decodedText, SECURITY_KEY);
                    const rawString = bytes.toString(CryptoJS.enc.Utf8);
                    if (!rawString) throw new Error("Decryption failed - Mismatched Security Token");

                    const decryptedData = JSON.parse(rawString);
                    const ip = decryptedData.i || decryptedData.ip; // handle both old and new
                    const did = decryptedData.d || decryptedData.did;

                    if (!ip || !did) throw new Error("Corrupted Gate Data");

                    // Check if this device is already in the registry (using Device ID as the anchor)
                    const { data: existing } = await window.sb
                        .from('ip_allowlist')
                        .select('id')
                        .eq('device_id', did)
                        .maybeSingle();

                    if (existing) {
                        // Update existing terminal record with the new authorized footprint
                        await window.sb
                            .from('ip_allowlist')
                            .update({
                                ip_address: ip,
                                is_active: true,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existing.id);
                    } else {
                        // Provision new terminal
                        await window.sb.from('ip_allowlist').insert([{
                            ip_address: ip,
                            device_id: did,
                            is_active: true
                        }]);
                    }

                    if (window.logAction) {
                        window.logAction('IP_ALLOWLIST_SCAN_AUTH', 'system.security', { ip: ip, device: did }, 'warning');
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Terminal Authorized',
                        text: `Terminal ${did} has been granted access.`,
                        timer: 2000,
                        showConfirmButton: false,
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)'
                    });

                    scannerModalInstance.hide();
                    fetchAllowlist();
                } catch (err) {
                    console.error('Scan Validation Error:', err);
                    Swal.fire({
                        icon: 'error',
                        title: 'Unauthorized Code',
                        text: err.message || 'The scanned QR code is either invalid or uses an outdated security protocol.',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)'
                    });
                    // Restart
                    html5QrCode.start({ facingMode: currentFacingMode }, config, onScanSuccess);
                }
            };

            try {
                await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);
                currentFacingMode = "environment";
            } catch (err) {
                console.warn("Rear camera failed, falling back to default:", err);
                try {
                    await html5QrCode.start({ facingMode: "user" }, config, onScanSuccess);
                    currentFacingMode = "user";
                } catch (err2) {
                    const resultsEl = document.getElementById('qr-reader-results');
                    if (resultsEl) resultsEl.innerHTML = `<span class="text-danger">Camera Access Denied or Missing</span> - Use Manual entry below.`;
                }
            }
        };

        // --- MANUAL AUTH HANDLER ---
        window.handleManualAuth = async () => {
            const input = document.getElementById('manual-qr-input');
            const decodedText = input ? input.value.trim() : '';

            if (!decodedText) {
                Swal.fire({ icon: 'warning', title: 'Empty Token', text: 'Please paste the encrypted security token.', background: 'var(--card-bg)', color: 'var(--text-main)' });
                return;
            }

            Swal.fire({ title: 'Authorizing...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), background: 'var(--card-bg)', color: 'var(--text-main)' });

            try {
                // Decrypt Payload
                const bytes = CryptoJS.AES.decrypt(decodedText, SECURITY_KEY);
                const rawString = bytes.toString(CryptoJS.enc.Utf8);
                if (!rawString) throw new Error("Verification failed - Mismatched Security Token");

                const decryptedData = JSON.parse(rawString);
                const ip = decryptedData.i || decryptedData.ip;
                const did = decryptedData.d || decryptedData.did;

                if (!ip || !did) throw new Error("Corrupted Gate Data");

                // Check for existing
                const { data: existing } = await window.sb
                    .from('ip_allowlist')
                    .select('id')
                    .eq('device_id', did)
                    .maybeSingle();

                if (existing) {
                    await window.sb.from('ip_allowlist').update({ ip_address: ip, is_active: true, updated_at: new Date().toISOString() }).eq('id', existing.id);
                } else {
                    await window.sb.from('ip_allowlist').insert([{ ip_address: ip, device_id: did, is_active: true }]);
                }

                if (window.logAction) {
                    window.logAction('IP_ALLOWLIST_MANUAL_AUTH', 'system.security', { ip: ip, device: did }, 'warning');
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Terminal Authorized',
                    text: `Terminal ${did} has been granted access via manual token.`,
                    timer: 2000,
                    showConfirmButton: false,
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)'
                });

                // Close Modal
                const scannerModalElement = document.getElementById('scannerModal');
                const scannerModalInstance = bootstrap.Modal.getInstance(scannerModalElement);
                if (scannerModalInstance) scannerModalInstance.hide();

                if (input) input.value = '';
                fetchAllowlist();
            } catch (err) {
                console.error('Manual Validation Error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Unauthorized Code',
                    text: err.message || 'The token is invalid.',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)'
                });
            }
        };

        const toggleScanModeBtn = document.getElementById('toggleScanMode');
        if (toggleScanModeBtn) {
            toggleScanModeBtn.addEventListener('click', () => {
                const camView = document.getElementById('camera-view');
                const manView = document.getElementById('manual-view');
                const camLabel = document.getElementById('switchCameraBtn');

                if (camView && camView.classList.contains('d-none')) {
                    camView.classList.remove('d-none');
                    manView.classList.add('d-none');
                    toggleScanModeBtn.textContent = 'Use Manual Entry';
                    if (camLabel) camLabel.classList.remove('d-none');
                    // Restart Camera
                    window.startScanner();
                } else {
                    if (camView) camView.classList.add('d-none');
                    if (manView) manView.classList.remove('d-none');
                    toggleScanModeBtn.textContent = 'Use Camera Scanner';
                    if (camLabel) camLabel.classList.add('d-none');
                    // Stop Camera
                    if (html5QrCode) {
                        try { html5QrCode.stop(); } catch (e) { }
                    }
                }
            });
        }

        const startScannerBtnElement = document.getElementById('startScannerBtn');
        if (startScannerBtnElement) {
            startScannerBtnElement.addEventListener('click', window.startScanner);
        }

        const switchCameraBtnElement = document.getElementById('switchCameraBtn');
        if (switchCameraBtnElement) {
            switchCameraBtnElement.addEventListener('click', async () => {
                if (!html5QrCode) return;
                currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
                try {
                    await html5QrCode.stop();
                    window.startScanner();
                } catch (e) {
                    console.error("Camera switch failed", e);
                }
            });
        }

        const scannerModalMainElement = document.getElementById('scannerModal');
        if (scannerModalMainElement) {
            scannerModalMainElement.addEventListener('hidden.bs.modal', () => {
                if (html5QrCode) {
                    try { html5QrCode.stop(); } catch (e) { }
                }
            });
        }

    } catch (err) {
        console.error("Global Init Error:", err);
    }
});
