/**
 * Create or link Supabase auth users for profiles (super-admin create, bulk import).
 */
const DEFAULT_PROFILE_PASSWORD =
  process.env.SUPERADMIN_DEFAULT_USER_PASSWORD || 'ExpertCollaboration@123';

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceClient
 * @param {{ email: string, role: 'expert'|'institution'|'student', password?: string }} opts
 * @returns {Promise<{ userId: string, created: boolean, temporaryPassword?: string }>}
 */
async function ensureAuthUserForProfile(serviceClient, { email, role, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required to create a login account');
  }
  const pwd = (password && String(password).trim()) || DEFAULT_PROFILE_PASSWORD;

  const { data: createUserData, error: createUserError } = await serviceClient.auth.admin.createUser({
    email: normalizedEmail,
    password: pwd,
    email_confirm: true,
    user_metadata: { role },
  });

  if (!createUserError && createUserData?.user?.id) {
    return { userId: createUserData.user.id, created: true, temporaryPassword: pwd };
  }

  const errMsg = createUserError?.message || '';
  if (errMsg.includes('already') || errMsg.includes('registered')) {
    const userId = await findAuthUserIdByEmail(serviceClient, normalizedEmail);
    if (!userId) {
      throw new Error('Email already registered but could not link to existing account');
    }
    const { data: existing } = await serviceClient.auth.admin.getUserById(userId);
    const meta = existing?.user?.user_metadata || {};
    if (meta.role !== role) {
      await serviceClient.auth.admin.updateUserById(userId, {
        user_metadata: { ...meta, role },
      });
    }
    return { userId, created: false };
  }

  throw createUserError || new Error('Auth user creation failed');
}

async function findAuthUserIdByEmail(serviceClient, email) {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (page <= 20) {
    const { data: listData, error } = await serviceClient.auth.admin.listUsers({ perPage, page });
    if (error) throw error;
    const users = listData?.users || [];
    const match = users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match.id;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

function authLoginMeta(authResult, email) {
  if (!authResult) return undefined;
  return {
    email: String(email || '').trim().toLowerCase(),
    canLogin: true,
    isNewAccount: authResult.created,
    ...(authResult.created && authResult.temporaryPassword
      ? { temporaryPassword: authResult.temporaryPassword }
      : {}),
  };
}

module.exports = {
  DEFAULT_PROFILE_PASSWORD,
  ensureAuthUserForProfile,
  authLoginMeta,
};
