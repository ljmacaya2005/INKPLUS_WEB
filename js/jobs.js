// jobs.js - Job Tracking & Live Management

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Jobs module loaded');

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
        console.log("Supabase connected in Jobs.");
        await fetchAndRenderJobs();
    } catch (err) {
        console.error("Fatal Error initializing Jobs Module: ", err);
        const container = document.getElementById('jobs-container');
        if (container) {
            container.innerHTML = `<div class="col-12 text-center text-danger py-5">
                <p><strong>Failed to synchronize with cloud database.</strong></p>
                <button class="btn btn-outline-danger btn-sm mt-3" onclick="window.location.reload()">Retry Connection</button>
            </div>`;
        }
    }
});

// Main Fetch Engine
async function fetchAndRenderJobs() {
    const container = document.getElementById('jobs-container');
    if (!container) return;

    try {
        const { data: tickets, error } = await window.sb
            .from('repair_tickets')
            .select(`
                *,
                customers (first_name, last_name, phone_number)
            `)
            .neq('status', 'Done')
            .neq('status', 'Completed')
            .neq('status', 'Failed')
            .neq('status', 'Cancelled')
            .neq('status', 'Unrepairable')
            .neq('status', 'Refunded')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!tickets || tickets.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                <img src="assets/empty.svg" alt="No Jobs" style="max-width: 150px; opacity: 0.5;" class="mb-3 d-none">
                    <h5 class="text-secondary fw-bold">No Active Jobs Found</h5>
                    <p class="text-secondary small mt-2">All tasks are completed or no new jobs have been scheduled.</p>
                </div>
            `;
            return;
        }

        // Wipe container and build payload
        container.innerHTML = '';
        let htmlPayload = '';

        tickets.forEach(ticket => {
            const customerName = ticket.customers ? `${ticket.customers.first_name} ${ticket.customers.last_name}` : 'Unknown';
            const customerPhone = ticket.customers?.phone_number || 'N/A';
            const brand = ticket.device_brand || '';
            const createdDate = window.formatDateTime ? window.formatDateTime(ticket.created_at) : new Date(ticket.created_at).toLocaleString();

            // Map UI Badge Colors based on status
            let badgeClass = 'bg-secondary';
            if (ticket.status === 'Pending') badgeClass = 'bg-warning text-dark';
            if (ticket.status === 'Diagnosing') badgeClass = 'bg-info text-dark';
            if (ticket.status === 'Repairing') badgeClass = 'bg-primary text-white';
            if (ticket.status === 'Ready') badgeClass = 'bg-success text-white';

            htmlPayload += `
            <div class="col-md-6 col-xl-4 animate__animated animate__zoomIn animate__faster">
            <div class="card h-100 border-0 shadow-sm rounded-4 position-relative overflow-hidden transition-all hover-lift bg-body-tertiary border border-light border-opacity-10" style="backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);">

                <!-- Top Progress Bar (Visual indicator) -->
                <div class="position-absolute top-0 start-0 w-100 shadow-sm" style="height: 6px; background-color: var(--bs-${badgeClass.includes('warning') ? 'warning' : badgeClass.includes('info') ? 'info' : badgeClass.includes('success') ? 'success' : badgeClass.includes('primary') ? 'primary' : 'secondary'});"></div>

                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="fw-black mb-1 text-main tracking-tight" style="font-weight: 800;">${customerName}</h5>
                            <p class="small text-secondary mb-0"><i class="text-primary fw-bold font-monospace">${ticket.ticket_code}</i></p>
                        </div>
                        <span class="badge ${badgeClass} rounded-pill px-3 py-2 shadow-sm fw-bold" style="letter-spacing: 0.5px; font-size: 0.70rem;">${ticket.status.toUpperCase()}</span>
                    </div>

                    <div class="p-3 rounded-4 mb-4 shadow-sm" style="background: rgba(var(--bs-primary-rgb), 0.04); border: 1px solid rgba(var(--bs-primary-rgb), 0.08);">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="small text-secondary fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Device</span>
                            <span class="small fw-bold text-main">${brand} ${ticket.device_model}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="small text-secondary fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Category</span>
                            <span class="small fw-bold text-main text-end">${ticket.service_category}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="small text-secondary fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">Contact</span>
                            <span class="small fw-bold text-main font-monospace">${customerPhone}</span>
                        </div>
                    </div>

                    <div class="mb-4">
                        <p class="small text-secondary fw-bold text-uppercase mb-2" style="font-size: 0.65rem; letter-spacing: 0.5px;">Issue / Description</p>
                        <p class="small text-main mb-0 text-truncate fst-italic" style="max-height: 40px; overflow: hidden;" title="${ticket.issue_description}">"${ticket.issue_description || 'No description provided.'}"</p>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mt-auto pt-4 border-top border-light border-opacity-10">
                        <div class="small text-secondary fw-medium d-flex align-items-center" style="font-size: 0.75rem;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="me-2 text-primary opacity-75" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            ${createdDate}
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-light border-0 rounded-pill px-3 shadow-sm hover-lift text-main fw-bold" onclick="viewJobPanel(this)" data-ticket="${encodeURIComponent(JSON.stringify(ticket).replace(/'/g, '&#39;'))}" style="background: rgba(var(--bs-primary-rgb), 0.1);">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> View
                            </button>
                            <button class="btn btn-sm btn-primary rounded-pill px-3 shadow-sm hover-lift fw-bold update-status-btn"
                                data-id="${ticket.ticket_id}"
                                data-code="${ticket.ticket_code}"
                                data-status="${ticket.status}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><path d="M2 12h4l2-9 5 18 2-9h4"></path></svg> Update
                            </button>
                        </div>
                    </div>
                </div>
            </div>
                </div>
            `;
        });

        container.innerHTML = htmlPayload;

        // Attach Event Listeners to New Buttons
        document.querySelectorAll('.update-status-btn').forEach(btn => {
            btn.addEventListener('click', handleStatusUpdate);
        });

    } catch (error) {
        console.error("Job Fetching Error:", error);
        container.innerHTML = `<div class="col-12 text-center text-danger py-5"><strong>Failed to load jobs matrix.</strong></div>`;
    }
}

// Handle Admin Updating a Ticket Status
function handleStatusUpdate(e) {
    const btn = e.currentTarget;
    const ticketId = btn.getAttribute('data-id');
    const ticketCode = btn.getAttribute('data-code');
    const currentStatus = btn.getAttribute('data-status');

    Swal.fire({
        title: 'Update Progress Status',
        html: `
            <h6 class="font-monospace text-primary mb-3">Ticket: ${ticketCode}</h6>
            <select id="newStatusSelect" class="form-select form-select-lg mb-3">
                <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Diagnosing" ${currentStatus === 'Diagnosing' ? 'selected' : ''}>Diagnosing</option>
                <option value="Repairing" ${currentStatus === 'Repairing' ? 'selected' : ''}>Repairing</option>
                <option value="Done" ${currentStatus === 'Done' ? 'selected' : ''}>Done (Success Archive)</option>
                <option value="Failed" ${currentStatus === 'Failed' ? 'selected' : ''}>Failed (Fail Archive)</option>
                <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>Cancelled (Archive)</option>
                <option value="Unrepairable" ${currentStatus === 'Unrepairable' ? 'selected' : ''}>Unrepairable (Archive)</option>
            </select>
            <p class="text-secondary small px-3">Updating this status will instantly broadcast the new state to the customer's public live tracker if they are online.</p>
        `,
        showCancelButton: true,
        confirmButtonText: 'Push Update',
        confirmButtonColor: '#4A90A4',
        preConfirm: () => {
            return document.getElementById('newStatusSelect').value;
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const newStatus = result.value;
            if (newStatus === currentStatus) return; // No change

            try {
                // Update Supabase Database
                const { error } = await window.sb
                    .from('repair_tickets')
                    .update({
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('ticket_id', ticketId);

                if (error) throw error;

                // Fire Telemetry Action
                if (window.logAction) {
                    window.logAction('TICKET_STATUS_UPDATED', 'scheduling.engine', {
                        ticket_code: ticketCode,
                        previous_status: currentStatus,
                        new_status: newStatus
                    }, 'info');
                }

                Swal.fire('Updated!', `Ticket ${ticketCode} moved to <b>${newStatus}</b>.`, 'success')
                    .then(() => {
                        // Refresh view
                        fetchAndRenderJobs();
                    });

            } catch (err) {
                console.error("Status Update Error:", err);
                Swal.fire('Error', 'Failed to update ticket status in the registry.', 'error');
            }
        }
    });
}


// Global: Open Job Details Panel
window.viewJobPanel = function (btn) {
    try {
        const ticketStr = btn.getAttribute('data-ticket');
        const t = JSON.parse(decodeURIComponent(ticketStr));
        const custName = t.customers ? `${t.customers.first_name || ''} ${t.customers.last_name || ''} `.trim() : 'Unknown';
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

// Global Job UI Filtering
window.filterJobs = function (query) {
    query = query.toLowerCase();
    const cards = document.querySelectorAll('#jobs-container > div');

    cards.forEach(card => {
        const textContent = card.innerText.toLowerCase();
        if (textContent.includes(query)) {
            card.style.display = '';
            card.classList.add('animate__fadeIn');
        } else {
            card.style.display = 'none';
            card.classList.remove('animate__fadeIn');
        }
    });
};
