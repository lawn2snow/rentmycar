/**
 * Get Current User Function
 * GET /auth-me
 */
const { supabase } = require('./utils/db');
const {
  authenticateRequest,
  jsonResponse,
  handleCors
} = require('./utils/auth');

exports.handler = async (event) => {
  // Handle CORS
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { success: false, error: 'Method not allowed' });
  }

  try {
    // Authenticate request
    const auth = authenticateRequest(event);
    if (!auth.authenticated) {
      return jsonResponse(401, { success: false, error: auth.error });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, role, business_name, is_admin, status, created_at')
      .eq('id', auth.user.id)
      .single();

    if (error || !user) {
      return jsonResponse(404, { success: false, error: 'User not found' });
    }

    if (user.status === 'suspended') {
      return jsonResponse(403, { success: false, error: 'Account suspended' });
    }

    return jsonResponse(200, {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        businessName: user.business_name,
        isAdmin: user.is_admin
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
};
