const SuperAdminService = require('./superAdmin.service');
const { parseCreateAdminBody, parsePage } = require('./superAdmin.dto');

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
    const created = await this.service.createAdmin(parseCreateAdminBody(req.body || {}), req.superAdmin.user.id);
    res.status(201).json(created);
  };

  updateAdmin = async (req, res) => {
    res.json(await this.service.updateAdmin(req.params.id, req.body || {}, req.superAdmin.user.id));
  };

  listProfiles = async (req, res) => {
    const paging = parsePage(req.query);
    res.json(await this.service.listProfiles(req.query.type || 'experts', {
      ...paging,
      search: req.query.search ? String(req.query.search) : '',
      interested: req.query.interested === undefined ? undefined : String(req.query.interested) === 'true',
    }));
  };

  bulkImportExperts = async (req, res) => {
    res.json(await this.service.bulkImport('experts', req.body || {}));
  };

  bulkImportStudents = async (req, res) => {
    res.json(await this.service.bulkImport('students', req.body || {}));
  };

  setExpertCalxbookVerification = async (req, res) => {
    res.json(await this.service.setExpertCalxbookVerification(req.params.id, req.body?.calxbook_verified));
  };

  listRequirements = async (req, res) => {
    const paging = parsePage(req.query);
    res.json(await this.service.listRequirements({
      ...paging,
      type: req.query.type || 'all',
      status: req.query.status || 'all',
      search: req.query.search || '',
      institution_id: req.query.institution_id || '',
    }));
  };

  getRequirementDetail = async (req, res) => {
    res.json(await this.service.getRequirementDetail(req.params.type, req.params.id));
  };

  createRequirement = async (req, res) => {
    const created = await this.service.createRequirement(req.body || {}, req.superAdmin.user.id, req.files || {});
    res.status(201).json(created);
  };

  addRequirementExpert = async (req, res) => {
    const created = await this.service.addRequirementExpert(req.params.id, req.body || {}, req.superAdmin.user.id);
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
    ));
  };

  updateRequirementBooking = async (req, res) => {
    res.json(await this.service.updateRequirementBooking(
      req.params.type,
      req.params.id,
      req.params.bookingId,
      req.body || {},
      req.superAdmin.user.id,
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

  sendFinanceInvoice = async (req, res) => {
    res.json(await this.service.sendFinanceInvoice(req.params.id, req.body || {}, req.superAdmin.user.id));
  };

  markFinancePaymentPaid = async (req, res) => {
    res.json(await this.service.markFinancePaymentPaid(req.params.id, req.body || {}, req.superAdmin.user.id));
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
    res.json(await this.service.confirmFinanceTraining(req.params.bookingId, req.body || {}, req.superAdmin.user.id));
  };
}

module.exports = SuperAdminController;
