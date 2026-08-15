/**
 * Expert HTTP handlers extracted from server.js (behavior-preserving).
 * Prefer calling via experts.controller / experts.routes.
 */
const { createClient } = require('@supabase/supabase-js');
const ImageUploadService = require('../../../services/imageUploadService');
const FinanceDashboardService = require('../../../services/financeDashboardService');
const expertAccess = require('../../../auth/expertAccess');
const superAdminAuth = require('../../../auth/superAdminAuth');
const privacyMask = require('../../../privacyMask');
const { normalizePan, isValidPan } = require('../../shared/pan');
const { parseBooleanBody } = require('../../shared/parseBooleanBody');

const financeDashboardService = new FinanceDashboardService();
const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

async function financeSummary(req, res) {
  try {
    const expertId = String(req.query.expert_id || '').trim();
    if (!expertId) return res.status(400).json({ error: 'expert_id is required' });
    await expertAccess.resolveExpertAccess(req, expertId);
    res.json(await financeDashboardService.getExpertSummary(expertId));
  } catch (err) {
    const statusCode = err?.statusCode || 500;
    res.status(statusCode).json({ error: err.message || 'Failed to load expert finance summary' });
  }
}

async function list(req, res) {
  console.log('GET /api/experts - Query params:', req.query);
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      subskill_search = '',
      domain_expertise = '', 
      min_hourly_rate = '', 
      max_hourly_rate = '',
      state = '',
      is_verified = '',
      min_rating = '',
      sort_by = '',
      sort_order = 'desc',
      expert_type = '',
      expert_service = ''
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { role: listRole, token: listToken } = await superAdminAuth.getUserRoleFromRequest(req);
    let supabaseClient = supabase;
    if (listRole === 'super_admin') {
      supabaseClient = superAdminAuth.getServiceClient();
    } else if (listToken) {
      supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${listToken}`
            }
          }
        }
      );
    }
    
    // If subskill_search is used, we need to fetch more data first, filter, then paginate
    // Fetch a larger batch (1000) when searching by subskills to ensure we can filter properly
    let query = supabaseClient
      .from('experts')
      .select('*');
    
    if (subskill_search) {
      // Fetch up to 1000 experts for filtering (then paginate after filtering)
      query = query.range(0, 999);
    } else {
      // Normal pagination when not searching by subskills
      query = query.range(offset, offset + parseInt(limit) - 1);
    }
    
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

    if (expert_type) {
      const types = String(expert_type).split(',').map((s) => s.trim()).filter(Boolean);
      if (types.length === 1) {
        query = query.contains('expert_types', [types[0]]);
      } else if (types.length > 1) {
        query = query.overlaps('expert_types', types);
      }
    }

    if (expert_service) {
      const services = String(expert_service).split(',').map((s) => s.trim()).filter(Boolean);
      if (services.length === 1) {
        query = query.contains('expert_services', [services[0]]);
      } else if (services.length > 1) {
        query = query.overlaps('expert_services', services);
      }
    }
    
    if (min_hourly_rate) {
      query = query.gte('hourly_rate', parseFloat(min_hourly_rate));
    }
    
    if (max_hourly_rate) {
      query = query.lte('hourly_rate', parseFloat(max_hourly_rate));
    }
    
    if (state) {
      query = query.eq('state', state);
    }
    
    if (is_verified) {
      query = query.eq('is_verified', is_verified === 'true');
    }

    if (req.query.interested !== undefined) {
      query = query.eq('interested_in_services', String(req.query.interested) === 'true');
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
    
    // Filter by subskill_search: matches subskills OR current_designation (case-insensitive partial match)
    let filteredData = data || [];
    if (subskill_search) {
      const searchLower = String(subskill_search).toLowerCase().trim();
      filteredData = filteredData.filter(expert => {
        // Match subskills
        const subskillMatch = expert.subskills && Array.isArray(expert.subskills) &&
          expert.subskills.some(skill => String(skill).toLowerCase().includes(searchLower));
        // Match current_designation (current role)
        const designationMatch = expert.current_designation &&
          String(expert.current_designation).toLowerCase().includes(searchLower);
        return subskillMatch || designationMatch;
      });
      
      // Apply pagination after filtering
      const startIndex = offset;
      const endIndex = offset + parseInt(limit);
      filteredData = filteredData.slice(startIndex, endIndex);
    }

    const expertIdsForCounts = filteredData.map((expert) => expert.id).filter(Boolean);
    const completedTrainingsByExpertId = new Map();
    if (expertIdsForCounts.length > 0) {
      try {
        const serviceClient = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const { data: bookingRows, error: bookingsError } = await serviceClient
          .from('bookings')
          .select('expert_id, status')
          .in('expert_id', expertIdsForCounts);
        if (!bookingsError) {
          for (const booking of bookingRows || []) {
            if (booking.status !== 'completed' || !booking.expert_id) continue;
            completedTrainingsByExpertId.set(
              booking.expert_id,
              (completedTrainingsByExpertId.get(booking.expert_id) || 0) + 1
            );
          }
        }
      } catch (countError) {
        console.warn('GET /api/experts: completed training counts skipped', countError.message);
      }
    }

    filteredData = filteredData.map((expert) => ({
      ...expert,
      completed_trainings_count: completedTrainingsByExpertId.get(expert.id) || 0,
      training_count: completedTrainingsByExpertId.get(expert.id) || 0,
    }));
    
    const { role: expertsListRole } = await superAdminAuth.getUserRoleFromRequest(req);
    const masked = (filteredData || []).map((row) =>
      privacyMask.maskExpertObject(row, expertsListRole)
    );
    res.json(masked);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// CalxBook backend sync endpoint (server-to-server)
// Returns full expert rows with compatibility aliases used by CalxBook.

async function listCalxbook(req, res) {
  try {
    // Optional server-to-server token guard.
    const expectedToken = process.env.CALXBOOK_SYNC_TOKEN;
    if (expectedToken) {
      const incomingToken = req.headers['x-calxbook-sync-token'];
      if (!incomingToken || incomingToken !== expectedToken) {
        return res.status(401).json({ error: 'Unauthorized sync request' });
      }
    }

    // Use service role to bypass RLS for backend sync.
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const {
      only_calxbook_verified = 'true',
      service_type = '',
      limit = '1000'
    } = req.query;

    let query = serviceClient
      .from('experts')
      .select('*')
      .eq('is_verified', true)
      .limit(Math.min(parseInt(String(limit), 10) || 1000, 5000));

    if (String(only_calxbook_verified).toLowerCase() === 'true') {
      query = query.eq('calxbook_verified', true);
    }

    const normalizedServiceType = String(service_type || '').trim().toLowerCase();
    if (normalizedServiceType) {
      // `contains` with single-item array works for text[] columns.
      query = query.contains('expert_services', [normalizedServiceType]);
    }

    const { data, error } = await query;
    if (error) throw error;

    const expertRows = data || [];
    const expertIds = expertRows.map((row) => row.id).filter(Boolean);

    const completedTrainingsByExpertId = new Map();
    if (expertIds.length > 0) {
      const { data: bookingRows, error: bookingsError } = await serviceClient
        .from('bookings')
        .select('expert_id, status')
        .in('expert_id', expertIds);
      if (bookingsError) {
        console.warn('GET /api/calxbook/experts: booking counts skipped', bookingsError.message);
      } else {
        for (const booking of bookingRows || []) {
          if (booking.status !== 'completed' || !booking.expert_id) continue;
          const expertId = booking.expert_id;
          completedTrainingsByExpertId.set(
            expertId,
            (completedTrainingsByExpertId.get(expertId) || 0) + 1
          );
        }
      }
    }

    const experts = expertRows.map((expert) => ({
      ...expert,
      // Compatibility aliases for CalxBook sync client.
      full_name: expert.name || expert.full_name || 'Unknown Expert',
      title: expert.current_designation || expert.title || null,
      expert_types: Array.isArray(expert.expert_types) ? expert.expert_types : [],
      expert_services: Array.isArray(expert.expert_services) ? expert.expert_services : [],
      domain_expertise: Array.isArray(expert.domain_expertise) ? expert.domain_expertise : [],
      subskills: Array.isArray(expert.subskills) ? expert.subskills : [],
      calxbook_verified: Boolean(expert.calxbook_verified),
      completed_trainings_count: completedTrainingsByExpertId.get(expert.id) || 0,
      training_count: completedTrainingsByExpertId.get(expert.id) || 0
    }));

    return res.json({
      success: true,
      count: experts.length,
      data: experts
    });
  } catch (error) {
    console.error('GET /api/calxbook/experts error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch experts for CalxBook sync'
    });
  }
}

async function create(req, res) {
  try {
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;

    const panNormalized = normalizePan(req.body.pan_number);
    if (panNormalized && !isValidPan(panNormalized)) {
      return res.status(400).json({
        error: 'Invalid PAN format. Use 10 characters: five letters, four digits, one letter (e.g. ABCDE1234F).'
      });
    }

    
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
    let profileVideoData = null;
    let cancelledChequeData = null;

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

    if (req.files?.profile_video?.[0]) {
      profileVideoData = await ImageUploadService.uploadVideo(
        req.files.profile_video[0].buffer,
        'expert-profile-videos',
        null,
        req.files.profile_video[0].mimetype
      );
      if (!profileVideoData.success) {
        return res.status(500).json({
          error: `Profile video upload failed: ${profileVideoData.error}`
        });
      }
    }

    if (req.files?.cancelled_cheque?.[0]) {
      const chequeFile = req.files.cancelled_cheque[0];
      cancelledChequeData = await ImageUploadService.uploadDocument(
        chequeFile.buffer,
        'expert-bank-documents',
        null,
        chequeFile.mimetype,
        chequeFile.originalname
      );

      if (!cancelledChequeData.success) {
        return res.status(500).json({
          error: `Cancelled cheque upload failed: ${cancelledChequeData.error}`
        });
      }
    }

    // Course video (short sample to show course quality)
    let courseVideoData = null;
    if (req.files?.course_video?.[0]) {
      courseVideoData = await ImageUploadService.uploadVideo(
        req.files.course_video[0].buffer,
        'expert-course-videos',
        null,
        req.files.course_video[0].mimetype
      );
      if (!courseVideoData.success) {
        return res.status(500).json({
          error: `Course video upload failed: ${courseVideoData.error}`
        });
      }
    }
    
    // Check if domain is custom (not in predefined list)
    const domainName = req.body.domain_expertise;
    const STANDARD_DOMAINS = [
      "Computer Science & IT", "Engineering", "Business & Management", 
      "Finance & Economics", "Healthcare & Medicine", "Education & Training",
      "Research & Development", "Marketing & Sales", "Data Science & Analytics",
      "Design & Creative", "Law & Legal", "Other"
    ];
    const isCustomDomain = domainName && !STANDARD_DOMAINS.includes(domainName);
    
    // Use service role client for custom domain operations
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // If custom domain, save it to custom_domains table
    if (isCustomDomain && domainName) {
      const subskillsArray = Array.isArray(req.body.subskills) 
        ? req.body.subskills 
        : (req.body.subskills ? JSON.parse(req.body.subskills) : []);
      
      // Check if custom domain already exists
      const { data: existingDomain } = await serviceClient
        .from('custom_domains')
        .select('*')
        .eq('name', domainName)
        .single();
      
      if (!existingDomain) {
        // Insert new custom domain
        await serviceClient
          .from('custom_domains')
          .insert([{
            name: domainName,
            subskills: subskillsArray
          }]);
      } else {
        // Update existing custom domain with new subskills (merge unique)
        const existingSubskills = existingDomain.subskills || [];
        const mergedSubskills = [...new Set([...existingSubskills, ...subskillsArray])];
        
        await serviceClient
          .from('custom_domains')
          .update({ 
            subskills: mergedSubskills,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDomain.id);
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
      subskills: Array.isArray(req.body.subskills) ? req.body.subskills : (req.body.subskills ? JSON.parse(req.body.subskills) : []),
      hourly_rate: req.body.hourly_rate,
      resume_url: resumeData?.url || null,
      resume_public_id: resumeData?.publicId || null,
      availability: req.body.availability || [],
      is_verified: true, // Auto-verify since email verification is required for login
      rating: req.body.rating || 0.00,
      total_ratings: req.body.total_projects || 0,
      experience_years: req.body.experience_years || 0,
      linkedin_url: req.body.linkedin_url || '',
      last_working_company: req.body.last_working_company || null,
      current_designation: req.body.current_designation || null,
      expert_types: Array.isArray(req.body.expert_types) ? req.body.expert_types : (req.body.expert_types ? JSON.parse(req.body.expert_types) : []),
      expert_services: Array.isArray(req.body.expert_services) ? req.body.expert_services : (req.body.expert_services ? JSON.parse(req.body.expert_services) : []),
      available_on_demand: parseBooleanBody(req.body.available_on_demand),
      open_to_work: parseBooleanBody(req.body.open_to_work),
      city: req.body.city || null,
      state: req.body.state || null,
      pan_number: panNormalized && isValidPan(panNormalized) ? panNormalized : null,
      address: req.body.address != null && String(req.body.address).trim() !== '' ? String(req.body.address).trim() : null,
      bank_account_number: req.body.bank_account_number != null && String(req.body.bank_account_number).trim() !== '' ? String(req.body.bank_account_number).trim() : null,
      bank_name: req.body.bank_name != null && String(req.body.bank_name).trim() !== '' ? String(req.body.bank_name).trim() : null,
      ifsc_code: req.body.ifsc_code != null && String(req.body.ifsc_code).trim() !== '' ? String(req.body.ifsc_code).trim().toUpperCase() : null,
      cancelled_cheque_url: cancelledChequeData?.url || null,
      cancelled_cheque_public_id: cancelledChequeData?.publicId || null,
      profile_video_url: profileVideoData?.url || null,
      profile_video_public_id: profileVideoData?.publicId || null,
      interested_in_services: req.body.interested_in_services === 'true' || req.body.interested_in_services === true,
      course_video_url: courseVideoData?.url || null,
      course_video_public_id: courseVideoData?.publicId || null,
      service_price: req.body.service_price ? parseFloat(String(req.body.service_price)) : null
      ,
      calxbook_verified: false
    };
    
    const { data: existingByEmail } = await supabaseClient
      .from('experts')
      .select('id')
      .eq('email', expertData.email)
      .limit(1);

    if (existingByEmail && existingByEmail.length > 0) {
      return res.status(409).json({ error: 'An expert with this email already exists. Use the profile edit flow to update the profile.' });
    }

    const { data, error } = await supabaseClient
      .from('experts')
      .insert([expertData])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { role: exRole, token: exToken, user: exUser } = await superAdminAuth.getUserRoleFromRequest(req);
    let client = supabase;
    if (exRole === 'super_admin') {
      client = superAdminAuth.getServiceClient();
    } else if (exToken) {
      client = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${exToken}` } } },
      );
    }
    const { data, error } = await client
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

    let enriched = data;
    try {
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data: bookingRows } = await serviceClient
        .from('bookings')
        .select('id, status')
        .eq('expert_id', data.id);
      const completedCount = (bookingRows || []).filter((b) => b.status === 'completed').length;
      enriched = {
        ...data,
        completed_trainings_count: completedCount,
        training_count: completedCount,
      };
    } catch (countError) {
      console.warn('GET /api/experts/:id: completed training count skipped', countError.message);
    }

    let out = enriched;
    if (privacyMask.shouldMaskExpertName(exRole)) {
      const isOwnExpertProfile =
        exRole === 'expert' && exUser && enriched.user_id === exUser.id;
      if (!isOwnExpertProfile) {
        out = privacyMask.maskExpertObject(enriched, exRole);
      }
    }

    res.json(out);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getByUserId(req, res) {
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
}

async function update(req, res) {
  try {
    console.log('PUT /api/experts/:id - Request body:', req.body);
    console.log('PUT /api/experts/:id - Expert ID:', req.params.id);

     // Validate required fields
     if (!req.body.name || !req.body.phone || !req.files) {
      return res.status(400).json({ 
        error: 'Name, phone, and profile photo are required fields' 
      });
    }

    const panNormalized = normalizePan(req.body.pan_number);
    if (panNormalized && !isValidPan(panNormalized)) {
      return res.status(400).json({
        error: 'Invalid PAN format. Use 10 characters: five letters, four digits, one letter (e.g. ABCDE1234F).'
      });
    }
    
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    let isSuperAdmin = false;
    
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
      const { data: userData } = await supabaseClient.auth.getUser();
      const role = userData?.user?.user_metadata?.role;
      if (role === 'super_admin') {
        const access = await expertAccess.resolveExpertAccess(req, req.params.id);
        if (!access) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
        isSuperAdmin = true;
        supabaseClient = expertAccess.getWriteClientForExpert(access);
      }
    } else {
      console.log('PUT /api/experts/:id - No auth token, using basic client');
    }

    // Get current expert data to check if files need updating
    const { data: currentExpert, error: fetchError } = await supabaseClient
      .from('experts')
      .select('photo_url, profile_photo_public_id, resume_public_id, qualifications_public_id, profile_video_public_id, cancelled_cheque_public_id, pan_number')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    // Check if domain is custom (not in predefined list)
    const domainName = req.body.domain_expertise ? req.body.domain_expertise.trim() : null;
    const STANDARD_DOMAINS = [
      "Computer Science & IT", "Engineering", "Business & Management", 
      "Finance & Economics", "Healthcare & Medicine", "Education & Training",
      "Research & Development", "Marketing & Sales", "Data Science & Analytics",
      "Design & Creative", "Law & Legal", "Other"
    ];
    const isCustomDomain = domainName && !STANDARD_DOMAINS.includes(domainName);
    
    // Use service role client for custom domain operations
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // If custom domain, save it to custom_domains table
    if (isCustomDomain && domainName) {
      const subskillsArray = Array.isArray(req.body.subskills) 
        ? req.body.subskills 
        : (req.body.subskills ? JSON.parse(req.body.subskills) : []);
      
      // Check if custom domain already exists
      const { data: existingDomain } = await serviceClient
        .from('custom_domains')
        .select('*')
        .eq('name', domainName)
        .single();
      
      if (!existingDomain) {
        // Insert new custom domain
        await serviceClient
          .from('custom_domains')
          .insert([{
            name: domainName,
            subskills: subskillsArray
          }]);
      } else {
        // Update existing custom domain with new subskills (merge unique)
        const existingSubskills = existingDomain.subskills || [];
        const mergedSubskills = [...new Set([...existingSubskills, ...subskillsArray])];
        
        await serviceClient
          .from('custom_domains')
          .update({ 
            subskills: mergedSubskills,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDomain.id);
      }
    }

    let updateData = { 
      ...req.body, 
      domain_expertise: req.body.domain_expertise ? [req.body.domain_expertise.trim()] : [],
      subskills: Array.isArray(req.body.subskills) ? req.body.subskills : (req.body.subskills ? JSON.parse(req.body.subskills) : []),
      last_working_company: req.body.last_working_company || null,
      current_designation: req.body.current_designation || null,
      expert_types: Array.isArray(req.body.expert_types) ? req.body.expert_types : (req.body.expert_types ? JSON.parse(req.body.expert_types) : []),
      expert_services: Array.isArray(req.body.expert_services) ? req.body.expert_services : (req.body.expert_services ? JSON.parse(req.body.expert_services) : []),
      available_on_demand: parseBooleanBody(req.body.available_on_demand),
      open_to_work: parseBooleanBody(req.body.open_to_work),
      interested_in_services: req.body.interested_in_services === 'true' || req.body.interested_in_services === true,
      service_price: req.body.service_price !== undefined && req.body.service_price !== '' ? parseFloat(String(req.body.service_price)) : undefined,
      city: req.body.city || null,
      state: req.body.state || null,
      bank_account_number:
        req.body.bank_account_number !== undefined
          ? (String(req.body.bank_account_number).trim() === '' ? null : String(req.body.bank_account_number).trim())
          : undefined,
      bank_name:
        req.body.bank_name !== undefined
          ? (String(req.body.bank_name).trim() === '' ? null : String(req.body.bank_name).trim())
          : undefined,
      ifsc_code:
        req.body.ifsc_code !== undefined
          ? (String(req.body.ifsc_code).trim() === '' ? null : String(req.body.ifsc_code).trim().toUpperCase())
          : undefined,
      address:
        req.body.address !== undefined
          ? (String(req.body.address).trim() === '' ? null : String(req.body.address).trim())
          : undefined
    };

    delete updateData.profile_video;
    delete updateData.cancelled_cheque;
    delete updateData.pan_number;

    // Handle explicit removal flags for videos (sent from form as 'true')
    const removeProfileVideoFlag = req.body.remove_profile_video === 'true' || req.body.remove_profile_video === true
    const removeCourseVideoFlag = req.body.remove_course_video === 'true' || req.body.remove_course_video === true

    if (removeProfileVideoFlag) {
      if (currentExpert?.profile_video_public_id) {
        await ImageUploadService.deleteVideo(currentExpert.profile_video_public_id);
      }
      updateData.profile_video_url = null
      updateData.profile_video_public_id = null
    }

    // Only allow super admin to change verification status
    if (!isSuperAdmin && updateData.hasOwnProperty('is_verified')) {
      delete updateData.is_verified;
    }
    // Only allow super admin to change Calxbook visibility flag
    if (!isSuperAdmin && updateData.hasOwnProperty('calxbook_verified')) {
      delete updateData.calxbook_verified;
    }

    // PAN optional: empty string clears; omitted keeps existing; non-empty must be valid
    const panInBody = req.body.pan_number;
    let effectivePan =
      panInBody === undefined
        ? normalizePan(currentExpert.pan_number)
        : normalizePan(panInBody);
    if (effectivePan && !isValidPan(effectivePan)) {
      return res.status(400).json({
        error:
          'Invalid PAN format. Use 10 characters: five letters, four digits, one letter (e.g. ABCDE1234F).'
      });
    }
    updateData.pan_number = effectivePan && isValidPan(effectivePan) ? effectivePan : null;

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

    if (req.files?.profile_video?.[0]) {
      if (currentExpert?.profile_video_public_id) {
        await ImageUploadService.deleteVideo(currentExpert.profile_video_public_id);
      }

      const videoData = await ImageUploadService.uploadVideo(
        req.files.profile_video[0].buffer,
        'expert-profile-videos',
        null,
        req.files.profile_video[0].mimetype
      );

      if (!videoData.success) {
        return res.status(500).json({
          error: `Profile video upload failed: ${videoData.error}`
        });
      }

      updateData.profile_video_url = videoData.url;
      updateData.profile_video_public_id = videoData.publicId;
    }

    if (req.files?.cancelled_cheque?.[0]) {
      if (currentExpert?.cancelled_cheque_public_id) {
        await ImageUploadService.deleteDocument(currentExpert.cancelled_cheque_public_id);
      }

      const chequeFile = req.files.cancelled_cheque[0];
      const cancelledChequeData = await ImageUploadService.uploadDocument(
        chequeFile.buffer,
        'expert-bank-documents',
        null,
        chequeFile.mimetype,
        chequeFile.originalname
      );

      if (!cancelledChequeData.success) {
        return res.status(500).json({
          error: `Cancelled cheque upload failed: ${cancelledChequeData.error}`
        });
      }

      updateData.cancelled_cheque_url = cancelledChequeData.url;
      updateData.cancelled_cheque_public_id = cancelledChequeData.publicId;
    }

    // Handle course video update if uploaded
    if (req.files?.course_video?.[0]) {
      if (currentExpert?.course_video_public_id) {
        await ImageUploadService.deleteVideo(currentExpert.course_video_public_id);
      }

      const courseVideoData = await ImageUploadService.uploadVideo(
        req.files.course_video[0].buffer,
        'expert-course-videos',
        null,
        req.files.course_video[0].mimetype
      );

      if (!courseVideoData.success) {
        return res.status(500).json({
          error: `Course video upload failed: ${courseVideoData.error}`
        });
      }

      updateData.course_video_url = courseVideoData.url;
      updateData.course_video_public_id = courseVideoData.publicId;
    }

    // Handle explicit removal of course video
    if (removeCourseVideoFlag && !req.files?.course_video?.[0]) {
      if (currentExpert?.course_video_public_id) {
        await ImageUploadService.deleteVideo(currentExpert.course_video_public_id);
      }
      updateData.course_video_url = null
      updateData.course_video_public_id = null
    }
    
    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) delete updateData[k];
    });

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
}

async function setCalxbookVisibility(req, res) {
  try {
    const expertId = req.params.id;

    const auth = await superAdminAuth.requireSuperAdminPermission(req, res, 'calxbook_verification:write');
    if (!auth) return;

    // Use service-role client to perform the update
    const writeClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (req.body.calxbook_verified === undefined) {
      return res.status(400).json({ error: 'calxbook_verified boolean is required' });
    }

    const value = req.body.calxbook_verified === true || req.body.calxbook_verified === 'true';

    const { data, error } = await writeClient
      .from('experts')
      .update({ calxbook_verified: value })
      .eq('id', expertId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Expert not found' });
    res.json(data[0]);
  } catch (err) {
    console.error('Calxbook visibility update error:', err?.message || err);
    res.status(500).json({ error: err.message || 'Failed to update calxbook visibility' });
  }
}

async function listRecommended(req, res) {
  try {
    const { data, error } = await supabase.rpc('get_recommended_experts', {
      project_id: req.params.projectId
    });

    if (error) throw error;

    const { role: recExpertsRole } = await superAdminAuth.getUserRoleFromRequest(req);
    const rows = Array.isArray(data) ? data : [];
    const masked = rows.map((row) => privacyMask.maskExpertObject(row, recExpertsRole));
    res.json(masked);
  } catch (error) {
    console.error('GET /api/experts/recommended error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  financeSummary,
  list,
  listCalxbook,
  create,
  getById,
  getByUserId,
  update,
  setCalxbookVisibility,
  listRecommended,
};
