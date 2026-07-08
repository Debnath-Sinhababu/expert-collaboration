const { normalizePermissions } = require('./superAdmin.permissions');

function parsePage(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

function requireCalxmapEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.endsWith('@calxmap.in')) {
    const err = new Error('Admin email must use @calxmap.in');
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

function parseCreateAdminBody(body) {
  const email = requireCalxmapEmail(body.email);
  const name = String(body.name || '').trim();
  if (!name) {
    const err = new Error('Name is required');
    err.statusCode = 400;
    throw err;
  }

  return {
    email,
    name,
    password: body.password ? String(body.password) : undefined,
    permissions: normalizePermissions(body.permissions),
  };
}

function parseRequirementType(value) {
  const normalized = String(value || 'project').trim().toLowerCase();
  if (['project', 'contract', 'training'].includes(normalized)) return 'project';
  if (normalized === 'internship') return 'internship';
  if (normalized === 'freelance') return 'freelance';
  const err = new Error('Invalid requirement type');
  err.statusCode = 400;
  throw err;
}

module.exports = {
  parsePage,
  parseCreateAdminBody,
  parseRequirementType,
};
