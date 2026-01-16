/**
 * Supabase Database Connection
 */
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = { supabase };
