/* tracker.js - Realtime Repair Status Tracker Ecosystem */
document.addEventListener('DOMContentLoaded', async () => {
    const searchBtn = document.getElementById('btnSearch');
    const resultCard = document.getElementById('resultCard');
    const searchCard = document.getElementById('searchCard');
    const trackerForm = document.getElementById('trackerForm');
    const splash = document.getElementById('splash');

    // Hide search card initially to let splash screen run smoothly without overlap
    if (searchCard) {
        searchCard.style.display = 'none';
        searchCard.classList.remove('animate__fadeInUp');
    }

    // Wait for Supabase to initialize seamlessly
    const waitForSupabase = () => {
        return new Promise(resolve => {
            if (window.sb) return resolve(window.sb);
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (window.sb) {
                    clearInterval(interval);
                    resolve(window.sb);
                } else if (attempts > 50) { // 5-second timeout safeguard
                    clearInterval(interval);
                    resolve(null);
                }
            }, 100);
        });
    };

    const initTrackerView = async () => {
        const sb = await waitForSupabase();

        let splashEnabled = true;

        if (sb) {
            try {
                const { data: config } = await sb.from('system_settings').select('splash_enabled').eq('id', 1).maybeSingle();
                if (config) splashEnabled = config.splash_enabled ?? true;
            } catch (e) {
                console.warn("Tracker Settings check failed, using defaults.");
            }
        }

        const revealTracker = () => {
            if (splash) splash.classList.add('hidden');
            setTimeout(() => {
                if (searchCard) {
                    searchCard.style.display = 'block';
                    searchCard.classList.add('animate__animated', 'animate__fadeInUp');
                    const ticketIdInput = document.getElementById('ticketIdInput');
                    if (ticketIdInput) ticketIdInput.focus();
                }
            }, 300);
        };

        if (splashEnabled) {
            if (splash) splash.style.display = 'flex';
            setTimeout(revealTracker, 2200);
        } else {
            if (splash) splash.style.display = 'none';
            revealTracker();
        }
    };

    // Fire up initialization
    initTrackerView();

    if (searchBtn && trackerForm) {
        // Tracker input formatting
        const ticketIdInput = document.getElementById('ticketIdInput');
        if (ticketIdInput) {
            ticketIdInput.addEventListener('input', function (e) {
                let val = this.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                if (!val.startsWith('INK-') && val.length > 0) {
                    val = val.replace(/^INK-?/, '');
                    if (val.length > 0) val = 'INK-' + val;
                }
                this.value = val;
            });
        }

        trackerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rawInput = ticketIdInput.value.trim().toUpperCase();

            // Validate standard length & structure
            if (!rawInput) {
                Swal.fire('Required Field', 'Please enter a valid Ticket Reference Code.', 'warning');
                return;
            }

            // Lock UI & Initialize Search Protocol
            searchBtn.disabled = true;
            searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Searching Database...';

            const sb = await waitForSupabase();
            if (!sb) {
                Swal.fire('Connection Error', 'Cannot reach the master server. Please check your internet.', 'error');
                searchBtn.disabled = false;
                searchBtn.innerHTML = 'Track Repair';
                return;
            }

            try {
                // Securely query public repair tickets
                const { data: ticket, error } = await sb
                    .from('repair_tickets')
                    .select('ticket_code, device_brand, device_model, status, created_at, service_category')
                    .eq('ticket_code', rawInput)
                    .single();

                if (error || !ticket) {
                    console.warn("Tracker Query Exception:", error);
                    // UX: Artificial delay so it feels like it checked deeply
                    setTimeout(() => {
                        Swal.fire({
                            title: 'Ticket Not Found',
                            text: `We couldn't locate any record matching reference "${rawInput}". Please double check your receipt.`,
                            icon: 'error',
                            confirmButtonColor: 'var(--primary-color)'
                        });
                        searchBtn.disabled = false;
                        searchBtn.innerHTML = 'Track Repair';
                    }, 600);
                    return;
                }

                // If found, populate dynamic visualizer
                setTimeout(() => {
                    populateResultUI(ticket);
                    searchBtn.disabled = false;
                    searchBtn.innerHTML = 'Track Repair';
                }, 400);

            } catch (err) {
                console.error("Critical Tracker Fault:", err);
                Swal.fire('System Error', 'An unexpected interference occurred communicating with the cloud.', 'error');
                searchBtn.disabled = false;
                searchBtn.innerHTML = 'Track Repair';
            }
        });
    }

    // --- Polling and Live State ---
    let liveTrackerInterval = null;
    let activeTrackerCode = null;

    function startLiveTracking(code) {
        if (liveTrackerInterval) clearInterval(liveTrackerInterval);
        activeTrackerCode = code;

        // High-speed silent polling without visual disruption
        liveTrackerInterval = setInterval(async () => {
            if (!activeTrackerCode) return;
            const sb = window.sb;
            if (!sb) return;

            const { data, error } = await sb
                .from('repair_tickets')
                .select('ticket_code, device_brand, device_model, status, created_at, service_category')
                .eq('ticket_code', activeTrackerCode)
                .single();

            if (data && !error) {
                populateResultUI(data, true);
            }
        }, 5000); // 5-second live sync
    }

    function stopLiveTracking() {
        if (liveTrackerInterval) clearInterval(liveTrackerInterval);
        activeTrackerCode = null;
    }

    // --- Dynamic UI Population Logic ---
    function populateResultUI(t, isSilent = false) {
        if (!resultCard) return;

        if (!isSilent) {
            // Hide search form entirely by sliding it up, slide in result card
            if (searchCard) {
                searchCard.classList.remove('animate__fadeInUp');
                searchCard.classList.add('animate__fadeOutUp');
                setTimeout(() => {
                    searchCard.style.display = 'none';
                    resultCard.style.display = 'block';
                    resultCard.classList.remove('animate__fadeOutDown');
                    resultCard.classList.add('animate__animated', 'animate__fadeInUp');
                }, 300); // Wait for fade out
            } else {
                resultCard.style.display = 'block';
                resultCard.classList.add('animate__animated', 'animate__fadeInUp');
            }
            startLiveTracking(t.ticket_code);
        }

        // Map data to DOM Elements safely
        document.getElementById('resTicketId').textContent = t.ticket_code;
        document.getElementById('resDevice').innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="me-2" stroke="currentColor" stroke-width="2" style="position:relative;top:-2px"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>${t.device_brand || ''} ${t.device_model || 'Unknown Device'}`;

        const dateObj = new Date(t.created_at);
        document.getElementById('resDate').innerHTML = `<strong>Dropped off:</strong> ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        const expectedCont = document.getElementById('resExpectedDate');
        const expectedVal = document.getElementById('valExpectedDate');
        if (t.expected_completion) {
            const expObj = new Date(t.expected_completion);
            expectedVal.textContent = expObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            if (expectedCont) expectedCont.classList.remove('d-none');
        } else {
            if (expectedCont) expectedCont.classList.add('d-none');
        }

        const statusRaw = (t.status || 'Pending').toLowerCase();
        const categoryRaw = (t.service_category || '').toLowerCase();
        const isRepair = categoryRaw === '' || categoryRaw.includes('repair') || categoryRaw.includes('hardware') || categoryRaw.includes('ink');

        let sTitle = t.status || 'Pending';
        let sColor = 'var(--bs-primary)';
        let sBg = 'rgba(74, 144, 164, 0.1)';
        let sDesc = isRepair ? 'Hardware analysis and queue placement initializing.' : 'Service request safely recorded and initializing in queue.';

        let progressWidth = '0%';
        let activeStepIndex = 0;

        // Advanced Status Matrix Mapping
        if (statusRaw === 'pending') {
            sColor = '#f39c12'; // Warning tone
            sBg = 'rgba(243, 156, 18, 0.1)';
            sDesc = isRepair ? 'Device securely received. Awaiting technician assignment.' : 'Service request confirmed. Awaiting staff assignment.';
            activeStepIndex = 0;
            progressWidth = '0%';
        } else if (statusRaw === 'diagnosing') {
            sColor = '#0dcaf0'; // Info tone
            sBg = 'rgba(13, 202, 240, 0.1)';
            sDesc = isRepair ? 'Technician is actively isolating faults and verifying hardware.' : 'Request is being prepared and assessed by staff.';
            activeStepIndex = 1;
            progressWidth = '25%';
        } else if (statusRaw.includes('repair') || statusRaw === 'active' || statusRaw === 'in progress') {
            sColor = 'var(--bs-primary)'; // Primary tone
            sBg = 'rgba(74, 144, 164, 0.1)';
            sDesc = isRepair ? 'Authorized repairs and components substitution currently underway.' : 'Service is actively in processing and execution phase.';
            sTitle = 'In Progress';
            activeStepIndex = 2;
            progressWidth = '50%';
        } else if (statusRaw === 'ready' || statusRaw === 'awaiting pickup') {
            sColor = '#20c997'; // Teal success
            sBg = 'rgba(32, 201, 151, 0.1)';
            sDesc = isRepair ? 'Repair successful! Device has passed QA and is ready for collection.' : 'Service completed! Ready for release/collection.';
            sTitle = 'Ready for Pickup';
            activeStepIndex = 3;
            progressWidth = '75%';
        } else if (statusRaw === 'completed' || statusRaw === 'resolved' || statusRaw === 'picked up' || statusRaw === 'done') {
            sColor = '#198754'; // Darker success
            sBg = 'rgba(25, 135, 84, 0.1)';
            sDesc = isRepair ? 'Ticket finalized. Device returned to owner.' : 'Service delivery finalized and closed.';
            sTitle = 'Completed';
            activeStepIndex = 4;
            progressWidth = '100%';
        }

        // Apply dynamic Stepper Labels (Index 1 and 2)
        const diagLabel = document.querySelector('#step-diagnosing .step-label');
        if (diagLabel) diagLabel.textContent = isRepair ? 'Diagnosing' : 'Preparing';

        const repairLabel = document.querySelector('#step-repairing .step-label');
        if (repairLabel) repairLabel.textContent = isRepair ? 'Repairing' : 'Processing';

        // Apply dynamically engineered aesthetics
        const resStatus = document.getElementById('resStatus');
        const statusContainer = resStatus.closest('.status-indicator');
        const progBar = document.getElementById('resProgressBar');

        resStatus.textContent = sTitle;
        resStatus.style.color = sColor;
        document.getElementById('resStatusDesc').textContent = sDesc;

        if (statusContainer) {
            statusContainer.style.backgroundColor = sBg;
            statusContainer.style.borderColor = sColor;
        }

        if (progBar && !isSilent) {
            progBar.style.width = '0%';
            progBar.style.backgroundColor = sColor;

            setTimeout(() => {
                progBar.style.width = progressWidth;
            }, 150);
        } else if (progBar) {
            progBar.style.backgroundColor = sColor;
            progBar.style.width = progressWidth;
        }

        // Stepper Visuals Logic
        const domNodes = [
            document.getElementById('step-pending'),
            document.getElementById('step-diagnosing'),
            document.getElementById('step-repairing'),
            document.getElementById('step-ready'),
            document.getElementById('step-completed')
        ];

        domNodes.forEach((node, index) => {
            if (!node) return;
            node.classList.remove('active', 'completed');
            if (index < activeStepIndex) {
                node.classList.add('completed');
            } else if (index === activeStepIndex) {
                if (activeStepIndex === 4) node.classList.add('completed'); // Last node becomes fully complete
                else node.classList.add('active');
            }
        });
    }

    // --- Universal Reset ---
    window.resetTracker = function () {
        stopLiveTracking();
        if (resultCard && searchCard) {
            resultCard.classList.remove('animate__fadeInUp');
            resultCard.classList.add('animate__fadeOutDown');

            setTimeout(() => {
                resultCard.style.display = 'none';
                searchCard.style.display = 'block';
                searchCard.classList.remove('animate__fadeOutUp');
                searchCard.classList.add('animate__animated', 'animate__fadeInUp');
                document.getElementById('trackerForm').reset();
                document.getElementById('ticketIdInput').focus();
            }, 300);
        }
    };
});
