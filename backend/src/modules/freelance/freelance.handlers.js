/**
 * Freelance handlers extracted from server.js (behavior-preserving).
 */
const { createClient } = require('@supabase/supabase-js');
const ImageUploadService = require('../../../services/imageUploadService');

const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

async function listPublic(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await supabase
      .from('freelance_projects')
      .select(`
        id,
        title,
        description,
        budget_min,
        budget_max,
        deadline,
        status,
        created_at,
        corporate_institution_id,
        institutions:corporate_institution_id (
          id,
          name,
          city,
          state
        )
      `, { count: 'exact' })
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    res.json({
      data: Array.isArray(data) ? data : [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Freelance projects error:', error);
    res.status(500).json({ error: error.message });
  }
}

// =====================
// Freelancing Endpoints (Corporate + Students)
// =====================

// Create freelance project (Corporate only)
async function createProject(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.substring(7);
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id; if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data: inst } = await supabaseClient.from('institutions').select('id, type').eq('user_id', userId).maybeSingle();
    if (!inst?.id || (inst.type || '').toLowerCase() !== 'corporate') return res.status(403).json({ error: 'Forbidden' });
    const body = req.body || {};
    let draftUrl = null, draftPublicId = null;
    if (req.files?.draft?.[0]) {
      const uploaded = await ImageUploadService.uploadPDF(req.files.draft[0].buffer, 'freelance-drafts');
      if (!uploaded.success) return res.status(500).json({ error: `Draft upload failed: ${uploaded.error}` });
      draftUrl = uploaded.url; draftPublicId = uploaded.publicId;
    }
    const payload = {
      corporate_institution_id: inst.id,
      title: body.title,
      description: body.description,
      required_skills: Array.isArray(body.required_skills) ? body.required_skills : (typeof body.required_skills === 'string' && body.required_skills ? body.required_skills.split(',').map(s=>s.trim()).filter(Boolean) : []),
      deadline: body.deadline || null,
      budget_min: body.budget_min || null,
      budget_max: body.budget_max || null,
      draft_attachment_url: draftUrl,
      draft_attachment_public_id: draftPublicId
    };
    const { data, error } = await supabaseClient.from('freelance_projects').insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// List corporate freelance projects
async function listProjects(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const offset = (pageNum - 1) * limitNum;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.substring(7);
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id; if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data: inst } = await supabaseClient.from('institutions').select('id, type').eq('user_id', userId).maybeSingle();
    if (!inst?.id || (inst.type || '').toLowerCase() !== 'corporate') return res.status(403).json({ error: 'Forbidden' });
    const { data, error } = await supabaseClient
      .from('freelance_projects')
      .select('*')
      .eq('corporate_institution_id', inst.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    if (error) throw error;
    res.json(Array.isArray(data) ? data : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// Visible freelance projects (students), only open
async function listVisibleProjects(req, res) {
  try {
    const { limit = 50 } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    
    // Public endpoint - no auth required for browsing
    const { data, error } = await supabase
      .from('freelance_projects')
      .select('*, corporate:corporate_institution_id ( id, name, city, state )')
      .eq('status','open')
      .order('created_at', { ascending: false })
      .limit(limitNum);
    
    if (error) throw error; 
    res.json(Array.isArray(data) ? data : []);
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
}

// Student apply to project
async function apply(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.substring(7);
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id; if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data: student } = await supabaseClient.from('site_students').select('id').eq('user_id', userId).maybeSingle();
    if (!student?.id) return res.status(403).json({ error: 'Student profile required' });
    const body = req.body || {}; if (!body.project_id) return res.status(400).json({ error: 'project_id required' });
    const { data, error } = await supabaseClient.from('freelance_applications').insert([{ project_id: body.project_id, student_id: student.id, cover_letter: body.cover_letter || null }]).select().single();
    if (error) throw error; res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// Corporate update application status
async function updateApplicationStatus(req, res) {
  try {
    const authHeader = req.headers.authorization; if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.substring(7);
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const appId = req.params.id; const { status } = req.body || {}; if (!['shortlisted','rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { data, error } = await supabaseClient.from('freelance_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', appId).select().single();
    if (error) throw error; res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// Student submit work (shortlisted)
async function createSubmission(req, res) {
  try {
    const authHeader = req.headers.authorization; if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.substring(7);
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id; if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data: student } = await supabaseClient.from('site_students').select('id').eq('user_id', userId).maybeSingle();
    if (!student?.id) return res.status(403).json({ error: 'Student profile required' });
    const body = req.body || {}; if (!body.project_id || !body.application_id) return res.status(400).json({ error: 'project_id and application_id required' });
    let attUrl = null, attId = null; if (req.files?.attachment?.[0]) { const uploaded = await ImageUploadService.uploadPDF(req.files.attachment[0].buffer, 'freelance-submissions'); if (!uploaded.success) return res.status(500).json({ error: `Attachment upload failed: ${uploaded.error}` }); attUrl = uploaded.url; attId = uploaded.publicId; }
    const payload = { project_id: body.project_id, student_id: student.id, application_id: body.application_id, note: body.note || null, attachment_url: attUrl, attachment_public_id: attId };
    const { data, error } = await supabaseClient.from('freelance_submissions').insert([payload]).select().single(); if (error) throw error;
    await supabaseClient.from('freelance_projects').update({ status: 'ongoing', updated_at: new Date().toISOString() }).eq('id', body.project_id);
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// Student: check application status for a project
async function getApplicationStatus(req, res) {
  try {
    const projectId = req.query.project_id;
    if (!projectId) return res.status(400).json({ error: 'project_id required' });
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.substring(7);
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id; if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data: student } = await supabaseClient.from('site_students').select('id').eq('user_id', userId).maybeSingle();
    if (!student?.id) return res.json({ applied: false, status: null });
    const { data: appRow } = await supabaseClient
      .from('freelance_applications')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('student_id', student.id)
      .maybeSingle();
    let status = appRow?.status || null;
    let applicationId = appRow?.id || null;
    if (appRow?.id) {
      const { data: subRow } = await supabaseClient
        .from('freelance_submissions')
        .select('id')
        .eq('application_id', appRow.id)
        .maybeSingle();
      if (subRow) status = 'submitted';
    }
    return res.json({ applied: !!appRow, status, application_id: applicationId });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// Student: list my freelance applications with optional status filter (pending | shortlisted | rejected)
async function listMyApplications(req, res) {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.substring(7);
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id; if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data: student } = await supabaseClient.from('site_students').select('id').eq('user_id', userId).maybeSingle();
    if (!student?.id) return res.status(403).json({ error: 'Student profile required' });

    let query = supabaseClient
      .from('freelance_applications')
      .select('*, project:project_id ( id, title, description, deadline, budget_min, budget_max )')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    if (status && ['pending','shortlisted','rejected'].includes(String(status))) {
      query = query.eq('status', String(status));
    }
    const { data, error } = await query.range(offset, offset + limitNum - 1);
    if (error) throw error;
    let rows = Array.isArray(data) ? data : [];
    // Exclude already-submitted applications from shortlisted view
    if (String(status) === 'shortlisted' && rows.length > 0) {
      const appIds = rows.map(r => r.id).filter(Boolean)
      const { data: subs } = await supabaseClient
        .from('freelance_submissions')
        .select('application_id')
        .in('application_id', appIds)
      const submittedIds = new Set((subs || []).map(s => s.application_id))
      rows = rows.filter(r => !submittedIds.has(r.id))
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// Student: list my freelance submissions
async function listMySubmissions(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.substring(7);
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id; if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data: student } = await supabaseClient.from('site_students').select('id').eq('user_id', userId).maybeSingle();
    if (!student?.id) return res.status(403).json({ error: 'Student profile required' });

    const { data, error } = await supabaseClient
      .from('freelance_submissions')
      .select('*, project:project_id ( id, title, description )')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    if (error) throw error;
    res.json(Array.isArray(data) ? data : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
}
// Get single freelance project (corporate owner or open for others)
async function getProjectById(req, res) {
  try {
    const projectId = req.params.id;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    let supabaseClient = supabase;
    if (token) {
      supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    }
    const { data: project, error } = await supabaseClient
      .from('freelance_projects')
      .select('*, corporate:corporate_institution_id ( id, name, city, state )')
      .eq('id', projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project) return res.status(404).json({ error: 'Not found' });
    if (project.status !== 'open') {
      if (!token) return res.status(403).json({ error: 'Forbidden' });
      const { data: userData } = await supabaseClient.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return res.status(403).json({ error: 'Forbidden' });
      // Allow corporate owner
      const { data: inst } = await supabaseClient.from('institutions').select('id, type').eq('user_id', userId).maybeSingle();
      if (inst?.id && inst.id === project.corporate_institution_id) {
        // owner allowed
      } else {
        // Allow student applicant (has an application for this project)
        const { data: student } = await supabaseClient.from('site_students').select('id').eq('user_id', userId).maybeSingle();
        if (student?.id) {
          const { data: appRow } = await supabaseClient
            .from('freelance_applications')
            .select('id')
            .eq('project_id', projectId)
            .eq('student_id', student.id)
            .maybeSingle();
          if (!appRow) {
            return res.status(403).json({ error: 'Forbidden' });
          }
        } else {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    }
    res.json(project);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// Applications list for a project (corporate)
async function listProjectApplications(req, res) {
  try {
    const projectId = req.params.id;
    const { page = 1, limit = 10, status = '' } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const offset = (pageNum - 1) * limitNum;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.substring(7);
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await supabaseClient.auth.getUser(); const userId = userData?.user?.id; if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data: inst } = await supabaseClient.from('institutions').select('id, type').eq('user_id', userId).maybeSingle();
    if (!inst?.id || (inst.type || '').toLowerCase() !== 'corporate') return res.status(403).json({ error: 'Forbidden' });
    const { data: proj } = await supabaseClient.from('freelance_projects').select('id, corporate_institution_id').eq('id', projectId).maybeSingle();
    if (!proj || proj.corporate_institution_id !== inst.id) return res.status(403).json({ error: 'Forbidden' });
    let query = supabaseClient
      .from('freelance_applications')
      .select(`*, student:student_id (
        id,
        name,
        email,
        photo_url,
        city,
        state,
        address,
        degree,
        specialization,
        year,
        availability,
        preferred_engagement,
        preferred_work_mode,
        linkedin_url,
        github_url,
        portfolio_url,
        skills,
        resume_url
      )`)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (status && ['pending','shortlisted','rejected'].includes(String(status))) {
      query = query.eq('status', String(status));
    }
    const { data, error } = await query.range(offset, offset + limitNum - 1);
    if (error) throw error;
    let rows = Array.isArray(data) ? data : [];
    // Exclude already-submitted applications from shortlisted (approved) tab
    if (String(status) === 'shortlisted' && rows.length > 0) {
      const appIds = rows.map(r => r.id).filter(Boolean)
      const { data: subs } = await supabaseClient
        .from('freelance_submissions')
        .select('application_id')
        .in('application_id', appIds)
      const submittedIds = new Set((subs || []).map(s => s.application_id))
      rows = rows.filter(r => !submittedIds.has(r.id))
    }

    // Counts across stages
    const { count: pendingCount } = await supabaseClient
      .from('freelance_applications')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'pending');
    const { count: shortlistedCount } = await supabaseClient
      .from('freelance_applications')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'shortlisted');
    const { count: submittedCount } = await supabaseClient
      .from('freelance_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    const approvedCount = Math.max((shortlistedCount || 0) - (submittedCount || 0), 0)

    res.json({ data: rows, counts: { pending: pendingCount || 0, approved: approvedCount, submitted: submittedCount || 0, total: (pendingCount || 0) + approvedCount + (submittedCount || 0) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// Submissions list for a project (corporate)
async function listProjectSubmissions(req, res) {
  try {
    const projectId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const offset = (pageNum - 1) * limitNum;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.substring(7);
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await supabaseClient.auth.getUser(); const userId = userData?.user?.id; if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data: inst } = await supabaseClient.from('institutions').select('id, type').eq('user_id', userId).maybeSingle();
    if (!inst?.id || (inst.type || '').toLowerCase() !== 'corporate') return res.status(403).json({ error: 'Forbidden' });
    const { data: proj } = await supabaseClient.from('freelance_projects').select('id, corporate_institution_id').eq('id', projectId).maybeSingle();
    if (!proj || proj.corporate_institution_id !== inst.id) return res.status(403).json({ error: 'Forbidden' });
    const { data, error } = await supabaseClient
      .from('freelance_submissions')
      .select(`*, student:student_id (
        id,
        name,
        email,
        photo_url,
        city,
        state,
        address,
        degree,
        specialization,
        year,
        availability,
        preferred_engagement,
        preferred_work_mode,
        linkedin_url,
        github_url,
        portfolio_url,
        skills,
        resume_url
      ), application:application_id ( id, status )`)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    // Counts across stages
    const { count: pendingCount } = await supabaseClient
      .from('freelance_applications')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'pending');
    const { count: shortlistedCount } = await supabaseClient
      .from('freelance_applications')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'shortlisted');
    const { count: submittedCount } = await supabaseClient
      .from('freelance_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    const approvedCount = Math.max((shortlistedCount || 0) - (submittedCount || 0), 0)

    res.json({ data: rows, counts: { pending: pendingCount || 0, approved: approvedCount, submitted: submittedCount || 0, total: (pendingCount || 0) + approvedCount + (submittedCount || 0) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = {
  listPublic,
  createProject,
  listProjects,
  listVisibleProjects,
  apply,
  updateApplicationStatus,
  createSubmission,
  getApplicationStatus,
  listMyApplications,
  listMySubmissions,
  getProjectById,
  listProjectApplications,
  listProjectSubmissions,
};
