const PDFDocument = require('pdfkit');

function money(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function date(value) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '-';
}

function line(doc, label, value) {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value == null || value === '' ? '-' : String(value));
}

function valueOrDash(value) {
  return value == null || value === '' ? '-' : String(value);
}

function labelize(value) {
  return valueOrDash(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncate(value, max = 90) {
  const text = valueOrDash(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function counterpartyLabel(partyType) {
  return partyType === 'expert' ? 'Verified client' : 'Assigned expert';
}

function drawTable(doc, { headers, rows, widths, rowHeight = 48 }) {
  const left = doc.x;
  const top = doc.y;
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);

  doc.rect(left, top, tableWidth, 26).fill('#ecfdf5');
  doc.fillColor('#064e3b').font('Helvetica-Bold').fontSize(8);

  let x = left;
  headers.forEach((header, index) => {
    doc.text(header, x + 5, top + 8, { width: widths[index] - 10, ellipsis: true });
    x += widths[index];
  });

  let y = top + 26;
  rows.forEach((row) => {
    doc.rect(left, y, tableWidth, rowHeight).fill('#ffffff').stroke('#e2e8f0');
    doc.fillColor('#0f172a').font('Helvetica').fontSize(8);
    x = left;
    row.forEach((value, index) => {
      doc.text(valueOrDash(value), x + 5, y + 8, {
        width: widths[index] - 10,
        height: rowHeight - 12,
        ellipsis: true,
      });
      x += widths[index];
    });
    y += rowHeight;
  });

  doc.y = y + 12;
}

function drawProjectDetailsTable(doc, booking, payment) {
  const project = booking?.projects || booking?.project || {};
  const projectStart = project.start_date || booking?.start_date;
  const projectEnd = project.end_date || booking?.end_date;
  const headers = ['Project', 'Type', 'Dates', 'Hours', 'Rate', 'Budget', 'Mode / Location'];
  const widths = [112, 70, 72, 48, 58, 62, 118];
  const rows = [[
    truncate(project.title || payment.project_id, 80),
    labelize(project.type),
    `${date(projectStart)} to ${date(projectEnd)}`,
    project.duration_hours != null ? `${project.duration_hours} hrs` : '-',
    money(project.hourly_rate),
    money(project.total_budget),
    truncate([labelize(project.workplace_type), labelize(project.employment_type), project.job_location]
      .filter((value) => value && value !== '-')
      .join(' / '), 90),
  ]];

  drawTable(doc, { headers, rows, widths, rowHeight: 58 });

  if (project.description) {
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#0f172a')
      .text('Project Description', { continued: false });
    doc
      .moveDown(0.2)
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#475569')
      .text(truncate(project.description, 260), { width: 500 });
    doc.moveDown(0.5);
  }
}

function generateInvoicePdf({ invoiceNumber, payment, booking, recipient }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#008260')
      .text(payment.party_type === 'expert' ? 'CalxMap Expert Payout Statement' : 'CalxMap Payment Invoice');

    doc
      .moveDown(0.4)
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#64748b')
      .text('All payments for this engagement are processed through CalxMap.');

    doc.moveDown(1.5).fillColor('#0f172a').fontSize(12);
    line(doc, 'Invoice Number', invoiceNumber);
    line(doc, 'Generated Date', date(new Date().toISOString()));
    line(doc, 'Payment Type', payment.party_type === 'expert' ? 'Expert payout from CalxMap' : 'Payment due to CalxMap');
    line(doc, 'Payment Status', payment.status || 'pending');

    doc.moveDown(1).font('Helvetica-Bold').fontSize(14).text('Recipient');
    doc.moveDown(0.4).fontSize(11);
    line(doc, 'Name', recipient?.name);
    line(doc, 'Email', recipient?.email);

    doc.moveDown(1).font('Helvetica-Bold').fontSize(14).text('Training');
    doc.moveDown(0.4).fontSize(11);
    line(doc, 'Project', booking?.projects?.title || booking?.project?.title || payment.project_id);
    line(doc, 'Booking ID', payment.booking_id);
    line(doc, 'Start Date', date(booking?.start_date));
    line(doc, 'End Date', date(booking?.end_date));
    line(doc, 'Counterparty', counterpartyLabel(payment.party_type));
    line(doc, 'Payment Channel', 'CalxMap managed payment flow');

    doc.moveDown(1).font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text('Project Details');
    doc.moveDown(0.5);
    drawProjectDetailsTable(doc, booking, payment);

    doc.moveDown(1).font('Helvetica-Bold').fontSize(14).text('Calculation');
    doc.moveDown(0.6);
    const widths = [160, 130, 130, 120];
    const headers = ['Approved Hours', 'Hourly Rate', 'Calculated', 'Invoice Amount'];
    const values = [
      Number(payment.approved_hours || 0).toFixed(2),
      money(payment.hourly_rate_snapshot),
      money(payment.calculated_amount),
      money(payment.invoice_amount),
    ];

    drawTable(doc, { headers, rows: [values], widths, rowHeight: 34 });

    if (payment.notes) {
      doc.moveDown(1).font('Helvetica-Bold').fontSize(14).text('Notes');
      doc.moveDown(0.4).font('Helvetica').fontSize(11).text(payment.notes, { width: 480 });
    }

    doc
      .moveDown(1)
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text(
        'For privacy, CalxMap does not disclose client or expert legal names on outward-facing payment documents. Please use the project and booking references for support or reconciliation.',
        { width: 480 }
      );

    doc
      .fontSize(9)
      .fillColor('#64748b')
      .text('Generated by CalxMap Finance. This document is system generated.', 48, 760, {
        align: 'center',
        width: 500,
      });

    doc.end();
  });
}

module.exports = {
  generateInvoicePdf,
};
