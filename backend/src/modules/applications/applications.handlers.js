/**
 * Application HTTP handlers extracted from server.js (behavior-preserving).
 */
const { createClient } = require('@supabase/supabase-js');
const notificationService = require('../../../services/notificationService');
const socketService = require('../../../services/socketService');
const institutionAccess = require('../../../auth/institutionAccess');
const expertAccess = require('../../../auth/expertAccess');
const superAdminAuth = require('../../../auth/superAdminAuth');
const privacyMask = require('../../../privacyMask');
const { normalizeInterviewAvailability } = require('./applications.dto');

const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

async function list(req, res) {
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

    let queryClient = supabaseClient;
    if (institution_id) {
      const access = await institutionAccess.resolveInstitutionAccess(req, String(institution_id));
      if (!access) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      queryClient = institutionAccess.getWriteClientForInstitution(access);
    } else if (expert_id) {
      const access = await expertAccess.resolveExpertAccess(req, String(expert_id));
      if (!access) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      queryClient = expertAccess.getWriteClientForExpert(access);
    }

    let query = queryClient
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
          qualifications_url,
          domain_expertise,
          subskills,
          expert_types,
          expert_services,
          hourly_rate,
          resume_url,
          availability,
          open_to_work,
          available_on_demand,
          is_verified,
          kyc_status,
          rating,
          total_ratings,
          linkedin_url,
          current_designation,
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
          compensation_unit,
          unit_quantity,
          duration_per_unit,
          institution_gross_per_unit,
          institution_gross_total,
          schedule_notes,
          hours_per_day,
          required_expertise,
          domain_expertise,
          subskills,
          status,
          max_applications,
          opening_count,
          interview_period_interval,
          requirement_pdf_url,
          institutions (
            id,
            name,
            logo_url,
            city,
            state
          )
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

    const { role: appViewerRole } = await superAdminAuth.getUserRoleFromRequest(req);
    const maskedApps = privacyMask.maskApplicationsList(data || [], appViewerRole);

    // Get counts for all statuses for the same filters
    let countQuery = queryClient
      .from('applications')
      .select('status');

    if (expert_id) countQuery = countQuery.eq('expert_id', expert_id);
    if (project_id) countQuery = countQuery.eq('project_id', project_id);
    if (institution_id) countQuery = countQuery.eq('institution_id', institution_id);

    const { data: allApplications, error: countError } = await countQuery;

    if (countError) {
      console.log('Count query error:', countError);
      res.json(maskedApps);
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
        data: maskedApps,
        counts: counts
      });
    }
  } catch (error) {
    console.log('GET applications error:', error);
    res.status(500).json({ error: error.message });
  }
}

// New endpoint just for getting application counts (for stats display)
async function counts(req, res) {
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

    let queryClient = supabaseClient;
    if (institution_id) {
      const access = await institutionAccess.resolveInstitutionAccess(req, String(institution_id));
      if (!access) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      queryClient = institutionAccess.getWriteClientForInstitution(access);
    } else if (expert_id) {
      const access = await expertAccess.resolveExpertAccess(req, String(expert_id));
      if (!access) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      queryClient = expertAccess.getWriteClientForExpert(access);
    }

    let query = queryClient
      .from('applications')
      .select('status');

    if (expert_id) query = query.eq('expert_id', expert_id);
    if (project_id) query = query.eq('project_id', project_id);
    if (institution_id) {
      // applications may not have institution_id — scope via this institution's projects
      const { data: projectRows, error: projectErr } = await queryClient
        .from('projects')
        .select('id')
        .eq('institution_id', institution_id);
      if (projectErr) throw projectErr;
      const projectIds = (projectRows || []).map((p) => p.id).filter(Boolean);
      if (!projectIds.length) {
        return res.json({
          total: 0,
          pending: 0,
          interview: 0,
          accepted: 0,
          rejected: 0,
        });
      }
      query = query.in('project_id', projectIds);
    }
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
}

async function create(req, res) {
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
        const role = userData.user.user_metadata?.role;
        if (role === 'super_admin') {
          const actingExpertId = expertAccess.parseActingExpertId(req);
          if (!actingExpertId) {
            return res.status(400).json({ error: 'X-Acting-Expert-Id is required for super admin' });
          }
          const access = await expertAccess.resolveExpertAccess(req, actingExpertId);
          if (!access) {
            return res.status(403).json({ error: 'Unauthorized' });
          }
          req.body.expert_id = access.expert.id;
          supabaseClient = expertAccess.getWriteClientForExpert(access);
          console.log('Super admin acting as expert:', req.body.expert_id);
        } else {
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
        }
      } else {
        console.log('No authenticated user found');
        return res.status(401).json({ error: 'Authentication required' });
      }
    } else {
      console.log('No auth token provided');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    req.body.interview_availability = normalizeInterviewAvailability(req.body.interview_availability);
    if (req.body.proposed_rate !== undefined && req.body.proposed_rate !== '') {
      const proposedRate = Number(req.body.proposed_rate);
      req.body.proposed_rate = Number.isFinite(proposedRate) && proposedRate > 0 ? proposedRate : null;
    }

    if (req.body.screening_answers != null) {
      const answers = String(req.body.screening_answers).trim();
      req.body.screening_answers = answers || null;
    } else {
      req.body.screening_answers = null;
    }

    // Rate intent / compensation snapshot (MVC service — keep create path thin)
    try {
      const serviceClient = institutionAccess.getServiceClient();
      const ApplicationRateService = require('./applicationRate.service');
      const rateService = new ApplicationRateService(serviceClient);
      const { data: projectForRate } = await serviceClient
        .from('projects')
        .select('compensation_unit, unit_quantity, duration_per_unit, institution_gross_per_unit, institution_gross_total, hourly_rate, total_budget, duration_hours')
        .eq('id', req.body.project_id)
        .maybeSingle();
      Object.assign(req.body, rateService.prepareCreatePayload(req.body, projectForRate || {}));
    } catch (ratePrepError) {
      const status = ratePrepError.status || 400;
      return res.status(status).json({ error: ratePrepError.message || 'Invalid rate preference' });
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
}

async function update(req, res) {
  try {
    const service = institutionAccess.getServiceClient();
    const { data: appRow, error: appErr } = await service
      .from('applications')
      .select('id, project_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!appRow) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const { data: projRow, error: projErr } = await service
      .from('projects')
      .select('institution_id')
      .eq('id', appRow.project_id)
      .maybeSingle();
    if (projErr) throw projErr;
    if (!projRow) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const access = await institutionAccess.resolveInstitutionAccess(req, projRow.institution_id);
    if (!access) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const supabaseClient = institutionAccess.getWriteClientForInstitution(access);

    // Handle interview_date field if provided
    const updateData = { ...req.body };
    if (req.body.status === 'interview' && !req.body.interview_date) {
      return res.status(400).json({ error: 'Interview date and time are required' });
    }
    if (updateData.interview_date) {
      // Convert to proper timestamp format
      updateData.interview_date = new Date(updateData.interview_date).toISOString();
    }
    if (updateData.interview_availability !== undefined) {
      updateData.interview_availability = normalizeInterviewAvailability(updateData.interview_availability);
    }
    if (updateData.final_hourly_rate !== undefined && updateData.final_hourly_rate !== '') {
      const finalRate = Number(updateData.final_hourly_rate);
      updateData.final_hourly_rate = Number.isFinite(finalRate) && finalRate > 0 ? finalRate : null;
    }

    const { data, error } = await supabaseClient
      .from('applications')
      .update(updateData)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    // Send notification to expert about application status change
    try {
      if (['pending', 'interview', 'accepted', 'rejected'].includes(req.body.status)) {
        // Get application details for notification
        const { data: applicationData } = await service
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
            // Email + realtime for selected/accepted
            await notificationService.sendExpertSelectedWithBookingNotification(
              applicationData.experts.email,
              applicationData.projects.title,
              applicationData.projects.institutions.name,
              applicationData.project_id
            );
            socketService.sendExpertSelectedWithBookingNotification(
              applicationData.experts.user_id,
              applicationData.projects.title,
              applicationData.projects.institutions.name,
              applicationData.project_id
            );
          } else if (status === 'rejected') {
            await notificationService.sendApplicationStatusNotification(
              applicationData.experts.email,
              applicationData.projects.title,
              applicationData.projects.institutions.name,
              'rejected',
              applicationData.project_id
            );
          } else if (status === 'pending') {
            await notificationService.sendExpertInterestShownNotification(
              applicationData.experts.email,
              applicationData.projects.title,
              applicationData.projects.institutions.name,
              applicationData.project_id
            );
            socketService.sendExpertInterestShownNotification(
              applicationData.experts.user_id,
              applicationData.projects.title,
              applicationData.projects.institutions.name,
              applicationData.project_id
            );
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
}

module.exports = {
  list,
  counts,
  create,
  update,
};
