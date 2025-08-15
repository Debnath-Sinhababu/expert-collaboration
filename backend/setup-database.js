const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    
    const sqlFile = path.join(__dirname, '../database-setup.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running complete database setup SQL...');
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql });
    
    if (sqlError) {
      console.log('SQL execution error:', sqlError.message);
      console.log('This might be expected if RPC is not available or tables already exist.');
    } else {
      console.log('✓ Complete database setup applied successfully');
    }
    
    console.log('\nTesting database connection...');
    const { data, error } = await supabase.from('experts').select('count').limit(1);
    
    if (error) {
      console.log('Database connection test result:', error.message);
      console.log('This might be expected if tables don\'t exist yet.');
    } else {
      console.log('✓ Database connection successful');
    }
    
    console.log('\nDatabase setup process completed!');
    console.log('Note: You may need to create tables manually in Supabase dashboard if RPC is not available.');
    
  } catch (error) {
    console.error('Database setup error:', error.message);
    console.log('\nTrying alternative approach - testing basic connection...');
    
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Auth connection test:', error ? error.message : 'Connected');
    } catch (authError) {
      console.log('Auth test error:', authError.message);
    }
  }
}

setupDatabase();
