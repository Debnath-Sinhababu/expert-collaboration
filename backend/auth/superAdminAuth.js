/**
 * JWT validation for elevated super_admin operations.
 */
const { createClient } = require('@supabase/supabase-js');

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
  const role = user.user_metadata?.role || null;
  return { user, role, token };
}

/**
 * @returns {Promise<{ user: object, token: string } | null>} null after sending error response.
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
  if (user.user_metadata?.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return { user, token };
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
  requireSuperAdmin,
  deleteLinkedAuthUser,
  hardDeleteProfileRow,
};
