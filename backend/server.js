const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const upload = require('./middleware/upload');
const ImageUploadService = require('./services/imageUploadService');

dotenv.config();

// Import services after environment variables are loaded
const notificationService = require('./services/notificationService');
const socketService = require('./services/socketService');

console.log('Environment variables loaded:');
console.log('UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not set');
console.log('UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not set');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
console.log('EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'Set' : 'Not set');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
   'https://calxmap.in'
  ].filter(Boolean),
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    // Run a very lightweight Supabase query
    const { error } = await supabase
      .from('experts')
      .select('id')   // only select id
      .limit(1);      // just 1 row
    
    if (error) {
      console.error('Health check failed:', error.message);
      return res.status(500).json({ status: 'ERROR', message: error.message });
    }

    res.json({ status: 'OK', message: 'API and Supabase are running' });
  } catch (err) {
    console.error('Health check exception:', err.message);
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

app.get('/api/health-static', (req, res) => {
  res.json({ status: 'OK' });
});

// Auth: Forgot password - send reset email
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const redirectTo = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
      is_verified = '',
      min_rating = '',
      sort_by = '',
      sort_order = 'desc'
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
      .range(offset, offset + parseInt(limit) - 1);
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,bio.ilike.%${search}%`);
    }
    
    if (domain_expertise) {
      const dom = Array.isArray(domain_expertise) ? domain_expertise : String(domain_expertise)
      // Support comma-separated list or single
      const values = Array.isArray(dom) ? dom : dom.split(',').map(s => s.trim()).filter(Boolean)
      if (values.length === 1) {
        query = query.contains('domain_expertise', [values[0]])
      } else if (values.length > 1) {
        // Use overlap operator for Postgrest: domain_expertise overlaps any of values
        query = query.overlaps('domain_expertise', values)
      }
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
    
    if (min_rating) {
      query = query.gte('rating', parseFloat(min_rating));
    }
    
    // Apply sorting
    if (sort_by) {
      query = query.order(sort_by, { ascending: (String(sort_order).toLowerCase() !== 'desc') });
    } else {
      query = query.order('created_at', { ascending: false });
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

app.post('/api/experts', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'qualifications', maxCount: 1 }
]), async (req, res) => {
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

    
    // Validate required fields
    if (!req.body.name || !req.body.phone || !req.files) {
      return res.status(400).json({ 
        error: 'Name, phone, and profile photo are required fields' 
      });
    }

    // Upload files to Cloudinary
    let photoData = null;
    let resumeData = null;
    let qualificationsData = null;

    // Handle profile photo upload
    if (req.files?.profile_photo?.[0]) {
      photoData = await ImageUploadService.uploadImage(
        req.files.profile_photo[0].buffer, 
        'expert-profiles'
      );
      
      if (!photoData.success) {
        return res.status(500).json({ 
          error: `Photo upload failed: ${photoData.error}` 
        });
      }
    }

    // Handle resume PDF upload
    if (req.files?.resume?.[0]) {
      resumeData = await ImageUploadService.uploadPDF(
        req.files.resume[0].buffer, 
        'expert-documents'
      );
      
      if (!resumeData.success) {
        return res.status(500).json({ 
          error: `Resume upload failed: ${resumeData.error}` 
        });
      }
    }

    // Handle qualifications PDF upload
    if (req.files?.qualifications?.[0]) {
      qualificationsData = await ImageUploadService.uploadPDF(
        req.files.qualifications[0].buffer, 
        'expert-documents'
      );
      
      if (!qualificationsData.success) {
        return res.status(500).json({ 
          error: `Qualifications upload failed: ${qualificationsData.error}` 
        });
      }
    }
    
    const expertData = {
      user_id: req.body.user_id,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      bio: req.body.bio,
      photo_url: photoData?.url || null,
      profile_photo_public_id: photoData?.publicId || null,
      profile_photo_thumbnail_url: photoData?.thumbnailUrl || null,
      profile_photo_small_url: photoData?.smallUrl || null,
      qualifications: req.body.qualifications || '', // Text summary
      qualifications_url: qualificationsData?.url || null,
      qualifications_public_id: qualificationsData?.publicId || null,
      domain_expertise: req.body.domain_expertise ? [req.body.domain_expertise] : [],
      subskills: req.body.subskills ? JSON.parse(req.body.subskills) : [],
      hourly_rate: req.body.hourly_rate,
      resume_url: resumeData?.url || null,
      resume_public_id: resumeData?.publicId || null,
      availability: req.body.availability || [],
      is_verified: true, // Auto-verify since email verification is required for login
      rating: req.body.rating || 0.00,
      total_ratings: req.body.total_projects || 0,
      experience_years: req.body.experience_years || 0,
      linkedin_url: req.body.linkedin_url || ''
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
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return res.status(404).json({ error: 'Expert not found' });
      }
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Expert not found' });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expert by user_id
app.get('/api/experts/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('experts')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return res.status(404).json({ error: 'Expert not found' });
      }
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Expert not found' });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/experts/:id', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'qualifications', maxCount: 1 }
]), async (req, res) => {
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

    // Get current expert data to check if files need updating
    const { data: currentExpert, error: fetchError } = await supabaseClient
      .from('experts')
      .select('photo_url, profile_photo_public_id, resume_public_id, qualifications_public_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    let updateData = { ...req.body, domain_expertise: [req.body.domain_expertise.trim()] };
    
    // Handle profile photo update if new photo is uploaded
    if (req.files?.profile_photo?.[0]) {
      // Delete old photo from Cloudinary if exists
      if (currentExpert?.profile_photo_public_id) {
        await ImageUploadService.deleteImage(currentExpert.profile_photo_public_id);
      }

      // Upload new photo
      const photoData = await ImageUploadService.uploadImage(
        req.files.profile_photo[0].buffer, 
        'expert-profiles'
      );
      
      if (!photoData.success) {
        return res.status(500).json({ 
          error: `Photo upload failed: ${photoData.error}` 
        });
      }

      // Update photo fields
      updateData.photo_url = photoData.url;
      updateData.profile_photo_public_id = photoData.publicId;
      updateData.profile_photo_thumbnail_url = photoData.thumbnailUrl;
      updateData.profile_photo_small_url = photoData.smallUrl;
    }

    // Handle resume PDF update if new resume is uploaded
    if (req.files?.resume?.[0]) {
      // Delete old resume from Cloudinary if exists
      if (currentExpert?.resume_public_id) {
        await ImageUploadService.deleteImage(currentExpert.resume_public_id);
      }

      // Upload new resume
      const resumeData = await ImageUploadService.uploadPDF(
        req.files.resume[0].buffer, 
        'expert-documents'
      );
      
      if (!resumeData.success) {
        return res.status(500).json({ 
          error: `Resume upload failed: ${resumeData.error}` 
        });
      }

      // Update resume fields
      updateData.resume_url = resumeData.url;
      updateData.resume_public_id = resumeData.publicId;
    }

    // Handle qualifications PDF update if new qualifications is uploaded
    if (req.files?.qualifications?.[0]) {
      // Delete old qualifications from Cloudinary if exists
      if (currentExpert?.qualifications_public_id) {
        await ImageUploadService.deleteImage(currentExpert.qualifications_public_id);
      }

      // Upload new qualifications
      const qualificationsData = await ImageUploadService.uploadPDF(
        req.files.qualifications[0].buffer, 
        'expert-documents'
      );
      
      if (!qualificationsData.success) {
        return res.status(500).json({ 
          error: `Qualifications upload failed: ${qualificationsData.error}` 
        });
      }

      // Update qualifications fields
      updateData.qualifications_url = qualificationsData.url;
      updateData.qualifications_public_id = qualificationsData.publicId;
    }
    
    const { data, error } = await supabaseClient
      .from('experts')
      .update(updateData)
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
      email: req.body.contact_email || req.body.email,
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
      total_ratings: req.body.total_projects || 0,
      phone: req.body.contact_phone,
      contact_person: req.body.contact_person,
      pincode: req.body.pincode || null,
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
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return res.status(404).json({ error: 'Institution not found' });
      }
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Institution not found' });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get institution by user_id
app.get('/api/institutions/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return res.status(404).json({ error: 'Institution not found' });
      }
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Institution not found' });
    }
    
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
      expert_id = '', // used for filtering out applied projects
      domain_expertise = '', // new parameter for similar projects
      required_expertise = '' // new parameter for similar projects
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
          logo_url,
          city,
          state
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
    
    // Similar projects filters
    if (domain_expertise) {
      query = query.eq('domain_expertise', domain_expertise);
    }
    if (required_expertise) {
      const skills = required_expertise.split(',').map(s => s.trim());
      query = query.overlaps('required_expertise', skills);
    }

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

    // If we have projects, fetch application counts for each project
    if (data && data.length > 0) {
      const projectIds = data.map(project => project.id);
      
      // Fetch application counts for all projects
      const { data: applicationCounts, error: countsError } = await supabase
        .from('applications')
        .select('project_id, status')
        .in('project_id', projectIds);

      if (countsError) {
        console.log('Error fetching application counts:', countsError);
      } else {
        // Calculate counts for each project
        const projectCounts = {};
        applicationCounts.forEach(app => {
          if (!projectCounts[app.project_id]) {
            projectCounts[app.project_id] = { total: 0, pending: 0 };
          }
          projectCounts[app.project_id].total++;
          if (app.status === 'pending') {
            projectCounts[app.project_id].pending++;
          }
        });

        // Attach counts to each project
        data.forEach(project => {
          project.applicationCounts = projectCounts[project.id] || { total: 0, pending: 0 };
        });
      }
    }

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
          logo_url,
          description,
          address,
          city,
          state
        )
      `)
      .eq('id', req.params.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
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

// Get recommended projects for an expert based on their skills
app.get('/api/projects/recommended/:expertId', async (req, res) => {
  try {
    console.log('GET /api/projects/recommended - Expert ID:', req.params.expertId);

    // Get expert profile
    const { data: expertData, error: expertError } = await supabase
      .from('experts')
      .select('*')
      .eq('id', req.params.expertId)
      .single();

    if (expertError) throw expertError;
    if (!expertData) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    // Get projects that the expert has already applied to
    const { data: appliedProjects, error: appliedError } = await supabase
      .from('applications')
      .select('project_id')
      .eq('expert_id', req.params.expertId);

    if (appliedError) throw appliedError;

    const appliedProjectIds = appliedProjects?.map(app => app.project_id) || [];

    // Get all open projects with institution data, excluding already applied projects
    let query = supabase
      .from('projects')
      .select(`
        *,
        institutions (
          id,
          name,
          logo_url,
          city,
          state
        )
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    // Exclude projects that the expert has already applied to
    if (appliedProjectIds.length > 0) {
      query = query.not('id', 'in', `(${appliedProjectIds.join(',')})`);
    }

    const { data: projectsData, error: projectsError } = await query;

    if (projectsError) throw projectsError;

    // Calculate match scores for each project
    const recommendations = projectsData.map(project => {
      const matchScore = calculateProjectMatchScore(expertData, project);
      return {
        ...project,
        matchScore: Math.round(matchScore)
      };
    })
    .filter(rec => rec.matchScore >= 60) // Only show projects with 60%+ match
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10); // Top 10 recommendations

    // Get application counts for recommended projects
    if (recommendations.length > 0) {
      const projectIds = recommendations.map(project => project.id);
      
      const { data: applicationCounts, error: countsError } = await supabase
        .from('applications')
        .select('project_id, status')
        .in('project_id', projectIds);

      if (!countsError && applicationCounts) {
        const projectCounts = {};
        applicationCounts.forEach(app => {
          if (!projectCounts[app.project_id]) {
            projectCounts[app.project_id] = { total: 0, pending: 0 };
          }
          projectCounts[app.project_id].total++;
          if (app.status === 'pending') {
            projectCounts[app.project_id].pending++;
          }
        });

        recommendations.forEach(project => {
          project.applicationCounts = projectCounts[project.id] || { total: 0, pending: 0 };
        });
      }
    }

    console.log(`Recommendations generated: ${recommendations.length} projects for expert ${req.params.expertId}`);
    res.json(recommendations);

  } catch (error) {
    console.error('GET /api/projects/recommended error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate project match score
function calculateProjectMatchScore(expert, project) {
  let score = 0;
  
  // Domain Match (40% weight)
  if (expert.domain_expertise && project.domain_expertise) {
    const expertDomains = Array.isArray(expert.domain_expertise) ? expert.domain_expertise : [expert.domain_expertise];
    if (expertDomains.includes(project.domain_expertise)) {
      score += 40;
    }
  }
  
  // Subskills Match (30% weight)
  if (expert.subskills && project.subskills && 
      Array.isArray(expert.subskills) && Array.isArray(project.subskills)) {
    const subskillMatches = expert.subskills.filter(skill => 
      project.subskills.includes(skill)
    ).length;
    if (project.subskills.length > 0) {
      score += (subskillMatches / project.subskills.length) * 30;
    }
  }
  
  // General Skills Match (20% weight)
  if (expert.required_expertise && project.required_expertise &&
      Array.isArray(expert.required_expertise) && Array.isArray(project.required_expertise)) {
    const skillMatches = expert.required_expertise.filter(skill => 
      project.required_expertise.includes(skill)
    ).length;
    if (project.required_expertise.length > 0) {
      score += (skillMatches / project.required_expertise.length) * 20;
    }
  }
  
  // Rate Compatibility (10% weight)
  if (expert.hourly_rate && project.hourly_rate) {
    // Expert rate should be within 20% of project rate (flexible matching)
    const rateDifference = Math.abs(expert.hourly_rate - project.hourly_rate) / project.hourly_rate;
    if (rateDifference <= 0.2) {
      score += 10;
    } else if (rateDifference <= 0.5) {
      score += 5; // Partial points for reasonable rate difference
    }
  }
  
  return Math.min(score, 100); // Cap at 100%
}

// Get recommended experts for a project based on project requirements
app.get('/api/experts/recommended/:projectId', async (req, res) => {
  try {
    console.log('GET /api/experts/recommended - Project ID:', req.params.projectId);

    // Get project details
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', req.params.projectId)
      .single();

    if (projectError) throw projectError;
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all verified experts
    const { data: expertsData, error: expertsError } = await supabase
      .from('experts')
      .select('*')
      .eq('is_verified', true)
      .order('rating', { ascending: false });

    if (expertsError) throw expertsError;

    // Calculate match scores for each expert
    const recommendations = expertsData.map(expert => {
      const matchScore = calculateExpertMatchScore(expert, projectData);
      return {
        ...expert,
        matchScore: Math.round(matchScore)
      };
    })
    .filter(rec => rec.matchScore >= 40) // Only show experts with 60%+ match
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10); // Top 10 recommendations

    console.log(`Expert recommendations generated: ${recommendations.length} experts for project ${req.params.projectId}`);
    res.json(recommendations);

  } catch (error) {
    console.error('GET /api/experts/recommended error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if experts have applied to a project
app.post('/api/applications/check-status', async (req, res) => {
  try {
    const { projectId, expertIds } = req.body;
    
    if (!projectId || !expertIds || !Array.isArray(expertIds)) {
      return res.status(400).json({ error: 'projectId and expertIds array are required' });
    }

    console.log('Checking application status for project:', projectId, 'experts:', expertIds);

    // Get application status for each expert
    const { data: applications, error } = await supabase
      .from('applications')
      .select('expert_id, status')
      .eq('project_id', projectId)
      .in('expert_id', expertIds);

    if (error) throw error;

    // Create a map of expert_id -> application status
    const applicationStatus = {};
    applications.forEach(app => {
     
      applicationStatus[app.expert_id] = app.status;
      
    });
     
    // Return status for each expert
    const result = expertIds.map(expertId => ({
      expertId,
      hasApplied: !!applicationStatus[expertId],
      applicationStatus: applicationStatus[expertId] || null
    }));

    console.log('Application status check result:', result);
    res.json(result);

  } catch (error) {
    console.error('Error checking application status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send expert selected with booking notification
app.post('/api/notifications/send-expert-selected', async (req, res) => {
  try {
    const { expertId, projectTitle, institutionName, projectId } = req.body;
    
    if (!expertId || !projectTitle || !institutionName || !projectId) {
      return res.status(400).json({ error: 'expertId, projectTitle, institutionName, and projectId are required' });
    }

    // Get expert details
    const { data: expertData, error: expertError } = await supabase
      .from('experts')
      .select('email, user_id')
      .eq('id', expertId)
      .single();

    if (expertError) throw expertError;
    if (!expertData) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    // Send email notification
    await notificationService.sendExpertSelectedWithBookingNotification(
      expertData.email,
      projectTitle,

      projectId
    );
    
    // Send real-time notification
    await socketService.sendExpertSelectedWithBookingNotification(
      expertData.user_id,
      projectTitle,
      institutionName,
      projectId
    );

    console.log(`Expert selected notification sent to expert ${expertId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('Error sending expert selected notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send expert interest shown notification
app.post('/api/notifications/send-expert-interest', async (req, res) => {
  try {
    const { expertId, projectTitle, institutionName, projectId } = req.body;

    
    if (!expertId || !projectTitle || !institutionName || !projectId) {
      return res.status(400).json({ error: 'expertId, projectTitle, institutionName, and projectId are required' });
    }

    // Get expert details
    const { data: expertData, error: expertError } = await supabase
      .from('experts')
      .select('email, user_id')
      .eq('id', expertId)
      .single();

    if (expertError) throw expertError;
    if (!expertData) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    // Send email notification
    await notificationService.sendExpertInterestShownNotification(
      expertData.email,
      projectTitle,
      institutionName,
      projectId
    );
    
    // Send real-time notification
    await socketService.sendExpertInterestShownNotification(
      expertData.user_id,
      projectTitle,
      institutionName,
      projectId
    );

    console.log(`Expert interest notification sent to expert ${expertId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('Error sending expert interest notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate expert match score for a project
function calculateExpertMatchScore(expert, project) {
  let score = 0;
  
  // Domain Match (40% weight)
  if (expert.domain_expertise && project.domain_expertise) {
    const expertDomains = Array.isArray(expert.domain_expertise) ? expert.domain_expertise : [expert.domain_expertise];
    if (expertDomains.includes(project.domain_expertise)) {
      score += 40;
    }
  }
  
  // Subskills Match (30% weight)
  if (expert.subskills && project.subskills && 
      Array.isArray(expert.subskills) && Array.isArray(project.subskills)) {
    const subskillMatches = expert.subskills.filter(skill => 
      project.subskills.includes(skill)
    ).length;
    if (project.subskills.length > 0) {
      score += (subskillMatches / project.subskills.length) * 30;
    }
  }
  
  // General Skills Match (20% weight)
  if (expert.required_expertise && project.required_expertise &&
      Array.isArray(expert.required_expertise) && Array.isArray(project.required_expertise)) {
    const skillMatches = expert.required_expertise.filter(skill => 
      project.required_expertise.includes(skill)
    ).length;
    if (project.required_expertise.length > 0) {
      score += (skillMatches / project.required_expertise.length) * 20;
    }
  }
  
  // Rate Compatibility (10% weight)
  if (expert.hourly_rate && project.hourly_rate) {
    // Expert rate should be within 20% of project rate (flexible matching)
    const rateDifference = Math.abs(expert.hourly_rate - project.hourly_rate) / project.hourly_rate;
    if (rateDifference <= 0.2) {
      score += 10;
    } else if (rateDifference <= 0.5) {
      score += 5; // Partial points for reasonable rate difference
    }
  }
  
  return Math.min(score, 100); // Cap at 100%
}

app.get('/api/applications', async (req, res) => {
  try {
    console.log('=== GET APPLICATIONS DEBUG ===');
    console.log('Query params:', req.query);
    
    // Default to 'pending' status to show only in-progress applications
    // This ensures dashboards only show applications that need attention
    const { expert_id, project_id, institution_id, page = 1, limit = 10,status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('Applications filtering:', { 
      expert_id, 
      project_id, 
      institution_id, 
      status: status || 'pending (default)',
      page, 
      limit 
    });
    
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
          email,
          phone,
          photo_url,
          profile_photo_thumbnail_url,
          profile_photo_small_url,
          bio,
          experience_years,
          qualifications,
          domain_expertise,
          subskills,
          hourly_rate,
          resume_url,
          availability,
          is_verified,
          kyc_status,
          rating,
          total_ratings,
          linkedin_url,
          created_at,
          updated_at
        ),
        projects (
          id,
          title,
          description,
          type,
          hourly_rate,
          total_budget,
          start_date,
          end_date,
          duration_hours,
          required_expertise,
          domain_expertise,
          subskills,
          status,
          max_applications
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
    
    // Filter by status - default to 'pending' (in progress) applications
    // Status values: 'pending', 'accepted', 'rejected'
    if (status) {
    
      query = query.eq('status', status);
      
      // Log the business logic behind the filtering
      if (status === 'pending') {
        console.log('Showing only in-progress applications (pending status)');
      } else if (status === 'accepted') {
        console.log('Showing only accepted applications');
      } else if (status === 'rejected') {
        console.log('Showing only rejected applications');
      }
    }
    
    const { data, error } = await query;
    console.log('Applications query result:', { 
      dataCount: data?.length || 0, 
      status: status,
      error 
    });
    
    if (error) throw error;

    // Get counts for all statuses for the same filters
    let countQuery = supabaseClient
      .from('applications')
      .select('status');
    
    if (expert_id) countQuery = countQuery.eq('expert_id', expert_id);
    if (project_id) countQuery = countQuery.eq('project_id', project_id);
    if (institution_id) countQuery = countQuery.eq('institution_id', institution_id);
    
    const { data: allApplications, error: countError } = await countQuery;
    
    if (countError) {
      console.log('Count query error:', countError);
      res.json(data);
    } else {
      // Calculate counts by status
      const counts = {
        total: allApplications?.length || 0,
        pending: allApplications?.filter(a => a.status === 'pending').length || 0,
        interview: allApplications?.filter(a => a.status === 'interview').length || 0,
        accepted: allApplications?.filter(a => a.status === 'accepted').length || 0,
        rejected: allApplications?.filter(a => a.status === 'rejected').length || 0
      };
      
      res.json({
        data: data,
        counts: counts
      });
    }
  } catch (error) {
    console.log('GET applications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint just for getting application counts (for stats display)
app.get('/api/applications/counts', async (req, res) => {
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
    if (userError) throw userError;

    const { expert_id, project_id, institution_id, status } = req.query;
    
    let query = supabaseClient
      .from('applications')
      .select('status');
    
    if (expert_id) query = query.eq('expert_id', expert_id);
    if (project_id) query = query.eq('project_id', project_id);
    if (institution_id) query = query.eq('institution_id', institution_id);
    // Only filter by status if specifically requested
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Calculate counts by status
    const applicationCounts = {
      total: data?.length || 0,
      pending: data?.filter(a => a.status === 'pending').length || 0,
      interview: data?.filter(a => a.status === 'interview').length || 0,
      accepted: data?.filter(a => a.status === 'accepted').length || 0,
      rejected: data?.filter(a => a.status === 'rejected').length || 0
    };
    
    console.log('Application counts fetched:', applicationCounts);
    res.json(applicationCounts);
  } catch (error) {
    console.error('Application counts fetch error:', error);
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

    // Handle interview_date field if provided
    const updateData = { ...req.body };
    if (updateData.interview_date) {
      // Convert to proper timestamp format
      updateData.interview_date = new Date(updateData.interview_date).toISOString();
    }
    
    const { data, error } = await supabaseClient
      .from('applications')
      .update(updateData)
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    
    // Send notification to expert about application status change
    try {
      if (req.body.status === 'interview') {
        const serviceClient = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        // Get application details for notification
        const { data: applicationData } = await supabaseClient
        .from('applications')
        .select(`
          project_id,
          expert_id,
          status,
          projects (
            title,
            institution_id,
            institutions(name)
          ),
          experts(name, email, user_id)
        `)
        .eq('id', req.params.id)
        .single();

          console.log('applicationData', applicationData)
        
        if (applicationData) {
          const status = req.body.status;
         
          if (status === 'interview') {
            // Email for interview stage
            await notificationService.sendMovedToInterviewNotification(
              applicationData.experts.email,
              applicationData.projects.title,
              applicationData.project_id
            );
            // Realtime for interview stage
            socketService.sendApplicationStatusNotification(
              applicationData.experts.user_id,
              applicationData.projects.title,
              'interview',
              applicationData.project_id
            );
          } else if (status === 'accepted') {
            // Email + realtime for accepted (pre-booking)
            await notificationService.sendApplicationStatusNotification(
              applicationData.experts.email,
              applicationData.projects.title,
              applicationData.projects.institutions.name,
              'accepted'
            );
            socketService.sendApplicationStatusNotification(
              applicationData.experts.user_id,
              applicationData.projects.title,
              'accepted',
              applicationData.project_id
            );
          } else if (status === 'rejected') {
            // Do not notify per requirement
          }
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
          bookingData,
          true
        );
        
        // Send real-time notification
        socketService.sendBookingNotification(
          bookingData.experts.user_id, // Use Supabase user_id instead of expert_id
          bookingData.projects.title,
          bookingData.institutions.name,
         
          bookingData.project_id,
          true
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

    const { expert_id, institution_id, project_id, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabaseClient
      .from('bookings')
      .select(`
        *,
        experts (
          id,
          name,
          email,
          phone,
          photo_url,
          profile_photo_thumbnail_url,
          profile_photo_small_url,
          bio,
          experience_years,
          qualifications,
          domain_expertise,
          subskills,
          hourly_rate,
          resume_url,
          availability,
          is_verified,
          kyc_status,
          rating,
          total_ratings,
          linkedin_url,
          created_at,
          updated_at
        ),
        institutions (
          id,
          name,
          logo_url
        ),
        projects (
          id,
          title,
          description,
          type,
          hourly_rate,
          total_budget,
          start_date,
          end_date,
          duration_hours,
          required_expertise,
          domain_expertise,
          subskills,
          status,
          max_applications
        )
      `)
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });
    
    if (expert_id) query = query.eq('expert_id', expert_id);
    if (institution_id) query = query.eq('institution_id', institution_id);
    if (project_id) query = query.eq('project_id', project_id);
    
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
    
    // Get counts for all bookings for the same filters
    let countQuery = supabaseClient
      .from('bookings')
      .select('status');
    
    if (expert_id) countQuery = countQuery.eq('expert_id', expert_id);
    if (institution_id) countQuery = countQuery.eq('institution_id', institution_id);
    if (project_id) countQuery = countQuery.eq('project_id', project_id);
    
    const { data: allBookings, error: countError } = await countQuery;
    
    if (countError) {
      console.log('Booking count query error:', countError);
      res.json(data);
    } else {
      // Calculate counts by status
      const counts = {
        total: allBookings?.length || 0,
        in_progress: allBookings?.filter(b => b.status === 'in_progress').length || 0,
        completed: allBookings?.filter(b => b.status === 'completed').length || 0,
        cancelled: allBookings?.filter(b => b.status === 'cancelled').length || 0,
        pending: allBookings?.filter(b => b.status === 'pending').length || 0
      };
      
      res.json({
        data: data,
        counts: counts
      });
    }
  } catch (error) {
    console.error('Booking fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint just for getting booking counts (for stats display)
app.get('/api/bookings/counts', async (req, res) => {
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
    if (userError) throw userError;

    const { expert_id, institution_id, project_id } = req.query;
    
    let query = supabaseClient
      .from('bookings')
      .select('status');
    
    if (expert_id) query = query.eq('expert_id', expert_id);
    if (institution_id) query = query.eq('institution_id', institution_id);
    if (project_id) query = query.eq('project_id', project_id);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Calculate counts by status
    const bookingCounts = {
      total: data?.length || 0,
      in_progress: data?.filter(b => b.status === 'in_progress').length || 0,
      completed: data?.filter(b => b.status === 'completed').length || 0,
      cancelled: data?.filter(b => b.status === 'cancelled').length || 0,
      pending: data?.filter(b => b.status === 'pending').length || 0
    };
    
    console.log('Booking counts fetched:', bookingCounts);
    res.json(bookingCounts);
  } catch (error) {
    console.error('Booking counts fetch error:', error);
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
        console.error('Rating creation error:', error);
        throw error;
      }
     
      // After creating the rating with service role, update the expert's aggregate rating
      try {
        const expertId = req.body.expert_id;
        console.log('Expert ID:', expertId);
        if (expertId) {
          console.log('Updating expert rating for expert_id:', expertId);
          
          // Calculate aggregate rating for this expert
          const { data: ratingsData, error: ratingsError } = await supabaseClient
            .from('ratings')
            .select('rating')
            .eq('expert_id', expertId);
          
          if (ratingsError) {
            console.error('Error fetching ratings for aggregate calculation:', ratingsError);
          } else {
            // Calculate average rating
            const totalRatings = ratingsData.length;
            const sumRatings = ratingsData.reduce((sum, item) => sum + (item.rating || 0), 0);
            console.log('sumRatings', sumRatings)
            console.log('totalRatings', totalRatings)
            const averageRating = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : 0;
            console.log('averageRating', averageRating)
            console.log(`Expert ${expertId} - Total ratings: ${totalRatings}, Sum: ${sumRatings}, Average: ${averageRating}`);
            
            // Update the expert's rating column
            const { error: updateError } = await supabaseClient
              .from('experts')
              .update({ 
                rating: parseFloat(averageRating),
                total_ratings: totalRatings
              })
              .eq('id', expertId);
            
            if (updateError) {
              console.error('Error updating expert rating:', updateError);
            } else {
              console.log(`Successfully updated expert ${expertId} rating to ${averageRating}`);
            }
          }
        }
      } catch (updateError) {
        console.error('Error in expert rating update process:', updateError);
        // Don't fail the rating creation if the update fails
      }
      
      res.status(201).json(data[0]);
      return;
    
   
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
      
        console.log('bookingData', bookingData)
      if (bookingData) {
        // Send email notification
        await notificationService.sendBookingNotification(
          bookingData.experts.email,
          bookingData.projects.title,
          bookingData.institutions.name,
          bookingData,
          false
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

// ========================================
// STUDENT FEEDBACK SYSTEM ROUTES
// ========================================
// Import student feedback service
const studentFeedbackService = require('./services/studentFeedbackService');

// Student login route
app.post('/api/student/login', async (req, res) => {
  try {
    console.log('Student login request received:', req.body);
    
    const { universityName, rollNumber, studentName, email, batch, mobile } = req.body;
 
    // Strict 10-digit numeric mobile validation
    const mobileValid = typeof mobile === 'string' && /^\d{10}$/.test(mobile);

    if (!universityName || !rollNumber || !studentName || !batch || !mobileValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input. University, roll number, student name, batch, and a valid 10-digit mobile are required.' 
      });
    }

    const result = await studentFeedbackService.studentLogin(universityName, rollNumber, studentName, email, batch, mobile);
    console.log('Student login result:', result);
    
    if (result.success) {
      // Return student data directly (frontend will handle session management)
      res.json({
        success: true,
        student: result.student,
        university: result.university
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get available feedback sessions
app.get('/api/student/sessions', async (req, res) => {
  try {
    const result = await studentFeedbackService.getFeedbackSessions();
    res.json(result);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get student's feedback status
app.get('/api/student/feedback-status', async (req, res) => {
  try {
    const { studentId } = req.query;
    
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID is required' });
    }

    const result = await studentFeedbackService.getStudentFeedbackStatus(studentId);
    res.json(result);
  } catch (error) {
    console.error('Get feedback status error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Submit feedback
app.post('/api/student/feedback', async (req, res) => {
  try {
    const { studentId, sessionId, rating, pros, cons, additionalComments } = req.body;
    
    if (!studentId || !sessionId || !rating) {
      return res.status(400).json({ 
        success: false, 
        error: 'Student ID, session ID, and rating are required' 
      });
    }

    const result = await studentFeedbackService.submitFeedback(
      studentId, 
      sessionId, 
      rating, 
      pros, 
      cons, 
      additionalComments
    );
    
    res.json(result);
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Public: Get student feedback highlights (GOOD and VERY_GOOD only). Optional expertName filter.
app.get('/api/student/feedback/by-expert', async (req, res) => {
  try {
    const { expertName, limit = 50 } = req.query;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, error: 'Service role key not configured' });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Build select clause dynamically to avoid inner join when not filtering by expertName
    let selectClause = `pros,rating,students:students(student_name)`;
    const hasExpertName = typeof expertName === 'string' && expertName.trim() !== '';
    if (hasExpertName) {
      selectClause += `,feedback_sessions!inner(expert_name)`;
    }

    let query = serviceClient
      .from('student_feedback')
      .select(selectClause)
      .in('rating', ['VERY_GOOD', 'GOOD'])
      .limit(parseInt(limit));

    if (hasExpertName) {
      query = query.eq('feedback_sessions.expert_name', expertName);
    }

    const { data, error } = await query;

    if (error) throw error;

    const mapped = Array.isArray(data) ? data.map((row) => ({
      student_name: row?.students?.student_name || 'Student',
      pros: row?.pros || '',
      rating: row?.rating || 'GOOD'
    })).filter(item => item.pros && item.pros.trim() !== '') : [];

    res.json({ success: true, feedback: mapped });
  } catch (error) {
    console.error('Get feedback by expert error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analytics dashboard (only for authorized user)
app.get('/api/admin/feedback-analytics', async (req, res) => {
  try {
    // Check if user is authorized (hardcoded email check)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization required' });
    }

    const token = authHeader.substring(7);
    
    // Verify the token contains the authorized email
    if (!token.includes('debnathsinhababu2017@gmail.com')) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await studentFeedbackService.getAnalytics(page, limit);
    res.json(result);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ========================================
// END STUDENT FEEDBACK SYSTEM ROUTES
// ========================================

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
