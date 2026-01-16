/**
 * Login Function
 * POST /auth-login
 */
const { supabase } = require('./utils/db');
const {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  jsonResponse,
  handleCors
} = require('./utils/auth');

exports.handler = async (event) => {
  // Handle CORS
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method not allowed' });
  }

  try {
    // Handle base64 encoded body
    let bodyData = event.body || '{}';
    if (event.isBase64Encoded) {
      bodyData = Buffer.from(bodyData, 'base64').toString('utf-8');
    }

    const { email, password, rememberMe } = JSON.parse(bodyData);

    // Validate input
    if (!email || !password) {
      return jsonResponse(400, { success: false, error: 'Email and password are required' });
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return jsonResponse(401, { success: false, error: 'Invalid email or password' });
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      return jsonResponse(403, { success: false, error: 'Account suspended. Please contact support.' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return jsonResponse(401, { success: false, error: 'Invalid email or password' });
    }

    // Generate tokens
    const sessionToken = generateAccessToken(user);
    const refreshToken = rememberMe ? generateRefreshToken(user) : null;

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Return user data (without sensitive fields)
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      phone: user.phone,
      businessName: user.business_name,
      isAdmin: user.is_admin
    };

    return jsonResponse(200, {
      success: true,
      sessionToken,
      refreshToken,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
};
