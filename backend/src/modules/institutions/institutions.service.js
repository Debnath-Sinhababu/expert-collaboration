const ImageUploadService = require('../../../services/imageUploadService');
const FinanceDashboardService = require('../../../services/financeDashboardService');
const institutionAccess = require('../../../auth/institutionAccess');
const superAdminAuth = require('../../../auth/superAdminAuth');
const { ensureAuthUserForProfile, authLoginMeta } = require('../../../auth/profileAuthService');
const { isCommonEmailProvider } = require('../../shared/emailProviders');
const InstitutionsRepository = require('./institutions.repository');
const {
  parseListQuery,
  buildCreatePayload,
  normalizeUpdateBody,
} = require('./institutions.dto');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

class InstitutionsService {
  constructor(
    repository = new InstitutionsRepository(),
    financeDashboardService = new FinanceDashboardService(),
  ) {
    this.repository = repository;
    this.financeDashboardService = financeDashboardService;
  }

  async list(req) {
    const filters = parseListQuery(req.query);
    const client = await this.repository.resolveReadClient(req);
    return this.repository.list(client, filters);
  }

  async getById(req, id) {
    const client = await this.repository.resolveReadClient(req);
    const data = await this.repository.findById(client, id);
    if (!data) throw httpError(404, 'Institution not found');
    return data;
  }

  async getByUserId(userId) {
    const data = await this.repository.findByUserId(userId);
    if (!data) throw httpError(404, 'Institution not found');
    return data;
  }

  async create(req) {
    console.log('=== INSTITUTION CREATION DEBUG ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    const authHeader = req.headers.authorization;
    let supabaseClient = this.repository.getDefaultClient();
    let authenticatedUserId = null;

    const { user: instCreateUser, role: instCreateRole, token: instCreateToken } =
      await superAdminAuth.getUserRoleFromRequest(req);

    let instAuthMeta = null;
    if (instCreateRole === 'super_admin' && instCreateUser) {
      supabaseClient = this.repository.getServiceClient();
      const rawUid = req.body.user_id;
      authenticatedUserId = (typeof rawUid === 'string' && rawUid.trim() !== '')
        ? rawUid.trim()
        : (rawUid && String(rawUid).trim() !== '' ? String(rawUid).trim() : null);
    } else if (authHeader && authHeader.startsWith('Bearer ') && instCreateToken) {
      const token = authHeader.substring(7);
      console.log('Token received:', token.substring(0, 50) + '...');

      supabaseClient = this.repository.getAuthedClient(token);

      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      console.log('Authenticated user:', userData?.user?.id);
      console.log('User error:', userError);

      if (userData?.user?.id) {
        authenticatedUserId = userData.user.id;
      }
    } else {
      console.log('No auth token provided');
    }

    let logoUrl = req.body.logo_url || null;
    if (req.file) {
      const logoData = await ImageUploadService.uploadImage(req.file.buffer, 'institution-logos');
      if (!logoData.success) {
        throw httpError(500, `Logo upload failed: ${logoData.error}`);
      }
      logoUrl = logoData.url;
    }

    const { institutionEmail, institutionData } = buildCreatePayload(req.body, {
      authenticatedUserId,
      logoUrl,
    });

    if (!institutionEmail) {
      throw httpError(400, 'Institution contact email is required.');
    }
    if (isCommonEmailProvider(institutionEmail)) {
      throw httpError(
        400,
        'Institution profiles must use an institution or corporate email address. Personal email providers like gmail.com, yahoo.com, hotmail.com, outlook.com, icloud.com are not allowed.',
      );
    }

    if (instCreateRole === 'super_admin' && instCreateUser && !authenticatedUserId) {
      const existingInst = await this.repository.findIdByEmail(supabaseClient, institutionEmail);
      if (existingInst) {
        throw httpError(409, 'An institution with this email already exists.');
      }
      try {
        const authResult = await ensureAuthUserForProfile(supabaseClient, {
          email: institutionEmail,
          role: 'institution',
          password: req.body.initial_password,
        });
        authenticatedUserId = authResult.userId;
        institutionData.user_id = authenticatedUserId;
        instAuthMeta = authLoginMeta(authResult, institutionEmail);
      } catch (authErr) {
        throw httpError(400, authErr.message || 'Failed to create login account');
      }
    }

    console.log('Institution data to insert:', institutionData);

    const created = await this.repository.insert(supabaseClient, institutionData);
    console.log('Insert result:', { data: created });

    return instAuthMeta ? { ...created, auth: instAuthMeta } : created;
  }

  async update(req, id) {
    const access = await institutionAccess.resolveInstitutionAccess(req, id);
    if (!access) {
      throw httpError(403, 'Unauthorized');
    }

    const supabaseClient = institutionAccess.getWriteClientForInstitution(access);
    const updateData = normalizeUpdateBody(req.body);

    if (req.file) {
      const logoData = await ImageUploadService.uploadImage(req.file.buffer, 'institution-logos');
      if (!logoData.success) {
        throw httpError(500, `Logo upload failed: ${logoData.error}`);
      }
      updateData.logo_url = logoData.url;
    }

    const data = await this.repository.update(supabaseClient, id, updateData);
    console.log('PUT /api/institutions/:id - Supabase response data:', data);

    if (!data || data.length === 0) {
      console.log('PUT /api/institutions/:id - No data returned, sending empty object');
      return {};
    }
    console.log('PUT /api/institutions/:id - Sending data:', data[0]);
    return data[0];
  }

  async getFinanceSummary(req) {
    const institutionId = String(req.query.institution_id || '').trim();
    if (!institutionId) {
      throw httpError(400, 'institution_id is required');
    }
    await institutionAccess.resolveInstitutionAccess(req, institutionId);
    return this.financeDashboardService.getInstitutionSummary(institutionId);
  }
}

module.exports = InstitutionsService;
