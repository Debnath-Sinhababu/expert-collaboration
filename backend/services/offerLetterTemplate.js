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

function formatINR(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `Rs. ${n.toLocaleString('en-IN')}`;
}

const LOGO_SVG = `
  <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="25" cy="25" r="20" fill="none" stroke="#E8537C" stroke-width="6" stroke-linecap="round" stroke-dasharray="40 45.6" transform="rotate(-90 25 25)"/>
    <circle cx="25" cy="25" r="20" fill="none" stroke="#3B82F6" stroke-width="6" stroke-linecap="round" stroke-dasharray="40 45.6" transform="rotate(30 25 25)"/>
    <circle cx="25" cy="25" r="20" fill="none" stroke="#F5B732" stroke-width="6" stroke-linecap="round" stroke-dasharray="40 45.6" transform="rotate(150 25 25)"/>
  </svg>`;

function buildOfferLetterHtml(data) {
  data = data || {};
  const expertName = escapeHtml(data.expertName || 'Expert');
  const expertAddress = escapeHtml(data.expertAddress || '');
  const referenceNo = escapeHtml(data.referenceNo || '—');
  const letterDate = escapeHtml(formatDate(data.letterDate || new Date().toISOString()));
  const engagementRole = escapeHtml(data.engagementRole || 'the engagement');
  const courseTitle = escapeHtml(data.courseTitle || '—');
  const trainingMode = escapeHtml(data.trainingMode || '—');
  const totalSessions = escapeHtml(data.totalSessions || '—');
  const trainingDuration = escapeHtml(data.trainingDuration || '—');
  const startDate = escapeHtml(formatDate(data.startDate));
  const totalFee = escapeHtml(formatINR(data.totalFee));
  const milestone1Amount = escapeHtml(formatINR(data.milestone1Amount));
  const milestone2Amount = escapeHtml(formatINR(data.milestone2Amount));
  const pct = (v) => (v == null || v === '' ? '—' : `${escapeHtml(v)}%`);
  const milestone1Percent = pct(data.milestone1Percent);
  const milestone2Percent = pct(data.milestone2Percent);
  const paymentDays = escapeHtml(data.paymentDays || '—');
  const noticePeriodDays = escapeHtml(data.noticePeriodDays || '—');
  const nonSolicitationMonths = escapeHtml(data.nonSolicitationMonths || '—');
  const ipSurvivalYears = escapeHtml(data.ipSurvivalYears || '—');
  const jurisdictionCity = escapeHtml(data.jurisdictionCity || 'Gurugram');
  const jurisdictionState = escapeHtml(data.jurisdictionState || 'Haryana');
  const documentTitle = escapeHtml(data.documentTitle || 'TRAINER ENGAGEMENT LETTER');
  const institutionName = escapeHtml(data.institutionName || 'the institution');
  const companyAddress = escapeHtml(data.companyAddress || 'Gurugram, Haryana, India');
  const cinNumber = escapeHtml(data.cinNumber || '');
  const cinLine = cinNumber ? `<div class="co-line">CIN-${cinNumber}</div>` : '';

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
      .content { position: relative; z-index: 1; }

      /* ---- Header ---- */
      .letterhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
      .letterhead-left { display: flex; align-items: center; gap: 12px; }
      .logo { width: 50px; height: 50px; flex-shrink: 0; }
      .logo svg { width: 100%; height: 100%; }
      .wordmark { font-size: 26px; font-weight: 700; color: #333; letter-spacing: 0.5px; line-height: 1.1; margin: 0; }
      .tagline { font-size: 11px; color: #E8804A; font-style: italic; font-family: 'Segoe Script', 'Brush Script MT', cursive; margin: 2px 0 0 0; }
      .letterhead-right { text-align: right; font-size: 11px; font-weight: 700; color: #444; line-height: 1.45; }
      .divider { border: none; border-top: 2px solid #C9A66B; margin: 0 0 20px 0; }

      /* ---- Reference / Date row ---- */
      .ref-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 20px; }
      .ref-row .label { font-weight: 700; }

      /* ---- Title ---- */
      .title { text-align: center; font-weight: 700; text-transform: uppercase; text-decoration: underline; font-size: 18px; margin: 24px 0; }

      /* ---- Addressee ---- */
      .addressee { margin-bottom: 20px; }
      .addressee .to { margin: 0 0 4px 0; }
      .addressee .name { font-weight: 700; margin: 0 0 2px 0; }
      .addressee .address { margin: 0; }

      /* ---- Body paragraphs ---- */
      p.body { text-align: justify; margin: 0 0 12px 0; }

      /* ---- Sections ---- */
      h3.section { font-size: 15px; font-weight: 700; margin: 20px 0 10px; }
      ul.details { margin: 0 0 12px 0; padding-left: 22px; }
      ul.details li { margin-bottom: 4px; text-align: justify; }
      p.clause { text-align: justify; margin: 0 0 10px 0; }
      .clause .num { font-weight: 700; }
      h4.sub { font-size: 13px; font-weight: 700; margin: 14px 0 6px; }

      /* ---- Signature block ---- */
      .signature { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 48px; gap: 40px; }
      .sign-col { width: 45%; }
      .sign-col h4 { margin: 0 0 16px 0; font-size: 13px; font-weight: 700; }
      .trainer-name { margin: 0 0 16px 0; font-size: 13px; font-weight: 700; }
      .sign-field { margin-bottom: 14px; }
      .sign-line { border-bottom: 1px solid #555; height: 24px; }
      .sign-label { font-size: 11px; color: #6a6a6a; margin-top: 2px; }
      .digital-note { font-size: 11px; font-style: italic; color: #6a6a6a; text-align: right; margin-top: 8px; }

      /* ---- Watermark ---- */
      .watermark {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transform: rotate(-24deg);
        pointer-events: none;
        z-index: 0;
        opacity: 0.06;
        color: #333;
        font-size: 90px;
        font-weight: 700;
        letter-spacing: 2px;
      }
      .watermark svg { width: 120px; height: 120px; }

      /* ---- Footer ---- */
      .footer {
        position: fixed;
        bottom: 8px;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 10px;
        color: #6a6a6a;
        z-index: 0;
      }
    </style>
  </head>
  <body>
    <div class="watermark">${LOGO_SVG}<span>Calxmap</span></div>

    <div class="content">
      <div class="letterhead">
        <div class="letterhead-left">
          <div class="logo">${LOGO_SVG}</div>
          <div>
            <p class="wordmark">Calxmap</p>
            <p class="tagline">Explore Your World</p>
          </div>
        </div>
        <div class="letterhead-right">
          <div>CALXMAP (HPRN Technology Pvt. Ltd.)</div>
          <div>${companyAddress}</div>
          ${cinLine}
        </div>
      </div>

      <hr class="divider" />

      <div class="ref-row">
        <div><span class="label">Reference No:</span> ${referenceNo}</div>
        <div><span class="label">Date-</span> ${letterDate}</div>
      </div>

      <h2 class="title">${documentTitle}</h2>

      <div class="addressee">
        <p class="to">To,</p>
        <p class="name">Mr./Ms. ${expertName}</p>
        <p class="address">${expertAddress}</p>
      </div>

      <p class="body">
        We are pleased to confirm your engagement as a Trainer with Calxmap (HPRN
        Technology Pvt. Ltd.) ("Calxmap") for the role of
        <strong>${engagementRole}</strong>, on behalf of
        <strong>${institutionName}</strong> ("Client"), facilitated through the
        Calxmap platform. This Trainer Engagement Letter sets out the complete
        terms and conditions governing your engagement and shall be read and
        construed in its entirety.
      </p>

      <p class="body">
        Please review the terms set out below carefully. Your acceptance of this
        Letter, whether by signing the signature block below or by electronic
        execution in accordance with Clause 19, shall constitute a binding
        agreement between you and Calxmap.
      </p>

      <h3 class="section">1. Scope of Engagement</h3>
      <p class="body">
        The Trainer shall render training services (the "Services") to
        <strong>${institutionName}</strong> for the role of
        <strong>${engagementRole}</strong>, as more particularly described in the
        Program Details set out in Clause 2. The Trainer shall perform the
        Services in a professional and diligent manner, consistent with the
        standards generally prevailing in the training industry in India, and in
        accordance with the schedule agreed with Calxmap and the Client.
      </p>

      <h3 class="section">2. Program Details</h3>
      <ul class="details">
        <li><strong>Course Title:</strong> ${courseTitle}</li>
        <li><strong>Training Mode:</strong> ${trainingMode}</li>
        <li><strong>Total Sessions:</strong> ${totalSessions}</li>
        <li><strong>Duration:</strong> ${trainingDuration}</li>
        <li><strong>Start Date:</strong> ${startDate}</li>
      </ul>

      <h3 class="section">3. Professional Fees and Payment Terms</h3>
      <p class="clause"><span class="num">3.1</span>&nbsp; The total professional fees payable to the Trainer for the successful delivery and completion of the program shall be ${totalFee}.</p>
      <p class="clause"><span class="num">3.2</span>&nbsp; The first milestone amount of ${milestone1Percent} of the total fee, amounting to ${milestone1Amount}, shall be released upon completion of the first delivery milestone, subject to satisfactory performance and submission of attendance records and supporting documents.</p>
      <p class="clause"><span class="num">3.3</span>&nbsp; The remaining ${milestone2Percent} of the fee, amounting to ${milestone2Amount}, shall be released upon successful completion of 100% of the program and fulfillment of all associated responsibilities.</p>
      <p class="clause"><span class="num">3.4</span>&nbsp; Payments shall be processed within ${paymentDays} working days from the date of achieving the respective milestone and submission of required documentation.</p>
      <p class="clause"><span class="num">3.5</span>&nbsp; Calxmap shall deduct Tax Deducted at Source (TDS), wherever applicable, in accordance with the Income Tax Act, 1961, and shall provide the applicable TDS certificate to the Trainer.</p>
      <p class="clause"><span class="num">3.6</span>&nbsp; Goods and Services Tax (GST), if applicable and legally chargeable by the Trainer, shall be payable in addition to the professional fee upon submission of a valid GST invoice in compliance with applicable GST laws.</p>

      <h3 class="section">4. Roles and Responsibilities</h3>
      <p class="body">
        The Trainer shall prepare the required training materials, deliver each
        session in accordance with the agreed schedule, and maintain accurate
        records of attendance and session delivery. Calxmap shall provide the
        Trainer with the necessary platform access and administrative support for
        the delivery of the Services. The Client shall provide the Trainer with
        reasonable facilities and participant information required for the
        effective delivery of the program.
      </p>

      <h3 class="section">5. Confidentiality and Intellectual Property</h3>
      <h4 class="sub"><span class="num">5.1</span>&nbsp; Confidentiality</h4>
      <p class="body">
        Each party shall keep confidential all non-public information disclosed
        by the other party or by the Client in connection with this engagement,
        including business plans, commercial terms, participant data, and any
        proprietary materials. The Trainer shall not disclose any such
        confidential information to any third party without the prior written
        consent of Calxmap and the Client.
      </p>
      <h4 class="sub"><span class="num">5.2</span>&nbsp; Intellectual Property</h4>
      <p class="body">
        All course content, slides, handouts, and other training materials
        created by the Trainer in connection with the Services shall remain the
        intellectual property of the Trainer. The Client shall receive a
        non-exclusive, non-transferable licence to use such materials solely for
        its internal training purposes, and shall not reproduce or distribute
        them commercially without the Trainer's written consent.
      </p>
      <h4 class="sub"><span class="num">5.3</span>&nbsp; Recording and AI Usage</h4>
      <p class="body">
        Sessions may be recorded only with the prior written consent of the
        Trainer. The Trainer's name, likeness, and voice shall not be used to
        train, fine-tune, or improve any artificial intelligence or machine
        learning model, and recordings shall not be used for any automated
        processing without the Trainer's express written consent.
      </p>
      <h4 class="sub"><span class="num">5.4</span>&nbsp; Return of Confidential Information</h4>
      <p class="body">
        Upon termination or expiry of this engagement, each party shall promptly
        return or destroy all confidential information of the other party and
        certify such return or destruction in writing upon request.
      </p>
      <h4 class="sub"><span class="num">5.5</span>&nbsp; Survival</h4>
      <p class="body">
        The obligations under this Clause 5 shall survive the termination or
        expiry of this engagement for a period of ${ipSurvivalYears} years
        thereafter.
      </p>

      <h3 class="section">6. Non-Solicitation and Non-Circumvention</h3>
      <p class="clause"><span class="num">6.1</span>&nbsp; During the term of this agreement and for a period of ${nonSolicitationMonths} months after its completion or termination, the Trainer shall not directly or indirectly solicit, approach, contract with, or provide similar services to any client, institution, organization, or learner introduced through Calxmap without Calxmap's prior written consent.</p>
      <p class="clause"><span class="num">6.2</span>&nbsp; The Trainer shall not bypass or circumvent Calxmap by entering into any direct or indirect business relationship with any client, institution, or learner introduced through Calxmap for services similar to those covered under this agreement.</p>
      <p class="clause"><span class="num">6.3</span>&nbsp; This restriction shall not apply to clients or institutions with whom the Trainer had an existing professional relationship prior to their introduction by Calxmap, provided such relationship can be reasonably demonstrated.</p>
      <p class="clause"><span class="num">6.4</span>&nbsp; The Trainer acknowledges that any breach of this clause may cause irreparable harm to Calxmap, and Calxmap shall be entitled to seek appropriate legal remedies, including injunctive relief and recovery of damages, in accordance with applicable law.</p>

      <h3 class="section">7. Taxes and Statutory Compliance</h3>
      <p class="body">
        The Trainer shall be solely responsible for the payment of all applicable
        taxes, including but not limited to income tax, GST, and professional tax,
        arising out of the fees paid under this Letter. Calxmap shall deduct tax
        at source as required under the Income Tax Act, 1961, and shall issue a
        TDS certificate accordingly. The Trainer shall comply with all applicable
        laws and regulations and shall provide all required documentation,
        including PAN, bank details, and GST registration where applicable.
      </p>

      <h3 class="section">8. Termination</h3>
      <p class="body">
        Either party may terminate this engagement by providing not less than
        ${noticePeriodDays} days' written notice to the other party. Calxmap may
        terminate this engagement with immediate effect in the event of a material
        breach of these terms, misconduct, or any act that brings Calxmap or the
        Client into disrepute. Upon termination, fees shall be payable only for
        services actually rendered up to the date of termination.
      </p>

      <h3 class="section">9. Force Majeure</h3>
      <p class="body">
        Neither party shall be liable for any delay or failure to perform its
        obligations under this Letter to the extent that such delay or failure is
        caused by events beyond its reasonable control, including but not limited
        to acts of God, war, terrorism, epidemics, pandemics, governmental action,
        or failure of the internet or power supply. The affected party shall
        notify the other party promptly and shall resume performance as soon as
        reasonably practicable.
      </p>

      <h3 class="section">10. Governing Law and Jurisdiction</h3>
      <p class="body">
        This Letter shall be governed by and construed in accordance with the laws
        of India. The courts at ${jurisdictionCity}, ${jurisdictionState} shall
        have exclusive jurisdiction to entertain any disputes arising out of or in
        connection with this Letter.
      </p>

      <h3 class="section">11. Entire Agreement</h3>
      <p class="body">
        This Letter constitutes the entire agreement between the parties with
        respect to the subject matter hereof and supersedes all prior discussions,
        understandings, and agreements, whether written or oral. No amendment or
        variation shall be effective unless reduced to writing and signed by both
        parties.
      </p>

      <h3 class="section">12. Independent Contractor Status</h3>
      <p class="body">
        The Trainer is an independent contractor and not an employee, agent, or
        partner of Calxmap or the Client. Nothing in this Letter shall be
        construed to create an employer&ndash;employee relationship, and the
        Trainer shall not be entitled to any employee benefits, provident fund,
        gratuity, or other statutory benefits.
      </p>

      <h3 class="section">13. Code of Conduct</h3>
      <p class="body">
        The Trainer shall maintain the highest standards of professionalism,
        punctuality, and integrity during all sessions. The Trainer shall not
        engage in any conduct that is discriminatory, harassing, or otherwise
        inconsistent with the values of Calxmap and the Client. Any grievances
        raised by participants shall be addressed promptly and appropriately.
      </p>

      <h3 class="section">14. Attendance and Training Records</h3>
      <p class="body">
        The Trainer shall maintain accurate records of attendance, session logs,
        assessments, and any other documentation required by Calxmap. Such records
        shall be submitted to Calxmap within a reasonable time following each
        session and shall be made available to the Client upon request.
      </p>

      <h3 class="section">15. Training Schedule and Session Rescheduling</h3>
      <p class="body">
        The training schedule shall be agreed between the parties in advance. In
        the event a session is required to be rescheduled, the Trainer shall
        provide the Client with as much advance notice as practicable and shall
        make reasonable efforts to offer an alternate time. Repeated cancellations
        without reasonable cause may constitute a breach of this Letter.
      </p>

      <h3 class="section">16. Trainer Availability</h3>
      <p class="body">
        The Trainer confirms that they are available to deliver the Services as
        scheduled and shall remain responsive to reasonable coordination requests
        from Calxmap and the Client during the term of this engagement. Any
        anticipated unavailability shall be communicated to Calxmap in advance.
      </p>

      <h3 class="section">17. Use of Calxmap Name and Client Information</h3>
      <p class="body">
        The Trainer shall not use the name, logo, or branding of Calxmap or the
        Client for any purpose other than the delivery of the Services without
        prior written consent. The Trainer shall not communicate with the Client
        or its participants regarding this engagement outside the Calxmap
        platform, except as required for the delivery of the Services.
      </p>

      <h3 class="section">18. Notices</h3>
      <p class="body">
        All notices under this Letter shall be in writing and shall be delivered
        personally, by registered post, or by electronic mail to the addresses
        notified by each party. Notices shall be deemed received upon delivery if
        sent during business hours, or on the next business day if sent outside
        such hours.
      </p>

      <h3 class="section">19. Electronic Execution</h3>
      <p class="body">
        This Letter may be executed electronically, and a digital signature or
        electronic acknowledgment shall be valid and binding to the same extent as
        an original handwritten signature. A copy of this Letter transmitted by
        electronic means shall be treated as an original.
      </p>

      <div class="signature">
        <div class="sign-col">
          <h4>For Calxmap (HPRN Technology Pvt. Ltd.)</h4>
          <div class="sign-field">
            <div class="sign-line"></div>
            <div class="sign-label">Signature</div>
          </div>
          <div class="sign-field">
            <div class="sign-line"></div>
            <div class="sign-label">Name</div>
          </div>
          <div class="sign-field">
            <div class="sign-line"></div>
            <div class="sign-label">Designation</div>
          </div>
          <div class="sign-field">
            <div class="sign-line"></div>
            <div class="sign-label">Date</div>
          </div>
        </div>
        <div class="sign-col">
          <h4>For Trainer</h4>
          <div class="trainer-name">${expertName}</div>
          <div class="sign-field">
            <div class="sign-line"></div>
            <div class="sign-label">Signature</div>
          </div>
          <div class="sign-field">
            <div class="sign-line"></div>
            <div class="sign-label">Date</div>
          </div>
          <div class="digital-note">Digitally Signed</div>
        </div>
      </div>
    </div>

    <div class="footer">
      Calxmap (HPRN Technology Pvt. Ltd.) &bull; Gurugram &bull; www.calxmap.in
    </div>
  </body>
</html>`;
}

module.exports = {
  buildOfferLetterHtml,
  escapeHtml,
};
