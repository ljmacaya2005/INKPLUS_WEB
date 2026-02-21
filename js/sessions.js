// sessions.js - Session Management & Live Registry Sync
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sessions module loaded');

    // Wait for Supabase to initialize
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
        console.log("Supabase connected in Sessions.");
        await fetchAndRenderSessions();
    } catch (err) {
        console.error("Fatal Error initializing Sessions Module: ", err);
        const container = document.getElementById('sessionsTableBody');
        if (container) {
            container.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-5">
                <p><strong>Failed to synchronize with cloud database.</strong></p>
                <button class="btn btn-outline-danger btn-sm mt-3" onclick="window.location.reload()">Retry Connection</button>
            </td></tr>`;
        }
    }

    // --- PURGE ALL SESSIONS ---
    const purgeBtn = document.getElementById('terminateAllBtn');
    if (purgeBtn) {
        purgeBtn.addEventListener('click', async () => {
            Swal.fire({
                title: 'Purge All Sessions?',
                text: 'This will forcefully disconnect everyone except the database owner.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Yes, Purge All'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        // 1. Mark visually offline on admin grid
                        const { error } = await window.sb
                            .from('users')
                            .update({ is_online: false })
                            .neq('user_id', localStorage.getItem('user_id')); // Keep current admin logged in

                        if (error) throw error;

                        // 2. Kill actual active session registries
                        await window.sb
                            .from('login_sessions')
                            .update({ ended_at: new Date().toISOString() })
                            .neq('user_id', localStorage.getItem('user_id'))
                            .is('ended_at', null);

                        Swal.fire('Purged', 'All other active sessions have been terminated from the cloud.', 'success');
                        fetchAndRenderSessions(); // re-sync
                    } catch (err) {
                        console.error('Purge error:', err);
                        Swal.fire('Error', 'Failed to purge sessions. Check console.', 'error');
                    }
                }
            });
        });
    }
});

// --- CORE FETCH FUNCTION ---
async function fetchAndRenderSessions() {
    const tbody = document.getElementById('sessionsTableBody');
    if (!tbody) return;

    try {
        // We fetch active users (is_online = true) mapped to their profiles
        const { data: onlineUsers, error } = await window.sb
            .from('users')
            .select(`
                *,
                profiles (first_name, last_name, email),
                roles (role_name)
            `)
            .eq('is_online', true)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Update Stat Cards
        document.getElementById('totalActiveStat').textContent = onlineUsers ? onlineUsers.length.toString().padStart(2, '0') : '00';
        document.getElementById('peakTodayStat').textContent = onlineUsers && onlineUsers.length > 5 ? onlineUsers.length.toString().padStart(2, '0') : '08'; // Example logic
        document.getElementById('incidentsStat').textContent = '00'; // Baseline

        if (!onlineUsers || onlineUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-secondary">
                <div class="mb-3"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="opacity-50"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div>
                <h6 class="fw-bold mb-1">No Active Sessions</h6>
                <span class="small">The master network currently detects no authenticated users.</span>
            </td></tr>`;
            return;
        }

        let htmlPayload = '';
        const myUserId = localStorage.getItem('user_id');

        onlineUsers.forEach(u => {
            const firstName = u.profiles?.first_name || 'System';
            const lastName = u.profiles?.last_name || 'User';
            const email = u.profiles?.email || 'N/A';
            const roleName = u.roles?.role_name || 'Guest';
            const initials = firstName.charAt(0) + (lastName !== 'User' ? lastName.charAt(0) : '');

            const isMe = u.user_id === myUserId;
            const networkIP = u.current_ip || (isMe ? '192.168.1.1 (Local)' : 'Remote Network');
            const device = u.current_device || 'Unknown Web Agent';

            const activeSince = new Date(u.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

            // Generate visual style
            let avatarClass = isMe ? 'bg-primary shadow-sm' : 'bg-info shadow-sm';
            let controlBtnHtml = isMe
                ? '<span class="badge bg-primary text-white px-3 py-2 rounded-pill shadow-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> YOU</span>'
                : `<button class="btn btn-sm btn-outline-danger px-3 rounded-pill fw-medium hover-lift terminate-btn shadow-sm" data-id="${u.user_id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg> Disconnect</button>`;

            htmlPayload += `
                <tr class="${isMe ? 'opacity-100 bg-primary bg-opacity-10' : 'transition-all hover-lift'}" style="${isMe ? 'border-left: 3px solid var(--primary-color);' : ''}">
                    <td class="ps-4 py-3">
                        <div class="d-flex align-items-center">
                            <div class="session-avatar ${avatarClass} text-white me-3">${initials.toUpperCase()}</div>
                            <div>
                                <div class="fw-bold tracking-tight text-main mb-0">${firstName} ${lastName}</div>
                                <div class="small text-secondary mt-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1 opacity-50"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>${email}</div>
                            </div>
                        </div>
                    </td>
                    <td class="py-3"><code class="${isMe ? 'text-primary' : 'text-main opacity-75'} fw-bold border border-light border-opacity-10 px-2 py-1 bg-body-tertiary rounded-3 shadow-sm">${networkIP}</code></td>
                    <td class="py-3">
                        <div class="d-flex align-items-center text-main">
                            <svg class="me-2 text-primary opacity-75" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            <span class="small fw-medium">${device}</span>
                        </div>
                    </td>
                    <td class="py-3">
                        <div class="d-flex flex-column align-items-start">
                            <span class="badge bg-success text-white rounded-pill px-3 shadow-sm mb-1"><span class="badge-pulse d-inline-block me-1" style="width:6px;height:6px;background:white"></span> Active Now</span>
                            <span class="text-secondary smaller mt-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" class="me-1" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Since ${activeSince}</span>
                        </div>
                    </td>
                    <td class="pe-4 text-end py-3">
                        ${controlBtnHtml}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = htmlPayload;

        // Re-attach individual disconnect listeners
        document.querySelectorAll('.terminate-btn').forEach(btn => {
            btn.addEventListener('click', handleDisconnectUser);
        });

    } catch (err) {
        console.error("Session Fetching Error:", err);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Failed to load registry network matrix.</td></tr>`;
    }
}

// --- HANDLE INDIVIDUAL DISCONNECT ---
function handleDisconnectUser(e) {
    const targetUserId = e.currentTarget.getAttribute('data-id');

    Swal.fire({
        title: 'Disconnect User?',
        text: 'This user will be logged out of their current session immediately.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Disconnect'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // 1. Mark visually offline on the admin grid
                const { error } = await window.sb
                    .from('users')
                    .update({ is_online: false })
                    .eq('user_id', targetUserId);

                if (error) throw error;

                // 2. Terminate the actual login_session records natively so their local heartbeat catches it
                await window.sb
                    .from('login_sessions')
                    .update({ ended_at: new Date().toISOString() })
                    .eq('user_id', targetUserId)
                    .is('ended_at', null);

                Swal.fire('Disconnected', 'User session terminated from the cloud registry.', 'success')
                    .then(() => {
                        fetchAndRenderSessions(); // Refresh table visually
                    });
            } catch (err) {
                console.error("Disconnect error: ", err);
                Swal.fire('Error', 'Failed to disconnect user. Check console.', 'error');
            }
        }
    });
}
