const SuperAdminRepository = require('./superAdmin.repository');
const { SUPER_ADMIN_PERMISSIONS, normalizePermissions } = require('./superAdmin.permissions');
const { parseRequirementType } = require('./superAdmin.dto');
const { createServiceClient } = require('../../config/supabase');
const notificationService = require('../../../services/notificationService');
const socketService = require('../../../services/socketService');
const ImageUploadService = require('../../../services/imageUploadService');
const { generateInvoicePdf } = require('../../../services/invoicePdfService');
const { sendInvoiceEmail } = require('../../../services/financeEmailService');
const { addSheet, workbookBuffer } = require('./superAdmin.excel');
const { checkExportRateLimit } = require('./superAdmin.exportLimiter');

const DEFAULT_ADMIN_PASSWORD = process.env.SUPERADMIN_DEFAULT_USER_PASSWORD || 'ExpertCollaboration@123';
const REPORT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function toArray(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeServiceError(error) {
  if (!error || error.statusCode) return error;
  const message = error.message || '';
  if (/already.*registered|already.*exists|duplicate/i.test(message) || error.code === '23505') {
    error.statusCode = 409;
  } else if (/password|email|invalid/i.test(message)) {
    error.statusCode = 400;
  }
  return error;
}

async function findAuthUserByEmail(serviceClient, email) {
  const target = String(email || '').trim().toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = (data?.users || []).find((user) => String(user.email || '').toLowerCase() === target);
    if (found) return found;
    if (!data?.users || data.users.length < perPage) break;
  }
  return null;
}

class SuperAdminService {
  constructor(repository = new SuperAdminRepository(), serviceClient = createServiceClient()) {
    this.repository = repository;
    this.serviceClient = serviceClient;
  }

  getMe(auth) {
    return {
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.access?.adminRecord?.name || auth.user.user_metadata?.name || auth.user.email,
        role: 'super_admin',
      },
      access: {
        isRoot: Boolean(auth.access?.isRoot),
        permissions: auth.access?.isRoot ? SUPER_ADMIN_PERMISSIONS : normalizePermissions(auth.access?.permissions),
      },
    };
  }

  async getOverviewStats() {
    return this.repository.getOverviewStats();
  }

  async logActivity(auth, action, options = {}) {
    try {
      await this.repository.logActivity({
        actor_user_id: auth?.user?.id || null,
        actor_admin_id: auth?.access?.adminRecord?.id || null,
        actor_email: auth?.user?.email || null,
        action,
        entity_type: options.entity_type || null,
        entity_id: options.entity_id ? String(options.entity_id) : null,
        requirement_type: options.requirement_type || null,
        requirement_id: options.requirement_id || null,
        metadata: options.metadata || {},
        ip_address: options.ip_address || null,
        user_agent: options.user_agent || null,
      });
    } catch (error) {
      console.warn('Super-admin activity log failed:', error.message || error);
    }
  }

  async listAdmins(params) {
    const dbResult = await this.repository.listAdmins(params);
    let authAdmins = [];
    try {
      const perPage = 1000;
      for (let page = 1; page <= 20; page += 1) {
        const { data, error } = await this.serviceClient.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        authAdmins.push(...(data?.users || []).filter((user) => user.user_metadata?.super_admin_managed === true));
        if (!data?.users || data.users.length < perPage) break;
      }
    } catch {
      authAdmins = [];
    }

    const byEmail = new Map((dbResult.data || []).map((row) => [String(row.email).toLowerCase(), row]));
    for (const user of authAdmins) {
      const email = String(user.email || '').toLowerCase();
      if (!email || byEmail.has(email)) continue;
      byEmail.set(email, {
        id: user.id,
        auth_user_id: user.id,
        email,
        name: user.user_metadata?.name || email,
        status: user.user_metadata?.super_admin_status || 'active',
        disabled_message: user.user_metadata?.super_admin_disabled_message || null,
        permissions: normalizePermissions(user.user_metadata?.super_admin_permissions),
        created_at: user.created_at,
        storage: 'auth_metadata',
      });
    }

    const merged = [...byEmail.values()].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return {
      ...dbResult,
      data: merged.slice(params.offset, params.offset + params.limit),
      total: Math.max(dbResult.total || 0, merged.length),
    };
  }

  async getAdminDetail(id) {
    const detail = await this.repository.getAdminDetail(id);
    if (!detail) {
      const err = new Error('Admin not found');
      err.statusCode = 404;
      throw err;
    }
    return detail;
  }

  async listAdminActivity(id, params) {
    return this.repository.listAdminActivity(id, params);
  }

  async exportAdminActivity(id, params, auth) {
    await this.ensureExportAllowed(auth);
    const rows = await this.repository.listAdminActivity(id, { ...params, page: 1, limit: 5000, offset: 0 });
    const buffer = await workbookBuffer(async (workbook) => {
      addSheet(workbook, 'Activity', [
        { header: 'Date', key: 'created_at', width: 24 },
        { header: 'Admin Email', key: 'actor_email', width: 28 },
        { header: 'Action', key: 'action', width: 28 },
        { header: 'Entity Type', key: 'entity_type', width: 18 },
        { header: 'Entity ID', key: 'entity_id', width: 36 },
        { header: 'Requirement Type', key: 'requirement_type', width: 18 },
        { header: 'Requirement ID', key: 'requirement_id', width: 36 },
        { header: 'Metadata', key: 'metadata', width: 50 },
      ], rows.data || []);
    });
    await this.logActivity(auth, 'export.admin_activity', { entity_type: 'admin', entity_id: id, metadata: { filters: params } });
    return { buffer, filename: `admin-activity-${id}.xlsx` };
  }

  async ensureExportAllowed(auth) {
    const result = await checkExportRateLimit(auth?.user?.id || auth?.user?.email);
    if (!result.allowed) {
      const err = new Error(`Export rate limit exceeded. Try again later. Limit: ${result.limit} per hour.`);
      err.statusCode = 429;
      throw err;
    }
  }

  async createAdmin(input, actorUserId, auth = null) {
    const existingRecord = await this.repository.findAdminByEmail(input.email);
    let authUser = null;
    let createdAuthUserId = null;

    if (existingRecord?.auth_user_id) {
      const { data, error } = await this.serviceClient.auth.admin.getUserById(existingRecord.auth_user_id);
      if (!error && data?.user) authUser = data.user;
    }

    if (!authUser) {
      authUser = await findAuthUserByEmail(this.serviceClient, input.email);
    }

    if (!authUser) {
      const { data: created, error } = await this.serviceClient.auth.admin.createUser({
        email: input.email,
        password: input.password || DEFAULT_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          role: 'super_admin',
          name: input.name,
          super_admin_managed: true,
          super_admin_permissions: normalizePermissions(input.permissions),
          super_admin_status: 'active',
        },
      });
      if (error) throw normalizeServiceError(error);
      authUser = created.user;
      createdAuthUserId = authUser.id;
    } else {
      const meta = authUser.user_metadata || {};
      const { error } = await this.serviceClient.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...meta,
          role: 'super_admin',
          name: input.name,
          super_admin_managed: true,
          super_admin_permissions: normalizePermissions(input.permissions),
          super_admin_status: 'active',
        },
      });
      if (error) throw normalizeServiceError(error);
    }

    const recordPayload = {
      auth_user_id: authUser.id,
      email: input.email,
      name: input.name,
      status: 'active',
      disabled_message: null,
      permissions: normalizePermissions(input.permissions),
      created_by: actorUserId || null,
    };

    try {
      const created = await this.repository.saveAdminRecord(recordPayload);
      await this.logActivity(auth, 'admin.created', { entity_type: 'admin', entity_id: created.id, metadata: { email: input.email } });
      return created;
    } catch (err) {
      console.error('Super-admin DB record save failed; using auth metadata fallback:', err);
      return {
        id: authUser.id,
        ...recordPayload,
        storage: 'auth_metadata',
        warning: 'Admin login was created, but the DB admin record could not be saved. Permissions are stored in auth metadata fallback.',
      };
    }
  }

  async updateAdmin(id, body, actorUserId, auth = null) {
    const payload = {};
    if (body.name !== undefined) payload.name = String(body.name).trim();
    if (body.status !== undefined) {
      if (!['active', 'disabled'].includes(body.status)) {
        const err = new Error('Invalid admin status');
        err.statusCode = 400;
        throw err;
      }
      payload.status = body.status;
    }
    if (body.permissions !== undefined) payload.permissions = normalizePermissions(body.permissions);
    if (body.disabled_message !== undefined) payload.disabled_message = String(body.disabled_message || '').trim() || null;

    const existingRecord = await this.repository.findAdminById(id);
    let authUser = null;
    if (existingRecord?.auth_user_id) {
      const { data, error } = await this.serviceClient.auth.admin.getUserById(existingRecord.auth_user_id);
      if (!error && data?.user) authUser = data.user;
    }
    if (!authUser && !existingRecord) {
      const { data, error } = await this.serviceClient.auth.admin.getUserById(id);
      if (!error && data?.user) authUser = data.user;
    }

    if (!existingRecord && !authUser) {
      const err = new Error('Admin not found');
      err.statusCode = 404;
      throw err;
    }

    const nextName = payload.name ?? existingRecord?.name ?? authUser?.user_metadata?.name ?? authUser?.email;
    const nextStatus = payload.status ?? existingRecord?.status ?? authUser?.user_metadata?.super_admin_status ?? 'active';
    const nextPermissions = payload.permissions ?? normalizePermissions(existingRecord?.permissions || authUser?.user_metadata?.super_admin_permissions);
    const nextDisabledMessage = payload.disabled_message !== undefined
      ? payload.disabled_message
      : existingRecord?.disabled_message || authUser?.user_metadata?.super_admin_disabled_message || null;

    if (authUser?.id) {
      const meta = authUser.user_metadata || {};
      const { error } = await this.serviceClient.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...meta,
          role: 'super_admin',
          name: nextName,
          super_admin_managed: true,
          super_admin_permissions: nextPermissions,
          super_admin_status: nextStatus,
          super_admin_disabled_message: nextDisabledMessage,
        },
      });
      if (error) throw normalizeServiceError(error);
    }

    if (existingRecord) {
      const updated = await this.repository.updateAdminRecord(existingRecord.id, {
        ...payload,
        name: nextName,
        status: nextStatus,
        permissions: nextPermissions,
        disabled_message: nextDisabledMessage,
      });
      await this.logActivity(auth, nextStatus === 'disabled' ? 'admin.disabled' : 'admin.updated', {
        entity_type: 'admin',
        entity_id: updated.id,
        metadata: { email: updated.email, changed: Object.keys(payload) },
      });
      return updated;
    }

    return {
      id: authUser.id,
      auth_user_id: authUser.id,
      email: authUser.email,
      name: nextName,
      status: nextStatus,
      permissions: nextPermissions,
      disabled_message: nextDisabledMessage,
      updated_by: actorUserId || null,
      storage: 'auth_metadata',
    };
  }

  async listProfiles(type, params) {
    if (!['experts', 'institutions', 'students'].includes(type)) {
      const err = new Error('Invalid profile type');
      err.statusCode = 400;
      throw err;
    }
    return this.repository.listProfiles(type, params);
  }

  async bulkImport(kind, body, auth = null) {
    const { spreadsheetId, range, gid, usePublicAccess = true, delayBetweenRows = 500, defaultPassword } = body || {};
    if (!spreadsheetId) {
      const err = new Error('spreadsheetId is required');
      err.statusCode = 400;
      throw err;
    }

    const GoogleSheetsService = require('../../../services/googleSheetsService');
    const BulkImportService = require('../../../services/bulkImportService');
    const rows = usePublicAccess
      ? await GoogleSheetsService.readPublicSheet(spreadsheetId, range, gid)
      : await GoogleSheetsService.readSheet(spreadsheetId, range);

    if (!rows || rows.length === 0) {
      const err = new Error('No data found in the sheet');
      err.statusCode = 400;
      throw err;
    }

    const results = kind === 'students'
      ? await BulkImportService.processStudentBulkImport(rows, {
          delayBetweenRows: parseInt(delayBetweenRows, 10) || 500,
          defaultPassword,
        })
      : await BulkImportService.processBulkImport(rows, {
          delayBetweenRows: parseInt(delayBetweenRows, 10) || 500,
          defaultPassword,
        });

    const response = {
      success: true,
      summary: {
        total: results.total,
        successful: results.successful,
        failed: results.failed,
      },
      details: results.details.map((detail) => ({
        rowNumber: detail.rowNumber,
        success: detail.success,
        expertId: detail.expert?.id || null,
        expertName: detail.expert?.name || null,
        studentId: detail.student?.id || null,
        studentName: detail.student?.name || null,
        errors: detail.errors,
      })),
    };
    await this.logActivity(auth, `bulk_import.${kind}`, { entity_type: kind, metadata: response.summary });
    return response;
  }

  async setExpertCalxbookVerification(id, visible, auth = null) {
    const updated = await this.repository.setExpertCalxbookVerification(id, visible);
    await this.logActivity(auth, 'expert.calxbook_verification.updated', {
      entity_type: 'expert',
      entity_id: id,
      metadata: { calxbook_verified: Boolean(visible) },
    });
    return updated;
  }

  async listRequirements(params) {
    return this.repository.listRequirements(params);
  }

  async getRequirementDetail(type, id) {
    const requirementType = parseRequirementType(type);
    const detail = await this.repository.getRequirementDetail(requirementType, id);
    if (!detail) {
      const err = new Error('Requirement not found');
      err.statusCode = 404;
      throw err;
    }
    return detail;
  }

  async createRequirement(body, actorUserId, files = {}, auth = null) {
    const requirementType = parseRequirementType(body.requirement_type || body.type);
    if (!body.institution_id || !body.title) {
      const err = new Error('institution_id and title are required');
      err.statusCode = 400;
      throw err;
    }

    const baseInstitutionId = body.institution_id;
    const title = String(body.title).trim();
    const description = body.description || body.responsibilities || '';

    if (requirementType === 'internship') {
      const created = await this.repository.createInternshipRequirement({
        corporate_institution_id: baseInstitutionId,
        title,
        responsibilities: description,
        skills_required: toArray(body.skills_required || body.skills),
        work_mode: body.work_mode || 'Remote',
        engagement: body.engagement || 'Part-time',
        openings: body.openings != null ? Number(body.openings) : 1,
        start_timing: body.start_timing || 'immediately',
        start_date: body.start_date || null,
        duration_value: body.duration_value != null ? Number(body.duration_value) : 1,
        duration_unit: body.duration_unit || 'months',
        paid: body.paid === true || body.paid === 'true' || body.paid === 'Paid',
        stipend_min: body.stipend_min != null ? Number(body.stipend_min) : null,
        stipend_max: body.stipend_max != null ? Number(body.stipend_max) : null,
        stipend_unit: body.stipend_unit || 'month',
        incentives_min: body.incentives_min != null ? Number(body.incentives_min) : null,
        incentives_max: body.incentives_max != null ? Number(body.incentives_max) : null,
        incentives_unit: body.incentives_unit || 'month',
        ppo: body.ppo === true || body.ppo === 'true',
        perks: toArray(body.perks),
        screening_questions: toArray(body.screening_questions),
        alt_phone: body.alt_phone || null,
        location: body.location || null,
        status: body.status || 'open',
        visibility_scope: body.visibility_scope || 'public',
      });
      await this.logActivity(auth, 'requirement.created', {
        entity_type: 'requirement',
        entity_id: created.id,
        requirement_type: 'internship',
        requirement_id: created.id,
      });
      return created;
    }

    if (requirementType === 'freelance') {
      let draftData = null;
      const draftFile = files?.draft?.[0];
      if (draftFile) {
        draftData = await ImageUploadService.uploadPDF(draftFile.buffer, 'freelance-drafts');
        if (!draftData?.success) {
          const err = new Error(`Draft upload failed: ${draftData?.error || 'Unknown error'}`);
          err.statusCode = 500;
          throw err;
        }
      }
      const created = await this.repository.createFreelanceRequirement({
        corporate_institution_id: baseInstitutionId,
        title,
        description,
        required_skills: toArray(body.required_skills || body.skills),
        deadline: body.deadline || null,
        budget_min: body.budget_min != null ? Number(body.budget_min) : null,
        budget_max: body.budget_max != null ? Number(body.budget_max) : null,
        draft_attachment_url: draftData?.url || null,
        draft_attachment_public_id: draftData?.publicId || null,
        status: body.status || 'open',
      });
      await this.logActivity(auth, 'requirement.created', {
        entity_type: 'requirement',
        entity_id: created.id,
        requirement_type: 'freelance',
        requirement_id: created.id,
      });
      return created;
    }

    let requirementPdfData = null;
    const requirementPdfFile = files?.requirement_pdf?.[0];
    if (requirementPdfFile) {
      requirementPdfData = await ImageUploadService.uploadPDF(requirementPdfFile.buffer, 'institution-contract-requirements');
      if (!requirementPdfData?.success) {
        const err = new Error(`Requirement PDF upload failed: ${requirementPdfData?.error || 'Unknown error'}`);
        err.statusCode = 500;
        throw err;
      }
    }

    const created = await this.repository.createProjectRequirement({
      institution_id: baseInstitutionId,
      title,
      description,
      type: body.project_type || 'training',
      status: body.status || 'open',
      call_status: body.call_status || 'call_now',
      required_expertise: toArray(body.required_expertise),
      domain_expertise: body.domain_expertise || null,
      subskills: toArray(body.subskills),
      job_location: body.job_location || body.location || null,
      workplace_type: body.workplace_type || null,
      employment_type: body.employment_type || null,
      interview_period_interval:
        body.interview_period_interval != null && String(body.interview_period_interval).trim() !== ''
          ? String(body.interview_period_interval).trim()
          : null,
      screening_questions: toArray(body.screening_questions),
      hourly_rate: body.hourly_rate != null ? Number(body.hourly_rate) : null,
      total_budget: body.total_budget != null ? Number(body.total_budget) : null,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      duration_hours: body.duration_hours != null ? Number(body.duration_hours) : null,
      requirement_pdf_url: requirementPdfData?.url || null,
      requirement_pdf_public_id: requirementPdfData?.publicId || null,
    });
    await this.logActivity(auth, 'requirement.created', {
      entity_type: 'requirement',
      entity_id: created.id,
      requirement_type: 'project',
      requirement_id: created.id,
    });
    return created;
  }

  async listAssignedRequirements(auth) {
    const assignments = await this.repository.listAssignmentsForAdmin(auth?.user?.id, 200);
    return {
      data: assignments.data || [],
      total: assignments.total || 0,
      page: 1,
      limit: 200,
    };
  }

  async assignRequirement(type, id, body, auth, reqMeta = {}) {
    const requirementType = parseRequirementType(type);
    const adminId = String(body.admin_id || body.admin_record_id || '').trim();
    if (!adminId) {
      const err = new Error('admin_id is required');
      err.statusCode = 400;
      throw err;
    }
    const admin = await this.repository.findAdminById(adminId);
    if (!admin || admin.status === 'disabled' || !admin.auth_user_id) {
      const err = new Error('Active admin not found');
      err.statusCode = 404;
      throw err;
    }
    const assigned = await this.repository.assignRequirement(requirementType, id, admin, {
      userId: auth?.user?.id,
      adminId: auth?.access?.adminRecord?.id,
    }, String(body.notes || '').trim());
    await this.logActivity(auth, 'requirement.assigned', {
      entity_type: 'requirement_assignment',
      entity_id: assigned.id,
      requirement_type: requirementType,
      requirement_id: id,
      metadata: { assigned_admin_id: admin.id, assigned_admin_email: admin.email },
      ...reqMeta,
    });
    return assigned;
  }

  async unassignRequirement(type, id, auth, reqMeta = {}) {
    const requirementType = parseRequirementType(type);
    const rows = await this.repository.unassignRequirement(requirementType, id);
    await this.logActivity(auth, 'requirement.unassigned', {
      entity_type: 'requirement_assignment',
      entity_id: rows?.[0]?.id,
      requirement_type: requirementType,
      requirement_id: id,
      metadata: { count: rows.length },
      ...reqMeta,
    });
    return { data: rows, count: rows.length };
  }

  async listRequirementReports(type, id, params) {
    return this.repository.listRequirementReports(parseRequirementType(type), id, params);
  }

  async createRequirementReport(type, id, body, files, auth, reqMeta = {}) {
    const requirementType = parseRequirementType(type);
    const assignment = await this.repository.getActiveAssignment(requirementType, id);
    if (!assignment || assignment.admin_user_id !== auth?.user?.id) {
      const err = new Error('Only the assigned admin can upload a daily report for this requirement');
      err.statusCode = 403;
      throw err;
    }
    const file = files?.report?.[0] || files?.document?.[0] || files?.file?.[0];
    if (!file) {
      const err = new Error('Report document is required');
      err.statusCode = 400;
      throw err;
    }
    if (!REPORT_MIME_TYPES.has(file.mimetype)) {
      const err = new Error('Unsupported report file type');
      err.statusCode = 400;
      throw err;
    }
    const upload = await ImageUploadService.uploadDocument(
      file.buffer,
      'requirement-daily-reports',
      null,
      file.mimetype,
      file.originalname,
    );
    if (!upload?.success || !upload.url) {
      const err = new Error(upload?.error || 'Report upload failed');
      err.statusCode = 502;
      throw err;
    }
    const report = await this.repository.createRequirementReport({
      assignment_id: assignment.id,
      requirement_type: requirementType,
      requirement_id: id,
      document_type: 'daily_report',
      admin_user_id: auth.user.id,
      admin_record_id: auth.access?.adminRecord?.id || assignment.admin_record_id || null,
      document_date: body.report_date || body.document_date || new Date().toISOString().slice(0, 10),
      title: body.title || 'Daily report',
      notes: String(body.summary || body.notes || '').trim() || null,
      file_url: upload.url,
      file_public_id: upload.publicId || null,
      original_filename: file.originalname || upload.originalName || null,
      mime_type: file.mimetype || null,
      file_size: file.size || upload.size || null,
    });
    await this.logActivity(auth, 'daily_report.uploaded', {
      entity_type: 'daily_report',
      entity_id: report.id,
      requirement_type: requirementType,
      requirement_id: id,
      metadata: { report_date: report.report_date, filename: report.original_filename },
      ...reqMeta,
    });
    return report;
  }

  async getOverviewCategory(category, period) {
    if (!['projects', 'internships', 'freelance'].includes(category)) {
      const err = new Error('Invalid overview category');
      err.statusCode = 400;
      throw err;
    }
    return this.repository.getOverviewCategory(category, period);
  }

  async exportOverview(params, auth) {
    await this.ensureExportAllowed(auth);
    const normalizedParams = { ...(params || {}) };
    if (normalizedParams.year && normalizedParams.month && !normalizedParams.date_from && !normalizedParams.date_to) {
      const year = Number(normalizedParams.year);
      const month = Number(normalizedParams.month);
      if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
        normalizedParams.date_from = start.toISOString();
        normalizedParams.date_to = end.toISOString();
      }
    } else if (normalizedParams.year && !normalizedParams.date_from && !normalizedParams.date_to) {
      const year = Number(normalizedParams.year);
      if (Number.isInteger(year)) {
        normalizedParams.date_from = new Date(Date.UTC(year, 0, 1)).toISOString();
        normalizedParams.date_to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
      }
    }
    const data = await this.repository.getBusinessExportData(normalizedParams);
    const buffer = await workbookBuffer(async (workbook) => {
      addSheet(workbook, 'Summary', [
        { header: 'Metric', key: 'metric', width: 28 },
        { header: 'Value', key: 'value', width: 18 },
      ], [
        { metric: 'Generated At', value: data.generated_at },
        { metric: 'Experts', value: data.experts.length },
        { metric: 'Institutions', value: data.institutions.length },
        { metric: 'Students', value: data.students.length },
        { metric: 'Requirements', value: data.requirements.length },
        { metric: 'Receivable', value: data.finance.total_receivable },
        { metric: 'Payable', value: data.finance.total_payable },
        { metric: 'Remaining', value: data.finance.remaining },
      ]);
      addSheet(workbook, 'Requirements', [
        { header: 'Type', key: 'requirement_type' },
        { header: 'Title', key: 'title', width: 32 },
        { header: 'Institution', key: 'institution', value: (r) => r.institutions?.name || '' },
        { header: 'Derived Status', key: 'derived_status' },
        { header: 'Progress', key: 'progress_label' },
        { header: 'Owner', key: 'owner', value: (r) => r.assignment?.admin?.email || '' },
        { header: 'Applications', key: 'applications', value: (r) => r.metrics?.applications_total || 0 },
        { header: 'Bookings', key: 'bookings', value: (r) => r.metrics?.bookings_total || 0 },
        { header: 'Created', key: 'created_at', width: 24 },
      ], data.requirements);
      addSheet(workbook, 'Experts', [
        { header: 'Name', key: 'name' },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Phone', key: 'phone' },
        { header: 'Domain', key: 'domain_expertise' },
        { header: 'CalxBook Verified', key: 'calxbook_verified' },
        { header: 'Created', key: 'created_at' },
      ], data.experts);
      addSheet(workbook, 'Institutions', [
        { header: 'Name', key: 'name' },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Type', key: 'type' },
        { header: 'City', key: 'city' },
        { header: 'State', key: 'state' },
        { header: 'Created', key: 'created_at' },
      ], data.institutions);
      addSheet(workbook, 'Students', [
        { header: 'Name', key: 'name' },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Degree', key: 'degree' },
        { header: 'City', key: 'city' },
        { header: 'State', key: 'state' },
        { header: 'Created', key: 'created_at' },
      ], data.students);
    });
    await this.logActivity(auth, 'export.business_overview', { entity_type: 'overview', metadata: { filters: normalizedParams } });
    return { buffer, filename: 'calxmap-business-overview.xlsx' };
  }

  async addRequirementExpert(requirementId, body, actorUserId, auth = null) {
    if (!body.expert_id) {
      const err = new Error('expert_id is required');
      err.statusCode = 400;
      throw err;
    }
    const requirementType = parseRequirementType(body.requirement_type || 'project');
    if (requirementType !== 'project') {
      const err = new Error('Expert assignment is only available for project requirements. Internship and freelance use their existing application tables.');
      err.statusCode = 400;
      throw err;
    }
    const requestedStage = body.stage === 'interview_scheduled' ? 'interview_scheduled' : 'added';
    const interviewAt = body.interview_scheduled_at || null;

    const application = await this.repository.upsertProjectApplication(requirementId, body.expert_id, {
      status: requestedStage === 'interview_scheduled' ? 'interview' : 'pending',
      ...(requestedStage === 'interview_scheduled' ? { interview_date: interviewAt } : {}),
    });

    const project = await this.repository.getProjectRequirementForAction(requirementId).catch(() => null);
    const expert = await this.repository
      .hydrateRequirementExpertRows([{ expert_id: body.expert_id }], 'id,name,email,user_id,hourly_rate')
      .then((rows) => rows?.[0]?.experts)
      .catch(() => null);
    const projectTitle = project?.title || 'Requirement';
    const institutionName = project?.institutions?.name || 'CalxMap institution';
    try {
      if (requestedStage === 'interview_scheduled') {
        await notificationService.sendMovedToInterviewNotification(expert?.email, projectTitle, requirementId);
        if (expert?.user_id) {
          await socketService.sendApplicationStatusNotification(expert.user_id, projectTitle, 'interview', requirementId);
        }
      } else {
        await notificationService.sendExpertInterestShownNotification(expert?.email, projectTitle, institutionName, requirementId);
        if (expert?.user_id) {
          await socketService.sendExpertInterestShownNotification(expert.user_id, projectTitle, institutionName, requirementId);
        }
      }
    } catch (notificationError) {
      console.warn('Super-admin add expert notification failed:', notificationError.message || notificationError);
    }

    const response = {
      id: application.id,
      application,
      requirement_id: requirementId,
      requirement_type: requirementType,
      expert_id: body.expert_id,
      stage: requestedStage,
      interview_scheduled_at: requestedStage === 'interview_scheduled' ? interviewAt : null,
      experts: expert || null,
    };
    await this.logActivity(auth, 'requirement.expert_added', {
      entity_type: 'application',
      entity_id: application.id,
      requirement_type: requirementType,
      requirement_id: requirementId,
      metadata: { expert_id: body.expert_id, stage: requestedStage },
    });
    return response;
  }

  async updateRequirementExpert(candidateId, body, actorUserId) {
    const err = new Error('Admin requirement pipeline is no longer used. Update the native application or booking instead.');
    err.statusCode = 410;
    throw err;
  }

  async runRequirementExpertAction(requirementId, candidateId, body, actorUserId) {
    const err = new Error('Admin requirement pipeline is no longer used. Update the native application or booking instead.');
    err.statusCode = 410;
    throw err;
  }

  async updateNativeRequirementApplication(type, requirementId, applicationId, body, actorUserId = null, auth = null) {
    const requirementType = parseRequirementType(type);
    const updated = await this.repository.updateNativeRequirementApplication(requirementType, requirementId, applicationId, body || {});
    if (!updated) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }
    if (requirementType === 'project' && body?.status === 'accepted' && updated.expert_id) {
      const detail = await this.repository.getRequirementDetail('project', requirementId);
      const booking = detail?.requirement
        ? await this.repository.createProjectBooking(detail.requirement, updated.expert_id)
        : null;
      await this.notifyProjectApplicationStatus(requirementId, updated, 'accepted');
      const response = { ...updated, booking };
      await this.logActivity(auth, 'requirement.application_updated', {
        entity_type: 'application',
        entity_id: applicationId,
        requirement_type: requirementType,
        requirement_id: requirementId,
        metadata: { status: body?.status, booking_id: booking?.id || null },
      });
      return response;
    }
    if (requirementType === 'project' && ['interview', 'rejected', 'pending'].includes(body?.status) && updated.expert_id) {
      await this.notifyProjectApplicationStatus(requirementId, updated, body.status);
    }
    await this.logActivity(auth, 'requirement.application_updated', {
      entity_type: 'application',
      entity_id: applicationId,
      requirement_type: requirementType,
      requirement_id: requirementId,
      metadata: { status: body?.status },
    });
    return updated;
  }

  async notifyProjectApplicationStatus(requirementId, application, status) {
    const project = await this.repository.getProjectRequirementForAction(requirementId).catch(() => null);
    const projectTitle = project?.title || 'Requirement';
    const institutionName = project?.institutions?.name || 'CalxMap institution';
    const expert = application?.experts || await this.repository
      .hydrateRequirementExpertRows([{ expert_id: application.expert_id }], 'id,name,email,user_id,hourly_rate')
      .then((rows) => rows?.[0]?.experts)
      .catch(() => null);

    try {
      if (status === 'interview') {
        await notificationService.sendMovedToInterviewNotification(expert?.email, projectTitle, requirementId);
        if (expert?.user_id) {
          await socketService.sendApplicationStatusNotification(expert.user_id, projectTitle, 'interview', requirementId);
        }
      } else if (status === 'accepted') {
        await notificationService.sendExpertSelectedWithBookingNotification(expert?.email, projectTitle, institutionName, requirementId);
        if (expert?.user_id) {
          await socketService.sendExpertSelectedWithBookingNotification(expert.user_id, projectTitle, institutionName, requirementId);
        }
      } else if (status === 'rejected') {
        await notificationService.sendApplicationStatusNotification(expert?.email, projectTitle, institutionName, 'rejected', requirementId);
      } else if (status === 'pending') {
        await notificationService.sendExpertInterestShownNotification(expert?.email, projectTitle, institutionName, requirementId);
        if (expert?.user_id) {
          await socketService.sendExpertInterestShownNotification(expert.user_id, projectTitle, institutionName, requirementId);
        }
      }
    } catch (notificationError) {
      console.warn('Super-admin project application notification failed:', notificationError.message || notificationError);
    }
  }

  async updateRequirementBooking(type, requirementId, bookingId, body, auth = null) {
    const requirementType = parseRequirementType(type);
    if (requirementType !== 'project') {
      const err = new Error('Bookings are only available for project requirements');
      err.statusCode = 400;
      throw err;
    }
    const updated = await this.repository.updateRequirementBooking(requirementId, bookingId, body || {});
    if (!updated) {
      const err = new Error('Booking not found');
      err.statusCode = 404;
      throw err;
    }
    await this.logActivity(auth, 'requirement.booking_updated', {
      entity_type: 'booking',
      entity_id: bookingId,
      requirement_type: requirementType,
      requirement_id: requirementId,
      metadata: { status: body?.status },
    });
    return updated;
  }

  async listFreelance(params) {
    return this.repository.listFreelance(params);
  }

  async listInternships(params) {
    return this.repository.listInternships(params);
  }

  async listFinanceTrainings(params) {
    return this.repository.listFinanceTrainings(params);
  }

  async getFinanceSummary() {
    return this.repository.getFinanceSummary();
  }

  async listFinancePayments(params) {
    return this.repository.listFinancePayments(params);
  }

  async getFinancePayment(id) {
    const payment = await this.repository.getFinancePayment(id);
    if (!payment) {
      const err = new Error('Payment record not found');
      err.statusCode = 404;
      throw err;
    }
    return payment;
  }

  async sendFinanceInvoice(id, body, actorUserId, auth = null) {
    const payment = await this.getFinancePayment(id);
    if (payment.status === 'paid') {
      const err = new Error('Paid records cannot be invoiced again');
      err.statusCode = 400;
      throw err;
    }

    const amount = Number(body.invoice_amount || payment.invoice_amount || payment.calculated_amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      const err = new Error('Invoice amount must be greater than zero');
      err.statusCode = 400;
      throw err;
    }

    const recipient = payment.party_type === 'expert'
      ? payment.experts
      : payment.institutions;
    if (!recipient?.email) {
      const err = new Error('Recipient email is missing');
      err.statusCode = 400;
      throw err;
    }

    const invoiceNumber = await this.repository.getNextFinanceInvoiceNumber();
    const printablePayment = {
      ...payment,
      invoice_amount: amount,
      notes: body.notes || payment.notes || null,
    };
    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber,
      payment: printablePayment,
      booking: payment.booking,
      recipient,
    });

    const upload = await ImageUploadService.uploadPDF(pdfBuffer, 'finance-invoices', invoiceNumber);
    if (!upload?.success || !upload.url) {
      const err = new Error(upload?.error || 'Invoice PDF upload failed');
      err.statusCode = 502;
      throw err;
    }

    await sendInvoiceEmail({
      to: recipient.email,
      recipientName: recipient.name,
      invoiceNumber,
      amount,
      pdfUrl: upload.url,
      partyType: payment.party_type,
      projectTitle: payment.projects?.title,
    });

    const invoice = await this.repository.createFinanceInvoice({
      invoice_number: invoiceNumber,
      payment_record_id: payment.id,
      booking_id: payment.booking_id,
      recipient_type: payment.party_type,
      recipient_email: recipient.email,
      recipient_name: recipient.name || recipient.email,
      amount,
      approved_hours: payment.approved_hours || 0,
      hourly_rate_snapshot: payment.hourly_rate_snapshot || 0,
      pdf_url: upload.url,
      pdf_public_id: upload.publicId || null,
      sent_at: new Date().toISOString(),
      sent_by: actorUserId || null,
      email_status: 'sent',
    });

    const updated = await this.repository.updateFinancePayment(payment.id, {
      status: 'invoiced',
      invoice_id: invoice.id,
      invoice_amount: amount,
      notes: body.notes || payment.notes || null,
      updated_by: actorUserId || null,
    });
    await this.logActivity(auth, 'finance.invoice_sent', { entity_type: 'finance_payment', entity_id: id, metadata: { amount, invoice_id: invoice.id } });
    return updated;
  }

  async markFinancePaymentPaid(id, body, actorUserId, auth = null) {
    const payment = await this.getFinancePayment(id);
    const amount = Number(body.paid_amount || payment.invoice_amount || payment.calculated_amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      const err = new Error('Paid amount must be greater than zero');
      err.statusCode = 400;
      throw err;
    }
    const updated = await this.repository.updateFinancePayment(id, {
      status: 'paid',
      paid_amount: amount,
      paid_at: body.paid_at || new Date().toISOString(),
      notes: body.notes || payment.notes || null,
      updated_by: actorUserId || null,
    });
    await this.logActivity(auth, 'finance.payment_marked_paid', { entity_type: 'finance_payment', entity_id: id, metadata: { amount } });
    return updated;
  }

  async listFinanceInvoices(params) {
    return this.repository.listFinanceInvoices(params);
  }

  async confirmFinanceTraining(bookingId, body, actorUserId, auth = null) {
    const updated = await this.repository.upsertFinanceRecord(bookingId, {
      approved_hours: Number(body.approved_hours || 0),
      expert_amount: Number(body.expert_amount || 0),
      institution_amount: Number(body.institution_amount || 0),
      expert_payment_status: body.expert_payment_status || 'pending',
      institution_payment_status: body.institution_payment_status || 'pending',
      confirmed_by: actorUserId || null,
      confirmed_at: new Date().toISOString(),
      notes: body.notes || null,
    });
    await this.logActivity(auth, 'finance.training_confirmed', { entity_type: 'booking', entity_id: bookingId, metadata: { approved_hours: updated.approved_hours } });
    return updated;
  }
}

module.exports = SuperAdminService;
