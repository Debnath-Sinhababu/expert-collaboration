const superAdminAuth = require('../../../auth/superAdminAuth');

function requireSuperAdmin(permission) {
  return async (req, res, next) => {
    const auth = await superAdminAuth.requireSuperAdmin(req, res);

    if (!auth) return;
    if (permission) {
      const permissions = Array.isArray(permission) ? permission : [permission];
      const allowed = permissions.some((item) => superAdminAuth.hasSuperAdminPermission(auth.access, item));
      if (!allowed) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }
    }
    req.superAdmin = auth;
    next();
  };
}

module.exports = {
  requireSuperAdmin,
};
