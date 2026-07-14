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

function displayPaymentStatus(payment) {
  const due = Number(payment.invoice_amount || payment.calculated_amount || 0);
  const paid = Number(payment.paid_amount || 0);
  const status = String(payment.status || 'pending').toLowerCase();
  if (status === 'partial_paid') return 'Partial paid';
  if (status === 'invoiced' && paid > 0 && due > 0 && paid + 0.001 < due) return 'Partial paid';
  if (status === 'paid') return 'Paid';
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
    const qty = Number(contract.quantity) > 0
      ? Number(contract.quantity)
      : Number(payment.approved_hours || 0);
    const rate = Number(
      payment.hourly_rate_snapshot > 0 ? payment.hourly_rate_snapshot : contract.ratePerUnit
    ) || Number(contract.ratePerUnit) || 0;
    const lineTotal = qty > 0 && rate > 0
      ? Math.round(rate * qty * 100) / 100
      : Number(payment.calculated_amount) || Number(contract.amount) || 0;
    const invoiceAmount =
      Number(payment.invoice_amount) > 0 ? Number(payment.invoice_amount) : lineTotal;
    const unitShort = contract.unitShort || rates.unitShort || 'unit';
    return {
      partyType,
      unitShort,
      qtyLabel: `Contract qty (${unitShort})`,
      rateLabel: `Gross / ${unitShort}`,
      qty: qty > 0 ? String(qty) : '-',
      rate,
      lineTotal,
      invoiceAmount,
      budgetForProjectTable: invoiceAmount,
      formula: `${money(rate)} × ${qty > 0 ? qty : '-'} ${unitShort}${qty === 1 ? '' : 's'} = ${money(lineTotal)}`,
    };
  }

  const qty = Number(payment.approved_hours || 0);
  const rate = Number(payment.hourly_rate_snapshot || rates.netPerUnit || 0);
  const lineTotal = Number(payment.calculated_amount) > 0
    ? Number(payment.calculated_amount)
    : rate * qty;
  const unitShort = rates.unitShort || 'unit';
  return {
    partyType,
    unitShort,
    qtyLabel: `Approved qty (${unitShort})`,
    rateLabel: `Net / ${unitShort}`,
    qty: qty.toFixed(2),
    rate,
    lineTotal,
    invoiceAmount,
    budgetForProjectTable: invoiceAmount > 0 ? invoiceAmount : lineTotal,
    formula: `${money(rate)} × ${qty.toFixed(2)} ${unitShort}${qty === 1 ? '' : 's'} = ${money(lineTotal)}`,
  };
}

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 42,
  bottom: 760,
};

function ensureSpace(doc, height) {
  if (doc.y + height <= PAGE.bottom) return;
  doc.addPage();
  doc.y = PAGE.margin;
}

function sectionTitle(doc, title) {
  ensureSpace(doc, 34);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text(title);
  doc.moveDown(0.45);
}

function card(doc, x, y, width, height, title, lines = []) {
  doc.roundedRect(x, y, width, height, 8).fill('#f8fafc').stroke('#e2e8f0');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(title, x + 16, y + 14, { width: width - 32 });
  doc.fillColor('#334155').font('Helvetica').fontSize(9);
  let lineY = y + 34;
  for (const item of lines) {
    doc.text(valueOrDash(item), x + 16, lineY, { width: width - 32 });
    lineY += doc.heightOfString(valueOrDash(item), { width: width - 32 }) + 4;
  }
}

function drawKeyValueGrid(doc, items, columns = 2) {
  const left = PAGE.margin;
  const gap = 12;
  const width = (PAGE.width - PAGE.margin * 2 - gap * (columns - 1)) / columns;
  const labelHeight = 10;
  const rows = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));

  for (const row of rows) {
    const heights = row.map((item) => {
      doc.font('Helvetica-Bold').fontSize(8);
      const labelH = doc.heightOfString(item.label, { width: width - 20 });
      doc.font('Helvetica').fontSize(9);
      const valueH = doc.heightOfString(valueOrDash(item.value), { width: width - 20 });
      return Math.max(52, labelHeight + labelH + valueH + 24);
    });
    const rowHeight = Math.max(...heights);
    ensureSpace(doc, rowHeight + 10);
    const y = doc.y;
    row.forEach((item, index) => {
      const x = left + index * (width + gap);
      doc.roundedRect(x, y, width, rowHeight, 6).fill('#ffffff').stroke('#e2e8f0');
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text(item.label, x + 10, y + 10, { width: width - 20 });
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9).text(valueOrDash(item.value), x + 10, y + 27, { width: width - 20 });
    });
    doc.y = y + rowHeight + 10;
  }
}

function drawTable(doc, { headers, rows, widths, minRowHeight = 34 }) {
  const left = doc.x;
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);

  const drawHeader = () => {
    ensureSpace(doc, 34);
    const top = doc.y;
    doc.rect(left, top, tableWidth, 26).fill('#ecfdf5');
    doc.fillColor('#064e3b').font('Helvetica-Bold').fontSize(8);

    let x = left;
    headers.forEach((header, index) => {
      doc.text(header, x + 5, top + 8, { width: widths[index] - 10 });
      x += widths[index];
    });
    doc.y = top + 26;
  };

  drawHeader();

  rows.forEach((row) => {
    doc.font('Helvetica').fontSize(8);
    const cellHeights = row.map((value, index) =>
      doc.heightOfString(valueOrDash(value), { width: widths[index] - 10 }) + 16
    );
    const rowHeight = Math.max(minRowHeight, ...cellHeights);
    if (doc.y + rowHeight > PAGE.bottom) {
      doc.addPage();
      doc.y = PAGE.margin;
      drawHeader();
    }
    const y = doc.y;
    doc.rect(left, y, tableWidth, rowHeight).fill('#ffffff').stroke('#e2e8f0');
    doc.fillColor('#0f172a').font('Helvetica').fontSize(8);
    let x = left;
    row.forEach((value, index) => {
      doc.text(valueOrDash(value), x + 5, y + 8, {
        width: widths[index] - 10,
      });
      x += widths[index];
    });
    doc.y = y + rowHeight;
  });

  doc.y += 12;
}

function drawLineItems(doc, settlementCtx) {
  const widths = [135, 125, 125, 155];
  drawTable(doc, {
    headers: [
      settlementCtx.qtyLabel,
      settlementCtx.rateLabel,
      'Line total',
      'Invoice amount',
    ],
    rows: [[
      settlementCtx.qty,
      `${money(settlementCtx.rate)} / ${settlementCtx.unitShort}`,
      money(settlementCtx.lineTotal),
      money(settlementCtx.invoiceAmount),
    ]],
    widths,
    minRowHeight: 36,
  });
}

function drawTotalPanel(doc, settlementCtx, payment) {
  ensureSpace(doc, 120);
  const due = Number(settlementCtx.invoiceAmount || 0);
  const paid = Number(payment.paid_amount || 0);
  const remaining = Math.max(0, due - paid);
  const y = doc.y + 2;
  doc.roundedRect(306, y, 247, 96, 8).fill('#ecfdf5').stroke('#bbf7d0');
  doc.fillColor('#064e3b').font('Helvetica-Bold').fontSize(10).text('Total amount', 324, y + 16);
  doc.fillColor('#008260').fontSize(19).text(money(due), 324, y + 34, { width: 211, align: 'right' });
  doc.fillColor('#334155').font('Helvetica').fontSize(8)
    .text(`Paid: ${money(paid)}`, 324, y + 64, { width: 100 })
    .text(`Remaining: ${money(remaining)}`, 432, y + 64, { width: 103, align: 'right' });
  doc.y = y + 114;
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
      .text(
        `Generated by CalxMap Finance. Page ${i + 1} of ${range.count}.`,
        PAGE.margin,
        790,
        { align: 'center', width: PAGE.width - PAGE.margin * 2 }
      );
  }
}

function drawProjectDetailsTable(doc, booking, payment, settlementCtx) {
  const project = booking?.projects || booking?.project || {};
  const projectStart = project.start_date || booking?.start_date;
  const projectEnd = project.end_date || booking?.end_date;
  drawKeyValueGrid(doc, [
    { label: 'Project', value: project.title || payment.project_id },
    { label: 'Project type', value: labelize(project.type) },
    { label: 'Project dates', value: `${date(projectStart)} to ${date(projectEnd)}` },
    { label: settlementCtx.qtyLabel, value: settlementCtx.qty },
    { label: settlementCtx.rateLabel, value: `${money(settlementCtx.rate)} / ${settlementCtx.unitShort}` },
    { label: 'Invoice total', value: money(settlementCtx.budgetForProjectTable) },
    {
      label: 'Mode / location',
      value: [labelize(project.workplace_type), labelize(project.employment_type), project.job_location]
        .filter((value) => value && value !== '-')
        .join(' / ') || '-',
    },
  ], 2);

  if (project.description) {
    ensureSpace(doc, 70);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Project Description');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text(project.description, {
      width: PAGE.width - PAGE.margin * 2,
    });
    doc.moveDown(0.6);
  }
}

function generateInvoicePdf({ invoiceNumber, payment, booking, recipient }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, bufferPages: true });
    const chunks = [];
    const settlementCtx = invoiceSettlementContext(payment, booking);
    const isExpert = payment.party_type === 'expert';
    const title = isExpert ? 'Expert Payout Statement' : 'Institute Payment Invoice';
    const project = booking?.projects || booking?.project || {};

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, PAGE.width, 132).fill('#064e3b');
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

    doc.y = 198;
    const leftTop = doc.y;
    card(doc, 42, leftTop, 245, 96, 'Recipient', [recipient?.name || '-', recipient?.email || '-']);
    card(doc, 308, leftTop, 245, 96, 'Engagement', [
      project.title || payment.project_id || '-',
      `Booking: ${payment.booking_id || '-'}`,
      `${date(booking?.start_date)} to ${date(booking?.end_date)}`,
    ]);

    doc.y = leftTop + 124;
    sectionTitle(doc, 'Project Summary');
    drawProjectDetailsTable(doc, booking, payment, settlementCtx);

    sectionTitle(doc, 'Line Items');
    doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor('#475569').text(settlementCtx.formula);
    doc.moveDown(0.6).fillColor('#0f172a');
    drawLineItems(doc, settlementCtx);
    drawTotalPanel(doc, settlementCtx, payment);

    if (payment.notes) {
      sectionTitle(doc, 'Admin Notes');
      doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor('#334155').text(payment.notes, { width: 500 });
    }

    ensureSpace(doc, 92);
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

    drawFooter(doc);

    doc.end();
  });
}

module.exports = {
  generateInvoicePdf,
  displayPaymentStatus,
  invoiceSettlementContext,
};
