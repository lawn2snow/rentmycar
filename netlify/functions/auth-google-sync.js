/**
 * Google Auth Sync Function
 * POST /auth-google-sync
 * Syncs Google OAuth users to our database
 */
const { supabase } = require('./utils/db');
const { jsonResponse, handleCors } = require('./utils/auth');

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

    const { id, email, firstName, lastName, avatarUrl } = JSON.parse(bodyData);

    if (!email) {
      return jsonResponse(400, { success: false, error: 'Email is required' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      // Update existing user's last login and avatar
      await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          avatar_url: avatarUrl || existingUser.avatar_url
        })
        .eq('id', existingUser.id);

      return jsonResponse(200, {
        success: true,
        message: 'User synced',
        userId: existingUser.id
      });
    }

    // Create new user for Google sign-in
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: 'GOOGLE_OAUTH', // Marker for OAuth users
        first_name: firstName || email.split('@')[0],
        last_name: lastName || '',
        role: 'both', // Allow access to both owner and renter dashboards
        status: 'active',
        is_admin: false,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Create Google user error:', createError);
      return jsonResponse(500, { success: false, error: 'Failed to create user' });
    }

    return jsonResponse(201, {
      success: true,
      message: 'User created',
      userId: newUser.id
    });

  } catch (error) {
    console.error('Google sync error:', error);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
};
