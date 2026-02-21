/* Freshly Crafted Settings JS */
document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsForm');

    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Apply System Overrides?',
                text: 'Global configuration changes may affect all connected clients.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Deploy Changes'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Deploying...',
                        html: 'Updating global system environment variables.',
                        timer: 1500,
                        didOpen: () => {
                            Swal.showLoading()
                        }
                    }).then(() => {
                        Swal.fire('Deployed', 'System settings updated across the cluster.', 'success');
                    });
                }
            });
        });
    }

    // Toggle interaction
    document.querySelectorAll('.form-check-input').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const state = e.target.checked ? 'Activated' : 'Suspended';
            Swal.fire({
                toast: true,
                position: 'bottom-start',
                icon: 'info',
                title: `Protocol ${state}`,
                showConfirmButton: false,
                timer: 2000
            });
        });
    });
});
