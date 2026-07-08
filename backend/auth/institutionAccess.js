/**
 * Shared institution access resolution for institution owners and super_admin (acting).
 * Super admin must send X-Acting-Institution-Id matching the target institution UUID.
 */
const { createClient } = require('@supabase/supabase-js');

const ACTING_HEADER = 'x-acting-institution-id';

function getServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function parseActingInstitutionId(req) {
  const raw =
    req.headers[ACTING_HEADER] ||
    req.headers['X-Acting-Institution-Id'] ||
    req.query?.acting_institution_id;
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
 * @returns {Promise<{ mode: 'owner'|'super_admin', institution: object, user: object, userClient: import('@supabase/supabase-js').SupabaseClient } | null>}
 */
async function resolveInstitutionAccess(req, institutionId) {
  if (!institutionId || typeof institutionId !== 'string') return null;

  const { user, userClient, error } = await getAuthedUserFromRequest(req);
  if (!user || !userClient) return null;

  const service = getServiceClient();
  const { data: instRow, error: instErr } = await service
    .from('institutions')
    .select('*')
    .eq('id', institutionId)
    .maybeSingle();

  if (instErr || !instRow) return null;

  const role = getRole(user);

  if (role === 'super_admin') {
    const actingId = parseActingInstitutionId(req);
    if (!actingId || actingId !== institutionId) return null;
    return { mode: 'super_admin', institution: instRow, user, userClient };
  }

  if (instRow.user_id === user.id) {
    return { mode: 'owner', institution: instRow, user, userClient };
  }

  return null;
}

function getWriteClientForInstitution(access) {
  if (access.mode === 'super_admin') {
    return getServiceClient();
  }
  return access.userClient;
}

function isSuperAdminDeleteBlocked(req, access) {
  if (access && access.mode === 'super_admin' && req.method === 'DELETE') {
    return true;
  }
  return false;
}

module.exports = {
  getServiceClient,
  parseActingInstitutionId,
  getAuthedUserFromRequest,
  getRole,
  resolveInstitutionAccess,
  getWriteClientForInstitution,
  isSuperAdminDeleteBlocked
};
