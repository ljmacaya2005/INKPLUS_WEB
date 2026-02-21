// scheduling.js - Scheduling Module

window.formatPhoneNumber = function (input) {
    let val = input.value.replace(/\D/g, '');
    if (val.length === 0) {
        input.value = '';
        return;
    }
    let formatted = '+';
    if (val.length > 0) formatted += val.substring(0, 2);
    if (val.length > 2) formatted += '-' + val.substring(2, 5);
    if (val.length > 5) formatted += '-' + val.substring(5, 12);
    input.value = formatted;
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Scheduling module loaded');

    // Wait for Supabase to be initialized
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
        console.log("Supabase connected in Scheduling.");

        const form = document.getElementById('createTicketForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Show loading state
                const btn = document.getElementById('btnSaveTicket');
                const origText = btn.innerHTML;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
                btn.disabled = true;

                // Gather inputs
                const customerName = document.getElementById('customerName').value.trim();
                const customerPhone = document.getElementById('customerPhone').value.trim();
                const deviceBrand = document.getElementById('deviceBrand').value;
                const deviceModel = document.getElementById('deviceModel').value.trim();
                const serviceCategory = document.getElementById('deviceType').value;
                const problemDesc = document.getElementById('problemDescription').value.trim();

                // Gather Accessories
                let accessories = [];
                if (document.getElementById('accPower').checked) accessories.push('Power Adapter');
                if (document.getElementById('accUSB').checked) accessories.push('USB Cable');
                if (document.getElementById('accNone').checked) accessories.push('Unit Only');
                const accStr = accessories.join(', ');

                // Generate tracking logic
                const ticketCode = 'INK-' + Math.floor(1000 + Math.random() * 9000) + '-' + new Date().getFullYear();

                try {
                    // Step 1: Handle Customer (Upsert/Insert purely by basic data for now)
                    let customerId = null;

                    // We check if customer via phone exists
                    const { data: existingCust, error: custSearchErr } = await window.sb
                        .from('customers')
                        .select('customer_id')
                        .eq('phone_number', customerPhone)
                        .single();

                    if (existingCust && existingCust.customer_id) {
                        customerId = existingCust.customer_id;
                    } else {
                        // Create customer
                        let nameParts = customerName.split(' ');
                        let fName = nameParts[0];
                        let lName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

                        const { data: newCust, error: custInsErr } = await window.sb
                            .from('customers')
                            .insert([{
                                first_name: fName,
                                last_name: lName,
                                phone_number: customerPhone
                            }])
                            .select()
                            .single();

                        if (custInsErr) throw custInsErr;
                        customerId = newCust.customer_id;
                    }

                    // Step 2: Insert the Repair Ticket
                    const { data: ticket, error: ticketErr } = await window.sb
                        .from('repair_tickets')
                        .insert([{
                            ticket_code: ticketCode,
                            customer_id: customerId,
                            status: 'Pending',
                            device_brand: deviceBrand,
                            device_model: deviceModel,
                            service_category: serviceCategory,
                            issue_description: problemDesc,
                            accessories_included: accStr,
                            handled_by: localStorage.getItem('user_id') || null
                        }])
                        .select()
                        .single();

                    if (ticketErr) throw ticketErr;

                    // Success UI
                    Swal.fire({
                        title: 'Ticket Scheduled!',
                        html: `
                            <div class="p-3 bg-light rounded-3 text-start mt-3">
                                <p class="mb-1 text-muted small">Tracking Code</p>
                                <h3 class="font-monospace fw-bold text-primary mb-3">${ticketCode}</h3>
                                <p class="mb-1 text-muted small">Customer</p>
                                <p class="fw-bold mb-3">${customerName} (${customerPhone})</p>
                                <p class="mb-1 text-muted small">Device</p>
                                <p class="fw-bold mb-0">${deviceBrand} ${deviceModel}</p>
                            </div>
                            <p class="text-secondary small mt-3 px-3">Please provide the tracking code to the customer so they can monitor their repair status live.</p>
                        `,
                        icon: 'success',
                        confirmButtonText: 'Print Receipt (Soon)',
                        showCancelButton: true,
                        cancelButtonText: 'Done',
                        confirmButtonColor: '#4A90A4'
                    }).then(() => {
                        window.location.reload(); // Quick reset
                    });

                } catch (err) {
                    console.error('Scheduling Error:', err);
                    Swal.fire('Error', 'Failed to schedule the ticket. Please check console.', 'error');
                } finally {
                    // Reset UI
                    btn.innerHTML = origText;
                    btn.disabled = false;
                }
            });
        }

        // --- Load Recent Schedules ---
        const loadRecentSchedules = async () => {
            const listEl = document.getElementById('recent-schedules-list');
            if (!listEl) return;

            try {
                const { data: tickets, error } = await window.sb
                    .from('repair_tickets')
                    .select('*, customers(first_name, last_name)')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (error) throw error;

                if (!tickets || tickets.length === 0) {
                    listEl.innerHTML = '<p class="text-secondary text-center small mt-3">No recent schedules found.</p>';
                    return;
                }

                let htmlContent = '';
                tickets.forEach(t => {
                    const custName = t.customers ? `${t.customers.first_name} ${t.customers.last_name}` : 'Unknown';
                    const brand = t.device_brand || '';
                    htmlContent += `
                        <div class="bg-white p-3 rounded-3 shadow-sm mb-3 border-start border-4 border-primary">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="fw-bold font-monospace text-primary smaller">${t.ticket_code}</span>
                                <span class="badge bg-warning text-dark opacity-75">${t.status}</span>
                            </div>
                            <h6 class="mb-1 fw-bold">${custName}</h6>
                            <p class="mb-0 text-secondary smaller text-truncate">${brand} ${t.device_model} &bull; ${t.service_category}</p>
                        </div>
                    `;
                });

                listEl.innerHTML = htmlContent;

            } catch (err) {
                console.error("Failed loading recent schedules: ", err);
                listEl.innerHTML = '<p class="text-danger text-center small mt-3 offset-md-0">Failed to load recent schedules.</p>';
            }
        };

        loadRecentSchedules();

        // --- Smooth Placeholder Animations ---
        const initAnimatedPlaceholders = () => {
            const animateNode = (inputId, texts, typingSpeed = 70, pauseDuration = 2000) => {
                const el = document.getElementById(inputId);
                if (!el) return;

                let textIndex = 0;
                let charIndex = 0;
                let isDeleting = false;

                const tick = () => {
                    const currentText = texts[textIndex];

                    if (isDeleting) charIndex--;
                    else charIndex++;

                    // Note: Always fallback to a single space ' ' so floating labels don't abruptly collapse when empty
                    el.placeholder = currentText.substring(0, charIndex) || ' ';

                    let dynamicSpeed = typingSpeed;
                    if (isDeleting) dynamicSpeed /= 2; // Delete faster

                    if (!isDeleting && charIndex === currentText.length) {
                        dynamicSpeed = pauseDuration; // Pause at end of word
                        isDeleting = true;
                    } else if (isDeleting && charIndex === 0) {
                        isDeleting = false;
                        textIndex = (textIndex + 1) % texts.length; // Move to next word
                        dynamicSpeed = 400; // Brief pause before starting next word
                    }

                    setTimeout(tick, dynamicSpeed);
                };

                // Add slight stagger start
                setTimeout(tick, Math.random() * 500 + 500);
            };

            animateNode('customerName', ['e.g. John Doe', 'e.g. Jane Smith', 'e.g. Juan Dela Cruz'], 80);
            animateNode('customerPhone', ['e.g. +63-917-1234567', 'e.g. +63-999-8887777', 'e.g. +63-922-3334444'], 80);
            animateNode('deviceModel', ['e.g. L3110', 'e.g. DCP-T310', 'e.g. PIXMA G2010', 'e.g. HP DeskJet'], 80);
            animateNode('problemDescription', [
                'Please describe the issue...',
                'e.g. Paper keeps jamming every time I print...',
                'e.g. Blinking red lights on the ink indicator...',
                'e.g. Not turning on even when properly plugged in...'
            ], 60, 2500);
        };

        // Start animations
        initAnimatedPlaceholders();


    } catch (err) {
        console.error("Fatal Error initializing Scheduling Module: ", err);
    }
});
