const SuperAdminRepository = require('./superAdmin.repository');
const { SUPER_ADMIN_PERMISSIONS, normalizePermissions } = require('./superAdmin.permissions');
const { parseRequirementType } = require('./superAdmin.dto');
const { createServiceClient } = require('../../config/supabase');
const notificationService = require('../../../services/notificationService');
const socketService = require('../../../services/socketService');
const ImageUploadService = require('../../../services/imageUploadService');

const DEFAULT_ADMIN_PASSWORD = process.env.SUPERADMIN_DEFAULT_USER_PASSWORD || 'ExpertCollaboration@123';

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

  async createRequirement(body, actorUserId, files = {}) {
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
      return this.repository.createInternshipRequirement({
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
      return this.repository.createFreelanceRequirement({
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

    return this.repository.createProjectRequirement({
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
      screening_questions: toArray(body.screening_questions),
      hourly_rate: body.hourly_rate != null ? Number(body.hourly_rate) : null,
      total_budget: body.total_budget != null ? Number(body.total_budget) : null,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      duration_hours: body.duration_hours != null ? Number(body.duration_hours) : null,
      requirement_pdf_url: requirementPdfData?.url || null,
      requirement_pdf_public_id: requirementPdfData?.publicId || null,
      created_by: actorUserId || null,
    });
  }

  async addRequirementExpert(requirementId, body, actorUserId) {
    if (!body.expert_id) {
      const err = new Error('expert_id is required');
      err.statusCode = 400;
      throw err;
    }
    const requirementType = parseRequirementType(body.requirement_type || 'project');
    const requestedStage = body.stage === 'interview_scheduled' ? 'interview_scheduled' : 'added';
    const interviewAt = body.interview_scheduled_at || null;
    const pipelinePayload = {
      requirement_id: requirementId,
      requirement_type: requirementType,
      expert_id: body.expert_id,
      stage: requestedStage,
      interview_scheduled_at: requestedStage === 'interview_scheduled' ? interviewAt : null,
      notes: body.notes || null,
      created_by: actorUserId || null,
      updated_by: actorUserId || null,
    };

    let application = null;
    let pipeline = null;
    if (requirementType === 'project') {
      application = await this.repository.upsertProjectApplication(requirementId, body.expert_id, {
        status: requestedStage === 'interview_scheduled' ? 'interview' : 'pending',
        ...(requestedStage === 'interview_scheduled' ? { interview_date: interviewAt } : {}),
      });

      try {
        pipeline = await this.repository.addRequirementExpert(pipelinePayload);
      } catch (pipelineError) {
        console.warn('Super-admin pipeline mirror failed; application was saved:', pipelineError.message || pipelineError);
      }

      const project = await this.repository.getProjectRequirementForAction(requirementId).catch(() => null);
      const expert = pipeline?.experts || await this.repository
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

      return {
        ...(pipeline || {}),
        id: pipeline?.id || application.id,
        application,
        requirement_id: requirementId,
        requirement_type: requirementType,
        expert_id: body.expert_id,
        stage: requestedStage,
        interview_scheduled_at: requestedStage === 'interview_scheduled' ? interviewAt : null,
        experts: pipeline?.experts || expert || null,
      };
    }

    const created = await this.repository.addRequirementExpert(pipelinePayload);
    if (!created?.id) {
      const err = new Error('Expert pipeline row could not be saved. Check super_admin_requirement_experts table columns and permissions.');
      err.statusCode = 500;
      throw err;
    }
    return created;
  }

  async updateRequirementExpert(candidateId, body, actorUserId) {
    return this.repository.updateRequirementExpert(candidateId, {
      stage: body.stage,
      interview_scheduled_at: body.interview_scheduled_at || null,
      notes: body.notes || null,
      updated_by: actorUserId || null,
    });
  }

  async runRequirementExpertAction(requirementId, candidateId, body, actorUserId) {
    const action = String(body.action || '').trim();
    const candidate = await this.repository.getRequirementExpert(candidateId);
    if (!candidate || String(candidate.requirement_id) !== String(requirementId)) {
      const err = new Error('Candidate not found');
      err.statusCode = 404;
      throw err;
    }

    const notes = body.notes || candidate.notes || null;
    const interviewAt = body.interview_scheduled_at || candidate.interview_scheduled_at || null;
    const stageByAction = {
      notify: 'added',
      schedule_interview: 'interview_scheduled',
      select: 'selected',
      complete: 'completed',
      reject: 'rejected',
    };
    const nextStage = stageByAction[action];
    if (!nextStage) {
      const err = new Error('Invalid action');
      err.statusCode = 400;
      throw err;
    }

    let application = null;
    let booking = null;
    if (candidate.requirement_type === 'project') {
      const project = await this.repository.getProjectRequirementForAction(requirementId);
      const institutionName = project?.institutions?.name || 'CalxMap institution';
      const projectTitle = project?.title || 'Requirement';
      if (action === 'notify') {
        application = await this.repository.upsertProjectApplication(requirementId, candidate.expert_id, {
          status: 'pending',
        });
        try {
          await notificationService.sendExpertInterestShownNotification(candidate.experts?.email, projectTitle, institutionName, requirementId);
          if (candidate.experts?.user_id) {
            await socketService.sendExpertInterestShownNotification(candidate.experts.user_id, projectTitle, institutionName, requirementId);
          }
        } catch (notificationError) {
          console.warn('Super-admin notify expert notification failed:', notificationError.message || notificationError);
        }
      }
      if (action === 'schedule_interview') {
        application = await this.repository.upsertProjectApplication(requirementId, candidate.expert_id, {
          status: 'interview',
          interview_date: interviewAt || null,
        });
        try {
          await notificationService.sendMovedToInterviewNotification(candidate.experts?.email, projectTitle, requirementId);
          if (candidate.experts?.user_id) {
            await socketService.sendApplicationStatusNotification(candidate.experts.user_id, projectTitle, 'interview', requirementId);
          }
        } catch (notificationError) {
          console.warn('Super-admin interview notification failed:', notificationError.message || notificationError);
        }
      }
      if (action === 'select') {
        application = await this.repository.upsertProjectApplication(requirementId, candidate.expert_id, {
          status: 'accepted',
        });
        if (project) {
          booking = await this.repository.createProjectBooking(project, candidate.expert_id);
        }
        try {
          await notificationService.sendExpertSelectedWithBookingNotification(candidate.experts?.email, projectTitle, institutionName);
          if (candidate.experts?.user_id) {
            await socketService.sendExpertSelectedWithBookingNotification(candidate.experts.user_id, projectTitle, institutionName, requirementId);
          }
        } catch (notificationError) {
          console.warn('Super-admin selected expert notification failed:', notificationError.message || notificationError);
        }
      }
      if (action === 'reject') {
        application = await this.repository.upsertProjectApplication(requirementId, candidate.expert_id, {
          status: 'rejected',
        });
      }
    }

    const updated = await this.repository.updateRequirementExpert(candidateId, {
      stage: nextStage,
      interview_scheduled_at: action === 'schedule_interview' ? interviewAt : candidate.interview_scheduled_at,
      notes,
      updated_by: actorUserId || null,
    });

    return { candidate: updated, application, booking };
  }

  async updateNativeRequirementApplication(type, requirementId, applicationId, body) {
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
      return { ...updated, booking };
    }
    return updated;
  }

  async updateRequirementBooking(type, requirementId, bookingId, body) {
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
