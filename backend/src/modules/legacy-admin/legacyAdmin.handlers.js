/**
 * Legacy /api/admin handlers extracted from server.js (behavior-preserving).
 * Gate: applyLegacyAdminGate in src/app.js (feedback-analytics exempt).
 */
const { createClient } = require('@supabase/supabase-js');
const ImageUploadService = require('../../../services/imageUploadService');
const { normalizePan, isValidPan } = require('../../shared/pan');
const { parseBooleanBody } = require('../../shared/parseBooleanBody');

const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

function requireAdminAuth(req, res) {
  if (req.legacyAdmin?.token) return req.legacyAdmin.token;
  res.status(403).json({ error: 'Access denied' });
  return null;
}

async function feedbackAnalytics(req, res) {
  try {
    const studentFeedbackService = require('../../../services/studentFeedbackService');
    // Check if user is authorized (hardcoded email check)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization required' });
    }

    // This endpoint is exempt from the /api/admin super_admin JWT middleware, so
    // enforce its own authorized-email gate here (matches the analytics UI login).
    const token = authHeader.substring(7);
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
}

// ========================================
// END STUDENT FEEDBACK SYSTEM ROUTES
// ========================================

// ========================================
// ADMIN PROFILE MANAGEMENT ROUTES
// ========================================

// Admin: Get all experts with pagination and search
async function listExperts(req, res) {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search = '', 
      domain_expertise = '', 
      min_hourly_rate = '', 
      max_hourly_rate = '' 
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Use service role to bypass RLS
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let query = serviceClient
      .from('experts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // General search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    // Domain expertise filter
    if (domain_expertise && domain_expertise !== 'all') {
      query = query.contains('domain_expertise', [domain_expertise]);
    }

    // Min hourly rate filter
    if (min_hourly_rate && !isNaN(parseFloat(min_hourly_rate))) {
      query = query.gte('hourly_rate', parseFloat(min_hourly_rate));
    }

    // Max hourly rate filter
    if (max_hourly_rate && !isNaN(parseFloat(max_hourly_rate))) {
      query = query.lte('hourly_rate', parseFloat(max_hourly_rate));
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Admin get experts error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Admin: Get all institutions with pagination and search
async function listInstitutions(req, res) {
  try {
    const { page = 1, limit = 12, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Use service role to bypass RLS
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let query = serviceClient
      .from('institutions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,type.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Admin get institutions error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Admin: Get all students with pagination and search
async function listStudents(req, res) {
  try {
    const { page = 1, limit = 12, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Use service role to bypass RLS
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let query = serviceClient
      .from('site_students')
      .select(`
        *,
        institutions:institution_id (
          id,
          name,
          city,
          state
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,degree.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Admin get students error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Admin: Create expert profile (without user_id requirement)
async function createExpert(req, res) {
  try {
    // Check admin authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    // Legacy hard-coded email validation, disabled in favor of /api/admin middleware:
    // const token = authHeader.substring(7);
    // if (!token.includes('debnathsinhababu2017@gmail.com')) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    // Validate required fields
    if (!req.body.name || !req.body.email || !req.body.phone) {
      return res.status(400).json({ 
        error: 'Name, email, and phone are required fields' 
      });
    }

    if (!req.files?.profile_photo?.[0]) {
      return res.status(400).json({ 
        error: 'Profile photo is required' 
      });
    }

    // Use service role to bypass RLS
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Upload files to Cloudinary
    let photoData = null;
    let resumeData = null;
    let qualificationsData = null;
    let profileVideoData = null;

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

    const adminPan = req.body.pan_number;
    let adminPanNormalized = null;
    if (adminPan !== undefined && adminPan !== null && String(adminPan).trim() !== '') {
      adminPanNormalized = normalizePan(adminPan);
      if (!isValidPan(adminPanNormalized)) {
        return res.status(400).json({
          error: 'Invalid PAN format. Use 10 characters: five letters, four digits, one letter (e.g. ABCDE1234F).'
        });
      }
    }
    
    // Check if domain is custom (not in predefined list)
    const domainName = req.body.domain_expertise;
    // Standard domains list (matching frontend constants)
    const STANDARD_DOMAINS = [
      "Computer Science & IT", "Engineering", "Business & Management", 
      "Finance & Economics", "Healthcare & Medicine", "Education & Training",
      "Research & Development", "Marketing & Sales", "Data Science & Analytics",
      "Design & Creative", "Law & Legal", "Other"
    ];
    const isCustomDomain = domainName && !STANDARD_DOMAINS.includes(domainName);
    
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
      user_id: null, // Admin can create without user_id
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      bio: req.body.bio || '',
      photo_url: photoData?.url || null,
      profile_photo_public_id: photoData?.publicId || null,
      profile_photo_thumbnail_url: photoData?.thumbnailUrl || null,
      profile_photo_small_url: photoData?.smallUrl || null,
      qualifications: req.body.qualifications || '',
      qualifications_url: qualificationsData?.url || null,
      qualifications_public_id: qualificationsData?.publicId || null,
      domain_expertise: req.body.domain_expertise ? [req.body.domain_expertise] : [],
      subskills: Array.isArray(req.body.subskills) ? req.body.subskills : (req.body.subskills ? JSON.parse(req.body.subskills) : []),
      hourly_rate: req.body.hourly_rate ? parseFloat(req.body.hourly_rate) : null,
      resume_url: resumeData?.url || null,
      resume_public_id: resumeData?.publicId || null,
      availability: req.body.availability ? (Array.isArray(req.body.availability) ? req.body.availability : JSON.parse(req.body.availability)) : [],
      is_verified: true, // Auto-verify for admin-created profiles
      rating: 0.00,
      total_ratings: 0,
      experience_years: req.body.experience_years ? parseInt(req.body.experience_years) : null,
      linkedin_url: req.body.linkedin_url || '',
      last_working_company: req.body.last_working_company || null,
      current_designation: req.body.current_designation || null,
      expert_types: Array.isArray(req.body.expert_types) ? req.body.expert_types : (req.body.expert_types ? JSON.parse(req.body.expert_types) : []),
      expert_services: Array.isArray(req.body.expert_services) ? req.body.expert_services : (req.body.expert_services ? JSON.parse(req.body.expert_services) : []),
      available_on_demand: parseBooleanBody(req.body.available_on_demand),
      open_to_work: parseBooleanBody(req.body.open_to_work),
      city: req.body.city || null,
      state: req.body.state || null,
      pan_number: adminPanNormalized,
      profile_video_url: profileVideoData?.url || null,
      profile_video_public_id: profileVideoData?.publicId || null
    };
    
    const { data, error } = await serviceClient
      .from('experts')
      .insert([expertData])
      .select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Admin create expert error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Admin: List super admin users
async function listSuperAdmins(req, res) {
  const token = requireAdminAuth(req, res);
  if (!token) return;

  try {
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await serviceClient.auth.admin.listUsers({ perPage: 1000, page: 1 });
    if (error) throw error;

    const users = Array.isArray(data?.users) ? data.users : [];
    const superAdmins = users
      .filter((user) => user.user_metadata?.role === 'super_admin')
      .map((user) => ({
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'super_admin',
        created_at: user.created_at
      }));

    res.json(superAdmins);
  } catch (error) {
    console.error('Admin get super admins error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Admin: Create a new super admin user
async function createSuperAdmin(req, res) {
  const token = requireAdminAuth(req, res);
  if (!token) return;

  try {
    const email = String((req.body?.email || '').trim()).toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required to create a new super admin' });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: listData, error: listError } = await serviceClient.auth.admin.listUsers({ perPage: 1000, page: 1 });
    if (listError) throw listError;

    const users = Array.isArray(listData?.users) ? listData.users : [];
    const existingUser = users.find((user) => user.email?.toLowerCase() === email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists. Use the promote endpoint for existing accounts.' });
    }

    const { data: createData, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'super_admin'
      }
    });
    if (createError) throw createError;

    const newUser = createData.user;
    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.user_metadata?.role || 'super_admin',
        created_at: newUser.created_at
      }
    });
  } catch (error) {
    console.error('Admin create super admin error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Admin: Promote an existing user to super admin
async function promoteSuperAdmin(req, res) {
  const token = requireAdminAuth(req, res);
  if (!token) return;

  try {
    const email = String((req.body?.email || '').trim()).toLowerCase();

    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: listData, error: listError } = await serviceClient.auth.admin.listUsers({ perPage: 1000, page: 1 });
    if (listError) throw listError;

    const users = Array.isArray(listData?.users) ? listData.users : [];
    const existingUser = users.find((user) => user.email?.toLowerCase() === email);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found. Please use an existing registered email to promote to super admin.' });
    }

    const updatePayload = {
      user_metadata: {
        ...(existingUser.user_metadata || {}),
        role: 'super_admin'
      }
    };

    const { data: updateData, error: updateError } = await serviceClient.auth.admin.updateUserById(existingUser.id, updatePayload);
    if (updateError) throw updateError;

    const updatedUser = updateData.user || existingUser;
    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.user_metadata?.role || 'super_admin',
        created_at: updatedUser.created_at
      }
    });
  } catch (error) {
    console.error('Admin promote super admin error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Admin: Get all custom domains
async function listCustomDomains(req, res) {
  try {
    // Use service role to bypass RLS
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await serviceClient
      .from('custom_domains')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Admin get custom domains error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Admin: Bulk import experts from Google Sheets
async function bulkImportExperts(req, res) {
  try {
    // Check admin authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    // Legacy hard-coded email validation, disabled in favor of /api/admin middleware:
    // const token = authHeader.substring(7);
    // if (!token.includes('debnathsinhababu2017@gmail.com')) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    const { spreadsheetId, range, gid, usePublicAccess = false, delayBetweenRows = 500, defaultPassword } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ error: 'spreadsheetId is required' });
    }

    // Import services
    const GoogleSheetsService = require('./services/googleSheetsService');
    const BulkImportService = require('./services/bulkImportService');

    // Read data from Google Sheet
    let rows;
    try {
      if (usePublicAccess) {
        rows = await GoogleSheetsService.readPublicSheet(spreadsheetId, range, gid);
      } else {
        rows = await GoogleSheetsService.readSheet(spreadsheetId, range);
      }
    } catch (error) {
      return res.status(400).json({ 
        error: `Failed to read Google Sheet: ${error.message}` 
      });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'No data found in the sheet' });
    }

    // Process bulk import (defaultPassword from body or env BULK_IMPORT_DEFAULT_PASSWORD)
    const results = await BulkImportService.processBulkImport(rows, {
      delayBetweenRows: parseInt(delayBetweenRows) || 500,
      defaultPassword
    });

    res.json({
      success: true,
      summary: {
        total: results.total,
        successful: results.successful,
        failed: results.failed
      },
      details: results.details.map(detail => ({
        rowNumber: detail.rowNumber,
        success: detail.success,
        expertId: detail.expert?.id || null,
        expertName: detail.expert?.name || null,
        errors: detail.errors
      }))
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: error.message });
  }
}

// ========================================
// ADMIN REQUIREMENTS TRACKING ROUTES
// ========================================

// Admin: Get all requirements (contracts, internships, freelance) with institution details
async function listRequirements(req, res) {
  try {
    const { 
      page = 1, 
      limit = 15, 
      search = '', 
      type = 'all', 
      status = 'call_now' 
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Use service role to bypass RLS
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let allRequirements = [];

    // Fetch contracts if type matches
    if (type === 'all' || type === 'contract') {
      const contractQuery = serviceClient
        .from('projects')
        .select(`
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
          created_at,
          institution_id,
          call_status,
          institutions:institution_id (
            id,
            name,
            email,
            phone,
            type,
            city,
            state,
            website_url
          )
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        contractQuery.eq('call_status', status);
      }

      const { data: contracts, error: contractError } = await contractQuery;
      if (contractError) throw contractError;

      if (contracts && contracts.length > 0) {
        allRequirements.push(...contracts.map(c => ({
          ...c,
          requirement_type: 'contract'
        })));
      }
    }

    // Fetch internships if type matches
    if (type === 'all' || type === 'internship') {
      const internshipQuery = serviceClient
        .from('internships')
        .select(`
          id,
          title,
          responsibilities,
          stipend_min,
          stipend_max,
          duration_value,
          duration_unit,
          location,
          skills_required,
          status,
          created_at,
          corporate_institution_id,
          call_status,
          paid,
          work_mode,
          engagement,
          institutions:corporate_institution_id (
            id,
            name,
            email,
            phone,
            type,
            city,
            state,
            website_url
          )
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        internshipQuery.eq('call_status', status);
      }

      const { data: internships, error: internshipError } = await internshipQuery;
      if (internshipError) throw internshipError;

      if (internships && internships.length > 0) {
        allRequirements.push(...internships.map(i => ({
          ...i,
          requirement_type: 'internship',
          institution_id: i.corporate_institution_id,
          description: i.responsibilities // Map responsibilities to description for frontend consistency
        })));
      }
    }

    // Fetch freelance projects if type matches
    if (type === 'all' || type === 'freelance') {
      const freelanceQuery = serviceClient
        .from('freelance_projects')
        .select(`
          id,
          title,
          description,
          required_skills,
          deadline,
          budget_min,
          budget_max,
          status,
          created_at,
          corporate_institution_id,
          call_status,
          institutions:corporate_institution_id (
            id,
            name,
            email,
            phone,
            type,
            city,
            state,
            website_url
          )
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        freelanceQuery.eq('call_status', status);
      }

      const { data: freelance, error: freelanceError } = await freelanceQuery;
      if (freelanceError) throw freelanceError;

      if (freelance && freelance.length > 0) {
        allRequirements.push(...freelance.map(f => ({
          ...f,
          requirement_type: 'freelance',
          institution_id: f.corporate_institution_id
        })));
      }
    }

    // Sort by created_at descending
    allRequirements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      allRequirements = allRequirements.filter(req => {
        const titleMatch = req.title?.toLowerCase().includes(searchLower);
        const descMatch = req.description?.toLowerCase().includes(searchLower);
        const instMatch = req.institutions?.name?.toLowerCase().includes(searchLower);
        const instEmailMatch = req.institutions?.email?.toLowerCase().includes(searchLower);
        return titleMatch || descMatch || instMatch || instEmailMatch;
      });
    }

    // Apply pagination
    const paginatedResults = allRequirements.slice(offset, offset + parseInt(limit));

    res.json({
      data: paginatedResults,
      total: allRequirements.length,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: allRequirements.length > offset + parseInt(limit)
    });
  } catch (error) {
    console.error('Admin get requirements error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Admin: Update requirement call status
async function updateRequirementStatus(req, res) {
  try {
    const { id } = req.params;
    const { type, status } = req.body;

    if (!type || !status) {
      return res.status(400).json({ error: 'Type and status are required' });
    }

    if (!['call_now', 'called'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Use service role to bypass RLS
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let tableName;
    if (type === 'contract') {
      tableName = 'projects';
    } else if (type === 'internship') {
      tableName = 'internships';
    } else if (type === 'freelance') {
      tableName = 'freelance_projects';
    } else {
      return res.status(400).json({ error: 'Invalid requirement type' });
    }

    const { data, error } = await serviceClient
      .from(tableName)
      .update({ call_status: status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Admin update requirement status error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  feedbackAnalytics,
  listExperts,
  listInstitutions,
  listStudents,
  createExpert,
  listSuperAdmins,
  createSuperAdmin,
  promoteSuperAdmin,
  listCustomDomains,
  bulkImportExperts,
  listRequirements,
  updateRequirementStatus,
};
