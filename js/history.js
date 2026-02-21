/* history.js - Archive Management */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('History module loaded');

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

    let allArchiveTickets = [];
    let currentRenderedTickets = [];
    const searchInput = document.getElementById('historySearchInput');
    const btnRefresh = document.getElementById('btnRefreshArchive');
    const btnExport = document.getElementById('btnExportCSV');

    try {
        await waitForSupabase();
        await fetchAndRenderHistory();
    } catch (err) {
        console.error("Fatal Error initializing History Module: ", err);
        const container = document.getElementById('history-container');
        if (container) {
            container.innerHTML = `<div class="col-12 text-center text-danger py-5">
                <p><strong>Failed to load archive database.</strong></p>
                <button class="btn btn-outline-danger btn-sm mt-3" onclick="window.location.reload()">Retry Connection</button>
            </div>`;
        }
    }

    async function fetchAndRenderHistory() {
        const container = document.getElementById('history-container');
        if (!container) return;

        try {
            const { data: tickets, error } = await window.sb
                .from('repair_tickets')
                .select(`
                    *,
                    customers (first_name, last_name, phone_number)
                `)
                .eq('status', 'Done')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            allArchiveTickets = tickets || [];

            // Update Metrics
            const totalEl = document.getElementById('stat-total-archived');
            if (totalEl) {
                totalEl.innerText = allArchiveTickets.length;
            }

            const latestEl = document.getElementById('stat-latest-date');
            if (latestEl && allArchiveTickets.length > 0) {
                const dateInput = allArchiveTickets[0].updated_at || allArchiveTickets[0].created_at;
                latestEl.innerText = window.formatDateTime ? window.formatDateTime(dateInput) : new Date(dateInput).toLocaleDateString();
            } else if (latestEl) {
                latestEl.innerText = "N/A";
            }

            renderTickets(allArchiveTickets);

        } catch (error) {
            console.error("Archive Fetching Error:", error);
            container.innerHTML = `<div class="col-12 text-center text-danger py-5"><strong>Failed to load history matrix.</strong></div>`;
        }
    }

    function renderTickets(ticketsToRender) {
        const container = document.getElementById('history-container');
        if (!container) return;

        currentRenderedTickets = ticketsToRender || [];

        if (!currentRenderedTickets || currentRenderedTickets.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5 animate__animated animate__fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="opacity-25 mb-3"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <h5 class="text-secondary fw-bold">No Archived Jobs Found</h5>
                    <p class="text-secondary small mt-2">Completed repairs will appear here permanently once they are marked as 'Done'.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        let htmlPayload = '';

        ticketsToRender.forEach((ticket, i) => {
            // Safely handle customer object (Supabase either returns object or array of objects sometimes if 1-to-many, but usually an object for standard rels)
            const custRef = Array.isArray(ticket.customers) ? ticket.customers[0] : ticket.customers;
            const customerName = custRef ? `${custRef.first_name || ''} ${custRef.last_name || ''}`.trim() : 'Unknown';
            const customerPhone = custRef?.phone_number || 'N/A';
            const brand = ticket.device_brand || '';
            const model = ticket.device_model || '';

            // Format to a clean date
            const dateStr = window.formatDateTime ? window.formatDateTime(ticket.updated_at || ticket.created_at) : new Date(ticket.updated_at || ticket.created_at).toLocaleDateString();

            const badgeClass = 'bg-success text-white shadow-sm';

            htmlPayload += `
                <div class="col-md-6 col-xl-4 animate__animated animate__zoomIn animate__faster" style="animation-delay: ${(i * 0.03).toFixed(2)}s">
                    <div class="card h-100 border-0 shadow-sm rounded-4 position-relative overflow-hidden bg-body-tertiary transition-all" style="transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">
                        
                        <!-- Top Progress Bar (Visual indicator for finished job) -->
                        <div class="position-absolute top-0 start-0 w-100 ${badgeClass}" style="height: 6px;"></div>
                        
                        <div class="card-body p-4 pt-4 d-flex flex-column">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="fw-bold mb-1 tracking-tight text-main">${customerName}</h6>
                                    <p class="small text-secondary mb-0"><i class="text-primary font-monospace fw-bold">${ticket.ticket_code}</i></p>
                                </div>
                                <span class="badge ${badgeClass} rounded-pill px-3 py-2 border border-success border-opacity-25">${ticket.status || 'Done'}</span>
                            </div>

                            <div class="bg-body p-3 rounded-4 mb-3 border border-light border-opacity-10 shadow-sm">
                                <div class="d-flex justify-content-between mb-2 pb-2 border-bottom border-light border-opacity-10">
                                    <span class="small text-secondary fw-bold text-uppercase">Device</span>
                                    <span class="small fw-bold text-main d-flex align-items-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="me-1 opacity-50" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg> ${brand} ${model}</span>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span class="small text-secondary fw-bold text-uppercase opacity-75">Category</span>
                                    <span class="small fw-bold text-secondary text-end">${ticket.service_category || 'N/A'}</span>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span class="small text-secondary fw-bold text-uppercase opacity-75">Contact</span>
                                    <span class="small fw-bold text-secondary">${customerPhone}</span>
                                </div>
                            </div>

                            <div class="mb-4">
                                <p class="small text-secondary fw-bold text-uppercase mb-2 opacity-75">Issue / Description</p>
                                <p class="small mb-0 text-truncate text-main fst-italic fw-medium" style="line-height: 1.5;" title="${ticket.issue_description || ''}">"${ticket.issue_description || 'No description provided.'}"</p>
                            </div>

                            <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top border-light border-opacity-10">
                                <div class="small text-secondary fw-medium d-flex align-items-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="me-1 opacity-75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    ${finishedDate.split(',')[0]} <!-- Just date -->
                                </div>
                                <button class="btn btn-sm btn-outline-primary rounded-pill px-4 shadow-sm hover-lift fw-medium" onclick="viewJobPanel(this)" data-ticket="${encodeURIComponent(JSON.stringify(ticket))}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-1"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> View Info
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = htmlPayload;
    }

    // Real-Time Client Side Searching Filter
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (!term) {
                renderTickets(allArchiveTickets);
                return;
            }

            const filtered = allArchiveTickets.filter(t => {
                const cRef = Array.isArray(t.customers) ? t.customers[0] : t.customers;
                const cFirst = cRef?.first_name || '';
                const cLast = cRef?.last_name || '';
                const phone = cRef?.phone_number || '';

                const codeMatch = (t.ticket_code || '').toLowerCase().includes(term);
                const descMatch = (t.issue_description || '').toLowerCase().includes(term);
                const brandMatch = (t.device_brand || '').toLowerCase().includes(term);
                const modelMatch = (t.device_model || '').toLowerCase().includes(term);
                const custMatch = `${cFirst} ${cLast}`.toLowerCase().includes(term);
                const phoneMatch = phone.toLowerCase().includes(term);

                return codeMatch || descMatch || brandMatch || modelMatch || custMatch || phoneMatch;
            });

            renderTickets(filtered);
        });
    }

    // Refresh Data
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            btnRefresh.disabled = true;
            btnRefresh.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Refreshing...`;
            await fetchAndRenderHistory();
            btnRefresh.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="me-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>Refresh Data`;
            btnRefresh.disabled = false;
        });
    }

    // Export to CSV
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            if (currentRenderedTickets.length === 0) {
                Swal.fire('Empty', 'There is no data to export based on current filters.', 'info');
                return;
            }

            // Generate CSV content
            let csvContent = "data:text/csv;charset=utf-8,";

            // Header
            csvContent += "Ticket ID,Customer First Last,Phone,Device Brand,Device Model,Service Category,Status,Completed Date,Issue Description\r\n";

            // Rows
            currentRenderedTickets.forEach(t => {
                const cRef = Array.isArray(t.customers) ? t.customers[0] : t.customers;
                const cFirst = (cRef?.first_name || '').replace(/"/g, '""');
                const cLast = (cRef?.last_name || '').replace(/"/g, '""');
                const phone = cRef?.phone_number || '';
                const completedDate = new Date(t.updated_at || t.created_at).toLocaleString();
                const issue = (t.issue_description || '').replace(/"/g, '""').replace(/\n/g, ' ');

                let row = `"${t.ticket_code}","${cFirst} ${cLast}","${phone}","${t.device_brand || ''}","${t.device_model || ''}","${t.service_category || ''}","${t.status || ''}","${completedDate}","${issue}"`;
                csvContent += row + "\r\n";
            });

            // Trigger Download
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Archive_Export_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Import from CSV
    const btnImport = document.getElementById('btnImportCSV');
    const csvFileInput = document.getElementById('csvFileInput');

    if (btnImport && csvFileInput) {
        btnImport.addEventListener('click', () => {
            csvFileInput.click();
        });

        csvFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target.result;
                await processCSVImport(text);
                csvFileInput.value = ""; // reset
            };
            reader.readAsText(file);
        });
    }

    async function processCSVImport(csvText) {
        Swal.fire({
            title: 'Importing Data...',
            text: 'Parsing and synchronizing records...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Safe line parser
        const parseLine = (line) => {
            let fields = [];
            let inQ = false;
            let val = '';
            for (let c of line) {
                if (c === '"') { inQ = !inQ; }
                else if (c === ',' && !inQ) { fields.push(val); val = ''; }
                else { val += c; }
            }
            fields.push(val);
            return fields;
        };

        const lines = csvText.trim().split(/\r?\n/);
        let importedCount = 0;
        let errorsCount = 0;

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const cols = parseLine(lines[i]);
            const ticketCode = cols[0];
            const custName = cols[1];
            const phone = cols[2];
            const brand = cols[3];
            const model = cols[4];
            const cat = cols[5];
            const stat = cols[6] || 'Done';
            const issueDetails = cols[8] || '';

            if (!ticketCode) continue; // Invalid row

            try {
                // Skip if duplicate ticket_code exists
                const { data: exTicket } = await window.sb.from('repair_tickets')
                    .select('ticket_id').eq('ticket_code', ticketCode).maybeSingle();

                if (exTicket) {
                    errorsCount++;
                    continue;
                }

                // Find or Create Customer
                const nameParts = (custName || 'Unknown').trim().split(' ');
                const fN = nameParts[0] || 'Imported';
                const lN = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Customer';

                let { data: exCust } = await window.sb.from('customers')
                    .select('customer_id')
                    .eq('first_name', fN).eq('last_name', lN)
                    .limit(1)
                    .maybeSingle(); // Changed to maybeSingle to prevent throw on 0 rows

                let actualCustId;
                if (!exCust) {
                    const { data: newCust, error: custErr } = await window.sb.from('customers').insert([{
                        first_name: fN,
                        last_name: lN,
                        phone_number: phone || '',
                        email: ''
                    }]).select().single();

                    if (custErr) throw custErr;
                    actualCustId = newCust.customer_id;
                } else {
                    actualCustId = exCust.customer_id;
                }

                // Insert new historical ticket
                const { error: tErr } = await window.sb.from('repair_tickets').insert([{
                    ticket_code: ticketCode,
                    customer_id: actualCustId,
                    device_type: brand || 'Unknown',
                    device_brand: brand || 'Unknown',
                    device_model: model || 'Unknown',
                    service_category: cat || 'General Repair',
                    issue_description: issueDetails,
                    status: stat
                }]);

                if (tErr) throw tErr;
                importedCount++;

            } catch (e) {
                console.error("Import error on line " + (i + 1), e);
                errorsCount++;
            }
        }

        Swal.fire(
            'Import Complete',
            `Successfully imported <b>${importedCount}</b> archival records. <br><span class="text-secondary small">Skipped duplicates/errors: ${errorsCount}</span>`,
            importedCount > 0 ? 'success' : 'info'
        ).then(() => {
            fetchAndRenderHistory();
        });
    }
});
