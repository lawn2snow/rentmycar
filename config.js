/**
 * RentMyCar - Frontend Configuration
 * Environment-aware configuration for production deployment
 */

// Detect environment (works with Vite build or standalone)
const getEnvVar = (key, defaultValue) => {
  // Check for Vite environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  // Check for window config (can be set by deployment)
  if (typeof window !== 'undefined' && window.__ENV__) {
    return window.__ENV__[key] || defaultValue;
  }
  return defaultValue;
};

// Determine if we're in production
const isProduction = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname !== 'localhost' &&
           window.location.hostname !== '127.0.0.1';
  }
  return false;
};

const CONFIG = {
  // API Configuration - Netlify Functions
  API_URL: isProduction()
    ? '/.netlify/functions'
    : 'http://localhost:8888/.netlify/functions',

  // Supabase Configuration
  SUPABASE_URL: 'https://voulgtlxczieiewacdgz.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdWxndGx4Y3ppZWlld2FjZGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Mzc3NTQsImV4cCI6MjA4NDExMzc1NH0.mzHxt8unE4-BKR7QbOzp3eUQqt5HDAOqskX-Tfh8SHE',

  // Stripe Publishable Key (starts with pk_)
  STRIPE_PUBLISHABLE_KEY: getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', ''),

  // App settings
  APP_NAME: getEnvVar('VITE_APP_NAME', 'RentMyCar'),
  APP_URL: getEnvVar('VITE_APP_URL', 'https://rentmycar-demo.netlify.app'),
  SERVICE_FEE_PERCENT: parseInt(getEnvVar('VITE_SERVICE_FEE_PERCENT', '10'), 10),

  // Environment
  IS_PRODUCTION: isProduction(),
  ENABLE_DEMO_MODE: getEnvVar('VITE_ENABLE_DEMO_MODE', 'false') === 'true',

  // Session storage keys
  STORAGE_KEYS: {
    SESSION_TOKEN: 'rentmycar_session',
    USER: 'rentmycar_user',
    DARK_MODE: 'rentmycar_darkmode',
    REFRESH_TOKEN: 'rentmycar_refresh'
  },

  // Default images
  DEFAULT_CAR_IMAGE: '/images/default-car.jpg',
  DEFAULT_AVATAR: '/images/default-avatar.png',

  // API Endpoints
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth-login',
    REGISTER: '/auth-register',
    LOGOUT: '/auth-logout',
    ME: '/auth-me',
    REFRESH: '/auth-refresh',

    // Cars
    CARS_LIST: '/cars-list',
    CARS_CREATE: '/cars-create',
    CARS_UPDATE: '/cars-update',
    CARS_DELETE: '/cars-delete',

    // Bookings
    BOOKINGS_LIST: '/bookings-list',
    BOOKINGS_CREATE: '/bookings-create',
    BOOKINGS_UPDATE: '/bookings-update',
    BOOKINGS_CANCEL: '/bookings-cancel',

    // Payments
    PAYMENT_INTENT: '/payments-create-intent',
    PAYMENT_WEBHOOK: '/payments-webhook',

    // Admin
    ADMIN_STATS: '/admin-stats',
    ADMIN_USERS: '/admin-users',
    ADMIN_BOOKINGS: '/admin-bookings',
    ADMIN_CARS: '/admin-cars',
    ADMIN_REVENUE: '/admin-revenue'
  },

  // Validation rules
  VALIDATION: {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REQUIRE_UPPERCASE: true,
    PASSWORD_REQUIRE_LOWERCASE: true,
    PASSWORD_REQUIRE_NUMBER: true,
    PASSWORD_REQUIRE_SPECIAL: false,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp']
  }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.ENDPOINTS);
Object.freeze(CONFIG.VALIDATION);

// Warn if critical config is missing in production
if (CONFIG.IS_PRODUCTION) {
  if (!CONFIG.SUPABASE_URL) {
    console.error('CONFIG ERROR: SUPABASE_URL is not configured');
  }
  if (!CONFIG.STRIPE_PUBLISHABLE_KEY) {
    console.error('CONFIG ERROR: STRIPE_PUBLISHABLE_KEY is not configured');
  }
}
