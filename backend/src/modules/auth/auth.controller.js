const AuthService = require('./auth.service');

class AuthController {
  constructor(service = new AuthService()) {
    this.service = service;
  }

  healthLive = async (req, res) => {
    try {
      const payload = await this.service.healthLive();
      res.json(payload);
    } catch (err) {
      if (err.healthPayload) {
        return res.status(err.statusCode || 500).json(err.healthPayload);
      }
      console.error('Health check exception:', err.message);
      res.status(500).json({ status: 'ERROR', message: err.message });
    }
  };

  healthStatic = (req, res) => {
    res.json(this.service.healthStatic());
  };

  register = async (req, res) => {
    const payload = await this.service.register(req.body || {});
    res.status(201).json(payload);
  };

  confirmEmail = async (req, res) => {
    const payload = await this.service.confirmEmail(req.body || {});
    res.json(payload);
  };

  forgotPassword = async (req, res) => {
    const payload = await this.service.forgotPassword(req.body || {});
    res.json(payload);
  };

  confirmPasswordReset = async (req, res) => {
    const payload = await this.service.confirmPasswordReset(req.body || {});
    res.json(payload);
  };
}

module.exports = AuthController;
