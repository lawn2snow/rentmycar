/**
 * RentMyCar - Authentication Functions
 */

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
