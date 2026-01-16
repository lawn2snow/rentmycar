/**
 * Authentication Utilities
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

/**
 * Hash a password
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      isAdmin: user.is_admin || false
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader) {
  if (!authHeader) return null;

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return authHeader;
}

/**
 * Auth middleware for Netlify Functions
 */
function authenticateRequest(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = extractToken(authHeader);

  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return { authenticated: false, error: 'Invalid or expired token' };
  }

  return { authenticated: true, user: decoded };
}

/**
 * Require admin role
 */
function requireAdmin(user) {
  return user && user.isAdmin === true;
}

/**
 * CORS headers for responses
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

/**
 * Create JSON response
 */
function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    },
    body: JSON.stringify(body)
  };
}

/**
 * Handle CORS preflight
 */
function handleCors(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }
  return null;
}

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractToken,
  authenticateRequest,
  requireAdmin,
  corsHeaders,
  jsonResponse,
  handleCors
};
