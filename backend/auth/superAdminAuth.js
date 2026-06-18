/**
 * JWT validation for elevated super_admin operations.
 */
const { createClient } = require('@supabase/supabase-js');
const {
  SUPER_ADMIN_PERMISSIONS,
  normalizePermissions,
  hasPermission,
} = require('../src/modules/super-admin/superAdmin.permissions');

function createUserScopedClient(token) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );
}

function getServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function getRootSuperAdminEmails() {
  const configured = process.env.SUPERADMIN_ROOT_EMAILS || process.env.SUPER_ADMIN_ROOT_EMAILS || '';
  const defaults = [
    process.env.ADMIN_AUTH_EMAIL,
    'no404nothing@gmail.com',
  ];
  return new Set(
    [...configured.split(','), ...defaults]
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean),
  );
}

function isRootSuperAdminEmail(email) {
  return getRootSuperAdminEmails().has(String(email || '').trim().toLowerCase());
}

function getRawRole(user) {
  return user?.user_metadata?.role || null;
}

function isSuperAdminRole(role) {
  return role === 'super_admin' || role === 'superadmin';
}

function normalizeRole(role) {
  return isSuperAdminRole(role) ? 'super_admin' : role;
}

function isLegacyRootSuperAdmin(user) {
  return getRawRole(user) === 'superadmin' && user?.user_metadata?.super_admin_managed !== true;
}

function isManagedSuperAdmin(user) {
  return user?.user_metadata?.super_admin_managed === true;
}

function isCalxmapEmail(email) {
  return String(email || '').trim().toLowerCase().endsWith('@calxmap.in');
}

function shouldTreatAsRootSuperAdmin(user, adminRecord) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (isLegacyRootSuperAdmin(user)) return true;
  if (isRootSuperAdminEmail(email)) return true;
  if (isManagedSuperAdmin(user)) return false;
  if (adminRecord?.created_by) return false;

  const metaPermissions = normalizePermissions(user?.user_metadata?.super_admin_permissions);
  if (metaPermissions.length > 0) return false;

  if (getRawRole(user) === 'super_admin' && !adminRecord) return true;

  // Created admins are forced to @calxmap.in. Older/root owner accounts may predate that rule.
  if (getRawRole(user) === 'super_admin' && !isCalxmapEmail(email)) return true;

  return false;
}

/**
 * @returns {Promise<{ user: object | null, role: string | null, token: string | null, error?: string }>}
 */
async function getUserRoleFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, role: null, token: null, error: 'No token' };
  }
  const token = authHeader.substring(7);
  const client = createUserScopedClient(token);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    return { user: null, role: null, token: null, error: error?.message || 'Invalid user' };
  }
  const role = normalizeRole(getRawRole(user));
  return { user, role, token };
}

async function loadSuperAdminAccess(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (isLegacyRootSuperAdmin(user) || isRootSuperAdminEmail(email)) {
    return {
      isRoot: true,
      hasAllAccess: true,
      permissions: SUPER_ADMIN_PERMISSIONS,
      adminRecord: null,
      email,
      legacyRoot: true,
    };
  }

  const serviceClient = getServiceClient();

  const { data, error } = await serviceClient
    .from('super_admin_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) {
    const message = error.message || '';
    if (/relation .*super_admin_users.* does not exist/i.test(message) || error.code === '42P01') {
      const metaPermissions = normalizePermissions(user.user_metadata?.super_admin_permissions);
      if (user.user_metadata?.super_admin_managed === true || metaPermissions.length > 0) {
        return {
          isRoot: false,
          hasAllAccess: false,
          permissions: metaPermissions,
          adminRecord: null,
          email,
          status: user.user_metadata?.super_admin_status || 'active',
          metadataFallback: true,
          tableMissing: true,
        };
      }
      if (!shouldTreatAsRootSuperAdmin(user, null)) {
        return {
          isRoot: false,
          hasAllAccess: false,
          permissions: [],
          adminRecord: null,
          email,
          status: 'active',
          tableMissing: true,
        };
      }
      return {
        isRoot: true,
        hasAllAccess: true,
        permissions: SUPER_ADMIN_PERMISSIONS,
        adminRecord: null,
        tableMissing: true,
      };
    }
    throw error;
  }

  if (!data) {
    const metaPermissions = normalizePermissions(user.user_metadata?.super_admin_permissions);
    if (user.user_metadata?.super_admin_managed === true || metaPermissions.length > 0) {
      return {
        isRoot: false,
        hasAllAccess: false,
        permissions: metaPermissions,
        adminRecord: null,
        email,
        status: user.user_metadata?.super_admin_status || 'active',
        metadataFallback: true,
      };
    }

    if (shouldTreatAsRootSuperAdmin(user, null)) {
      return {
        isRoot: true,
        hasAllAccess: true,
        permissions: SUPER_ADMIN_PERMISSIONS,
        adminRecord: null,
        email,
      };
    }

    return {
      isRoot: false,
      hasAllAccess: false,
      permissions: [],
      adminRecord: null,
      email,
    };
  }

  if (shouldTreatAsRootSuperAdmin(user, data)) {
    return {
      isRoot: true,
      hasAllAccess: true,
      permissions: SUPER_ADMIN_PERMISSIONS,
      adminRecord: data,
      email,
    };
  }

  return {
    isRoot: false,
    hasAllAccess: false,
    permissions: normalizePermissions(data.permissions),
    adminRecord: data,
    email,
    status: data.status || 'active',
  };
}

/**
 * @returns {Promise<{ user: object, token: string, access: object } | null>} null after sending error response.
 */
async function requireSuperAdmin(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization required' });
    return null;
  }
  const token = authHeader.substring(7);
  const client = createUserScopedClient(token);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    res.status(401).json({ error: error?.message || 'Invalid token' });
    return null;
  }
  if (!isSuperAdminRole(getRawRole(user))) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  let access;
  try {
    access = await loadSuperAdminAccess(user);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load admin access' });
    return null;
  }

  if (access.status && access.status !== 'active') {
    res.status(403).json({ error: 'Admin account is disabled' });
    return null;
  }

  return { user, token, access };
}

async function requireSuperAdminPermission(req, res, permission) {
  const auth = await requireSuperAdmin(req, res);
  if (!auth) return null;
  if (!hasPermission(auth.access, permission)) {
    res.status(403).json({ error: 'Permission denied' });
    return null;
  }
  return auth;
}

/**
 * Mark auth user as removed, then delete so they cannot sign in after profile hard-delete.
 */
async function deleteLinkedAuthUser(serviceClient, userId) {
  if (userId == null || userId === '') return;
  const uid = String(userId).trim();
  if (!uid) return;

  const { data: existing, error: getErr } = await serviceClient.auth.admin.getUserById(uid);
  if (getErr) {
    const msg = getErr.message || '';
    if (/not found|User not found/i.test(msg)) return;
    throw getErr;
  }

  const meta = existing?.user?.user_metadata || {};
  await serviceClient.auth.admin.updateUserById(uid, {
    user_metadata: { ...meta, account_removed: true },
  });

  const { error } = await serviceClient.auth.admin.deleteUser(uid);
  if (error) {
    const msg = error.message || '';
    if (/not found|User not found/i.test(msg)) return;
    throw error;
  }
}

/**
 * Hard-delete a profile row, then remove its linked auth user (if any).
 * @returns {Promise<{ id: string } | null>}
 */
async function hardDeleteProfileRow(serviceClient, table, profileId) {
  const { data: row, error: fetchErr } = await serviceClient
    .from(table)
    .select('id, user_id')
    .eq('id', profileId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!row) return null;

  const linkedUserId = row.user_id;

  const { data, error } = await serviceClient
    .from(table)
    .delete()
    .eq('id', profileId)
    .select('id');
  if (error) throw error;
  if (!data?.length) return null;

  try {
    await deleteLinkedAuthUser(serviceClient, linkedUserId);
  } catch (authErr) {
    const err = new Error(
      `Profile deleted but login account could not be removed: ${authErr.message || authErr}`,
    );
    err.code = 'AUTH_DELETE_FAILED';
    throw err;
  }

  return data[0];
}

module.exports = {
  createUserScopedClient,
  getServiceClient,
  getUserRoleFromRequest,
  loadSuperAdminAccess,
  requireSuperAdmin,
  requireSuperAdminPermission,
  deleteLinkedAuthUser,
  hardDeleteProfileRow,
  isSuperAdminRole,
  normalizeRole,
};
