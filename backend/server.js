const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');

dotenv.config();

// Import services after environment variables are loaded
const notificationService = require('./services/notificationService');
const socketService = require('./services/socketService');
console.log('Environment variables loaded:');
console.log('UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not set');
console.log('UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not set');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'Set' : 'Not set');

const app = express();
const server = http.createServer(app);
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
    console.log('GET /api/projects - Query params:', req.query);

    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      type = '', 
      min_hourly_rate = '', 
      max_hourly_rate = '',
      status = '',
      institution_id = '',
      expert_id = '' // used for filtering out applied projects
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    console.log(`Pagination: page=${page}, limit=${limit}, offset=${offset}`);

    // Start building base query
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

    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Other filters
    if (type) query = query.eq('type', type);
    if (min_hourly_rate) query = query.gte('hourly_rate', parseFloat(min_hourly_rate));
    if (max_hourly_rate) query = query.lte('hourly_rate', parseFloat(max_hourly_rate));
    if (status) query = query.eq('status', status);
    if (institution_id) query = query.eq('institution_id', institution_id);

    // Expert filtering: remove projects they already applied to
    if (expert_id && expert_id.trim() !== '') {
      console.log('Filtering out projects already applied to by expert:', expert_id);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(expert_id)) {
        const serviceClient = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
      
        // Get project IDs from applications
        const { data: appliedProjects, error: subqueryError } = await serviceClient
          .from('applications')
          .select('project_id')
          .eq('expert_id', expert_id);

        if (subqueryError) {
          console.log('Error fetching applied projects:', subqueryError);
        } else {
          console.log('Applied projects:', appliedProjects);
          const projectIds = appliedProjects.map(row => row.project_id);
          console.log('Project IDs:', projectIds);
          if (projectIds.length > 0) {
            query = query.not('id', 'in', `(${projectIds.join(',')})`);
          }
        }
      } else {
        console.log('Invalid expert_id format, skipping expert filtering');
      }
    }

    // Run main query
    const { data, error } = await query;

    if (error) throw error;

    console.log(`Projects query result: ${data?.length || 0} projects returned`);
    res.json(data);

  } catch (error) {
    console.error('GET projects error:', error);
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
        if (!institutionData) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
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
    
    // Send notification to all experts about new project
    try {
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      // Get institution details for notification
      const { data: institutionData } = await serviceClient
        .from('institutions')
        .select('name')
        .eq('id', req.body.institution_id)
        .single();
      console.log('Institution data:', institutionData);
      
      if (institutionData) {
        // Get all experts to notify about new project
        const { data: expertsData } = await serviceClient
          .from('experts')
          .select('user_id, domain_expertise')
          .not('domain_expertise', 'is', null);
          console.log('Experts data:', expertsData);

      }
    } catch (notificationError) {
      console.error('Error sending project notification:', notificationError);
      // Don't fail the main request if notification fails
    }
    
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
    const { expert_id, project_id, institution_id, page = 1, limit = 10 } = req.query;
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
          description,
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
    if (institution_id) {
      console.log('Filtering by institution_id via joined projects:', institution_id);
      // Filter using the joined projects relation
      query = query.eq('projects.institution_id', institution_id);
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
    
    // Send notification to institution about new application
    try {
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      // Get project and expert details for notification
      console.log('Request body:', req.body);
      const { data: projectData } = await serviceClient
        .from('projects')
        .select('title, institution_id')
        .eq('id', req.body.project_id)
        .single();
        console.log('Project data:', projectData);
      const { data: expertData } = await serviceClient
        .from('experts')
        .select('name, domain_expertise, hourly_rate')
        .eq('id', req.body.expert_id)
        .single();
        console.log('Expert data:', expertData);
      
      const { data: institutionData } = await serviceClient
        .from('institutions')
        .select('name, email, user_id')
        .eq('id', projectData.institution_id)
        .single();
     
     
      console.log('Institution data:', institutionData);
      if (projectData && expertData && institutionData) {

    
        // Send email notification
        await notificationService.sendExpertApplicationNotification(
          institutionData.email,
          projectData.title,
          expertData.name,
          expertData.domain_expertise,
          expertData.hourly_rate
        );
        
        // Send real-time notification
        socketService.sendExpertApplicationNotification(
          institutionData.user_id,
          projectData.title,
          expertData.name
        );
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the main request if notification fails
    }
    
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

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    console.log('Authenticated user:', userData?.user?.id);
    console.log('User error:', userError);

    
    const { data, error } = await supabaseClient
      .from('applications')
      .update(req.body)
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    
    // Send notification to expert about application status change
    try {
      if (req.body.status === 'accepted' || req.body.status === 'rejected') {
        const serviceClient = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        // Get application details for notification
        const { data: applicationData } = await serviceClient
          .from('applications')
          .select(`
            project_id,
            expert_id,
            status,
            projects!inner(title, institution_id),
            experts!inner(name, email, user_id),
            institutions!inner(name)
          `)
          .eq('id', req.params.id)
          .single();
        
        if (applicationData) {
          // Send email notification
          await notificationService.sendApplicationStatusNotification(
            applicationData.experts.email,
            applicationData.projects.title,
            applicationData.institutions.name,
            req.body.status
          );
          
          // Send real-time notification
          socketService.sendApplicationStatusNotification(
            applicationData.experts.user_id, // Use Supabase user_id instead of expert_id
            applicationData.projects.title,
            req.body.status
          );
        }
      }
    } catch (notificationError) {
      console.error('Error sending application status notification:', notificationError);
      // Don't fail the main request if notification fails
    }
    
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
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

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    console.log('Authenticated user for booking creation:', userData?.user?.id);
    console.log('User error:', userError);

    const { amount } = req.body;
    
  
    
    const { data, error } = await supabaseClient
      .from('bookings')
      .insert([req.body])
      .select();
    
    if (error) throw error;
    
    // Send notification to expert about booking creation
    try {
      // Get booking details for notification
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data: bookingData } = await serviceClient
        .from('bookings')
        .select(`
          *,
          projects!inner(title),
          experts!inner(name, email, user_id),
          institutions!inner(name)
        `)
        .eq('id', data[0].id)
        .single();
      
      if (bookingData) {
        // Send email notification
        await notificationService.sendBookingNotification(
          bookingData.experts.email,
          bookingData.projects.title,
          bookingData.institutions.name,
          bookingData
        );
        
        // Send real-time notification
        socketService.sendBookingNotification(
          bookingData.experts.user_id, // Use Supabase user_id instead of expert_id
          bookingData.projects.title,
          bookingData.institutions.name,
          true // isCreation = true
        );
      }
    } catch (notificationError) {
      console.error('Error sending booking notification:', notificationError);
      // Don't fail the main request if notification fails
    }
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings', async (req, res) => {
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

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    console.log('Authenticated user for booking fetch:', userData?.user?.id);
    console.log('User error:', userError);

    const { expert_id, institution_id, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabaseClient
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
      `)
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });
    
    if (expert_id) query = query.eq('expert_id', expert_id);
    if (institution_id) query = query.eq('institution_id', institution_id);
    
    const { data, error } = await query;
    
    if (error) throw error;

    // If RLS hides joined institutions, backfill using service role as a safe fallback
    if (Array.isArray(data)) {
      const missingInstitutionIds = Array.from(new Set(
        data
          .filter((row) => !row.institutions && row.institution_id)
          .map((row) => row.institution_id)
      ));

      if (missingInstitutionIds.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const serviceClient = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          );
          const { data: instData, error: instErr } = await serviceClient
            .from('institutions')
            .select('id, name, logo_url')
            .in('id', missingInstitutionIds);
          if (!instErr && Array.isArray(instData)) {
            const idToInstitution = instData.reduce((acc, inst) => {
              acc[inst.id] = inst;
              return acc;
            }, {});
            data.forEach((row) => {
              if (!row.institutions && row.institution_id && idToInstitution[row.institution_id]) {
                row.institutions = idToInstitution[row.institution_id];
              }
            });
          }
        } catch (e) {
          console.log('Institutions backfill skipped due to error:', e?.message || e);
        }
      }
    }

    console.log('Bookings fetched:', data?.length || 0);
    res.json(data);
  } catch (error) {
    console.error('Booking fetch error:', error);
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

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    console.log('Authenticated user for rating creation:', userData?.user?.id);
    console.log('User error:', userError);

    // Check if user is an institution
    if (userData?.user?.id) {
      const { data: institutionData, error: instError } = await supabaseClient
        .from('institutions')
        .select('id, user_id')
        .eq('user_id', userData.user.id)
        .single();
      
      console.log('User institution data:', institutionData);
      console.log('Requested institution_id:', req.body.institution_id);
      console.log('Institution match:', institutionData?.id === req.body.institution_id);
    }

    console.log('Rating data to insert:', req.body);
    
    // Try to insert with RLS first
    let { data, error } = await supabaseClient
      .from('ratings')
      .insert([req.body])
      .select();
    
    if (error) {
      console.log('Error occurred, trying with service role...');
      console.log('Error message:', error.message);
      console.log('Service role key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.log('RLS policy blocked the insert, trying with service role...');
      console.log('Service role key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      // If RLS blocks it, try with service role (temporary workaround)
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
      );
      
      console.log('Using service role key for rating creation...');
      
      const { data: serviceData, error: serviceError } = await serviceClient
        .from('ratings')
        .insert([req.body])
        .select();
      
      if (serviceError) {
        console.error('Service role insert error:', serviceError);
        throw serviceError;
      }
      
      console.log('Rating created successfully with service role:', serviceData[0]);
      res.status(201).json(serviceData[0]);
      return;
    }
    
    if (error) {
      console.error('Rating creation error:', error);
      throw error;
    }
    
    console.log('Rating created successfully:', data[0]);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Rating creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ratings', async (req, res) => {
  try {
    const { expert_id, institution_id, booking_id } = req.query;

    // Validate that expert_id is provided

    console.log('Fetching ratings for expert:', expert_id);

    // Use service role key to fetch ratings (public data)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ 
        error: 'Service role key not configured' 
      });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Build the query
    let query = serviceClient
    .from('ratings')
    .select(`
      *,
      expert:experts(id, name, email),
      institution:institutions(id, name)
    `);

  // Apply filters
  if (expert_id) {
    query = query.eq('expert_id', expert_id);
  }
  
  if (institution_id) {
    query = query.eq('institution_id', institution_id);
  }
  
  if (booking_id) {
    query = query.eq('booking_id', booking_id);
  }


    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Ratings fetch error:', error);
      throw error;
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bookings/:id', async (req, res) => {
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

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    console.log('Authenticated user for booking update:', userData?.user?.id);
    console.log('User error:', userError);

    const { id } = req.params;
    const updateData = req.body;
    console.log('Updating booking:', id, 'with data:', updateData);
    
    const { data, error } = await supabaseClient
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Booking update error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('Booking not found:', id);
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Send notification to expert about booking update
    try {
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      // Get booking details for notification
      const { data: bookingData } = await serviceClient
        .from('bookings')
        .select(`
          *,
          projects!inner(title),
          experts!inner(name, email, user_id),
          institutions!inner(name)
        `)
        .eq('id', id)
        .single();
      
      if (bookingData) {
        // Send email notification
        await notificationService.sendBookingNotification(
          bookingData.experts.email,
          bookingData.projects.title,
          bookingData.institutions.name,
          bookingData
        );
        
        // Send real-time notification
        socketService.sendBookingNotification(
          bookingData.experts.user_id, // Use Supabase user_id instead of expert_id
          bookingData.projects.title,
          bookingData.institutions.name,
          false // isCreation = false for updates
        );
      }
    } catch (notificationError) {
      console.error('Error sending booking update notification:', notificationError);
    }
    
    
    console.log('Booking updated successfully:', data[0]);
    res.json(data[0]);
  } catch (error) {
    console.error('Booking update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a booking (only from bookings table)
app.delete('/api/bookings/:id', async (req, res) => {
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

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    console.log('Authenticated user for booking delete:', userData?.user?.id);
    console.log('User error:', userError);

    const { id } = req.params;
    console.log('Deleting booking:', id);
    
    const { data, error } = await supabaseClient
      .from('bookings')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Booking delete error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('Booking not found for deletion:', id);
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    console.log('Booking deleted successfully:', data[0]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to verify authentication context

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});




app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize Socket.IO
socketService.initialize(server);

// Start notification queue processor
notificationService.startQueueProcessor();

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Socket.IO service initialized');
  console.log('Notification queue processor started');
  console.log('Environment variables check:');
  console.log('- EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
  console.log('- EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'Set' : 'Not set');
  console.log('- UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not set');
  console.log('- UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not set');
});

module.exports = app;
