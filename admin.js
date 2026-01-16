/**
 * RentMyCar - Admin Dashboard
 */

// Conditional logging - only in development
const log = CONFIG?.IS_PRODUCTION === false ? log.bind(console) : () => {};
const logError = CONFIG?.IS_PRODUCTION === false ? logError.bind(console) : () => {};

// Global state
let currentUser = null;
let statsData = null;
let revenueChart = null;
let userDistributionChart = null;
let dailyRevenueChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    log('Admin dashboard initializing...');

    // Check authentication
    await checkAdminAuth();

    // Setup navigation
    setupNavigation();

    // Setup event listeners
    setupEventListeners();

    // Load initial data
    await loadDashboardData();
});

/**
 * Check if user is authenticated and is admin
 */
async function checkAdminAuth() {
    const sessionToken = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_TOKEN);

    if (!sessionToken) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const result = await api.getCurrentUser();

        if (!result.success || !result.user) {
            throw new Error('Not authenticated');
        }

        if (!result.user.isAdmin) {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return;
        }

        currentUser = result.user;
        updateUserDisplay();

    } catch (error) {
        logError('Auth error:', error);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION_TOKEN);
        window.location.href = 'index.html';
    }
}

/**
 * Update user display in sidebar
 */
function updateUserDisplay() {
    const userName = document.querySelector('.user-name');
    if (userName && currentUser) {
        userName.textContent = currentUser.firstName + ' ' + currentUser.lastName;
    }
}

/**
 * Setup navigation
 */
function setupNavigation() {
    const sidebarNavItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    const allNavItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
    const sections = document.querySelectorAll('.dashboard-section');

    function switchSection(targetId) {
        allNavItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active'));

        allNavItems.forEach(nav => {
            if (nav.getAttribute('href') === '#' + targetId) {
                nav.classList.add('active');
            }
        });

        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update page title
        const titles = {
            'overview': 'Platform Overview',
            'users': 'Users Management',
            'bookings': 'Bookings Management',
            'cars': 'Cars Management',
            'revenue': 'Revenue Reports'
        };
        document.getElementById('pageTitle').textContent = titles[targetId] || targetId;

        // Load section data
        loadSectionData(targetId);
    }

    sidebarNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            switchSection(targetId);
        });
    });

    mobileNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            switchSection(targetId);
        });
    });

    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.dashboard-sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await api.logout();
            localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
            window.location.href = 'index.html';
        });
    }

    // User filters
    document.getElementById('userSearch')?.addEventListener('input', debounce(loadUsers, 300));
    document.getElementById('userRoleFilter')?.addEventListener('change', loadUsers);
    document.getElementById('userStatusFilter')?.addEventListener('change', loadUsers);

    // Booking filters
    document.getElementById('bookingStatusFilter')?.addEventListener('change', loadBookings);

    // Car filters
    document.getElementById('carStatusFilter')?.addEventListener('change', loadCars);

    // Revenue filters
    document.getElementById('applyDateFilter')?.addEventListener('click', loadRevenue);
    document.getElementById('exportCsv')?.addEventListener('click', exportRevenueCsv);

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        });
    });

    // Save user button
    document.getElementById('saveUserBtn')?.addEventListener('click', saveUser);
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    await loadStats();
}

/**
 * Load section-specific data
 */
async function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'overview':
            await loadStats();
            break;
        case 'users':
            await loadUsers();
            break;
        case 'bookings':
            await loadBookings();
            break;
        case 'cars':
            await loadCars();
            break;
        case 'revenue':
            await loadRevenue();
            break;
    }
}

/**
 * Load platform statistics
 */
async function loadStats() {
    try {
        const result = await api.request('/admin/stats');

        if (!result.success) {
            logError('Failed to load stats:', result.error);
            return;
        }

        statsData = result.stats;
        updateStatsDisplay();
        updateCharts();

    } catch (error) {
        logError('Error loading stats:', error);
    }
}

/**
 * Update stats display
 */
function updateStatsDisplay() {
    if (!statsData) return;

    // Main stats
    document.getElementById('totalRevenue').textContent = formatCurrency(statsData.revenue.total);
    document.getElementById('totalUsers').textContent = statsData.users.total;
    document.getElementById('activeUsers').textContent = statsData.users.active;
    document.getElementById('totalBookings').textContent = statsData.bookings.total;
    document.getElementById('pendingBookings').textContent = statsData.bookings.pending;
    document.getElementById('activeCars').textContent = statsData.cars.active;
    document.getElementById('totalCars').textContent = statsData.cars.total;

    // Quick stats
    document.getElementById('transactionVolume').textContent = formatCurrency(statsData.revenue.transactionVolume);
    document.getElementById('ownerPayouts').textContent = formatCurrency(statsData.revenue.transactionVolume - statsData.revenue.total);
    document.getElementById('bookingsToday').textContent = statsData.bookings.today;
    document.getElementById('activeRentals').textContent = statsData.bookings.active;
}

/**
 * Update charts
 */
function updateCharts() {
    if (!statsData) return;

    // User distribution chart
    const userCtx = document.getElementById('userDistributionChart');
    if (userCtx) {
        if (userDistributionChart) userDistributionChart.destroy();

        userDistributionChart = new Chart(userCtx, {
            type: 'doughnut',
            data: {
                labels: ['Renters', 'Owners', 'Both'],
                datasets: [{
                    data: [
                        statsData.users.renters,
                        statsData.users.owners,
                        Math.max(0, statsData.users.total - statsData.users.renters - statsData.users.owners)
                    ],
                    backgroundColor: ['#6366f1', '#22c55e', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    // Revenue trend chart (placeholder - would need historical data)
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        if (revenueChart) revenueChart.destroy();

        revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Revenue',
                    data: [100, 150, 200, 180, 220, 300, statsData.revenue.today],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

/**
 * Load users
 */
async function loadUsers() {
    try {
        const filters = {
            search: document.getElementById('userSearch')?.value || '',
            role: document.getElementById('userRoleFilter')?.value || '',
            status: document.getElementById('userStatusFilter')?.value || ''
        };

        const result = await api.request('/admin/users', { params: filters });

        if (!result.success) {
            logError('Failed to load users:', result.error);
            return;
        }

        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        // Use SecurityUtils for XSS prevention
        const esc = SecurityUtils?.escapeHtml || (s => s);
        tbody.innerHTML = result.users.map(user => `
            <tr>
                <td>
                    <div class="user-cell">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&background=6366f1&color=fff"
                             alt="${esc(user.firstName)}" class="user-avatar-small">
                        <span>${esc(user.firstName)} ${esc(user.lastName)}</span>
                        ${user.isAdmin ? '<span class="admin-tag">Admin</span>' : ''}
                    </div>
                </td>
                <td>${esc(user.email)}</td>
                <td><span class="role-badge ${esc(user.role)}">${esc(user.role)}</span></td>
                <td>${esc(user.businessName || '-')}</td>
                <td><span class="status-badge ${esc(user.status)}">${esc(user.status)}</span></td>
                <td>${formatDate(user.joinDate)}</td>
                <td>
                    <button class="btn-icon" onclick="editUser('${esc(user.id)}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon ${user.status === 'active' ? 'danger' : 'success'}"
                            onclick="toggleUserStatus('${esc(user.id)}', '${esc(user.status)}')"
                            title="${user.status === 'active' ? 'Suspend' : 'Activate'}">
                        <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        logError('Error loading users:', error);
    }
}

/**
 * Edit user modal
 */
window.editUser = async function(userId) {
    try {
        const result = await api.request('/admin/users', { params: { search: '' } });
        const user = result.users.find(u => u.id === userId);

        if (!user) return;

        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserName').textContent = user.firstName + ' ' + user.lastName;
        document.getElementById('editUserEmail').textContent = user.email;
        document.getElementById('editUserRole').value = user.role;
        document.getElementById('editUserStatus').value = user.status;
        document.getElementById('editUserAdmin').checked = user.isAdmin;

        document.getElementById('userEditModal').style.display = 'flex';

    } catch (error) {
        logError('Error loading user:', error);
    }
};

/**
 * Save user changes
 */
async function saveUser() {
    try {
        const userId = document.getElementById('editUserId').value;
        const updates = {
            role: document.getElementById('editUserRole').value,
            status: document.getElementById('editUserStatus').value,
            isAdmin: document.getElementById('editUserAdmin').checked
        };

        const result = await api.request(`/admin/users/${userId}`, { method: 'PUT', body: updates });

        if (result.success) {
            document.getElementById('userEditModal').style.display = 'none';
            await loadUsers();
        } else {
            alert('Failed to update user: ' + result.error);
        }

    } catch (error) {
        logError('Error saving user:', error);
        alert('Error saving user');
    }
}

/**
 * Toggle user status
 */
window.toggleUserStatus = async function(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmMsg = currentStatus === 'active'
        ? 'Are you sure you want to suspend this user?'
        : 'Are you sure you want to activate this user?';

    if (!confirm(confirmMsg)) return;

    try {
        const result = await api.request(`/admin/users/${userId}`, {
            method: 'PUT',
            body: { status: newStatus }
        });

        if (result.success) {
            await loadUsers();
        } else {
            alert('Failed to update user: ' + result.error);
        }

    } catch (error) {
        logError('Error updating user:', error);
    }
};

/**
 * Load bookings
 */
async function loadBookings() {
    try {
        const filters = {
            status: document.getElementById('bookingStatusFilter')?.value || ''
        };

        const result = await api.request('/admin/bookings', { params: filters });

        if (!result.success) {
            logError('Failed to load bookings:', result.error);
            return;
        }

        const tbody = document.getElementById('bookingsTableBody');
        if (!tbody) return;

        // Use SecurityUtils for XSS prevention
        const esc = SecurityUtils?.escapeHtml || (s => s);
        tbody.innerHTML = result.bookings.map(booking => `
            <tr>
                <td><code>${esc(booking.id.substring(0, 12))}...</code></td>
                <td>${esc(booking.car.make || '')} ${esc(booking.car.model || '')}</td>
                <td>${esc(booking.renter.firstName || '')} ${esc(booking.renter.lastName || '')}</td>
                <td>${esc(booking.owner.firstName || '')} ${esc(booking.owner.lastName || '')}</td>
                <td>${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}</td>
                <td>${formatCurrency(booking.totalAmount)}</td>
                <td>${formatCurrency(booking.platformEarnings)}</td>
                <td><span class="status-badge ${esc(booking.status)}">${esc(booking.status)}</span></td>
                <td>
                    <select class="status-select" onchange="updateBookingStatus('${esc(booking.id)}', this.value)">
                        <option value="">Change...</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        logError('Error loading bookings:', error);
    }
}

/**
 * Update booking status
 */
window.updateBookingStatus = async function(bookingId, newStatus) {
    if (!newStatus) return;

    try {
        const result = await api.request(`/admin/bookings/${bookingId}/status`, {
            method: 'POST',
            body: { status: newStatus }
        });

        if (result.success) {
            await loadBookings();
        } else {
            alert('Failed to update booking: ' + result.error);
        }

    } catch (error) {
        logError('Error updating booking:', error);
    }
};

/**
 * Load cars
 */
async function loadCars() {
    try {
        const filters = {
            status: document.getElementById('carStatusFilter')?.value || ''
        };

        const result = await api.request('/admin/cars', { params: filters });

        if (!result.success) {
            logError('Failed to load cars:', result.error);
            return;
        }

        const tbody = document.getElementById('carsTableBody');
        if (!tbody) return;

        // Use SecurityUtils for XSS prevention
        const esc = SecurityUtils?.escapeHtml || (s => s);
        tbody.innerHTML = result.cars.map(car => `
            <tr>
                <td>${esc(car.make)} ${esc(car.model)} (${esc(String(car.year))})</td>
                <td>${esc(car.owner.firstName || '')} ${esc(car.owner.lastName || '')}</td>
                <td>${formatCurrency(car.pricePerDay)}/day</td>
                <td>${esc(car.location || '-')}</td>
                <td>${esc(String(car.bookingCount))}</td>
                <td>${car.rating ? esc(car.rating.toFixed(1)) + ' <i class="fas fa-star text-yellow"></i>' : '-'}</td>
                <td><span class="status-badge ${esc(car.status)}">${esc(car.status)}</span></td>
                <td>
                    <select class="status-select" onchange="updateCarStatus('${esc(car.id)}', this.value)">
                        <option value="">Change...</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        logError('Error loading cars:', error);
    }
}

/**
 * Update car status
 */
window.updateCarStatus = async function(carId, newStatus) {
    if (!newStatus) return;

    try {
        const result = await api.request(`/admin/cars/${carId}`, {
            method: 'PUT',
            body: { status: newStatus }
        });

        if (result.success) {
            await loadCars();
        } else {
            alert('Failed to update car: ' + result.error);
        }

    } catch (error) {
        logError('Error updating car:', error);
    }
};

/**
 * Load revenue data
 */
async function loadRevenue() {
    try {
        const filters = {
            startDate: document.getElementById('revenueStartDate')?.value || '',
            endDate: document.getElementById('revenueEndDate')?.value || ''
        };

        const result = await api.request('/admin/revenue', { params: filters });

        if (!result.success) {
            logError('Failed to load revenue:', result.error);
            return;
        }

        // Update stats
        document.getElementById('revTotalBookings').textContent = result.revenue.totalBookings;
        document.getElementById('revTransactionVolume').textContent = formatCurrency(result.revenue.totalTransactionVolume);
        document.getElementById('revRenterFees').textContent = formatCurrency(result.revenue.totalRenterFees);
        document.getElementById('revOwnerFees').textContent = formatCurrency(result.revenue.totalOwnerFees);
        document.getElementById('revPlatformEarnings').textContent = formatCurrency(result.revenue.totalPlatformEarnings);
        document.getElementById('revOwnerPayouts').textContent = formatCurrency(result.revenue.totalOwnerPayouts);

        // Update chart
        updateDailyRevenueChart(result.chartData);

    } catch (error) {
        logError('Error loading revenue:', error);
    }
}

/**
 * Update daily revenue chart
 */
function updateDailyRevenueChart(chartData) {
    const ctx = document.getElementById('dailyRevenueChart');
    if (!ctx) return;

    if (dailyRevenueChart) dailyRevenueChart.destroy();

    dailyRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(d => d.date),
            datasets: [{
                label: 'Platform Revenue',
                data: chartData.map(d => d.revenue),
                backgroundColor: '#6366f1'
            }, {
                label: 'Transaction Volume',
                data: chartData.map(d => d.volume),
                backgroundColor: '#22c55e'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/**
 * Export revenue to CSV
 */
async function exportRevenueCsv() {
    try {
        const filters = {
            startDate: document.getElementById('revenueStartDate')?.value || '',
            endDate: document.getElementById('revenueEndDate')?.value || ''
        };

        const result = await api.request('/admin/revenue/export', { params: filters });

        if (!result.success) {
            alert('Failed to export: ' + result.error);
            return;
        }

        // Download CSV
        const blob = new Blob([result.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rentmycar-revenue-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        logError('Error exporting CSV:', error);
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
