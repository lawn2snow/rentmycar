// Mobile App JavaScript - Native-like interactions

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Global variables
let currentScreen = 'homeScreen';
let swiper = null;
let mapInstance = null;
let isAuthenticated = false;

// Initialize application
function initializeApp() {
    // Check authentication
    checkAuth();
    
    // Initialize time display
    updateTime();
    setInterval(updateTime, 60000);
    
    // Initialize swiper for carousels
    initializeSwipers();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup touch gestures
    setupTouchGestures();
    
    // Request notification permission
    requestNotificationPermission();
    
    // Register service worker for PWA
    registerServiceWorker();
    
    // Add haptic feedback
    addHapticFeedback();
}

// Check authentication status
function checkAuth() {
    const authToken = localStorage.getItem('carshare_auth');
    isAuthenticated = !!authToken;
    
    if (!isAuthenticated) {
        setTimeout(() => {
            document.getElementById('authModal').classList.add('open');
        }, 2000);
    }
}

// Handle authentication
function handleAuth(event) {
    event.preventDefault();
    
    // Add loading state
    const submitBtn = event.target.querySelector('.btn-submit');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    setTimeout(() => {
        // Store auth token
        localStorage.setItem('carshare_auth', 'demo_token_' + Date.now());
        isAuthenticated = true;
        
        // Close modal
        document.getElementById('authModal').classList.remove('open');
        
        // Show success
        showToast('Welcome to CarShare!', 'success');
        
        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
    }, 1500);
}

// Close auth modal
function closeAuth() {
    document.getElementById('authModal').classList.remove('open');
}

// Update time display
function updateTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    document.getElementById('currentTime').textContent = `${displayHours}:${minutes} ${ampm}`;
}

// Initialize Swiper carousels
function initializeSwipers() {
    // Featured cars carousel
    new Swiper('.featured-carousel', {
        slidesPerView: 'auto',
        spaceBetween: 16,
        freeMode: true,
        pagination: {
            el: '.swiper-pagination',
            clickable: true
        }
    });
    
    // Car detail images carousel
    new Swiper('.car-detail-images', {
        pagination: {
            el: '.swiper-pagination',
            dynamicBullets: true
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Quick filters
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            filterCars(this.textContent.trim());
        });
    });
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Car cards
    document.querySelectorAll('.car-card-mini').forEach(card => {
        card.addEventListener('click', () => openCarDetails(1));
    });
}

// Setup touch gestures
function setupTouchGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swiped left
                handleSwipeLeft();
            } else {
                // Swiped right
                handleSwipeRight();
            }
        }
    }
}

// Switch between screens
function switchScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    document.getElementById(screenId).classList.add('active');
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Set active nav item
    const navMap = {
        'homeScreen': 0,
        'exploreScreen': 1,
        'tripsScreen': 3,
        'profileScreen': 4
    };
    
    const navItems = document.querySelectorAll('.nav-item:not(.add-car)');
    if (navItems[navMap[screenId]]) {
        navItems[navMap[screenId]].classList.add('active');
    }
    
    currentScreen = screenId;
    
    // Initialize map if explore screen
    if (screenId === 'exploreScreen' && !mapInstance) {
        initializeMap();
    }
    
    // Add haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

// Open side menu
function openSideMenu() {
    document.getElementById('sideMenu').classList.add('open');
    addOverlay();
}

// Close side menu
function closeSideMenu() {
    document.getElementById('sideMenu').classList.remove('open');
    removeOverlay();
}

// Open notifications
function openNotifications() {
    document.getElementById('notificationsPanel').classList.add('open');
}

// Close notifications
function closeNotifications() {
    document.getElementById('notificationsPanel').classList.remove('open');
}

// Open car details
function openCarDetails(carId) {
    const sheet = document.getElementById('carDetailsSheet');
    sheet.classList.add('open');
    
    // Load car details (simulate API call)
    loadCarDetails(carId);
    
    // Add swipe down to close
    setupBottomSheetGestures(sheet);
}

// Setup bottom sheet gestures
function setupBottomSheetGestures(sheet) {
    let startY = 0;
    let currentY = 0;
    const handle = sheet.querySelector('.sheet-handle');
    
    handle.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
    });
    
    handle.addEventListener('touchmove', function(e) {
        currentY = e.touches[0].clientY;
        const translateY = Math.max(0, currentY - startY);
        sheet.style.transform = `translateY(${translateY}px)`;
    });
    
    handle.addEventListener('touchend', function() {
        const translateY = currentY - startY;
        if (translateY > 100) {
            sheet.classList.remove('open');
        }
        sheet.style.transform = '';
    });
}

// Load car details
function loadCarDetails(carId) {
    // Simulate loading car details
    console.log('Loading details for car:', carId);
}

// Book car
function bookCar() {
    if (!isAuthenticated) {
        document.getElementById('authModal').classList.add('open');
        return;
    }
    
    showToast('Processing booking...', 'info');
    
    setTimeout(() => {
        showToast('Booking confirmed! Check your trips.', 'success');
        document.getElementById('carDetailsSheet').classList.remove('open');
        switchScreen('tripsScreen');
        
        // Vibrate for success
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }, 2000);
}

// Unlock car
function unlockCar() {
    showToast('Unlocking car...', 'info');
    
    setTimeout(() => {
        showToast('Car unlocked! Safe travels!', 'success');
        
        // Vibrate pattern for unlock
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 200]);
        }
    }, 1500);
}

// Open add car modal
function openAddCar() {
    if (!isAuthenticated) {
        document.getElementById('authModal').classList.add('open');
        return;
    }
    
    showToast('Opening car listing form...', 'info');
}

// Open AI Assistant
function openAIAssistant() {
    showToast('AI Assistant coming soon!', 'info');
}

// Voice search
function startVoiceSearch() {
    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.start();
        
        showToast('Listening...', 'info');
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('searchInput').value = transcript;
            handleSearch();
        };
        
        recognition.onerror = function() {
            showToast('Voice search failed. Please try again.', 'error');
        };
    } else {
        showToast('Voice search not supported on this device.', 'error');
    }
}

// Handle search
function handleSearch() {
    const query = document.getElementById('searchInput').value;
    console.log('Searching for:', query);
    // Implement search logic
}

// Filter cars
function filterCars(type) {
    console.log('Filtering by:', type);
    // Implement filter logic
}

// Initialize map
function initializeMap() {
    // Simulate map initialization
    const mapDiv = document.getElementById('mapView');
    mapDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #64748b;">
            <div style="text-align: center;">
                <i class="fas fa-map-marked-alt" style="font-size: 48px; margin-bottom: 16px;"></i>
                <p>Map View</p>
                <p style="font-size: 12px;">Interactive map would load here</p>
            </div>
        </div>
    `;
    mapInstance = true;
}

// Center map on user location
function centerMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                showToast('Location updated', 'success');
            },
            error => {
                showToast('Could not get location', 'error');
            }
        );
    }
}

// Toggle map type
function toggleMapType() {
    showToast('Switching map view...', 'info');
}

// Handle swipe gestures
function handleSwipeLeft() {
    const screens = ['homeScreen', 'exploreScreen', 'tripsScreen', 'profileScreen'];
    const currentIndex = screens.indexOf(currentScreen);
    if (currentIndex < screens.length - 1) {
        switchScreen(screens[currentIndex + 1]);
    }
}

function handleSwipeRight() {
    const screens = ['homeScreen', 'exploreScreen', 'tripsScreen', 'profileScreen'];
    const currentIndex = screens.indexOf(currentScreen);
    if (currentIndex > 0) {
        switchScreen(screens[currentIndex - 1]);
    }
}

// Add overlay
function addOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.onclick = closeSideMenu;
    document.body.appendChild(overlay);
}

// Remove overlay
function removeOverlay() {
    const overlay = document.querySelector('.overlay');
    if (overlay) overlay.remove();
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 9999;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Register service worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('Service worker registration failed:', err);
        });
    }
}

// Add haptic feedback to buttons
function addHapticFeedback() {
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            if (navigator.vibrate) {
                navigator.vibrate(5);
            }
        });
    });
}

// Logout
function logout() {
    if (confirm('Are you sure you want to sign out?')) {
        localStorage.removeItem('carshare_auth');
        isAuthenticated = false;
        showToast('Signed out successfully', 'success');
        switchScreen('homeScreen');
        
        setTimeout(() => {
            document.getElementById('authModal').classList.add('open');
        }, 1000);
    }
}

// Utility: Debounce function
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

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideDown {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
        }
    }
    
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Initialize on load
window.addEventListener('load', () => {
    // Add loading screen fade out
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});