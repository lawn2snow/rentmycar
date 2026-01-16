/**
 * Delete Account Function
 * DELETE /auth-delete-account
 * Permanently deletes user account and all associated data
 */
const { supabase } = require('./utils/db');
const { verifyToken, jsonResponse, handleCors, extractToken } = require('./utils/auth');

exports.handler = async (event) => {
  // Handle CORS
  const corsResponse = handleCors(event);
  if (corsResponse) return corsResponse;

  // Only allow DELETE
  if (event.httpMethod !== 'DELETE') {
    return jsonResponse(405, { success: false, error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return jsonResponse(401, { success: false, error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return jsonResponse(401, { success: false, error: 'Invalid or expired token' });
    }

    const userId = decoded.id;

    // Delete user's bookings (as renter)
    await supabase
      .from('bookings')
      .delete()
      .eq('renter_id', userId);

    // Delete user's reviews
    await supabase
      .from('reviews')
      .delete()
      .eq('reviewer_id', userId);

    // Delete user's cars (this will cascade delete related bookings as owner)
    await supabase
      .from('cars')
      .delete()
      .eq('owner_id', userId);

    // Delete user's sessions
    await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId);

    // Finally, delete the user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return jsonResponse(500, { success: false, error: 'Failed to delete account' });
    }

    return jsonResponse(200, {
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
};
