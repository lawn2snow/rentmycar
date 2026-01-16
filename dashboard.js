// Dashboard JavaScript for RentMyCar

// Global current user
let currentUser = null;

// Conditional logging - only in development
const log = CONFIG?.IS_PRODUCTION === false ? console.log.bind(console) : () => {};
const logError = CONFIG?.IS_PRODUCTION === false ? console.error.bind(console) : () => {};

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', function() {
    // Check localStorage directly
    const sessionToken = localStorage.getItem('rentmycar_session');
    const userJson = localStorage.getItem('rentmycar_user');

    let user = null;

    // Try to get user from localStorage directly
    if (userJson) {
        try {
            user = JSON.parse(userJson);
        } catch (e) {
            logError('Failed to parse user:', e);
        }
    }

    // If no user from localStorage, try API method
    if (!user && typeof api !== 'undefined' && api.isLoggedIn()) {
        user = api.getStoredUser();
    }

    // If still no auth, check for demo mode or redirect
    if (!user) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true') {
            user = {
                id: 'demo_owner',
                firstName: 'Demo',
                lastName: 'Owner',
                email: 'demo@rentmycar.com',
                phone: '(555) 123-4567',
                role: 'owner'
            };
        } else {
            window.location.href = 'index.html';
            return;
        }
    }

    // Redirect renters to renter dashboard
    if (user && user.role === 'renter') {
        window.location.href = 'renter-dashboard.html';
        return;
    }

    // Store user globally
    currentUser = user;

    updateUserInfo(user);
    updateSettingsForm(user);
    initializeDashboard();
});

// Check if user is authenticated for dashboard (legacy support)
function checkDashboardAuth() {
    return api.isLoggedIn();
}

// Update user information
function updateUserInfo(user) {
    const userName = document.querySelector('.user-name');
    const userAvatar = document.querySelector('.user-avatar');
    
    if (userName) {
        userName.textContent = (user.firstName + ' ' + user.lastName) || 'Dashboard User';
    }
    
    if (userAvatar) {
        // In production, this would be the user's actual avatar
        userAvatar.src = `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=6366f1&color=fff`;
    }
}

// Initialize dashboard
function initializeDashboard() {
    // Setup navigation
    setupSidebarNavigation();
    
    // Setup header actions
    setupHeaderActions();
    
    // Load dashboard data
    loadDashboardData();
    
    // Initialize charts
    initializeCharts();
    
    // Setup real-time updates
    startRealTimeUpdates();
    
    // Setup notifications
    setupNotifications();
    
    // Setup fleet manager
    setupFleetManager();
    
    // Setup AI insights
    setupAIInsights();

    // Setup booking actions
    setupBookingActions();
}

// Setup sidebar navigation
function setupSidebarNavigation() {
    const sidebarNavItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    const allNavItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
    const sections = document.querySelectorAll('.dashboard-section');

    // Function to switch sections
    function switchSection(targetId) {
        // Remove active class from all nav items and sections
        allNavItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active'));

        // Add active class to matching nav items
        allNavItems.forEach(nav => {
            if (nav.getAttribute('href') === '#' + targetId) {
                nav.classList.add('active');
            }
        });

        // Show target section
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }

    // Handle sidebar nav clicks
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            switchSection(targetId);
            updatePageTitle(item.querySelector('span')?.textContent || targetId);
        });
    });

    // Handle mobile nav clicks
    mobileNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('href').substring(1);
            switchSection(targetId);
            updatePageTitle(item.querySelector('span')?.textContent || targetId);
        });
    });

    // Logout button
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Setup header actions
function setupHeaderActions() {
    // Menu toggle for mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.dashboard-sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }
    
    // Date filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateDataForPeriod(btn.textContent);
        });
    });
    
    // Dark mode toggle
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
    
    // Notification button
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', toggleNotifications);
    }
}

// Load dashboard data
function loadDashboardData() {
    // Simulate loading data from API
    updateKPIs();
    updateRecentActivity();
    updateFleetStatus();
}

// Update KPIs
function updateKPIs() {
    // Set static values - in production, these would come from the API
    const earningsEl = document.querySelector('[data-kpi="totalEarnings"]');
    const rentalsEl = document.querySelector('[data-kpi="activeRentals"]');
    const bookingsEl = document.querySelector('[data-kpi="totalBookings"]');
    const ratingEl = document.querySelector('[data-kpi="avgRating"]');

    if (earningsEl) earningsEl.textContent = '$12,450';
    if (rentalsEl) rentalsEl.textContent = '8';
    if (bookingsEl) bookingsEl.textContent = '145';
    if (ratingEl) ratingEl.textContent = '4.9';
}

// Animate numeric values
function animateValue(id, start, end, duration, prefix = '', decimals = 0) {
    const element = document.querySelector(`[data-kpi="${id}"]`) || 
                   document.querySelector(`.kpi-value`);
    
    if (!element) return;
    
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (decimals > 0) {
            element.textContent = prefix + current.toFixed(decimals);
        } else {
            element.textContent = prefix + current.toLocaleString();
        }
        
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// Initialize Charts
function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Revenue ($)',
                    data: [1200, 1900, 1500, 2500, 2200, 3000, 2800],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Heat Map Chart
    const heatmapCtx = document.getElementById('heatmapChart');
    if (heatmapCtx) {
        new Chart(heatmapCtx, {
            type: 'bar',
            data: {
                labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
                datasets: [{
                    label: 'Bookings',
                    data: [5, 15, 25, 20, 30, 18],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.4)',
                        'rgba(99, 102, 241, 0.6)',
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(99, 102, 241, 0.7)',
                        'rgba(99, 102, 241, 1)',
                        'rgba(99, 102, 241, 0.6)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Forecast Chart
    const forecastCtx = document.getElementById('forecastChart');
    if (forecastCtx) {
        new Chart(forecastCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: 30}, (_, i) => `Day ${i + 1}`),
                datasets: [{
                    label: 'Predicted Revenue',
                    data: generateForecastData(),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Confidence Interval',
                    data: generateForecastData(0.8),
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: '-1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
}

// Generate forecast data
function generateForecastData(multiplier = 1) {
    return Array.from({length: 30}, (_, i) => {
        const base = 500;
        const trend = i * 10;
        const seasonal = Math.sin(i / 5) * 50;
        const random = Math.random() * 100 - 50;
        return Math.max(0, (base + trend + seasonal + random) * multiplier);
    });
}

// Update recent activity
function updateRecentActivity() {
    // Static demo activities (no user input, safe for innerHTML)
    const activities = [
        {
            type: 'success',
            icon: 'check',
            title: 'New Booking',
            description: 'Tesla Model 3 booked by Sarah M.',
            time: '2 minutes ago'
        },
        {
            type: 'warning',
            icon: 'clock',
            title: 'Pending Approval',
            description: 'BMW X5 booking request',
            time: '15 minutes ago'
        },
        {
            type: 'info',
            icon: 'star',
            title: 'New Review',
            description: '5-star review for Mercedes S-Class',
            time: '1 hour ago'
        },
        {
            type: 'success',
            icon: 'dollar-sign',
            title: 'Payment Received',
            description: '$450 from John D.',
            time: '2 hours ago'
        }
    ];

    const activityList = document.querySelector('.activity-list');
    if (activityList && activities.length > 0) {
        // Clear and rebuild using DOM methods for safety
        activityList.innerHTML = '';
        activities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';

            const iconDiv = document.createElement('div');
            iconDiv.className = `activity-icon ${SecurityUtils.escapeHtml(activity.type)}`;
            const icon = document.createElement('i');
            icon.className = `fas fa-${SecurityUtils.escapeHtml(activity.icon)}`;
            iconDiv.appendChild(icon);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'activity-content';
            const p = document.createElement('p');
            const strong = document.createElement('strong');
            strong.textContent = activity.title + ': ';
            p.appendChild(strong);
            p.appendChild(document.createTextNode(activity.description));
            const timeSpan = document.createElement('span');
            timeSpan.className = 'activity-time';
            timeSpan.textContent = activity.time;
            contentDiv.appendChild(p);
            contentDiv.appendChild(timeSpan);

            item.appendChild(iconDiv);
            item.appendChild(contentDiv);
            activityList.appendChild(item);
        });
    }
}

// Update fleet status
function updateFleetStatus() {
    // This would fetch real data from API
    const fleetData = [
        {
            name: 'Tesla Model 3',
            status: 'active',
            earnings: 4250,
            trips: 35,
            rating: 4.9
        },
        {
            name: 'BMW X5',
            status: 'maintenance',
            earnings: 3800,
            trips: 28,
            rating: 4.8
        }
    ];
    
    // Update fleet cards if on fleet section
    updateFleetCards(fleetData);
}

// Update fleet cards
function updateFleetCards(fleetData) {
    // Implementation for updating fleet cards
    log('Fleet data updated:', fleetData);
}

// Setup fleet manager
function setupFleetManager() {
    const addVehicleBtn = document.querySelector('.add-vehicle');
    if (addVehicleBtn) {
        addVehicleBtn.addEventListener('click', () => {
            showAddVehicleModal();
        });
    }
    
    // Fleet action buttons
    document.querySelectorAll('.btn-icon').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.querySelector('i').className.includes('edit') ? 'edit' :
                          btn.querySelector('i').className.includes('chart') ? 'analytics' :
                          btn.querySelector('i').className.includes('pause') ? 'pause' : 'play';
            handleFleetAction(action);
        });
    });
}

// Setup AI insights
function setupAIInsights() {
    // Apply suggestion buttons
    document.querySelectorAll('.btn-apply').forEach(btn => {
        btn.addEventListener('click', () => {
            applyAISuggestion('pricing');
        });
    });
    
    // View details buttons
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => {
            showInsightDetails();
        });
    });
    
    // Schedule buttons
    document.querySelectorAll('.btn-schedule').forEach(btn => {
        btn.addEventListener('click', () => {
            scheduleMaintenance();
        });
    });
    
    // Create offer buttons
    document.querySelectorAll('.btn-create').forEach(btn => {
        btn.addEventListener('click', () => {
            createLoyaltyOffer();
        });
    });
}

// Setup booking actions (Approve/Decline) using event delegation
function setupBookingActions() {
    // Use event delegation on the bookings section
    const bookingsSection = document.getElementById('bookings');
    if (bookingsSection) {
        bookingsSection.addEventListener('click', (e) => {
            const target = e.target;
            const bookingRow = target.closest('.booking-item, .booking-row, tr');

            // Handle Approve button
            if (target.classList.contains('btn-success') || target.closest('.btn-success')) {
                e.preventDefault();
                approveBooking(bookingRow);
                return;
            }

            // Handle Decline button
            if (target.textContent.trim() === 'Decline' ||
                (target.closest('.btn-outline') && target.closest('.btn-outline').textContent.trim() === 'Decline')) {
                e.preventDefault();
                declineBooking(bookingRow);
                return;
            }

            // Handle Message button
            if (target.textContent.trim() === 'Message' ||
                (target.closest('.btn-outline') && target.closest('.btn-outline').textContent.trim() === 'Message')) {
                e.preventDefault();
                messageRenter(bookingRow);
                return;
            }
        });
    }

    // Export report button
    const exportBtn = document.querySelector('.btn-outline i.fa-download');
    if (exportBtn) {
        exportBtn.parentElement.addEventListener('click', () => {
            exportReport();
        });
    }

    // Save settings button
    document.querySelectorAll('.settings-card .btn-primary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            saveSettings();
        });
    });

    // Payment buttons
    document.querySelectorAll('.settings-card .btn-outline').forEach(btn => {
        const text = btn.textContent.trim();
        if (text === 'Update Payment Method') {
            btn.addEventListener('click', updatePaymentMethod);
        } else if (text === 'View Payout History') {
            btn.addEventListener('click', viewPayoutHistory);
        }
    });
}

// Approve a booking
function approveBooking(bookingRow) {
    showToast('Approving booking...', 'info');

    if (bookingRow) {
        const statusBadge = bookingRow.querySelector('.booking-status, .status-badge');
        if (statusBadge) {
            statusBadge.textContent = 'Approved';
            statusBadge.className = 'booking-status approved';
        }

        // Hide action buttons
        const actionBtns = bookingRow.querySelectorAll('.btn-success, .btn-outline');
        actionBtns.forEach(btn => {
            if (btn.textContent.trim() === 'Approve' || btn.textContent.trim() === 'Decline') {
                btn.style.display = 'none';
            }
        });
    }

    setTimeout(() => {
        showToast('Booking approved! Renter has been notified.', 'success');
    }, 1000);
}

// Decline a booking
function declineBooking(bookingRow) {
    if (!confirm('Are you sure you want to decline this booking?')) return;

    showToast('Declining booking...', 'info');

    if (bookingRow) {
        bookingRow.style.transition = 'opacity 0.3s ease';
        bookingRow.style.opacity = '0.5';

        const statusBadge = bookingRow.querySelector('.booking-status, .status-badge');
        if (statusBadge) {
            statusBadge.textContent = 'Declined';
            statusBadge.className = 'booking-status declined';
        }

        // Hide action buttons
        const actionBtns = bookingRow.querySelectorAll('.btn-success, .btn-outline');
        actionBtns.forEach(btn => {
            if (btn.textContent.trim() === 'Approve' || btn.textContent.trim() === 'Decline') {
                btn.style.display = 'none';
            }
        });
    }

    setTimeout(() => {
        showToast('Booking declined. Renter has been notified.', 'warning');
    }, 1000);
}

// Message renter - show message modal
function messageRenter(bookingElement) {
    // Get booking data from element if available
    let renterName = 'Renter';
    let renterEmail = '';
    let bookingMessage = '';
    let carName = '';
    let bookingDates = '';

    if (bookingElement) {
        // Try to get data from the booking element
        const renterEl = bookingElement.querySelector('.booking-renter strong, .booking-renter h4');
        const emailEl = bookingElement.querySelector('.booking-renter p');
        const carEl = bookingElement.querySelector('.booking-car h4');
        const dateEl = bookingElement.querySelector('.booking-car p');
        const messageEl = bookingElement.querySelector('.booking-message');

        if (renterEl) renterName = renterEl.textContent;
        if (emailEl) renterEmail = emailEl.textContent;
        if (carEl) carName = carEl.textContent;
        if (dateEl) bookingDates = dateEl.textContent;
        if (messageEl) bookingMessage = messageEl.dataset.message || messageEl.textContent;
    }

    // Create message modal
    let modal = document.getElementById('messageModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'messageModal';
        modal.className = 'modal';
        modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:white;padding:2rem;border-radius:16px;max-width:500px;width:95%;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <h2 style="margin:0;font-size:1.25rem;">
                    <i class="fas fa-envelope" style="margin-right:0.5rem;color:#6366f1;"></i>
                    Message from ${renterName}
                </h2>
                <button onclick="closeMessageModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;">&times;</button>
            </div>

            ${carName ? `
            <div style="background:#f1f5f9;padding:1rem;border-radius:8px;margin-bottom:1rem;">
                <p style="margin:0;font-size:0.875rem;color:#64748b;">Booking Request</p>
                <p style="margin:0.25rem 0 0;font-weight:600;">${carName}</p>
                ${bookingDates ? `<p style="margin:0.25rem 0 0;color:#64748b;font-size:0.875rem;">${bookingDates}</p>` : ''}
            </div>
            ` : ''}

            <div style="margin-bottom:1.5rem;">
                <label style="display:block;font-weight:500;margin-bottom:0.5rem;color:#374151;">Renter's Message:</label>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem;min-height:80px;">
                    ${bookingMessage ?
                        `<p style="margin:0;color:#1e293b;white-space:pre-wrap;">${bookingMessage}</p>` :
                        `<p style="margin:0;color:#94a3b8;font-style:italic;">No message provided</p>`
                    }
                </div>
            </div>

            <div style="margin-bottom:1rem;">
                <label style="display:block;font-weight:500;margin-bottom:0.5rem;color:#374151;">Reply to Renter:</label>
                <textarea id="replyMessage" rows="4" placeholder="Type your reply..." style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;resize:vertical;font-family:inherit;"></textarea>
            </div>

            <div style="display:flex;gap:1rem;">
                <button onclick="sendReply('${renterEmail}')" class="btn btn-primary" style="flex:1;padding:0.75rem;">
                    <i class="fas fa-paper-plane" style="margin-right:0.5rem;"></i>Send Reply
                </button>
                <button onclick="closeMessageModal()" class="btn btn-outline" style="flex:1;padding:0.75rem;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;">
                    Close
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// Close message modal
function closeMessageModal() {
    const modal = document.getElementById('messageModal');
    if (modal) modal.style.display = 'none';
}

// Send reply to renter
function sendReply(email) {
    const reply = document.getElementById('replyMessage')?.value.trim();
    if (!reply) {
        showToast('Please enter a message', 'warning');
        return;
    }

    showToast('Sending message...', 'info');

    // In production, this would send via email or in-app messaging
    setTimeout(() => {
        showToast('Message sent to renter!', 'success');
        closeMessageModal();
    }, 1000);
}

// Make functions globally available
window.closeMessageModal = closeMessageModal;
window.sendReply = sendReply;

// Export report
function exportReport() {
    showToast('Generating report...', 'info');
    setTimeout(() => {
        showToast('Report exported successfully!', 'success');
    }, 2000);
}

// Save settings
function saveSettings() {
    showToast('Saving settings...', 'info');
    setTimeout(() => {
        showToast('Settings saved successfully!', 'success');
    }, 1000);
}

// Update payment method
function updatePaymentMethod() {
    showToast('Opening payment settings...', 'info');
}

// View payout history
function viewPayoutHistory() {
    showToast('Loading payout history...', 'info');
}

// Apply AI suggestion
function applyAISuggestion(type) {
    showToast('Applying AI recommendation...', 'info');
    setTimeout(() => {
        showToast('Price optimization applied successfully!', 'success');
    }, 1500);
}

// Show insight details
function showInsightDetails() {
    showToast('Loading detailed insights...', 'info');
}

// Schedule maintenance
function scheduleMaintenance() {
    showToast('Opening maintenance scheduler...', 'info');
}

// Create loyalty offer
function createLoyaltyOffer() {
    showToast('Creating loyalty discount...', 'info');
}

// Handle fleet actions
function handleFleetAction(action) {
    switch(action) {
        case 'edit':
            showToast('Opening vehicle editor...', 'info');
            break;
        case 'analytics':
            showToast('Loading vehicle analytics...', 'info');
            break;
        case 'pause':
            showToast('Pausing vehicle listing...', 'warning');
            break;
        case 'play':
            showToast('Activating vehicle listing...', 'success');
            break;
    }
}

// Update settings form with user data
function updateSettingsForm(user) {
    const nameInput = document.querySelector('.settings-card input[type="text"]');
    const emailInput = document.querySelector('.settings-card input[type="email"]');
    const phoneInput = document.querySelector('.settings-card input[type="tel"]');

    if (nameInput) nameInput.value = (user.firstName || '') + ' ' + (user.lastName || '');
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
}

// Show add vehicle modal
function showAddVehicleModal() {
    let modal = document.getElementById('vehicleModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'vehicleModal';
        modal.className = 'modal';
        modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:white;padding:2rem;border-radius:16px;max-width:600px;width:95%;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <h2 style="margin:0;">Register New Vehicle</h2>
                <button onclick="closeVehicleModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>
            </div>
            <form id="vehicleForm">
                <!-- Vehicle Details Section -->
                <h3 style="margin:0 0 1rem 0;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0;color:#1e293b;font-size:1rem;">
                    <i class="fas fa-car" style="margin-right:0.5rem;color:#6366f1;"></i>Vehicle Details
                </h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                    <div class="form-group">
                        <label>Make *</label>
                        <input type="text" id="vehicleMake" required placeholder="e.g., Tesla" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                    <div class="form-group">
                        <label>Model *</label>
                        <input type="text" id="vehicleModel" required placeholder="e.g., Model 3" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
                    <div class="form-group">
                        <label>Year *</label>
                        <input type="number" id="vehicleYear" required placeholder="2024" min="1990" max="2026" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <select id="vehicleType" required style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                            <option value="sedan">Sedan</option>
                            <option value="suv">SUV</option>
                            <option value="sports">Sports</option>
                            <option value="luxury">Luxury</option>
                            <option value="electric">Electric</option>
                            <option value="truck">Truck</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Color *</label>
                        <input type="text" id="vehicleColor" required placeholder="e.g., White" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                    <label>VIN (Vehicle Identification Number) *</label>
                    <input type="text" id="vehicleVIN" required placeholder="17-character VIN" maxlength="17" pattern="[A-HJ-NPR-Z0-9]{17}" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;text-transform:uppercase;">
                    <small style="color:#64748b;font-size:0.75rem;">Found on dashboard or driver's door jamb</small>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
                    <div class="form-group">
                        <label>Price Per Day ($) *</label>
                        <input type="number" id="vehiclePrice" required placeholder="100" min="1" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                    <div class="form-group">
                        <label>Location *</label>
                        <input type="text" id="vehicleLocation" required placeholder="City, State" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                </div>

                <!-- Registration Section -->
                <h3 style="margin:0 0 1rem 0;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0;color:#1e293b;font-size:1rem;">
                    <i class="fas fa-id-card" style="margin-right:0.5rem;color:#6366f1;"></i>Registration Details
                </h3>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
                    <div class="form-group">
                        <label>License Plate *</label>
                        <input type="text" id="vehiclePlate" required placeholder="ABC-1234" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;text-transform:uppercase;">
                    </div>
                    <div class="form-group">
                        <label>State *</label>
                        <input type="text" id="vehicleState" required placeholder="CA" maxlength="2" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;text-transform:uppercase;">
                    </div>
                    <div class="form-group">
                        <label>Reg. Expiry *</label>
                        <input type="date" id="vehicleRegExpiry" required style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                </div>

                <!-- Insurance Section -->
                <h3 style="margin:0 0 1rem 0;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0;color:#1e293b;font-size:1rem;">
                    <i class="fas fa-shield-alt" style="margin-right:0.5rem;color:#6366f1;"></i>Insurance Information
                </h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                    <div class="form-group">
                        <label>Insurance Provider *</label>
                        <input type="text" id="vehicleInsProvider" required placeholder="e.g., State Farm" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                    <div class="form-group">
                        <label>Policy Number *</label>
                        <input type="text" id="vehicleInsPolicy" required placeholder="Policy #" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:1.5rem;">
                    <label>Insurance Expiry Date *</label>
                    <input type="date" id="vehicleInsExpiry" required style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                </div>

                <!-- Document Uploads Section -->
                <h3 style="margin:0 0 1rem 0;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0;color:#1e293b;font-size:1rem;">
                    <i class="fas fa-file-upload" style="margin-right:0.5rem;color:#6366f1;"></i>Document Uploads
                </h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                    <div class="form-group">
                        <label>Driver's License *</label>
                        <input type="file" id="vehicleDriversLicense" required accept="image/*,.pdf" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
                        <small style="color:#64748b;font-size:0.75rem;">Front of license (JPG, PNG, PDF)</small>
                    </div>
                    <div class="form-group">
                        <label>Vehicle Registration *</label>
                        <input type="file" id="vehicleRegDoc" required accept="image/*,.pdf" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
                        <small style="color:#64748b;font-size:0.75rem;">Current registration document</small>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
                    <div class="form-group">
                        <label>Insurance Card *</label>
                        <input type="file" id="vehicleInsCard" required accept="image/*,.pdf" style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
                        <small style="color:#64748b;font-size:0.75rem;">Proof of insurance</small>
                    </div>
                    <div class="form-group">
                        <label>Vehicle Photos</label>
                        <input type="file" id="vehiclePhotos" accept="image/*" multiple style="width:100%;padding:0.5rem;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
                        <small style="color:#64748b;font-size:0.75rem;">Upload multiple photos</small>
                    </div>
                </div>

                <!-- Additional Info Section -->
                <h3 style="margin:0 0 1rem 0;padding-bottom:0.5rem;border-bottom:2px solid #e2e8f0;color:#1e293b;font-size:1rem;">
                    <i class="fas fa-info-circle" style="margin-right:0.5rem;color:#6366f1;"></i>Additional Information
                </h3>
                <div class="form-group" style="margin-bottom:1rem;">
                    <label>Features (comma separated)</label>
                    <input type="text" id="vehicleFeatures" placeholder="Autopilot, Leather Seats, Sunroof, Bluetooth" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                    <label>Vehicle Description</label>
                    <textarea id="vehicleDescription" placeholder="Describe your vehicle, any special features or rules..." rows="3" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;resize:vertical;"></textarea>
                </div>
                <div class="form-group" style="margin-bottom:1.5rem;">
                    <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                        <input type="checkbox" id="vehicleInstantBook">
                        <span>Enable Instant Book (renters can book without approval)</span>
                    </label>
                </div>

                <!-- Terms -->
                <div class="form-group" style="margin-bottom:1.5rem;padding:1rem;background:#f8fafc;border-radius:8px;">
                    <label style="display:flex;align-items:flex-start;gap:0.5rem;cursor:pointer;">
                        <input type="checkbox" id="vehicleTerms" required style="margin-top:0.25rem;">
                        <span style="font-size:0.875rem;">I confirm that I am the legal owner of this vehicle, all information provided is accurate, and I have valid insurance coverage that permits car sharing. *</span>
                    </label>
                </div>

                <button type="submit" class="btn btn-primary" style="width:100%;padding:1rem;font-size:1rem;">
                    <i class="fas fa-check-circle" style="margin-right:0.5rem;"></i>Submit for Verification
                </button>
                <p style="text-align:center;margin-top:1rem;color:#64748b;font-size:0.875rem;">
                    <i class="fas fa-clock" style="margin-right:0.25rem;"></i>Verification typically takes 24-48 hours
                </p>
            </form>
        </div>
    `;

    modal.style.display = 'flex';

    document.getElementById('vehicleForm').addEventListener('submit', handleAddVehicle);
}

function closeVehicleModal() {
    const modal = document.getElementById('vehicleModal');
    if (modal) modal.style.display = 'none';
}

async function handleAddVehicle(e) {
    e.preventDefault();

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    // Collect all vehicle data
    const vehicleData = {
        // Vehicle Details
        make: document.getElementById('vehicleMake').value,
        model: document.getElementById('vehicleModel').value,
        year: parseInt(document.getElementById('vehicleYear').value),
        type: document.getElementById('vehicleType').value,
        color: document.getElementById('vehicleColor').value,
        vin: document.getElementById('vehicleVIN').value.toUpperCase(),
        pricePerDay: parseFloat(document.getElementById('vehiclePrice').value),
        location: document.getElementById('vehicleLocation').value,

        // Registration Details
        licensePlate: document.getElementById('vehiclePlate').value.toUpperCase(),
        registrationState: document.getElementById('vehicleState').value.toUpperCase(),
        registrationExpiry: document.getElementById('vehicleRegExpiry').value,

        // Insurance Details
        insuranceProvider: document.getElementById('vehicleInsProvider').value,
        insurancePolicyNumber: document.getElementById('vehicleInsPolicy').value,
        insuranceExpiry: document.getElementById('vehicleInsExpiry').value,

        // Additional Info
        features: document.getElementById('vehicleFeatures').value.split(',').map(f => f.trim()).filter(f => f),
        description: document.getElementById('vehicleDescription').value,
        instantBook: document.getElementById('vehicleInstantBook').checked,

        // Status
        status: 'pending_verification',
        verificationStatus: 'pending'
    };

    // Handle file uploads (convert to base64 for demo - in production use cloud storage)
    try {
        const driversLicense = document.getElementById('vehicleDriversLicense').files[0];
        const regDoc = document.getElementById('vehicleRegDoc').files[0];
        const insCard = document.getElementById('vehicleInsCard').files[0];
        const photos = document.getElementById('vehiclePhotos').files;

        // Store file names for now (in production, upload to cloud storage)
        vehicleData.documents = {
            driversLicense: driversLicense ? driversLicense.name : null,
            registration: regDoc ? regDoc.name : null,
            insuranceCard: insCard ? insCard.name : null
        };

        // Get photo file names
        vehicleData.images = [];
        for (let i = 0; i < photos.length; i++) {
            vehicleData.images.push(photos[i].name);
        }

        showToast('Submitting vehicle for verification...', 'info');

        const result = await api.createCar(vehicleData);
        if (result.success) {
            showToast('Vehicle submitted for verification! We\'ll review it within 24-48 hours.', 'success');
            closeVehicleModal();
            loadFleetData();
        } else {
            showToast(result.error || 'Failed to submit vehicle', 'error');
        }
    } catch (error) {
        logError('Error submitting vehicle:', error);
        showToast('Error submitting vehicle', 'error');
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Load fleet data from API
async function loadFleetData() {
    try {
        const result = await api.getOwnerCars();
        if (result.success && result.cars) {
            updateFleetDisplay(result.cars);
        }
    } catch (error) {
        logError('Error loading fleet:', error);
    }
}

function updateFleetDisplay(cars) {
    const fleetGrid = document.querySelector('.fleet-grid');
    if (!fleetGrid) return;

    // Clear existing content
    fleetGrid.innerHTML = '';

    if (cars.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.style.cssText = 'grid-column:1/-1;text-align:center;padding:3rem;';
        emptyState.innerHTML = `
            <i class="fas fa-car" style="font-size:3rem;color:#cbd5e1;margin-bottom:1rem;"></i>
            <h3>No vehicles yet</h3>
            <p>Add your first vehicle to start earning!</p>
        `;
        fleetGrid.appendChild(emptyState);
        return;
    }

    // Build cards using DOM methods for security
    cars.forEach(car => {
        const card = document.createElement('div');
        card.className = 'fleet-card';

        const img = document.createElement('img');
        img.src = SecurityUtils.escapeUrl(car.images?.[0] || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400');
        img.alt = SecurityUtils.escapeHtml(`${car.make} ${car.model}`);

        const content = document.createElement('div');
        content.className = 'fleet-card-content';

        const h4 = document.createElement('h4');
        h4.textContent = `${car.make} ${car.model} ${car.year || ''}`;

        const price = document.createElement('p');
        price.className = 'fleet-price';
        price.textContent = `$${car.pricePerDay}/day`;

        const location = document.createElement('p');
        location.className = 'fleet-location';
        const locationIcon = document.createElement('i');
        locationIcon.className = 'fas fa-map-marker-alt';
        location.appendChild(locationIcon);
        location.appendChild(document.createTextNode(' ' + (car.location || 'Location TBD')));

        const status = document.createElement('div');
        status.className = `fleet-status ${SecurityUtils.escapeHtml(car.status || 'active')}`;
        status.textContent = car.status || 'Active';

        content.appendChild(h4);
        content.appendChild(price);
        content.appendChild(location);
        content.appendChild(status);

        card.appendChild(img);
        card.appendChild(content);
        fleetGrid.appendChild(card);
    });
}

// Show edit vehicle modal
let editingCarId = null;

function showEditVehicleModal(carId, make, model, year, type, price, location) {
    editingCarId = carId;

    let modal = document.getElementById('vehicleModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'vehicleModal';
        modal.className = 'modal';
        modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:white;padding:2rem;border-radius:16px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <h2 style="margin:0;">Edit Vehicle</h2>
                <button onclick="closeVehicleModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>
            </div>
            <form id="editVehicleForm">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                    <div class="form-group">
                        <label>Make</label>
                        <input type="text" id="editVehicleMake" required value="${make}" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                    <div class="form-group">
                        <label>Model</label>
                        <input type="text" id="editVehicleModel" required value="${model}" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                    <div class="form-group">
                        <label>Year</label>
                        <input type="number" id="editVehicleYear" required value="${year}" min="1990" max="2026" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select id="editVehicleType" required style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                            <option value="sedan" ${type === 'sedan' ? 'selected' : ''}>Sedan</option>
                            <option value="suv" ${type === 'suv' ? 'selected' : ''}>SUV</option>
                            <option value="sports" ${type === 'sports' ? 'selected' : ''}>Sports</option>
                            <option value="luxury" ${type === 'luxury' ? 'selected' : ''}>Luxury</option>
                            <option value="electric" ${type === 'electric' ? 'selected' : ''}>Electric</option>
                            <option value="truck" ${type === 'truck' ? 'selected' : ''}>Truck</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                    <label>Price Per Day ($)</label>
                    <input type="number" id="editVehiclePrice" required value="${price}" min="1" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                    <label>Location</label>
                    <input type="text" id="editVehicleLocation" required value="${location}" style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                </div>
                <div style="display:flex;gap:1rem;">
                    <button type="submit" class="btn btn-primary" style="flex:1;padding:1rem;">Save Changes</button>
                    <button type="button" onclick="deleteVehicle('${carId}')" class="btn" style="flex:1;padding:1rem;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;">Delete</button>
                </div>
            </form>
        </div>
    `;

    modal.style.display = 'flex';

    document.getElementById('editVehicleForm').addEventListener('submit', handleEditVehicle);
}

async function handleEditVehicle(e) {
    e.preventDefault();

    const vehicleData = {
        make: document.getElementById('editVehicleMake').value,
        model: document.getElementById('editVehicleModel').value,
        year: parseInt(document.getElementById('editVehicleYear').value),
        type: document.getElementById('editVehicleType').value,
        pricePerDay: parseFloat(document.getElementById('editVehiclePrice').value),
        location: document.getElementById('editVehicleLocation').value
    };

    showToast('Updating vehicle...', 'info');

    try {
        const result = await api.updateCar(editingCarId, vehicleData);
        if (result.success) {
            showToast('Vehicle updated successfully!', 'success');
            closeVehicleModal();
            loadFleetData();
        } else {
            showToast(result.error || 'Failed to update vehicle', 'error');
        }
    } catch (error) {
        logError('Error updating vehicle:', error);
        showToast('Error updating vehicle', 'error');
    }
}

async function deleteVehicle(carId) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    showToast('Deleting vehicle...', 'info');

    try {
        const result = await api.deleteCar(carId);
        if (result.success) {
            showToast('Vehicle deleted successfully!', 'success');
            closeVehicleModal();
            loadFleetData();
        } else {
            showToast(result.error || 'Failed to delete vehicle', 'error');
        }
    } catch (error) {
        logError('Error deleting vehicle:', error);
        showToast('Error deleting vehicle', 'error');
    }
}

// Make functions globally available
window.closeVehicleModal = closeVehicleModal;
window.showAddVehicleModal = showAddVehicleModal;
window.showEditVehicleModal = showEditVehicleModal;
window.deleteVehicle = deleteVehicle;

// ==================== MAINTENANCE FUNCTIONS ====================

function showAddMaintenanceModal() {
    let modal = document.getElementById('maintenanceModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'maintenanceModal';
        modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:white;padding:2rem;border-radius:16px;max-width:500px;width:90%;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <h2 style="margin:0;">Schedule Maintenance</h2>
                <button onclick="closeMaintenanceModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>
            </div>
            <form id="maintenanceForm" onsubmit="handleAddMaintenance(event)">
                <div class="form-group" style="margin-bottom:1rem;">
                    <label>Vehicle</label>
                    <select id="maintVehicle" required style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                        <option value="tesla">Tesla Model 3</option>
                        <option value="bmw">BMW X5</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                    <label>Service Type</label>
                    <select id="maintType" required style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                        <option value="oil">Oil Change</option>
                        <option value="tires">Tire Rotation</option>
                        <option value="brakes">Brake Inspection</option>
                        <option value="battery">Battery Check</option>
                        <option value="inspection">Full Inspection</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                    <label>Due Date</label>
                    <input type="date" id="maintDate" required style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;">
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                    <label>Notes</label>
                    <textarea id="maintNotes" rows="3" placeholder="Any additional notes..." style="width:100%;padding:0.75rem;border:1px solid #e2e8f0;border-radius:8px;"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;padding:1rem;">Schedule Service</button>
            </form>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeMaintenanceModal() {
    const modal = document.getElementById('maintenanceModal');
    if (modal) modal.style.display = 'none';
}

function handleAddMaintenance(e) {
    e.preventDefault();
    showToast('Maintenance scheduled successfully!', 'success');
    closeMaintenanceModal();
}

function showMaintenanceDetails(id) {
    const details = {
        'bmw-oil': { vehicle: 'BMW X5', service: 'Oil Change', date: 'Jan 20, 2026', status: 'Due Soon', notes: 'Use synthetic oil only' },
        'tesla-tires': { vehicle: 'Tesla Model 3', service: 'Tire Rotation', date: 'Feb 5, 2026', status: 'Scheduled', notes: 'Scheduled at Tesla Service Center' }
    };
    const item = details[id] || { vehicle: 'Unknown', service: 'Service', date: 'TBD', status: 'Pending', notes: '' };

    let modal = document.getElementById('maintenanceModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'maintenanceModal';
        modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:white;padding:2rem;border-radius:16px;max-width:400px;width:90%;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <h2 style="margin:0;">Service Details</h2>
                <button onclick="closeMaintenanceModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>
            </div>
            <div style="margin-bottom:1rem;">
                <p style="margin:0.5rem 0;"><strong>Vehicle:</strong> ${item.vehicle}</p>
                <p style="margin:0.5rem 0;"><strong>Service:</strong> ${item.service}</p>
                <p style="margin:0.5rem 0;"><strong>Due Date:</strong> ${item.date}</p>
                <p style="margin:0.5rem 0;"><strong>Status:</strong> <span style="color:${item.status === 'Due Soon' ? '#f59e0b' : '#22c55e'}">${item.status}</span></p>
                <p style="margin:0.5rem 0;"><strong>Notes:</strong> ${item.notes || 'None'}</p>
            </div>
            <div style="display:flex;gap:1rem;">
                <button onclick="closeMaintenanceModal()" class="btn btn-primary" style="flex:1;padding:0.75rem;">Close</button>
                <button onclick="markComplete('${id}')" class="btn" style="flex:1;padding:0.75rem;background:#22c55e;color:white;border:none;border-radius:8px;cursor:pointer;">Mark Complete</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function scheduleService(id) {
    showToast('Opening scheduler for ' + id, 'info');
    showAddMaintenanceModal();
}

function viewService(id) {
    showMaintenanceDetails(id);
}

function markComplete(id) {
    showToast('Service marked as complete!', 'success');
    closeMaintenanceModal();
}

// Make maintenance functions globally available
window.showAddMaintenanceModal = showAddMaintenanceModal;
window.closeMaintenanceModal = closeMaintenanceModal;
window.handleAddMaintenance = handleAddMaintenance;
window.showMaintenanceDetails = showMaintenanceDetails;
window.scheduleService = scheduleService;
window.viewService = viewService;
window.markComplete = markComplete;

// Setup notifications
function setupNotifications() {
    // Check for new notifications every 30 seconds
    setInterval(checkNewNotifications, 30000);

    // Handle notification actions - resolve buttons
    document.querySelectorAll('.btn-resolve').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const notificationItem = e.target.closest('.notification-item');
            resolveNotification(notificationItem);
        });
    });

    // Handle close panel button
    const closePanel = document.querySelector('.notifications-panel .close-panel');
    if (closePanel) {
        closePanel.addEventListener('click', () => {
            toggleNotifications();
        });
    }

    // Handle dismiss individual notifications (click on notification)
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't dismiss if clicking the resolve button
            if (e.target.classList.contains('btn-resolve')) return;
            dismissNotification(item);
        });
    });
}

// Check for new notifications
function checkNewNotifications() {
    // Simulate checking for new notifications
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        const count = Math.floor(Math.random() * 10);
        badge.textContent = count > 0 ? count : '';
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

// Resolve notification
function resolveNotification(notificationItem) {
    showToast('Resolving booking conflict...', 'info');

    // Animate out the notification
    if (notificationItem) {
        notificationItem.style.transition = 'all 0.3s ease';
        notificationItem.style.opacity = '0';
        notificationItem.style.transform = 'translateX(100%)';

        setTimeout(() => {
            notificationItem.remove();
            showToast('Conflict resolved successfully!', 'success');
            updateNotificationBadge();
        }, 300);
    } else {
        setTimeout(() => {
            showToast('Conflict resolved successfully!', 'success');
        }, 1500);
    }
}

// Dismiss a notification
function dismissNotification(notificationItem) {
    if (!notificationItem) return;

    notificationItem.style.transition = 'all 0.3s ease';
    notificationItem.style.opacity = '0';
    notificationItem.style.transform = 'translateX(100%)';

    setTimeout(() => {
        notificationItem.remove();
        updateNotificationBadge();
    }, 300);
}

// Update notification badge count
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    const notificationCount = document.querySelectorAll('.notification-item').length;

    if (badge) {
        badge.textContent = notificationCount > 0 ? notificationCount : '';
        badge.style.display = notificationCount > 0 ? 'block' : 'none';
    }
}

// Toggle notifications panel
function toggleNotifications() {
    const panel = document.querySelector('.notifications-panel');
    if (panel) {
        panel.classList.toggle('show');
    }
}

// Update data for selected period
function updateDataForPeriod(period) {
    showToast(`Updating data for ${period}...`, 'info');
    
    // Simulate data update
    setTimeout(() => {
        updateKPIs();
        updateRecentActivity();
        showToast('Data updated!', 'success');
    }, 1000);
}

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    const icon = document.querySelector('.dark-mode-toggle i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Update page title
function updatePageTitle(title) {
    const headerTitle = document.querySelector('.header-left h1');
    if (headerTitle) {
        headerTitle.textContent = title;
    }
}

// Handle logout
async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        await api.logout();
        window.location.href = 'index.html';
    }
}

// Start real-time updates - disabled to prevent stats from changing
function startRealTimeUpdates() {
    // Real-time updates disabled - stats now stay fixed
    // In production, this would fetch actual data from the API
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${SecurityUtils.escapeHtml(type)}`;

    const iconMap = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    const icon = document.createElement('i');
    icon.className = `fas fa-${iconMap[type] || 'info-circle'}`;

    const span = document.createElement('span');
    span.textContent = message; // Safe: textContent auto-escapes

    toast.appendChild(icon);
    toast.appendChild(span);
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize on load
window.addEventListener('load', () => {
    // Check for saved dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        const icon = document.querySelector('.dark-mode-toggle i');
        if (icon) icon.className = 'fas fa-sun';
    }
});/* force Sun Jan  4 16:55:05 MST 2026 */
