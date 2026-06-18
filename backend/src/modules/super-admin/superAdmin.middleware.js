const superAdminAuth = require('../../../auth/superAdminAuth');

function requireSuperAdmin(permission) {
  return async (req, res, next) => {
    const auth = permission
      ? await superAdminAuth.requireSuperAdminPermission(req, res, permission)
      : await superAdminAuth.requireSuperAdmin(req, res);

    if (!auth) return;
    req.superAdmin = auth;
    next();
  };
}

module.exports = {
  requireSuperAdmin,
};
