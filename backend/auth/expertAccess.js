/**
 * Shared expert access resolution for expert owners and super_admin (acting).
 * Super admin must send X-Acting-Expert-Id matching the target expert UUID.
 */
const { createClient } = require('@supabase/supabase-js');

const ACTING_HEADER = 'x-acting-expert-id';

function getServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function parseActingExpertId(req) {
  const raw =
    req.headers[ACTING_HEADER] ||
    req.headers['X-Acting-Expert-Id'] ||
    req.query?.acting_expert_id;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

function createUserScopedClient(token) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
}

async function getAuthedUserFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, token: null, error: 'No token' };
  }
  const token = authHeader.substring(7);
  const client = createUserScopedClient(token);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    return { user: null, token: null, error: error?.message || 'Invalid user' };
  }
  return { user, token, userClient: client };
}

function getRole(user) {
  return user?.user_metadata?.role || null;
}

/**
 * @returns {Promise<{ mode: 'owner'|'super_admin', expert: object, user: object, userClient: import('@supabase/supabase-js').SupabaseClient } | null>}
 */
async function resolveExpertAccess(req, expertId) {
  if (!expertId || typeof expertId !== 'string') return null;

  const { user, userClient, error } = await getAuthedUserFromRequest(req);
  if (!user || !userClient) return null;

  const service = getServiceClient();
  const { data: expertRow, error: expertErr } = await service
    .from('experts')
    .select('*')
    .eq('id', expertId)
    .maybeSingle();

  if (expertErr || !expertRow) return null;

  const role = getRole(user);

  if (role === 'super_admin') {
    const actingId = parseActingExpertId(req);
    if (!actingId || actingId !== expertId) return null;
    return { mode: 'super_admin', expert: expertRow, user, userClient };
  }

  if (expertRow.user_id === user.id) {
    return { mode: 'owner', expert: expertRow, user, userClient };
  }

  return null;
}

function getWriteClientForExpert(access) {
  if (access.mode === 'super_admin') {
    return getServiceClient();
  }
  return access.userClient;
}

module.exports = {
  getServiceClient,
  parseActingExpertId,
  getAuthedUserFromRequest,
  getRole,
  resolveExpertAccess,
  getWriteClientForExpert
};
