const { createClient } = require('@supabase/supabase-js');
const { sendBrevoEmail } = require('./financeEmailService');

function getServiceClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Root/owner emails that should always receive admin alerts, even before any super_admin_users row exists. */
function rootAdminEmails() {
  const configured = process.env.SUPERADMIN_ROOT_EMAILS || process.env.SUPER_ADMIN_ROOT_EMAILS || '';
  return [...configured.split(','), process.env.ADMIN_AUTH_EMAIL]
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean);
}

async function getSuperAdminEmails(client) {
  const emails = new Set(rootAdminEmails());
  try {
    const { data, error } = await client
      .from('super_admin_users')
      .select('email, status')
      .neq('status', 'disabled');
    if (error) throw error;
    for (const row of data || []) {
      const email = String(row?.email || '').trim().toLowerCase();
      if (email) emails.add(email);
    }
  } catch (err) {
    console.warn('Failed to load super admin emails:', err.message || err);
  }
  return [...emails];
}

async function notifySuperAdmins(client, { subject, message }) {
  const emails = await getSuperAdminEmails(client);
  if (!emails.length) return;
  await Promise.all(
    emails.map((email) =>
      sendBrevoEmail({ to: email, subject, text: message, html: `<p>${message}</p>` }).catch((err) => {
        console.warn(`Failed to send admin alert email to ${email}:`, err.message || err);
      })
    )
  );
}

/** Fires whenever an institution submits a new onboarding case for an expert. */
async function notifyOnboardingPendingReview(client = getServiceClient()) {
  try {
    const { count, error } = await client
      .from('onboarding_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review');
    if (error) throw error;
    const pending = count || 0;
    if (pending <= 0) return;
    await notifySuperAdmins(client, {
      subject: `${pending} onboarding request${pending === 1 ? '' : 's'} awaiting your verification`,
      message: `There ${pending === 1 ? 'is' : 'are'} currently ${pending} onboarding request${pending === 1 ? '' : 's'} left for review on CalxMap. Please log in to the super-admin console to verify and send the offer letter${pending === 1 ? '' : 's'}.`,
    });
  } catch (err) {
    console.warn('Failed to notify super admins of pending onboarding review:', err.message || err);
  }
}

/** Fires whenever an institution posts a new requirement awaiting a margin. */
async function notifyMarginPendingReview(client = getServiceClient()) {
  try {
    const { count, error } = await client
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('margin_status', 'pending_review');
    if (error) throw error;
    const pending = count || 0;
    if (pending <= 0) return;
    await notifySuperAdmins(client, {
      subject: `${pending} requirement${pending === 1 ? '' : 's'} awaiting margin approval`,
      message: `There ${pending === 1 ? 'is' : 'are'} currently ${pending} requirement${pending === 1 ? '' : 's'} left for margin review on CalxMap. Please log in to the super-admin console to set the platform margin before ${pending === 1 ? 'it goes' : 'they go'} live to experts.`,
    });
  } catch (err) {
    console.warn('Failed to notify super admins of pending margin review:', err.message || err);
  }
}

module.exports = {
  notifyOnboardingPendingReview,
  notifyMarginPendingReview,
};
