function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function brevoSender() {
  return {
    email:
      process.env.BREVO_FROM_EMAIL ||
      process.env.BREVO_FROM_EMAI ||
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.EMAIL_USER ||
      '',
    name:
      process.env.BREVO_FROM_NAME ||
      process.env.SENDGRID_FROM_NAME ||
      'CalxMap Finance',
  };
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {object} params
 * @param {Array<{ name: string, content: Buffer|string }>} [params.attachments]
 *   Optional file attachments; `content` may be a Buffer or an already base64-encoded string.
 */
async function sendBrevoEmail({ to, subject, text, html, attachments }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured');

  const sender = brevoSender();
  if (!sender.email) throw new Error('BREVO_FROM_EMAIL or EMAIL_USER is not configured');

  const attachment = (Array.isArray(attachments) ? attachments : [])
    .filter((item) => item && item.name && item.content)
    .map((item) => ({
      name: item.name,
      content: Buffer.isBuffer(item.content) ? item.content.toString('base64') : String(item.content),
    }));

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: normalizeEmail(to) }],
      subject,
      textContent: text,
      ...(html ? { htmlContent: html } : {}),
      ...(attachment.length ? { attachment } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Brevo invoice email failed (${response.status}): ${body || response.statusText}`);
  }

  return response.json().catch(() => ({}));
}

async function sendInvoiceEmail({ to, recipientName, invoiceNumber, amount, pdfUrl, partyType, projectTitle }) {
  if (!to) throw new Error('Invoice recipient email is missing');
  const isExpert = partyType === 'expert';
  const subject = isExpert
    ? `CalxMap payout statement ${invoiceNumber}`
    : `CalxMap payment invoice ${invoiceNumber}`;
  const label = isExpert ? 'payout statement' : 'payment invoice';
  const paymentLine = isExpert
    ? 'This payout will be processed by CalxMap after finance confirmation.'
    : 'Please process this payment to CalxMap as per your agreed payment terms.';
  const safeName = escapeHtml(recipientName || 'there');
  const safeProjectTitle = escapeHtml(projectTitle || 'your training project');
  const safeInvoiceNumber = escapeHtml(invoiceNumber);
  const safePdfUrl = escapeHtml(pdfUrl);
  const text = [
    `Hello ${recipientName || 'there'},`,
    '',
    `Your CalxMap ${label} ${invoiceNumber} has been generated for ${projectTitle || 'your training project'}.`,
    `Amount: Rs. ${Number(amount || 0).toFixed(2)}`,
    paymentLine,
    'All payment handling for this engagement is managed through CalxMap. Counterparty names are not shown on this invoice for privacy.',
    `Invoice PDF: ${pdfUrl}`,
    '',
    'Regards,',
    'CalxMap Finance',
  ].join('\n');
  const html = `
    <p>Hello ${safeName},</p>
    <p>Your CalxMap ${escapeHtml(label)} <strong>${safeInvoiceNumber}</strong> has been generated for <strong>${safeProjectTitle}</strong>.</p>
    <p><strong>Amount:</strong> Rs. ${Number(amount || 0).toFixed(2)}</p>
    <p>${escapeHtml(paymentLine)}</p>
    <p>All payment handling for this engagement is managed through CalxMap. Counterparty names are not shown on this invoice for privacy.</p>
    <p><a href="${safePdfUrl}">Download invoice PDF</a></p>
    <p>Regards,<br/>CalxMap Finance</p>
  `;
  return sendBrevoEmail({ to, subject, text, html });
}

module.exports = {
  sendBrevoEmail,
  sendInvoiceEmail,
};
