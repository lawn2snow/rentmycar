/**
 * RentMyCar - Complete Backend API
 * Single file containing all Google Apps Script code
 *
 * Deploy as Web App with:
 * - Execute as: Me
 * - Who has access: Anyone
 */

// ============================================
// CONFIGURATION
// ============================================

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


// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Hash a password using SHA-256 with salt
 */
function hashPassword(password, salt) {
  if (!salt) {
    salt = generateUUID();
  }
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + password
  );
  const hashString = hash.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
  return salt + ':' + hashString;
}

/**
 * Verify a password against a hash
 */
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const newHash = hashPassword(password, salt);
  return newHash === storedHash;
}

/**
 * Generate a secure session token
 */
function generateSessionToken() {
  const bytes = [];
  for (let i = 0; i < 32; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  return Utilities.base64Encode(bytes);
}

/**
 * Get the spreadsheet instance
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Get a specific sheet by name
 */
function getSheet(sheetName) {
  return getSpreadsheet().getSheetByName(sheetName);
}

/**
 * Convert sheet data to array of objects
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const objects = [];

  for (let i = 1; i < data.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    objects.push(obj);
  }

  return objects;
}

/**
 * Find a row by column value
 */
function findRowByValue(sheet, columnIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][columnIndex] === value) {
      return { rowIndex: i + 1, data: data[i] };
    }
  }
  return null;
}

/**
 * Create a JSON response
 */
function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate required fields
 */
function validateRequired(data, fields) {
  const missing = [];
  for (const field of fields) {
    if (!data[field] || data[field].toString().trim() === '') {
      missing.push(field);
    }
  }
  return missing;
}

/**
 * Parse JSON safely
 */
function safeParseJSON(str, defaultValue) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue || [];
  }
}

/**
 * Format date for sheet storage
 */
function formatDate(date) {
  return Utilities.formatDate(date || new Date(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

/**
 * Calculate days between two dates
 */
function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
}


// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Handle user signup
 */
function signup(data) {
  // Validate required fields
  const required = ['email', 'password', 'firstName', 'lastName', 'role'];
  const missing = validateRequired(data, required);
  if (missing.length > 0) {
    return { success: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  // Validate email format
  if (!isValidEmail(data.email)) {
    return { success: false, error: 'Invalid email format' };
  }

  // Validate password strength
  if (data.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  // Validate role
  if (!['renter', 'owner', 'both'].includes(data.role)) {
    return { success: false, error: 'Invalid role. Must be renter, owner, or both' };
  }

  const usersSheet = getSheet(SHEETS.USERS);

  // Check if email already exists
  const existingUser = findRowByValue(usersSheet, 1, data.email.toLowerCase());
  if (existingUser) {
    return { success: false, error: 'Email already registered' };
  }

  // Create user
  const userId = 'user_' + generateUUID();
  const passwordHash = hashPassword(data.password);
  const now = formatDate();

  const userRow = [
    userId,
    data.email.toLowerCase(),
    passwordHash,
    data.firstName,
    data.lastName,
    data.phone || '',
    data.role,
    '', // profileImage
    false, // verified
    '', // stripeCustomerId
    now, // joinDate
    now, // lastLogin
    'active', // status
    data.businessName || '', // businessName (optional for renters)
    false // isAdmin (always false for new signups)
  ];

  usersSheet.appendRow(userRow);

  // Create session
  const session = createSession(userId, data.rememberMe);

  // Return user data (without password)
  const user = {
    id: userId,
    email: data.email.toLowerCase(),
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone || '',
    role: data.role,
    profileImage: '',
    verified: false,
    joinDate: now,
    businessName: data.businessName || '',
    isAdmin: false
  };

  return {
    success: true,
    user: user,
    sessionToken: session.token
  };
}

/**
 * Handle user login
 */
function login(data) {
  // Validate required fields
  if (!data.email || !data.password) {
    return { success: false, error: 'Email and password are required' };
  }

  const usersSheet = getSheet(SHEETS.USERS);
  const userRow = findRowByValue(usersSheet, 1, data.email.toLowerCase());

  if (!userRow) {
    return { success: false, error: 'Invalid email or password' };
  }

  const userData = userRow.data;

  // Check if account is active
  if (userData[12] !== 'active') {
    return { success: false, error: 'Account is suspended or deleted' };
  }

  // Verify password
  if (!verifyPassword(data.password, userData[2])) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Update last login
  usersSheet.getRange(userRow.rowIndex, 12).setValue(formatDate());

  // Create session
  const session = createSession(userData[0], data.rememberMe);

  // Return user data
  const user = {
    id: userData[0],
    email: userData[1],
    firstName: userData[3],
    lastName: userData[4],
    phone: userData[5],
    role: userData[6],
    profileImage: userData[7],
    verified: userData[8],
    joinDate: userData[10],
    businessName: userData[13] || '',
    isAdmin: userData[14] === true || userData[14] === 'true'
  };

  return {
    success: true,
    user: user,
    sessionToken: session.token
  };
}

/**
 * Handle user logout
 */
function logout(sessionToken) {
  if (!sessionToken) {
    return { success: false, error: 'No session token provided' };
  }

  const sessionsSheet = getSheet(SHEETS.SESSIONS);
  const sessionRow = findRowByValue(sessionsSheet, 0, sessionToken);

  if (sessionRow) {
    sessionsSheet.deleteRow(sessionRow.rowIndex);
  }

  return { success: true };
}

/**
 * Get current user from session token
 */
function getCurrentUser(sessionToken) {
  if (!sessionToken) {
    return { success: false, error: 'No session token provided' };
  }

  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Invalid or expired session' };
  }

  // Get user data
  const usersSheet = getSheet(SHEETS.USERS);
  const userRow = findRowByValue(usersSheet, 0, session.userId);

  if (!userRow) {
    return { success: false, error: 'User not found' };
  }

  const userData = userRow.data;

  const user = {
    id: userData[0],
    email: userData[1],
    firstName: userData[3],
    lastName: userData[4],
    phone: userData[5],
    role: userData[6],
    profileImage: userData[7],
    verified: userData[8],
    joinDate: userData[10],
    businessName: userData[13] || '',
    isAdmin: userData[14] === true || userData[14] === 'true'
  };

  return { success: true, user: user };
}

/**
 * Create a new session
 */
function createSession(userId, rememberMe) {
  const sessionsSheet = getSheet(SHEETS.SESSIONS);
  const token = generateSessionToken();
  const now = new Date();

  const expiresAt = new Date(now);
  if (rememberMe) {
    expiresAt.setDate(expiresAt.getDate() + REMEMBER_ME_DURATION_DAYS);
  } else {
    expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);
  }

  const sessionRow = [
    token,
    userId,
    formatDate(now),
    formatDate(expiresAt),
    '', // ipAddress (not available in Apps Script)
    '' // userAgent
  ];

  sessionsSheet.appendRow(sessionRow);

  return { token: token, expiresAt: formatDate(expiresAt) };
}

/**
 * Validate a session token
 */
function validateSession(sessionToken) {
  const sessionsSheet = getSheet(SHEETS.SESSIONS);
  const sessionRow = findRowByValue(sessionsSheet, 0, sessionToken);

  if (!sessionRow) {
    return { valid: false };
  }

  const expiresAt = new Date(sessionRow.data[3]);
  if (expiresAt < new Date()) {
    // Session expired, delete it
    sessionsSheet.deleteRow(sessionRow.rowIndex);
    return { valid: false };
  }

  return { valid: true, userId: sessionRow.data[1] };
}

/**
 * Clean up expired sessions (run periodically via trigger)
 */
function cleanupExpiredSessions() {
  const sessionsSheet = getSheet(SHEETS.SESSIONS);
  const data = sessionsSheet.getDataRange().getValues();
  const now = new Date();

  // Go backwards to avoid index issues when deleting
  for (let i = data.length - 1; i >= 1; i--) {
    const expiresAt = new Date(data[i][3]);
    if (expiresAt < now) {
      sessionsSheet.deleteRow(i + 1);
    }
  }
}

/**
 * Get user by ID (for admin functions)
 */
function getUserById(userId) {
  const usersSheet = getSheet(SHEETS.USERS);
  const userRow = findRowByValue(usersSheet, 0, userId);

  if (!userRow) {
    return null;
  }

  const userData = userRow.data;
  return {
    id: userData[0],
    email: userData[1],
    firstName: userData[3],
    lastName: userData[4],
    phone: userData[5],
    role: userData[6],
    profileImage: userData[7],
    verified: userData[8],
    stripeCustomerId: userData[9],
    joinDate: userData[10],
    lastLogin: userData[11],
    status: userData[12],
    businessName: userData[13] || '',
    isAdmin: userData[14] === true || userData[14] === 'true',
    rowIndex: userRow.rowIndex
  };
}

/**
 * Check if user is admin (throws error if not)
 */
function requireAdmin(sessionToken) {
  const session = validateSession(sessionToken);
  if (!session.valid) {
    throw new Error('Unauthorized: Invalid session');
  }

  const user = getUserById(session.userId);
  if (!user || !user.isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  return user;
}

/**
 * Validate admin session and return user (doesn't throw)
 */
function validateAdminSession(sessionToken) {
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { valid: false, error: 'Invalid session' };
  }

  const user = getUserById(session.userId);
  if (!user || !user.isAdmin) {
    return { valid: false, error: 'Admin access required' };
  }

  return { valid: true, user: user };
}


// ============================================
// CAR CRUD OPERATIONS
// ============================================

/**
 * Get all cars with optional filters
 */
function getCars(filters) {
  const carsSheet = getSheet(SHEETS.CARS);
  let cars = sheetToObjects(carsSheet);

  // Filter only active cars for public listing
  cars = cars.filter(car => car.status === 'active');

  // Apply filters
  if (filters) {
    if (filters.type && filters.type !== 'all') {
      cars = cars.filter(car => car.type === filters.type);
    }

    if (filters.minPrice) {
      cars = cars.filter(car => car.pricePerDay >= parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      cars = cars.filter(car => car.pricePerDay <= parseFloat(filters.maxPrice));
    }

    if (filters.instantBook === 'true') {
      cars = cars.filter(car => car.instantBook === true || car.instantBook === 'TRUE');
    }

    // Location-based filtering (if lat/lng provided)
    if (filters.lat && filters.lng && filters.radius) {
      const userLat = parseFloat(filters.lat);
      const userLng = parseFloat(filters.lng);
      const radius = parseFloat(filters.radius);

      cars = cars.filter(car => {
        if (!car.latitude || !car.longitude) return false;
        const distance = calculateDistance(userLat, userLng, car.latitude, car.longitude);
        return distance <= radius;
      });
    }

    // Search by make/model
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      cars = cars.filter(car =>
        car.make.toLowerCase().includes(searchLower) ||
        car.model.toLowerCase().includes(searchLower)
      );
    }
  }

  // Parse JSON fields and format response
  cars = cars.map(car => ({
    id: car.carId,
    ownerId: car.ownerId,
    make: car.make,
    model: car.model,
    year: car.year,
    type: car.type,
    pricePerDay: car.pricePerDay,
    location: car.location,
    latitude: car.latitude,
    longitude: car.longitude,
    images: safeParseJSON(car.images, []),
    features: safeParseJSON(car.features, []),
    instantBook: car.instantBook === true || car.instantBook === 'TRUE',
    status: car.status,
    rating: car.rating || 0,
    reviewCount: car.reviewCount || 0
  }));

  return { success: true, cars: cars };
}

/**
 * Get a single car by ID
 */
function getCar(carId) {
  const carsSheet = getSheet(SHEETS.CARS);
  const carRow = findRowByValue(carsSheet, 0, carId);

  if (!carRow) {
    return { success: false, error: 'Car not found' };
  }

  const car = rowToCar(carRow.data);
  return { success: true, car: car };
}

/**
 * Get cars owned by a specific user
 */
function getOwnerCars(ownerId, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  // Verify user is requesting their own cars
  if (session.userId !== ownerId) {
    return { success: false, error: 'Unauthorized' };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  let cars = sheetToObjects(carsSheet);

  cars = cars.filter(car => car.ownerId === ownerId);
  cars = cars.map(car => rowToCar(Object.values(car)));

  return { success: true, cars: cars };
}

/**
 * Create a new car listing
 */
function createCar(data, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  // Verify user is an owner
  const userResult = getCurrentUser(sessionToken);
  if (!userResult.success) {
    return { success: false, error: 'Unauthorized' };
  }

  if (userResult.user.role !== 'owner' && userResult.user.role !== 'both') {
    return { success: false, error: 'Only owners can create car listings' };
  }

  // Validate required fields
  const required = ['make', 'model', 'year', 'type', 'pricePerDay', 'location'];
  const missing = validateRequired(data, required);
  if (missing.length > 0) {
    return { success: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  const carId = 'car_' + generateUUID();
  const now = formatDate();

  const carRow = [
    carId,
    session.userId,
    data.make,
    data.model,
    parseInt(data.year),
    data.type,
    parseFloat(data.pricePerDay),
    data.location,
    data.latitude || 0,
    data.longitude || 0,
    JSON.stringify(data.images || []),
    JSON.stringify(data.features || []),
    data.instantBook || false,
    'active',
    0, // rating
    0, // reviewCount
    now, // createdAt
    now // updatedAt
  ];

  carsSheet.appendRow(carRow);

  const car = rowToCar(carRow);
  return { success: true, car: car };
}

/**
 * Update a car listing
 */
function updateCar(carId, data, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  const carRow = findRowByValue(carsSheet, 0, carId);

  if (!carRow) {
    return { success: false, error: 'Car not found' };
  }

  // Verify ownership
  if (carRow.data[1] !== session.userId) {
    return { success: false, error: 'You can only edit your own cars' };
  }

  // Update fields
  const updatedRow = [...carRow.data];

  if (data.make !== undefined) updatedRow[2] = data.make;
  if (data.model !== undefined) updatedRow[3] = data.model;
  if (data.year !== undefined) updatedRow[4] = parseInt(data.year);
  if (data.type !== undefined) updatedRow[5] = data.type;
  if (data.pricePerDay !== undefined) updatedRow[6] = parseFloat(data.pricePerDay);
  if (data.location !== undefined) updatedRow[7] = data.location;
  if (data.latitude !== undefined) updatedRow[8] = data.latitude;
  if (data.longitude !== undefined) updatedRow[9] = data.longitude;
  if (data.images !== undefined) updatedRow[10] = JSON.stringify(data.images);
  if (data.features !== undefined) updatedRow[11] = JSON.stringify(data.features);
  if (data.instantBook !== undefined) updatedRow[12] = data.instantBook;
  if (data.status !== undefined) updatedRow[13] = data.status;

  updatedRow[17] = formatDate(); // updatedAt

  // Write back to sheet
  carsSheet.getRange(carRow.rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);

  const car = rowToCar(updatedRow);
  return { success: true, car: car };
}

/**
 * Delete a car listing
 */
function deleteCar(carId, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  const carRow = findRowByValue(carsSheet, 0, carId);

  if (!carRow) {
    return { success: false, error: 'Car not found' };
  }

  // Verify ownership
  if (carRow.data[1] !== session.userId) {
    return { success: false, error: 'You can only delete your own cars' };
  }

  // Check for active bookings
  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookings = sheetToObjects(bookingsSheet);
  const activeBookings = bookings.filter(b =>
    b.carId === carId &&
    ['pending', 'approved', 'active'].includes(b.status)
  );

  if (activeBookings.length > 0) {
    return { success: false, error: 'Cannot delete car with active bookings' };
  }

  // Delete the row
  carsSheet.deleteRow(carRow.rowIndex);

  return { success: true };
}

/**
 * Convert row data to car object
 */
function rowToCar(rowData) {
  return {
    id: rowData[0],
    ownerId: rowData[1],
    make: rowData[2],
    model: rowData[3],
    year: rowData[4],
    type: rowData[5],
    pricePerDay: rowData[6],
    location: rowData[7],
    latitude: rowData[8],
    longitude: rowData[9],
    images: safeParseJSON(rowData[10], []),
    features: safeParseJSON(rowData[11], []),
    instantBook: rowData[12] === true || rowData[12] === 'TRUE',
    status: rowData[13],
    rating: rowData[14] || 0,
    reviewCount: rowData[15] || 0,
    createdAt: rowData[16],
    updatedAt: rowData[17]
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}


// ============================================
// BOOKING MANAGEMENT
// ============================================

/**
 * Get bookings for a user (as renter or owner)
 */
function getBookings(role, status, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  let bookings = sheetToObjects(bookingsSheet);

  // Filter by role
  if (role === 'renter') {
    bookings = bookings.filter(b => b.renterId === session.userId);
  } else if (role === 'owner') {
    bookings = bookings.filter(b => b.ownerId === session.userId);
  }

  // Filter by status if provided
  if (status) {
    bookings = bookings.filter(b => b.status === status);
  }

  // Enrich with car details
  const carsSheet = getSheet(SHEETS.CARS);
  const cars = sheetToObjects(carsSheet);
  const carsMap = {};
  cars.forEach(car => { carsMap[car.carId] = car; });

  // Enrich with user details
  const usersSheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(usersSheet);
  const usersMap = {};
  users.forEach(user => {
    usersMap[user.userId] = {
      id: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };
  });

  bookings = bookings.map(b => {
    const car = carsMap[b.carId] || {};
    return {
      id: b.bookingId,
      carId: b.carId,
      car: {
        make: car.make,
        model: car.model,
        year: car.year,
        images: safeParseJSON(car.images, [])
      },
      renter: usersMap[b.renterId] || null,
      owner: usersMap[b.ownerId] || null,
      startDate: b.startDate,
      endDate: b.endDate,
      totalDays: b.totalDays,
      pricePerDay: b.pricePerDay,
      subtotal: b.subtotal,
      serviceFee: b.serviceFee,
      totalAmount: b.totalAmount,
      renterFee: b.renterFee || b.serviceFee,
      ownerFee: b.ownerFee || 0,
      platformEarnings: b.platformEarnings || b.serviceFee,
      ownerPayout: b.ownerPayout || b.subtotal,
      status: b.status,
      paymentStatus: b.paymentStatus,
      message: b.message || '',
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    };
  });

  // Sort by createdAt descending
  bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { success: true, bookings: bookings };
}

/**
 * Get a single booking by ID
 */
function getBooking(bookingId, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookingRow = findRowByValue(bookingsSheet, 0, bookingId);

  if (!bookingRow) {
    return { success: false, error: 'Booking not found' };
  }

  const b = rowToBooking(bookingRow.data);

  // Verify user has access to this booking
  if (b.renterId !== session.userId && b.ownerId !== session.userId) {
    return { success: false, error: 'Unauthorized' };
  }

  return { success: true, booking: b };
}

/**
 * Create a new booking
 */
function createBooking(data, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate required fields
  const required = ['carId', 'startDate', 'endDate'];
  const missing = validateRequired(data, required);
  if (missing.length > 0) {
    return { success: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  // Get car details
  const carsSheet = getSheet(SHEETS.CARS);
  const carRow = findRowByValue(carsSheet, 0, data.carId);

  if (!carRow) {
    return { success: false, error: 'Car not found' };
  }

  const car = rowToCar(carRow.data);

  if (car.status !== 'active') {
    return { success: false, error: 'Car is not available for booking' };
  }

  // Can't book your own car
  if (car.ownerId === session.userId) {
    return { success: false, error: 'You cannot book your own car' };
  }

  // Check for overlapping bookings
  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const existingBookings = sheetToObjects(bookingsSheet);
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  const overlapping = existingBookings.filter(b => {
    if (b.carId !== data.carId) return false;
    if (!['pending', 'approved', 'active'].includes(b.status)) return false;

    const bStart = new Date(b.startDate);
    const bEnd = new Date(b.endDate);

    return (startDate < bEnd && endDate > bStart);
  });

  if (overlapping.length > 0) {
    return { success: false, error: 'Car is not available for the selected dates' };
  }

  // Calculate pricing with platform fees
  const totalDays = daysBetween(startDate, endDate);
  const subtotal = totalDays * car.pricePerDay;

  // Platform fee structure:
  // - Renter pays: subtotal + renterFee (5%)
  // - Owner receives: subtotal - ownerFee (5%)
  // - Platform earns: renterFee + ownerFee (10% total)
  const renterFee = subtotal * (RENTER_FEE_PERCENT / 100);
  const ownerFee = subtotal * (OWNER_FEE_PERCENT / 100);
  const totalAmount = subtotal + renterFee;  // What renter pays
  const ownerPayout = subtotal - ownerFee;   // What owner receives
  const platformEarnings = renterFee + ownerFee;  // Platform revenue

  // Legacy field for backward compatibility
  const serviceFee = renterFee;

  // Create booking
  const bookingId = 'booking_' + generateUUID();
  const now = formatDate();

  // Determine initial status
  const initialStatus = car.instantBook ? 'approved' : 'pending';

  const bookingRow = [
    bookingId,
    data.carId,
    session.userId, // renterId
    car.ownerId,
    data.startDate,
    data.endDate,
    totalDays,
    car.pricePerDay,
    subtotal,
    serviceFee,
    totalAmount,
    initialStatus,
    '', // stripePaymentIntentId (will be set after Stripe call)
    'pending', // paymentStatus
    now, // createdAt
    now, // updatedAt
    renterFee,
    ownerFee,
    platformEarnings,
    ownerPayout,
    data.message || '' // renter's message to owner
  ];

  // Create Stripe PaymentIntent
  let stripeResult = null;
  try {
    stripeResult = createPaymentIntent(totalAmount, bookingId);
    bookingRow[12] = stripeResult.id; // stripePaymentIntentId
  } catch (e) {
    return { success: false, error: 'Failed to create payment intent: ' + e.message };
  }

  bookingsSheet.appendRow(bookingRow);

  const booking = rowToBooking(bookingRow);

  return {
    success: true,
    booking: booking,
    stripeClientSecret: stripeResult ? stripeResult.client_secret : null
  };
}

/**
 * Update booking status (approve, decline, cancel)
 */
function updateBookingStatus(bookingId, newStatus, sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const validStatuses = ['approved', 'declined', 'cancelled', 'completed'];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: 'Invalid status' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookingRow = findRowByValue(bookingsSheet, 0, bookingId);

  if (!bookingRow) {
    return { success: false, error: 'Booking not found' };
  }

  const booking = rowToBooking(bookingRow.data);

  // Check permissions
  const isOwner = booking.ownerId === session.userId;
  const isRenter = booking.renterId === session.userId;

  if (newStatus === 'approved' || newStatus === 'declined') {
    if (!isOwner) {
      return { success: false, error: 'Only the car owner can approve or decline bookings' };
    }
    if (booking.status !== 'pending') {
      return { success: false, error: 'Can only approve/decline pending bookings' };
    }
  }

  if (newStatus === 'cancelled') {
    if (!isRenter && !isOwner) {
      return { success: false, error: 'Unauthorized' };
    }
    if (!['pending', 'approved'].includes(booking.status)) {
      return { success: false, error: 'Cannot cancel this booking' };
    }

    // If cancelling after payment, initiate refund
    if (booking.paymentStatus === 'paid') {
      try {
        refundPayment(booking.stripePaymentIntentId);
        bookingsSheet.getRange(bookingRow.rowIndex, 14).setValue('refunded');
      } catch (e) {
        return { success: false, error: 'Failed to process refund: ' + e.message };
      }
    }
  }

  if (newStatus === 'completed') {
    if (!isOwner) {
      return { success: false, error: 'Only the car owner can mark bookings as completed' };
    }
    if (booking.status !== 'active') {
      return { success: false, error: 'Can only complete active bookings' };
    }
  }

  // Update status
  bookingsSheet.getRange(bookingRow.rowIndex, 12).setValue(newStatus);
  bookingsSheet.getRange(bookingRow.rowIndex, 16).setValue(formatDate()); // updatedAt

  booking.status = newStatus;

  return { success: true, booking: booking };
}

/**
 * Convert row data to booking object
 */
function rowToBooking(rowData) {
  return {
    id: rowData[0],
    carId: rowData[1],
    renterId: rowData[2],
    ownerId: rowData[3],
    startDate: rowData[4],
    endDate: rowData[5],
    totalDays: rowData[6],
    pricePerDay: rowData[7],
    subtotal: rowData[8],
    serviceFee: rowData[9],
    totalAmount: rowData[10],
    status: rowData[11],
    stripePaymentIntentId: rowData[12],
    paymentStatus: rowData[13],
    createdAt: rowData[14],
    updatedAt: rowData[15],
    renterFee: rowData[16] || rowData[9], // fallback to serviceFee for old bookings
    ownerFee: rowData[17] || 0,
    platformEarnings: rowData[18] || rowData[9], // fallback to serviceFee
    ownerPayout: rowData[19] || rowData[8], // fallback to subtotal for old bookings
    message: rowData[20] || '' // renter's message to owner
  };
}

/**
 * Get dashboard stats for owner
 */
function getOwnerStats(sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookings = sheetToObjects(bookingsSheet);
  const ownerBookings = bookings.filter(b => b.ownerId === session.userId);

  const carsSheet = getSheet(SHEETS.CARS);
  const cars = sheetToObjects(carsSheet);
  const ownerCars = cars.filter(c => c.ownerId === session.userId);

  // Calculate stats - use ownerPayout (subtotal - 5% fee) for actual earnings
  const totalEarnings = ownerBookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.ownerPayout || b.subtotal || 0), 0);

  const activeRentals = ownerBookings.filter(b => b.status === 'active').length;
  const pendingBookings = ownerBookings.filter(b => b.status === 'pending').length;
  const completedBookings = ownerBookings.filter(b => b.status === 'completed').length;

  const totalCars = ownerCars.length;
  const activeCars = ownerCars.filter(c => c.status === 'active').length;

  // Calculate average rating
  const ratings = ownerCars.map(c => c.rating || 0).filter(r => r > 0);
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  return {
    success: true,
    stats: {
      totalEarnings: totalEarnings,
      activeRentals: activeRentals,
      pendingBookings: pendingBookings,
      completedBookings: completedBookings,
      totalCars: totalCars,
      activeCars: activeCars,
      averageRating: avgRating.toFixed(1)
    }
  };
}

/**
 * Get dashboard stats for renter
 */
function getRenterStats(sessionToken) {
  // Validate session
  const session = validateSession(sessionToken);
  if (!session.valid) {
    return { success: false, error: 'Unauthorized' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookings = sheetToObjects(bookingsSheet);
  const renterBookings = bookings.filter(b => b.renterId === session.userId);

  const activeRentals = renterBookings.filter(b => b.status === 'active').length;
  const upcomingBookings = renterBookings.filter(b =>
    ['pending', 'approved'].includes(b.status) &&
    new Date(b.startDate) > new Date()
  ).length;
  const completedTrips = renterBookings.filter(b => b.status === 'completed').length;

  const totalSpent = renterBookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  return {
    success: true,
    stats: {
      activeRentals: activeRentals,
      upcomingBookings: upcomingBookings,
      completedTrips: completedTrips,
      totalSpent: totalSpent
    }
  };
}


// ============================================
// STRIPE PAYMENT INTEGRATION
// ============================================

/**
 * Create a Stripe PaymentIntent
 */
function createPaymentIntent(amount, bookingId) {
  const url = 'https://api.stripe.com/v1/payment_intents';

  const payload = {
    'amount': Math.round(amount * 100), // Convert to cents
    'currency': 'usd',
    'automatic_payment_methods[enabled]': 'true',
    'metadata[bookingId]': bookingId,
    'metadata[platform]': 'rentmycar'
  };

  const options = {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(STRIPE_SECRET_KEY + ':'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: Object.keys(payload).map(key =>
      encodeURIComponent(key) + '=' + encodeURIComponent(payload[key])
    ).join('&'),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}

/**
 * Refund a payment
 */
function refundPayment(paymentIntentId) {
  const url = 'https://api.stripe.com/v1/refunds';

  const payload = {
    'payment_intent': paymentIntentId
  };

  const options = {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(STRIPE_SECRET_KEY + ':'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: Object.keys(payload).map(key =>
      encodeURIComponent(key) + '=' + encodeURIComponent(payload[key])
    ).join('&'),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}

/**
 * Handle Stripe webhook events
 */
function handleStripeWebhookEvent(event) {
  const eventType = event.type;
  const paymentIntent = event.data.object;

  switch (eventType) {
    case 'payment_intent.succeeded':
      return handlePaymentSuccess(paymentIntent);

    case 'payment_intent.payment_failed':
      return handlePaymentFailed(paymentIntent);

    default:
      return { received: true };
  }
}

/**
 * Handle successful payment
 */
function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;

  if (!bookingId) {
    return { received: true, warning: 'No booking ID in metadata' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookingRow = findRowByValue(bookingsSheet, 0, bookingId);

  if (!bookingRow) {
    return { received: true, warning: 'Booking not found' };
  }

  // Update payment status to paid
  bookingsSheet.getRange(bookingRow.rowIndex, 14).setValue('paid');

  // If instant book and was approved, set to active
  const currentStatus = bookingRow.data[11];
  if (currentStatus === 'approved') {
    // Check if rental period has started
    const startDate = new Date(bookingRow.data[4]);
    if (startDate <= new Date()) {
      bookingsSheet.getRange(bookingRow.rowIndex, 12).setValue('active');
    }
  }

  bookingsSheet.getRange(bookingRow.rowIndex, 16).setValue(formatDate()); // updatedAt

  return { received: true, success: true };
}

/**
 * Handle failed payment
 */
function handlePaymentFailed(paymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;

  if (!bookingId) {
    return { received: true };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookingRow = findRowByValue(bookingsSheet, 0, bookingId);

  if (!bookingRow) {
    return { received: true };
  }

  // Update payment status to failed
  bookingsSheet.getRange(bookingRow.rowIndex, 14).setValue('failed');
  bookingsSheet.getRange(bookingRow.rowIndex, 16).setValue(formatDate()); // updatedAt

  return { received: true };
}

/**
 * Verify Stripe webhook signature (optional but recommended)
 */
function verifyWebhookSignature(payload, signature) {
  // For production, implement proper signature verification
  // using STRIPE_WEBHOOK_SECRET
  // This is simplified for demo purposes
  return true;
}

/**
 * Create a Stripe customer (for future use with saved cards)
 */
function createStripeCustomer(email, name) {
  const url = 'https://api.stripe.com/v1/customers';

  const payload = {
    'email': email,
    'name': name
  };

  const options = {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(STRIPE_SECRET_KEY + ':'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    payload: Object.keys(payload).map(key =>
      encodeURIComponent(key) + '=' + encodeURIComponent(payload[key])
    ).join('&'),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}


// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Get platform statistics for admin dashboard
 */
function getAdminStats(sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const usersSheet = getSheet(SHEETS.USERS);
  const carsSheet = getSheet(SHEETS.CARS);
  const bookingsSheet = getSheet(SHEETS.BOOKINGS);

  const users = sheetToObjects(usersSheet);
  const cars = sheetToObjects(carsSheet);
  const bookings = sheetToObjects(bookingsSheet);

  // Calculate stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const renters = users.filter(u => u.role === 'renter' || u.role === 'both').length;
  const owners = users.filter(u => u.role === 'owner' || u.role === 'both').length;

  const totalCars = cars.length;
  const activeCars = cars.filter(c => c.status === 'active').length;

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status === 'active').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;

  // Calculate platform revenue (sum of platformEarnings or serviceFee for paid bookings)
  const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');
  const totalPlatformRevenue = paidBookings.reduce((sum, b) => {
    return sum + (parseFloat(b.platformEarnings) || parseFloat(b.serviceFee) || 0);
  }, 0);

  // Calculate total transaction volume
  const totalTransactionVolume = paidBookings.reduce((sum, b) => {
    return sum + (parseFloat(b.totalAmount) || 0);
  }, 0);

  // Today's stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBookings = bookings.filter(b => new Date(b.createdAt) >= today).length;
  const todayRevenue = paidBookings
    .filter(b => new Date(b.createdAt) >= today)
    .reduce((sum, b) => sum + (parseFloat(b.platformEarnings) || parseFloat(b.serviceFee) || 0), 0);

  // This month's stats
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthlyBookings = bookings.filter(b => new Date(b.createdAt) >= thisMonth).length;
  const monthlyRevenue = paidBookings
    .filter(b => new Date(b.createdAt) >= thisMonth)
    .reduce((sum, b) => sum + (parseFloat(b.platformEarnings) || parseFloat(b.serviceFee) || 0), 0);

  return {
    success: true,
    stats: {
      users: {
        total: totalUsers,
        active: activeUsers,
        renters: renters,
        owners: owners
      },
      cars: {
        total: totalCars,
        active: activeCars
      },
      bookings: {
        total: totalBookings,
        active: activeBookings,
        pending: pendingBookings,
        completed: completedBookings,
        today: todayBookings,
        thisMonth: monthlyBookings
      },
      revenue: {
        total: totalPlatformRevenue,
        today: todayRevenue,
        thisMonth: monthlyRevenue,
        transactionVolume: totalTransactionVolume
      }
    }
  };
}

/**
 * Get all users (with optional filters)
 */
function getAdminUsers(filters, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const usersSheet = getSheet(SHEETS.USERS);
  let users = sheetToObjects(usersSheet);

  // Apply filters
  if (filters) {
    if (filters.status) {
      users = users.filter(u => u.status === filters.status);
    }
    if (filters.role) {
      users = users.filter(u => u.role === filters.role || u.role === 'both');
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(u =>
        u.email.toLowerCase().includes(search) ||
        u.firstName.toLowerCase().includes(search) ||
        u.lastName.toLowerCase().includes(search) ||
        (u.businessName && u.businessName.toLowerCase().includes(search))
      );
    }
  }

  // Format users for response
  users = users.map(u => ({
    id: u.userId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    status: u.status,
    businessName: u.businessName || '',
    isAdmin: u.isAdmin === true || u.isAdmin === 'true',
    joinDate: u.joinDate,
    lastLogin: u.lastLogin
  }));

  // Sort by joinDate descending
  users.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));

  return { success: true, users: users };
}

/**
 * Update a user (status, role, admin)
 */
function updateAdminUser(userId, updates, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const usersSheet = getSheet(SHEETS.USERS);
  const userRow = findRowByValue(usersSheet, 0, userId);

  if (!userRow) {
    return { success: false, error: 'User not found' };
  }

  // Update allowed fields
  if (updates.status && ['active', 'suspended'].includes(updates.status)) {
    usersSheet.getRange(userRow.rowIndex, 13).setValue(updates.status);
  }

  if (updates.role && ['renter', 'owner', 'both'].includes(updates.role)) {
    usersSheet.getRange(userRow.rowIndex, 7).setValue(updates.role);
  }

  if (updates.isAdmin !== undefined) {
    usersSheet.getRange(userRow.rowIndex, 15).setValue(updates.isAdmin);
  }

  return { success: true, message: 'User updated successfully' };
}

/**
 * Get all bookings (with optional filters)
 */
function getAdminBookings(filters, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  let bookings = sheetToObjects(bookingsSheet);

  // Get users and cars for enrichment
  const usersSheet = getSheet(SHEETS.USERS);
  const carsSheet = getSheet(SHEETS.CARS);
  const users = sheetToObjects(usersSheet);
  const cars = sheetToObjects(carsSheet);

  const usersMap = {};
  users.forEach(u => {
    usersMap[u.userId] = {
      id: u.userId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      businessName: u.businessName || ''
    };
  });

  const carsMap = {};
  cars.forEach(c => {
    carsMap[c.carId] = {
      id: c.carId,
      make: c.make,
      model: c.model,
      year: c.year
    };
  });

  // Apply filters
  if (filters) {
    if (filters.status) {
      bookings = bookings.filter(b => b.status === filters.status);
    }
    if (filters.paymentStatus) {
      bookings = bookings.filter(b => b.paymentStatus === filters.paymentStatus);
    }
    if (filters.startDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) <= new Date(filters.endDate));
    }
  }

  // Format bookings for response
  bookings = bookings.map(b => ({
    id: b.bookingId,
    car: carsMap[b.carId] || { id: b.carId },
    renter: usersMap[b.renterId] || { id: b.renterId },
    owner: usersMap[b.ownerId] || { id: b.ownerId },
    startDate: b.startDate,
    endDate: b.endDate,
    totalDays: b.totalDays,
    pricePerDay: parseFloat(b.pricePerDay),
    subtotal: parseFloat(b.subtotal),
    renterFee: parseFloat(b.renterFee) || parseFloat(b.serviceFee),
    ownerFee: parseFloat(b.ownerFee) || 0,
    platformEarnings: parseFloat(b.platformEarnings) || parseFloat(b.serviceFee),
    totalAmount: parseFloat(b.totalAmount),
    ownerPayout: parseFloat(b.ownerPayout) || parseFloat(b.subtotal),
    status: b.status,
    paymentStatus: b.paymentStatus,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt
  }));

  // Sort by createdAt descending
  bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { success: true, bookings: bookings };
}

/**
 * Get all cars (with optional filters)
 */
function getAdminCars(filters, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  let cars = sheetToObjects(carsSheet);

  // Get owners for enrichment
  const usersSheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(usersSheet);
  const usersMap = {};
  users.forEach(u => {
    usersMap[u.userId] = {
      id: u.userId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName
    };
  });

  // Get booking counts
  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookings = sheetToObjects(bookingsSheet);
  const bookingCounts = {};
  bookings.forEach(b => {
    bookingCounts[b.carId] = (bookingCounts[b.carId] || 0) + 1;
  });

  // Apply filters
  if (filters) {
    if (filters.status) {
      cars = cars.filter(c => c.status === filters.status);
    }
    if (filters.ownerId) {
      cars = cars.filter(c => c.ownerId === filters.ownerId);
    }
  }

  // Format cars for response
  cars = cars.map(c => ({
    id: c.carId,
    owner: usersMap[c.ownerId] || { id: c.ownerId },
    make: c.make,
    model: c.model,
    year: c.year,
    type: c.type,
    pricePerDay: parseFloat(c.pricePerDay),
    location: c.location,
    status: c.status,
    rating: parseFloat(c.rating) || 0,
    reviewCount: parseInt(c.reviewCount) || 0,
    bookingCount: bookingCounts[c.carId] || 0,
    createdAt: c.createdAt
  }));

  // Sort by createdAt descending
  cars.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { success: true, cars: cars };
}

/**
 * Update a car's status (admin override)
 */
function updateAdminCar(carId, updates, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const carsSheet = getSheet(SHEETS.CARS);
  const carRow = findRowByValue(carsSheet, 0, carId);

  if (!carRow) {
    return { success: false, error: 'Car not found' };
  }

  // Update allowed fields
  if (updates.status && ['active', 'inactive', 'suspended'].includes(updates.status)) {
    carsSheet.getRange(carRow.rowIndex, 13).setValue(updates.status);
  }

  return { success: true, message: 'Car updated successfully' };
}

/**
 * Get revenue report (with date range)
 */
function getAdminRevenue(filters, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  let bookings = sheetToObjects(bookingsSheet);

  // Filter to paid bookings only
  bookings = bookings.filter(b => b.paymentStatus === 'paid');

  // Apply date filters
  if (filters) {
    if (filters.startDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) <= new Date(filters.endDate));
    }
  }

  // Calculate totals
  let totalRenterFees = 0;
  let totalOwnerFees = 0;
  let totalPlatformEarnings = 0;
  let totalTransactionVolume = 0;
  let totalOwnerPayouts = 0;

  bookings.forEach(b => {
    totalRenterFees += parseFloat(b.renterFee) || parseFloat(b.serviceFee) || 0;
    totalOwnerFees += parseFloat(b.ownerFee) || 0;
    totalPlatformEarnings += parseFloat(b.platformEarnings) || parseFloat(b.serviceFee) || 0;
    totalTransactionVolume += parseFloat(b.totalAmount) || 0;
    totalOwnerPayouts += parseFloat(b.ownerPayout) || parseFloat(b.subtotal) || 0;
  });

  // Group by day for chart data
  const dailyRevenue = {};
  bookings.forEach(b => {
    const date = new Date(b.createdAt).toISOString().split('T')[0];
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = {
        date: date,
        bookings: 0,
        revenue: 0,
        volume: 0
      };
    }
    dailyRevenue[date].bookings++;
    dailyRevenue[date].revenue += parseFloat(b.platformEarnings) || parseFloat(b.serviceFee) || 0;
    dailyRevenue[date].volume += parseFloat(b.totalAmount) || 0;
  });

  // Convert to array and sort by date
  const chartData = Object.values(dailyRevenue).sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  );

  return {
    success: true,
    revenue: {
      totalBookings: bookings.length,
      totalRenterFees: totalRenterFees,
      totalOwnerFees: totalOwnerFees,
      totalPlatformEarnings: totalPlatformEarnings,
      totalTransactionVolume: totalTransactionVolume,
      totalOwnerPayouts: totalOwnerPayouts
    },
    chartData: chartData
  };
}

/**
 * Export revenue data as CSV
 */
function exportAdminRevenue(filters, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  let bookings = sheetToObjects(bookingsSheet);

  // Filter to paid bookings only
  bookings = bookings.filter(b => b.paymentStatus === 'paid');

  // Apply date filters
  if (filters) {
    if (filters.startDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) <= new Date(filters.endDate));
    }
  }

  // Build CSV
  const headers = [
    'Booking ID',
    'Date',
    'Car ID',
    'Renter ID',
    'Owner ID',
    'Days',
    'Price/Day',
    'Subtotal',
    'Renter Fee',
    'Owner Fee',
    'Platform Earnings',
    'Total Amount',
    'Owner Payout'
  ];

  const rows = bookings.map(b => [
    b.bookingId,
    b.createdAt,
    b.carId,
    b.renterId,
    b.ownerId,
    b.totalDays,
    b.pricePerDay,
    b.subtotal,
    b.renterFee || b.serviceFee,
    b.ownerFee || 0,
    b.platformEarnings || b.serviceFee,
    b.totalAmount,
    b.ownerPayout || b.subtotal
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  return { success: true, csv: csv };
}

/**
 * Update booking status (admin override)
 */
function updateAdminBookingStatus(bookingId, newStatus, sessionToken) {
  const adminCheck = validateAdminSession(sessionToken);
  if (!adminCheck.valid) {
    return { success: false, error: adminCheck.error };
  }

  const validStatuses = ['pending', 'approved', 'declined', 'active', 'completed', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: 'Invalid status' };
  }

  const bookingsSheet = getSheet(SHEETS.BOOKINGS);
  const bookingRow = findRowByValue(bookingsSheet, 0, bookingId);

  if (!bookingRow) {
    return { success: false, error: 'Booking not found' };
  }

  // Update status
  bookingsSheet.getRange(bookingRow.rowIndex, 12).setValue(newStatus);
  bookingsSheet.getRange(bookingRow.rowIndex, 16).setValue(formatDate()); // updatedAt

  return { success: true, message: 'Booking status updated successfully' };
}


// ============================================
// MAIN API ROUTER
// ============================================

/**
 * Handle GET requests
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

/**
 * Handle POST requests
 */
function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Main request handler
 */
function handleRequest(e, method) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const path = e.parameter.path || '';
    const sessionToken = getSessionToken(e);

    let data = {};

    // First, check for 'data' parameter in URL (CORS workaround)
    if (e.parameter.data) {
      try {
        data = JSON.parse(e.parameter.data);
      } catch (err) {
        // Not valid JSON
      }
    }

    // Then check POST body
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        // Merge POST data (takes priority)
        Object.assign(data, postData);
      } catch (err) {
        // Not JSON, ignore
      }
    }

    // Merge other query parameters into data
    Object.keys(e.parameter).forEach(key => {
      if (key !== 'path' && key !== 'data' && key !== 'token') {
        data[key] = e.parameter[key];
      }
    });

    let result;

    // Route to appropriate handler
    if (path.startsWith('/auth/')) {
      result = handleAuth(path, data, sessionToken);
    } else if (path.startsWith('/admin/')) {
      result = handleAdmin(path, method, data, sessionToken);
    } else if (path.startsWith('/cars')) {
      result = handleCars(path, method, data, sessionToken);
    } else if (path.startsWith('/bookings')) {
      result = handleBookings(path, method, data, sessionToken);
    } else if (path.startsWith('/stats')) {
      result = handleStats(path, sessionToken);
    } else if (path.startsWith('/stripe/webhook')) {
      result = handleStripeWebhookEvent(data);
    } else if (path.startsWith('/files')) {
      result = handleFiles(path, method, data, sessionToken);
    } else {
      result = { success: false, error: 'Not found', path: path };
    }

    return jsonResponse(result);

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Extract session token from request
 */
function getSessionToken(e) {
  // Check Authorization header (via parameter since Apps Script doesn't expose headers directly)
  if (e.parameter.token) {
    return e.parameter.token;
  }

  // Check in POST body
  if (e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      if (body.sessionToken) {
        return body.sessionToken;
      }
    } catch (err) {}
  }

  return null;
}

/**
 * Handle authentication routes
 */
function handleAuth(path, data, sessionToken) {
  switch (path) {
    case '/auth/signup':
      return signup(data);

    case '/auth/login':
      return login(data);

    case '/auth/logout':
      return logout(sessionToken);

    case '/auth/me':
      return getCurrentUser(sessionToken);

    default:
      return { success: false, error: 'Auth endpoint not found' };
  }
}

/**
 * Handle car routes
 */
function handleCars(path, method, data, sessionToken) {
  // GET /cars - List all cars
  if (path === '/cars' && method === 'GET') {
    return getCars(data);
  }

  // POST /cars - Create a car
  if (path === '/cars' && method === 'POST') {
    return createCar(data, sessionToken);
  }

  // GET /cars/owner/:ownerId - Get owner's cars
  const ownerMatch = path.match(/^\/cars\/owner\/(.+)$/);
  if (ownerMatch && method === 'GET') {
    return getOwnerCars(ownerMatch[1], sessionToken);
  }

  // GET /cars/:carId - Get single car
  const getMatch = path.match(/^\/cars\/([^\/]+)$/);
  if (getMatch && method === 'GET') {
    return getCar(getMatch[1]);
  }

  // PUT /cars/:carId - Update car
  if (getMatch && method === 'POST' && data._method === 'PUT') {
    return updateCar(getMatch[1], data, sessionToken);
  }

  // DELETE /cars/:carId - Delete car
  if (getMatch && method === 'POST' && data._method === 'DELETE') {
    return deleteCar(getMatch[1], sessionToken);
  }

  return { success: false, error: 'Car endpoint not found' };
}

/**
 * Handle booking routes
 */
function handleBookings(path, method, data, sessionToken) {
  // GET /bookings - List bookings
  if (path === '/bookings' && method === 'GET') {
    return getBookings(data.role, data.status, sessionToken);
  }

  // POST /bookings - Create booking
  if (path === '/bookings' && method === 'POST' && !data._method) {
    return createBooking(data, sessionToken);
  }

  // GET /bookings/:bookingId - Get single booking
  const getMatch = path.match(/^\/bookings\/([^\/]+)$/);
  if (getMatch && method === 'GET') {
    return getBooking(getMatch[1], sessionToken);
  }

  // PUT /bookings/:bookingId/status - Update booking status
  const statusMatch = path.match(/^\/bookings\/([^\/]+)\/status$/);
  if (statusMatch && method === 'POST') {
    return updateBookingStatus(statusMatch[1], data.status, sessionToken);
  }

  return { success: false, error: 'Booking endpoint not found' };
}

/**
 * Handle stats routes
 */
function handleStats(path, sessionToken) {
  if (path === '/stats/owner') {
    return getOwnerStats(sessionToken);
  }

  if (path === '/stats/renter') {
    return getRenterStats(sessionToken);
  }

  return { success: false, error: 'Stats endpoint not found' };
}

/**
 * Handle admin routes
 */
function handleAdmin(path, method, data, sessionToken) {
  // GET /admin/stats - Platform statistics
  if (path === '/admin/stats' && method === 'GET') {
    return getAdminStats(sessionToken);
  }

  // GET /admin/users - List all users
  if (path === '/admin/users' && method === 'GET') {
    return getAdminUsers(data, sessionToken);
  }

  // PUT /admin/users/:userId - Update user
  const userMatch = path.match(/^\/admin\/users\/([^\/]+)$/);
  if (userMatch && method === 'POST' && data._method === 'PUT') {
    return updateAdminUser(userMatch[1], data, sessionToken);
  }

  // GET /admin/bookings - List all bookings
  if (path === '/admin/bookings' && method === 'GET') {
    return getAdminBookings(data, sessionToken);
  }

  // PUT /admin/bookings/:bookingId/status - Update booking status
  const bookingStatusMatch = path.match(/^\/admin\/bookings\/([^\/]+)\/status$/);
  if (bookingStatusMatch && method === 'POST') {
    return updateAdminBookingStatus(bookingStatusMatch[1], data.status, sessionToken);
  }

  // GET /admin/cars - List all cars
  if (path === '/admin/cars' && method === 'GET') {
    return getAdminCars(data, sessionToken);
  }

  // PUT /admin/cars/:carId - Update car
  const carMatch = path.match(/^\/admin\/cars\/([^\/]+)$/);
  if (carMatch && method === 'POST' && data._method === 'PUT') {
    return updateAdminCar(carMatch[1], data, sessionToken);
  }

  // GET /admin/revenue - Revenue report
  if (path === '/admin/revenue' && method === 'GET') {
    return getAdminRevenue(data, sessionToken);
  }

  // GET /admin/revenue/export - Export revenue CSV
  if (path === '/admin/revenue/export' && method === 'GET') {
    return exportAdminRevenue(data, sessionToken);
  }

  return { success: false, error: 'Admin endpoint not found' };
}

/**
 * Test endpoint to verify deployment
 */
function doGetTest() {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'RentMyCar API is running',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Initialize sheets with headers (run once manually)
 */
function initializeSheets() {
  const ss = getSpreadsheet();

  // Users sheet
  let usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEETS.USERS);
    usersSheet.appendRow([
      'userId', 'email', 'passwordHash', 'firstName', 'lastName',
      'phone', 'role', 'profileImage', 'verified', 'stripeCustomerId',
      'joinDate', 'lastLogin', 'status', 'businessName', 'isAdmin'
    ]);
  }

  // Cars sheet
  let carsSheet = ss.getSheetByName(SHEETS.CARS);
  if (!carsSheet) {
    carsSheet = ss.insertSheet(SHEETS.CARS);
    carsSheet.appendRow([
      'carId', 'ownerId', 'make', 'model', 'year', 'type',
      'pricePerDay', 'location', 'latitude', 'longitude',
      'images', 'features', 'instantBook', 'status',
      'rating', 'reviewCount', 'createdAt', 'updatedAt'
    ]);
  }

  // Bookings sheet
  let bookingsSheet = ss.getSheetByName(SHEETS.BOOKINGS);
  if (!bookingsSheet) {
    bookingsSheet = ss.insertSheet(SHEETS.BOOKINGS);
    bookingsSheet.appendRow([
      'bookingId', 'carId', 'renterId', 'ownerId',
      'startDate', 'endDate', 'totalDays', 'pricePerDay',
      'subtotal', 'serviceFee', 'totalAmount', 'status',
      'stripePaymentIntentId', 'paymentStatus', 'createdAt', 'updatedAt',
      'renterFee', 'ownerFee', 'platformEarnings', 'ownerPayout', 'message'
    ]);
  }

  // PlatformStats sheet (for admin dashboard)
  let statsSheet = ss.getSheetByName(SHEETS.PLATFORM_STATS);
  if (!statsSheet) {
    statsSheet = ss.insertSheet(SHEETS.PLATFORM_STATS);
    statsSheet.appendRow([
      'date', 'totalBookings', 'totalRevenue', 'totalPayouts'
    ]);
  }

  // Sessions sheet
  let sessionsSheet = ss.getSheetByName(SHEETS.SESSIONS);
  if (!sessionsSheet) {
    sessionsSheet = ss.insertSheet(SHEETS.SESSIONS);
    sessionsSheet.appendRow([
      'sessionId', 'userId', 'createdAt', 'expiresAt', 'ipAddress', 'userAgent'
    ]);
  }

  // Reviews sheet
  let reviewsSheet = ss.getSheetByName(SHEETS.REVIEWS);
  if (!reviewsSheet) {
    reviewsSheet = ss.insertSheet(SHEETS.REVIEWS);
    reviewsSheet.appendRow([
      'reviewId', 'bookingId', 'carId', 'reviewerId', 'rating', 'comment', 'createdAt'
    ]);
  }

  return 'Sheets initialized successfully';
}

/**
 * Add sample data for testing (run once manually)
 */
function addSampleData() {
  const carsSheet = getSheet(SHEETS.CARS);
  const now = formatDate();

  const sampleCars = [
    ['car_sample1', 'demo_owner', 'Tesla', 'Model 3', 2023, 'electric', 89, 'San Francisco, CA', 37.7749, -122.4194,
      '["https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800"]',
      '["Autopilot", "Premium Audio", "All-Wheel Drive"]', true, 'active', 4.9, 127, now, now],
    ['car_sample2', 'demo_owner', 'BMW', 'M4', 2023, 'sports', 150, 'Los Angeles, CA', 34.0522, -118.2437,
      '["https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800"]',
      '["Sport Mode", "Carbon Fiber", "Premium Sound"]', false, 'active', 4.8, 89, now, now],
    ['car_sample3', 'demo_owner', 'Mercedes', 'G-Wagon', 2023, 'luxury', 275, 'Miami, FL', 25.7617, -80.1918,
      '["https://images.unsplash.com/photo-1519245659620-e859806a8d3b?w=800"]',
      '["Luxury Interior", "Off-Road Package", "Premium Audio"]', true, 'active', 4.95, 64, now, now]
  ];

  sampleCars.forEach(car => carsSheet.appendRow(car));

  return 'Sample data added';
}
