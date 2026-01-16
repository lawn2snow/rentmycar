/**
 * RentMyCar - Renter Dashboard
 */

// Conditional logging - only in development
const log = CONFIG?.IS_PRODUCTION === false ? console.log.bind(console) : () => {};
const logError = CONFIG?.IS_PRODUCTION === false ? console.error.bind(console) : () => {};

// Check auth on load
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    if (!api.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    const user = api.getStoredUser();

    // Redirect owners to owner dashboard
    if (user.role === 'owner') {
        window.location.href = 'dashboard.html';
        return;
    }

    // Initialize dashboard
    initializeDashboard(user);
    setupNavigation();
    loadDashboardData();
});

/**
 * Initialize dashboard with user data
 */
function initializeDashboard(user) {
    // Update user info in header
    document.getElementById('renterName').textContent = user.firstName || 'Renter';
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userAvatar').src =
        `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${user.firstName}+${user.lastName}`;

    // Populate settings form
    document.getElementById('settingsEmail').value = user.email;
    document.getElementById('settingsFirstName').value = user.firstName || '';
    document.getElementById('settingsLastName').value = user.lastName || '';
    document.getElementById('settingsPhone').value = user.phone || '';
}

/**
 * Setup navigation
 */
function setupNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
        });
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.dashboard-sidebar').classList.toggle('open');
        });
    }

    // Filter tabs for bookings
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadBookings(this.dataset.status);
        });
    });
}

/**
 * Show a section
 */
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // Load section data
    if (sectionId === 'bookings') {
        loadBookings('all');
    } else if (sectionId === 'history') {
        loadHistory();
    }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        // Load stats
        const statsResult = await api.getRenterStats();
        if (statsResult.success) {
            const stats = statsResult.stats;
            document.getElementById('activeRentals').textContent = stats.activeRentals || 0;
            document.getElementById('upcomingBookings').textContent = stats.upcomingBookings || 0;
            document.getElementById('completedTrips').textContent = stats.completedTrips || 0;
            document.getElementById('totalSpent').textContent = '$' + (stats.totalSpent || 0).toLocaleString();
        }

        // Load upcoming bookings for preview
        loadUpcomingBookingsPreview();

    } catch (error) {
        logError('Error loading dashboard data:', error);
    }
}

/**
 * Load upcoming bookings preview
 */
async function loadUpcomingBookingsPreview() {
    const container = document.getElementById('upcomingBookingsList');

    try {
        const result = await api.getBookings('renter');

        if (result.success && result.bookings.length > 0) {
            // Filter for upcoming (pending or approved)
            const upcoming = result.bookings.filter(b =>
                ['pending', 'approved'].includes(b.status) && new Date(b.startDate) > new Date()
            ).slice(0, 3);

            if (upcoming.length > 0) {
                container.innerHTML = upcoming.map(booking => createBookingCard(booking)).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-plus"></i>
                        <p>No upcoming bookings</p>
                        <a href="index.html#browse" class="btn btn-primary">Browse Cars</a>
                    </div>
                `;
            }
        }
    } catch (error) {
        logError('Error loading upcoming bookings:', error);
    }
}

/**
 * Load bookings
 */
async function loadBookings(statusFilter = 'all') {
    const container = document.getElementById('bookingsList');
    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading bookings...</p>
        </div>
    `;

    try {
        const result = await api.getBookings('renter');

        if (result.success) {
            let bookings = result.bookings;

            // Apply filter
            if (statusFilter !== 'all') {
                bookings = bookings.filter(b => b.status === statusFilter);
            }

            if (bookings.length > 0) {
                container.innerHTML = bookings.map(booking => createBookingCard(booking)).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar"></i>
                        <p>No bookings found</p>
                        <a href="index.html#browse" class="btn btn-primary">Browse Cars</a>
                    </div>
                `;
            }
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading bookings</p>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading bookings</p>
            </div>
        `;
    }
}

/**
 * Load trip history
 */
async function loadHistory() {
    const container = document.getElementById('historyList');
    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading history...</p>
        </div>
    `;

    try {
        const result = await api.getBookings('renter', 'completed');

        if (result.success && result.bookings.length > 0) {
            container.innerHTML = result.bookings.map(booking => createBookingCard(booking)).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No trip history yet</p>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading history</p>
            </div>
        `;
    }
}

/**
 * Create a booking card
 */
function createBookingCard(booking) {
    const car = booking.car || {};
    const startDate = new Date(booking.startDate).toLocaleDateString();
    const endDate = new Date(booking.endDate).toLocaleDateString();

    // Use SecurityUtils for XSS prevention
    const esc = SecurityUtils?.escapeHtml || (s => s);
    const escUrl = SecurityUtils?.escapeUrl || (s => s);

    const statusColors = {
        pending: '#f59e0b',
        approved: '#10b981',
        active: '#6366f1',
        completed: '#6b7280',
        cancelled: '#ef4444',
        declined: '#ef4444'
    };

    const statusIcons = {
        pending: 'clock',
        approved: 'check-circle',
        active: 'car',
        completed: 'flag-checkered',
        cancelled: 'times-circle',
        declined: 'times-circle'
    };

    const safeStatus = esc(booking.status);
    const safeId = esc(booking.id);

    return `
        <div class="booking-card">
            <div class="booking-image">
                <img src="${escUrl(car.images?.[0] || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400')}" alt="${esc(car.make || '')} ${esc(car.model || '')}">
                <span class="status-badge" style="background: ${statusColors[booking.status] || '#6b7280'}">
                    <i class="fas fa-${statusIcons[booking.status] || 'question'}"></i> ${safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
                </span>
            </div>
            <div class="booking-details">
                <h4>${esc(car.make || '')} ${esc(car.model || '')} ${esc(String(car.year || ''))}</h4>
                <div class="booking-dates">
                    <span><i class="fas fa-calendar"></i> ${esc(startDate)} - ${esc(endDate)}</span>
                    <span><i class="fas fa-clock"></i> ${esc(String(booking.totalDays || 0))} days</span>
                </div>
                <div class="booking-price">
                    <span class="price">$${esc(booking.totalAmount?.toFixed(2) || '0.00')}</span>
                    <span class="price-detail">($${esc(String(booking.pricePerDay || 0))}/day + fees)</span>
                </div>
            </div>
            <div class="booking-actions">
                ${booking.status === 'pending' ? `
                    <button class="btn btn-outline btn-sm" onclick="cancelBooking('${safeId}')">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                ` : ''}
                ${booking.status === 'approved' ? `
                    <button class="btn btn-primary btn-sm" onclick="viewBookingDetails('${safeId}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                ` : ''}
                ${booking.status === 'completed' ? `
                    <button class="btn btn-outline btn-sm" onclick="leaveReview('${safeId}')">
                        <i class="fas fa-star"></i> Review
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Cancel a booking
 */
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }

    try {
        const result = await api.updateBookingStatus(bookingId, 'cancelled');

        if (result.success) {
            showToast('Booking cancelled successfully', 'success');
            loadBookings('all');
            loadDashboardData();
        } else {
            showToast(result.error || 'Failed to cancel booking', 'error');
        }
    } catch (error) {
        showToast('Error cancelling booking', 'error');
    }
}

/**
 * View booking details
 */
function viewBookingDetails(bookingId) {
    // For now, just show an alert. In production, this would open a modal
    showToast('Booking details coming soon', 'info');
}

/**
 * Leave a review
 */
function leaveReview(bookingId) {
    // For now, just show an alert. In production, this would open a review modal
    showToast('Review feature coming soon', 'info');
}

/**
 * Save settings
 */
async function saveSettings() {
    showToast('Settings saved successfully', 'success');
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    const icon = document.createElement('i');
    icon.className = `fas fa-${iconMap[type] || 'info-circle'}`;

    const span = document.createElement('span');
    span.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(span);
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions available globally for onclick handlers
window.showSection = showSection;
window.cancelBooking = cancelBooking;
window.viewBookingDetails = viewBookingDetails;
window.leaveReview = leaveReview;
window.saveSettings = saveSettings;
window.showToast = showToast;
