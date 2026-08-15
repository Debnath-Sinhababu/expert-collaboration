/**
 * Project HTTP handlers extracted from server.js (behavior-preserving).
 */
const { createClient } = require('@supabase/supabase-js');
const ImageUploadService = require('../../../services/imageUploadService');
const institutionAccess = require('../../../auth/institutionAccess');
const superAdminAuth = require('../../../auth/superAdminAuth');
const privacyMask = require('../../../privacyMask');
const projectEditRequestService = require('../../../services/projectEditRequestService');
const {
  applyProjectStatusListFilter,
  maybeSyncProjectStatuses,
} = require('../../shared/projectStatus');
const { ACTIVE_BOOKING_STATUSES_FOR_STATS, isActiveBookingStatus } = require('../../shared/compensation');
const {
  normalizeScreeningQuestionsBody,
  normalizePositiveInt,
  normalizeProjectCompensationFields,
} = require('./projects.dto');
const { calculateProjectMatchScore } = require('./projects.matchScore');

const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

async function list(req, res) {
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
      has_active_bookings = '',
      institution_id = '',
      expert_id = '', // used for filtering out applied projects
      domain_expertise = '', // new parameter for similar projects
      required_expertise = '' // new parameter for similar projects
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    console.log(`Pagination: page=${page}, limit=${limit}, offset=${offset}`);

    // Forward-only date transitions (open→running, open|running→completed). Cooldown avoids per-request load.
    try {
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await maybeSyncProjectStatuses(serviceClient);
    } catch (syncErr) {
      console.warn('Project status sync skipped:', syncErr?.message || syncErr);
    }

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
    if (status) {
      query = applyProjectStatusListFilter(query, status);
    }
    if (institution_id) query = query.eq('institution_id', institution_id);

    const wantsActiveBookingsFilter =
      has_active_bookings === 'true' ||
      has_active_bookings === true ||
      String(has_active_bookings).toLowerCase() === '1';
    if (wantsActiveBookingsFilter) {
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      let activeBookingQuery = serviceClient
        .from('bookings')
        .select('project_id')
        .in('status', ACTIVE_BOOKING_STATUSES_FOR_STATS);
      if (institution_id) {
        activeBookingQuery = activeBookingQuery.eq('institution_id', institution_id);
      }
      const { data: activeBookingRows, error: activeBookingError } = await activeBookingQuery;
      if (activeBookingError) throw activeBookingError;
      const projectIdsWithActiveBookings = [
        ...new Set((activeBookingRows || []).map((row) => row.project_id).filter(Boolean)),
      ];
      if (projectIdsWithActiveBookings.length === 0) {
        console.log('Projects query result: 0 projects returned (no active bookings match)');
        const { role: emptyRole } = await superAdminAuth.getUserRoleFromRequest(req);
        return res.json(privacyMask.maskProjectsList([], emptyRole));
      }
      query = query.in('id', projectIdsWithActiveBookings);
    }
    
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

      const { data: bookingRows, error: bookingCountsError } = await supabase
        .from('bookings')
        .select('project_id, status')
        .in('project_id', projectIds);

      if (bookingCountsError) {
        console.log('Error fetching booking counts:', bookingCountsError);
      } else {
        const projectBookingCounts = {};
        (bookingRows || []).forEach((booking) => {
          if (!projectBookingCounts[booking.project_id]) {
            projectBookingCounts[booking.project_id] = { total: 0, active: 0 };
          }
          projectBookingCounts[booking.project_id].total++;
          if (isActiveBookingStatus(booking.status)) {
            projectBookingCounts[booking.project_id].active++;
          }
        });
        data.forEach((project) => {
          project.bookingCounts = projectBookingCounts[project.id] || { total: 0, active: 0 };
        });
      }
    }

    console.log(`Projects query result: ${data?.length || 0} projects returned`);
    const { role: projectsListRole } = await superAdminAuth.getUserRoleFromRequest(req);
    res.json(privacyMask.maskProjectsList(data || [], projectsListRole));

  } catch (error) {
    console.error('GET projects error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function listTypes(req, res) {
  try {
    const baseTypes = [
      'guest_lecture',
      'fdp',
      'workshop',
      'curriculum_dev',
      'research_collaboration',
      'training_program',
      'consultation',
      'other'
    ];
    const serviceClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error } = await serviceClient
      .from('projects')
      .select('type')
      .not('type', 'is', null)
      .limit(1000);
    if (error) throw error;

    const seen = new Set();
    const normalize = (value) => String(value || '').trim();
    const labelize = (value) =>
      normalize(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    const options = [...baseTypes, ...(data || []).map((row) => row.type)]
      .map(normalize)
      .filter(Boolean)
      .filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((value) => ({ value, label: labelize(value) }))
      .sort((a, b) => {
        const ai = baseTypes.indexOf(a.value);
        const bi = baseTypes.indexOf(b.value);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        return a.label.localeCompare(b.label);
      });
    res.json(options);
  } catch (error) {
    console.error('GET project types error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function counts(req, res) {
  try {
    const { institution_id } = req.query;
    if (!institution_id) {
      return res.status(400).json({ error: 'institution_id is required' });
    }

    const access = await institutionAccess.resolveInstitutionAccess(req, String(institution_id));
    if (!access) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const queryClient = institutionAccess.getWriteClientForInstitution(access);
    const { data, error } = await queryClient
      .from('projects')
      .select('status')
      .eq('institution_id', institution_id);

    if (error) throw error;

    const counts = {
      total: data?.length || 0,
      open: 0,
      running: 0,
      completed: 0,
      closed: 0,
    };

    (data || []).forEach((row) => {
      const status = normalizeProjectStatus(row.status);
      if (status === 'open') counts.open++;
      else if (status === 'running') counts.running++;
      else if (status === 'completed') counts.completed++;
      else if (status === 'closed') counts.closed++;
    });

    res.json(counts);
  } catch (error) {
    console.error('GET project counts error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function create(req, res) {
  try {
    console.log('=== PROJECT CREATION DEBUG ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    const institutionIdFromBody = req.body.institution_id;

    const access = await institutionAccess.resolveInstitutionAccess(req, institutionIdFromBody);
    if (!access) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const supabaseClient = institutionAccess.getWriteClientForInstitution(access);
    
    // Normalize array-like fields that may arrive as comma-separated strings
    const rawBody = req.body || {};

    const normalizeArrayField = (value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string' && value.trim().length > 0) {
        return value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    };

    const normalizeScreeningQuestions = normalizeScreeningQuestionsBody;
    const workplaceType =
      rawBody.workplace_type && ['remote', 'hybrid', 'on_site'].includes(String(rawBody.workplace_type))
        ? String(rawBody.workplace_type)
        : null;
    const employmentType =
      rawBody.employment_type &&
      ['full_time', 'part_time', 'contract'].includes(String(rawBody.employment_type))
        ? String(rawBody.employment_type)
        : null;
    const jobLocation =
      rawBody.job_location != null && String(rawBody.job_location).trim() !== ''
        ? String(rawBody.job_location).trim()
        : null;
    const interviewPeriodInterval =
      rawBody.interview_period_interval != null && String(rawBody.interview_period_interval).trim() !== ''
        ? String(rawBody.interview_period_interval).trim()
        : null;

    const projectPayload = {
      ...rawBody,
      required_expertise: normalizeArrayField(rawBody.required_expertise),
      subskills: normalizeArrayField(rawBody.subskills),
      screening_questions: normalizeScreeningQuestions(rawBody.screening_questions),
      job_location: jobLocation,
      interview_period_interval: interviewPeriodInterval,
      workplace_type: workplaceType,
      employment_type: employmentType,
      opening_count: normalizePositiveInt(rawBody.opening_count || rawBody.openings, 1)
    };
    delete projectPayload.interview_period_start_date;
    delete projectPayload.interview_period_end_date;
    normalizeProjectCompensationFields(projectPayload);

    // Handle optional requirement PDF upload
    let requirementPdfData = null;
    const requirementPdfFile = req.files?.requirement_pdf?.[0];
    if (requirementPdfFile) {
      try {
        requirementPdfData = await ImageUploadService.uploadDocument(
          requirementPdfFile.buffer,
          'institution-contract-requirements',
          null,
          requirementPdfFile.mimetype,
          requirementPdfFile.originalname
        );
      } catch (e) {
        console.error('Requirement PDF upload exception:', e);
        return res.status(500).json({ error: 'Requirement PDF upload failed' });
      }

      if (!requirementPdfData?.success) {
        return res.status(500).json({
          error: `Requirement PDF upload failed: ${requirementPdfData?.error || 'Unknown error'}`
        });
      }
    }

    const insertPayload = {
      ...projectPayload,
      requirement_pdf_url: requirementPdfData?.url || null,
      requirement_pdf_public_id: requirementPdfData?.publicId || null
    };

    const { data, error } = await supabaseClient
      .from('projects')
      .insert([insertPayload])
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
}

async function getById(req, res) {
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
    
    const { role: projectDetailRole } = await superAdminAuth.getUserRoleFromRequest(req);
    res.json(privacyMask.maskProjectRow(data, projectDetailRole));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function update(req, res) {
  try {
    const service = institutionAccess.getServiceClient();
    const { data: projectRow, error: projErr } = await service
      .from('projects')
      .select('id, institution_id, requirement_pdf_url, requirement_pdf_public_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (projErr) throw projErr;
    if (!projectRow) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const access = await institutionAccess.resolveInstitutionAccess(req, projectRow.institution_id);
    if (!access) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const supabaseClient = institutionAccess.getWriteClientForInstitution(access);

    const normalizeArrayField = (value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string' && value.trim().length > 0) {
        return value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    };

    const updateBody = { ...req.body };
    if (updateBody.required_expertise !== undefined) {
      updateBody.required_expertise = normalizeArrayField(updateBody.required_expertise);
    }
    if (updateBody.subskills !== undefined) {
      updateBody.subskills = normalizeArrayField(updateBody.subskills);
    }
    if (updateBody.screening_questions !== undefined) {
      updateBody.screening_questions = normalizeScreeningQuestionsBody(updateBody.screening_questions);
    }
    if (updateBody.workplace_type !== undefined && updateBody.workplace_type !== null && updateBody.workplace_type !== '') {
      const w = String(updateBody.workplace_type);
      updateBody.workplace_type = ['remote', 'hybrid', 'on_site'].includes(w) ? w : null;
    }
    if (updateBody.employment_type !== undefined && updateBody.employment_type !== null && updateBody.employment_type !== '') {
      const e = String(updateBody.employment_type);
      updateBody.employment_type = ['full_time', 'part_time', 'contract'].includes(e) ? e : null;
    }
    if (updateBody.job_location !== undefined) {
      updateBody.job_location =
        updateBody.job_location != null && String(updateBody.job_location).trim() !== ''
          ? String(updateBody.job_location).trim()
          : null;
    }
    if (updateBody.opening_count !== undefined || updateBody.openings !== undefined) {
      updateBody.opening_count = normalizePositiveInt(updateBody.opening_count || updateBody.openings, 1);
      delete updateBody.openings;
    }
    if (updateBody.interview_period_interval !== undefined) {
      updateBody.interview_period_interval =
        updateBody.interview_period_interval != null && String(updateBody.interview_period_interval).trim() !== ''
          ? String(updateBody.interview_period_interval).trim()
          : null;
    }
    normalizeProjectCompensationFields(updateBody);
    delete updateBody.interview_period_start_date;
    delete updateBody.interview_period_end_date;
    delete updateBody.institution_id;

    if (updateBody.status !== undefined && updateBody.status !== null && updateBody.status !== '') {
      updateBody.status = assertCanonicalProjectStatus(updateBody.status);
    }
    // Institution workspace cannot change lifecycle status via edit form.
    if (projectEditRequestService.shouldRequireInstitutionEditApproval(access)) {
      delete updateBody.status;
    }

    const requirementPdfFile = req.files?.requirement_pdf?.[0];
    if (requirementPdfFile) {
      try {
        const requirementPdfData = await ImageUploadService.uploadDocument(
          requirementPdfFile.buffer,
          'institution-contract-requirements',
          null,
          requirementPdfFile.mimetype,
          requirementPdfFile.originalname
        );
        if (!requirementPdfData?.success) {
          return res.status(500).json({
            error: `Requirement PDF upload failed: ${requirementPdfData?.error || 'Unknown error'}`
          });
        }
        updateBody.requirement_pdf_url = requirementPdfData.url || null;
        updateBody.requirement_pdf_public_id = requirementPdfData.publicId || null;
      } catch (e) {
        console.error('Requirement PDF upload exception on update:', e);
        return res.status(500).json({ error: 'Requirement PDF upload failed' });
      }
    }

    if (projectEditRequestService.shouldRequireInstitutionEditApproval(access)) {
      const needsApproval = await projectEditRequestService.projectHasBookings(req.params.id, service);
      if (needsApproval) {
        const { data: currentProject, error: currentErr } = await service
          .from('projects')
          .select('*')
          .eq('id', req.params.id)
          .maybeSingle();
        if (currentErr) throw currentErr;

        const editRequest = await projectEditRequestService.queueInstitutionProjectEdit({
          projectId: req.params.id,
          institutionId: projectRow.institution_id,
          proposedPayload: updateBody,
          previousSnapshot: projectEditRequestService.pickProjectSnapshot(currentProject || {}),
          client: service,
        });

        return res.status(202).json({
          pendingApproval: true,
          message: 'Changes submitted for admin approval. This project has bookings, so edits are reviewed before going live.',
          editRequest,
        });
      }
    }

    const { data, error } = await supabaseClient
      .from('projects')
      .update(updateBody)
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
}

async function getEditRequest(req, res) {
  try {
    const service = institutionAccess.getServiceClient();
    const { data: projectRow, error: projErr } = await service
      .from('projects')
      .select('id, institution_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (projErr) throw projErr;
    if (!projectRow) return res.status(404).json({ error: 'Project not found' });

    const access = await institutionAccess.resolveInstitutionAccess(req, projectRow.institution_id);
    if (!access) return res.status(403).json({ error: 'Unauthorized' });

    const pending = await projectEditRequestService.getPendingEditRequest(req.params.id, service);
    res.json({
      pending: pending || null,
      hasBookings: await projectEditRequestService.projectHasBookings(req.params.id, service),
      requiresApproval: await projectEditRequestService.projectHasBookings(req.params.id, service),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function listRecommended(req, res) {
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
    const { role: recRole } = await superAdminAuth.getUserRoleFromRequest(req);
    res.json(privacyMask.maskProjectsList(recommendations, recRole));

  } catch (error) {
    console.error('GET /api/projects/recommended error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  list,
  listTypes,
  counts,
  create,
  getById,
  update,
  getEditRequest,
  listRecommended,
};
