/**
 * Register Function
 * POST /auth-register
 */
const { supabase } = require('./utils/db');
const {
  hashPassword,
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

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      businessName
    } = JSON.parse(bodyData);

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return jsonResponse(400, {
        success: false,
        error: 'Email, password, first name, and last name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse(400, { success: false, error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return jsonResponse(400, { success: false, error: 'Password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(password)) {
      return jsonResponse(400, { success: false, error: 'Password must contain an uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      return jsonResponse(400, { success: false, error: 'Password must contain a lowercase letter' });
    }
    if (!/\d/.test(password)) {
      return jsonResponse(400, { success: false, error: 'Password must contain a number' });
    }

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is what we want
      return jsonResponse(500, {
        success: false,
        error: 'Database error checking email',
        details: checkError.message
      });
    }

    if (existingUser) {
      return jsonResponse(409, { success: false, error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone || null,
        role: role || 'renter',
        business_name: businessName || null,
        status: 'active',
        is_admin: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Create user error:', createError);
      return jsonResponse(500, { success: false, error: 'Failed to create account' });
    }

    // Generate tokens
    const sessionToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Return user data
    const userData = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      role: newUser.role,
      phone: newUser.phone,
      businessName: newUser.business_name,
      isAdmin: newUser.is_admin
    };

    return jsonResponse(201, {
      success: true,
      sessionToken,
      refreshToken,
      user: userData
    });

  } catch (error) {
    console.error('Register error:', error);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
};
