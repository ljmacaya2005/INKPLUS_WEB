/* tracker.js - Repair Status Tracker */
document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('btnSearch');
    const resultCard = document.getElementById('resultCard');
    const searchCard = document.getElementById('searchCard');

    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const ticketId = document.getElementById('ticketIdInput').value.trim();

            if (!ticketId) {
                Swal.fire('Error', 'Please enter a ticket ID', 'error');
                return;
            }

            // Simulate search
            searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Searching...';

            setTimeout(() => {
                searchBtn.innerHTML = 'Track Repair';
                if (resultCard) {
                    resultCard.style.display = 'block';
                    resultCard.classList.add('animate__fadeInUp');
                    // Mock data population
                    document.getElementById('resTicketId').textContent = ticketId.toUpperCase();
                    document.getElementById('resDevice').textContent = 'Epson L3110 (Mock Data)';
                    document.getElementById('resDate').textContent = 'Created: ' + new Date().toLocaleDateString();
                }
            }, 1000);
        });
    }

    window.resetTracker = function () {
        if (resultCard) resultCard.style.display = 'none';
        document.getElementById('trackerForm').reset();
    };
});
