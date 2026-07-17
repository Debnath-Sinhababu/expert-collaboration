const SuperAdminService = require('./superAdmin.service');
const { parseCreateAdminBody, parsePage } = require('./superAdmin.dto');
const superAdminAuth = require('../../../auth/superAdminAuth');

function requestMeta(req) {
  return {
    ip_address: req.ip || req.headers['x-forwarded-for'] || null,
    user_agent: req.headers['user-agent'] || null,
  };
}

function sendWorkbook(res, result) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(Buffer.from(result.buffer));
}

class SuperAdminController {
  constructor(service = new SuperAdminService()) {
    this.service = service;
  }

  me = async (req, res) => {
    res.json(this.service.getMe(req.superAdmin));
  };

  overviewStats = async (_req, res) => {
    res.json(await this.service.getOverviewStats());
  };

  listAdmins = async (req, res) => {
    res.json(await this.service.listAdmins(parsePage(req.query)));
  };

  createAdmin = async (req, res) => {
    const created = await this.service.createAdmin(parseCreateAdminBody(req.body || {}), req.superAdmin.user.id, req.superAdmin);
    res.status(201).json(created);
  };

  updateAdmin = async (req, res) => {
    res.json(await this.service.updateAdmin(req.params.id, req.body || {}, req.superAdmin.user.id, req.superAdmin));
  };

  getAdminDetail = async (req, res) => {
    res.json(await this.service.getAdminDetail(req.params.id));
  };

  listAdminActivity = async (req, res) => {
    const paging = parsePage(req.query);
    res.json(await this.service.listAdminActivity(req.params.id, {
      ...paging,
      action: req.query.action || '',
      requirement_type: req.query.requirement_type || '',
      requirement_id: req.query.requirement_id || '',
      date_from: req.query.date_from || '',
      date_to: req.query.date_to || '',
    }));
  };

  exportAdminActivity = async (req, res) => {
    if (
      !superAdminAuth.hasSuperAdminPermission(req.superAdmin.access, 'activity:read')
      || !superAdminAuth.hasSuperAdminPermission(req.superAdmin.access, 'exports:download')
    ) {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }
    const result = await this.service.exportAdminActivity(req.params.id, {
      action: req.query.action || '',
      requirement_type: req.query.requirement_type || '',
      requirement_id: req.query.requirement_id || '',
      date_from: req.query.date_from || '',
      date_to: req.query.date_to || '',
    }, req.superAdmin);
    sendWorkbook(res, result);
  };

  listProfiles = async (req, res) => {
    const paging = parsePage(req.query);
    res.json(await this.service.listProfiles(req.query.type || 'experts', {
      ...paging,
      search: req.query.search ? String(req.query.search) : '',
      domain_expertise: req.query.domain_expertise || '',
      skill: req.query.skill || '',
      expert_type: req.query.expert_type || '',
      expert_service: req.query.expert_service || '',
      designation: req.query.designation || '',
      experience_min: req.query.experience_min || '',
      experience_max: req.query.experience_max || '',
      hourly_rate_min: req.query.hourly_rate_min || '',
      hourly_rate_max: req.query.hourly_rate_max || '',
      city: req.query.city || '',
      state: req.query.state || '',
      is_verified: req.query.is_verified,
      kyc_status: req.query.kyc_status || '',
      calxbook_verified: req.query.calxbook_verified,
      interested: req.query.interested,
      institution_id: req.query.institution_id || '',
      degree: req.query.degree || '',
      specialization: req.query.specialization || '',
      year: req.query.year || '',
      availability: req.query.availability || '',
      preferred_engagement: req.query.preferred_engagement || '',
      preferred_work_mode: req.query.preferred_work_mode || '',
      currently_studying: req.query.currently_studying,
      student_count_min: req.query.student_count_min || '',
      student_count_max: req.query.student_count_max || '',
      established_year_min: req.query.established_year_min || '',
      established_year_max: req.query.established_year_max || '',
      institution_type: req.query.institution_type || '',
    }));
  };

  bulkImportExperts = async (req, res) => {
    res.json(await this.service.bulkImport('experts', req.body || {}, req.superAdmin));
  };

  bulkImportStudents = async (req, res) => {
    res.json(await this.service.bulkImport('students', req.body || {}, req.superAdmin));
  };

  setExpertCalxbookVerification = async (req, res) => {
    res.json(await this.service.setExpertCalxbookVerification(req.params.id, req.body?.calxbook_verified, req.superAdmin));
  };

  listRequirements = async (req, res) => {
    const paging = parsePage(req.query);
    res.json(await this.service.listRequirements({
      ...paging,
      type: req.query.type || 'all',
      status: req.query.status || 'all',
      derived_status: req.query.derived_status || '',
      search: req.query.search || '',
      institution_id: req.query.institution_id || '',
      assigned_admin_id: req.query.assigned_admin_id || '',
    }));
  };

  getRequirementDetail = async (req, res) => {
    res.json(await this.service.getRequirementDetail(req.params.type, req.params.id));
  };

  createRequirement = async (req, res) => {
    const created = await this.service.createRequirement(req.body || {}, req.superAdmin.user.id, req.files || {}, req.superAdmin);
    res.status(201).json(created);
  };

  listAssignedRequirements = async (req, res) => {
    res.json(await this.service.listAssignedRequirements(req.superAdmin));
  };

  assignRequirement = async (req, res) => {
    res.status(201).json(await this.service.assignRequirement(req.params.type, req.params.id, req.body || {}, req.superAdmin, requestMeta(req)));
  };

  unassignRequirement = async (req, res) => {
    res.json(await this.service.unassignRequirement(req.params.type, req.params.id, req.superAdmin, requestMeta(req)));
  };

  listRequirementReports = async (req, res) => {
    res.json(await this.service.listRequirementReports(req.params.type, req.params.id, parsePage(req.query)));
  };

  createRequirementReport = async (req, res) => {
    res.status(201).json(await this.service.createRequirementReport(req.params.type, req.params.id, req.body || {}, req.files || {}, req.superAdmin, requestMeta(req)));
  };

  overviewCategory = async (req, res) => {
    res.json(await this.service.getOverviewCategory(req.params.category, req.query.period || 'monthly'));
  };

  exportOverview = async (req, res) => {
    const result = await this.service.exportOverview({
      date_from: req.query.date_from || '',
      date_to: req.query.date_to || '',
      month: req.query.month || '',
      year: req.query.year || '',
    }, req.superAdmin);
    sendWorkbook(res, result);
  };

  addRequirementExpert = async (req, res) => {
    const created = await this.service.addRequirementExpert(req.params.id, req.body || {}, req.superAdmin.user.id, req.superAdmin);
    res.status(201).json(created);
  };

  updateRequirementExpert = async (req, res) => {
    res.json(await this.service.updateRequirementExpert(req.params.candidateId, req.body || {}, req.superAdmin.user.id));
  };

  runRequirementExpertAction = async (req, res) => {
    res.json(await this.service.runRequirementExpertAction(
      req.params.id,
      req.params.candidateId,
      req.body || {},
      req.superAdmin.user.id,
    ));
  };

  updateNativeRequirementApplication = async (req, res) => {
    res.json(await this.service.updateNativeRequirementApplication(
      req.params.type,
      req.params.id,
      req.params.applicationId,
      req.body || {},
      req.superAdmin.user.id,
      req.superAdmin,
    ));
  };

  updateRequirementBooking = async (req, res) => {
    res.json(await this.service.updateRequirementBooking(
      req.params.type,
      req.params.id,
      req.params.bookingId,
      req.body || {},
      req.superAdmin,
    ));
  };

  updateRequirementDates = async (req, res) => {
    res.json(await this.service.updateRequirementDates(
      req.params.type,
      req.params.id,
      req.body || {},
      req.superAdmin,
    ));
  };

  updateRequirementStatus = async (req, res) => {
    res.json(await this.service.updateRequirementStatus(
      req.params.type,
      req.params.id,
      req.body || {},
      req.superAdmin,
    ));
  };

  reviewProjectEditRequest = async (req, res) => {
    res.json(await this.service.reviewProjectEditRequest(
      req.params.type,
      req.params.id,
      req.params.requestId,
      req.body || {},
      req.superAdmin,
    ));
  };

  listFreelance = async (req, res) => {
    const paging = parsePage(req.query);
    res.json(await this.service.listFreelance({ ...paging, search: req.query.search || '' }));
  };

  listInternships = async (req, res) => {
    const paging = parsePage(req.query);
    res.json(await this.service.listInternships({ ...paging, search: req.query.search || '' }));
  };

  listFinanceTrainings = async (req, res) => {
    res.json(await this.service.listFinanceTrainings(parsePage(req.query)));
  };

  financeSummary = async (_req, res) => {
    res.json(await this.service.getFinanceSummary());
  };

  listFinancePayments = async (req, res) => {
    const paging = parsePage(req.query);
    res.json(await this.service.listFinancePayments({
      ...paging,
      party_type: req.query.party_type,
      status: req.query.status || '',
      search: req.query.search || '',
    }));
  };

  getFinancePayment = async (req, res) => {
    res.json(await this.service.getFinancePayment(req.params.id));
  };

  updateFinancePaymentAdjustment = async (req, res) => {
    res.json(await this.service.updateFinancePaymentAdjustment(
      req.params.id,
      req.body || {},
      req.superAdmin.user.id,
      req.superAdmin,
    ));
  };

  sendFinanceInvoice = async (req, res) => {
    res.json(await this.service.sendFinanceInvoice(req.params.id, req.body || {}, req.superAdmin.user.id, req.superAdmin));
  };

  markFinancePaymentPaid = async (req, res) => {
    res.json(await this.service.markFinancePaymentPaid(req.params.id, req.body || {}, req.superAdmin.user.id, req.superAdmin));
  };

  listFinanceInvoices = async (req, res) => {
    const paging = parsePage(req.query);
    res.json(await this.service.listFinanceInvoices({
      ...paging,
      recipient_type: req.query.recipient_type || '',
      search: req.query.search || '',
    }));
  };

  confirmFinanceTraining = async (req, res) => {
    res.json(await this.service.confirmFinanceTraining(req.params.bookingId, req.body || {}, req.superAdmin.user.id, req.superAdmin));
  };
}

module.exports = SuperAdminController;
