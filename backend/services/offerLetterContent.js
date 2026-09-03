/**
 * Single source of truth for the Trainer Engagement Letter wording.
 *
 * Both renderers consume this module so the HTML the expert reads in the preview dialog and the
 * PDF they sign can never drift apart:
 *   - offerLetterPdfService.js  -> the signed/unsigned PDF (pdfkit)
 *   - offerLetterTemplate.js    -> the in-app HTML preview
 *
 * Wording is transcribed from the master engagement letter; only the merge fields below vary
 * per engagement. Edit clause text here, never in the renderers.
 */

const COMPANY = {
  name: 'CALXMAP (HPRN Technology Pvt. Ltd.)',
  addressLines: ['485, Sushant Lok Phase – 1', 'Gurugram, Haryana – 122001'],
  cin: 'U85500HR2023PTC113353',
  footer: 'Calxmap (HPRN Technology Pvt. Ltd.)  •  Gurugram  •  www.calxmap.in',
};

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]}-${ONES[o]}` : TENS[t];
}

/** Indian numbering system (thousand / lakh / crore), used for the fee amount in words. */
function numberToIndianWords(value) {
  const n = Math.floor(Math.abs(Number(value) || 0));
  if (n === 0) return 'Zero';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;

  const parts = [];
  if (crore) parts.push(`${numberToIndianWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/** "INR 12,500 (Rupees Twelve Thousand Five Hundred Only)" */
function formatFeeWithWords(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const digits = `INR ${Math.round(n).toLocaleString('en-IN')}`;
  return `${digits} (Rupees ${numberToIndianWords(n)} Only)`;
}

/** "30th Aug, 2026" — the letterhead reference date format. */
function formatLetterDate(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st'
    : day % 10 === 2 && day !== 12 ? 'nd'
      : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  const month = d.toLocaleDateString('en-IN', { month: 'short' });
  return `${day}${suffix} ${month}, ${d.getFullYear()}`;
}

/** "30 August 2026" — the format used inside Program Details. */
function formatLongDate(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function orDash(value) {
  return value == null || value === '' ? '—' : String(value);
}

/** Spells a term length as "seven (7)" so clause wording matches the master letter. */
function spellCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const word = numberToIndianWords(n).toLowerCase();
  return `${word} (${n})`;
}

/** Supported payment-term variants — admin selects one before sending the offer letter. */
const PAYMENT_TERMS = {
  FIFTY_FIFTY: 'fifty_fifty',
  FULL_ADVANCE: 'full_advance',
  MONTHLY: 'monthly',
  FULL_AFTER_PROGRAM: 'full_after_program',
};

const DEFAULT_PAYMENT_TERM = PAYMENT_TERMS.FIFTY_FIFTY;

const VALID_PAYMENT_TERMS = new Set(Object.values(PAYMENT_TERMS));

function normalizePaymentTerm(value) {
  const v = value != null ? String(value).trim() : '';
  return VALID_PAYMENT_TERMS.has(v) ? v : DEFAULT_PAYMENT_TERM;
}

/** Calendar months spanned by the engagement (inclusive), for monthly instalment wording. */
function engagementMonthCount(startDate, endDate) {
  const s = startDate ? new Date(startDate) : null;
  const e = endDate ? new Date(endDate) : null;
  if (!s || !e || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return null;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  return Math.max(1, months);
}

function tdsClause() {
  return {
    text: 'Calxmap shall deduct Tax Deducted at Source (TDS), wherever applicable, in accordance with the provisions of the Income Tax Act, 1961, and shall provide the applicable TDS certificate to the Trainer as required by law.',
  };
}

function gstClause() {
  return {
    text: 'Goods and Services Tax (GST), if applicable and legally chargeable by the Trainer, shall be payable in addition to the professional fee upon submission of a valid GST invoice in compliance with the applicable provisions of the GST laws.',
  };
}

function paymentTimelineClause(paymentDays, paymentTerm) {
  if (paymentTerm === PAYMENT_TERMS.FULL_ADVANCE) {
    return {
      text: `The advance payment shall be processed within ${paymentDays} working days of the Trainer's acceptance of this Engagement Letter and receipt of any required onboarding documentation, and in any event prior to the commencement of the training program.`,
    };
  }
  if (paymentTerm === PAYMENT_TERMS.MONTHLY) {
    return {
      text: `Each monthly instalment shall be processed within ${paymentDays} working days from the end of the relevant calendar month, upon submission of attendance records and supporting documents for the sessions delivered in that month.`,
    };
  }
  if (paymentTerm === PAYMENT_TERMS.FULL_AFTER_PROGRAM) {
    return {
      text: `The full professional fee shall be processed within ${paymentDays} working days from the date of successful completion of the entire training program and submission of all required documentation.`,
    };
  }
  return {
    text: `Payments shall be processed within ${paymentDays} working days from the date of achieving the respective milestone and submission of any required documentation.`,
  };
}

/** Assigns clause numbers 3.1, 3.2, … in order. */
function numberedFeeClauses(clauses) {
  return clauses.map((clause, index) => ({
    type: 'clause',
    no: `3.${index + 1}`,
    text: clause.text,
  }));
}

/**
 * Builds Section 3 sub-clauses for the selected payment term.
 * All variants share 3.1 (total fee) and end with TDS + GST.
 */
function buildFeeClauses(data) {
  const courseTitle = orDash(data.courseTitle);
  const paymentDays = spellCount(data.paymentDays);
  const paymentTerm = normalizePaymentTerm(data.paymentTerm);
  const totalFeeText = formatFeeWithWords(data.totalFee);

  const totalFeeClause = {
    text: `In consideration of the services rendered under this Engagement Letter, Calxmap shall pay the Trainer a professional fee of ${totalFeeText} for the successful delivery and completion of the ${courseTitle} training program described herein.`,
  };

  const clauses = [totalFeeClause];

  if (paymentTerm === PAYMENT_TERMS.FIFTY_FIFTY) {
    const m1Pct = spellCount(data.milestone1Percent ?? 50);
    const m2Pct = spellCount(data.milestone2Percent ?? 50);
    clauses.push({
      text: `An amount equal to ${m1Pct} percent of the total fee, amounting to ${formatFeeWithWords(data.milestone1Amount)}, shall be released upon completion of the first delivery milestone, subject to satisfactory performance and submission of attendance records and supporting documents.`,
    });
    clauses.push({
      text: `The remaining ${m2Pct} percent of the fee, amounting to ${formatFeeWithWords(data.milestone2Amount)}, shall be released upon successful completion of the entire program and fulfilment of all associated responsibilities.`,
    });
  } else if (paymentTerm === PAYMENT_TERMS.FULL_ADVANCE) {
    clauses.push({
      text: `The entire professional fee of ${totalFeeText} shall be released in full in advance upon the Trainer's acceptance of this Engagement Letter and prior to the commencement of the training program, subject to satisfactory verification of the Trainer's credentials, submission of any required onboarding documentation, and compliance with Calxmap's engagement requirements.`,
    });
    clauses.push({
      text: "The Trainer acknowledges that the advance payment is made in consideration of the Trainer's commitment to deliver the full program as scheduled and to comply with all obligations under this Engagement Letter. In the event of termination due to the Trainer's material breach, misconduct, or failure to deliver agreed sessions without valid cause, Calxmap may recover or adjust any advance amount attributable to undelivered or unsatisfactorily completed services in accordance with Clause 8 (Termination).",
    });
  } else if (paymentTerm === PAYMENT_TERMS.MONTHLY) {
    const months = engagementMonthCount(data.startDate, data.endDate);
    const total = Number(data.totalFee);
    const monthlyAmount = months && Number.isFinite(total) && total > 0
      ? Math.round(total / months)
      : null;
    const instalmentDetail = monthlyAmount
      ? ` Each monthly instalment shall approximate ${formatFeeWithWords(monthlyAmount)}, based on the estimated duration of the program.`
      : '';
    clauses.push({
      text: `The professional fee shall be paid in equal monthly instalments during the term of this engagement. Each instalment shall represent the fee attributable to the training sessions successfully delivered and completed in the preceding calendar month, subject to satisfactory performance and submission of attendance records, session reports, and supporting documents for such sessions.${instalmentDetail}`,
    });
    clauses.push({
      text: 'A final instalment for any remaining sessions not covered by prior monthly payments shall be released upon successful completion of the entire program and fulfilment of all associated responsibilities, including submission of all required documentation.',
    });
  } else if (paymentTerm === PAYMENT_TERMS.FULL_AFTER_PROGRAM) {
    clauses.push({
      text: `The entire professional fee of ${totalFeeText} shall be released in a single payment upon successful delivery and completion of the entire training program and fulfilment of all associated responsibilities, including submission of attendance records, session reports, assessments, and any other documentation required by Calxmap or the Client.`,
    });
    clauses.push({
      text: 'The Trainer acknowledges that no professional fee shall be processed until the complete program has been satisfactorily delivered and all prescribed documentation has been received and accepted by Calxmap.',
    });
  }

  clauses.push(paymentTimelineClause(paymentDays, paymentTerm));
  clauses.push(tdsClause());
  clauses.push(gstClause());

  return numberedFeeClauses(clauses);
}

/**
 * Builds the full letter as structured blocks.
 *
 * Block types: `p` (paragraph), `clause` (numbered sub-clause), `sub` (sub-heading),
 * `bullets` (label/value list).
 */
function buildOfferLetterModel(data) {
  data = data || {};

  const trainerName = data.signature?.name || data.expertName;
  const courseTitle = orDash(data.courseTitle);
  const paymentDays = spellCount(data.paymentDays);
  const noticeDays = spellCount(data.noticePeriodDays);
  const survivalYears = spellCount(data.ipSurvivalYears);
  const nonSolicitMonths = spellCount(data.nonSolicitationMonths);
  const forceMajeureDays = spellCount(data.forceMajeureDays);
  const disputeDays = spellCount(data.disputeResolutionDays);
  const rescheduleHours = spellCount(data.rescheduleNoticeHours);
  const jurisdiction = `${orDash(data.jurisdictionCity)}, ${orDash(data.jurisdictionState)}, India`;

  const feeClauses = buildFeeClauses(data);

  return {
    company: COMPANY,
    documentTitle: (data.documentTitle || 'TRAINER ENGAGEMENT LETTER').toUpperCase(),
    referenceNo: orDash(data.referenceNo),
    letterDate: formatLetterDate(data.letterDate),

    addressee: {
      salutation: 'Mr./Ms.',
      name: orDash(trainerName),
      address: data.expertAddress || '',
    },

    intro: [
      'Calxmap (HPRN Technology Pvt. Ltd.) is pleased to engage you as an Industry Expert / Trainer for the delivery of academic, professional, and industry-oriented training programs for its clients, including educational institutions, universities, corporate organizations, and other partner institutions.',
      'This Engagement Letter is offered in recognition of your academic qualifications, subject-matter expertise, professional experience, and teaching capabilities. It outlines the terms and conditions governing your engagement with Calxmap, including the scope of services, professional responsibilities, commercial terms, confidentiality obligations, intellectual property rights, and other mutual obligations.',
      'By accepting this Engagement Letter, you acknowledge that you have read, understood, and agreed to be bound by its terms and conditions throughout the duration of your engagement with Calxmap.',
    ],

    sections: [
      {
        no: 1,
        title: 'Scope of Engagement',
        blocks: [
          { type: 'p', text: 'Calxmap hereby engages the Trainer to deliver academic and professional training services for the program specified in this Engagement Letter. The Trainer shall deliver training sessions, workshops, mentoring, practical demonstrations, assessments, evaluations, doubt-clearing sessions, and any other academic support services required for the successful execution of the training program in accordance with the curriculum, session plan, learning objectives, and quality standards communicated by Calxmap or its Client.' },
          { type: 'p', text: 'The training may be delivered in Offline, Classroom, Hybrid, or Client Premises mode, depending on the operational requirements of Calxmap and the Client. The Trainer shall comply with the approved training schedule, session timings, and delivery guidelines communicated from time to time.' },
          { type: 'p', text: 'The Trainer agrees to perform the services with due skill, care, diligence, professionalism, and integrity, and shall use best efforts to ensure effective knowledge transfer, learner engagement, and successful completion of the training program. The Trainer shall comply with all applicable policies, academic standards, and instructions issued by Calxmap and the Client during the term of this engagement.' },
        ],
      },
      {
        no: 2,
        title: 'Program Details',
        blocks: [
          {
            type: 'bullets',
            items: [
              ['Course Title', orDash(data.courseTitle)],
              ['Training Mode', orDash(data.trainingMode)],
              ...(Array.isArray(data.programDetailBullets) && data.programDetailBullets.length
                ? data.programDetailBullets
                : [
                  ...(data.totalSessions != null && data.totalSessions !== ''
                    ? [['Total Sessions', orDash(data.totalSessions)]]
                    : []),
                  ['Training Duration', orDash(data.trainingDuration)],
                ]),
              ['Start Date', formatLongDate(data.startDate)],
              ...(data.endDate ? [['End Date', formatLongDate(data.endDate)]] : []),
            ],
          },
        ],
      },
      {
        no: 3,
        title: 'Professional Fees and Payment Terms',
        blocks: feeClauses,
      },
      {
        no: 4,
        title: 'Roles and Responsibilities',
        blocks: [
          { type: 'p', text: 'The Trainer shall diligently perform all duties assigned under this engagement and shall deliver the training program in accordance with the curriculum, schedule, and quality standards communicated by Calxmap. The Trainer shall maintain punctuality, professionalism, and a high standard of teaching throughout the engagement.' },
          { type: 'p', text: 'The Trainer shall be responsible for maintaining accurate attendance records, conducting assessments, submitting session reports and any other required documentation within the prescribed timelines. The Trainer shall actively coordinate with Calxmap and the client institution regarding training schedules, learner progress, and any issues affecting program delivery.' },
          { type: 'p', text: 'The Trainer shall comply with all applicable policies, guidelines, and code of conduct of Calxmap and the client institution, maintain the confidentiality of all information obtained during the engagement, and immediately notify Calxmap of any circumstance that may impact the successful delivery of the training program.' },
        ],
      },
      {
        no: 5,
        title: 'Confidentiality and Intellectual Property',
        blocks: [
          { type: 'sub', no: '5.1', title: 'Confidentiality' },
          { type: 'p', text: 'The Trainer acknowledges that, during the course of this engagement, he/she may have access to confidential, proprietary, academic, commercial, financial, technical, and business information belonging to Calxmap, its clients, partner institutions, and learners, including but not limited to course materials, curricula, pricing, learner records, assessments, reports, business processes, software, training methodologies, and other confidential information. The Trainer shall maintain the strict confidentiality of such information and shall not disclose, reproduce, distribute, or use it for any purpose other than the performance of services under this Engagement Letter without the prior written consent of Calxmap.' },
          { type: 'sub', no: '5.2', title: 'Intellectual Property' },
          { type: 'p', text: 'All course content, presentations, assessments, reports, recordings, documentation, templates, and other materials specifically developed or customized by the Trainer for Calxmap or its clients during this engagement shall remain the exclusive property of Calxmap unless otherwise agreed in writing. Any intellectual property, methodologies, course materials, presentations, templates, software, or proprietary content developed or owned by the Trainer prior to this engagement shall remain the Trainer\u2019s exclusive property.' },
          { type: 'sub', no: '5.3', title: 'Recording and AI Usage' },
          { type: 'p', text: 'The Trainer shall not record, reproduce, distribute, publish, or share any training session, classroom activity, or confidential information without the prior written approval of Calxmap. The Trainer shall also not use any learner data, client information, recordings, assessments, training materials, or confidential information for training, testing, or improving any Artificial Intelligence (AI), Machine Learning (ML), Generative AI, Large Language Models (LLMs), or similar technologies without the prior written consent of Calxmap.' },
          { type: 'sub', no: '5.4', title: 'Return of Confidential Information' },
          { type: 'p', text: 'Upon completion or termination of this engagement, or upon the written request of Calxmap, the Trainer shall promptly return or permanently delete all confidential information, documents, learner records, training materials, and other proprietary information belonging to Calxmap or its clients.' },
          { type: 'sub', no: '5.5', title: 'Survival' },
          { type: 'p', text: `The obligations contained in this Clause shall survive the completion, expiration, or termination of this Engagement Letter and shall remain binding upon the Trainer for a period of ${survivalYears} years from the date of termination or for such longer period as may be required under applicable law.` },
        ],
      },
      {
        no: 6,
        title: 'Non-Solicitation and Non-Circumvention',
        blocks: [
          { type: 'clause', no: '6.1', text: `During the term of this Agreement and for a period of ${nonSolicitMonths} months after its completion or termination, the Trainer shall not, directly or indirectly, solicit, approach, contract with, or provide similar services to any client, institution, organization, or learner introduced through Calxmap without the prior written consent of Calxmap.` },
          { type: 'clause', no: '6.2', text: 'The Trainer shall not bypass or circumvent Calxmap by entering into any direct or indirect business relationship with any client, institution, or learner introduced through Calxmap for services similar to those covered under this Agreement.' },
          { type: 'clause', no: '6.3', text: 'This restriction shall not apply to clients or institutions with whom the Trainer had an existing professional relationship prior to their introduction by Calxmap, provided such relationship can be reasonably demonstrated.' },
          { type: 'clause', no: '6.4', text: 'The Trainer acknowledges that any breach of this Clause may cause irreparable harm to Calxmap, and Calxmap shall be entitled to seek appropriate legal remedies, including injunctive relief and recovery of damages, in accordance with applicable law.' },
        ],
      },
      {
        no: 7,
        title: 'Taxes and Statutory Compliance',
        blocks: [
          { type: 'p', text: 'The Trainer shall be solely responsible for the payment of all applicable taxes, including Income Tax, Goods and Services Tax (GST), Professional Tax, or any other statutory dues arising from the professional fees received under this Agreement. Calxmap shall deduct Tax Deducted at Source (TDS), wherever applicable, in accordance with the provisions of the Income Tax Act, 1961, and shall issue the applicable TDS certificate to the Trainer.' },
          { type: 'p', text: 'Nothing contained in this Agreement shall be construed as creating an employer-employee, partnership, joint venture, or agency relationship between Calxmap and the Trainer. The Trainer shall act solely as an independent professional engaged for the purpose of providing training services under this Agreement.' },
        ],
      },
      {
        no: 8,
        title: 'Termination',
        blocks: [
          { type: 'p', text: `Either party may terminate this Agreement by providing ${noticeDays} days\u2019 prior written notice to the other party.` },
          { type: 'p', text: 'Calxmap reserves the right to terminate this Agreement with immediate effect in the event of a material breach of this Agreement, professional misconduct, fraud, misrepresentation, violation of applicable laws or institutional policies, unsatisfactory performance, repeated absence or delay in training delivery, or any act that causes or is likely to cause reputational or financial harm to Calxmap or its clients.' },
          { type: 'p', text: 'In the event of termination by the Trainer without a valid reason or due to the Trainer\u2019s breach of this Agreement, Calxmap may withhold payment for the incomplete engagement. Where the Agreement is terminated by Calxmap for reasons not attributable to the Trainer\u2019s misconduct or breach, the Trainer shall be entitled to payment for the training sessions satisfactorily completed up to the effective date of termination, subject to submission of all required attendance records, reports, supporting documents, and receipt of payment from the Client by Calxmap.' },
        ],
      },
      {
        no: 9,
        title: 'Force Majeure',
        blocks: [
          { type: 'clause', no: '9.1', text: 'Neither party shall be liable for any delay or failure in the performance of its obligations under this Agreement if such delay or failure arises from events beyond its reasonable control, including but not limited to acts of God, natural disasters, floods, earthquakes, pandemics, epidemics, governmental actions, war, terrorism, civil unrest, labor disputes, strikes, lockouts, power failures, or interruptions in transportation or communication infrastructure.' },
          { type: 'clause', no: '9.2', text: 'The party affected by a Force Majeure event shall promptly notify the other party in writing, providing reasonable details of the event and its expected impact on the performance of its obligations. The affected party shall use all reasonable efforts to mitigate the effects of the Force Majeure event and resume performance as soon as reasonably practicable.' },
          { type: 'clause', no: '9.3', text: `If the Force Majeure event continues for a period exceeding ${forceMajeureDays} consecutive days and materially prevents the performance of the training program, either party may terminate this Agreement by providing written notice to the other party. In such event, neither party shall have any further liability except for obligations that accrued prior to the occurrence of the Force Majeure event.` },
        ],
      },
      {
        no: 10,
        title: 'Governing Law and Jurisdiction',
        blocks: [
          { type: 'p', text: 'This Agreement shall be governed by and construed in accordance with the laws of the Republic of India. The parties shall use their best efforts to resolve any dispute, controversy, or claim arising out of or in connection with this Agreement through mutual discussions and good-faith negotiations.' },
          { type: 'p', text: `If the dispute is not resolved amicably within ${disputeDays} days from the date of written notice by either party, it shall be subject to the exclusive jurisdiction of the competent courts at ${jurisdiction}, and the parties hereby irrevocably submit to the jurisdiction of such courts.` },
        ],
      },
      {
        no: 11,
        title: 'Entire Agreement',
        blocks: [
          { type: 'p', text: 'This Engagement Letter, together with any schedules, appendices, or written amendments duly executed by both parties, constitutes the entire agreement between Calxmap and the Trainer with respect to the subject matter hereof and supersedes all prior discussions, negotiations, understandings, representations, proposals, and communications, whether oral or written.' },
          { type: 'p', text: 'No amendment, modification, waiver, or variation of any provision of this Engagement Letter shall be valid or binding unless it is made in writing and duly signed by the authorized representatives of both parties.' },
          { type: 'p', text: 'If any provision of this Engagement Letter is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect to the fullest extent permitted under applicable law.' },
        ],
      },
      {
        no: 12,
        title: 'Independent Contractor Status',
        blocks: [
          { type: 'p', text: 'The Trainer is engaged by Calxmap as an independent professional consultant solely for the purpose of providing training services under this Agreement. Nothing contained herein shall be construed as creating an employer-employee, partnership, joint venture, or agency relationship between the parties.' },
          { type: 'p', text: 'Accordingly, the Trainer shall not be entitled to any employee benefits, including but not limited to Provident Fund (PF), Gratuity, Paid Leave, Bonus, Medical Insurance, Employee State Insurance (ESI), or any other employment-related benefits. The Trainer shall be solely responsible for managing his/her professional obligations and statutory compliances arising from this engagement.' },
        ],
      },
      {
        no: 13,
        title: 'Code of Conduct',
        blocks: [
          { type: 'p', text: 'The Trainer shall conduct all training sessions with the highest standards of professionalism, integrity, and ethical conduct. The Trainer shall treat all learners, faculty members, client representatives, and Calxmap personnel with respect and dignity, and shall comply with the policies, code of conduct, and academic regulations of Calxmap and the client institution.' },
          { type: 'p', text: 'The Trainer shall maintain punctuality, appropriate professional behavior, and a positive learning environment, and shall refrain from any form of discrimination, harassment, abusive conduct, or any act that may adversely affect the reputation, goodwill, or business interests of Calxmap or its clients. Any material violation of this Clause may result in immediate termination of this Agreement.' },
        ],
      },
      {
        no: 14,
        title: 'Attendance and Training Records',
        blocks: [
          { type: 'p', text: 'The Trainer shall maintain accurate attendance records for each training session and submit attendance sheets, session reports, assessments, and any other documentation required by Calxmap or the Client within the prescribed timelines. The Trainer acknowledges that timely submission of such documents is a prerequisite for processing the professional fee.' },
        ],
      },
      {
        no: 15,
        title: 'Training Schedule and Session Rescheduling',
        blocks: [
          { type: 'p', text: `The Trainer shall adhere to the training schedule communicated by Calxmap or the Client. Any request for cancellation or rescheduling of a scheduled session shall be communicated to Calxmap in writing at least ${rescheduleHours} hours in advance, except in cases of emergency. Any change in schedule shall be subject to the prior approval of Calxmap and the Client.` },
        ],
      },
      {
        no: 16,
        title: 'Trainer Availability',
        blocks: [
          { type: 'p', text: 'The Trainer shall remain available during the agreed training period and shall make reasonable efforts to complete the assigned training program as scheduled. If the Trainer is unable to conduct any scheduled session due to illness, emergency, or any unforeseen circumstance, the Trainer shall immediately notify Calxmap. Calxmap reserves the right to appoint a replacement trainer or make alternate arrangements to ensure continuity of the training program.' },
        ],
      },
      {
        no: 17,
        title: 'Use of Calxmap Name and Client Information',
        blocks: [
          { type: 'p', text: 'The Trainer shall not use the name, logo, trademarks, branding, training materials, or confidential information of Calxmap or its clients for marketing, advertising, social media, or any other commercial purpose without obtaining prior written approval from Calxmap.' },
        ],
      },
      {
        no: 18,
        title: 'Notices',
        blocks: [
          { type: 'p', text: 'Any notice or communication required under this Agreement shall be made in writing and delivered by hand, courier, registered post, or email to the addresses communicated by the respective parties. Any change in address or contact details shall be promptly notified in writing.' },
        ],
      },
      {
        no: 19,
        title: 'Electronic Execution',
        blocks: [
          { type: 'p', text: 'This Engagement Letter may be executed in physical or electronic form. Electronic signatures and scanned copies of signed documents shall have the same legal validity and enforceability as original handwritten signatures, in accordance with the provisions of the Information Technology Act, 2000, and other applicable laws.' },
        ],
      },
    ],

    acceptance: {
      title: 'Acceptance',
      text: 'By signing this Engagement Letter, both parties acknowledge that they have carefully read, understood, and voluntarily accepted the terms and conditions set forth herein. The parties further agree to perform their respective obligations in accordance with this Engagement Letter and confirm that this document constitutes a legally binding agreement between Calxmap (HPRN Technology Pvt. Ltd.) and the Trainer from the date of execution.',
    },

    signature: {
      companyHeading: 'For Calxmap (HPRN Technology Pvt. Ltd.)',
      companyLines: ['Signature', 'Name', 'Designation'],
      trainerHeading: 'For Trainer',
      trainerLines: ['Signature', 'Date'],
      typed: data.signature || null,
    },
  };
}

module.exports = {
  COMPANY,
  PAYMENT_TERMS,
  DEFAULT_PAYMENT_TERM,
  VALID_PAYMENT_TERMS,
  normalizePaymentTerm,
  buildOfferLetterModel,
  buildFeeClauses,
  numberToIndianWords,
  formatFeeWithWords,
  formatLetterDate,
  formatLongDate,
  spellCount,
};
