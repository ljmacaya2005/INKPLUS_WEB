/* settings.js - Global Platform Engine (Maximum Persistence) */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Settings Module: Maximum Strength Engaged');

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

    const settingsForm = document.getElementById('settingsForm');

    // 1. Unified Configuration Loader
    const loadSettings = async () => {
        try {
            const { data: config, error } = await window.sb
                .from('system_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (config) {
                // General Tab
                if (document.getElementById('timezone')) document.getElementById('timezone').value = config.timezone || 'UTC+8';
                if (document.getElementById('dateFormat')) document.getElementById('dateFormat').value = config.date_format || 'DD-MM-YYYY';
                if (document.getElementById('timeFormat')) document.getElementById('timeFormat').value = config.time_format || '24h';
                if (document.getElementById('auditLimit')) document.getElementById('auditLimit').value = config.audit_limit || '50';
                if (document.getElementById('splashEnabled')) document.getElementById('splashEnabled').checked = config.splash_enabled ?? true;

                // Security Tab
                if (document.getElementById('auditPersistence')) document.getElementById('auditPersistence').checked = config.audit_persistence || false;
                if (document.getElementById('lockThreshold')) document.getElementById('lockThreshold').value = config.lock_threshold || '30';

                // Notifications Tab
                if (document.getElementById('not-1')) document.getElementById('not-1').checked = config.notif_transactions ?? true;
                if (document.getElementById('not-2')) document.getElementById('not-2').checked = config.notif_new_users ?? true;

                // Danger Zone
                if (document.getElementById('maintenanceMode')) document.getElementById('maintenanceMode').checked = config.maintenance_mode || false;
            }
        } catch (err) {
            console.warn("Configuration load error: ", err);
        }
    };

    // 2. Handle Global Sync (General Tab)
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            let auditLimit = parseInt(document.getElementById('auditLimit').value);
            if (isNaN(auditLimit) || auditLimit < 1) auditLimit = 50;
            if (auditLimit > 1000) auditLimit = 1000;

            const payload = {
                timezone: document.getElementById('timezone').value,
                date_format: document.getElementById('dateFormat').value,
                time_format: document.getElementById('timeFormat').value,
                audit_limit: auditLimit,
                updated_at: new Date().toISOString()
            };

            const btnSync = document.getElementById('btnSyncGlobal');
            const ogHtml = btnSync.innerHTML;

            Swal.fire({
                title: 'Sync Global Config?',
                text: 'Changes will propagate to all system modules.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Sync'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    if (btnSync) {
                        btnSync.disabled = true;
                        btnSync.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>&nbsp;<span>Syncing...</span>`;
                    }
                    try {
                        const { error } = await window.sb.from('system_settings').upsert([{ id: 1, ...payload }]);
                        if (error) throw error;

                        if (window.logAction) {
                            await window.logAction('SYSTEM_CONFIG_UPDATED', 'user.management', { section: 'General', fields: Object.keys(payload) }, 'warning');
                        }
                        Swal.fire('Synchronized', 'Global environment variables updated.', 'success');
                    } catch (err) {
                        Swal.fire('Sync Failed', err.message, 'error');
                    } finally {
                        if (btnSync) {
                            btnSync.disabled = false;
                            btnSync.innerHTML = ogHtml;
                        }
                    }
                }
            });
        });
    }

    // 3. Handle All Toggles (Security, Notifications, Splash, Maintenance)
    document.querySelectorAll('.security-toggle, .notification-toggle').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            const key = e.target.getAttribute('data-key');
            const val = e.target.checked;
            const label = e.target.closest('.list-group-item, .form-check')?.innerText.split('\n')[0].trim() || 'Feature';

            try {
                const { error } = await window.sb.from('system_settings').upsert([{ id: 1, [key]: val, updated_at: new Date().toISOString() }]);
                if (error) throw error;

                // Specific logging for maintenance mode
                if (key === 'maintenance_mode') {
                    if (window.logAction) {
                        await window.logAction(val ? 'MAINTENANCE_MODE_ACTIVATED' : 'MAINTENANCE_MODE_DEACTIVATED', 'user.security', { state: val ? 'LOCKED' : 'OPEN' }, val ? 'critical' : 'info');
                    }
                } else {
                    if (window.logAction) {
                        await window.logAction('SETTING_TOGGLED', 'user.management', { feature: label, state: val ? 'Enabled' : 'Disabled' }, 'info');
                    }
                }

                Swal.fire({
                    toast: true,
                    position: 'bottom-start',
                    icon: val ? 'success' : 'info',
                    title: `${label} ${val ? 'Enabled' : 'Disabled'}`,
                    showConfirmButton: false,
                    timer: 2000
                });
            } catch (err) {
                e.target.checked = !val;
                Swal.fire('Failed', err.message, 'error');
            }
        });
    });

    // 4. Threshold Select Handler
    const thresholdSelect = document.getElementById('lockThreshold');
    if (thresholdSelect) {
        thresholdSelect.addEventListener('change', async (e) => {
            const val = e.target.value;
            try {
                await window.sb.from('system_settings').upsert([{ id: 1, lock_threshold: val, updated_at: new Date().toISOString() }]);
                if (window.logAction) {
                    await window.logAction('SECURITY_CONFIG_UPDATED', 'user.security', { parameter: 'Auto-Lock Threshold', value: val }, 'info');
                }
                Swal.fire({ toast: true, position: 'bottom-start', icon: 'success', title: 'Threshold Saved', showConfirmButton: false, timer: 1500 });
            } catch (err) { console.error(err); }
        });
    }

    // 5. Factory Reset
    const btnReset = document.getElementById('btnFactoryReset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            Swal.fire({
                title: 'Wipe Platform Data?',
                html: '<span class="text-danger">CRITICAL: This is irreversible.</span><br><br>Type <b>RESET</b> below to confirm.',
                input: 'text',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ff0000',
                confirmButtonText: 'Reset Everything',
                preConfirm: (inputValue) => {
                    if (inputValue !== 'RESET') {
                        Swal.showValidationMessage('You must type RESET perfectly to confirm');
                    }
                }
            }).then(async (res) => {
                if (res.isConfirmed) {
                    if (window.logAction) await window.logAction('FACTORY_RESET_INITIATED', 'user.security', { event: 'Global System Purge' }, 'critical');

                    Swal.fire({
                        title: 'Platform Resetting...',
                        html: 'Purging all local states.',
                        timer: 2000,
                        timerProgressBar: true,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    }).then(() => {
                        window.location.reload();
                    });
                }
            });
        });
    }

    loadSettings();
});
