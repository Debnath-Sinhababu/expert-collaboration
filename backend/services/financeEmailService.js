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

async function sendBrevoEmail({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured');

  const sender = brevoSender();
  if (!sender.email) throw new Error('BREVO_FROM_EMAIL or EMAIL_USER is not configured');

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
  const subject = `CalxMap invoice ${invoiceNumber}`;
  const label = partyType === 'expert' ? 'expert payout' : 'institute payment';
  const text = [
    `Hello ${recipientName || 'there'},`,
    '',
    `Your CalxMap ${label} invoice ${invoiceNumber} has been generated for ${projectTitle || 'your training project'}.`,
    `Amount: Rs. ${Number(amount || 0).toFixed(2)}`,
    `Invoice PDF: ${pdfUrl}`,
    '',
    'Regards,',
    'CalxMap Finance',
  ].join('\n');
  const html = `
    <p>Hello ${recipientName || 'there'},</p>
    <p>Your CalxMap ${label} invoice <strong>${invoiceNumber}</strong> has been generated for <strong>${projectTitle || 'your training project'}</strong>.</p>
    <p><strong>Amount:</strong> Rs. ${Number(amount || 0).toFixed(2)}</p>
    <p><a href="${pdfUrl}">Download invoice PDF</a></p>
    <p>Regards,<br/>CalxMap Finance</p>
  `;
  return sendBrevoEmail({ to, subject, text, html });
}

module.exports = {
  sendInvoiceEmail,
};
