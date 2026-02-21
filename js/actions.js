/* Freshly Crafted Audit Log JS */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Audit Log Subsystem: Online');

    // Quick filtering feedback
    const filterBtn = document.querySelector('button.btn-primary');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            const originalText = filterBtn.innerHTML;
            filterBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Filtering';
            filterBtn.disabled = true;

            setTimeout(() => {
                filterBtn.innerHTML = originalText;
                filterBtn.disabled = false;
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Log filtering criteria applied',
                    showConfirmButton: false,
                    timer: 1500
                });
            }, 800);
        });
    }
});
