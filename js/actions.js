// actions.js - Audit Trail Application Engine
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Audit Trail Module: Online');

    // Wait for Supabase to be ready
    const waitForSupabase = () => {
        return new Promise(resolve => {
            if (window.sb) return resolve();
            const interval = setInterval(() => {
                if (window.sb) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    };

    await waitForSupabase();

    let allLogs = [];
    const tbody = document.querySelector('#auditTable tbody');
    const searchInput = document.getElementById('searchLogs');
    const filterModule = document.getElementById('filterModule');
    const filterSeverity = document.getElementById('filterSeverity');
    const filterBtn = document.getElementById('btnFilterLogs');

    const statEvents = document.getElementById('statEvents');
    const statFlags = document.getElementById('statFlags');

    // --- User-Friendly Dictionary Mappers --- //
    const mapSignature = (sig) => {
        const dict = {
            'SESSION_INIT': 'User Logged In',
            'SESSION_TERMINATED': 'User Logged Out',
            'ADMIN_FORCED_DISCONNECT': 'Revoked User Session',
            'GLOBAL_SESSION_PURGE': 'Purged All Active Sessions',
            'PROFILE_UPDATED': 'Updated Profile Information',
            'SYSTEM_CONFIG_UPDATED': 'Modified Platform Configuration',
            'SECURITY_PROTOCOL_TOGGLED': 'Toggled Security Protocol',
            'SECURITY_CONFIG_UPDATED': 'Updated Security Parameter',
            'NOTIFICATION_SETTING_CHANGED': 'Changed Notification Priority',
            'MAINTENANCE_MODE_ACTIVATED': 'Platform Lockdown Engaged',
            'FACTORY_RESET_INITIATED': 'System Factory Reset',
            'EMAIL_UPDATED': 'Changed Account Email',
            'PASSWORD_UPDATED': 'Changed Account Password',
            'CATALOG_ENTRY_ADDED': 'Added Service Catalog Item',
            'CATALOG_ENTRY_DELETED': 'Removed Service Catalog Item',
            'TICKET_CREATED': 'Scheduled New Repair Job',
            'TICKET_STATUS_UPDATED': 'Updated Repair Status',
            'USER_PROVISIONED': 'Provisioned New Account',
            'USER_STATUS_TOGGLED': 'Changed User Access Status',
            'USER_CONFIG_UPDATED': 'Modified User Configuration',
            'RECOVERY_APPROVED': 'Approved Password Recovery Update',
            'RECOVERY_REJECTED': 'Rejected Password Recovery Request',
            'ROLE_CREATED': 'Created New System Role',
            'ROLE_PERMS_UPDATED': 'Modified Role Permissions'
        };
        return dict[sig] || sig.replace(/_/g, ' ');
    };

    const mapSubsystem = (sub) => {
        const dict = {
            'user.auth': 'Authentication',
            'user.profile': 'User Accounts',
            'user.security': 'System Security',
            'user.management': 'Administration & Provisioning',
            'services.catalog': 'Service Setup',
            'scheduling.engine': 'Job Scheduling'
        };
        return dict[sub] || sub;
    };

    const mapDetails = (payload) => {
        if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
            return '<span class="text-main opacity-75 small fst-italic">No additional details recorded.</span>';
        }

        let html = '<ul class="list-unstyled mb-0 small text-main opacity-75" style="line-height:1.4;">';
        for (const [key, val] of Object.entries(payload)) {
            let readableKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            let displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            // Replace boolean or empty strings
            if (displayVal === '') displayVal = 'None';
            html += `<li><strong class="text-body-emphasis fw-semibold" style="opacity: 0.8">${readableKey}:</strong> <span class="text-main">${displayVal}</span></li>`;
        }
        html += '</ul>';
        return html;
    };


    // Core Loader
    const loadLogs = async (silent = false) => {
        if (!tbody) return;

        if (!silent) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-main opacity-75"><div class="spinner-border spinner-border-sm me-2"></div> Loading records...</td></tr>';
        }

        try {
            // Ensure Config is available
            if (!window.systemConfig) {
                const { data: config } = await window.sb.from('system_settings').select('*').eq('id', 1).single();
                if (config) window.systemConfig = config;
            }

            const limit = window.systemConfig?.audit_limit || 50;

            const { data: logs, error } = await window.sb
                .from('audit_logs')
                .select(`
                    log_id,
                    trace_time,
                    signature,
                    subsystem,
                    payload,
                    severity,
                    users:user_id (
                        user_id,
                        profiles (first_name, last_name, profile_url)
                    )
                `)
                .order('trace_time', { ascending: false })
                .limit(limit);

            if (error) throw error;

            allLogs = logs || [];
            updateVitals(allLogs);
            renderLogs(allLogs);

        } catch (err) {
            console.error(err);
            if (err.message && err.message.includes('relation "audit_logs" does not exist')) {
                tbody.innerHTML = `
                    <tr><td colspan="5" class="text-center py-5 opacity-75">
                        <svg class="text-warning mb-3" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        <br><strong>System Tracking Needs Setup</strong><br>The audit database table is missing.
                    </td></tr>
                `;
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-danger">Failed to retrieve records.</td></tr>';
            }
        }
    };

    const updateVitals = (logs) => {
        if (statEvents) statEvents.innerText = logs.length;
        const yellowRedFlags = logs.filter(l => l.severity === 'warning' || l.severity === 'critical' || l.severity === 'danger').length;

        if (statFlags) {
            statFlags.innerText = yellowRedFlags.toString().padStart(2, '0');
            const iconBox = document.getElementById('flagIconBox');
            if (yellowRedFlags > 0) {
                statFlags.className = 'h3 fw-bold mb-0 text-warning';
                if (iconBox) iconBox.className = "bg-warning bg-opacity-10 text-warning p-3 rounded-circle me-3";
            } else {
                statFlags.className = 'h3 fw-bold mb-0 text-success';
                if (iconBox) iconBox.className = "bg-success bg-opacity-10 text-success p-3 rounded-circle me-3";
            }
        }
    };

    const renderLogs = (logs) => {
        if (!tbody) return;
        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-main opacity-75 fst-italic">No records match your search criteria.</td></tr>`;
            // Count metrics display removed per instructions
            return;
        }

        let html = '';
        logs.forEach(log => {
            const formattedDate = window.formatDateTime ? window.formatDateTime(log.trace_time) : new Date(log.trace_time).toLocaleString();

            // Clean colors based on severity
            let sev = (log.severity || 'info').toLowerCase();
            let actionBadgeClass = 'bg-primary text-primary';

            if (sev === 'critical') actionBadgeClass = 'bg-danger text-danger border-danger';
            else if (sev === 'danger') actionBadgeClass = 'bg-danger text-danger border-danger';
            else if (sev === 'warning') actionBadgeClass = 'bg-warning text-dark border-warning';
            else actionBadgeClass = 'bg-primary text-primary border-primary';

            // User Formatting
            let profileObj = log.users?.profiles;
            if (Array.isArray(profileObj)) profileObj = profileObj[0];
            const name = profileObj ? (profileObj.first_name + ' ' + profileObj.last_name).trim() : 'System Origin';
            const avatarUrl = profileObj?.profile_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=334155&color=fff`;

            // Friendly Interpretations
            const friendlyAction = mapSignature(log.signature);
            const friendlyModule = mapSubsystem(log.subsystem);
            const detailsHtml = mapDetails(log.payload);

            html += `
                <tr class="transition-all hover-lift" style="border-bottom: 1px solid var(--bs-border-color-translucent);">
                    <td class="ps-4 align-middle" style="line-height: 1.2;">
                        ${formattedDate}
                    </td>
                    <td class="align-middle">
                        <div class="d-flex align-items-center">
                            <div class="flex-shrink-0 shadow-sm border border-light border-opacity-10 me-2" style="background-image: url('${avatarUrl}'); width: 35px; height: 35px; border-radius: 50%; background-size: cover; background-position: center;"></div>
                            <span class="fw-medium text-body-emphasis">${name}</span>
                        </div>
                    </td>
                    <td class="align-middle">
                        <span class="fw-bold text-body-emphasis d-block">${friendlyAction}</span>
                        ${sev !== 'info' ? `<span class="badge ${actionBadgeClass} bg-opacity-10 border opacity-75 fw-semibold mt-1 px-2" style="font-size: 0.65rem; text-transform: uppercase;">${sev} Event</span>` : ''}
                    </td>
                    <td class="align-middle">
                        <span class="badge bg-body-secondary text-main opacity-75 fw-medium px-2 py-1 shadow-sm border border-light border-opacity-10">${friendlyModule}</span>
                    </td>
                    <td class="pe-4 align-middle">
                        <div class="bg-body-tertiary rounded-3 p-2 border border-light border-opacity-10">
                            ${detailsHtml}
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        // Count metrics display removed per instructions
    };

    // Instant Filters Logic
    let filterTimeout;
    const applyFilters = () => {
        clearTimeout(filterTimeout);

        // Add a subtle UX hint that it's filtering
        if (tbody) tbody.style.opacity = '0.5';

        filterTimeout = setTimeout(() => {
            const query = (searchInput?.value || '').toLowerCase();
            let filtered = allLogs;

            if (query) {
                filtered = filtered.filter(l =>
                    JSON.stringify(l.payload).toLowerCase().includes(query) ||
                    mapSignature(l.signature).toLowerCase().includes(query) ||
                    mapSubsystem(l.subsystem).toLowerCase().includes(query) ||
                    (l.users?.profiles && JSON.stringify(l.users.profiles).toLowerCase().includes(query))
                );
            }

            // Subsystem filter
            if (filterModule && filterModule.value !== 'All Modules') {
                const mappedSub = filterModule.value.toLowerCase();
                filtered = filtered.filter(l => l.subsystem.toLowerCase().includes(mappedSub));
            }

            // Severity filter
            if (filterSeverity && !filterSeverity.value.includes('All')) {
                const allowedSev = filterSeverity.value.toLowerCase();
                filtered = filtered.filter(l => (l.severity || '').toLowerCase() === allowedSev);
            }

            renderLogs(filtered);
            if (tbody) tbody.style.opacity = '1';
        }, 150); // slight debounce
    };

    // Attach automatic real-time listeners
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterModule) filterModule.addEventListener('change', applyFilters);
    if (filterSeverity) filterSeverity.addEventListener('change', applyFilters);

    // Load initial
    loadLogs();

    // --- BULLETPROOF FAUX-REALTIME HEARTBEAT ---
    // If Supabase replication is not manually turned on by the Database Admin, native web-sockets will fail.
    // Instead, we use an ultra-lightweight silent poller checking ONLY the single newest record every 2 seconds.
    setInterval(async () => {
        try {
            // Is there a search filter applied? Don't interrupt user typing.
            if (searchInput && searchInput.value.trim().length > 0) return;

            const { data } = await window.sb.from('audit_logs')
                .select('log_id')
                .order('trace_time', { ascending: false })
                .limit(1)
                .single();

            if (data && allLogs.length > 0) {
                // If the top log in the database differs from our top local array log
                if (data.log_id !== allLogs[0].log_id) {
                    console.log("[Audit Trail] Background mutation detected. Executing silent sync.");
                    loadLogs(true); // 'true' = silent mode to prevent flashing the "loading..." text
                }
            }
        } catch (e) {
            // Ignore minor network hiccups
        }
    }, 2000);
});
