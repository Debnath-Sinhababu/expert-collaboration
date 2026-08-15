/**
 * Booking HTTP handlers extracted from server.js (behavior-preserving).
 */
const { createClient } = require('@supabase/supabase-js');
const notificationService = require('../../../services/notificationService');
const socketService = require('../../../services/socketService');
const institutionAccess = require('../../../auth/institutionAccess');
const expertAccess = require('../../../auth/expertAccess');
const superAdminAuth = require('../../../auth/superAdminAuth');
const privacyMask = require('../../../privacyMask');

const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

async function create(req, res) {
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

    if (req.body.application_id) {
      try {
        const serviceClient = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const { resolveBookingAmount } = require('../../shared/compensation');
        const { data: applicationForPrice } = await serviceClient
          .from('applications')
          .select('final_gross_per_unit, final_hourly_rate, proposed_rate, projects(hourly_rate, institution_gross_per_unit, institution_gross_total, compensation_unit, unit_quantity, total_budget, duration_hours)')
          .eq('id', req.body.application_id)
          .maybeSingle();
        const resolvedAmount = resolveBookingAmount(
          applicationForPrice,
          applicationForPrice?.projects
        );
        if (Number.isFinite(resolvedAmount) && resolvedAmount > 0) {
          req.body.amount = resolvedAmount;
        }
      } catch (priceError) {
        console.warn('Booking price fallback skipped:', priceError.message);
      }
    }

    
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
}

async function list(req, res) {
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
          compensation_unit,
          unit_quantity,
          duration_per_unit,
          hours_per_day,
          institution_gross_per_unit,
          institution_gross_total,
          required_expertise,
          domain_expertise,
          subskills,
          status,
          max_applications,
          opening_count,
          interview_period_interval,
          requirement_pdf_url
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
    
    const { role: bookRole } = await superAdminAuth.getUserRoleFromRequest(req);
    const bookMode = institution_id ? 'institution' : expert_id ? 'expert' : null;
    const maskedBookingRows = bookMode
      ? privacyMask.maskBookingsPayload(data || [], bookRole, bookMode)
      : data || [];

    // Get counts for all bookings for the same filters
    let countQuery = queryClient
      .from('bookings')
      .select('status');
    
    if (expert_id) countQuery = countQuery.eq('expert_id', expert_id);
    if (institution_id) countQuery = countQuery.eq('institution_id', institution_id);
    if (project_id) countQuery = countQuery.eq('project_id', project_id);
    
    const { data: allBookings, error: countError } = await countQuery;
    
    if (countError) {
      console.log('Booking count query error:', countError);
      res.json(maskedBookingRows);
    } else {
      // Calculate counts by status
      const counts = {
        total: allBookings?.length || 0,
        in_progress: allBookings?.filter(b =>
          b.status === 'in_progress' ||
          b.status === 'completion_requested' ||
          b.status === 'cancellation_requested' ||
          b.status === 'confirmed'
        ).length || 0,
        completion_requested: allBookings?.filter(b => b.status === 'completion_requested').length || 0,
        cancellation_requested: allBookings?.filter(b => b.status === 'cancellation_requested').length || 0,
        completed: allBookings?.filter(b => b.status === 'completed').length || 0,
        cancelled: allBookings?.filter(b => b.status === 'cancelled').length || 0,
        pending: allBookings?.filter(b => b.status === 'pending').length || 0
      };
      
      res.json({
        data: maskedBookingRows,
        counts: counts
      });
    }
  } catch (error) {
    console.error('Booking fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}

// New endpoint just for getting booking counts (for stats display)
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

    const { expert_id, institution_id, project_id } = req.query;

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
      in_progress: data?.filter(b =>
        b.status === 'in_progress' ||
        b.status === 'completion_requested' ||
        b.status === 'cancellation_requested' ||
        b.status === 'confirmed'
      ).length || 0,
      completion_requested: data?.filter(b => b.status === 'completion_requested').length || 0,
      cancellation_requested: data?.filter(b => b.status === 'cancellation_requested').length || 0,
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
}

async function update(req, res) {
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

    // Experts cannot unilaterally mark a booking completed/cancelled — use request flows.
    if (
      updateData &&
      (String(updateData.status) === 'completed' || String(updateData.status) === 'cancelled')
    ) {
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data: bookingRow } = await serviceClient
        .from('bookings')
        .select('id, expert_id, institution_id, projects(institution_id)')
        .eq('id', id)
        .maybeSingle();

      if (bookingRow) {
        const institutionId = bookingRow.institution_id || bookingRow.projects?.institution_id;
        const institutionOk = institutionId
          ? await institutionAccess.resolveInstitutionAccess(req, institutionId)
          : null;
        const expertOk = await expertAccess.resolveExpertAccess(req, bookingRow.expert_id);
        const role = userData?.user?.user_metadata?.role || userData?.user?.app_metadata?.role;

        if (!institutionOk && expertOk && role !== 'super_admin') {
          return res.status(403).json({
            error:
              String(updateData.status) === 'cancelled'
                ? 'Experts cannot cancel bookings directly. Request cancellation for institution approval.'
                : 'Experts cannot mark bookings completed directly. Request completion for institution approval.',
          });
        }
      }
    }
    
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
}

async function remove(req, res) {
  try {
    const { user: delUser } = await institutionAccess.getAuthedUserFromRequest(req);
    if (delUser && institutionAccess.getRole(delUser) === 'super_admin') {
      return res.status(403).json({ error: 'Super admin delete is not allowed' });
    }

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

    // Experts cannot delete bookings — use cancellation request flow.
    {
      const serviceClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data: bookingRow } = await serviceClient
        .from('bookings')
        .select('id, expert_id, institution_id, projects(institution_id)')
        .eq('id', id)
        .maybeSingle();
      if (bookingRow) {
        const institutionId = bookingRow.institution_id || bookingRow.projects?.institution_id;
        const institutionOk = institutionId
          ? await institutionAccess.resolveInstitutionAccess(req, institutionId)
          : null;
        const expertOk = await expertAccess.resolveExpertAccess(req, bookingRow.expert_id);
        const role = userData?.user?.user_metadata?.role || userData?.user?.app_metadata?.role;
        if (!institutionOk && expertOk && role !== 'super_admin') {
          return res.status(403).json({
            error:
              'Experts cannot delete bookings. Request cancellation for institution approval.',
          });
        }
      }
    }
    
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
}

module.exports = {
  create,
  list,
  counts,
  update,
  remove,
};
