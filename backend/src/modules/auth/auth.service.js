const {
  confirmEmailByToken,
  confirmPasswordReset,
  createOrRefreshAuthUser,
  requestPasswordReset,
} = require('../../../services/authEmailService');
const AuthRepository = require('./auth.repository');
const {
  parseRegisterBody,
  parseTokenBody,
  parseForgotPasswordBody,
  parsePasswordResetConfirmBody,
} = require('./auth.dto');

function httpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

class AuthService {
  constructor(repository = new AuthRepository()) {
    this.repository = repository;
  }

  async healthLive() {
    try {
      await this.repository.pingExperts();
      return { status: 'OK', message: 'API and Supabase are running' };
    } catch (err) {
      console.error('Health check failed:', err.message);
      throw httpError(500, err.message || 'Health check failed', {
        healthPayload: { status: 'ERROR', message: err.message },
      });
    }
  }

  healthStatic() {
    return { status: 'OK' };
  }

  async register(body) {
    const { email, password, role } = parseRegisterBody(body);
    try {
      const result = await createOrRefreshAuthUser({ email, password, role });
      return {
        success: true,
        needsEmailVerification: true,
        user: {
          id: result.userId,
          email: result.email,
          role: result.role,
        },
      };
    } catch (err) {
      const statusCode = err?.statusCode || (err?.code === 'AUTH_USER_EXISTS' ? 409 : 500);
      throw httpError(statusCode, err.message || 'Failed to register account');
    }
  }

  async confirmEmail(body) {
    const { token } = parseTokenBody(body);
    if (!token) throw httpError(400, 'Token is required');
    try {
      const result = await confirmEmailByToken(token);
      return { success: true, user: result };
    } catch (err) {
      throw httpError(err?.statusCode || 500, err.message || 'Failed to confirm email');
    }
  }

  async forgotPassword(body) {
    const { email } = parseForgotPasswordBody(body);
    if (!email) throw httpError(400, 'Email is required');
    try {
      const result = await requestPasswordReset(email);
      return { success: true, ...result };
    } catch (err) {
      throw httpError(500, err.message || 'Failed to send reset email');
    }
  }

  async confirmPasswordReset(body) {
    const { token, password } = parsePasswordResetConfirmBody(body);
    if (!token) throw httpError(400, 'Token is required');
    if (!password) throw httpError(400, 'Password is required');
    try {
      const result = await confirmPasswordReset(token, password);
      return { success: true, userId: result.userId };
    } catch (err) {
      throw httpError(err?.statusCode || 500, err.message || 'Failed to reset password');
    }
  }
}

module.exports = AuthService;
