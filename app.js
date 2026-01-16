// RentMyCar Application JavaScript

// Conditional logging - only in development
const log = CONFIG?.IS_PRODUCTION === false ? console.log.bind(console) : () => {};
const logError = CONFIG?.IS_PRODUCTION === false ? console.error.bind(console) : () => {};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Global variables
let map = null;
let userLocation = null;
let cars = [];
let selectedCar = null;
let aiAssistantOpen = false;
let voiceRecognition = null;
let charts = {};

// Initialize main application
function initializeApp() {
    // Initialize all components
    initializeNavigation();
    initializeSearch();
    initializeAIAssistant();
    initializeVoiceSearch();
    initializeFilters();
    initializeViewToggle();
    initializeStats();
    initializeCharts();
    loadCars();
    
    // Start real-time updates
    startRealTimeUpdates();
    
    // Initialize Web3 for blockchain features
    initializeBlockchain();
    
    // Setup service worker for PWA
    registerServiceWorker();
}

// Navigation functionality
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const target = link.getAttribute('href');
            if (target && target !== '#') {
                document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Sticky navigation on scroll
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > lastScroll && currentScroll > 100) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        lastScroll = currentScroll;
    });
}

// Search functionality
function initializeSearch() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tab + 'Tab').classList.add('active');
        });
    });
    
    // Location search autocomplete
    const locationInput = document.getElementById('locationSearch');
    if (locationInput) {
        locationInput.addEventListener('input', debounce(handleLocationSearch, 300));
    }
    
    // Image upload for car search
    const imageUpload = document.getElementById('carImageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageSearch);
    }
}

// Handle location search autocomplete
function handleLocationSearch(e) {
    const query = e.target.value.trim();
    if (query.length < 2) return;

    // Simple location suggestions (in production, use a geocoding API)
    const suggestions = [
        'San Francisco, CA',
        'Los Angeles, CA',
        'New York, NY',
        'Miami, FL',
        'Seattle, WA',
        'Austin, TX'
    ].filter(loc => loc.toLowerCase().includes(query.toLowerCase()));

    // For now, just log suggestions - could add autocomplete dropdown
    log('Location suggestions:', suggestions);
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        showToast('Getting your location...', 'info');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                document.getElementById('locationSearch').value = 'Current Location';
                showToast('Location found!', 'success');
                loadNearbyCars();
            },
            (error) => {
                showToast('Could not get your location', 'error');
            }
        );
    } else {
        showToast('Geolocation is not supported', 'error');
    }
}

// Advanced search
function advancedSearch() {
    const location = document.getElementById('locationSearch').value;
    const startDate = document.getElementById('startDateTime').value;
    const endDate = document.getElementById('endDateTime').value;
    
    if (!location || !startDate || !endDate) {
        showToast('Please fill all search fields', 'warning');
        return;
    }
    
    // Show loading state
    showLoading();
    
    // Simulate API call
    setTimeout(() => {
        loadCars();
        hideLoading();
        showToast('Found 15 available cars', 'success');
        
        // Smooth scroll to results
        document.getElementById('browse').scrollIntoView({ behavior: 'smooth' });
    }, 1500);
}

// Voice search functionality
function initializeVoiceSearch() {
    if ('webkitSpeechRecognition' in window) {
        voiceRecognition = new webkitSpeechRecognition();
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'en-US';
        
        voiceRecognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            document.getElementById('voiceTranscript').textContent = transcript;
            
            if (event.results[0].isFinal) {
                processVoiceCommand(transcript);
            }
        };
        
        voiceRecognition.onerror = (event) => {
            logError('Voice recognition error:', event.error);
            showToast('Voice recognition error', 'error');
        };
    }
}

function startVoiceSearch() {
    if (voiceRecognition) {
        const voiceBtn = document.querySelector('.voice-btn');
        voiceBtn.classList.add('recording');
        voiceBtn.querySelector('span').textContent = 'Listening...';
        voiceRecognition.start();
        
        voiceRecognition.onend = () => {
            voiceBtn.classList.remove('recording');
            voiceBtn.querySelector('span').textContent = 'Click to speak';
        };
    } else {
        showToast('Voice search not supported', 'error');
    }
}

function processVoiceCommand(command) {
    // Process natural language commands
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('find') || lowerCommand.includes('search')) {
        if (lowerCommand.includes('tesla')) {
            filterCarsByType('electric');
        } else if (lowerCommand.includes('suv')) {
            filterCarsByType('suv');
        } else if (lowerCommand.includes('luxury')) {
            filterCarsByType('luxury');
        }
    } else if (lowerCommand.includes('near me') || lowerCommand.includes('nearby')) {
        getCurrentLocation();
    }
    
    showToast(`Searching for: ${command}`, 'info');
}

// Image search functionality
function handleImageSearch(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Simulate AI image recognition
            showToast('Analyzing image...', 'info');
            setTimeout(() => {
                showToast('Found similar cars!', 'success');
                loadCars();
            }, 2000);
        };
        reader.readAsDataURL(file);
    }
}

// AI Assistant
function initializeAIAssistant() {
    const aiBtn = document.getElementById('aiAssistant');
    const modal = document.getElementById('aiChatModal');
    const closeBtn = modal?.querySelector('.close');
    const sendBtn = document.getElementById('sendMessage');
    const chatInput = document.getElementById('chatInput');
    
    aiBtn?.addEventListener('click', () => {
        modal.style.display = 'block';
        aiAssistantOpen = true;
    });
    
    closeBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
        aiAssistantOpen = false;
    });
    
    sendBtn?.addEventListener('click', sendAIMessage);
    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAIMessage();
    });
    
    // Load AI recommendations
    loadAIRecommendations();
}

function sendAIMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    
    // Simulate AI response
    setTimeout(() => {
        const response = generateAIResponse(message);
        addChatMessage(response, 'ai');
    }, 1000);
}

function addChatMessage(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = message;
    
    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function generateAIResponse(message) {
    const responses = {
        'hello': 'Hello! How can I help you find the perfect car today?',
        'price': 'Our cars range from $30-500 per day. What\'s your budget?',
        'tesla': 'We have several Tesla models available. Would you like Model 3, Model S, or Model X?',
        'insurance': 'We offer three protection plans: Basic ($15/day), Premium ($25/day), and Ultimate ($40/day).',
        'default': 'I can help you find cars, check availability, explain our insurance options, or answer any questions about the rental process.'
    };
    
    const lowerMessage = message.toLowerCase();
    for (const key in responses) {
        if (lowerMessage.includes(key)) {
            return responses[key];
        }
    }
    return responses.default;
}

function loadAIRecommendations() {
    const container = document.getElementById('aiRecommendations');
    if (!container) return;
    
    const recommendations = [
        { type: 'Weekend Trip', icon: '🏔️', cars: 'SUVs & Convertibles' },
        { type: 'Business', icon: '💼', cars: 'Luxury Sedans' },
        { type: 'Eco-Friendly', icon: '🌱', cars: 'Electric Vehicles' },
        { type: 'Adventure', icon: '🏕️', cars: '4WD & Trucks' }
    ];
    
    container.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card" onclick="filterByRecommendation('${rec.type}')">
            <div class="rec-icon">${rec.icon}</div>
            <h4>${rec.type}</h4>
            <p>${rec.cars}</p>
        </div>
    `).join('');
}

// Filters
function initializeFilters() {
    // Car type filters
    document.querySelectorAll('.chip[data-type]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip[data-type]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filterCarsByType(chip.dataset.type);
        });
    });
    
    // Feature filters
    document.querySelectorAll('.chip[data-feature]').forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            applyFeatureFilters();
        });
    });
    
    // Price range
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    priceRange?.addEventListener('input', (e) => {
        priceValue.textContent = `$0 - $${e.target.value}/day`;
        filterByPrice(e.target.value);
    });
    
    // Distance range
    const distanceRange = document.getElementById('distanceRange');
    const distanceValue = document.getElementById('distanceValue');
    distanceRange?.addEventListener('input', (e) => {
        distanceValue.textContent = `Within ${e.target.value} miles`;
        filterByDistance(e.target.value);
    });
}

// View toggle
function initializeViewToggle() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const view = btn.dataset.view;
            switchView(view);
        });
    });
}

function switchView(view) {
    const gridView = document.getElementById('carsGrid');
    const mapView = document.getElementById('mapView');
    const arView = document.getElementById('arView');
    
    // Hide all views
    gridView.style.display = 'none';
    mapView.style.display = 'none';
    arView.style.display = 'none';
    
    // Show selected view
    switch(view) {
        case 'grid':
            gridView.style.display = 'grid';
            break;
        case 'list':
            gridView.style.display = 'block';
            // Modify grid to list layout
            gridView.style.gridTemplateColumns = '1fr';
            break;
        case 'map':
            mapView.style.display = 'block';
            initializeMap();
            break;
        case 'ar':
            arView.style.display = 'block';
            break;
    }
}

// Initialize map
function initializeMap() {
    if (!map) {
        map = L.map('map').setView([37.7749, -122.4194], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }
    
    // Add car markers
    cars.forEach(car => {
        if (car.location) {
            const marker = L.marker([car.location.lat, car.location.lng])
                .addTo(map)
                .bindPopup(`
                    <strong>${car.name}</strong><br>
                    $${car.price}/day<br>
                    <button onclick="viewCarDetails('${car.id}')">View Details</button>
                `);
        }
    });
}

// Load cars from API
async function loadCars() {
    const container = document.getElementById('carsGrid');
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #6366f1;"></i>
            <p>Loading cars...</p>
        </div>
    `;

    try {
        // Fetch cars from API
        const result = await api.getCars();

        if (result.success && result.cars && result.cars.length > 0) {
            // Transform API data to match expected format
            cars = result.cars.map(car => ({
                id: car.id,
                name: `${car.make} ${car.model}`,
                make: car.make,
                model: car.model,
                year: car.year,
                type: car.type || 'sedan',
                price: car.pricePerDay,
                rating: car.rating || 4.5,
                reviews: car.reviewCount || 0,
                image: car.images?.[0] || CONFIG.DEFAULT_CAR_IMAGE,
                images: car.images || [CONFIG.DEFAULT_CAR_IMAGE],
                features: car.features || [],
                instantBook: car.instantBook || false,
                location: car.location,
                latitude: car.latitude,
                longitude: car.longitude,
                ownerId: car.ownerId,
                distance: 2.5 // Placeholder - calculate from user location in production
            }));

            renderCars(cars);
        } else {
            // Fall back to sample data if API returns no cars
            loadSampleCars();
        }
    } catch (error) {
        logError('Error loading cars:', error);
        // Fall back to sample data on error
        loadSampleCars();
    }
}

// Load sample cars as fallback
function loadSampleCars() {
    cars = [
        {
            id: 'sample1',
            name: 'Tesla Model 3',
            type: 'electric',
            price: 120,
            rating: 4.9,
            reviews: 127,
            image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400',
            features: ['Autopilot', 'Supercharging', 'Premium Audio'],
            instantBook: true,
            location: 'San Francisco, CA',
            latitude: 37.7749,
            longitude: -122.4194,
            distance: 2.5
        },
        {
            id: 'sample2',
            name: 'BMW X5',
            type: 'suv',
            price: 150,
            rating: 4.8,
            reviews: 89,
            image: 'https://images.unsplash.com/photo-1555215858-9dc847c0cd01?w=400',
            features: ['AWD', 'Leather Seats', 'Sunroof'],
            instantBook: false,
            location: 'Los Angeles, CA',
            latitude: 37.7849,
            longitude: -122.4094,
            distance: 3.2
        },
        {
            id: 'sample3',
            name: 'Mercedes S-Class',
            type: 'luxury',
            price: 250,
            rating: 5.0,
            reviews: 43,
            image: 'https://images.unsplash.com/photo-1606664515524-ed8f24b8c1e0?w=400',
            features: ['Massage Seats', 'Night Vision', 'Air Suspension'],
            instantBook: true,
            location: 'Miami, FL',
            latitude: 37.7649,
            longitude: -122.4294,
            distance: 1.8
        },
        {
            id: 'sample4',
            name: 'Porsche 911',
            type: 'sports',
            price: 350,
            rating: 4.9,
            reviews: 67,
            image: 'https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=400',
            features: ['Convertible', 'Sport Mode', 'Carbon Brakes'],
            instantBook: true,
            location: 'Seattle, WA',
            latitude: 37.7549,
            longitude: -122.4394,
            distance: 4.1
        }
    ];

    renderCars(cars);
}

function renderCars(carsToRender) {
    const container = document.getElementById('carsGrid');
    if (!container) return;

    // Clear container and build using DOM methods for security
    container.innerHTML = '';

    carsToRender.forEach(car => {
        const card = document.createElement('div');
        card.className = 'car-card';
        card.dataset.carId = car.id;

        // Image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'car-image-container';
        const img = document.createElement('img');
        img.src = SecurityUtils.escapeUrl(car.image);
        img.alt = SecurityUtils.escapeHtml(car.name);
        img.className = 'car-image';
        imageContainer.appendChild(img);

        if (car.instantBook) {
            const badge = document.createElement('div');
            badge.className = 'instant-book-badge';
            const boltIcon = document.createElement('i');
            boltIcon.className = 'fas fa-bolt';
            badge.appendChild(boltIcon);
            badge.appendChild(document.createTextNode(' Instant Book'));
            imageContainer.appendChild(badge);
        }

        // Car details
        const details = document.createElement('div');
        details.className = 'car-details';

        // Header
        const header = document.createElement('div');
        header.className = 'car-header';
        const title = document.createElement('h3');
        title.className = 'car-title';
        title.textContent = car.name;
        const rating = document.createElement('div');
        rating.className = 'car-rating';
        const starIcon = document.createElement('i');
        starIcon.className = 'fas fa-star';
        const ratingValue = document.createElement('span');
        ratingValue.textContent = car.rating;
        const reviewCount = document.createElement('span');
        reviewCount.textContent = `(${car.reviews})`;
        rating.appendChild(starIcon);
        rating.appendChild(ratingValue);
        rating.appendChild(reviewCount);
        header.appendChild(title);
        header.appendChild(rating);

        // Features
        const features = document.createElement('div');
        features.className = 'car-features';
        (car.features || []).forEach(f => {
            const tag = document.createElement('span');
            tag.className = 'feature-tag';
            tag.textContent = f;
            features.appendChild(tag);
        });

        // Footer
        const footer = document.createElement('div');
        footer.className = 'car-footer';
        const price = document.createElement('div');
        price.className = 'car-price';
        price.innerHTML = `$${SecurityUtils.escapeHtml(String(car.price))}<span>/day</span>`;
        const bookBtn = document.createElement('button');
        bookBtn.className = 'btn btn-primary';
        bookBtn.textContent = 'Book Now';
        bookBtn.addEventListener('click', () => bookCar(car.id));
        footer.appendChild(price);
        footer.appendChild(bookBtn);

        details.appendChild(header);
        details.appendChild(features);
        details.appendChild(footer);

        card.appendChild(imageContainer);
        card.appendChild(details);
        container.appendChild(card);
    });
}

// Load nearby cars based on user location
function loadNearbyCars() {
    if (userLocation) {
        showToast('Loading cars near you...', 'info');
        // Filter cars by distance in production
        loadCars();
    }
}

// Booking functions
function bookCar(carId) {
    // Check if user is authenticated
    if (!api.isLoggedIn()) {
        showToast('Please sign in to book a car', 'warning');
        openAuthModal();
        return;
    }

    const car = cars.find(c => c.id == carId);
    if (car) {
        selectedCar = car;
        showBookingModal(car);
    }
}

// Show booking modal
function showBookingModal(car) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('bookingModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bookingModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="modal-close" onclick="closeBookingModal()">&times;</span>
            <h2 style="margin-bottom: 20px;">Book ${car.name}</h2>
            <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                <img src="${car.image}" alt="${car.name}" style="width: 150px; height: 100px; object-fit: cover; border-radius: 8px;">
                <div>
                    <p style="font-size: 1.2rem; font-weight: 600;">$${car.price}/day</p>
                    <p style="color: #64748b;"><i class="fas fa-star" style="color: #f59e0b;"></i> ${car.rating} (${car.reviews} reviews)</p>
                    <p style="color: #64748b;"><i class="fas fa-map-marker-alt"></i> ${car.location || 'Location TBD'}</p>
                </div>
            </div>
            <form id="bookingForm">
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" id="bookingStartDate" required min="${today}" value="${today}">
                </div>
                <div class="form-group">
                    <label>End Date</label>
                    <input type="date" id="bookingEndDate" required min="${tomorrow}" value="${tomorrow}">
                </div>
                <div class="form-group">
                    <label>Message to Owner (Optional)</label>
                    <textarea id="bookingMessage" rows="3" placeholder="Introduce yourself and let the owner know about your trip..." style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; resize: vertical; font-family: inherit;"></textarea>
                </div>
                <div id="bookingSummary" style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Daily Rate</span>
                        <span>$${car.price}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Days</span>
                        <span id="bookingDays">1</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Subtotal</span>
                        <span id="bookingSubtotal">$${car.price}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Service Fee (5%)</span>
                        <span id="bookingFee">$${(car.price * 0.05).toFixed(2)}</span>
                    </div>
                    <hr style="margin: 10px 0; border: none; border-top: 1px solid #cbd5e1;">
                    <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 1.1rem;">
                        <span>Total</span>
                        <span id="bookingTotal">$${(car.price * 1.05).toFixed(2)}</span>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">
                    ${car.instantBook ? '<i class="fas fa-bolt"></i> Book Instantly' : 'Request Booking'}
                </button>
            </form>
        </div>
    `;

    modal.style.display = 'flex';

    // Update pricing when dates change
    const startInput = document.getElementById('bookingStartDate');
    const endInput = document.getElementById('bookingEndDate');

    const updatePricing = () => {
        const start = new Date(startInput.value);
        const end = new Date(endInput.value);
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        const subtotal = days * car.price;
        const fee = subtotal * 0.05; // 5% renter service fee
        const total = subtotal + fee;

        document.getElementById('bookingDays').textContent = days;
        document.getElementById('bookingSubtotal').textContent = '$' + subtotal.toFixed(2);
        document.getElementById('bookingFee').textContent = '$' + fee.toFixed(2);
        document.getElementById('bookingTotal').textContent = '$' + total.toFixed(2);
    };

    startInput.addEventListener('change', updatePricing);
    endInput.addEventListener('change', updatePricing);

    // Handle form submit
    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('bookingMessage').value.trim();
        await submitBooking(car.id, startInput.value, endInput.value, message);
    });
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function submitBooking(carId, startDate, endDate, message = '') {
    showToast('Creating booking...', 'info');

    try {
        const result = await api.createBooking(carId, startDate, endDate, message);

        if (result.success) {
            closeBookingModal();
            showToast('Booking created successfully!', 'success');

            // Redirect to renter dashboard
            const user = api.getStoredUser();
            if (user && user.role === 'owner') {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'renter-dashboard.html';
            }
        } else {
            showToast(result.error || 'Failed to create booking', 'error');
        }
    } catch (error) {
        logError('Booking error:', error);
        showToast('Error creating booking', 'error');
    }
}


// Real-time stats
function initializeStats() {
    updateStats();
    // Update stats every 5 seconds
    setInterval(updateStats, 5000);
}

function updateStats() {
    // Simulate real-time stats
    document.getElementById('totalCars').textContent = Math.floor(Math.random() * 50) + 100;
    document.getElementById('activeUsers').textContent = Math.floor(Math.random() * 200) + 500;
    document.getElementById('totalTrips').textContent = Math.floor(Math.random() * 30) + 70;
    document.getElementById('avgRating').textContent = (4.5 + Math.random() * 0.4).toFixed(1);
}

// Charts
function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        charts.revenue = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Revenue',
                    data: [1200, 1900, 1500, 2500, 2200, 3000, 2800],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Revenue'
                    }
                }
            }
        });
    }
    
    // Bookings Chart
    const bookingsCtx = document.getElementById('bookingsChart');
    if (bookingsCtx) {
        charts.bookings = new Chart(bookingsCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Bookings',
                    data: [65, 78, 90, 85, 92, 105],
                    backgroundColor: '#8b5cf6'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Bookings'
                    }
                }
            }
        });
    }
    
    // Ratings Chart
    const ratingsCtx = document.getElementById('ratingsChart');
    if (ratingsCtx) {
        charts.ratings = new Chart(ratingsCtx, {
            type: 'doughnut',
            data: {
                labels: ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'],
                datasets: [{
                    data: [65, 25, 7, 2, 1],
                    backgroundColor: [
                        '#10b981',
                        '#6366f1',
                        '#f59e0b',
                        '#ef4444',
                        '#64748b'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Customer Ratings'
                    }
                }
            }
        });
    }
}

// Blockchain integration
function initializeBlockchain() {
    // Check if Web3 is available
    if (typeof window.ethereum !== 'undefined') {
        log('MetaMask detected');
        // Initialize Web3 connection
        // This would connect to smart contracts for:
        // - Rental agreements
        // - Payment processing
        // - Identity verification
        // - Review authenticity
    }
}

// Real-time updates
function startRealTimeUpdates() {
    // Simulate WebSocket connection for real-time updates
    setInterval(() => {
        // Update car availability
        const randomCar = cars[Math.floor(Math.random() * cars.length)];
        if (randomCar) {
            randomCar.available = Math.random() > 0.3;
        }
        
        // Simulate new booking notification
        if (Math.random() > 0.9) {
            showToast('New booking nearby!', 'info');
        }
    }, 10000);
}

// Service Worker for PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => log('Service Worker registered'))
            .catch(err => logError('Service Worker registration failed', err));
    }
}

// Utility functions
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

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${SecurityUtils?.escapeHtml(type) || type}`;

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

function showLoading() {
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = '<div class="loading"></div>';
    document.body.appendChild(loading);
}

function hideLoading() {
    document.querySelector('.loading-overlay')?.remove();
}

// Filter functions
function filterCarsByType(type) {
    if (type === 'all') {
        renderCars(cars);
    } else {
        const filtered = cars.filter(car => car.type === type);
        renderCars(filtered);
    }
}

function filterByPrice(maxPrice) {
    const filtered = cars.filter(car => car.price <= maxPrice);
    renderCars(filtered);
}

function filterByDistance(maxDistance) {
    const filtered = cars.filter(car => car.distance <= maxDistance);
    renderCars(filtered);
}

function applyFeatureFilters() {
    const activeFeatures = Array.from(document.querySelectorAll('.chip[data-feature].active'))
        .map(chip => chip.dataset.feature);
    
    if (activeFeatures.length === 0) {
        renderCars(cars);
    } else {
        const filtered = cars.filter(car => 
            activeFeatures.some(feature => 
                car.features.some(f => f.toLowerCase().includes(feature))
            )
        );
        renderCars(filtered);
    }
}

// Export functions for global use
window.getCurrentLocation = getCurrentLocation;
window.advancedSearch = advancedSearch;
window.startVoiceSearch = startVoiceSearch;
window.bookCar = bookCar;
window.closeBookingModal = closeBookingModal;
window.viewCarDetails = (carId) => {
    const car = cars.find(c => c.id == carId);
    if (car) {
        showToast(`Viewing details for ${car.name}`, 'info');
    }
};
window.filterByRecommendation = (type) => {
    showToast(`Loading ${type} recommendations...`, 'info');
    // Apply appropriate filters based on recommendation type
};