const SuperAdminRepository = require('../src/modules/super-admin/superAdmin.repository');
const privacyMask = require('../privacyMask');

function maskFinanceRecord(row, viewerRole) {
  if (!row || typeof row !== 'object') return row;
  const next = { ...row };
  if (next.experts) next.experts = privacyMask.maskExpertObject(next.experts, viewerRole);
  if (next.institutions) next.institutions = privacyMask.maskInstitutionObject(next.institutions, viewerRole);
  if (next.booking) {
    next.booking = privacyMask.maskBookingsPayload([next.booking], viewerRole, viewerRole)[0];
  }
  return next;
}

class FinanceDashboardService {
  constructor(repository = new SuperAdminRepository()) {
    this.repository = repository;
  }

  async getExpertSummary(expertId) {
    const payments = await this.repository.listFinanceRecordsForScope({ party_type: 'expert', expert_id: expertId }, 10);
    return {
      summary: await this.repository.getFinanceSummary({ party_type: 'expert', expert_id: expertId }),
      payments: payments.map((row) => maskFinanceRecord(row, 'expert')),
    };
  }

  async getInstitutionSummary(institutionId) {
    const payments = await this.repository.listFinanceRecordsForScope({ party_type: 'institution', institution_id: institutionId }, 10);
    return {
      summary: await this.repository.getFinanceSummary({ party_type: 'institution', institution_id: institutionId }),
      payments: payments.map((row) => maskFinanceRecord(row, 'institution')),
    };
  }
}

module.exports = FinanceDashboardService;
