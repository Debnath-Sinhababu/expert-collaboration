const { sendBrevoEmail } = require('./financeEmailService');
const { escapeHtml } = require('./offerLetterTemplate');

function rootAdminEmails() {
  const configured = process.env.SUPERADMIN_ROOT_EMAILS || process.env.SUPER_ADMIN_ROOT_EMAILS || '';
  return configured
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

function dashboardLink(path) {
  return process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}${path}` : null;
}

async function sendOfferLetterEmail({ to, expertName, institutionName, projectTitle, pdfUrl }) {
  if (!to) return;
  const safeName = escapeHtml(expertName || 'there');
  const safeInstitution = escapeHtml(institutionName || 'the institution');
  const safeProject = escapeHtml(projectTitle || 'your requirement');
  const safePdfUrl = escapeHtml(pdfUrl);
  const link = dashboardLink('/expert/dashboard');
  const subject = `Your CalxMap offer letter for ${projectTitle || 'your engagement'}`;
  const text = [
    `Hello ${expertName || 'there'},`,
    '',
    `CalxMap has verified your onboarding for ${projectTitle || 'the requirement'} with ${institutionName || 'the institution'}.`,
    `Your offer letter: ${pdfUrl}`,
    'Please log in to your CalxMap expert dashboard to accept or decline this offer.',
    link ? `Dashboard: ${link}` : '',
    '',
    'Regards,',
    'CalxMap Onboarding Team',
  ].filter(Boolean).join('\n');
  const html = `
    <p>Hello ${safeName},</p>
    <p>CalxMap has verified your onboarding for <strong>${safeProject}</strong> with <strong>${safeInstitution}</strong>.</p>
    <p><a href="${safePdfUrl}">View your offer letter</a></p>
    <p>Please log in to your CalxMap expert dashboard to Accept or Decline this offer.</p>
    ${link ? `<p><a href="${escapeHtml(link)}">Go to dashboard</a></p>` : ''}
    <p>Regards,<br/>CalxMap Onboarding Team</p>
  `;
  return sendBrevoEmail({ to, subject, text, html });
}

async function sendOnboardingConfirmedEmail({ to, institutionName, expertName, projectTitle }) {
  if (!to) return;
  const safeInstitution = escapeHtml(institutionName || 'there');
  const safeExpert = escapeHtml(expertName || 'The expert');
  const safeProject = escapeHtml(projectTitle || 'your requirement');
  const subject = `Onboarding confirmed for ${projectTitle || 'your requirement'}`;
  const text = [
    `Hello ${institutionName || 'there'},`,
    '',
    `${expertName || 'The expert'} has accepted the offer letter for ${projectTitle || 'your requirement'}.`,
    'The onboarding is now confirmed and the engagement can proceed as booked.',
    '',
    'Regards,',
    'CalxMap Onboarding Team',
  ].join('\n');
  const html = `
    <p>Hello ${safeInstitution},</p>
    <p><strong>${safeExpert}</strong> has accepted the offer letter for <strong>${safeProject}</strong>.</p>
    <p>The onboarding is now confirmed and the engagement can proceed as booked.</p>
    <p>Regards,<br/>CalxMap Onboarding Team</p>
  `;
  return sendBrevoEmail({ to, subject, text, html });
}

async function sendOfferDeclinedEmail({ expertName, institutionName, projectTitle, reason, auto = false }) {
  const admins = rootAdminEmails();
  if (admins.length === 0) return;
  const safeExpert = escapeHtml(expertName || 'The expert');
  const safeInstitution = escapeHtml(institutionName || 'the institution');
  const safeProject = escapeHtml(projectTitle || 'the requirement');
  const safeReason = escapeHtml(reason || 'No reason provided');
  const verb = auto ? 'auto-expired without a response from' : 'was declined by';
  const subject = auto
    ? `Offer auto-expired: ${expertName || 'Expert'} — ${projectTitle || 'requirement'}`
    : `Offer declined: ${expertName || 'Expert'} — ${projectTitle || 'requirement'}`;
  const text = [
    `The offer letter for ${projectTitle || 'the requirement'} with ${institutionName || 'the institution'} ${verb} ${expertName || 'the expert'}.`,
    `Reason: ${reason || 'No reason provided'}`,
  ].join('\n');
  const html = `
    <p>The offer letter for <strong>${safeProject}</strong> with <strong>${safeInstitution}</strong> ${verb} <strong>${safeExpert}</strong>.</p>
    <p><strong>Reason:</strong> ${safeReason}</p>
  `;
  await Promise.all(admins.map((to) => sendBrevoEmail({ to, subject, text, html }).catch((err) => {
    console.warn('sendOfferDeclinedEmail failed for', to, err.message || err);
  })));
}

async function sendOnboardingDeclinedToInstitutionEmail({ to, institutionName, expertName, projectTitle, reason, auto = false }) {
  if (!to) return;
  const safeInstitution = escapeHtml(institutionName || 'there');
  const safeExpert = escapeHtml(expertName || 'The expert');
  const safeProject = escapeHtml(projectTitle || 'your requirement');
  const safeReason = escapeHtml(reason || 'No reason provided');
  const verb = auto ? 'did not respond to the offer letter in time and it has auto-expired' : 'declined the offer letter';
  const subject = auto
    ? `Offer letter expired for ${projectTitle || 'your requirement'}`
    : `Offer letter declined for ${projectTitle || 'your requirement'}`;
  const text = [
    `Hello ${institutionName || 'there'},`,
    '',
    `${expertName || 'The expert'} ${verb} for ${projectTitle || 'your requirement'}.`,
    `Reason: ${reason || 'No reason provided'}`,
    'The booking for this engagement has been cancelled. You can select another expert to onboard.',
    '',
    'Regards,',
    'CalxMap Onboarding Team',
  ].join('\n');
  const html = `
    <p>Hello ${safeInstitution},</p>
    <p><strong>${safeExpert}</strong> ${verb} for <strong>${safeProject}</strong>.</p>
    <p><strong>Reason:</strong> ${safeReason}</p>
    <p>The booking for this engagement has been cancelled. You can select another expert to onboard.</p>
    <p>Regards,<br/>CalxMap Onboarding Team</p>
  `;
  return sendBrevoEmail({ to, subject, text, html });
}

module.exports = {
  sendOfferLetterEmail,
  sendOnboardingConfirmedEmail,
  sendOfferDeclinedEmail,
  sendOnboardingDeclinedToInstitutionEmail,
};
