const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const {
  DEFAULT_PROFILE_PASSWORD,
  ensureAuthUserForProfile,
} = require('../auth/profileAuthService');
const {
  PROFILE_ROLES,
  linkProfileToAuthUserId,
  listProfilesMissingAuth,
} = require('../auth/profileLinkingService');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

function usage() {
  console.log(`
Usage:
  node scripts/reconcile-profile-auth-users.js --dry-run
  node scripts/reconcile-profile-auth-users.js --apply

Creates or links Supabase auth users for experts, institutions, and site_students
whose profile row has no valid auth.users entry. New users get:
  password: ${DEFAULT_PROFILE_PASSWORD}
  email_confirm: true
  user_metadata.role + profile_complete/profile_completed
`);
}

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run') || !apply;
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    process.exit(0);
  }
  return { apply, dryRun };
}

function getServiceClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function repairProfile(serviceClient, profile) {
  const config = PROFILE_ROLES[profile.role];
  if (!config) throw new Error(`Unsupported role: ${profile.role}`);

  const authResult = await ensureAuthUserForProfile(serviceClient, {
    email: profile.email,
    role: profile.role,
  });

  await linkProfileToAuthUserId(serviceClient, {
    authUserId: authResult.userId,
    role: profile.role,
    profileId: profile.id,
  });

  return {
    ...profile,
    user_id: authResult.userId,
    auth_created: authResult.created,
  };
}

async function main() {
  const { apply, dryRun } = parseArgs(process.argv.slice(2));
  const serviceClient = getServiceClient();
  const profiles = await listProfilesMissingAuth(serviceClient);

  if (!profiles.length) {
    console.log('No profiles missing auth users.');
    return;
  }

  console.table(profiles.map((p) => ({
    role: p.role,
    reason: p.reason,
    profile_id: p.id,
    user_id: p.user_id || '',
    email: p.email,
    name: p.name || '',
  })));

  if (dryRun) {
    console.log(`Dry run only. Re-run with --apply to repair ${profiles.length} profile(s).`);
    return;
  }

  if (!apply) {
    usage();
    process.exitCode = 1;
    return;
  }

  const repaired = [];
  for (const profile of profiles) {
    repaired.push(await repairProfile(serviceClient, profile));
  }

  console.table(repaired.map((p) => ({
    role: p.role,
    profile_id: p.id,
    email: p.email,
    user_id: p.user_id,
    auth_created: p.auth_created,
  })));
  console.log(`Repaired ${repaired.length} profile(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
