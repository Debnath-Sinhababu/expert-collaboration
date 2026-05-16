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

module.exports = {
  createUserScopedClient,
  getServiceClient,
  getUserRoleFromRequest,
  requireSuperAdmin,
};
