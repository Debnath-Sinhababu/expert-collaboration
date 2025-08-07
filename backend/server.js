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
  console.log('GET /api/experts - Query params:', req.query);
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      domain_expertise = '', 
      min_hourly_rate = '', 
      max_hourly_rate = '',
      is_verified = ''
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    let supabaseClient = supabase;
    if (token) {
      supabaseClient = createClient(
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
    }
    
    let query = supabaseClient
      .from('experts')
      .select('*')
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,bio.ilike.%${search}%`);
    }
    
    if (domain_expertise) {
      query = query.contains('domain_expertise', [domain_expertise]);
    }
    
    if (min_hourly_rate) {
      query = query.gte('hourly_rate', parseFloat(min_hourly_rate));
    }
    
    if (max_hourly_rate) {
      query = query.lte('hourly_rate', parseFloat(max_hourly_rate));
    }
    
    if (is_verified) {
      query = query.eq('is_verified', is_verified === 'true');
    }
    
    const { data, error } = await query;
    console.log('GET /api/experts - Supabase response data count:', data?.length || 0);
    console.log('GET /api/experts - Supabase response error:', error);
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/experts', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabaseClient = createClient(
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
    }
    
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
      is_verified: true, // Auto-verify since email verification is required for login
      rating: req.body.rating || 0.00,
      total_ratings: req.body.total_projects || 0
    };
    
    const { data, error } = await supabaseClient
      .from('experts')
      .insert([expertData])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
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
    console.log('PUT /api/experts/:id - Request body:', req.body);
    console.log('PUT /api/experts/:id - Expert ID:', req.params.id);
    
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('PUT /api/experts/:id - Using authenticated client');
      supabaseClient = createClient(
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
    } else {
      console.log('PUT /api/experts/:id - No auth token, using basic client');
    }
    
    const { data, error } = await supabaseClient
      .from('experts')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    
    console.log('PUT /api/experts/:id - Supabase response data:', data);
    console.log('PUT /api/experts/:id - Supabase response error:', error);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.log('PUT /api/experts/:id - No data returned, sending empty object');
      res.json({});
    } else {
      console.log('PUT /api/experts/:id - Sending data:', data[0]);
      res.json(data[0]);
    }
  } catch (error) {
    console.log('PUT /api/experts/:id - Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/institutions', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    let supabaseClient = supabase;
    if (token) {
      supabaseClient = createClient(
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
    }
    
    const { data, error } = await supabaseClient
      .from('institutions')
      .select('*')
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/institutions', async (req, res) => {
  try {
    console.log('=== INSTITUTION CREATION DEBUG ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    let authenticatedUserId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Token received:', token.substring(0, 50) + '...');
      
      supabaseClient = createClient(
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
      
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      console.log('Authenticated user:', userData?.user?.id);
      console.log('User error:', userError);
      
      if (userData?.user?.id) {
        authenticatedUserId = userData.user.id;
      }
    } else {
      console.log('No auth token provided');
    }
    
    const institutionData = {
      user_id: authenticatedUserId,
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
      is_verified: true, // Auto-verify since email verification is required for login
      rating: req.body.rating || 0.00,
      total_ratings: req.body.total_projects || 0
    };
    
    console.log('Institution data to insert:', institutionData);
    
    const { data, error } = await supabaseClient
      .from('institutions')
      .insert([institutionData])
      .select();
    
    console.log('Insert result:', { data, error });
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.log('Institution creation error:', error);
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
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    let supabaseClient = supabase;
    if (token) {
      console.log('PUT /api/institutions/:id - Using authenticated client with token');
      supabaseClient = createClient(
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
    } else {
      console.log('PUT /api/institutions/:id - No auth token, using basic client');
    }
    
    const { data, error } = await supabaseClient
      .from('institutions')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    
    console.log('PUT /api/institutions/:id - Supabase response data:', data);
    console.log('PUT /api/institutions/:id - Supabase response error:', error);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.log('PUT /api/institutions/:id - No data returned, sending empty object');
      res.json({});
    } else {
      console.log('PUT /api/institutions/:id - Sending data:', data[0]);
      res.json(data[0]);
    }
  } catch (error) {
    console.log('PUT /api/institutions/:id - Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      type = '', 
      min_hourly_rate = '', 
      max_hourly_rate = '',
      status = 'open'
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = supabase
      .from('projects')
      .select(`
        *,
        institutions (
          id,
          name,
          logo_url
        )
      `)
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (min_hourly_rate) {
      query = query.gte('hourly_rate', parseFloat(min_hourly_rate));
    }
    
    if (max_hourly_rate) {
      query = query.lte('hourly_rate', parseFloat(max_hourly_rate));
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    console.log('=== PROJECT CREATION DEBUG ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Token received:', token.substring(0, 50) + '...');
      
      supabaseClient = createClient(
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
      
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      console.log('Authenticated user:', userData?.user?.id);
      console.log('User error:', userError);
      
      if (userData?.user?.id) {
        const { data: institutionData, error: instError } = await supabaseClient
          .from('institutions')
          .select('id, user_id')
          .eq('user_id', userData.user.id)
          .single();
        
        console.log('User institution:', institutionData);
        console.log('Requested institution_id:', req.body.institution_id);
        console.log('Institution match:', institutionData?.id === req.body.institution_id);
      }
    } else {
      console.log('No auth token provided');
    }
    
    console.log('Institution ID from request:', req.body.institution_id);
    
    const { data, error } = await supabaseClient
      .from('projects')
      .insert([req.body])
      .select();
    
    console.log('Insert result:', { data, error });
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.log('Project creation error:', error);
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
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabaseClient = createClient(
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
    }
    
    const { data, error } = await supabaseClient
      .from('projects')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    
    console.log('Update result:', { data, error });
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    console.log('=== GET APPLICATIONS DEBUG ===');
    console.log('Query params:', req.query);
    const { expert_id, project_id, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Using authenticated client for applications fetch');
      supabaseClient = createClient(
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
    } else {
      console.log('Using unauthenticated client for applications fetch');
    }
    
    let query = supabaseClient
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
      `)
      .range(offset, offset + parseInt(limit) - 1)
      .order('applied_at', { ascending: false });
    
    if (expert_id) {
      console.log('Filtering by expert_id:', expert_id);
      query = query.eq('expert_id', expert_id);
    }
    if (project_id) {
      console.log('Filtering by project_id:', project_id);
      query = query.eq('project_id', project_id);
    }
    
    const { data, error } = await query;
    console.log('Applications query result:', { dataCount: data?.length || 0, error });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.log('GET applications error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    console.log('=== APPLICATION CREATION DEBUG ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Token received:', token.substring(0, 50) + '...');
      
      supabaseClient = createClient(
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
      
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      console.log('Authenticated user:', userData?.user?.id);
      console.log('User error:', userError);
      
      if (userData?.user?.id) {
        const { data: expertData, error: expertError } = await supabaseClient
          .from('experts')
          .select('id, user_id')
          .eq('user_id', userData.user.id)
          .single();
        
        console.log('User expert profile:', expertData);
        console.log('Expert error:', expertError);
        
        if (expertData?.id) {
          req.body.expert_id = expertData.id;
          console.log('Added expert_id to request:', expertData.id);
        } else {
          console.log('No expert profile found for user');
          return res.status(400).json({ error: 'Expert profile not found. Please complete your profile setup first.' });
        }
      } else {
        console.log('No authenticated user found');
        return res.status(401).json({ error: 'Authentication required' });
      }
    } else {
      console.log('No auth token provided');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('Final request body:', req.body);
    
    const { data, error } = await supabaseClient
      .from('applications')
      .insert([req.body])
      .select();
    
    console.log('Insert result:', { data, error });
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.log('Application creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/applications/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabaseClient = createClient(
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
    }
    
    const { data, error } = await supabaseClient
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
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabaseClient = createClient(
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
    }
    
    const { data, error } = await supabaseClient
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
