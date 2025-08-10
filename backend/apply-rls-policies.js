const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function applyRLSPolicies() {
  try {
    console.log('Applying RLS policies...');
    
    // Drop existing policies first
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can create ratings for their bookings" ON ratings;',
      'DROP POLICY IF EXISTS "Users can update their own ratings" ON ratings;'
    ];
    
    for (const sql of dropPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.log('Drop policy error (might be expected):', error.message);
      }
    }
    
    // Create new policies
    const createPolicies = [
      `CREATE POLICY "Users can create ratings for their bookings" ON ratings FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM institutions WHERE id = institution_id)
      );`,
      `CREATE POLICY "Users can update their own ratings" ON ratings FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM institutions WHERE id = institution_id)
      );`
    ];
    
    for (const sql of createPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.log('Create policy error:', error.message);
      } else {
        console.log('✓ Policy created successfully');
      }
    }
    
    console.log('RLS policies applied!');
    
  } catch (error) {
    console.error('Error applying RLS policies:', error.message);
  }
}

applyRLSPolicies();
