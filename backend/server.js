const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Expert Collaboration API is running' });
});

app.get('/api/experts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('experts')
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/experts', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('Auth header:', authHeader);
    console.log('Token:', token ? 'Present' : 'Missing');
    console.log('Request body:', req.body);
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Authentication token required' });
    }
    
    const supabaseWithAuth = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const expertData = {
      user_id: req.body.user_id,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      bio: req.body.bio,
      photo_url: req.body.photo_url || null,
      qualifications: req.body.qualifications ? [req.body.qualifications] : [],
      domain_expertise: req.body.domain_expertise ? [req.body.domain_expertise] : [],
      hourly_rate: req.body.hourly_rate,
      resume_url: req.body.resume_url,
      availability: req.body.availability || [],
      is_verified: req.body.verified || false,
      rating: req.body.rating || 0.00,
      total_ratings: req.body.total_projects || 0
    };
    
    console.log('Mapped expert data:', expertData);
    console.log('Attempting to insert expert data...');
    const { data, error } = await supabaseWithAuth
      .from('experts')
      .insert([expertData])
      .select();
    
    if (error) {
      console.log('Supabase error:', error);
      throw error;
    }
    
    console.log('Expert created successfully:', data[0]);
    res.status(201).json(data[0]);
  } catch (error) {
    console.log('Caught error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/experts/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('experts')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/experts/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('experts')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/institutions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/institutions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('Institution Auth header:', authHeader);
    console.log('Institution Token:', token ? 'Present' : 'Missing');
    console.log('Institution Request body:', req.body);
    
    if (!token) {
      console.log('No institution token provided');
      return res.status(401).json({ error: 'Authentication token required' });
    }
    
    const supabaseWithAuth = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const institutionData = {
      user_id: req.body.user_id,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      type: req.body.type,
      description: req.body.description,
      logo_url: req.body.logo_url || null,
      website_url: req.body.website_url,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country || 'India',
      is_verified: req.body.verified || false,
      rating: req.body.rating || 0.00,
      total_ratings: req.body.total_projects || 0
    };
    
    console.log('Mapped institution data:', institutionData);
    console.log('Attempting to insert institution data...');
    const { data, error } = await supabaseWithAuth
      .from('institutions')
      .insert([institutionData])
      .select();
    
    if (error) {
      console.log('Institution Supabase error:', error);
      throw error;
    }
    
    console.log('Institution created successfully:', data[0]);
    res.status(201).json(data[0]);
  } catch (error) {
    console.log('Institution Caught error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/institutions/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/institutions/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('institutions')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        institutions (
          id,
          name,
          logo_url
        )
      `);
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([req.body])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        institutions (
          id,
          name,
          logo_url
        )
      `)
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    const { expert_id, project_id } = req.query;
    let query = supabase
      .from('applications')
      .select(`
        *,
        experts (
          id,
          name,
          photo_url,
          bio,
          hourly_rate
        ),
        projects (
          id,
          title,
          type,
          hourly_rate,
          start_date,
          end_date
        )
      `);
    
    if (expert_id) query = query.eq('expert_id', expert_id);
    if (project_id) query = query.eq('project_id', project_id);
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .insert([req.body])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/applications/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (amount > 5000) {
      return res.status(400).json({ error: 'Booking amount cannot exceed ₹5,000' });
    }
    
    const { data, error } = await supabase
      .from('bookings')
      .insert([req.body])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const { expert_id, institution_id } = req.query;
    let query = supabase
      .from('bookings')
      .select(`
        *,
        experts (
          id,
          name,
          photo_url
        ),
        institutions (
          id,
          name,
          logo_url
        ),
        projects (
          id,
          title,
          type
        )
      `);
    
    if (expert_id) query = query.eq('expert_id', expert_id);
    if (institution_id) query = query.eq('institution_id', institution_id);
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ratings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .insert([req.body])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ratings', async (req, res) => {
  try {
    const { expert_id, institution_id } = req.query;
    let query = supabase
      .from('ratings')
      .select('*');
    
    if (expert_id) query = query.eq('expert_id', expert_id);
    if (institution_id) query = query.eq('institution_id', institution_id);
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
