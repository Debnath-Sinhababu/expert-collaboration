const PDFDocument = require('pdfkit');

const PAGE = { width: 595.28, height: 841.89, margin: 50 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

const COLORS = {
  text: '#1a1a1a',
  muted: '#6a6a6a',
  gold: '#C9A66B',
  pink: '#E8537C',
  blue: '#3B82F6',
  amber: '#F5B732',
  wordmark: '#333333',
  tagline: '#E8804A',
};

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatINR(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `Rs. ${n.toLocaleString('en-IN')}`;
}

function pct(value) {
  return value == null || value === '' ? '—' : `${value}%`;
}

function orDash(value) {
  return value == null || value === '' ? '—' : String(value);
}

function drawLogo(doc, x, y, r) {
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
}

function drawLetterhead(doc, data) {
  const top = PAGE.margin;
  drawLogo(doc, PAGE.margin, top, 20);
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.wordmark)
    .text('Calxmap', PAGE.margin + 58, top + 2, { lineBreak: false });
  doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.tagline)
    .text('Explore Your World', PAGE.margin + 58, top + 30, { lineBreak: false });

  const rightW = 240;
  const rightX = PAGE.width - PAGE.margin - rightW;
  let ry = top;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#444444')
    .text('CALXMAP (HPRN Technology Pvt. Ltd.)', rightX, ry, { width: rightW, align: 'right' });
  ry += 13;
  doc.text(data.companyAddress || 'Gurugram, Haryana, India', rightX, ry, { width: rightW, align: 'right' });
  ry += 13;
  if (data.cinNumber) {
    doc.text(`CIN-${data.cinNumber}`, rightX, ry, { width: rightW, align: 'right' });
    ry += 13;
  }

  const headerBottom = Math.max(top + 52, ry + 4);
  doc.moveTo(PAGE.margin, headerBottom).lineTo(PAGE.width - PAGE.margin, headerBottom)
    .lineWidth(2).strokeColor(COLORS.gold).stroke();
  doc.x = PAGE.margin;
  doc.y = headerBottom + 16;
}

function drawRefRow(doc, data) {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.text)
    .text(`Reference No: ${orDash(data.referenceNo)}`, PAGE.margin, y, { width: 300 });
  doc.font('Helvetica-Bold').fontSize(9)
    .text(`Date- ${formatDate(data.letterDate)}`, PAGE.width - PAGE.margin - 220, y, { width: 220, align: 'right' });
  doc.x = PAGE.margin;
  doc.y = y + 20;
}

function drawAddressee(doc, data) {
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text('To,');
  doc.font('Helvetica-Bold').fontSize(10).text(`Mr./Ms. ${orDash(data.expertName)}`);
  doc.font('Helvetica').fontSize(10).text(data.expertAddress || '');
  doc.moveDown(0.8);
}

function section(doc, num, title) {
  if (doc.y > PAGE.height - PAGE.margin - 60) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.text).text(`${num}. ${title}`);
  doc.moveDown(0.4);
}

function subsection(doc, num, title) {
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.text).text(`${num}  ${title}`);
  doc.moveDown(0.3);
}

function body(doc, text) {
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text)
    .text(text, { align: 'justify', width: CONTENT_WIDTH });
  doc.moveDown(0.6);
}

function clause(doc, num, text) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text)
    .text(`${num}  `, { continued: true, width: CONTENT_WIDTH, align: 'justify' });
  doc.font('Helvetica').text(text);
  doc.moveDown(0.5);
}

function bulletList(doc, items) {
  items.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text)
      .text(`•  ${label}: `, { continued: true });
    doc.font('Helvetica').text(orDash(value));
  });
  doc.moveDown(0.4);
}

function drawSignatureBlock(doc, data) {
  const blockHeight = 190;
  if (doc.y + blockHeight > PAGE.height - PAGE.margin) doc.addPage();
  doc.moveDown(1.5);

  const top = doc.y;
  const colW = (CONTENT_WIDTH - 40) / 2;
  const leftX = PAGE.margin;
  const rightX = PAGE.margin + colW + 40;

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text)
    .text('For Calxmap (HPRN Technology Pvt. Ltd.)', leftX, top, { width: colW });
  doc.font('Helvetica-Bold').fontSize(11)
    .text('For Trainer', rightX, top, { width: colW });

  let ly = top + 30;
  ['Signature', 'Name', 'Designation', 'Date'].forEach((label) => {
    doc.moveTo(leftX, ly).lineTo(leftX + colW, ly).strokeColor('#555555').lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(label, leftX, ly + 3);
    ly += 34;
  });

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text)
    .text(orDash(data.expertName), rightX, top + 18, { width: colW });
  let ry = top + 40;
  ['Signature', 'Date'].forEach((label) => {
    doc.moveTo(rightX, ry).lineTo(rightX + colW, ry).strokeColor('#555555').lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(label, rightX, ry + 3);
    ry += 34;
  });
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLORS.muted)
    .text('Digitally Signed', rightX, ry + 4, { width: colW, align: 'right' });

  doc.x = PAGE.margin;
  doc.y = Math.max(ly, ry + 20) + 10;
}

function drawWatermarkAndFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);

    doc.save();
    doc.opacity(0.06);
    doc.font('Helvetica-Bold').fontSize(70).fillColor('#333333');
    doc.rotate(-24, { origin: [PAGE.width / 2, PAGE.height / 2] });
    doc.text('Calxmap', 0, PAGE.height / 2 - 40, { width: PAGE.width, align: 'center' });
    doc.restore();

    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
      .text(
        'Calxmap (HPRN Technology Pvt. Ltd.)  •  Gurugram  •  www.calxmap.in',
        PAGE.margin,
        PAGE.height - 30,
        { width: CONTENT_WIDTH, align: 'center' }
      );
  }
}

/**
 * Renders the trainer engagement/offer letter directly to a PDF buffer with pdfkit
 * (no headless browser dependency, unlike the previous Puppeteer-based renderer).
 * @param {object} data
 * @returns {Promise<Buffer>}
 */
function generateOfferLetterPdf(data) {
  data = data || {};
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE.margin, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const totalFee = formatINR(data.totalFee);
    const milestone1Amount = formatINR(data.milestone1Amount);
    const milestone2Amount = formatINR(data.milestone2Amount);
    const milestone1Percent = pct(data.milestone1Percent);
    const milestone2Percent = pct(data.milestone2Percent);
    const documentTitle = (data.documentTitle || 'TRAINER ENGAGEMENT LETTER').toUpperCase();

    drawLetterhead(doc, data);
    drawRefRow(doc, data);

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.text)
      .text(documentTitle, { align: 'center', underline: true });
    doc.moveDown(1);

    drawAddressee(doc, data);

    body(doc, `We are pleased to confirm your engagement as a Trainer with Calxmap (HPRN Technology Pvt. Ltd.) ("Calxmap") for the role of ${orDash(data.engagementRole)}, on behalf of ${orDash(data.institutionName)} ("Client"), facilitated through the Calxmap platform. This Trainer Engagement Letter sets out the complete terms and conditions governing your engagement and shall be read and construed in its entirety.`);
    body(doc, `Please review the terms set out below carefully. Your acceptance of this Letter, whether by signing the signature block below or by electronic execution in accordance with Clause 19, shall constitute a binding agreement between you and Calxmap.`);

    section(doc, 1, 'Scope of Engagement');
    body(doc, `The Trainer shall render training services (the "Services") to ${orDash(data.institutionName)} for the role of ${orDash(data.engagementRole)}, as more particularly described in the Program Details set out in Clause 2. The Trainer shall perform the Services in a professional and diligent manner, consistent with the standards generally prevailing in the training industry in India, and in accordance with the schedule agreed with Calxmap and the Client.`);

    section(doc, 2, 'Program Details');
    bulletList(doc, [
      ['Course Title', data.courseTitle],
      ['Training Mode', data.trainingMode],
      ['Total Sessions', data.totalSessions],
      ['Duration', data.trainingDuration],
      ['Start Date', formatDate(data.startDate)],
    ]);

    section(doc, 3, 'Professional Fees and Payment Terms');
    clause(doc, '3.1', `The total professional fees payable to the Trainer for the successful delivery and completion of the program shall be ${totalFee}.`);
    clause(doc, '3.2', `The first milestone amount of ${milestone1Percent} of the total fee, amounting to ${milestone1Amount}, shall be released upon completion of the first delivery milestone, subject to satisfactory performance and submission of attendance records and supporting documents.`);
    clause(doc, '3.3', `The remaining ${milestone2Percent} of the fee, amounting to ${milestone2Amount}, shall be released upon successful completion of 100% of the program and fulfillment of all associated responsibilities.`);
    clause(doc, '3.4', `Payments shall be processed within ${orDash(data.paymentDays)} working days from the date of achieving the respective milestone and submission of required documentation.`);
    clause(doc, '3.5', `Calxmap shall deduct Tax Deducted at Source (TDS), wherever applicable, in accordance with the Income Tax Act, 1961, and shall provide the applicable TDS certificate to the Trainer.`);
    clause(doc, '3.6', `Goods and Services Tax (GST), if applicable and legally chargeable by the Trainer, shall be payable in addition to the professional fee upon submission of a valid GST invoice in compliance with applicable GST laws.`);

    section(doc, 4, 'Roles and Responsibilities');
    body(doc, `The Trainer shall prepare the required training materials, deliver each session in accordance with the agreed schedule, and maintain accurate records of attendance and session delivery. Calxmap shall provide the Trainer with the necessary platform access and administrative support for the delivery of the Services. The Client shall provide the Trainer with reasonable facilities and participant information required for the effective delivery of the program.`);

    section(doc, 5, 'Confidentiality and Intellectual Property');
    subsection(doc, '5.1', 'Confidentiality');
    body(doc, `Each party shall keep confidential all non-public information disclosed by the other party or by the Client in connection with this engagement, including business plans, commercial terms, participant data, and any proprietary materials. The Trainer shall not disclose any such confidential information to any third party without the prior written consent of Calxmap and the Client.`);
    subsection(doc, '5.2', 'Intellectual Property');
    body(doc, `All course content, slides, handouts, and other training materials created by the Trainer in connection with the Services shall remain the intellectual property of the Trainer. The Client shall receive a non-exclusive, non-transferable licence to use such materials solely for its internal training purposes, and shall not reproduce or distribute them commercially without the Trainer's written consent.`);
    subsection(doc, '5.3', 'Recording and AI Usage');
    body(doc, `Sessions may be recorded only with the prior written consent of the Trainer. The Trainer's name, likeness, and voice shall not be used to train, fine-tune, or improve any artificial intelligence or machine learning model, and recordings shall not be used for any automated processing without the Trainer's express written consent.`);
    subsection(doc, '5.4', 'Return of Confidential Information');
    body(doc, `Upon termination or expiry of this engagement, each party shall promptly return or destroy all confidential information of the other party and certify such return or destruction in writing upon request.`);
    subsection(doc, '5.5', 'Survival');
    body(doc, `The obligations under this Clause 5 shall survive the termination or expiry of this engagement for a period of ${orDash(data.ipSurvivalYears)} years thereafter.`);

    section(doc, 6, 'Non-Solicitation and Non-Circumvention');
    clause(doc, '6.1', `During the term of this agreement and for a period of ${orDash(data.nonSolicitationMonths)} months after its completion or termination, the Trainer shall not directly or indirectly solicit, approach, contract with, or provide similar services to any client, institution, organization, or learner introduced through Calxmap without Calxmap's prior written consent.`);
    clause(doc, '6.2', `The Trainer shall not bypass or circumvent Calxmap by entering into any direct or indirect business relationship with any client, institution, or learner introduced through Calxmap for services similar to those covered under this agreement.`);
    clause(doc, '6.3', `This restriction shall not apply to clients or institutions with whom the Trainer had an existing professional relationship prior to their introduction by Calxmap, provided such relationship can be reasonably demonstrated.`);
    clause(doc, '6.4', `The Trainer acknowledges that any breach of this clause may cause irreparable harm to Calxmap, and Calxmap shall be entitled to seek appropriate legal remedies, including injunctive relief and recovery of damages, in accordance with applicable law.`);

    section(doc, 7, 'Taxes and Statutory Compliance');
    body(doc, `The Trainer shall be solely responsible for the payment of all applicable taxes, including but not limited to income tax, GST, and professional tax, arising out of the fees paid under this Letter. Calxmap shall deduct tax at source as required under the Income Tax Act, 1961, and shall issue a TDS certificate accordingly. The Trainer shall comply with all applicable laws and regulations and shall provide all required documentation, including PAN, bank details, and GST registration where applicable.`);

    section(doc, 8, 'Termination');
    body(doc, `Either party may terminate this engagement by providing not less than ${orDash(data.noticePeriodDays)} days' written notice to the other party. Calxmap may terminate this engagement with immediate effect in the event of a material breach of these terms, misconduct, or any act that brings Calxmap or the Client into disrepute. Upon termination, fees shall be payable only for services actually rendered up to the date of termination.`);

    section(doc, 9, 'Force Majeure');
    body(doc, `Neither party shall be liable for any delay or failure to perform its obligations under this Letter to the extent that such delay or failure is caused by events beyond its reasonable control, including but not limited to acts of God, war, terrorism, epidemics, pandemics, governmental action, or failure of the internet or power supply. The affected party shall notify the other party promptly and shall resume performance as soon as reasonably practicable.`);

    section(doc, 10, 'Governing Law and Jurisdiction');
    body(doc, `This Letter shall be governed by and construed in accordance with the laws of India. The courts at ${orDash(data.jurisdictionCity || 'Gurugram')}, ${orDash(data.jurisdictionState || 'Haryana')} shall have exclusive jurisdiction to entertain any disputes arising out of or in connection with this Letter.`);

    section(doc, 11, 'Entire Agreement');
    body(doc, `This Letter constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior discussions, understandings, and agreements, whether written or oral. No amendment or variation shall be effective unless reduced to writing and signed by both parties.`);

    section(doc, 12, 'Independent Contractor Status');
    body(doc, `The Trainer is an independent contractor and not an employee, agent, or partner of Calxmap or the Client. Nothing in this Letter shall be construed to create an employer-employee relationship, and the Trainer shall not be entitled to any employee benefits, provident fund, gratuity, or other statutory benefits.`);

    section(doc, 13, 'Code of Conduct');
    body(doc, `The Trainer shall maintain the highest standards of professionalism, punctuality, and integrity during all sessions. The Trainer shall not engage in any conduct that is discriminatory, harassing, or otherwise inconsistent with the values of Calxmap and the Client. Any grievances raised by participants shall be addressed promptly and appropriately.`);

    section(doc, 14, 'Attendance and Training Records');
    body(doc, `The Trainer shall maintain accurate records of attendance, session logs, assessments, and any other documentation required by Calxmap. Such records shall be submitted to Calxmap within a reasonable time following each session and shall be made available to the Client upon request.`);

    section(doc, 15, 'Training Schedule and Session Rescheduling');
    body(doc, `The training schedule shall be agreed between the parties in advance. In the event a session is required to be rescheduled, the Trainer shall provide the Client with as much advance notice as practicable and shall make reasonable efforts to offer an alternate time. Repeated cancellations without reasonable cause may constitute a breach of this Letter.`);

    section(doc, 16, 'Trainer Availability');
    body(doc, `The Trainer confirms that they are available to deliver the Services as scheduled and shall remain responsive to reasonable coordination requests from Calxmap and the Client during the term of this engagement. Any anticipated unavailability shall be communicated to Calxmap in advance.`);

    section(doc, 17, 'Use of Calxmap Name and Client Information');
    body(doc, `The Trainer shall not use the name, logo, or branding of Calxmap or the Client for any purpose other than the delivery of the Services without prior written consent. The Trainer shall not communicate with the Client or its participants regarding this engagement outside the Calxmap platform, except as required for the delivery of the Services.`);

    section(doc, 18, 'Notices');
    body(doc, `All notices under this Letter shall be in writing and shall be delivered personally, by registered post, or by electronic mail to the addresses notified by each party. Notices shall be deemed received upon delivery if sent during business hours, or on the next business day if sent outside such hours.`);

    section(doc, 19, 'Electronic Execution');
    body(doc, `This Letter may be executed electronically, and a digital signature or electronic acknowledgment shall be valid and binding to the same extent as an original handwritten signature. A copy of this Letter transmitted by electronic means shall be treated as an original.`);

    drawSignatureBlock(doc, data);
    drawWatermarkAndFooter(doc);

    doc.end();
  });
}

module.exports = { generateOfferLetterPdf };
