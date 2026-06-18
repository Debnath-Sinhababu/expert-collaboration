const SuperAdminRepository = require('./superAdmin.repository');
const { SUPER_ADMIN_PERMISSIONS, normalizePermissions } = require('./superAdmin.permissions');
const { parseRequirementType } = require('./superAdmin.dto');
const { createServiceClient } = require('../../config/supabase');

const DEFAULT_ADMIN_PASSWORD = process.env.SUPERADMIN_DEFAULT_USER_PASSWORD || 'ExpertCollaboration@123';

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

  async createAdmin(input, actorUserId) {
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
      return await this.repository.saveAdminRecord(recordPayload);
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

  async updateAdmin(id, body, actorUserId) {
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
      return this.repository.updateAdminRecord(existingRecord.id, {
        ...payload,
        name: nextName,
        status: nextStatus,
        permissions: nextPermissions,
        disabled_message: nextDisabledMessage,
      });
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

  async bulkImport(kind, body) {
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

    return {
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
  }

  async setExpertCalxbookVerification(id, visible) {
    return this.repository.setExpertCalxbookVerification(id, visible);
  }

  async listRequirements(params) {
    return this.repository.listRequirements(params);
  }

  async createRequirement(body, actorUserId) {
    const requirementType = parseRequirementType(body.requirement_type || body.type);
    if (requirementType !== 'project') {
      const err = new Error('Creating internships and freelance projects from this endpoint is not enabled yet');
      err.statusCode = 400;
      throw err;
    }
    if (!body.institution_id || !body.title) {
      const err = new Error('institution_id and title are required');
      err.statusCode = 400;
      throw err;
    }

    return this.repository.createProjectRequirement({
      institution_id: body.institution_id,
      title: String(body.title).trim(),
      description: body.description || '',
      type: body.project_type || 'training',
      status: body.status || 'open',
      call_status: body.call_status || 'call_now',
      required_expertise: Array.isArray(body.required_expertise) ? body.required_expertise : [],
      domain_expertise: body.domain_expertise || null,
      subskills: Array.isArray(body.subskills) ? body.subskills : [],
      hourly_rate: body.hourly_rate != null ? Number(body.hourly_rate) : null,
      total_budget: body.total_budget != null ? Number(body.total_budget) : null,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      duration_hours: body.duration_hours != null ? Number(body.duration_hours) : null,
      created_by: actorUserId || null,
    });
  }

  async addRequirementExpert(requirementId, body, actorUserId) {
    if (!body.expert_id) {
      const err = new Error('expert_id is required');
      err.statusCode = 400;
      throw err;
    }
    return this.repository.addRequirementExpert({
      requirement_id: requirementId,
      requirement_type: parseRequirementType(body.requirement_type || 'project'),
      expert_id: body.expert_id,
      stage: body.stage || 'added',
      interview_scheduled_at: body.interview_scheduled_at || null,
      notes: body.notes || null,
      created_by: actorUserId || null,
      updated_by: actorUserId || null,
    });
  }

  async updateRequirementExpert(candidateId, body, actorUserId) {
    return this.repository.updateRequirementExpert(candidateId, {
      stage: body.stage,
      interview_scheduled_at: body.interview_scheduled_at || null,
      notes: body.notes || null,
      updated_by: actorUserId || null,
    });
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

  async confirmFinanceTraining(bookingId, body, actorUserId) {
    return this.repository.upsertFinanceRecord(bookingId, {
      approved_hours: Number(body.approved_hours || 0),
      expert_amount: Number(body.expert_amount || 0),
      institution_amount: Number(body.institution_amount || 0),
      expert_payment_status: body.expert_payment_status || 'pending',
      institution_payment_status: body.institution_payment_status || 'pending',
      confirmed_by: actorUserId || null,
      confirmed_at: new Date().toISOString(),
      notes: body.notes || null,
    });
  }
}

module.exports = SuperAdminService;
