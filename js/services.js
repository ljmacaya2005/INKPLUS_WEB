// services.js - Service Catalog Management

let catalogData = [];
let createModal;

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase to be initialized
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

    try {
        await waitForSupabase();
        createModal = new bootstrap.Modal(document.getElementById('createEntryModal'));

        loadCatalog();

        const form = document.getElementById('entryForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('btnSaveEntry');
            const orig = btn.innerHTML;
            btn.innerHTML = 'Saving...';
            btn.disabled = true;

            const type = document.getElementById('entryType').value;
            const category = document.getElementById('entryCategory').value.trim() || null;
            const name = document.getElementById('entryName').value.trim();

            try {
                const { error } = await window.sb
                    .from('service_catalog')
                    .insert([{
                        type: type,
                        category: type === 'service' ? category : null,
                        name: name,
                        is_active: true
                    }]);

                if (error) throw error;

                Swal.fire({
                    title: 'Saved!',
                    text: 'The new entry has been added to the catalog.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });

                form.reset();
                createModal.hide();
                loadCatalog();

                // Fire Telemetry Action
                if (window.logAction) {
                    window.logAction('CATALOG_ENTRY_ADDED', 'services.catalog', { entry_type: type, entry_name: name, category: category }, 'info');
                }

            } catch (err) {
                console.error(err);
                if (err.message && err.message.includes('relation "service_catalog" does not exist')) {
                    Swal.fire('Database Missing', 'Please create the "service_catalog" table in Supabase first. Check documentation.', 'error');
                } else {
                    Swal.fire('Error', 'Failed to save entry. ' + err.message, 'error');
                }
            } finally {
                btn.innerHTML = orig;
                btn.disabled = false;
            }
        });

    } catch (err) {
        console.error("Initialization Failed: ", err);
    }
});

window.openCreateModal = () => {
    document.getElementById('entryForm').reset();
    toggleCategoryField();
    if (createModal) createModal.show();
};

window.toggleCategoryField = () => {
    const type = document.getElementById('entryType').value;
    const catGroup = document.getElementById('categoryGroup');
    const catInput = document.getElementById('entryCategory');
    if (type === 'brand' || type === 'accessory') {
        catGroup.style.display = 'none';
        catInput.required = false;
        catInput.value = '';
    } else {
        catGroup.style.display = 'block';
        catInput.required = true;
    }
};

window.loadCatalog = async () => {
    try {
        const brandsList = document.getElementById('brandsList');
        const servicesList = document.getElementById('servicesList');
        const accessoriesList = document.getElementById('accessoriesList');

        brandsList.innerHTML = '<div class="text-center py-5 text-secondary"><div class="spinner-border spinner-border-sm" role="status"></div><br>Loading...</div>';
        servicesList.innerHTML = '<div class="text-center py-5 text-secondary"><div class="spinner-border spinner-border-sm" role="status"></div><br>Loading...</div>';
        accessoriesList.innerHTML = '<div class="text-center py-5 text-secondary"><div class="spinner-border spinner-border-sm" role="status"></div><br>Loading...</div>';

        const { data, error } = await window.sb
            .from('service_catalog')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        catalogData = data || [];

        // Populate Datalist for categories to help autocomplete
        const categories = [...new Set(catalogData.map(c => c.category).filter(Boolean))];
        const datalist = document.getElementById('categoryHints');
        datalist.innerHTML = '';
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            datalist.appendChild(opt);
        });

        renderBrands(catalogData.filter(d => d.type === 'brand'));
        renderServices(catalogData.filter(d => d.type === 'service'));
        renderAccessories(catalogData.filter(d => d.type === 'accessory'));

    } catch (err) {
        if (err.message && err.message.includes('relation "service_catalog" does not exist')) {
            const html = `
                <div class="alert alert-warning m-4">
                    <h5 class="alert-heading fw-bold">Configuration Required</h5>
                    <p class="mb-0 small">The <code>service_catalog</code> table has not been created in Supabase. Please see the <strong>HTML_FUNCTIONALITY_ANALYSIS.md</strong> file for the required SQL schema.</p>
                </div>
            `;
            document.getElementById('brandsList').innerHTML = html;
            document.getElementById('servicesList').innerHTML = html;
        } else {
            console.error(err);
            document.getElementById('brandsList').innerHTML = '<p class="text-danger p-3">Failed to load data.</p>';
            document.getElementById('servicesList').innerHTML = '<p class="text-danger p-3">Failed to load data.</p>';
            document.getElementById('accessoriesList').innerHTML = '<p class="text-danger p-3">Failed to load data.</p>';
        }
    }
};

window.renderBrands = (brands) => {
    const list = document.getElementById('brandsList');
    if (brands.length === 0) {
        list.innerHTML = '<p class="text-muted text-center py-4 bg-light rounded shadow-sm">No brands configured yet.</p>';
        return;
    }

    let html = '<div class="list-group list-group-flush">';
    brands.forEach(b => {
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center py-3 bg-transparent border-light border-opacity-10 service-card rounded mb-2 bg-white shadow-sm border">
                <span class="fw-medium">${b.name}</span>
                <button class="btn btn-sm btn-outline-danger p-1 rounded-circle" onclick="deleteEntry('${b.id}')" title="Delete Brand">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
    });
    html += '</div>';
    list.innerHTML = html;
};

window.renderAccessories = (accessories) => {
    const list = document.getElementById('accessoriesList');
    if (accessories.length === 0) {
        list.innerHTML = '<p class="text-muted text-center py-4 bg-light rounded shadow-sm">No accessories configured yet.</p>';
        return;
    }

    let html = '<div class="list-group list-group-flush">';
    accessories.forEach(a => {
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center py-3 bg-transparent border-light border-opacity-10 service-card rounded mb-2 bg-white shadow-sm border">
                <span class="fw-medium">${a.name}</span>
                <button class="btn btn-sm btn-outline-danger p-1 rounded-circle" onclick="deleteEntry('${a.id}')" title="Delete Accessory">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
    });
    html += '</div>';
    list.innerHTML = html;
};

window.renderServices = (services) => {
    const list = document.getElementById('servicesList');
    if (services.length === 0) {
        list.innerHTML = '<p class="text-muted text-center py-5 bg-light rounded shadow-sm">No services configured yet.</p>';
        return;
    }

    const grouped = services.reduce((acc, obj) => {
        let key = obj.category || 'Uncategorized';
        if (!acc[key]) acc[key] = [];
        acc[key].push(obj);
        return acc;
    }, {});

    let html = '';
    for (const [category, items] of Object.entries(grouped)) {
        html += `
            <div class="mb-4">
                <div class="service-category-header p-2 px-3 mb-3 d-flex align-items-center">
                    <svg class="text-primary me-2" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    <h6 class="mb-0 fw-bold text-primary">${category}</h6>
                </div>
                <div class="row g-2 px-2">
        `;
        items.forEach(s => {
            html += `
                <div class="col-md-6 col-xl-4">
                    <div class="p-3 bg-white rounded-3 shadow-sm border border-light service-card h-100 d-flex flex-column justify-content-between">
                        <span class="fw-medium small d-block mb-2 text-truncate" title="${s.name}">${s.name}</span>
                        <div class="text-end">
                            <button class="btn btn-sm btn-outline-danger p-1 rounded d-inline-flex align-items-center" onclick="deleteEntry('${s.id}')" title="Remove Service">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;
    }
    list.innerHTML = html;
};

window.filterBrands = (query) => {
    query = query.toLowerCase();
    const filtered = catalogData.filter(d => d.type === 'brand' && d.name.toLowerCase().includes(query));
    renderBrands(filtered);
};

window.filterAccessories = (query) => {
    query = query.toLowerCase();
    const filtered = catalogData.filter(d => d.type === 'accessory' && d.name.toLowerCase().includes(query));
    renderAccessories(filtered);
};

window.filterServices = (query) => {
    query = query.toLowerCase();
    const filtered = catalogData.filter(d => d.type === 'service' &&
        (d.name.toLowerCase().includes(query) || (d.category || '').toLowerCase().includes(query))
    );
    renderServices(filtered);
};

window.deleteEntry = (id) => {
    Swal.fire({
        title: 'Delete Entry?',
        text: 'Are you sure you want to remove this from the catalog?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e3342f',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const { error } = await window.sb
                    .from('service_catalog')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                loadCatalog();
                Swal.fire('Deleted!', 'Entry has been removed.', 'success');

                // Fire Telemetry Action
                if (window.logAction) {
                    window.logAction('CATALOG_ENTRY_DELETED', 'services.catalog', { target_id: id }, 'warning');
                }

            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        }
    });
};
