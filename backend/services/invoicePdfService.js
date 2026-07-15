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

function pluralUnit(unit, qty) {
  const u = String(unit || 'unit');
  const n = Number(qty);
  if (n === 1) return u;
  if (u.endsWith('s')) return u;
  return `${u}s`;
}

function formatQty(qty, unit) {
  const n = Number(qty) || 0;
  if (!(n > 0)) return '-';
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${shown} ${pluralUnit(unit, n)}`;
}

function displayPaymentStatus(payment) {
  const due = Number(payment.invoice_amount || payment.calculated_amount || 0);
  const paid = Number(payment.paid_amount || 0);
  const status = String(payment.status || 'pending').toLowerCase();
  if (status === 'partial_paid') return 'Partially paid';
  if (status === 'invoiced' && paid > 0 && due > 0 && paid + 0.001 < due) return 'Partially paid';
  if (status === 'paid') return 'Paid';
  if (status === 'invoiced') return 'Issued';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'pending') return 'Draft';
  return labelize(status);
}

/**
 * Single source for invoice line math.
 * Expert = net rate × billable qty. Institute = gross rate × contract qty.
 * Invoice amount prefers saved invoice_amount when set.
 */
function invoiceSettlementContext(payment, booking) {
  const partyType = payment.party_type;
  const rates = resolveSettlementRates(booking || { projects: payment.projects });

  if (partyType === 'institution') {
    const contract = resolveInstitutionContractBudget(booking || { projects: payment.projects });
    const qty = Number(contract.quantity) > 0
      ? Number(contract.quantity)
      : Number(payment.approved_hours || 0);
    const rate = Number(
      payment.hourly_rate_snapshot > 0 ? payment.hourly_rate_snapshot : contract.ratePerUnit
    ) || Number(contract.ratePerUnit) || 0;
    const computed = qty > 0 && rate > 0
      ? Math.round(rate * qty * 100) / 100
      : Number(payment.calculated_amount) || Number(contract.amount) || 0;
    const invoiceAmount =
      Number(payment.invoice_amount) > 0 ? Number(payment.invoice_amount) : computed;
    const unitShort = contract.unitShort || rates.unitShort || 'unit';
    return {
      partyType,
      unitShort,
      description: 'Institution training / project fee',
      qtyLabel: 'Quantity',
      rateLabel: `Rate (per ${unitShort})`,
      qty,
      qtyDisplay: formatQty(qty, unitShort),
      rate,
      lineTotal: computed,
      invoiceAmount,
      formula: `${formatQty(qty, unitShort)} × ${money(rate)} / ${unitShort}`,
    };
  }

  // Expert payout: billable qty is stored on approved_hours; rate snapshot is net per unit.
  const qty = Number(payment.approved_hours || 0);
  const rate = Number(payment.hourly_rate_snapshot || rates.netPerUnit || 0);
  const computed = qty > 0 && rate > 0
    ? Math.round(qty * rate * 100) / 100
    : Number(payment.calculated_amount) || 0;
  const invoiceAmount =
    Number(payment.invoice_amount) > 0 ? Number(payment.invoice_amount) : computed;
  const unitShort = rates.unitShort || 'unit';
  const project = booking?.projects || booking?.project || {};
  return {
    partyType,
    unitShort,
    description: project.title
      ? `Expert services — ${project.title}`
      : 'Expert services',
    qtyLabel: 'Quantity',
    rateLabel: `Your rate (per ${unitShort})`,
    qty,
    qtyDisplay: formatQty(qty, unitShort),
    rate,
    lineTotal: computed,
    invoiceAmount,
    formula: `${formatQty(qty, unitShort)} × ${money(rate)} / ${unitShort}`,
  };
}

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 48,
  // Keep content above the footer at y≈800.
  bottom: 778,
};

const COLORS = {
  brand: '#0B6E4F',
  brandDark: '#064e3b',
  text: '#0f172a',
  muted: '#64748b',
  soft: '#f8fafc',
  line: '#e2e8f0',
  white: '#ffffff',
};

function ensureSpace(doc, height) {
  if (doc.y + height <= PAGE.bottom) return;
  doc.addPage();
  doc.y = PAGE.margin;
}

function sectionTitle(doc, title) {
  ensureSpace(doc, 28);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.brandDark).text(title);
  doc.moveDown(0.35);
  const y = doc.y;
  doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).strokeColor(COLORS.line).lineWidth(1).stroke();
  doc.y = y + 10;
}

/** Measure then draw so terms wrap fully or move cleanly to the next page. */
function drawTermsBlock(doc, text) {
  const width = PAGE.width - PAGE.margin * 2;
  doc.font('Helvetica').fontSize(8);
  const bodyHeight = doc.heightOfString(text, { width, lineGap: 2 });
  const blockHeight = 18 + bodyHeight + 12;
  ensureSpace(doc, blockHeight);

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.text).text('Terms', PAGE.margin, doc.y, { width });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(text, {
    width,
    lineGap: 2,
    align: 'left',
  });
  doc.moveDown(0.4);
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
      .text(
        `CalxMap  ·  Page ${i + 1} of ${range.count}`,
        PAGE.margin,
        808,
        { align: 'center', width: PAGE.width - PAGE.margin * 2 }
      );
  }
}

function drawExpertInvoice(doc, { invoiceNumber, payment, booking, recipient, settlementCtx }) {
  const project = booking?.projects || booking?.project || {};
  const institute = booking?.institutions || payment.institutions || {};
  const projectStart = booking?.start_date || project.start_date;
  const projectEnd = booking?.end_date || project.end_date;
  const due = Number(settlementCtx.invoiceAmount || 0);
  const paid = Number(payment.paid_amount || 0);
  const remaining = Math.max(0, due - paid);

  // Header bar
  doc.rect(0, 0, PAGE.width, 96).fill(COLORS.brandDark);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(22).text('CalxMap', PAGE.margin, 28);
  doc.font('Helvetica').fontSize(9).fillColor('#a7f3d0').text('Expert payout invoice', PAGE.margin, 56);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.white)
    .text('PAYOUT INVOICE', PAGE.margin, 34, { width: PAGE.width - PAGE.margin * 2, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#a7f3d0')
    .text('Payment from CalxMap to you', PAGE.margin, 56, { width: PAGE.width - PAGE.margin * 2, align: 'right' });

  doc.y = 118;

  // Invoice meta
  const metaTop = doc.y;
  const metaW = (PAGE.width - PAGE.margin * 2 - 24) / 4;
  const metas = [
    { label: 'Invoice no.', value: invoiceNumber },
    { label: 'Date', value: date(new Date().toISOString()) },
    { label: 'Status', value: displayPaymentStatus(payment) },
    { label: 'Amount payable', value: money(due) },
  ];
  metas.forEach((item, index) => {
    const x = PAGE.margin + index * (metaW + 8);
    doc.roundedRect(x, metaTop, metaW, 54, 6).fill(COLORS.soft).stroke(COLORS.line);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(item.label.toUpperCase(), x + 10, metaTop + 10, { width: metaW - 20 });
    doc.fillColor(index === 3 ? COLORS.brand : COLORS.text).font('Helvetica-Bold').fontSize(index === 3 ? 11 : 10)
      .text(valueOrDash(item.value), x + 10, metaTop + 26, { width: metaW - 20 });
  });
  doc.y = metaTop + 70;

  // Parties
  sectionTitle(doc, 'Parties');
  const partyTop = doc.y;
  const partyW = (PAGE.width - PAGE.margin * 2 - 16) / 2;
  doc.roundedRect(PAGE.margin, partyTop, partyW, 88, 6).fill(COLORS.white).stroke(COLORS.line);
  doc.roundedRect(PAGE.margin + partyW + 16, partyTop, partyW, 88, 6).fill(COLORS.white).stroke(COLORS.line);

  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text('FROM', PAGE.margin + 12, partyTop + 12);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11).text('CalxMap', PAGE.margin + 12, partyTop + 28);
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
    .text('Platform payout for completed work', PAGE.margin + 12, partyTop + 46, { width: partyW - 24 });

  const toX = PAGE.margin + partyW + 16;
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text('TO (EXPERT)', toX + 12, partyTop + 12);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11)
    .text(valueOrDash(recipient?.name), toX + 12, partyTop + 28, { width: partyW - 24 });
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
    .text(valueOrDash(recipient?.email), toX + 12, partyTop + 46, { width: partyW - 24 });
  if (recipient?.phone) {
    doc.text(valueOrDash(recipient.phone), toX + 12, partyTop + 62, { width: partyW - 24 });
  }
  doc.y = partyTop + 104;

  // Work summary — only what expert needs
  sectionTitle(doc, 'Work summary');
  const workRows = [
    ['Project', project.title || payment.project_id || '-'],
    ['Institution', institute.name || '-'],
    ['Work period', `${date(projectStart)} to ${date(projectEnd)}`],
    ['Pay unit', labelize(settlementCtx.unitShort === 'hour' ? 'hourly' : settlementCtx.unitShort)],
  ];
  workRows.forEach(([label, value], index) => {
    ensureSpace(doc, 22);
    const y = doc.y;
    if (index % 2 === 0) doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 22).fill(COLORS.soft);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(label, PAGE.margin + 10, y + 6, { width: 120 });
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9)
      .text(valueOrDash(value), PAGE.margin + 140, y + 6, { width: PAGE.width - PAGE.margin * 2 - 150 });
    doc.y = y + 22;
  });
  doc.moveDown(0.8);

  // Charges
  sectionTitle(doc, 'Charges');
  const tableLeft = PAGE.margin;
  const widths = [230, 90, 100, 99];
  const headers = ['Description', 'Quantity', 'Rate', 'Amount'];
  ensureSpace(doc, 30);
  let y = doc.y;
  doc.rect(tableLeft, y, widths.reduce((a, b) => a + b, 0), 26).fill(COLORS.brandDark);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
  let x = tableLeft;
  headers.forEach((header, i) => {
    doc.text(header, x + 8, y + 8, { width: widths[i] - 16 });
    x += widths[i];
  });
  doc.y = y + 26;

  const lineValues = [
    settlementCtx.description,
    settlementCtx.qtyDisplay,
    `${money(settlementCtx.rate)} / ${settlementCtx.unitShort}`,
    money(settlementCtx.lineTotal),
  ];
  ensureSpace(doc, 40);
  y = doc.y;
  doc.rect(tableLeft, y, widths.reduce((a, b) => a + b, 0), 40).fill(COLORS.white).stroke(COLORS.line);
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
  x = tableLeft;
  lineValues.forEach((value, i) => {
    doc.text(valueOrDash(value), x + 8, y + 12, { width: widths[i] - 16 });
    x += widths[i];
  });
  doc.y = y + 52;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
    .text(`Calculation: ${settlementCtx.formula} = ${money(settlementCtx.lineTotal)}`, PAGE.margin, doc.y, {
      width: PAGE.width - PAGE.margin * 2,
    });
  doc.moveDown(0.8);

  // Totals — authoritative invoice amount
  ensureSpace(doc, 120);
  const boxW = 240;
  const boxX = PAGE.width - PAGE.margin - boxW;
  const boxY = doc.y;
  doc.roundedRect(boxX, boxY, boxW, 108, 8).fill(COLORS.soft).stroke(COLORS.line);

  const totalLines = [
    ['Subtotal (qty × rate)', money(settlementCtx.lineTotal)],
    ['Invoice amount', money(due)],
    ['Already paid', money(paid)],
    ['Balance to pay you', money(remaining)],
  ];
  totalLines.forEach((pair, index) => {
    const rowY = boxY + 12 + index * 22;
    const isLast = index === totalLines.length - 1;
    doc.font(isLast ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(isLast ? 10 : 9)
      .fillColor(isLast ? COLORS.brandDark : COLORS.muted)
      .text(pair[0], boxX + 14, rowY, { width: 120 });
    doc.fillColor(isLast ? COLORS.brand : COLORS.text)
      .text(pair[1], boxX + 14, rowY, { width: boxW - 28, align: 'right' });
  });
  doc.y = boxY + 124;

  if (Math.abs(Number(settlementCtx.lineTotal) - due) > 0.01) {
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
      .text(
        'Note: Invoice amount was set by CalxMap finance and may differ from qty × rate.',
        PAGE.margin,
        doc.y,
        { width: PAGE.width - PAGE.margin * 2 }
      );
    doc.moveDown(0.8);
  }

  if (payment.notes) {
    sectionTitle(doc, 'Notes');
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text)
      .text(payment.notes, { width: PAGE.width - PAGE.margin * 2 });
    doc.moveDown(0.6);
  }

  drawTermsBlock(
    doc,
    'This payout invoice is issued by CalxMap for the work listed above. '
    + 'The amount shown is what CalxMap will pay you. '
    + 'Please keep this document for your records. '
    + 'For any mismatch, contact CalxMap finance with this invoice number.'
  );
}

function drawInstitutionInvoice(doc, { invoiceNumber, payment, booking, recipient, settlementCtx }) {
  const project = booking?.projects || booking?.project || {};
  const expert = booking?.experts || payment.experts || {};
  const projectStart = booking?.start_date || project.start_date;
  const projectEnd = booking?.end_date || project.end_date;
  const due = Number(settlementCtx.invoiceAmount || 0);
  const paid = Number(payment.paid_amount || 0);
  const remaining = Math.max(0, due - paid);

  doc.rect(0, 0, PAGE.width, 96).fill(COLORS.brandDark);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(22).text('CalxMap', PAGE.margin, 28);
  doc.font('Helvetica').fontSize(9).fillColor('#a7f3d0').text('Institution payment invoice', PAGE.margin, 56);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.white)
    .text('TAX INVOICE', PAGE.margin, 34, { width: PAGE.width - PAGE.margin * 2, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#a7f3d0')
    .text('Amount payable to CalxMap', PAGE.margin, 56, { width: PAGE.width - PAGE.margin * 2, align: 'right' });

  doc.y = 118;
  const metaTop = doc.y;
  const metaW = (PAGE.width - PAGE.margin * 2 - 24) / 4;
  [
    { label: 'Invoice no.', value: invoiceNumber },
    { label: 'Date', value: date(new Date().toISOString()) },
    { label: 'Status', value: displayPaymentStatus(payment) },
    { label: 'Amount due', value: money(due) },
  ].forEach((item, index) => {
    const x = PAGE.margin + index * (metaW + 8);
    doc.roundedRect(x, metaTop, metaW, 54, 6).fill(COLORS.soft).stroke(COLORS.line);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(item.label.toUpperCase(), x + 10, metaTop + 10, { width: metaW - 20 });
    doc.fillColor(index === 3 ? COLORS.brand : COLORS.text).font('Helvetica-Bold').fontSize(index === 3 ? 11 : 10)
      .text(valueOrDash(item.value), x + 10, metaTop + 26, { width: metaW - 20 });
  });
  doc.y = metaTop + 70;

  sectionTitle(doc, 'Parties');
  const partyTop = doc.y;
  const partyW = (PAGE.width - PAGE.margin * 2 - 16) / 2;
  doc.roundedRect(PAGE.margin, partyTop, partyW, 88, 6).fill(COLORS.white).stroke(COLORS.line);
  doc.roundedRect(PAGE.margin + partyW + 16, partyTop, partyW, 88, 6).fill(COLORS.white).stroke(COLORS.line);
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text('FROM', PAGE.margin + 12, partyTop + 12);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11).text('CalxMap', PAGE.margin + 12, partyTop + 28);
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
    .text('Platform fee for expert engagement', PAGE.margin + 12, partyTop + 46, { width: partyW - 24 });
  const toX = PAGE.margin + partyW + 16;
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text('BILL TO', toX + 12, partyTop + 12);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11)
    .text(valueOrDash(recipient?.name), toX + 12, partyTop + 28, { width: partyW - 24 });
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
    .text(valueOrDash(recipient?.email), toX + 12, partyTop + 46, { width: partyW - 24 });
  doc.y = partyTop + 104;

  sectionTitle(doc, 'Engagement');
  [
    ['Project', project.title || payment.project_id || '-'],
    ['Expert', expert.name || '-'],
    ['Period', `${date(projectStart)} to ${date(projectEnd)}`],
  ].forEach(([label, value], index) => {
    ensureSpace(doc, 22);
    const rowY = doc.y;
    if (index % 2 === 0) doc.rect(PAGE.margin, rowY, PAGE.width - PAGE.margin * 2, 22).fill(COLORS.soft);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(label, PAGE.margin + 10, rowY + 6, { width: 120 });
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9)
      .text(valueOrDash(value), PAGE.margin + 140, rowY + 6, { width: PAGE.width - PAGE.margin * 2 - 150 });
    doc.y = rowY + 22;
  });
  doc.moveDown(0.8);

  sectionTitle(doc, 'Charges');
  const tableLeft = PAGE.margin;
  const widths = [230, 90, 100, 99];
  ensureSpace(doc, 30);
  let y = doc.y;
  doc.rect(tableLeft, y, widths.reduce((a, b) => a + b, 0), 26).fill(COLORS.brandDark);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
  let x = tableLeft;
  ['Description', 'Quantity', 'Rate', 'Amount'].forEach((header, i) => {
    doc.text(header, x + 8, y + 8, { width: widths[i] - 16 });
    x += widths[i];
  });
  doc.y = y + 26;
  ensureSpace(doc, 40);
  y = doc.y;
  doc.rect(tableLeft, y, widths.reduce((a, b) => a + b, 0), 40).fill(COLORS.white).stroke(COLORS.line);
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
  x = tableLeft;
  [
    settlementCtx.description,
    settlementCtx.qtyDisplay,
    `${money(settlementCtx.rate)} / ${settlementCtx.unitShort}`,
    money(settlementCtx.lineTotal),
  ].forEach((value, i) => {
    doc.text(valueOrDash(value), x + 8, y + 12, { width: widths[i] - 16 });
    x += widths[i];
  });
  doc.y = y + 52;
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
    .text(`Calculation: ${settlementCtx.formula} = ${money(settlementCtx.lineTotal)}`);
  doc.moveDown(0.8);

  ensureSpace(doc, 120);
  const boxW = 240;
  const boxX = PAGE.width - PAGE.margin - boxW;
  const boxY = doc.y;
  doc.roundedRect(boxX, boxY, boxW, 108, 8).fill(COLORS.soft).stroke(COLORS.line);
  [
    ['Subtotal (qty × rate)', money(settlementCtx.lineTotal)],
    ['Invoice amount', money(due)],
    ['Already paid', money(paid)],
    ['Balance due', money(remaining)],
  ].forEach((pair, index) => {
    const rowY = boxY + 12 + index * 22;
    const isLast = index === 3;
    doc.font(isLast ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(isLast ? 10 : 9)
      .fillColor(isLast ? COLORS.brandDark : COLORS.muted)
      .text(pair[0], boxX + 14, rowY, { width: 120 });
    doc.fillColor(isLast ? COLORS.brand : COLORS.text)
      .text(pair[1], boxX + 14, rowY, { width: boxW - 28, align: 'right' });
  });
  doc.y = boxY + 124;

  if (payment.notes) {
    sectionTitle(doc, 'Notes');
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text)
      .text(payment.notes, { width: PAGE.width - PAGE.margin * 2 });
    doc.moveDown(0.6);
  }

  drawTermsBlock(
    doc,
    'This invoice is issued by CalxMap for the engagement listed above. '
    + 'Please pay the balance due and retain this document for your records.'
  );
}

function generateInvoicePdf({ invoiceNumber, payment, booking, recipient }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, bufferPages: true });
    const chunks = [];
    const settlementCtx = invoiceSettlementContext(payment, booking);
    const isExpert = payment.party_type === 'expert';

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const payload = { invoiceNumber, payment, booking, recipient, settlementCtx };
    if (isExpert) drawExpertInvoice(doc, payload);
    else drawInstitutionInvoice(doc, payload);

    drawFooter(doc);
    doc.end();
  });
}

module.exports = {
  generateInvoicePdf,
  displayPaymentStatus,
  invoiceSettlementContext,
};
