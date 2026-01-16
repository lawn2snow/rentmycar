/**
 * RentMyCar - Security Utilities
 * XSS prevention and input sanitization
 */

const SecurityUtils = {
  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} - Escaped string safe for innerHTML
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const text = String(str);
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    return text.replace(/[&<>"'`=/]/g, char => map[char]);
  },

  /**
   * Escape string for use in HTML attributes
   * @param {string} str - String to escape
   * @returns {string} - Escaped string safe for attributes
   */
  escapeAttribute(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  /**
   * Escape string for use in URLs
   * @param {string} str - String to escape
   * @returns {string} - URL-encoded string
   */
  escapeUrl(str) {
    if (str === null || str === undefined) return '';
    return encodeURIComponent(String(str));
  },

  /**
   * Safely set text content (preferred over innerHTML)
   * @param {HTMLElement} element - Target element
   * @param {string} text - Text to set
   */
  setTextContent(element, text) {
    if (element && typeof element.textContent !== 'undefined') {
      element.textContent = text || '';
    }
  },

  /**
   * Create a safe HTML element with text content
   * @param {string} tag - HTML tag name
   * @param {string} text - Text content
   * @param {object} attributes - Optional attributes
   * @returns {HTMLElement}
   */
  createElement(tag, text, attributes = {}) {
    const element = document.createElement(tag);
    if (text) {
      element.textContent = text;
    }
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else if (key.startsWith('on')) {
        // Skip event handlers in attributes for security
        console.warn('Event handlers should not be set via attributes');
      } else {
        element.setAttribute(key, this.escapeAttribute(value));
      }
    });
    return element;
  },

  /**
   * Sanitize user input for display
   * Removes potentially dangerous characters while preserving readability
   * @param {string} input - User input
   * @returns {string} - Sanitized input
   */
  sanitizeInput(input) {
    if (input === null || input === undefined) return '';
    return String(input)
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:/gi, '');
  },

  /**
   * Validate and sanitize email
   * @param {string} email - Email address
   * @returns {string|null} - Sanitized email or null if invalid
   */
  sanitizeEmail(email) {
    if (!email) return null;
    const sanitized = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized : null;
  },

  /**
   * Validate and sanitize phone number
   * @param {string} phone - Phone number
   * @returns {string} - Sanitized phone number (digits only)
   */
  sanitizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^\d+\-() ]/g, '');
  },

  /**
   * Sanitize filename for upload
   * @param {string} filename - Original filename
   * @returns {string} - Sanitized filename
   */
  sanitizeFilename(filename) {
    if (!filename) return 'file';
    return String(filename)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  },

  /**
   * Generate a cryptographically secure random string
   * @param {number} length - Length of string
   * @returns {string} - Random string
   */
  generateSecureToken(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Generate a secure user ID
   * @returns {string} - Secure user ID
   */
  generateUserId() {
    return `user_${this.generateSecureToken(16)}`;
  },

  /**
   * Generate a secure session token
   * @returns {string} - Secure session token
   */
  generateSessionToken() {
    const timestamp = Date.now().toString(36);
    const random = this.generateSecureToken(24);
    return `${timestamp}_${random}`;
  },

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {object} - Validation result with isValid and errors
   */
  validatePassword(password) {
    const errors = [];
    const config = typeof CONFIG !== 'undefined' ? CONFIG.VALIDATION : {
      PASSWORD_MIN_LENGTH: 8,
      PASSWORD_REQUIRE_UPPERCASE: true,
      PASSWORD_REQUIRE_LOWERCASE: true,
      PASSWORD_REQUIRE_NUMBER: true,
      PASSWORD_REQUIRE_SPECIAL: false
    };

    if (!password || password.length < config.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${config.PASSWORD_MIN_LENGTH} characters`);
    }
    if (config.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (config.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (config.PASSWORD_REQUIRE_NUMBER && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (config.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  },

  /**
   * Calculate password strength score
   * @param {string} password - Password to check
   * @returns {number} - Strength score 0-100
   */
  calculatePasswordStrength(password) {
    if (!password) return 0;
    let score = 0;

    // Length scoring
    score += Math.min(password.length * 4, 40);

    // Complexity scoring
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20;

    // Variety bonus
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 20);

    return Math.min(score, 100);
  },

  /**
   * Safely parse JSON with error handling
   * @param {string} json - JSON string
   * @param {*} defaultValue - Default value if parsing fails
   * @returns {*} - Parsed value or default
   */
  safeJsonParse(json, defaultValue = null) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return defaultValue;
    }
  },

  /**
   * Check if a URL is safe (same origin or allowed domain)
   * @param {string} url - URL to check
   * @param {string[]} allowedDomains - List of allowed domains
   * @returns {boolean}
   */
  isSafeUrl(url, allowedDomains = []) {
    try {
      const parsed = new URL(url, window.location.origin);

      // Allow same origin
      if (parsed.origin === window.location.origin) {
        return true;
      }

      // Check allowed domains
      return allowedDomains.some(domain =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityUtils;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.SecurityUtils = SecurityUtils;
}
