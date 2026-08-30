const { sendBrevoEmail } = require('./financeEmailService');
const { escapeHtml } = require('./offerLetterTemplate');

// Active super admins from super_admin_users, plus any env-configured root/owner emails.
// Required via the alert service so admin recipients stay consistent across all alerts.
async function adminAlertRecipients() {
  try {
    const { resolveSuperAdminEmails } = require('./superAdminAlertService');
    const emails = await resolveSuperAdminEmails();
    return Array.isArray(emails) ? emails : [];
  } catch (err) {
    console.warn('Failed to resolve super admin alert recipients:', err.message || err);
    return [];
  }
}

function dashboardLink(path) {
  return process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}${path}` : null;
}

// The offer letter itself is intentionally not linked here — it is only viewable from the
// expert dashboard, so acceptance always happens behind login alongside Accept/Decline.
async function sendOfferLetterEmail({ to, expertName, institutionName, projectTitle }) {
  if (!to) return;
  const safeName = escapeHtml(expertName || 'there');
  const safeInstitution = escapeHtml(institutionName || 'the institution');
  const safeProject = escapeHtml(projectTitle || 'your requirement');
  const link = dashboardLink('/expert/dashboard');
  const subject = `Your CalxMap offer letter for ${projectTitle || 'your engagement'}`;
  const text = [
    `Hello ${expertName || 'there'},`,
    '',
    `CalxMap has verified your onboarding for ${projectTitle || 'the requirement'} with ${institutionName || 'the institution'}.`,
    'Your offer letter is available on your CalxMap expert dashboard. Please log in to review it and accept or decline this offer.',
    link ? `Dashboard: ${link}` : '',
    '',
    'Regards,',
    'CalxMap Onboarding Team',
  ].filter(Boolean).join('\n');
  const html = `
    <p>Hello ${safeName},</p>
    <p>CalxMap has verified your onboarding for <strong>${safeProject}</strong> with <strong>${safeInstitution}</strong>.</p>
    <p>Your offer letter is available on your CalxMap expert dashboard. Please log in to review it and Accept or Decline this offer.</p>
    ${link ? `<p><a href="${escapeHtml(link)}">Go to dashboard</a></p>` : ''}
    <p>Regards,<br/>CalxMap Onboarding Team</p>
  `;
  return sendBrevoEmail({ to, subject, text, html });
}

function signedLetterAttachments(signedPdfBuffer, expertName) {
  if (!signedPdfBuffer) return [];
  const slug = String(expertName || 'expert').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return [{ name: `signed-offer-letter-${slug || 'expert'}.pdf`, content: signedPdfBuffer }];
}

async function sendOnboardingConfirmedEmail({
  to,
  institutionName,
  expertName,
  projectTitle,
  signedPdfBuffer = null,
  signatureName = null,
}) {
  if (!to) return;
  const safeInstitution = escapeHtml(institutionName || 'there');
  const safeExpert = escapeHtml(expertName || 'The expert');
  const safeProject = escapeHtml(projectTitle || 'your requirement');
  const attachments = signedLetterAttachments(signedPdfBuffer, expertName);
  const signedLine = attachments.length
    ? `A copy of the offer letter signed by ${signatureName || expertName || 'the expert'} is attached to this email.`
    : '';
  const subject = `Onboarding confirmed for ${projectTitle || 'your requirement'}`;
  const text = [
    `Hello ${institutionName || 'there'},`,
    '',
    `${expertName || 'The expert'} has accepted the offer letter for ${projectTitle || 'your requirement'}.`,
    'The onboarding is now confirmed and the engagement can proceed as booked.',
    signedLine,
    '',
    'Regards,',
    'CalxMap Onboarding Team',
  ].filter(Boolean).join('\n');
  const html = `
    <p>Hello ${safeInstitution},</p>
    <p><strong>${safeExpert}</strong> has accepted the offer letter for <strong>${safeProject}</strong>.</p>
    <p>The onboarding is now confirmed and the engagement can proceed as booked.</p>
    ${signedLine ? `<p>${escapeHtml(signedLine)}</p>` : ''}
    <p>Regards,<br/>CalxMap Onboarding Team</p>
  `;
  return sendBrevoEmail({ to, subject, text, html, attachments });
}

/**
 * Alerts the CalxMap super admins that an expert has signed and accepted, with the signed
 * letter attached so it is on record outside the platform too.
 */
async function sendOnboardingAcceptedToAdminEmail({
  expertName,
  institutionName,
  projectTitle,
  signatureName,
  signedAt,
  signedPdfBuffer = null,
}) {
  const admins = await adminAlertRecipients();
  if (admins.length === 0) {
    console.warn('No super admin recipients resolved for offer-accepted alert');
    return;
  }
  const safeExpert = escapeHtml(expertName || 'The expert');
  const safeInstitution = escapeHtml(institutionName || 'the institution');
  const safeProject = escapeHtml(projectTitle || 'the requirement');
  const safeSignature = escapeHtml(signatureName || expertName || '-');
  const signedOn = signedAt ? new Date(signedAt).toLocaleString('en-IN') : null;
  const attachments = signedLetterAttachments(signedPdfBuffer, expertName);
  const subject = `Offer accepted: ${expertName || 'Expert'} — ${projectTitle || 'requirement'}`;
  const text = [
    `${expertName || 'The expert'} has accepted and electronically signed the offer letter for ${projectTitle || 'the requirement'} with ${institutionName || 'the institution'}.`,
    `Signed as: ${signatureName || expertName || '-'}`,
    signedOn ? `Signed at: ${signedOn}` : '',
    attachments.length ? 'The signed offer letter is attached.' : '',
  ].filter(Boolean).join('\n');
  const html = `
    <p><strong>${safeExpert}</strong> has accepted and electronically signed the offer letter for <strong>${safeProject}</strong> with <strong>${safeInstitution}</strong>.</p>
    <p><strong>Signed as:</strong> ${safeSignature}</p>
    ${signedOn ? `<p><strong>Signed at:</strong> ${escapeHtml(signedOn)}</p>` : ''}
    ${attachments.length ? '<p>The signed offer letter is attached.</p>' : ''}
  `;
  await Promise.all(admins.map((to) => sendBrevoEmail({ to, subject, text, html, attachments }).catch((err) => {
    console.warn('sendOnboardingAcceptedToAdminEmail failed for', to, err.message || err);
  })));
}

async function sendOfferDeclinedEmail({ expertName, institutionName, projectTitle, reason, auto = false }) {
  const admins = await adminAlertRecipients();
  if (admins.length === 0) {
    console.warn('No super admin recipients resolved for offer-declined alert');
    return;
  }
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

// The expert's decline reason is deliberately omitted here — it is shared only with the
// CalxMap admin team (see sendOfferDeclinedEmail), never with the institution.
async function sendOnboardingDeclinedToInstitutionEmail({ to, institutionName, expertName, projectTitle, auto = false }) {
  if (!to) return;
  const safeInstitution = escapeHtml(institutionName || 'there');
  const safeExpert = escapeHtml(expertName || 'The expert');
  const safeProject = escapeHtml(projectTitle || 'your requirement');
  const verb = auto ? 'did not respond to the offer letter in time and it has auto-expired' : 'declined the offer letter';
  const subject = auto
    ? `Offer letter expired for ${projectTitle || 'your requirement'}`
    : `Offer letter declined for ${projectTitle || 'your requirement'}`;
  const text = [
    `Hello ${institutionName || 'there'},`,
    '',
    `${expertName || 'The expert'} ${verb} for ${projectTitle || 'your requirement'}.`,
    'The booking for this engagement has been cancelled. You can select another expert to onboard.',
    '',
    'Regards,',
    'CalxMap Onboarding Team',
  ].join('\n');
  const html = `
    <p>Hello ${safeInstitution},</p>
    <p><strong>${safeExpert}</strong> ${verb} for <strong>${safeProject}</strong>.</p>
    <p>The booking for this engagement has been cancelled. You can select another expert to onboard.</p>
    <p>Regards,<br/>CalxMap Onboarding Team</p>
  `;
  return sendBrevoEmail({ to, subject, text, html });
}

module.exports = {
  sendOfferLetterEmail,
  sendOnboardingConfirmedEmail,
  sendOnboardingAcceptedToAdminEmail,
  sendOfferDeclinedEmail,
  sendOnboardingDeclinedToInstitutionEmail,
};
