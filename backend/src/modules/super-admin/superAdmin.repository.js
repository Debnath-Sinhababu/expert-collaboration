const { createServiceClient } = require('../../config/supabase');
const {
  approvedHoursFromDays,
  approvedDaysFromDays,
  buildPaymentRecordDraft,
  estimateSettlementAmounts,
  attachSettlementBreakdown,
  roundMoney,
} = require('../../../services/financeCalculationService');
const { isActiveBookingStatus } = require('../../shared/compensation');

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

function requirementKey(type, id) {
  return `${type}:${id}`;
}

function cancelledStatus(status) {
  return ['closed', 'cancelled', 'canceled'].includes(String(status || '').toLowerCase());
}

function activeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (isActiveBookingStatus(value)) return true;
  return ['ongoing', 'active', 'accepted', 'shortlisted'].includes(value);
}

function boolParam(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return undefined;
}

function numberParam(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function splitParam(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function roundPercent(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dateProgress(startValue, endValue) {
  if (!startValue || !endValue) return null;
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return roundPercent(((now - start) / (end - start)) * 100);
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

    const requirementStats = await this.getRequirementStats();

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
      requirements: requirementStats,
    };
  }

  async getRequirementStats() {
    const [projects, internships, freelance] = await Promise.all([
      this.fetchRequirementRowsForStats('project'),
      this.fetchRequirementRowsForStats('internship'),
      this.fetchRequirementRowsForStats('freelance'),
    ]);
    const byCategory = {
      projects: this.summarizeRequirementRows(await this.enrichRequirementRows(projects)),
      internships: this.summarizeRequirementRows(await this.enrichRequirementRows(internships)),
      freelance: this.summarizeRequirementRows(await this.enrichRequirementRows(freelance)),
    };
    const all = [...projects, ...internships, ...freelance];
    return {
      total: byCategory.projects.total + byCategory.internships.total + byCategory.freelance.total,
      running: byCategory.projects.running + byCategory.internships.running + byCategory.freelance.running,
      pending: byCategory.projects.pending + byCategory.internships.pending + byCategory.freelance.pending,
      completed: byCategory.projects.completed + byCategory.internships.completed + byCategory.freelance.completed,
      closed_incomplete: byCategory.projects.closed_incomplete + byCategory.internships.closed_incomplete + byCategory.freelance.closed_incomplete,
      closed: byCategory.projects.closed + byCategory.internships.closed + byCategory.freelance.closed,
      categories: byCategory,
      recent_total: all.filter((row) => row.created_at && Date.now() - new Date(row.created_at).getTime() < 30 * 24 * 60 * 60 * 1000).length,
    };
  }

  summarizeRequirementRows(rows = []) {
    return rows.reduce((summary, row) => {
      summary.total += 1;
      const status = row.derived_status || 'pending';
      summary[status] = (summary[status] || 0) + 1;
      if (status === 'completed' || status === 'closed_incomplete') summary.closed += 1;
      return summary;
    }, { total: 0, running: 0, pending: 0, completed: 0, closed_incomplete: 0, closed: 0 });
  }

  async fetchRequirementRowsForStats(type) {
    const configs = {
      project: {
        table: 'projects',
        select: 'id,title,status,call_status,created_at,start_date,end_date,duration_hours,institution_id',
        map: (r) => ({ ...r, requirement_type: 'project' }),
      },
      internship: {
        table: 'internships',
        select: 'id,title,status,created_at,start_date,application_deadline,duration_value,duration_unit,corporate_institution_id',
        map: (r) => ({ ...r, requirement_type: 'internship', institution_id: r.corporate_institution_id }),
      },
      freelance: {
        table: 'freelance_projects',
        select: 'id,title,status,created_at,deadline,corporate_institution_id',
        map: (r) => ({ ...r, requirement_type: 'freelance', institution_id: r.corporate_institution_id }),
      },
    };
    const cfg = configs[type];
    const { data, error } = await this.client.from(cfg.table).select(cfg.select).limit(1000);
    if (error) {
      if (tableMissing(error)) return [];
      throw error;
    }
    return (data || []).map(cfg.map);
  }

  async getOverviewCategory(category, period = 'monthly') {
    const type = category === 'projects' ? 'project' : category === 'internships' ? 'internship' : 'freelance';
    const rows = await this.enrichRequirementRows(await this.fetchRequirementRowsForStats(type));
    const summary = this.summarizeRequirementRows(rows);
    const buckets = {};
    for (const row of rows) {
      const date = row.created_at ? new Date(row.created_at) : null;
      if (!date || Number.isNaN(date.getTime())) continue;
      const key = period === 'yearly'
        ? String(date.getFullYear())
        : period === 'weekly'
          ? `${date.getFullYear()}-W${Math.ceil((((date - new Date(date.getFullYear(), 0, 1)) / 86400000) + 1) / 7)}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = buckets[key] || { label: key, total: 0, running: 0, pending: 0, completed: 0, closed_incomplete: 0, closed: 0 };
      buckets[key].total += 1;
      buckets[key][row.derived_status] = (buckets[key][row.derived_status] || 0) + 1;
      if (row.derived_status === 'completed' || row.derived_status === 'closed_incomplete') buckets[key].closed += 1;
    }
    return {
      category,
      summary,
      trend: Object.values(buckets).sort((a, b) => String(a.label).localeCompare(String(b.label))).slice(-24),
      data: rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 100),
    };
  }

  async getBusinessExportData({ date_from = '', date_to = '' } = {}) {
    const [experts, institutions, students, requirements, finance] = await Promise.all([
      this.client.from('experts').select('id,name,email,phone,city,state,domain_expertise,calxbook_verified,is_verified,created_at').limit(5000),
      this.client.from('institutions').select('id,name,email,phone,type,city,state,created_at').limit(5000),
      this.client.from('site_students').select('id,name,email,phone,city,state,degree,created_at').limit(5000),
      this.listRequirements({ page: 1, limit: 5000, offset: 0, type: 'all', date_from, date_to }),
      this.getFinanceSummary(),
    ]);
    for (const result of [experts, institutions, students]) {
      if (result.error && !tableMissing(result.error)) throw result.error;
    }
    const requirementRows = (requirements.data || []).filter((row) => {
      const created = row.created_at ? new Date(row.created_at).getTime() : 0;
      if (date_from && created < new Date(date_from).getTime()) return false;
      if (date_to && created > new Date(date_to).getTime()) return false;
      return true;
    });
    return {
      experts: experts.data || [],
      institutions: institutions.data || [],
      students: students.data || [],
      requirements: requirementRows,
      finance,
      generated_at: new Date().toISOString(),
    };
  }

  async insertWithMissingColumnRetry(table, payload) {
    let nextPayload = { ...payload };
    for (let attempts = 0; attempts < 12; attempts += 1) {
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
    return null;
  }

  async updateWithMissingColumnRetry(table, id, payload) {
    let nextPayload = { ...payload };
    for (let attempts = 0; attempts < 12; attempts += 1) {
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

  async logActivity(payload) {
    const { error } = await this.client
      .from('super_admin_activity_logs')
      .insert([{ ...payload, metadata: payload.metadata || {} }]);
    if (error && !tableMissing(error)) throw error;
  }

  async getAdminDetail(id) {
    const admin = await this.findAdminById(id);
    if (!admin) return null;
    const [activity, reports, assignments] = await Promise.all([
      this.listAdminActivity(id, { page: 1, limit: 10, offset: 0 }),
      this.listReportsForAdmin(admin.auth_user_id, 10),
      this.listAssignmentsForAdmin(admin.auth_user_id, 20),
    ]);
    const activitySummary = (activity.data || []).reduce((acc, item) => {
      acc[item.action] = (acc[item.action] || 0) + 1;
      return acc;
    }, {});
    return {
      admin,
      assignmentSummary: {
        active: assignments.total,
        recent: assignments.data,
      },
      activitySummary,
      recentActivity: activity.data,
      recentReports: reports,
    };
  }

  async listAdminActivity(adminId, { page, limit, offset, action = '', requirement_type = '', requirement_id = '', date_from = '', date_to = '' }) {
    const admin = await this.findAdminById(adminId);
    if (!admin) return { data: [], total: 0, page, limit };
    let query = this.client
      .from('super_admin_activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    query = query.or(`actor_admin_id.eq.${admin.id},actor_user_id.eq.${admin.auth_user_id}`);
    if (action) query = query.eq('action', action);
    if (requirement_type) query = query.eq('requirement_type', requirement_type);
    if (requirement_id) query = query.eq('requirement_id', requirement_id);
    if (date_from) query = query.gte('created_at', date_from);
    if (date_to) query = query.lte('created_at', date_to);
    const { data, error, count } = await query;
    if (error) {
      if (tableMissing(error)) return { data: [], total: 0, page, limit };
      throw error;
    }
    return { data: data || [], total: count || 0, page, limit };
  }

  async listReportsForAdmin(adminUserId, limit = 20) {
    if (!adminUserId) return [];
    const { data, error } = await this.client
      .from('requirement_documents')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .eq('document_type', 'daily_report')
      .order('document_date', { ascending: false })
      .limit(limit);
    if (error) {
      if (tableMissing(error)) return [];
      throw error;
    }
    return this.mapRequirementDocumentsToReports(data || []);
  }

  async listAssignmentsForAdmin(adminUserId, limit = 100) {
    if (!adminUserId) return { data: [], total: 0 };
    const { data, error, count } = await this.client
      .from('requirement_admin_assignments')
      .select('*', { count: 'exact' })
      .eq('admin_user_id', adminUserId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false })
      .limit(limit);
    if (error) {
      if (tableMissing(error)) return { data: [], total: 0 };
      throw error;
    }
    const rows = await this.hydrateAssignmentsWithRequirements(data || []);
    return { data: rows, total: count || 0 };
  }

  async hydrateAssignmentsWithRequirements(assignments = []) {
    if (!assignments.length) return [];
    const rows = [];
    for (const assignment of assignments) {
      const detail = await this.getRequirementDetail(assignment.requirement_type, assignment.requirement_id).catch(() => null);
      rows.push({
        ...assignment,
        requirement: detail?.requirement || null,
        requirementDetail: detail || null,
      });
    }
    return rows;
  }

  async listProfiles(type, params = {}) {
    const { page, limit, offset, search } = params;
    const table = type === 'institutions' ? 'institutions' : type === 'students' ? 'site_students' : 'experts';
    const hasKeywordSearch = Boolean(String(search || '').trim());
    const select = type === 'students'
      ? 'id, name, email, phone, city, state, degree, specialization, skills, year, availability, preferred_engagement, preferred_work_mode, currently_studying, institution_id, created_at, about, address, gender, linkedin_url, github_url, portfolio_url, institutions:institution_id(id, name)'
      : type === 'institutions'
        ? 'id, name, email, phone, type, city, state, logo_url, is_verified, student_count, established_year, created_at, description, website_url, address, pincode, contact_person, accreditation, country, gstin, pan, cin, industry, company_size, work_mode_preference, preferred_engagements'
        : 'id, name, email, phone, city, state, bio, qualifications, domain_expertise, subskills, expert_types, expert_services, current_designation, experience_years, hourly_rate, is_verified, kyc_status, calxbook_verified, interested_in_services, service_price, course_video_url, created_at';

    let query = this.client
      .from(table)
      .select(select, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (!hasKeywordSearch) {
      query = query.range(offset, offset + limit - 1);
    }

    if (type === 'experts') {
      const domains = splitParam(params.domain_expertise);
      const skills = splitParam(params.skill);
      const expertTypes = splitParam(params.expert_type);
      const expertServices = splitParam(params.expert_service);
      const experienceMin = numberParam(params.experience_min);
      const experienceMax = numberParam(params.experience_max);
      const hourlyRateMin = numberParam(params.hourly_rate_min);
      const hourlyRateMax = numberParam(params.hourly_rate_max);
      const isVerified = boolParam(params.is_verified);
      const calxbookVerified = boolParam(params.calxbook_verified);
      const interested = boolParam(params.interested);

      if (domains.length) query = query.overlaps('domain_expertise', domains);
      if (skills.length) query = query.overlaps('subskills', skills);
      if (expertTypes.length) query = query.overlaps('expert_types', expertTypes);
      if (expertServices.length) query = query.overlaps('expert_services', expertServices);
      if (params.designation) query = query.ilike('current_designation', `%${String(params.designation).trim()}%`);
      if (experienceMin !== undefined) query = query.gte('experience_years', experienceMin);
      if (experienceMax !== undefined) query = query.lte('experience_years', experienceMax);
      if (hourlyRateMin !== undefined) query = query.gte('hourly_rate', hourlyRateMin);
      if (hourlyRateMax !== undefined) query = query.lte('hourly_rate', hourlyRateMax);
      if (params.state) query = query.ilike('state', `%${String(params.state).trim()}%`);
      if (params.city) query = query.ilike('city', `%${String(params.city).trim()}%`);
      if (isVerified !== undefined) query = query.eq('is_verified', isVerified);
      if (params.kyc_status) query = query.eq('kyc_status', String(params.kyc_status).trim());
      if (calxbookVerified !== undefined) query = query.eq('calxbook_verified', calxbookVerified);
      if (interested !== undefined) query = query.eq('interested_in_services', interested);
    }

    if (type === 'institutions') {
      const isVerified = boolParam(params.is_verified);
      const studentCountMin = numberParam(params.student_count_min);
      const studentCountMax = numberParam(params.student_count_max);
      const establishedYearMin = numberParam(params.established_year_min);
      const establishedYearMax = numberParam(params.established_year_max);

      if (params.institution_type) query = query.eq('type', String(params.institution_type).trim());
      if (params.city) query = query.ilike('city', `%${String(params.city).trim()}%`);
      if (params.state) query = query.ilike('state', `%${String(params.state).trim()}%`);
      if (isVerified !== undefined) query = query.eq('is_verified', isVerified);
      if (studentCountMin !== undefined) query = query.gte('student_count', studentCountMin);
      if (studentCountMax !== undefined) query = query.lte('student_count', studentCountMax);
      if (establishedYearMin !== undefined) query = query.gte('established_year', establishedYearMin);
      if (establishedYearMax !== undefined) query = query.lte('established_year', establishedYearMax);
    }

    if (type === 'students') {
      const skills = splitParam(params.skill);
      const currentlyStudying = boolParam(params.currently_studying);

      if (params.institution_id) query = query.eq('institution_id', String(params.institution_id).trim());
      if (params.degree) query = query.ilike('degree', `%${String(params.degree).trim()}%`);
      if (params.specialization) query = query.ilike('specialization', `%${String(params.specialization).trim()}%`);
      if (skills.length) query = query.overlaps('skills', skills);
      if (params.city) query = query.ilike('city', `%${String(params.city).trim()}%`);
      if (params.state) query = query.ilike('state', `%${String(params.state).trim()}%`);
      if (params.year) query = query.eq('year', String(params.year).trim());
      if (params.availability) query = query.eq('availability', String(params.availability).trim());
      if (params.preferred_engagement) query = query.eq('preferred_engagement', String(params.preferred_engagement).trim());
      if (params.preferred_work_mode) query = query.eq('preferred_work_mode', String(params.preferred_work_mode).trim());
      if (currentlyStudying !== undefined) query = query.eq('currently_studying', currentlyStudying);
    }

    if (hasKeywordSearch) {
      query = query.limit(1000);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    if (hasKeywordSearch) {
      const needle = String(search).trim().toLowerCase();
      const matches = (row) => {
        if (type === 'institutions') {
          return [
            row.name,
            row.email,
            row.phone,
            row.type,
            row.description,
            row.website_url,
            row.address,
            row.city,
            row.state,
            row.country,
            row.pincode,
            row.contact_person,
            row.accreditation,
            row.gstin,
            row.pan,
            row.cin,
            row.industry,
            row.company_size,
            row.work_mode_preference,
            row.student_count,
            row.established_year,
            ...(Array.isArray(row.preferred_engagements) ? row.preferred_engagements : []),
          ].some((value) => String(value || '').toLowerCase().includes(needle));
        }
        if (type === 'students') {
          return [
            row.name,
            row.email,
            row.phone,
            row.degree,
            row.specialization,
            row.year,
            row.city,
            row.state,
            row.address,
            row.about,
            row.gender,
            row.availability,
            row.preferred_engagement,
            row.preferred_work_mode,
            row.linkedin_url,
            row.github_url,
            row.portfolio_url,
            row.institutions?.name,
            ...(Array.isArray(row.skills) ? row.skills : []),
          ].some((value) => String(value || '').toLowerCase().includes(needle));
        }
        return [
          row.name,
          row.email,
          row.phone,
          row.bio,
          row.current_designation,
          row.city,
          row.state,
          row.qualifications,
          row.kyc_status,
          ...(Array.isArray(row.domain_expertise) ? row.domain_expertise : []),
          ...(Array.isArray(row.subskills) ? row.subskills : []),
          ...(Array.isArray(row.expert_types) ? row.expert_types : []),
          ...(Array.isArray(row.expert_services) ? row.expert_services : []),
        ].some((value) => String(value || '').toLowerCase().includes(needle));
      };
      const filtered = (data || []).filter(matches);
      return { data: filtered.slice(offset, offset + limit), total: filtered.length, page, limit };
    }
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

  async listRequirements({ page, limit, offset, type = 'all', search = '', status = 'all', derived_status = '', institution_id = '', assigned_admin_id = '' }) {
    const boundedEnd = type === 'all' ? offset + limit - 1 : offset + limit - 1;
    const boundedStart = type === 'all' ? 0 : offset;
    const needle = String(search || '').trim();
    const institutionId = String(institution_id || '').trim();

    const queryConfig = {
      project: {
        table: 'projects',
        institutionField: 'institution_id',
        select: 'id,title,description,type,status,created_at,institution_id,call_status,hourly_rate,total_budget,start_date,end_date,duration_hours,compensation_unit,unit_quantity,duration_per_unit,hours_per_day,institutions:institution_id(id,name,email,type,city,state)',
        searchFields: 'title,description',
        map: (r) => ({ ...r, requirement_type: 'project' }),
      },
      internship: {
        table: 'internships',
        institutionField: 'corporate_institution_id',
        select: 'id,title,responsibilities,status,created_at,corporate_institution_id,call_status,stipend_min,stipend_max,location,work_mode,engagement,start_date,application_deadline,duration_value,duration_unit,institutions:corporate_institution_id(id,name,email,type,city,state)',
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

    const enrichedRows = await this.enrichRequirementRows(rows);
    let filteredRows = enrichedRows;
    if (derived_status) {
      filteredRows = filteredRows.filter((row) => (
        derived_status === 'closed'
          ? ['completed', 'closed_incomplete'].includes(row.derived_status)
          : row.derived_status === derived_status
      ));
    }
    if (assigned_admin_id) {
      filteredRows = filteredRows.filter((row) => {
        if (assigned_admin_id === 'unassigned') return !row.assignment;
        return row.assignment?.admin_user_id === assigned_admin_id || row.assignment?.admin_record_id === assigned_admin_id;
      });
    }
    filteredRows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const pagedRows = type === 'all' || derived_status || assigned_admin_id ? filteredRows.slice(offset, offset + limit) : filteredRows;

    return {
      data: pagedRows,
      total: derived_status || assigned_admin_id ? filteredRows.length : total,
      page,
      limit,
      hasMore: (derived_status || assigned_admin_id ? filteredRows.length : total) > offset + limit,
    };
  }

  async enrichRequirementRows(rows = []) {
    if (!rows.length) return [];
    const byType = rows.reduce((acc, row) => {
      const type = row.requirement_type;
      acc[type] = acc[type] || [];
      acc[type].push(row.id);
      return acc;
    }, {});
    const [assignments, projectMetrics, internshipMetrics, freelanceMetrics] = await Promise.all([
      this.getActiveAssignmentsForRows(rows),
      this.getProjectRequirementMetrics(byType.project || []),
      this.getApplicationMetrics('internship', byType.internship || []),
      this.getApplicationMetrics('freelance', byType.freelance || []),
    ]);

    return rows.map((row) => {
      const key = requirementKey(row.requirement_type, row.id);
      const assignment = assignments[key] || null;
      const metrics = row.requirement_type === 'project'
        ? projectMetrics[row.id] || {}
        : row.requirement_type === 'internship'
          ? internshipMetrics[row.id] || {}
          : freelanceMetrics[row.id] || {};
      const derived = this.deriveRequirementState(row, metrics);
      return {
        ...row,
        assignment,
        derived_status: derived.status,
        progress_percent: derived.progressPercent,
        progress_label: derived.progressLabel,
        metrics,
      };
    });
  }

  deriveRequirementState(row, metrics = {}) {
    const status = row.status || row.call_status;
    if (String(status || '').toLowerCase() === 'completed' || metrics.completed_count > 0 || metrics.completed_bookings > 0) {
      return { status: 'completed', progressPercent: 100, progressLabel: 'Completed' };
    }
    if (cancelledStatus(status)) {
      return { status: 'closed_incomplete', progressPercent: 0, progressLabel: 'Closed incomplete' };
    }
    if (row.requirement_type === 'project') {
      if ((metrics.running_bookings || 0) > 0 || (metrics.accepted_applications || 0) > 0) {
        const target = Number(metrics.target_hours || row.duration_hours || 0);
        const progress = target > 0 ? roundPercent((Number(metrics.approved_hours || 0) / target) * 100) : null;
        return { status: 'running', progressPercent: progress, progressLabel: progress == null ? 'Unknown' : `${progress}%` };
      }
      return { status: 'pending', progressPercent: 0, progressLabel: 'Not started' };
    }
    if (row.requirement_type === 'internship') {
      if ((metrics.shortlisted_count || 0) > 0 || activeStatus(status)) {
        const end = row.application_deadline || row.end_date;
        const progress = dateProgress(row.start_date || row.created_at, end);
        return { status: 'running', progressPercent: progress, progressLabel: progress == null ? 'Unknown' : `${progress}%` };
      }
      return { status: 'pending', progressPercent: 0, progressLabel: 'Not started' };
    }
    if ((metrics.shortlisted_count || 0) > 0 || activeStatus(status)) {
      const progress = dateProgress(row.created_at, row.deadline);
      return { status: 'running', progressPercent: progress, progressLabel: progress == null ? 'Unknown' : `${progress}%` };
    }
    return { status: 'pending', progressPercent: 0, progressLabel: 'Not started' };
  }

  async getActiveAssignmentsForRows(rows = []) {
    const byType = rows.reduce((acc, row) => {
      acc[row.requirement_type] = acc[row.requirement_type] || [];
      acc[row.requirement_type].push(row.id);
      return acc;
    }, {});
    const all = [];
    for (const [type, ids] of Object.entries(byType)) {
      if (!ids.length) continue;
      const { data, error } = await this.client
        .from('requirement_admin_assignments')
        .select('*')
        .eq('requirement_type', type)
        .eq('status', 'active')
        .in('requirement_id', ids);
      if (error) {
        if (tableMissing(error)) continue;
        throw error;
      }
      all.push(...(data || []));
    }
    const adminIds = [...new Set(all.map((item) => item.admin_record_id).filter(Boolean))];
    const { data: admins, error: adminError } = adminIds.length
      ? await this.client.from('super_admin_users').select('id,auth_user_id,name,email,status').in('id', adminIds)
      : { data: [], error: null };
    if (adminError && !tableMissing(adminError)) throw adminError;
    const adminById = Object.fromEntries((admins || []).map((admin) => [admin.id, admin]));
    return Object.fromEntries(all.map((item) => [
      requirementKey(item.requirement_type, item.requirement_id),
      { ...item, admin: adminById[item.admin_record_id] || null },
    ]));
  }

  async getProjectRequirementMetrics(projectIds = []) {
    if (!projectIds.length) return {};
    const [{ data: applications, error: appError }, { data: bookings, error: bookingError }] = await Promise.all([
      this.client.from('applications').select('project_id,status').in('project_id', projectIds),
      this.client
        .from('bookings')
        .select('id,project_id,status,hours_booked,expert_id,experts:expert_id(id,name,email)')
        .in('project_id', projectIds),
    ]);
    if (appError && !tableMissing(appError)) throw appError;
    if (bookingError && !tableMissing(bookingError) && !relationMissing(bookingError)) throw bookingError;
    const bookingIds = (bookings || []).map((booking) => booking.id);
    const approvedHoursByBooking = await this.approvedHoursForBookingIds(bookingIds);
    const out = Object.fromEntries(projectIds.map((id) => [id, {
      applications_total: 0,
      accepted_applications: 0,
      bookings_total: 0,
      running_bookings: 0,
      completed_bookings: 0,
      approved_hours: 0,
      target_hours: 0,
      selected_experts: [],
    }]));
    for (const app of applications || []) {
      const item = out[app.project_id];
      if (!item) continue;
      item.applications_total += 1;
      if (String(app.status).toLowerCase() === 'accepted') item.accepted_applications += 1;
    }
    for (const booking of bookings || []) {
      const item = out[booking.project_id];
      if (!item) continue;
      item.bookings_total += 1;
      const bookingStatus = String(booking.status || '').toLowerCase();
      if (activeStatus(booking.status)) item.running_bookings += 1;
      if (bookingStatus === 'completed') item.completed_bookings += 1;
      item.approved_hours += Number(approvedHoursByBooking[booking.id] || 0);
      item.target_hours += Number(booking.hours_booked || 0);

      const expert = booking.experts;
      if (
        expert?.id
        && !cancelledStatus(booking.status)
        && !['rejected', 'withdrawn', 'cancelled', 'canceled'].includes(bookingStatus)
      ) {
        const already = item.selected_experts.some((row) => row.id === expert.id);
        if (!already) {
          item.selected_experts.push({
            id: expert.id,
            name: expert.name || null,
            email: expert.email || null,
          });
        }
      }
    }
    return out;
  }

  async getApplicationMetrics(type, ids = []) {
    if (!ids.length) return {};
    const config = type === 'internship'
      ? { table: 'internship_applications', key: 'internship_id' }
      : { table: 'freelance_applications', key: 'project_id' };
    const { data, error } = await this.client
      .from(config.table)
      .select(`${config.key},status`)
      .in(config.key, ids);
    if (error) {
      if (tableMissing(error)) return {};
      throw error;
    }
    const out = Object.fromEntries(ids.map((id) => [id, { applications_total: 0, shortlisted_count: 0, completed_count: 0 }]));
    for (const app of data || []) {
      const item = out[app[config.key]];
      if (!item) continue;
      const status = String(app.status || '').toLowerCase();
      item.applications_total += 1;
      if (['shortlisted', 'accepted', 'selected'].includes(status)) item.shortlisted_count += 1;
      if (['completed', 'closed'].includes(status)) item.completed_count += 1;
    }
    return out;
  }

  async createProjectRequirement(payload) {
    return this.insertWithMissingColumnRetry('projects', payload);
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

    const [pipeline, nativeApplications, bookings, assignment, reports] = await Promise.all([
      this.listRequirementExperts(type, id),
      this.listNativeRequirementApplications(type, id),
      this.listRequirementBookings(type, id),
      this.getActiveAssignment(type, id),
      this.listRequirementReports(type, id, { page: 1, limit: 10, offset: 0 }),
    ]);
    const attendanceSummary = this.buildAttendanceSummary(bookings);
    const enriched = (await this.enrichRequirementRows([cfg.map(data)]))[0] || cfg.map(data);
    return {
      requirement: enriched,
      institution: data.institutions || null,
      assignment,
      reports: reports.data || [],
      pipeline,
      pipelineExperts: pipeline,
      nativeApplications,
      bookings,
      attendanceSummary,
      counts: this.buildRequirementCounts(pipeline, nativeApplications, bookings, attendanceSummary),
    };
  }

  async getActiveAssignment(type, id) {
    const { data, error } = await this.client
      .from('requirement_admin_assignments')
      .select('*')
      .eq('requirement_type', type)
      .eq('requirement_id', id)
      .eq('status', 'active')
      .maybeSingle();
    if (error) {
      if (tableMissing(error)) return null;
      throw error;
    }
    if (!data) return null;
    const { data: admin } = data.admin_record_id
      ? await this.client.from('super_admin_users').select('id,auth_user_id,name,email,status').eq('id', data.admin_record_id).maybeSingle()
      : { data: null };
    return { ...data, admin: admin || null };
  }

  async assignRequirement(type, id, admin, actor, notes = '') {
    await this.client
      .from('requirement_admin_assignments')
      .update({ status: 'unassigned', unassigned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('requirement_type', type)
      .eq('requirement_id', id)
      .eq('status', 'active');
    const { data, error } = await this.client
      .from('requirement_admin_assignments')
      .insert([{
        requirement_type: type,
        requirement_id: id,
        admin_user_id: admin.auth_user_id,
        admin_record_id: admin.id,
        assigned_by_user_id: actor.userId || null,
        assigned_by_admin_id: actor.adminId || null,
        notes: notes || null,
      }])
      .select('*')
      .single();
    if (error) throw error;
    return { ...data, admin };
  }

  async unassignRequirement(type, id) {
    const { data, error } = await this.client
      .from('requirement_admin_assignments')
      .update({ status: 'unassigned', unassigned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('requirement_type', type)
      .eq('requirement_id', id)
      .eq('status', 'active')
      .select('*');
    if (error) {
      if (tableMissing(error)) return [];
      throw error;
    }
    return data || [];
  }

  async listRequirementReports(type, id, { page, limit, offset }) {
    const { data, error, count } = await this.client
      .from('requirement_documents')
      .select('*', { count: 'exact' })
      .eq('requirement_type', type)
      .eq('requirement_id', id)
      .eq('document_type', 'daily_report')
      .order('document_date', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      if (tableMissing(error)) return { data: [], total: 0, page, limit };
      throw error;
    }
    return { data: this.mapRequirementDocumentsToReports(data || []), total: count || 0, page, limit };
  }

  async createRequirementReport(payload) {
    const { data, error } = await this.client
      .from('requirement_documents')
      .insert([payload])
      .select('*')
      .single();
    if (error) throw error;
    return this.mapRequirementDocumentsToReports([data])[0] || data;
  }

  mapRequirementDocumentsToReports(rows = []) {
    return rows.map((row) => ({
      ...row,
      report_date: row.document_date,
      summary: row.notes,
    }));
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
      .select('*, experts(id,name,email,phone,photo_url,bio,city,state,domain_expertise,subskills,qualifications,hourly_rate,experience_years,rating,total_ratings,is_verified,kyc_status), institutions(id,name,email), projects(id,title,compensation_unit,institution_gross_per_unit,institution_gross_total,unit_quantity,duration_per_unit,hourly_rate,total_budget,duration_hours)')
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

    const financeByBooking = await this.getFinanceRecordsByBookingIds(bookingIds);

    return rows.map((booking) => ({
      ...booking,
      approved_hours: Math.round((approvedHoursByBooking[booking.id] || 0) * 100) / 100,
      finance_summary: financeByBooking[booking.id] || { expert: null, institution: null },
    }));
  }

  async listRequirementExperts(type, id) {
    return [];
  }

  async listNativeRequirementApplications(type, id) {
    const configs = {
      project: {
        table: 'applications',
        key: 'project_id',
        select:
          'id,status,applied_at,interview_date,expert_id,cover_letter,screening_answers,rate_intent,rate_status,proposed_net_per_unit,institution_counter_gross_per_unit,final_gross_per_unit,final_net_per_unit,final_hourly_rate,compensation_unit,unit_quantity,rate_note,negotiation_history,proposed_rate,experts:expert_id(id,name,email,phone,photo_url,bio,city,state,domain_expertise,subskills,qualifications,hourly_rate,experience_years,rating,total_ratings,is_verified,kyc_status)',
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
    return null;
  }

  async updateRequirementExpert(id, payload) {
    return null;
  }

  async getRequirementExpert(id) {
    return null;
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

    if (status === 'interview' && cfg.dateField) {
      const interviewAt = payload.interview_scheduled_at;
      if (!interviewAt) {
        const err = new Error('Interview date and time are required');
        err.statusCode = 400;
        throw err;
      }
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

  async createProjectBooking(project, expertId, application = null) {
    const existing = await this.client
      .from('bookings')
      .select('*')
      .eq('project_id', project.id)
      .eq('expert_id', expertId)
      .limit(1);
    if (existing.error && !tableMissing(existing.error)) throw existing.error;
    if (existing.data?.[0]) return existing.data[0];

    const {
      projectPostedRates,
      toExpertNet,
      resolveBookingAmount,
    } = require('../../shared/compensation');

    const posted = projectPostedRates(project || {});
    let finalGross = Number(application?.final_gross_per_unit);
    let finalNet = Number(application?.final_net_per_unit);
    if (!(Number.isFinite(finalGross) && finalGross > 0)) {
      finalGross = resolveBookingAmount(application, project) || posted.grossPerUnit || Number(project.hourly_rate) || 0;
    }
    if (!(Number.isFinite(finalNet) && finalNet > 0)) {
      finalNet = toExpertNet(finalGross) || 0;
    }
    const unit = application?.compensation_unit || posted.unit || 'hourly';
    const quantity = application?.unit_quantity ?? posted.quantity ?? null;

    const { data, error } = await this.client
      .from('bookings')
      .insert([{
        expert_id: expertId,
        project_id: project.id,
        institution_id: project.institution_id,
        application_id: application?.id || null,
        amount: finalGross || 0,
        start_date: project.start_date || new Date().toISOString().split('T')[0],
        end_date: project.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hours_booked: posted.durationHours || project.duration_hours || 0,
        status: 'in_progress',
        payment_status: 'pending',
        final_gross_per_unit: finalGross || null,
        final_net_per_unit: finalNet || null,
        compensation_unit: unit,
        unit_quantity: quantity,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateRequirementBooking(requirementId, bookingId, payload) {
    const { toExpertNet } = require('../../shared/compensation');
    const body = payload || {};

    const { data: existing, error: fetchError } = await this.client
      .from('bookings')
      .select('id, application_id, project_id, status, final_gross_per_unit, final_net_per_unit, amount, hours_booked, unit_quantity, compensation_unit, start_date, end_date, actual_start_date, actual_end_date')
      .eq('id', bookingId)
      .eq('project_id', requirementId)
      .maybeSingle();
    if (fetchError) {
      if (tableMissing(fetchError) || relationMissing(fetchError)) return null;
      throw fetchError;
    }
    if (!existing) return null;

    const updates = { updated_at: new Date().toISOString() };
    const changed = {};

    if (body.status !== undefined && body.status !== null && String(body.status).trim() !== '') {
      const allowed = ['pending', 'confirmed', 'in_progress', 'completion_requested', 'cancellation_requested', 'completed', 'cancelled'];
      const status = String(body.status).trim();
      if (!allowed.includes(status)) {
        const err = new Error('Invalid booking status');
        err.statusCode = 400;
        throw err;
      }
      updates.status = status;
      changed.status = status;
    }

    const hasGross = body.final_gross_per_unit !== undefined && body.final_gross_per_unit !== null && body.final_gross_per_unit !== '';
    if (hasGross) {
      const gross = Number(body.final_gross_per_unit);
      if (!Number.isFinite(gross) || gross <= 0) {
        const err = new Error('final_gross_per_unit must be a positive number');
        err.statusCode = 400;
        throw err;
      }
      const net = toExpertNet(gross);
      updates.final_gross_per_unit = gross;
      updates.final_net_per_unit = net;
      updates.amount = gross;
      changed.final_gross_per_unit = gross;
      changed.final_net_per_unit = net;
      changed.amount = gross;
    }

    if (body.hours_booked !== undefined && body.hours_booked !== null && body.hours_booked !== '') {
      const hours = Number(body.hours_booked);
      if (!Number.isFinite(hours) || hours < 0) {
        const err = new Error('hours_booked must be 0 or greater');
        err.statusCode = 400;
        throw err;
      }
      updates.hours_booked = hours;
      changed.hours_booked = hours;
    }

    if (body.unit_quantity !== undefined && body.unit_quantity !== null && body.unit_quantity !== '') {
      const qty = Number(body.unit_quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        const err = new Error('unit_quantity must be a positive number');
        err.statusCode = 400;
        throw err;
      }
      updates.unit_quantity = qty;
      changed.unit_quantity = qty;
    }

    const dateFields = ['start_date', 'end_date', 'actual_start_date', 'actual_end_date'];
    for (const field of dateFields) {
      if (body[field] === undefined) continue;
      if (body[field] === null || body[field] === '') {
        updates[field] = null;
        changed[field] = null;
        continue;
      }
      const dateValue = String(body[field]).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        const err = new Error(`${field} must be YYYY-MM-DD`);
        err.statusCode = 400;
        throw err;
      }
      updates[field] = dateValue;
      changed[field] = dateValue;
    }

    const start = updates.start_date !== undefined ? updates.start_date : existing.start_date;
    const end = updates.end_date !== undefined ? updates.end_date : existing.end_date;
    if (start && end && String(end) < String(start)) {
      const err = new Error('end_date must be on or after start_date');
      err.statusCode = 400;
      throw err;
    }
    const actualStart = updates.actual_start_date !== undefined ? updates.actual_start_date : existing.actual_start_date;
    const actualEnd = updates.actual_end_date !== undefined ? updates.actual_end_date : existing.actual_end_date;
    if (actualStart && actualEnd && String(actualEnd) < String(actualStart)) {
      const err = new Error('actual_end_date must be on or after actual_start_date');
      err.statusCode = 400;
      throw err;
    }

    if (Object.keys(changed).length === 0) {
      const err = new Error('No booking fields to update');
      err.statusCode = 400;
      throw err;
    }

    const { data, error } = await this.client
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .eq('project_id', requirementId)
      .select('*, experts(id,name,email,phone,photo_url,bio,city,state,domain_expertise,subskills,qualifications,hourly_rate,experience_years,rating,total_ratings,is_verified,kyc_status), institutions(id,name,email), projects(id,title,compensation_unit,institution_gross_per_unit,institution_gross_total,unit_quantity,duration_per_unit,hourly_rate,total_budget,duration_hours)')
      .maybeSingle();
    if (error) {
      if (tableMissing(error) || relationMissing(error)) return null;
      throw error;
    }

    // Keep linked application locked rates in sync so fallbacks don't show stale values.
    if (
      existing.application_id &&
      (changed.final_gross_per_unit !== undefined ||
        changed.final_net_per_unit !== undefined ||
        changed.unit_quantity !== undefined)
    ) {
      const appPatch = { updated_at: new Date().toISOString() };
      if (changed.final_gross_per_unit !== undefined) {
        appPatch.final_gross_per_unit = changed.final_gross_per_unit;
        appPatch.final_net_per_unit = changed.final_net_per_unit;
        appPatch.final_hourly_rate =
          String(existing.compensation_unit || '') === 'hourly' ? changed.final_gross_per_unit : null;
        appPatch.proposed_rate = changed.final_gross_per_unit;
      }
      if (changed.unit_quantity !== undefined) {
        appPatch.unit_quantity = changed.unit_quantity;
      }
      const { error: appError } = await this.client
        .from('applications')
        .update(appPatch)
        .eq('id', existing.application_id);
      if (appError && !tableMissing(appError) && !relationMissing(appError)) {
        console.warn('Failed to mirror booking edits onto application:', appError.message || appError);
      }
    }

    return { ...(data || null), _changed: changed, _before: existing };
  }

  async updateProjectRequirementDates(requirementId, payload) {
    const startDate = payload.start_date || null;
    const endDate = payload.end_date || null;
    if (!startDate || !endDate || String(endDate) < String(startDate)) {
      const err = new Error('Valid start_date and end_date are required');
      err.statusCode = 400;
      throw err;
    }

    const { data: project, error } = await this.client
      .from('projects')
      .update({ start_date: startDate, end_date: endDate, updated_at: new Date().toISOString() })
      .eq('id', requirementId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!project) return null;

    const { data: bookings, error: bookingFetchError } = await this.client
      .from('bookings')
      .select('id, actual_start_date, actual_end_date')
      .eq('project_id', requirementId);
    if (bookingFetchError && !tableMissing(bookingFetchError)) throw bookingFetchError;

    for (const booking of bookings || []) {
      const updates = {
        start_date: startDate,
        end_date: endDate,
        updated_at: new Date().toISOString(),
      };
      if (booking.actual_start_date && String(booking.actual_start_date).slice(0, 10) > startDate) {
        updates.actual_start_date = startDate;
      }
      if (booking.actual_end_date && String(booking.actual_end_date).slice(0, 10) < endDate) {
        updates.actual_end_date = endDate;
      }
      await this.client.from('bookings').update(updates).eq('id', booking.id);
    }

    return project;
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
      .select('*, projects!inner(id,title,type,description,hourly_rate,total_budget,start_date,end_date,duration_hours,job_location,workplace_type,employment_type,status,call_status), experts(id,name,email,hourly_rate), institutions(id,name,email)', { count: 'exact' })
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
    const approvedDaysByBooking = {};
    for (const day of days || []) {
      if (day.status !== 'approved') continue;
      const entry = day.effective_entry_at || day.expert_entry_at;
      const exit = day.effective_exit_at || day.expert_exit_at;
      const minutes = entry && exit ? Math.max(0, new Date(exit) - new Date(entry)) / 60000 : 0;
      approvedHoursByBooking[day.booking_id] = (approvedHoursByBooking[day.booking_id] || 0) + minutes / 60;
      approvedDaysByBooking[day.booking_id] = (approvedDaysByBooking[day.booking_id] || 0) + 1;
    }

    const { data: records } = bookingIds.length
      ? await this.client.from('training_finance_records').select('*').in('booking_id', bookingIds)
      : { data: [] };
    const recordByBooking = Object.fromEntries((records || []).map((r) => [r.booking_id, r]));

    const rows = (data || []).map((booking) => {
      const approvedHours = Math.round((approvedHoursByBooking[booking.id] || 0) * 100) / 100;
      const approvedDays = approvedDaysByBooking[booking.id] || 0;
      const estimate = estimateSettlementAmounts(booking, approvedHours, approvedDays);
      return {
        ...booking,
        approved_hours: approvedHours,
        approved_days: approvedDays,
        compensation_unit: estimate.unit,
        estimated_expert_amount: estimate.estimated_expert_amount,
        estimated_institution_amount: estimate.estimated_institution_amount,
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

  async listFinanceSourceBookings({ page, limit, offset, search = '' }) {
    let query = this.client
      .from('bookings')
      .select(
        '*, projects!inner(id,title,type,description,hourly_rate,total_budget,start_date,end_date,duration_hours,job_location,workplace_type,employment_type,status,call_status,compensation_unit,institution_gross_per_unit,institution_gross_total,unit_quantity), experts(id,name,email,hourly_rate), institutions(id,name,email)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('projects.title', `%${String(search).trim()}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0, page, limit };
  }

  async attendanceMetricsForBookingIds(bookingIds) {
    if (!bookingIds.length) return {};
    const { data, error } = await this.client
      .from('training_attendance_days')
      .select('booking_id,status,effective_entry_at,effective_exit_at,expert_entry_at,expert_exit_at')
      .in('booking_id', bookingIds);
    if (error) {
      if (tableMissing(error)) return {};
      throw error;
    }
    const daysByBooking = {};
    for (const day of data || []) {
      daysByBooking[day.booking_id] = daysByBooking[day.booking_id] || [];
      daysByBooking[day.booking_id].push(day);
    }
    return Object.fromEntries(
      Object.entries(daysByBooking).map(([bookingId, days]) => [
        bookingId,
        {
          approvedHours: approvedHoursFromDays(days),
          approvedDays: approvedDaysFromDays(days),
        },
      ]),
    );
  }

  async approvedHoursForBookingIds(bookingIds) {
    const metrics = await this.attendanceMetricsForBookingIds(bookingIds);
    return Object.fromEntries(
      Object.entries(metrics).map(([bookingId, value]) => [bookingId, value.approvedHours || 0]),
    );
  }

  async getFinanceRecordsByBookingIds(bookingIds) {
    if (!bookingIds.length) return {};
    const { data: records, error } = await this.client
      .from('finance_payment_records')
      .select('*')
      .in('booking_id', bookingIds);
    if (error) {
      if (tableMissing(error)) return {};
      throw error;
    }

    const invoiceIds = [...new Set((records || []).map((record) => record.invoice_id).filter(Boolean))];
    const { data: invoices, error: invoiceError } = invoiceIds.length
      ? await this.client.from('finance_invoices').select('*').in('id', invoiceIds)
      : { data: [], error: null };
    if (invoiceError && !tableMissing(invoiceError)) throw invoiceError;
    const invoiceById = Object.fromEntries((invoices || []).map((invoice) => [invoice.id, invoice]));

    const grouped = {};
    for (const record of records || []) {
      grouped[record.booking_id] = grouped[record.booking_id] || { expert: null, institution: null };
      const invoice = invoiceById[record.invoice_id] || null;
      grouped[record.booking_id][record.party_type] = {
        ...record,
        invoice,
        pdf_url: invoice?.pdf_url || null,
        remaining_amount: roundMoney(Number(record.invoice_amount || record.calculated_amount || 0) - Number(record.paid_amount || 0)),
      };
    }
    return grouped;
  }

  async ensureFinancePaymentRecordsForBookings(bookings) {
    const rows = bookings || [];
    const bookingIds = rows.map((booking) => booking.id).filter(Boolean);
    if (!bookingIds.length) return [];

    const [metricsByBooking, existingByBooking] = await Promise.all([
      this.attendanceMetricsForBookingIds(bookingIds),
      this.getFinanceRecordsByBookingIds(bookingIds),
    ]);

    const upserts = [];
    for (const booking of rows) {
      const metrics = metricsByBooking[booking.id] || { approvedHours: 0, approvedDays: 0 };
      const approvedHours = metrics.approvedHours || 0;
      for (const partyType of ['expert', 'institution']) {
        const existing = existingByBooking[booking.id]?.[partyType];
        const draft = buildPaymentRecordDraft(booking, partyType, approvedHours, {
          approvedDays: metrics.approvedDays || 0,
        });
        const { settlement: _settlement, ...draftRow } = draft;
        if (existing && existing.status !== 'pending') {
          upserts.push({
            booking_id: draftRow.booking_id,
            project_id: draftRow.project_id,
            expert_id: draftRow.expert_id,
            institution_id: draftRow.institution_id,
            party_type: draftRow.party_type,
            direction: draftRow.direction,
            approved_hours: existing.approved_hours,
            hourly_rate_snapshot: existing.hourly_rate_snapshot,
            calculated_amount: existing.calculated_amount,
            invoice_amount: existing.invoice_amount,
            status: existing.status,
            invoice_id: existing.invoice_id || null,
            paid_amount: existing.paid_amount || 0,
            paid_at: existing.paid_at || null,
            notes: existing.notes || null,
            updated_by: existing.updated_by || null,
            updated_at: new Date().toISOString(),
          });
          continue;
        }
        upserts.push({
          ...draftRow,
          status: existing?.status || 'pending',
          invoice_id: existing?.invoice_id || null,
          paid_amount: existing?.paid_amount || 0,
          paid_at: existing?.paid_at || null,
          notes: existing?.notes || null,
          updated_by: existing?.updated_by || null,
          updated_at: new Date().toISOString(),
        });
      }
    }

    const { data, error } = await this.client
      .from('finance_payment_records')
      .upsert(upserts, { onConflict: 'booking_id,party_type' })
      .select('*');
    if (error) throw error;
    return data || [];
  }

  async listFinancePayments({ page, limit, offset, party_type, status = '', search = '' }) {
    if (!party_type || !['expert', 'institution'].includes(party_type)) {
      const err = new Error('party_type must be expert or institution');
      err.statusCode = 400;
      throw err;
    }

    if (!status && !search) {
      const bookingsPage = await this.listFinanceSourceBookings({ page, limit, offset });
      await this.ensureFinancePaymentRecordsForBookings(bookingsPage.data);
      const bookingIds = bookingsPage.data.map((booking) => booking.id);
      const recordsByBooking = await this.getFinanceRecordsByBookingIds(bookingIds);
      const data = bookingsPage.data
        .map((booking) => recordsByBooking[booking.id]?.[party_type] ? {
          ...attachSettlementBreakdown({
            ...recordsByBooking[booking.id][party_type],
            booking,
            projects: booking.projects,
            experts: booking.experts,
            institutions: booking.institutions,
          }, booking),
        } : null)
        .filter(Boolean);
      return { data, total: bookingsPage.total, page, limit };
    }

    let query = this.client
      .from('finance_payment_records')
      .select('*', { count: 'exact' })
      .eq('party_type', party_type)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) query = query.eq('status', status);
    const { data: records, error, count } = await query;
    if (error) throw error;
    const hydrated = await this.hydrateFinanceRecords(records || []);
    const needle = String(search || '').trim().toLowerCase();
    const filtered = needle
      ? hydrated.filter((row) => [
          row.projects?.title,
          row.experts?.name,
          row.experts?.email,
          row.institutions?.name,
          row.institutions?.email,
        ].some((value) => String(value || '').toLowerCase().includes(needle)))
      : hydrated;
    return { data: filtered, total: count || 0, page, limit };
  }

  async hydrateFinanceRecords(records) {
    if (!records.length) return [];
    const bookingIds = [...new Set(records.map((record) => record.booking_id).filter(Boolean))];
    const invoiceIds = [...new Set(records.map((record) => record.invoice_id).filter(Boolean))];
    const [{ data: bookings, error: bookingError }, { data: invoices, error: invoiceError }] = await Promise.all([
      bookingIds.length
        ? this.client
            .from('bookings')
            .select('*, projects(id,title,type,description,hourly_rate,total_budget,start_date,end_date,duration_hours,job_location,workplace_type,employment_type,status,call_status,compensation_unit,institution_gross_per_unit,institution_gross_total,unit_quantity), experts(id,name,email,hourly_rate), institutions(id,name,email)')
            .in('id', bookingIds)
        : { data: [], error: null },
      invoiceIds.length
        ? this.client.from('finance_invoices').select('*').in('id', invoiceIds)
        : { data: [], error: null },
    ]);
    if (bookingError && !relationMissing(bookingError) && !tableMissing(bookingError)) throw bookingError;
    if (invoiceError && !tableMissing(invoiceError)) throw invoiceError;
    const bookingById = Object.fromEntries((bookings || []).map((booking) => [booking.id, booking]));
    const invoiceById = Object.fromEntries((invoices || []).map((invoice) => [invoice.id, invoice]));
    return records.map((record) => {
      const booking = bookingById[record.booking_id] || null;
      const invoice = invoiceById[record.invoice_id] || null;
      const hydrated = {
        ...record,
        booking,
        projects: booking?.projects || null,
        experts: booking?.experts || null,
        institutions: booking?.institutions || null,
        invoice,
        remaining_amount: roundMoney(Number(record.invoice_amount || record.calculated_amount || 0) - Number(record.paid_amount || 0)),
      };
      return attachSettlementBreakdown(hydrated, booking);
    });
  }

  async getFinancePayment(id) {
    const { data, error } = await this.client
      .from('finance_payment_records')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return (await this.hydrateFinanceRecords([data]))[0] || data;
  }

  async getNextFinanceInvoiceNumber() {
    const { data, error } = await this.client.rpc('next_finance_invoice_number');
    if (!error && data) return data;
    const now = new Date();
    return `CM-FY${String(now.getFullYear()).slice(-2)}-${Date.now()}`;
  }

  async createFinanceInvoice(payload) {
    const { data, error } = await this.client
      .from('finance_invoices')
      .insert([payload])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async updateFinancePayment(id, payload) {
    const { data, error } = await this.client
      .from('finance_payment_records')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return (await this.hydrateFinanceRecords([data]))[0] || data;
  }

  emptyFinancePartyBreakdown() {
    return {
      pipeline: 0,
      awaiting_invoice: 0,
      invoice_sent: 0,
      invoice_unpaid: 0,
      partial_remaining: 0,
      partial_collected: 0,
      settled: 0,
      outstanding: 0,
      remaining: 0,
      cancelled: 0,
      counts: { pending: 0, invoiced: 0, partial_paid: 0, paid: 0, cancelled: 0, other: 0 },
    };
  }

  emptyFinanceSummary() {
    const emptyParty = this.emptyFinancePartyBreakdown();
    return {
      total_receivable: 0,
      total_payable: 0,
      invoiced: 0,
      paid: 0,
      pending: 0,
      remaining: 0,
      institute: { ...emptyParty, counts: { ...emptyParty.counts } },
      expert: { ...emptyParty, counts: { ...emptyParty.counts } },
      platform: {
        expected_margin: 0,
        realized_margin: 0,
        outstanding_net: 0,
      },
      equation: {
        institute: 'pipeline = settled + outstanding; outstanding = awaiting_invoice + invoice_sent',
        expert: 'pipeline = settled + outstanding; outstanding = awaiting_invoice + invoice_sent',
        outstanding: 'outstanding = due − paid (per open record)',
        invoice_sent: 'invoice_sent = unpaid invoiced remaining + partial_paid remaining',
        platform_expected: 'expected_margin = institute.pipeline − expert.pipeline',
        platform_realized: 'realized_margin = institute.settled − expert.settled',
      },
    };
  }

  async getFinanceSummary(scope = {}) {
    let query = this.client.from('finance_payment_records').select('*');
    if (scope.party_type) query = query.eq('party_type', scope.party_type);
    if (scope.expert_id) query = query.eq('expert_id', scope.expert_id);
    if (scope.institution_id) query = query.eq('institution_id', scope.institution_id);
    const { data, error } = await query;
    if (error) {
      if (tableMissing(error)) return this.emptyFinanceSummary();
      throw error;
    }

    const summary = this.emptyFinanceSummary();
    const bumpParty = (party, status, due, paidAmount) => {
      const paid = Math.max(0, Number(paidAmount) || 0);
      const amount = Math.max(0, Number(due) || 0);
      const remaining = Math.max(0, amount - paid);

      if (status === 'cancelled') {
        party.cancelled += amount;
        party.counts.cancelled += 1;
        return;
      }

      party.pipeline += amount;
      party.settled += paid;
      party.remaining += remaining;
      party.outstanding += remaining;

      if (status === 'pending') {
        party.awaiting_invoice += remaining;
        party.counts.pending += 1;
      } else if (status === 'invoiced') {
        // Fully unpaid billed invoices.
        party.invoice_unpaid += remaining;
        party.invoice_sent += remaining;
        party.counts.invoiced += 1;
      } else if (status === 'partial_paid') {
        // Billed with partial collection: remaining still waits; paid cash already in settled.
        party.partial_remaining += remaining;
        party.partial_collected += paid;
        party.invoice_sent += remaining;
        party.counts.partial_paid += 1;
      } else if (status === 'paid') {
        party.counts.paid += 1;
        if (remaining > 0) party.invoice_sent += remaining;
      } else {
        party.counts.other += 1;
        if (remaining > 0) party.invoice_sent += remaining;
      }
    };

    for (const record of data || []) {
      const amount = Number(record.invoice_amount || record.calculated_amount || 0);
      const paidAmount = Number(record.paid_amount || 0);
      // Treat legacy invoiced + partial cash as partial_paid for accurate summaries pre-backfill.
      let status = String(record.status || 'pending').toLowerCase();
      if (
        status === 'invoiced' &&
        paidAmount > 0 &&
        amount > 0 &&
        paidAmount + 0.001 < amount
      ) {
        status = 'partial_paid';
      }
      const direction =
        record.direction ||
        (record.party_type === 'expert' ? 'payable' : 'receivable');
      const remaining = Math.max(0, amount - paidAmount);

      // Legacy flat fields (cross-party status slice — kept for older dashboards).
      if (direction === 'receivable' && status !== 'cancelled') summary.total_receivable += amount;
      if (direction === 'payable' && status !== 'cancelled') summary.total_payable += amount;
      // Open billed remaining (unpaid invoices + partial balances).
      if (status === 'invoiced' || status === 'partial_paid') summary.invoiced += remaining;
      if (status !== 'cancelled') summary.paid += paidAmount;
      if (status === 'pending') summary.pending += remaining;
      if (status !== 'cancelled') summary.remaining += remaining;

      if (direction === 'receivable' || record.party_type === 'institution') {
        bumpParty(summary.institute, status, amount, paidAmount);
      } else if (direction === 'payable' || record.party_type === 'expert') {
        bumpParty(summary.expert, status, amount, paidAmount);
      }
    }

    summary.platform.expected_margin = summary.institute.pipeline - summary.expert.pipeline;
    summary.platform.realized_margin = summary.institute.settled - summary.expert.settled;
    summary.platform.outstanding_net = summary.institute.outstanding - summary.expert.outstanding;

    const roundDeep = (value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, roundDeep(v)]));
      }
      if (typeof value === 'number') return roundMoney(value);
      return value;
    };
    return roundDeep(summary);
  }

  async listFinanceInvoices({ page, limit, offset, recipient_type = '', search = '' }) {
    let query = this.client
      .from('finance_invoices')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (recipient_type) query = query.eq('recipient_type', recipient_type);
    if (search) {
      const s = `%${String(search).trim()}%`;
      query = query.or(`invoice_number.ilike.${s},recipient_email.ilike.${s},recipient_name.ilike.${s}`);
    }
    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0, page, limit };
  }

  async listFinanceRecordsForScope(scope = {}, limit = 20) {
    let query = this.client
      .from('finance_payment_records')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (scope.party_type) query = query.eq('party_type', scope.party_type);
    if (scope.expert_id) query = query.eq('expert_id', scope.expert_id);
    if (scope.institution_id) query = query.eq('institution_id', scope.institution_id);
    const { data, error } = await query;
    if (error) {
      if (tableMissing(error)) return [];
      throw error;
    }
    return this.hydrateFinanceRecords(data || []);
  }
}

module.exports = SuperAdminRepository;
