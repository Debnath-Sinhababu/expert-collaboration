const { sendBrevoEmail } = require('./financeEmailService');
const { escapeHtml } = require('./offerLetterTemplate');

function dashboardLink(path) {
  return process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}${path}` : null;
}

function formatSessionDate(sessionDate) {
  const d = new Date(`${sessionDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return sessionDate;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

async function sendMissingAttendanceEmail({ to, expertName, projectTitle, bookingId, sessionDate }) {
  if (!to) return;
  const safeName = escapeHtml(expertName || 'there');
  const safeProject = escapeHtml(projectTitle || 'your training project');
  const displayDate = formatSessionDate(sessionDate);
  const safeDate = escapeHtml(displayDate);
  const link = dashboardLink(`/expert/dashboard?tab=bookings&bookingId=${bookingId}&date=${sessionDate}`);
  const subject = `Missing attendance for ${displayDate} — ${projectTitle || 'your training project'}`;
  const text = [
    `Hello ${expertName || 'there'},`,
    '',
    `We noticed your attendance for ${displayDate} on ${projectTitle || 'your training project'} is not marked yet.`,
    'Please log in to your CalxMap dashboard and mark entry/exit for that date.',
    link ? `Dashboard: ${link}` : '',
    '',
    'Regards,',
    'CalxMap Team',
  ].filter(Boolean).join('\n');
  const html = `
    <p>Hello ${safeName},</p>
    <p>We noticed your attendance for <strong>${safeDate}</strong> on <strong>${safeProject}</strong> is not marked yet.</p>
    <p>Please log in to your CalxMap dashboard and mark entry/exit for that date.</p>
    ${link ? `<p><a href="${escapeHtml(link)}">Go to dashboard</a></p>` : ''}
    <p>Regards,<br/>CalxMap Team</p>
  `;
  return sendBrevoEmail({ to, subject, text, html });
}

module.exports = {
  sendMissingAttendanceEmail,
};
