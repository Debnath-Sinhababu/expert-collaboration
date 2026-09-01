const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { buildOfferLetterModel, formatLetterDate } = require('./offerLetterContent');

const PAGE = { width: 595.28, height: 841.89, margin: 56 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const FOOTER_RESERVE = 44;

const COLORS = {
  text: '#1a1a1a',
  muted: '#6a6a6a',
  rule: '#C9A66B',
  line: '#555555',
  pink: '#E8537C',
  blue: '#3B82F6',
  amber: '#F5B732',
  wordmark: '#333333',
  tagline: '#E8804A',
};

// Drop the official letterhead mark here and it is used verbatim on every letter. Until then the
// vector fallback below is drawn instead.
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'calxmap-logo.png');

function logoBuffer() {
  try {
    return fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH) : null;
  } catch {
    return null;
  }
}

function drawFallbackLogo(doc, x, y) {
  const r = 20;
  const cx = x + r;
  const cy = y + r;
  [COLORS.pink, COLORS.blue, COLORS.amber].forEach((color, i) => {
    doc.circle(cx, cy, r)
      .lineWidth(5)
      .dash(32, { space: 84, phase: i * 42 })
      .strokeColor(color)
      .stroke();
  });
  doc.undash();
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.wordmark)
    .text('Calxmap', x + 54, y + 2, { lineBreak: false });
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLORS.tagline)
    .text('Explore Your World', x + 54, y + 28, { lineBreak: false });
}

function drawLetterhead(doc, model) {
  const top = PAGE.margin;

  const logo = logoBuffer();
  if (logo) {
    doc.image(logo, PAGE.margin, top, { fit: [170, 46], align: 'left', valign: 'top' });
  } else {
    drawFallbackLogo(doc, PAGE.margin, top);
  }

  const rightW = 250;
  const rightX = PAGE.width - PAGE.margin - rightW;
  let ry = top;

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333')
    .text(model.company.name, rightX, ry, { width: rightW, align: 'right' });
  ry += 12;

  doc.font('Helvetica').fontSize(9).fillColor('#444444');
  model.company.addressLines.forEach((line) => {
    doc.text(line, rightX, ry, { width: rightW, align: 'right' });
    ry += 12;
  });
  doc.text(`CIN-${model.company.cin}`, rightX, ry, { width: rightW, align: 'right' });
  ry += 12;

  const headerBottom = Math.max(top + 52, ry + 4);
  doc.moveTo(PAGE.margin, headerBottom).lineTo(PAGE.width - PAGE.margin, headerBottom)
    .lineWidth(2).strokeColor(COLORS.rule).stroke();
  doc.x = PAGE.margin;
  doc.y = headerBottom + 16;
}

function drawRefRow(doc, model) {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.text)
    .text(`Reference No: ${model.referenceNo}`, PAGE.margin, y, { width: 300 });
  doc.font('Helvetica-Bold').fontSize(9.5)
    .text(`Date- ${model.letterDate}`, PAGE.width - PAGE.margin - 220, y, { width: 220, align: 'right' });
  doc.x = PAGE.margin;
  doc.y = y + 22;
}

function drawAddressee(doc, model) {
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text('To,', PAGE.margin, doc.y);
  doc.font('Helvetica-Bold').fontSize(10).text(`${model.addressee.salutation} ${model.addressee.name}`);
  if (model.addressee.address) {
    doc.font('Helvetica').fontSize(10).text(model.addressee.address);
  }
  doc.moveDown(0.9);
}

function ensureRoom(doc, needed) {
  if (doc.y + needed > PAGE.height - PAGE.margin - FOOTER_RESERVE) doc.addPage();
}

function paragraph(doc, text) {
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text)
    .text(text, PAGE.margin, doc.y, { align: 'justify', width: CONTENT_WIDTH });
  doc.moveDown(0.6);
}

function sectionHeading(doc, no, title) {
  ensureRoom(doc, 70);
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(COLORS.text)
    .text(`${no}. ${title}`, PAGE.margin, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.4);
}

function subHeading(doc, no, title) {
  ensureRoom(doc, 50);
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.text)
    .text(`${no}  ${title}`, PAGE.margin, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.3);
}

function clause(doc, no, text) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text)
    .text(`${no}  `, PAGE.margin, doc.y, { continued: true, width: CONTENT_WIDTH, align: 'justify' });
  doc.font('Helvetica').text(text);
  doc.moveDown(0.5);
}

function bulletList(doc, items) {
  items.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text)
      .text('\u2022  ', PAGE.margin + 6, doc.y, { continued: true });
    doc.text(`${label}: `, { continued: true });
    doc.font('Helvetica').text(String(value));
  });
  doc.moveDown(0.5);
}

function renderBlocks(doc, blocks) {
  blocks.forEach((block) => {
    if (block.type === 'p') paragraph(doc, block.text);
    else if (block.type === 'clause') clause(doc, block.no, block.text);
    else if (block.type === 'sub') subHeading(doc, block.no, block.title);
    else if (block.type === 'bullets') bulletList(doc, block.items);
  });
}

function drawSignatureBlock(doc, model) {
  // Extra room for the electronic-execution note rendered under a typed signature.
  const typed = model.signature.typed;
  const blockHeight = typed?.name ? 230 : 180;
  if (doc.y + blockHeight > PAGE.height - PAGE.margin - FOOTER_RESERVE) doc.addPage();
  doc.moveDown(1.2);

  const top = doc.y;
  const colW = (CONTENT_WIDTH - 40) / 2;
  const leftX = PAGE.margin;
  const rightX = PAGE.margin + colW + 40;

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.text)
    .text(model.signature.companyHeading, leftX, top, { width: colW });
  doc.font('Helvetica-Bold').fontSize(10.5)
    .text(model.signature.trainerHeading, rightX, top, { width: colW });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text)
    .text(`${model.addressee.salutation} ${model.addressee.name}`, rightX, top + 16, { width: colW });

  let ly = top + 48;
  model.signature.companyLines.forEach((label) => {
    doc.moveTo(leftX, ly).lineTo(leftX + colW, ly).strokeColor(COLORS.line).lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(label, leftX, ly + 3);
    ly += 34;
  });

  // A signed copy renders the expert's typed signature and date on the trainer lines. The unsigned
  // copy leaves them completely blank so it reads as an unexecuted letter until the expert signs.
  let ry = top + 48;
  [
    [model.signature.trainerLines[0], typed?.name || null, 'Helvetica-BoldOblique', 13],
    [model.signature.trainerLines[1], typed?.date ? formatLetterDate(typed.date) : null, 'Helvetica-Bold', 10],
  ].forEach(([label, value, font, size]) => {
    if (value) {
      doc.font(font).fontSize(size).fillColor(COLORS.text)
        .text(String(value), rightX, ry - (size + 4), { width: colW, lineBreak: false });
    }
    doc.moveTo(rightX, ry).lineTo(rightX + colW, ry).strokeColor(COLORS.line).lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(label, rightX, ry + 3);
    ry += 34;
  });

  if (typed?.name) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.text)
      .text('Digitally Signed', rightX, ry + 2, { width: colW });
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(COLORS.muted)
      .text(
        `Electronically signed by ${typed.name}${typed.signedAt ? ` on ${formatLetterDate(typed.signedAt)}` : ''} via the Calxmap platform, and accepted as binding under Clause 19.`,
        rightX,
        doc.y + 2,
        { width: colW }
      );
    ry = doc.y - 4;
  }

  doc.x = PAGE.margin;
  doc.y = Math.max(ly, ry + 20) + 10;
}

function drawFooters(doc, model) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    // The footer sits below the bottom margin; without lifting the margin pdfkit would treat it as
    // overflow and append a blank page per footer.
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
      .text(model.company.footer, PAGE.margin, PAGE.height - 34, {
        width: CONTENT_WIDTH,
        align: 'center',
        lineBreak: false,
      });
    doc.page.margins.bottom = bottomMargin;
  }
}

/**
 * Renders the trainer engagement letter to a PDF buffer with pdfkit (no headless browser
 * dependency). All wording comes from offerLetterContent so the PDF and the in-app HTML preview
 * stay identical.
 * @param {object} data
 * @returns {Promise<Buffer>}
 */
function generateOfferLetterPdf(data) {
  return new Promise((resolve, reject) => {
    const model = buildOfferLetterModel(data);
    const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawLetterhead(doc, model);
    drawRefRow(doc, model);

    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.text)
      .text(model.documentTitle, PAGE.margin, doc.y, { align: 'center', width: CONTENT_WIDTH });
    doc.moveDown(1.1);

    drawAddressee(doc, model);
    model.intro.forEach((text) => paragraph(doc, text));

    model.sections.forEach((sec) => {
      sectionHeading(doc, sec.no, sec.title);
      renderBlocks(doc, sec.blocks);
    });

    ensureRoom(doc, 90);
    doc.font('Helvetica-Bold').fontSize(12.5).fillColor(COLORS.text)
      .text(model.acceptance.title, PAGE.margin, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.4);
    paragraph(doc, model.acceptance.text);

    drawSignatureBlock(doc, model);
    drawFooters(doc, model);

    doc.end();
  });
}

module.exports = { generateOfferLetterPdf };
