const InstitutionsService = require('./institutions.service');

class InstitutionsController {
  constructor(service = new InstitutionsService()) {
    this.service = service;
  }

  list = async (req, res) => {
    const data = await this.service.list(req);
    res.json(data);
  };

  getById = async (req, res) => {
    const data = await this.service.getById(req, req.params.id);
    res.json(data);
  };

  getByUserId = async (req, res) => {
    const data = await this.service.getByUserId(req.params.userId);
    res.json(data);
  };

  create = async (req, res) => {
    try {
      const created = await this.service.create(req);
      res.status(201).json(created);
    } catch (error) {
      console.log('Institution creation error:', error);
      throw error;
    }
  };

  update = async (req, res) => {
    try {
      const updated = await this.service.update(req, req.params.id);
      res.json(updated);
    } catch (error) {
      console.log('PUT /api/institutions/:id - Error:', error.message);
      throw error;
    }
  };

  financeSummary = async (req, res) => {
    const data = await this.service.getFinanceSummary(req);
    res.json(data);
  };
}

module.exports = InstitutionsController;
