const fs = require('fs');
const path = require('path');
const { buildOfferLetterModel, formatLetterDate } = require('./offerLetterContent');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Same asset the PDF renderer uses, so the preview and the signed document share one letterhead.
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'calxmap-logo.png');

const LOGO_FALLBACK_SVG = `
  <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="25" cy="25" r="20" fill="none" stroke="#E8537C" stroke-width="6" stroke-linecap="round" stroke-dasharray="40 45.6" transform="rotate(-90 25 25)"/>
    <circle cx="25" cy="25" r="20" fill="none" stroke="#3B82F6" stroke-width="6" stroke-linecap="round" stroke-dasharray="40 45.6" transform="rotate(30 25 25)"/>
    <circle cx="25" cy="25" r="20" fill="none" stroke="#F5B732" stroke-width="6" stroke-linecap="round" stroke-dasharray="40 45.6" transform="rotate(150 25 25)"/>
  </svg>`;

function logoMarkup() {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      const base64 = fs.readFileSync(LOGO_PATH).toString('base64');
      return `<img class="logo-img" src="data:image/png;base64,${base64}" alt="Calxmap" />`;
    }
  } catch {
    /* fall through to the vector mark */
  }
  return `
    <div class="logo">${LOGO_FALLBACK_SVG}</div>
    <div>
      <p class="wordmark">Calxmap</p>
      <p class="tagline">Explore Your World</p>
    </div>`;
}

function renderBlocks(blocks) {
  return blocks.map((block) => {
    if (block.type === 'p') {
      return `<p class="body">${escapeHtml(block.text)}</p>`;
    }
    if (block.type === 'clause') {
      return `<p class="clause"><span class="num">${escapeHtml(block.no)}</span>&nbsp; ${escapeHtml(block.text)}</p>`;
    }
    if (block.type === 'sub') {
      return `<h4 class="sub"><span class="num">${escapeHtml(block.no)}</span>&nbsp; ${escapeHtml(block.title)}</h4>`;
    }
    if (block.type === 'bullets') {
      const items = block.items
        .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`)
        .join('\n        ');
      return `<ul class="details">\n        ${items}\n      </ul>`;
    }
    return '';
  }).join('\n      ');
}

function renderSections(sections) {
  return sections.map((sec) => `
      <h3 class="section">${sec.no}. ${escapeHtml(sec.title)}</h3>
      ${renderBlocks(sec.blocks)}`).join('\n');
}

function renderSignatureField(label, value, valueClass) {
  const filled = value
    ? `<div class="sign-value ${valueClass}">${escapeHtml(value)}</div>`
    : '';
  return `<div class="sign-field">
            ${filled}
            <div class="sign-line"></div>
            <div class="sign-label">${escapeHtml(label)}</div>
          </div>`;
}

/**
 * Builds the in-app HTML preview of the engagement letter. All wording comes from
 * offerLetterContent, which the PDF renderer also uses, so the two can never diverge.
 */
function buildOfferLetterHtml(data) {
  const model = buildOfferLetterModel(data);
  const typed = model.signature.typed;

  const companyLines = model.signature.companyLines
    .map((label) => renderSignatureField(label, null, ''))
    .join('\n          ');

  const trainerLines = [
    renderSignatureField(model.signature.trainerLines[0], typed?.name || null, 'signed-name'),
    renderSignatureField(model.signature.trainerLines[1], typed?.date ? formatLetterDate(typed.date) : null, ''),
  ].join('\n          ');

  const digitalNote = typed?.name
    ? `<div class="digital-note"><strong>Digitally Signed</strong><br />Electronically signed by ${escapeHtml(typed.name)}${typed.signedAt ? ` on ${escapeHtml(formatLetterDate(typed.signedAt))}` : ''} via the Calxmap platform, and accepted as binding under Clause 19.</div>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 40px 50px; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, 'Times New Roman', Times, serif;
        font-size: 13px;
        line-height: 1.6;
        color: #1a1a1a;
      }

      /* ---- Header ---- */
      .letterhead { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
      .letterhead-left { display: flex; align-items: center; gap: 12px; }
      .logo { width: 50px; height: 50px; flex-shrink: 0; }
      .logo svg { width: 100%; height: 100%; }
      .logo-img { max-width: 200px; max-height: 56px; }
      .wordmark { font-size: 26px; font-weight: 700; color: #333; letter-spacing: 0.5px; line-height: 1.1; margin: 0; }
      .tagline { font-size: 11px; color: #E8804A; font-style: italic; font-family: 'Segoe Script', 'Brush Script MT', cursive; margin: 2px 0 0 0; }
      .letterhead-right { text-align: right; font-size: 11px; color: #444; line-height: 1.5; }
      .letterhead-right .co-name { font-weight: 700; color: #333; }
      .divider { border: none; border-top: 2px solid #C9A66B; margin: 0 0 20px 0; }

      /* ---- Reference / Date row ---- */
      .ref-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 20px; }

      /* ---- Title ---- */
      .title { text-align: center; font-weight: 700; text-transform: uppercase; font-size: 17px; margin: 20px 0 24px; }

      /* ---- Addressee ---- */
      .addressee { margin-bottom: 20px; }
      .addressee p { margin: 0 0 2px 0; }
      .addressee .name { font-weight: 700; }

      /* ---- Body ---- */
      p.body { text-align: justify; margin: 0 0 12px 0; }
      h3.section { font-size: 15px; font-weight: 700; margin: 20px 0 10px; }
      h4.sub { font-size: 13px; font-weight: 700; margin: 14px 0 6px; }
      ul.details { margin: 0 0 12px 0; padding-left: 22px; list-style-type: square; }
      ul.details li { margin-bottom: 4px; }
      p.clause { text-align: justify; margin: 0 0 10px 0; }
      .clause .num, .sub .num { font-weight: 700; }

      /* ---- Signature block ---- */
      .signature { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 40px; gap: 40px; }
      .sign-col { width: 45%; }
      .sign-col h4 { margin: 0 0 8px 0; font-size: 13px; font-weight: 700; }
      .trainer-name { margin: 0 0 8px 0; font-size: 13px; font-weight: 700; min-height: 20px; }
      .sign-field { margin-bottom: 14px; }
      .sign-line { border-bottom: 1px solid #555; height: 24px; }
      .sign-value { height: 24px; line-height: 24px; font-weight: 700; }
      .sign-value.signed-name { font-style: italic; font-size: 17px; }
      .sign-label { font-size: 11px; color: #6a6a6a; margin-top: 2px; }
      .digital-note { font-size: 10px; font-style: italic; color: #6a6a6a; margin-top: 8px; }
      .system-note {
        margin-top: 28px;
        font-size: 10px;
        font-style: italic;
        color: #6a6a6a;
        text-align: justify;
        line-height: 1.5;
      }

      /* ---- Footer ---- */
      .footer { margin-top: 32px; padding-top: 8px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 10px; color: #6a6a6a; }
    </style>
  </head>
  <body>
    <div class="content">
      <div class="letterhead">
        <div class="letterhead-left">${logoMarkup()}</div>
        <div class="letterhead-right">
          <div class="co-name">${escapeHtml(model.company.name)}</div>
          ${model.company.addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('\n          ')}
          <div>CIN-${escapeHtml(model.company.cin)}</div>
        </div>
      </div>

      <hr class="divider" />

      <div class="ref-row">
        <div>Reference No: ${escapeHtml(model.referenceNo)}</div>
        <div>Date- ${escapeHtml(model.letterDate)}</div>
      </div>

      <h2 class="title">${escapeHtml(model.documentTitle)}</h2>

      <div class="addressee">
        <p>To,</p>
        <p class="name">${escapeHtml(model.addressee.salutation)} ${escapeHtml(model.addressee.name)}</p>
        <p>${escapeHtml(model.addressee.address)}</p>
      </div>

      ${model.intro.map((text) => `<p class="body">${escapeHtml(text)}</p>`).join('\n      ')}
${renderSections(model.sections)}

      <h3 class="section">${escapeHtml(model.acceptance.title)}</h3>
      <p class="body">${escapeHtml(model.acceptance.text)}</p>

      <div class="signature">
        <div class="sign-col">
          <h4>${escapeHtml(model.signature.companyHeading)}</h4>
          <div class="trainer-name">&nbsp;</div>
          ${companyLines}
        </div>
        <div class="sign-col">
          <h4>${escapeHtml(model.signature.trainerHeading)}</h4>
          <div class="trainer-name">${escapeHtml(model.addressee.salutation)} ${escapeHtml(model.addressee.name)}</div>
          ${trainerLines}
          ${digitalNote}
        </div>
      </div>

      ${model.systemGeneratedNote
        ? `<p class="system-note">${escapeHtml(model.systemGeneratedNote)}</p>`
        : ''}

      <div class="footer">${escapeHtml(model.company.footer)}</div>
    </div>
  </body>
</html>`;
}

module.exports = {
  buildOfferLetterHtml,
  escapeHtml,
};
