/**
 * RentMyCar - API Client
 * Production-ready API client with proper security
 */

const api = {
  /**
   * Make an API request to Netlify Functions
   */
  async request(path, options = {}) {
    const sessionToken = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_TOKEN);

    // Build URL - use endpoint mapping if available
    const endpoint = CONFIG.ENDPOINTS[path] || path;
    const url = new URL(CONFIG.API_URL + endpoint, window.location.origin);

    // Add query parameters for GET requests
    if (options.params) {
      Object.keys(options.params).forEach(key => {
        if (options.params[key] !== undefined && options.params[key] !== null && options.params[key] !== '') {
          url.searchParams.set(key, options.params[key]);
        }
      });
    }

    // Build fetch options with proper headers
    const fetchOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add authorization header instead of URL parameter (more secure)
    if (sessionToken) {
      fetchOptions.headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    // Add body for POST/PUT/DELETE requests
    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url.toString(), fetchOptions);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        data = SecurityUtils.safeJsonParse(text, { success: false, error: 'Invalid response' });
      } else {
        data = { success: false, error: 'Invalid response format' };
      }

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          this.handleSessionExpiry();
          return { success: false, error: 'Session expired. Please log in again.' };
        }
        if (response.status === 403) {
          return { success: false, error: 'Access denied.' };
        }
        if (response.status === 404) {
          return { success: false, error: 'Resource not found.' };
        }
        if (response.status >= 500) {
          return { success: false, error: 'Server error. Please try again later.' };
        }
        return data;
      }

      // Handle session expiry from response
      if (data.error === 'Invalid or expired session' || data.error === 'Unauthorized') {
        this.handleSessionExpiry();
      }

      return data;
    } catch (error) {
      // Only log in development
      if (!CONFIG.IS_PRODUCTION) {
        console.error('API Error:', error);
      }

      // Check for network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return { success: false, error: 'Network error. Please check your connection.' };
      }

      return { success: false, error: 'An unexpected error occurred.' };
    }
  },

  /**
   * Handle session expiry
   */
  handleSessionExpiry() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);

    // Redirect to login if not on main page
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  },

  // ==================== AUTH ====================

  /**
   * Sign up a new user
   */
  async signup(data) {
    const result = await this.request(CONFIG.ENDPOINTS.REGISTER, {
      method: 'POST',
      body: data
    });

    if (result.success && result.sessionToken) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_TOKEN, result.sessionToken);
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(result.user));
      if (result.refreshToken) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, result.refreshToken);
      }
    }

    return result;
  },

  /**
   * Log in a user
   */
  async login(email, password, rememberMe = false) {
    const result = await this.request(CONFIG.ENDPOINTS.LOGIN, {
      method: 'POST',
      body: { email, password, rememberMe }
    });

    if (result.success && result.sessionToken) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_TOKEN, result.sessionToken);
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(result.user));
      if (result.refreshToken) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, result.refreshToken);
      }
    }

    return result;
  },

  /**
   * Log out current user
   */
  async logout() {
    try {
      await this.request(CONFIG.ENDPOINTS.LOGOUT, { method: 'POST', body: {} });
    } catch (e) {
      // Continue with local logout even if API fails
    }

    localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);

    return { success: true };
  },

  /**
   * Get current user from API
   */
  async getCurrentUser() {
    return await this.request(CONFIG.ENDPOINTS.ME);
  },

  /**
   * Refresh access token
   */
  async refreshToken() {
    const refreshToken = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      return { success: false, error: 'No refresh token' };
    }

    const result = await this.request(CONFIG.ENDPOINTS.REFRESH, {
      method: 'POST',
      body: { refreshToken }
    });

    if (result.success && result.sessionToken) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_TOKEN, result.sessionToken);
      if (result.refreshToken) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, result.refreshToken);
      }
    }

    return result;
  },

  /**
   * Check if user is logged in (local check)
   */
  isLoggedIn() {
    return !!localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_TOKEN);
  },

  /**
   * Get stored user (local)
   */
  getStoredUser() {
    const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    return SecurityUtils.safeJsonParse(userJson, null);
  },

  // ==================== CARS ====================

  /**
   * Get all cars with optional filters
   */
  async getCars(filters = {}) {
    return await this.request(CONFIG.ENDPOINTS.CARS_LIST, { params: filters });
  },

  /**
   * Get a single car by ID
   */
  async getCar(carId) {
    return await this.request(CONFIG.ENDPOINTS.CARS_LIST, { params: { id: carId } });
  },

  /**
   * Get cars owned by current user
   */
  async getOwnerCars() {
    const user = this.getStoredUser();
    if (!user) return { success: false, error: 'Not logged in' };
    return await this.request(CONFIG.ENDPOINTS.CARS_LIST, { params: { ownerId: user.id } });
  },

  /**
   * Create a new car listing
   */
  async createCar(data) {
    return await this.request(CONFIG.ENDPOINTS.CARS_CREATE, {
      method: 'POST',
      body: data
    });
  },

  /**
   * Update a car listing
   */
  async updateCar(carId, data) {
    return await this.request(CONFIG.ENDPOINTS.CARS_UPDATE, {
      method: 'POST',
      body: { id: carId, ...data }
    });
  },

  /**
   * Delete a car listing
   */
  async deleteCar(carId) {
    return await this.request(CONFIG.ENDPOINTS.CARS_DELETE, {
      method: 'POST',
      body: { id: carId }
    });
  },

  // ==================== BOOKINGS ====================

  /**
   * Get bookings for current user
   * @param {string} role - 'renter' or 'owner'
   * @param {string} status - Optional status filter
   */
  async getBookings(role = 'renter', status = null) {
    return await this.request(CONFIG.ENDPOINTS.BOOKINGS_LIST, {
      params: { role, status }
    });
  },

  /**
   * Get a single booking by ID
   */
  async getBooking(bookingId) {
    return await this.request(CONFIG.ENDPOINTS.BOOKINGS_LIST, { params: { id: bookingId } });
  },

  /**
   * Create a new booking
   */
  async createBooking(carId, startDate, endDate, message = '') {
    return await this.request(CONFIG.ENDPOINTS.BOOKINGS_CREATE, {
      method: 'POST',
      body: { carId, startDate, endDate, message }
    });
  },

  /**
   * Update booking status
   * @param {string} bookingId
   * @param {string} status - 'approved', 'declined', 'cancelled', 'completed'
   */
  async updateBookingStatus(bookingId, status) {
    return await this.request(CONFIG.ENDPOINTS.BOOKINGS_UPDATE, {
      method: 'POST',
      body: { id: bookingId, status }
    });
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId) {
    return await this.request(CONFIG.ENDPOINTS.BOOKINGS_CANCEL, {
      method: 'POST',
      body: { id: bookingId }
    });
  },

  // ==================== PAYMENTS ====================

  /**
   * Create a payment intent
   */
  async createPaymentIntent(bookingId, amount) {
    return await this.request(CONFIG.ENDPOINTS.PAYMENT_INTENT, {
      method: 'POST',
      body: { bookingId, amount }
    });
  },

  // ==================== STATS ====================

  /**
   * Get owner dashboard stats
   */
  async getOwnerStats() {
    return await this.request(CONFIG.ENDPOINTS.ADMIN_STATS, { params: { type: 'owner' } });
  },

  /**
   * Get renter dashboard stats
   */
  async getRenterStats() {
    return await this.request(CONFIG.ENDPOINTS.ADMIN_STATS, { params: { type: 'renter' } });
  },

  // ==================== ADMIN ====================

  /**
   * Get admin stats
   */
  async getAdminStats() {
    return await this.request(CONFIG.ENDPOINTS.ADMIN_STATS);
  },

  /**
   * Get users (admin only)
   */
  async getAdminUsers(filters = {}) {
    return await this.request(CONFIG.ENDPOINTS.ADMIN_USERS, { params: filters });
  },

  /**
   * Get all bookings (admin only)
   */
  async getAdminBookings(filters = {}) {
    return await this.request(CONFIG.ENDPOINTS.ADMIN_BOOKINGS, { params: filters });
  },

  /**
   * Get all cars (admin only)
   */
  async getAdminCars(filters = {}) {
    return await this.request(CONFIG.ENDPOINTS.ADMIN_CARS, { params: filters });
  },

  /**
   * Get revenue data (admin only)
   */
  async getAdminRevenue(filters = {}) {
    return await this.request(CONFIG.ENDPOINTS.ADMIN_REVENUE, { params: filters });
  },

  // ==================== FILES ====================

  /**
   * Upload a file
   * @param {File} file - File object from input
   * @param {string} documentType - Type of document
   */
  async uploadFile(file, documentType = 'general') {
    // Validate file
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    if (file.size > CONFIG.VALIDATION.MAX_FILE_SIZE) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' };
    }

    if (!CONFIG.VALIDATION.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Please upload JPEG, PNG, or WebP.' };
    }

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];

        const result = await this.request('/files-upload', {
          method: 'POST',
          body: {
            fileName: SecurityUtils.sanitizeFilename(file.name),
            fileData: base64Data,
            mimeType: file.type,
            documentType: documentType
          }
        });

        resolve(result);
      };

      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' });
      };

      reader.readAsDataURL(file);
    });
  }
};

// Make api available globally
window.api = api;
