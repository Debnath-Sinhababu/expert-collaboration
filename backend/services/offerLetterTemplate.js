function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatRate(grossPerUnit, unit) {
  if (!grossPerUnit) return 'As agreed between the parties';
  const unitLabel = unit ? String(unit).replace(/_/g, ' ') : 'engagement';
  return `Rs. ${Number(grossPerUnit).toLocaleString('en-IN')} per ${unitLabel}`;
}

/**
 * Static offer-letter HTML template with dynamic fields interpolated.
 * @param {Object} data
 * @param {string} data.expertName
 * @param {string} data.institutionName
 * @param {string} data.projectTitle
 * @param {number} data.grossPerUnit
 * @param {string} data.compensationUnit
 * @param {string} data.startDate
 * @param {string} data.endDate
 * @param {string} data.offerDate
 */
function buildOfferLetterHtml(data) {
  const expertName = escapeHtml(data.expertName || 'Expert');
  const institutionName = escapeHtml(data.institutionName || 'the institution');
  const projectTitle = escapeHtml(data.projectTitle || 'the requirement');
  const rateLine = escapeHtml(formatRate(data.grossPerUnit, data.compensationUnit));
  const startDate = escapeHtml(formatDate(data.startDate));
  const endDate = escapeHtml(formatDate(data.endDate));
  const offerDate = escapeHtml(formatDate(data.offerDate || new Date().toISOString()));

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { margin: 36px 48px; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.6; }
      .letterhead { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #008260; padding-bottom: 16px; margin-bottom: 28px; }
      .letterhead h1 { font-size: 20px; margin: 0; color: #008260; letter-spacing: 0.5px; }
      .letterhead .tagline { font-size: 11px; color: #6a6a6a; margin-top: 2px; }
      .meta { text-align: right; font-size: 12px; color: #6a6a6a; }
      h2.title { font-size: 16px; text-align: center; text-decoration: underline; margin: 24px 0; }
      p { margin: 0 0 12px 0; }
      table.details { width: 100%; border-collapse: collapse; margin: 20px 0; }
      table.details td { padding: 8px 10px; border: 1px solid #e0e0e0; }
      table.details td.label { background: #f4f7f6; font-weight: 600; width: 40%; }
      .footer { margin-top: 48px; font-size: 11px; color: #6a6a6a; border-top: 1px solid #e0e0e0; padding-top: 12px; }
      .signature { margin-top: 40px; }
    </style>
  </head>
  <body>
    <div class="letterhead">
      <div>
        <h1>CalxMap</h1>
        <div class="tagline">Expert Collaboration Platform</div>
      </div>
      <div class="meta">Date: ${offerDate}</div>
    </div>

    <h2 class="title">Letter of Offer &amp; Onboarding Confirmation</h2>

    <p>Dear ${expertName},</p>

    <p>
      We are pleased to confirm your engagement for the requirement
      <strong>${projectTitle}</strong> raised by <strong>${institutionName}</strong>,
      facilitated through the CalxMap platform. This letter sets out the key
      terms of your engagement.
    </p>

    <table class="details">
      <tr><td class="label">Expert Name</td><td>${expertName}</td></tr>
      <tr><td class="label">Institution</td><td>${institutionName}</td></tr>
      <tr><td class="label">Requirement / Role</td><td>${projectTitle}</td></tr>
      <tr><td class="label">Compensation</td><td>${rateLine}</td></tr>
      <tr><td class="label">Engagement Start Date</td><td>${startDate}</td></tr>
      <tr><td class="label">Engagement End Date</td><td>${endDate}</td></tr>
    </table>

    <p>
      Please review the details above and respond with your acceptance or
      decline from your CalxMap expert dashboard. Your engagement will only
      be considered confirmed once you accept this offer.
    </p>

    <div class="signature">
      <p>Regards,</p>
      <p><strong>CalxMap Onboarding Team</strong></p>
    </div>

    <div class="footer">
      This is a system-generated offer letter issued via the CalxMap platform on behalf of ${institutionName}.
    </div>
  </body>
</html>`;
}

module.exports = {
  buildOfferLetterHtml,
  escapeHtml,
};
