const SUPER_ADMIN_PERMISSIONS = Object.freeze([
  'overview:read',
  'admins:read',
  'admins:write',
  'activity:read',
  'profiles:read',
  'profiles:write',
  'bulk_import:write',
  'calxbook_verification:write',
  'requirements:read',
  'requirements:write',
  'requirements:candidates',
  'assignments:read',
  'assignments:write',
  'daily_reports:read',
  'daily_reports:write',
  'freelance:read',
  'freelance:write',
  'internships:read',
  'internships:write',
  'finance:read',
  'finance:write',
  'finance:confirm',
  'exports:download',
]);

const SUPER_ADMIN_PERMISSION_SET = new Set(SUPER_ADMIN_PERMISSIONS);

function normalizePermissions(value) {
  if (!value) return [];
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'object'
      ? Object.entries(value)
          .filter(([, enabled]) => Boolean(enabled))
          .map(([permission]) => permission)
      : [];

  const normalized = new Set(raw.map(String).filter((p) => SUPER_ADMIN_PERMISSION_SET.has(p)));
  const impliedReads = {
    'admins:write': 'admins:read',
    'activity:read': 'admins:read',
    'profiles:write': 'profiles:read',
    'bulk_import:write': 'profiles:read',
    'calxbook_verification:write': 'profiles:read',
    'requirements:write': 'requirements:read',
    'requirements:candidates': 'requirements:read',
    'assignments:write': 'assignments:read',
    'assignments:read': 'requirements:read',
    'daily_reports:write': 'daily_reports:read',
    'daily_reports:read': 'assignments:read',
    'freelance:write': 'freelance:read',
    'internships:write': 'internships:read',
    'finance:write': 'finance:read',
    'finance:confirm': 'finance:read',
    'exports:download': 'overview:read',
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const permission of [...normalized]) {
      const implied = impliedReads[permission];
      if (implied && !normalized.has(implied)) {
        normalized.add(implied);
        changed = true;
      }
    }
  }
  return [...normalized];
}

function hasPermission(access, permission) {
  if (!permission) return true;
  if (access?.isRoot || access?.hasAllAccess) return true;
  const permissions = normalizePermissions(access?.permissions);
  return permissions.includes(permission);
}

module.exports = {
  SUPER_ADMIN_PERMISSIONS,
  SUPER_ADMIN_PERMISSION_SET,
  normalizePermissions,
  hasPermission,
};
