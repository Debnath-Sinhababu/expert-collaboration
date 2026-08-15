/**
 * Internship + internship-application handlers extracted from server.js.
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

async function create(req, res) {
  try {
    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    let userId = null;

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

      const { data: userData } = await supabaseClient.auth.getUser();
      userId = userData?.user?.id || null;
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Resolve user's institution and ensure it's Corporate
    const { data: inst, error: instErr } = await supabaseClient
      .from('institutions')
      .select('id, type')
      .eq('user_id', userId)
      .single();

    if (instErr || !inst) {
      return res.status(403).json({ error: 'Institution not found for user' });
    }
    if ((inst.type || '').toLowerCase() !== 'corporate') {
      return res.status(403).json({ error: 'Only Corporate institutions can create internships' });
    }

    // Build internship payload
    const body = req.body || {};
    const selectedInstitutionIds = Array.isArray(body.selected_institution_ids)
      ? body.selected_institution_ids.filter(Boolean)
      : [];
    const visibilityScope = selectedInstitutionIds.length > 0 ? 'restricted' : (body.visibility_scope || 'public');

    const internship = {
      corporate_institution_id: inst.id,
      title: body.title,
      skills_required: Array.isArray(body.skills_required)
        ? body.skills_required
        : (typeof body.skills_required === 'string' && body.skills_required.trim().length > 0
            ? body.skills_required.split(',').map((s) => s.trim()).filter(Boolean)
            : []),
      work_mode: body.work_mode, // 'In office' | 'Hybrid' | 'Remote'
      engagement: body.engagement, // 'Part-time' | 'Full-time'
      openings: typeof body.openings === 'number' ? body.openings : parseInt(body.openings || '0'),
      start_timing: body.start_timing, // 'immediately' | 'later'
      start_date: body.start_timing === 'later' ? (body.start_date || null) : null,
      duration_value: typeof body.duration_value === 'number' ? body.duration_value : parseInt(body.duration_value || '0'),
      duration_unit: body.duration_unit, // 'weeks' | 'months'
      responsibilities: body.responsibilities,
      paid: body.paid === true || body.paid === 'Paid',
      stipend_min: body.paid ? (typeof body.stipend_min === 'number' ? body.stipend_min : parseInt(body.stipend_min || '0')) : null,
      stipend_max: body.paid ? (typeof body.stipend_max === 'number' ? body.stipend_max : parseInt(body.stipend_max || '0')) : null,
      stipend_unit: body.paid ? (body.stipend_unit || 'month') : null,
      incentives_min: body.incentives_min ? (typeof body.incentives_min === 'number' ? body.incentives_min : parseInt(body.incentives_min || '0')) : null,
      incentives_max: body.incentives_max ? (typeof body.incentives_max === 'number' ? body.incentives_max : parseInt(body.incentives_max || '0')) : null,
      incentives_unit: body.incentives_min || body.incentives_max ? (body.incentives_unit || 'month') : null,
      ppo: body.ppo === true || body.ppo === 'true',
      perks: Array.isArray(body.perks) ? body.perks : [],
      screening_questions: Array.isArray(body.screening_questions) ? body.screening_questions : [],
      alt_phone: body.alt_phone || null,
      application_deadline: body.application_deadline || null,
      location: body.location || null,
      status: body.status || 'open',
      visibility_scope: visibilityScope
    };

    const { data, error } = await supabaseClient
      .from('internships')
      .insert([internship])
      .select()
      .single();

    if (error) throw error;
    // If restricted, insert visibility mappings
    if (visibilityScope === 'restricted' && selectedInstitutionIds.length > 0) {
      const rows = selectedInstitutionIds.map((iid) => ({ internship_id: data.id, institution_id: iid }));
      const { error: visErr } = await supabaseClient
        .from('internship_visibility')
        .insert(rows);
      if (visErr) {
        console.warn('Failed to insert internship visibility mappings:', visErr.message);
      }
    }
    return res.status(201).json(data);
  } catch (error) {
    console.error('Create internship error:', error);
    res.status(500).json({ error: error.message });
  }
}

// List internships for the authenticated Corporate (pagination)
async function list(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` }
          }
        }
      );
      const { data: userData } = await supabaseClient.auth.getUser();
      userId = userData?.user?.id || null;
    }

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: inst, error: instErr } = await supabaseClient
      .from('institutions')
      .select('id, type')
      .eq('user_id', userId)
      .single();

    if (instErr || !inst) return res.status(403).json({ error: 'Institution not found' });
    if ((inst.type || '').toLowerCase() !== 'corporate') return res.status(403).json({ error: 'Only Corporate can view their internships' });

    const { data, error } = await supabaseClient
      .from('internships')
      .select('*')
      .eq('corporate_institution_id', inst.id)
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('List internships error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Visible internships for non-corporate institutions (public or targeted)
async function listVisible(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      work_mode = '',
      engagement = '',
      paid = '',
      min_stipend = '',
      max_stipend = '',
      skills = '', // comma-separated
      location = '',
      exclude_applied = 'false',
      visibility = ''
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Resolve requester institution
    const authHeader = req.headers.authorization;
    let anonClient = supabase;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      anonClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: userData } = await anonClient.auth.getUser();
      userId = userData?.user?.id || null;
    }

    let viewerInstitutionId = null;
    let viewerStudentId = null;
    if (userId) {
      // Try institution user
      const { data: inst } = await anonClient
        .from('institutions')
        .select('id, type')
        .eq('user_id', userId)
        .maybeSingle();
      if (inst?.id) viewerInstitutionId = inst.id;
      // Fallback to student profile
      if (!viewerInstitutionId) {
        const { data: student } = await anonClient
          .from('site_students')
          .select('id, institution_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (student?.institution_id) viewerInstitutionId = student.institution_id;
        if (student?.id) viewerStudentId = student.id;
      }
    }

    // Use service role for cross-table visibility evaluation (RLS-safe)
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Build base: open internships, visible to all or targeted to viewer
    let baseQuery = serviceClient.from('internships')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    

    

    if (viewerInstitutionId || viewerStudentId) {
      baseQuery = baseQuery.range(offset, offset + parseInt(limit) - 1);
      // filter via visibility: public OR listed
      // We'll fetch public first; for targeted, we will do a secondary filtered pull if needed
      // Simpler: keep single query and post-filter by checking mapping via an RPC-like approach
      // Since PostgREST doesn't easily support EXISTS with param using JS SDK chaining, we'll fetch broader and filter in JS.
    } else{
      baseQuery = baseQuery.eq('visibility_scope', 'public').limit(parseInt(limit));
    }

    // Apply filters
    if (work_mode) baseQuery = baseQuery.eq('work_mode', work_mode);
    if (engagement) baseQuery = baseQuery.eq('engagement', engagement);
    if (paid !== '') baseQuery = baseQuery.eq('paid', paid === 'true' || paid === true);
    if (min_stipend) baseQuery = baseQuery.gte('stipend_min', parseInt(min_stipend));
    if (max_stipend) baseQuery = baseQuery.lte('stipend_max', parseInt(max_stipend));
    if (location) baseQuery = baseQuery.ilike('location', `%${location}%`);
    if (search) baseQuery = baseQuery.or(`title.ilike.%${search}%,responsibilities.ilike.%${search}%`);
    if (skills) {
      const arr = String(skills).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length > 0) baseQuery = baseQuery.overlaps('skills_required', arr);
    }

    const { data: rows, error } = await baseQuery;
    if (error) throw error;

    // Post-filter visibility: keep public; if viewerInstitutionId present, include targeted
    let filtered = rows.filter(r => r.visibility_scope === 'public') || [];
    
    let targetedIds = new Set();
    if (viewerInstitutionId) {
      const { data: mappings } = await serviceClient
        .from('internship_visibility')
        .select('internship_id')
        .eq('institution_id', viewerInstitutionId);
      targetedIds = new Set((mappings || []).map(m => m.internship_id));
      filtered = rows.filter(r => r.visibility_scope === 'public' || targetedIds.has(r.id));
    }

    // Optional visibility filter
    const vis = String(visibility || '').toLowerCase();
    if (vis === 'public') {
      filtered = filtered.filter(r => r.visibility_scope === 'public');
    } else if (vis === 'tagged') {
      filtered = filtered.filter(r => r.visibility_scope !== 'public' && targetedIds.has(r.id));
    }

    // Optionally exclude internships already applied by this student
    const shouldExcludeApplied = String(exclude_applied).toLowerCase() === 'true';
    if (shouldExcludeApplied && viewerStudentId) {
      const { data: applied } = await serviceClient
        .from('internship_applications')
        .select('internship_id')
        .eq('student_id', viewerStudentId);
      const appliedIds = new Set((applied || []).map(a => a.internship_id));
      filtered = filtered.filter(r => !appliedIds.has(r.id));
    }

    // Attach corporate institution information for each internship
    const internshipsWithCorporate = await Promise.all(
      filtered.map(async (internship) => {
        const { data: corp } = await serviceClient
          .from('institutions')
          .select('id, name, logo_url, city, state, country')
          .eq('id', internship.corporate_institution_id)
          .maybeSingle();
        return { ...internship, corporate: corp || null };
      })
    );

    res.json(internshipsWithCorporate);
  } catch (error) {
    console.error('Visible internships error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get internship by id with visibility checks (public access allowed for public/open internships)
async function getById(req, res) {
  try {
    const internshipId = req.params.id;

    const authHeader = req.headers.authorization;
    let supabaseClient = supabase;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: userData } = await supabaseClient.auth.getUser();
      userId = userData?.user?.id || null;
    }

    // Use service role to fetch internship and perform manual visibility checks
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: internship, error } = await serviceClient
      .from('internships')
      .select('*')
      .eq('id', internshipId)
      .single();
    if (error) throw error;
    if (!internship) return res.status(404).json({ error: 'Not found' });

    // If internship is public and open, allow public access
    if (internship.visibility_scope === 'public' && internship.status === 'open') {
      // Attach corporate institution meta for display
      const { data: corp } = await serviceClient
        .from('institutions')
        .select('id, name, logo_url, city, state, country')
        .eq('id', internship.corporate_institution_id)
        .maybeSingle();
      return res.json({ ...internship, corporate: corp || null });
    }

    // For non-public or non-open internships, require authentication
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Resolve viewer context: prefer institution; fallback to student profile's institution
    const { data: viewerInst } = await supabaseClient
      .from('institutions')
      .select('id, type')
      .eq('user_id', userId)
      .maybeSingle();

    let viewerStudentInstId = null;
    if (!viewerInst?.id) {
      const { data: student } = await supabaseClient
        .from('site_students')
        .select('institution_id')
        .eq('user_id', userId)
        .maybeSingle();
      viewerStudentInstId = student?.institution_id || null;
    }

    // Visibility rules
    const viewerIsCorporate = ((viewerInst?.type || '').toLowerCase() === 'corporate');
    const viewerInstId = viewerInst?.id || viewerStudentInstId || null;

    if (viewerIsCorporate) {
      // Corporate can see only their own internships unless public
      const isOwner = viewerInst && (internship.corporate_institution_id === viewerInst.id);
      if (!isOwner && internship.visibility_scope !== 'public') {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else {
      // Non-corporate: must be public or targeted
      if (internship.visibility_scope !== 'public') {
        // If viewer has an institution context (institution or student-linked), check mapping; else forbid
        if (!viewerInstId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        const { data: mapping } = await serviceClient
          .from('internship_visibility')
          .select('internship_id')
          .eq('internship_id', internshipId)
          .eq('institution_id', viewerInstId)
          .maybeSingle();
        if (!mapping) return res.status(403).json({ error: 'Forbidden' });
      }
      if (internship.status !== 'open') return res.status(404).json({ error: 'Not found' });
    }

    // Attach corporate institution meta for display
    const { data: corp } = await serviceClient
      .from('institutions')
      .select('id, name, logo_url, city, state, country')
      .eq('id', internship.corporate_institution_id)
      .maybeSingle();

    res.json({ ...internship, corporate: corp || null });
  } catch (error) {
    console.error('Get internship error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function apply(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get student profile
    const { data: student, error: stuErr } = await supabaseClient
      .from('site_students')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (stuErr || !student) return res.status(403).json({ error: 'Student profile not found' });

    const body = req.body || {};
    const internshipId = body.internship_id;
    if (!internshipId) return res.status(400).json({ error: 'internship_id required' });

    // Load internship
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: internship, error: intErr } = await serviceClient
      .from('internships')
      .select('*')
      .eq('id', internshipId)
      .single();
    if (intErr || !internship) return res.status(404).json({ error: 'Internship not found' });

    // Determine flow
    let status = 'pending_corporate';
    let institutionId = student.institution_id || null;
    if (internship.visibility_scope === 'restricted') {
      // verify targeted
      if (!institutionId) return res.status(403).json({ error: 'Not eligible for restricted internship' });
      const { data: mapping } = await serviceClient
        .from('internship_visibility')
        .select('internship_id')
        .eq('internship_id', internshipId)
        .eq('institution_id', institutionId)
        .maybeSingle();
      if (!mapping) return res.status(403).json({ error: 'Not eligible for restricted internship' });
      status = 'pending_institution';
    }

    const payload = {
      internship_id: internshipId,
      student_id: student.id,
      institution_id: institutionId,
      status,
      cover_letter: body.cover_letter || null,
      screening_answers: body.screening_answers || null,
      resume_url: body.resume_url || student.resume_url || null
    };

    const { data, error } = await supabaseClient
      .from('internship_applications')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Corporate: list applications for a given internship they own
async function listApplicationsForInternship(req, res) {
  try {
    const internshipId = req.params.id;
    const { page = 1, limit = 10, stage = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Verify corporate ownership
    const { data: inst } = await supabaseClient
      .from('institutions')
      .select('id, type')
      .eq('user_id', userId)
      .maybeSingle();
    if (!inst?.id || (inst.type || '').toLowerCase() !== 'corporate') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: internship, error: intErr } = await serviceClient
      .from('internships')
      .select('id, corporate_institution_id, visibility_scope')
      .eq('id', internshipId)
      .maybeSingle();
    if (intErr) throw intErr;
    if (!internship || internship.corporate_institution_id !== inst.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // For now, only flat list of applications (public internships -> direct student applications)
    // Stage mapping for corporate view
    const stageMap = {
      pending: ['pending_corporate', 'approved_institution'],
      interview: ['interview'],
      selected: ['shortlisted_corporate', 'offered', 'hired'],
      rejected: ['rejected_corporate']
    };

    let listQuery = serviceClient
      .from('internship_applications')
      .select(`
        *,
        student:student_id (
          id,
          name,
          email,
          phone,
          institution_id,
          degree,
          year,
          specialization,
          skills,
          linkedin_url,
          github_url,
          portfolio_url,
          date_of_birth,
          photo_url,
          gender,
          address,
          city,
          state,
          availability,
          preferred_engagement,
          preferred_work_mode,
          education_start_date,
          education_end_date,
          currently_studying,
          resume_url
        ),
        institution:institution_id ( id, name, city, state )
      `)
      .eq('internship_id', internshipId)
      .order('created_at', { ascending: false });

    const normalizedStage = String(stage || '').toLowerCase();
    if (normalizedStage && stageMap[normalizedStage]) {
      listQuery = listQuery.in('status', stageMap[normalizedStage]);
    }

    listQuery = listQuery.range(offset, offset + parseInt(limit) - 1);
    const { data: apps, error } = await listQuery;
    if (error) throw error;

    // Counts for all stages
    const { data: allStatuses, error: countErr } = await serviceClient
      .from('internship_applications')
      .select('status')
      .eq('internship_id', internshipId);
    if (countErr) throw countErr;
    const counts = { pending: 0, interview: 0, selected: 0, rejected: 0, total: allStatuses?.length || 0 };
    (allStatuses || []).forEach((row) => {
      const s = row.status;
      if (stageMap.pending.includes(s)) counts.pending++;
      else if (stageMap.interview.includes(s)) counts.interview++;
      else if (stageMap.selected.includes(s)) counts.selected++;
      else if (stageMap.rejected.includes(s)) counts.rejected++;
    });

    res.json({ data: apps, visibility: internship.visibility_scope, counts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Corporate updates internship application status
async function updateApplicationStatus(req, res) {
  try {
    const applicationId = req.params.id;
    const { status, interview_scheduled_at } = req.body || {};
    if (!status) return res.status(400).json({ error: 'status required' });

    const allowedStatuses = ['interview', 'shortlisted_corporate', 'rejected_corporate'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status for corporate update' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Confirm corporate ownership of the application via internship
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: appRow, error: appErr } = await serviceClient
      .from('internship_applications')
      .select('id, internship_id')
      .eq('id', applicationId)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!appRow) return res.status(404).json({ error: 'Application not found' });

    const { data: inst } = await supabaseClient
      .from('institutions')
      .select('id, type')
      .eq('user_id', userId)
      .maybeSingle();
    if (!inst?.id || (inst.type || '').toLowerCase() !== 'corporate') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data: internship } = await serviceClient
      .from('internships')
      .select('id, corporate_institution_id')
      .eq('id', appRow.internship_id)
      .maybeSingle();
    if (!internship || internship.corporate_institution_id !== inst.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatePayload = { status, updated_at: new Date().toISOString() };
    if (status === 'interview') {
      if (!interview_scheduled_at) {
        return res.status(400).json({ error: 'Interview date and time are required' });
      }
      updatePayload.interview_scheduled_at = interview_scheduled_at;
    }

    const { data, error } = await supabaseClient
      .from('internship_applications')
      .update(updatePayload)
      .eq('id', applicationId)
      .select()
      .maybeSingle();
    if (error) throw error;
    res.json(data || { success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Institution: list applications for a given internship they are tagged to
async function listApplicationsForInstitution(req, res) {
  try {
    const internshipId = req.params.id;
    const { page = 1, limit = 10, stage = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Resolve viewer institution (non-corporate)
    const { data: inst } = await supabaseClient
      .from('institutions')
      .select('id, type')
      .eq('user_id', userId)
      .maybeSingle();
    if (!inst?.id) return res.status(403).json({ error: 'Institution not found' });
    if ((inst.type || '').toLowerCase() === 'corporate') {
      return res.status(403).json({ error: 'Not allowed for Corporate' });
    }

    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify internship is either public or targeted to this institution
    const { data: internship } = await serviceClient
      .from('internships')
      .select('id, visibility_scope')
      .eq('id', internshipId)
      .maybeSingle();
    if (!internship) return res.status(404).json({ error: 'Not found' });
    if (internship.visibility_scope !== 'public') {
      const { data: mapping } = await serviceClient
        .from('internship_visibility')
        .select('internship_id')
        .eq('internship_id', internshipId)
        .eq('institution_id', inst.id)
        .maybeSingle();
      if (!mapping) return res.status(403).json({ error: 'Forbidden' });
    }

    // Stage mapping for institution view
    const stageMap = {
      pending: ['pending_institution'],
      approved: ['approved_institution'],
      rejected: ['rejected_institution']
    };

    let listQuery = serviceClient
      .from('internship_applications')
      .select(`
        *,
        student:student_id (
          id,
          name,
          email,
          phone,
          degree,
          year,
          specialization,
          skills,
          linkedin_url,
          github_url,
          portfolio_url,
          availability,
          preferred_engagement,
          preferred_work_mode,
          city,
          state,
          address,
          education_start_date,
          education_end_date,
          currently_studying,
          resume_url,
          photo_url
        )
      `)
      .eq('internship_id', internshipId)
      .eq('institution_id', inst.id)
      .order('created_at', { ascending: false });

    const normalizedStage = String(stage || '').toLowerCase();
    if (normalizedStage && stageMap[normalizedStage]) {
      listQuery = listQuery.in('status', stageMap[normalizedStage]);
    }

    listQuery = listQuery.range(offset, offset + parseInt(limit) - 1);
    const { data: apps, error } = await listQuery;
    if (error) throw error;

    // Counts
    const { data: allStatuses, error: countErr } = await serviceClient
      .from('internship_applications')
      .select('status')
      .eq('internship_id', internshipId)
      .eq('institution_id', inst.id);
    if (countErr) throw countErr;
    const counts = { pending: 0, approved: 0, rejected: 0, total: allStatuses?.length || 0 };
    (allStatuses || []).forEach((row) => {
      const s = row.status;
      if (stageMap.pending.includes(s)) counts.pending++;
      else if (stageMap.approved.includes(s)) counts.approved++;
      else if (stageMap.rejected.includes(s)) counts.rejected++;
    });

    return res.json({ data: apps, counts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Institution approves/rejects an application
async function updateInstitutionStatus(req, res) {
  try {
    const applicationId = req.params.id;
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: 'status required' });
    if (!['approved_institution', 'rejected_institution'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: inst } = await supabaseClient
      .from('institutions')
      .select('id, type')
      .eq('user_id', userId)
      .maybeSingle();
    if (!inst?.id) return res.status(403).json({ error: 'Institution not found' });
    if ((inst.type || '').toLowerCase() === 'corporate') return res.status(403).json({ error: 'Not allowed for Corporate' });

    // Confirm application belongs to this institution
    const { data: appRow } = await supabase
      .from('internship_applications')
      .select('id, institution_id, status')
      .eq('id', applicationId)
      .maybeSingle();
    if (!appRow) return res.status(404).json({ error: 'Application not found' });
    if (appRow.institution_id !== inst.id) return res.status(403).json({ error: 'Forbidden' });
    if (appRow.status !== 'pending_institution') {
      return res.status(400).json({ error: 'Only pending applications can be updated by institution' });
    }

    const { data, error } = await supabaseClient
      .from('internship_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', applicationId)
      .select()
      .maybeSingle();
    if (error) throw error;
    res.json(data || { success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Check if current student has applied to a given internship
async function getApplicationStatus(req, res) {
  try {
    const internshipId = req.query.internship_id;
    if (!internshipId) return res.status(400).json({ error: 'internship_id required' });

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get student profile id
    const { data: student } = await supabaseClient
      .from('site_students')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!student?.id) return res.json({ applied: false, status: null });

    const { data: application } = await supabaseClient
      .from('internship_applications')
      .select('id, status')
      .eq('internship_id', internshipId)
      .eq('student_id', student.id)
      .maybeSingle();

    return res.json({ applied: !!application, status: application?.status || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function listMyApplications(req, res) {
  try {
    const { page = 1, limit = 10, stage = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Resolve student profile
    const { data: student, error: stuErr } = await supabaseClient
      .from('site_students')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (stuErr) throw stuErr;
    if (!student?.id) return res.status(404).json({ error: 'Student profile not found' });

    // Stage to status mapping
    const stageMap = {
      // Student should only see corporate actions
      pending: ['pending_corporate'],
      interview: ['interview'],
      selected: ['shortlisted_corporate', 'offered', 'hired'],
      rejected: ['rejected_corporate']
    };

    let query = supabaseClient
      .from('internship_applications')
      .select(`
        *,
        internships:internship_id (
          id, title, work_mode, engagement, openings, duration_value, duration_unit, paid, stipend_min, stipend_max, created_at, start_date, responsibilities
        )
      `)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const normalizedStage = String(stage).toLowerCase();
    if (normalizedStage && stageMap[normalizedStage]) {
      query = query.in('status', stageMap[normalizedStage]);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Counts for all stages
    const { data: allStatuses, error: countErr } = await supabaseClient
      .from('internship_applications')
      .select('status')
      .eq('student_id', student.id);
    if (countErr) throw countErr;

    const counts = { pending: 0, interview: 0, selected: 0, rejected: 0, total: allStatuses?.length || 0 };
    (allStatuses || []).forEach((row) => {
      const s = row.status;
      if (stageMap.pending.includes(s)) counts.pending++;
      else if (stageMap.interview.includes(s)) counts.interview++;
      else if (stageMap.selected.includes(s)) counts.selected++;
      else if (stageMap.rejected.includes(s)) counts.rejected++;
    });

    res.json({ data, counts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  create,
  list,
  listVisible,
  getById,
  apply,
  listApplicationsForInternship,
  updateApplicationStatus,
  listApplicationsForInstitution,
  updateInstitutionStatus,
  getApplicationStatus,
  listMyApplications,
};
