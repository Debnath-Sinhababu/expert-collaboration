const { createServiceClient } = require('../../config/supabase');

function tableMissing(error) {
  return error && (error.code === '42P01' || /relation .* does not exist/i.test(error.message || ''));
}

function relationMissing(error) {
  return error && (/relationship|schema cache|foreign key/i.test(error.message || '') || error.code === 'PGRST200');
}

function missingColumnName(error) {
  const message = error?.message || '';
  const sqlMatch = message.match(/column "?([^"\s]+)"? (?:of relation "[^"]+" )?does not exist/i);
  if (sqlMatch?.[1]) return sqlMatch[1];
  const schemaMatch = message.match(/Could not find the '([^']+)' column/i);
  return schemaMatch?.[1] || null;
}

async function countRows(client, table, apply) {
  let query = client.from(table).select('id', { count: 'exact', head: true });
  if (apply) query = apply(query);
  const { count, error } = await query;
  if (error) {
    if (tableMissing(error)) return 0;
    throw error;
  }
  return count || 0;
}

class SuperAdminRepository {
  constructor(client = createServiceClient()) {
    this.client = client;
  }

  async getOverviewStats() {
    const [
      experts,
      verifiedExperts,
      institutions,
      students,
      projects,
      internships,
      freelance,
      bookings,
      pendingAttendance,
    ] = await Promise.all([
      countRows(this.client, 'experts'),
      countRows(this.client, 'experts', (q) => q.eq('calxbook_verified', true)),
      countRows(this.client, 'institutions'),
      countRows(this.client, 'site_students'),
      countRows(this.client, 'projects'),
      countRows(this.client, 'internships'),
      countRows(this.client, 'freelance_projects'),
      countRows(this.client, 'bookings'),
      countRows(this.client, 'training_attendance_days', (q) => q.eq('status', 'pending_review')),
    ]);

    return {
      experts,
      verifiedExperts,
      institutions,
      students,
      projects,
      internships,
      freelance,
      bookings,
      pendingAttendance,
    };
  }

  async insertWithMissingColumnRetry(table, payload) {
    let nextPayload = { ...payload };
    for (let attempts = 0; attempts < 4; attempts += 1) {
      const { data, error } = await this.client
        .from(table)
        .insert([nextPayload])
        .select('*')
        .single();
      if (!error) return data;
      const missing = missingColumnName(error);
      if (!missing || !(missing in nextPayload)) throw error;
      delete nextPayload[missing];
    }
    const err = new Error(`Failed to insert ${table}`);
    err.statusCode = 500;
    throw err;
  }

  async findRequirementExpert(requirementId, requirementType, expertId) {
    const { data, error } = await this.client
      .from('super_admin_requirement_experts')
      .select('*')
      .eq('requirement_id', requirementId)
      .eq('requirement_type', requirementType)
      .eq('expert_id', expertId)
      .limit(1);
    if (error) {
      if (tableMissing(error)) return null;
      throw error;
    }
    return data?.[0] || null;
  }

  async updateWithMissingColumnRetry(table, id, payload) {
    let nextPayload = { ...payload };
    for (let attempts = 0; attempts < 4; attempts += 1) {
      const { data, error } = await this.client
        .from(table)
        .update(nextPayload)
        .eq('id', id)
        .select('*')
        .single();
      if (!error) return data;
      const missing = missingColumnName(error);
      if (!missing || !(missing in nextPayload)) throw error;
      delete nextPayload[missing];
    }
    const err = new Error(`Failed to update ${table}`);
    err.statusCode = 500;
    throw err;
  }

  async listAdmins({ page, limit, offset }) {
    const { data, error, count } = await this.client
      .from('super_admin_users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (tableMissing(error)) return { data: [], total: 0 };
      throw error;
    }

    return { data: data || [], total: count || 0, page, limit };
  }

  async findAdminByEmail(email) {
    const { data, error } = await this.client
      .from('super_admin_users')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error && !tableMissing(error)) throw error;
    return data?.[0] || null;
  }

  async findAdminById(id) {
    const { data, error } = await this.client
      .from('super_admin_users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error && !tableMissing(error)) throw error;
    return data || null;
  }

  async createAdminRecord(payload) {
    const { data, error } = await this.client
      .from('super_admin_users')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async saveAdminRecord(payload) {
    const existing = await this.findAdminByEmail(payload.email);
    if (existing) {
      const { data, error } = await this.client
        .from('super_admin_users')
        .update({
          auth_user_id: payload.auth_user_id,
          name: payload.name,
          status: payload.status,
          disabled_message: payload.disabled_message || null,
          permissions: payload.permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    try {
      return await this.createAdminRecord(payload);
    } catch (error) {
      if (error?.code !== '23505') throw error;
      const duplicate = await this.findAdminByEmail(payload.email);
      if (!duplicate) throw error;
      return this.updateAdminRecord(duplicate.id, {
        auth_user_id: payload.auth_user_id,
        name: payload.name,
        status: payload.status,
        permissions: payload.permissions,
      });
    }
  }

  async updateAdminRecord(id, payload) {
    const { data, error } = await this.client
      .from('super_admin_users')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async listProfiles(type, { page, limit, offset, search, interested }) {
    const table = type === 'institutions' ? 'institutions' : type === 'students' ? 'site_students' : 'experts';
    const select = type === 'students'
      ? 'id, name, email, phone, city, state, degree, institution_id, created_at, institutions:institution_id(id, name)'
      : type === 'institutions'
        ? 'id, name, email, phone, type, city, state, logo_url, created_at'
        : 'id, name, email, phone, city, state, domain_expertise, hourly_rate, is_verified, calxbook_verified, interested_in_services, expert_services, service_price, course_video_url, created_at';

    let query = this.client
      .from(table)
      .select(select, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const s = `%${String(search).trim()}%`;
      query = query.or(`name.ilike.${s},email.ilike.${s}`);
    }

    if (type === 'experts' && interested !== undefined) {
      query = query.eq('interested_in_services', Boolean(interested));
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0, page, limit };
  }

  async setExpertCalxbookVerification(id, visible) {
    const { data, error } = await this.client
      .from('experts')
      .update({ calxbook_verified: Boolean(visible), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, email, calxbook_verified')
      .single();
    if (error) throw error;
    return data;
  }

  async listRequirements({ page, limit, offset, type = 'all', search = '', status = 'all', institution_id = '' }) {
    const boundedEnd = type === 'all' ? offset + limit - 1 : offset + limit - 1;
    const boundedStart = type === 'all' ? 0 : offset;
    const needle = String(search || '').trim();
    const institutionId = String(institution_id || '').trim();

    const queryConfig = {
      project: {
        table: 'projects',
        institutionField: 'institution_id',
        select: 'id,title,description,type,status,created_at,institution_id,call_status,hourly_rate,total_budget,start_date,end_date,duration_hours,institutions:institution_id(id,name,email,type,city,state)',
        searchFields: 'title,description',
        map: (r) => ({ ...r, requirement_type: 'project' }),
      },
      internship: {
        table: 'internships',
        institutionField: 'corporate_institution_id',
        select: 'id,title,responsibilities,status,created_at,corporate_institution_id,call_status,stipend_min,stipend_max,location,work_mode,engagement,institutions:corporate_institution_id(id,name,email,type,city,state)',
        searchFields: 'title,responsibilities',
        map: (r) => ({
          ...r,
          requirement_type: 'internship',
          institution_id: r.corporate_institution_id,
          description: r.responsibilities,
        }),
      },
      freelance: {
        table: 'freelance_projects',
        institutionField: 'corporate_institution_id',
        select: 'id,title,description,status,created_at,corporate_institution_id,call_status,budget_min,budget_max,deadline,institutions:corporate_institution_id(id,name,email,type,city,state)',
        searchFields: 'title,description',
        map: (r) => ({
          ...r,
          requirement_type: 'freelance',
          institution_id: r.corporate_institution_id,
        }),
      },
    };

    const kinds = type === 'all' ? ['project', 'internship', 'freelance'] : [type];
    const rows = [];
    let total = 0;

    for (const kind of kinds) {
      const cfg = queryConfig[kind];
      if (!cfg) continue;

      let countQuery = this.client.from(cfg.table).select('id', { count: 'exact', head: true });
      let dataQuery = this.client
        .from(cfg.table)
        .select(cfg.select)
        .order('created_at', { ascending: false })
        .range(boundedStart, boundedEnd);

      if (status !== 'all') {
        const statusFilter = `call_status.eq.${status},status.eq.${status}`;
        countQuery = countQuery.or(statusFilter);
        dataQuery = dataQuery.or(statusFilter);
      }
      if (institutionId) {
        countQuery = countQuery.eq(cfg.institutionField, institutionId);
        dataQuery = dataQuery.eq(cfg.institutionField, institutionId);
      }
      if (needle) {
        const filter = cfg.searchFields
          .split(',')
          .map((field) => `${field}.ilike.%${needle}%`)
          .join(',');
        countQuery = countQuery.or(filter);
        dataQuery = dataQuery.or(filter);
      }

      const [{ count, error: countError }, { data, error }] = await Promise.all([countQuery, dataQuery]);
      if (countError && !tableMissing(countError)) throw countError;
      if (error && !tableMissing(error)) throw error;
      total += count || 0;
      rows.push(...(data || []).map(cfg.map));
    }

    rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const pagedRows = type === 'all' ? rows.slice(offset, offset + limit) : rows;

    return {
      data: pagedRows,
      total,
      page,
      limit,
      hasMore: total > offset + limit,
    };
  }

  async createProjectRequirement(payload) {
    const { data, error } = await this.client.from('projects').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }

  async createInternshipRequirement(payload) {
    const { data, error } = await this.client.from('internships').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }

  async createFreelanceRequirement(payload) {
    const { data, error } = await this.client.from('freelance_projects').insert([payload]).select().single();
    if (error) throw error;
    return data;
  }

  async getRequirementDetail(type, id) {
    const configs = {
      project: {
        table: 'projects',
        select: '*, institutions:institution_id(id,name,email,phone,type,city,state,website_url)',
        map: (row) => ({ ...row, requirement_type: 'project' }),
      },
      internship: {
        table: 'internships',
        select: '*, institutions:corporate_institution_id(id,name,email,phone,type,city,state,website_url)',
        map: (row) => ({
          ...row,
          requirement_type: 'internship',
          institution_id: row.corporate_institution_id,
          description: row.responsibilities,
        }),
      },
      freelance: {
        table: 'freelance_projects',
        select: '*, institutions:corporate_institution_id(id,name,email,phone,type,city,state,website_url)',
        map: (row) => ({
          ...row,
          requirement_type: 'freelance',
          institution_id: row.corporate_institution_id,
        }),
      },
    };
    const cfg = configs[type];
    if (!cfg) return null;

    const { data, error } = await this.client
      .from(cfg.table)
      .select(cfg.select)
      .eq('id', id)
      .maybeSingle();
    if (error) {
      if (tableMissing(error) || relationMissing(error)) return null;
      throw error;
    }
    if (!data) return null;

    const [pipeline, nativeApplications, bookings] = await Promise.all([
      this.listRequirementExperts(type, id),
      this.listNativeRequirementApplications(type, id),
      this.listRequirementBookings(type, id),
    ]);
    const attendanceSummary = this.buildAttendanceSummary(bookings);
    return {
      requirement: cfg.map(data),
      institution: data.institutions || null,
      pipeline,
      pipelineExperts: pipeline,
      nativeApplications,
      bookings,
      attendanceSummary,
      counts: this.buildRequirementCounts(pipeline, nativeApplications, bookings, attendanceSummary),
    };
  }

  buildRequirementCounts(pipeline, nativeApplications, bookings = [], attendanceSummary = {}) {
    const stages = ['added', 'interview_scheduled', 'selected', 'completed', 'rejected'];
    const counts = Object.fromEntries(stages.map((stage) => [stage, 0]));
    for (const item of pipeline || []) {
      counts[item.stage] = (counts[item.stage] || 0) + 1;
    }
    return {
      ...counts,
      pipeline_total: (pipeline || []).length,
      applications_total: (nativeApplications || []).length,
      bookings_total: (bookings || []).length,
      approved_hours: attendanceSummary.approved_hours || 0,
      completed_trainings: attendanceSummary.completed_trainings || 0,
    };
  }

  buildAttendanceSummary(bookings = []) {
    return bookings.reduce((summary, booking) => {
      summary.bookings += 1;
      if (booking.status === 'completed') summary.completed_trainings += 1;
      summary.approved_hours += Number(booking.approved_hours || 0);
      return summary;
    }, { bookings: 0, completed_trainings: 0, approved_hours: 0 });
  }

  async listRequirementBookings(type, id) {
    if (type !== 'project') return [];
    const { data, error } = await this.client
      .from('bookings')
      .select('*, experts(id,name,email,phone,photo_url,bio,city,state,domain_expertise,subskills,qualifications,hourly_rate,experience_years,rating,total_ratings,is_verified,kyc_status), institutions(id,name,email)')
      .eq('project_id', id)
      .order('created_at', { ascending: false });
    if (error) {
      if (tableMissing(error) || relationMissing(error)) return [];
      throw error;
    }

    const rows = data || [];
    const bookingIds = rows.map((booking) => booking.id);
    const { data: days, error: daysError } = bookingIds.length
      ? await this.client
          .from('training_attendance_days')
          .select('booking_id,status,effective_entry_at,effective_exit_at,expert_entry_at,expert_exit_at')
          .in('booking_id', bookingIds)
      : { data: [], error: null };
    if (daysError && !tableMissing(daysError)) throw daysError;

    const approvedHoursByBooking = {};
    for (const day of days || []) {
      if (day.status !== 'approved') continue;
      const entry = day.effective_entry_at || day.expert_entry_at;
      const exit = day.effective_exit_at || day.expert_exit_at;
      const minutes = entry && exit ? Math.max(0, new Date(exit) - new Date(entry)) / 60000 : 0;
      approvedHoursByBooking[day.booking_id] = (approvedHoursByBooking[day.booking_id] || 0) + minutes / 60;
    }

    return rows.map((booking) => ({
      ...booking,
      approved_hours: Math.round((approvedHoursByBooking[booking.id] || 0) * 100) / 100,
    }));
  }

  async listRequirementExperts(type, id) {
    const { data, error } = await this.client
      .from('super_admin_requirement_experts')
      .select('*')
      .eq('requirement_type', type)
      .eq('requirement_id', id);
    if (error) {
      if (tableMissing(error) || relationMissing(error)) return [];
      throw error;
    }
    const rows = await this.hydrateRequirementExpertRows(data || []);
    if (!rows.length) return rows;

    const expertIds = [...new Set(rows.map((row) => row.expert_id).filter(Boolean))];
    let bookingsQuery = this.client
      .from('bookings')
      .select('id,expert_id,project_id,status,hours_booked')
      .in('expert_id', expertIds);
    if (type === 'project') bookingsQuery = bookingsQuery.eq('project_id', id);
    const { data: bookings, error: bookingsError } = await bookingsQuery;
    if (bookingsError && !tableMissing(bookingsError)) throw bookingsError;

    const bookingIds = (bookings || []).map((booking) => booking.id);
    const { data: attendance, error: attendanceError } = bookingIds.length
      ? await this.client
          .from('training_attendance_days')
          .select('booking_id,status,effective_entry_at,effective_exit_at,expert_entry_at,expert_exit_at')
          .in('booking_id', bookingIds)
      : { data: [], error: null };
    if (attendanceError && !tableMissing(attendanceError)) throw attendanceError;

    const approvedHoursByBooking = {};
    for (const day of attendance || []) {
      if (day.status !== 'approved') continue;
      const entry = day.effective_entry_at || day.expert_entry_at;
      const exit = day.effective_exit_at || day.expert_exit_at;
      const minutes = entry && exit ? Math.max(0, new Date(exit) - new Date(entry)) / 60000 : 0;
      approvedHoursByBooking[day.booking_id] = (approvedHoursByBooking[day.booking_id] || 0) + minutes / 60;
    }

    const statsByExpert = {};
    for (const booking of bookings || []) {
      const stat = statsByExpert[booking.expert_id] || { bookings: 0, completed_trainings: 0, approved_hours: 0 };
      stat.bookings += 1;
      if (booking.status === 'completed') stat.completed_trainings += 1;
      stat.approved_hours += approvedHoursByBooking[booking.id] || 0;
      statsByExpert[booking.expert_id] = stat;
    }

    return rows.map((row) => ({
      ...row,
      expert_stats: {
        bookings: statsByExpert[row.expert_id]?.bookings || 0,
        completed_trainings: statsByExpert[row.expert_id]?.completed_trainings || 0,
        approved_hours: Math.round((statsByExpert[row.expert_id]?.approved_hours || 0) * 100) / 100,
      },
    }));
  }

  async listNativeRequirementApplications(type, id) {
    const configs = {
      project: {
        table: 'applications',
        key: 'project_id',
        select: 'id,status,applied_at,interview_date,expert_id,experts:expert_id(id,name,email,phone,photo_url,bio,city,state,domain_expertise,subskills,qualifications,hourly_rate,experience_years,rating,total_ratings,is_verified,kyc_status)',
        order: 'applied_at',
      },
      internship: {
        table: 'internship_applications',
        key: 'internship_id',
        select: 'id,status,created_at,updated_at,student_id,site_students:student_id(id,name,email,phone)',
        order: 'created_at',
      },
      freelance: {
        table: 'freelance_applications',
        key: 'project_id',
        select: 'id,status,created_at,updated_at,student_id,site_students:student_id(id,name,email,phone)',
        order: 'created_at',
      },
    };
    const cfg = configs[type];
    if (!cfg) return [];
    const { data, error } = await this.client
      .from(cfg.table)
      .select(cfg.select)
      .eq(cfg.key, id)
      .order(cfg.order, { ascending: false })
      .limit(100);
    if (error) {
      if (tableMissing(error) || relationMissing(error)) return [];
      throw error;
    }
    return data || [];
  }

  async addRequirementExpert(payload) {
    const existingRow = await this.findRequirementExpert(payload.requirement_id, payload.requirement_type, payload.expert_id);

    if (existingRow) {
      const data = await this.updateWithMissingColumnRetry('super_admin_requirement_experts', existingRow.id, {
        stage: payload.stage,
        interview_scheduled_at: payload.interview_scheduled_at,
        notes: payload.notes,
        updated_by: payload.updated_by,
      });
      const row = data || await this.findRequirementExpert(payload.requirement_id, payload.requirement_type, payload.expert_id);
      return row ? (await this.hydrateRequirementExpertRows([row]))[0] : null;
    }

    const data = await this.insertWithMissingColumnRetry('super_admin_requirement_experts', payload);
    const row = data || await this.findRequirementExpert(payload.requirement_id, payload.requirement_type, payload.expert_id);
    return row ? (await this.hydrateRequirementExpertRows([row]))[0] : null;
  }

  async updateRequirementExpert(id, payload) {
    const data = await this.updateWithMissingColumnRetry('super_admin_requirement_experts', id, payload);
    return (await this.hydrateRequirementExpertRows([data]))[0] || data;
  }

  async getRequirementExpert(id) {
    const { data, error } = await this.client
      .from('super_admin_requirement_experts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return (await this.hydrateRequirementExpertRows([data], 'id,name,email,user_id,hourly_rate'))[0] || data;
  }

  async hydrateRequirementExpertRows(rows, select = 'id,name,email,phone,city,state,domain_expertise,hourly_rate,user_id') {
    if (!rows.length) return rows;
    const expertIds = [...new Set(rows.map((row) => row.expert_id).filter(Boolean))];
    if (!expertIds.length) return rows;
    const { data: experts, error } = await this.client
      .from('experts')
      .select(select)
      .in('id', expertIds);
    if (error) {
      if (tableMissing(error)) return rows;
      throw error;
    }
    const expertById = Object.fromEntries((experts || []).map((expert) => [expert.id, expert]));
    return rows.map((row) => ({ ...row, experts: expertById[row.expert_id] || null }));
  }

  async findProjectApplication(projectId, expertId) {
    const { data, error } = await this.client
      .from('applications')
      .select('*')
      .eq('project_id', projectId)
      .eq('expert_id', expertId)
      .limit(1);
    if (error) {
      if (tableMissing(error)) return null;
      throw error;
    }
    return data?.[0] || null;
  }

  async upsertProjectApplication(projectId, expertId, payload) {
    const existing = await this.findProjectApplication(projectId, expertId);
    if (existing) {
      const { data, error } = await this.client
        .from('applications')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await this.client
      .from('applications')
      .insert([{ project_id: projectId, expert_id: expertId, ...payload }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getProjectRequirementForAction(projectId) {
    const { data, error } = await this.client
      .from('projects')
      .select('id,title,institution_id,hourly_rate,start_date,end_date,duration_hours,institutions:institution_id(id,name,email,user_id)')
      .eq('id', projectId)
      .maybeSingle();
    if (error) {
      if (tableMissing(error) || relationMissing(error)) return null;
      throw error;
    }
    return data || null;
  }

  async updateNativeRequirementApplication(type, requirementId, applicationId, payload) {
    const configs = {
      project: {
        table: 'applications',
        key: 'project_id',
        allowed: ['pending', 'interview', 'accepted', 'rejected'],
        dateField: 'interview_date',
        select: 'id,status,applied_at,interview_date,expert_id,experts:expert_id(id,name,email,phone,photo_url,bio,city,state,domain_expertise,subskills,qualifications,hourly_rate,experience_years,rating,total_ratings,is_verified,kyc_status)',
      },
      internship: {
        table: 'internship_applications',
        key: 'internship_id',
        allowed: ['pending', 'interview', 'shortlisted_corporate', 'rejected_corporate'],
        dateField: 'interview_scheduled_at',
        select: 'id,status,created_at,updated_at,interview_scheduled_at,student_id,site_students:student_id(id,name,email,phone)',
      },
      freelance: {
        table: 'freelance_applications',
        key: 'project_id',
        allowed: ['pending', 'shortlisted', 'rejected'],
        select: 'id,status,created_at,updated_at,student_id,site_students:student_id(id,name,email,phone)',
      },
    };
    const cfg = configs[type];
    if (!cfg) return null;

    const status = String(payload.status || '').trim();
    if (!cfg.allowed.includes(status)) {
      const err = new Error('Invalid application status');
      err.statusCode = 400;
      throw err;
    }

    const update = { status };
    if (cfg.dateField && payload.interview_scheduled_at !== undefined) {
      update[cfg.dateField] = payload.interview_scheduled_at || null;
    }

    const { data, error } = await this.client
      .from(cfg.table)
      .update(update)
      .eq('id', applicationId)
      .eq(cfg.key, requirementId)
      .select(cfg.select)
      .maybeSingle();
    if (error) {
      if (tableMissing(error) || relationMissing(error)) return null;
      throw error;
    }
    return data || null;
  }

  async createProjectBooking(project, expertId) {
    const existing = await this.client
      .from('bookings')
      .select('*')
      .eq('project_id', project.id)
      .eq('expert_id', expertId)
      .limit(1);
    if (existing.error && !tableMissing(existing.error)) throw existing.error;
    if (existing.data?.[0]) return existing.data[0];

    const { data, error } = await this.client
      .from('bookings')
      .insert([{
        expert_id: expertId,
        project_id: project.id,
        institution_id: project.institution_id,
        amount: project.hourly_rate || 0,
        start_date: project.start_date || new Date().toISOString().split('T')[0],
        end_date: project.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hours_booked: project.duration_hours || 0,
        status: 'in_progress',
        payment_status: 'pending',
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateRequirementBooking(requirementId, bookingId, payload) {
    const allowed = ['pending', 'in_progress', 'completed', 'cancelled'];
    const status = String(payload.status || '').trim();
    if (!allowed.includes(status)) {
      const err = new Error('Invalid booking status');
      err.statusCode = 400;
      throw err;
    }
    const { data, error } = await this.client
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('project_id', requirementId)
      .select('*, experts(id,name,email,phone,photo_url,bio,city,state,domain_expertise,subskills,qualifications,hourly_rate,experience_years,rating,total_ratings,is_verified,kyc_status), institutions(id,name,email)')
      .maybeSingle();
    if (error) {
      if (tableMissing(error) || relationMissing(error)) return null;
      throw error;
    }
    return data || null;
  }

  async listFreelance(params) {
    const { page, limit, offset, search } = params;
    let query = this.client
      .from('freelance_projects')
      .select('*, institutions:corporate_institution_id(id,name,email,type,city,state)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) query = query.ilike('title', `%${search}%`);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0, page, limit };
  }

  async listInternships(params) {
    const { page, limit, offset, search } = params;
    let query = this.client
      .from('internships')
      .select('*, institutions:corporate_institution_id(id,name,email,type,city,state)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) query = query.ilike('title', `%${search}%`);
    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0, page, limit };
  }

  async listFinanceTrainings({ page, limit, offset }) {
    const { data, error, count } = await this.client
      .from('bookings')
      .select('*, projects!inner(id,title,type), experts(id,name,email,hourly_rate), institutions(id,name,email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const bookingIds = (data || []).map((b) => b.id);
    const { data: days, error: daysError } = bookingIds.length
      ? await this.client
          .from('training_attendance_days')
          .select('booking_id,status,effective_entry_at,effective_exit_at,expert_entry_at,expert_exit_at')
          .in('booking_id', bookingIds)
      : { data: [], error: null };
    if (daysError && !tableMissing(daysError)) throw daysError;

    const approvedHoursByBooking = {};
    for (const day of days || []) {
      if (day.status !== 'approved') continue;
      const entry = day.effective_entry_at || day.expert_entry_at;
      const exit = day.effective_exit_at || day.expert_exit_at;
      const minutes = entry && exit ? Math.max(0, new Date(exit) - new Date(entry)) / 60000 : 0;
      approvedHoursByBooking[day.booking_id] = (approvedHoursByBooking[day.booking_id] || 0) + minutes / 60;
    }

    const { data: records } = bookingIds.length
      ? await this.client.from('training_finance_records').select('*').in('booking_id', bookingIds)
      : { data: [] };
    const recordByBooking = Object.fromEntries((records || []).map((r) => [r.booking_id, r]));

    const rows = (data || []).map((booking) => {
      const approvedHours = Math.round((approvedHoursByBooking[booking.id] || 0) * 100) / 100;
      const hourlyRate = Number(booking.hourly_rate || booking.experts?.hourly_rate || 0);
      return {
        ...booking,
        approved_hours: approvedHours,
        estimated_expert_amount: Math.round(approvedHours * hourlyRate * 100) / 100,
        finance_record: recordByBooking[booking.id] || null,
      };
    });

    return { data: rows, total: count || 0, page, limit };
  }

  async upsertFinanceRecord(bookingId, payload) {
    const { data, error } = await this.client
      .from('training_finance_records')
      .upsert([{ booking_id: bookingId, ...payload }], { onConflict: 'booking_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

module.exports = SuperAdminRepository;
