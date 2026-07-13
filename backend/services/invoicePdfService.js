const PDFDocument = require('pdfkit');
const {
  resolveSettlementRates,
  resolveInstitutionContractBudget,
} = require('./financeCalculationService');

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

function displayPaymentStatus(payment) {
  const due = Number(payment.invoice_amount || payment.calculated_amount || 0);
  const paid = Number(payment.paid_amount || 0);
  const status = String(payment.status || 'pending').toLowerCase();
  if (status === 'paid' || (due > 0 && paid + 0.001 >= due)) return 'Paid';
  if (paid > 0 && due > 0 && paid + 0.001 < due) return 'Partial paid';
  if (status === 'invoiced') return 'Invoiced';
  if (status === 'cancelled') return 'Cancelled';
  return labelize(status);
}

function invoiceSettlementContext(payment, booking) {
  const partyType = payment.party_type;
  const rates = resolveSettlementRates(booking || { projects: payment.projects });
  const invoiceAmount = Number(payment.invoice_amount || payment.calculated_amount || 0);

  if (partyType === 'institution') {
    const contract = resolveInstitutionContractBudget(booking || { projects: payment.projects });
    const qty = Number(contract.quantity) || 0;
    const rate = Number(
      payment.hourly_rate_snapshot > 0 ? payment.hourly_rate_snapshot : contract.ratePerUnit
    ) || Number(contract.ratePerUnit) || 0;
    // Always recompute from contract math so PDF never shows a stale calculated_amount.
    const lineTotal = qty > 0 && rate > 0
      ? Math.round(rate * qty * 100) / 100
      : Number(contract.amount) || Number(payment.calculated_amount) || 0;
    const invoiceAmount =
      Number(payment.invoice_amount) > 0 ? Number(payment.invoice_amount) : lineTotal;
    return {
      partyType,
      unitShort: contract.unitShort || rates.unitShort || 'unit',
      qtyLabel: 'Contract qty',
      rateLabel: `Gross / ${contract.unitShort || rates.unitShort || 'unit'}`,
      qty: qty > 0 ? String(qty) : '-',
      rate,
      lineTotal,
      invoiceAmount,
      budgetForProjectTable: invoiceAmount,
      formula: `${money(rate)} × ${qty > 0 ? qty : '-'} = ${money(lineTotal)}`,
    };
  }

  const qty = Number(payment.approved_hours || 0);
  const rate = Number(payment.hourly_rate_snapshot || rates.netPerUnit || 0);
  const lineTotal = Number(payment.calculated_amount) > 0
    ? Number(payment.calculated_amount)
    : rate * qty;
  return {
    partyType,
    unitShort: rates.unitShort || 'unit',
    qtyLabel: rates.unit === 'hourly' ? 'Approved hours' : 'Approved qty',
    rateLabel: `Net / ${rates.unitShort || 'unit'}`,
    qty: qty.toFixed(2),
    rate,
    lineTotal,
    invoiceAmount,
    budgetForProjectTable: invoiceAmount > 0 ? invoiceAmount : lineTotal,
    formula: `${money(rate)} × ${qty.toFixed(2)} = ${money(lineTotal)}`,
  };
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

function drawProjectDetailsTable(doc, booking, payment, settlementCtx) {
  const project = booking?.projects || booking?.project || {};
  const projectStart = project.start_date || booking?.start_date;
  const projectEnd = project.end_date || booking?.end_date;
  const headers = ['Project', 'Type', 'Dates', 'Qty', 'Rate', 'Invoice total', 'Mode / Location'];
  const widths = [112, 70, 72, 48, 58, 62, 118];
  const rows = [[
    truncate(project.title || payment.project_id, 80),
    labelize(project.type),
    `${date(projectStart)} to ${date(projectEnd)}`,
    settlementCtx.qty,
    money(settlementCtx.rate),
    money(settlementCtx.budgetForProjectTable),
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
    const doc = new PDFDocument({ size: 'A4', margin: 42 });
    const chunks = [];
    const settlementCtx = invoiceSettlementContext(payment, booking);
    const isExpert = payment.party_type === 'expert';
    const title = isExpert ? 'Expert Payout Statement' : 'Institute Payment Invoice';
    const project = booking?.projects || booking?.project || {};

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, 595.28, 132).fill('#064e3b');
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(24)
      .text('CalxMap', 42, 36)
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#d1fae5')
      .text('Managed training finance', 42, 66);

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#ffffff')
      .text(title, 310, 36, { width: 240, align: 'right' })
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#d1fae5')
      .text(isExpert ? 'Amount payable by CalxMap' : 'Amount payable to CalxMap', 310, 66, { width: 240, align: 'right' });

    doc.roundedRect(42, 104, 511, 70, 8).fill('#ffffff').stroke('#dbeafe');
    doc.fillColor('#64748b').font('Helvetica').fontSize(8);
    doc.text('INVOICE NUMBER', 60, 122);
    doc.text('GENERATED', 190, 122);
    doc.text('STATUS', 315, 122);
    doc.text('AMOUNT', 430, 122);
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11);
    doc.text(invoiceNumber, 60, 138, { width: 115 });
    doc.text(date(new Date().toISOString()), 190, 138, { width: 110 });
    doc.text(displayPaymentStatus(payment), 315, 138, { width: 100 });
    doc.fillColor('#008260').fontSize(16).text(money(settlementCtx.invoiceAmount), 430, 134, { width: 105, align: 'right' });

    doc.y = 202;
    const leftTop = doc.y;
    doc.roundedRect(42, leftTop, 245, 92, 8).fill('#f8fafc').stroke('#e2e8f0');
    doc.roundedRect(308, leftTop, 245, 92, 8).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Recipient', 58, leftTop + 16);
    doc.fillColor('#334155').font('Helvetica').fontSize(9)
      .text(recipient?.name || '-', 58, leftTop + 36, { width: 210 })
      .text(recipient?.email || '-', 58, leftTop + 52, { width: 210 });
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Engagement', 324, leftTop + 16);
    doc.fillColor('#334155').font('Helvetica').fontSize(9)
      .text(project.title || payment.project_id || '-', 324, leftTop + 36, { width: 210 })
      .text(`Booking: ${payment.booking_id || '-'}`, 324, leftTop + 52, { width: 210 })
      .text(`${date(booking?.start_date)} to ${date(booking?.end_date)}`, 324, leftTop + 68, { width: 210 });

    doc.y = leftTop + 120;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text('Project Summary');
    doc.moveDown(0.5);
    drawProjectDetailsTable(doc, booking, payment, settlementCtx);

    doc.moveDown(0.5).font('Helvetica-Bold').fontSize(13).text('Line Items');
    doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor('#475569').text(settlementCtx.formula);
    doc.moveDown(0.6).fillColor('#0f172a');
    const widths = [140, 130, 130, 140];
    const headers = [
      settlementCtx.qtyLabel,
      settlementCtx.rateLabel,
      'Line total',
      'Invoice amount',
    ];
    const values = [
      settlementCtx.qty,
      `${money(settlementCtx.rate)} / ${settlementCtx.unitShort}`,
      money(settlementCtx.lineTotal),
      money(settlementCtx.invoiceAmount),
    ];

    drawTable(doc, { headers, rows: [values], widths, rowHeight: 34 });

    const totalsY = doc.y + 4;
    doc.roundedRect(330, totalsY, 223, 78, 8).fill('#ecfdf5').stroke('#bbf7d0');
    doc.fillColor('#064e3b').font('Helvetica-Bold').fontSize(10).text('Total amount', 348, totalsY + 18);
    doc.fillColor('#008260').fontSize(20).text(money(settlementCtx.invoiceAmount), 348, totalsY + 38, { width: 185, align: 'right' });
    doc.y = totalsY + 96;

    if (payment.notes) {
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text('Admin Notes');
      doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor('#334155').text(payment.notes, { width: 500 });
    }

    doc
      .moveDown(1)
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text(
        'Terms: This document was generated by CalxMap Finance for the selected payment record. Amounts follow the locked booking and attendance settlement data visible to the admin at generation time.',
        { width: 480 }
      );
    doc
      .moveDown(0.5)
      .fontSize(9)
      .fillColor('#64748b')
      .text('For privacy, counterparty legal names are limited on outward-facing documents. Use the invoice and booking references for reconciliation.');

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
  displayPaymentStatus,
  invoiceSettlementContext,
};
