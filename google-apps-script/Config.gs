/**
 * RentMyCar - Configuration
 * Replace these values with your actual credentials
 */

// Google Sheet ID - Get this from the URL of your sheet
// https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

// Stripe API Keys
const STRIPE_SECRET_KEY = 'sk_test_YOUR_STRIPE_SECRET_KEY';
const STRIPE_WEBHOOK_SECRET = 'whsec_YOUR_WEBHOOK_SECRET';

// Session configuration
const SESSION_DURATION_HOURS = 24;
const REMEMBER_ME_DURATION_DAYS = 30;

// Platform fee percentages
// Renter pays: subtotal + RENTER_FEE_PERCENT
// Owner receives: subtotal - OWNER_FEE_PERCENT
const RENTER_FEE_PERCENT = 5;
const OWNER_FEE_PERCENT = 5;

// Legacy - kept for backward compatibility
const SERVICE_FEE_PERCENT = RENTER_FEE_PERCENT;

// Sheet names
const SHEETS = {
  USERS: 'Users',
  CARS: 'Cars',
  BOOKINGS: 'Bookings',
  SESSIONS: 'Sessions',
  REVIEWS: 'Reviews',
  PLATFORM_STATS: 'PlatformStats'
};

// CORS settings - Add your domain here
const ALLOWED_ORIGINS = [
  'https://rentmycar-demo.netlify.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
];
