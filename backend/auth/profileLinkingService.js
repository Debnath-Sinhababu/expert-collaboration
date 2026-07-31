const PROFILE_ROLES = {
  expert: {
    table: 'experts',
    homePath: '/expert/home',
  },
  institution: {
    table: 'institutions',
    homePath: '/institution/home',
  },
  student: {
    table: 'site_students',
    homePath: '/student/home',
  },
};

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return PROFILE_ROLES[role] ? role : null;
}

function profileMeta(role, profileId) {
  return {
    role,
    profile_complete: true,
    profile_completed: true,
    profile_id: profileId,
  };
}

async function getAuthUserById(serviceClient, userId) {
  if (!userId) return null;
  const { data, error } = await serviceClient.auth.admin.getUserById(userId);
  if (error || !data?.user?.id) return null;
  return data.user;
}

async function updateAuthMetadata(serviceClient, user, role, profileId) {
  const meta = user?.user_metadata || {};
  const nextMeta = {
    ...meta,
    ...profileMeta(role, profileId),
  };

  const { data, error } = await serviceClient.auth.admin.updateUserById(user.id, {
    user_metadata: nextMeta,
  });
  if (error) throw error;
  return data?.user || user;
}

async function linkProfileToAuthUserId(serviceClient, { authUserId, role, profileId }) {
  const normalizedRole = normalizeRole(role);
  const config = PROFILE_ROLES[normalizedRole];
  if (!config) throw new Error('Invalid profile role');
  if (!authUserId) throw new Error('Auth user id is required');
  if (!profileId) throw new Error('Profile id is required');

  const { data: authUserData, error: getUserError } = await serviceClient.auth.admin.getUserById(authUserId);
  if (getUserError) throw getUserError;
  const authUser = authUserData?.user;
  if (!authUser?.id) throw new Error('Auth user was not found after creation/linking');

  await updateAuthMetadata(serviceClient, authUser, normalizedRole, profileId);

  const { error: profileUpdateError } = await serviceClient
    .from(config.table)
    .update({ user_id: authUser.id })
    .eq('id', profileId);
  if (profileUpdateError) throw profileUpdateError;

  return authUser;
}

async function findProfileByEmail(serviceClient, role, email) {
  const config = PROFILE_ROLES[role];
  if (!config) throw new Error('Invalid profile role');

  const { data, error } = await serviceClient
    .from(config.table)
    .select('id, user_id, email')
    .ilike('email', normalizeEmail(email))
    .order('created_at', { ascending: false })
    .limit(2);

  if (error) throw error;
  if (!data?.length) return null;
  if (data.length > 1) {
    const error = new Error(`Multiple ${role} profiles found for this email. Please resolve duplicates manually.`);
    error.statusCode = 409;
    throw error;
  }
  return data[0];
}

async function linkProfileToAuthUser(serviceClient, { authUser, role, profile }) {
  if (!authUser?.id) {
    const error = new Error('Authenticated user is required');
    error.statusCode = 401;
    throw error;
  }

  const normalizedUserEmail = normalizeEmail(authUser.email);
  const normalizedProfileEmail = normalizeEmail(profile?.email);
  if (!normalizedUserEmail || normalizedUserEmail !== normalizedProfileEmail) {
    const error = new Error('Profile email does not match the signed-in account');
    error.statusCode = 403;
    throw error;
  }

  const config = PROFILE_ROLES[role];
  if (!config) throw new Error('Invalid profile role');

  if (profile.user_id && profile.user_id !== authUser.id) {
    const linkedAuthUser = await getAuthUserById(serviceClient, profile.user_id);
    if (linkedAuthUser?.id) {
      const error = new Error('This profile is already linked to another active login account.');
      error.statusCode = 409;
      throw error;
    }
  }

  await linkProfileToAuthUserId(serviceClient, {
    authUserId: authUser.id,
    role,
    profileId: profile.id,
  });

  return {
    linked: true,
    role,
    profileId: profile.id,
    redirectTo: config.homePath,
  };
}

async function completeExistingProfileForAuthUser(serviceClient, authUser, role) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    const error = new Error('Valid role is required');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = normalizeEmail(authUser?.email);
  if (!normalizedEmail) {
    const error = new Error('Signed-in account email is required');
    error.statusCode = 400;
    throw error;
  }

  const profile = await findProfileByEmail(serviceClient, normalizedRole, normalizedEmail);
  if (!profile) {
    return { linked: false };
  }

  return linkProfileToAuthUser(serviceClient, {
    authUser,
    role: normalizedRole,
    profile,
  });
}

async function listProfilesMissingAuth(serviceClient) {
  const rows = [];

  for (const [role, config] of Object.entries(PROFILE_ROLES)) {
    const { data, error } = await serviceClient
      .from(config.table)
      .select('id, user_id, email, name, created_at')
      .not('email', 'is', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const profile of data || []) {
      let reason = null;
      if (!profile.user_id) {
        reason = 'missing_user_id';
      } else {
        const linkedAuthUser = await getAuthUserById(serviceClient, profile.user_id);
        if (!linkedAuthUser?.id) reason = 'auth_user_missing';
      }

      if (reason) {
        rows.push({
          role,
          table: config.table,
          reason,
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          name: profile.name || null,
          created_at: profile.created_at || null,
        });
      }
    }
  }

  return rows;
}

module.exports = {
  PROFILE_ROLES,
  completeExistingProfileForAuthUser,
  linkProfileToAuthUserId,
  listProfilesMissingAuth,
  normalizeEmail,
  normalizeRole,
  profileMeta,
  updateAuthMetadata,
};
