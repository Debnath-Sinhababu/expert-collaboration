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
    
    
    console.log('Creating experts table...');
    const { error: expertsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS experts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20),
          bio TEXT,
          photo_url TEXT,
          qualifications TEXT[],
          domain_expertise TEXT[],
          hourly_rate DECIMAL(10,2),
          resume_url TEXT,
          availability JSONB,
          is_verified BOOLEAN DEFAULT FALSE,
          kyc_status VARCHAR(50) DEFAULT 'pending',
          rating DECIMAL(3,2) DEFAULT 0.00,
          total_ratings INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (expertsError) {
      console.log('Experts table might already exist or using direct SQL approach...');
    } else {
      console.log('✓ Experts table created');
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
