const SuperAdminRepository = require('../src/modules/super-admin/superAdmin.repository');

class FinanceDashboardService {
  constructor(repository = new SuperAdminRepository()) {
    this.repository = repository;
  }

  async getExpertSummary(expertId) {
    return {
      summary: await this.repository.getFinanceSummary({ party_type: 'expert', expert_id: expertId }),
      payments: await this.repository.listFinanceRecordsForScope({ party_type: 'expert', expert_id: expertId }, 10),
    };
  }

  async getInstitutionSummary(institutionId) {
    return {
      summary: await this.repository.getFinanceSummary({ party_type: 'institution', institution_id: institutionId }),
      payments: await this.repository.listFinanceRecordsForScope({ party_type: 'institution', institution_id: institutionId }, 10),
    };
  }
}

module.exports = FinanceDashboardService;
