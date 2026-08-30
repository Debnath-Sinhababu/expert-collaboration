function parseDeclineBody(body = {}) {
  const reason = body.reason != null ? String(body.reason).trim() : '';
  return { reason };
}

const SIGNATURE_NAME_MAX = 120;

/**
 * The expert types their full name and the date as an electronic signature (Clause 19)
 * before accepting. Date is normalised to YYYY-MM-DD; an invalid date is returned as null
 * so the service can reject it with a clear message.
 */
function parseAcceptBody(body = {}) {
  const signatureName = body.signature_name != null ? String(body.signature_name).trim() : '';
  const rawDate = body.signature_date != null ? String(body.signature_date).trim() : '';

  let signatureDate = null;
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      signatureDate = parsed.toISOString().slice(0, 10);
    }
  }

  return {
    signatureName: signatureName.slice(0, SIGNATURE_NAME_MAX),
    signatureDate,
    hasSignatureDateInput: Boolean(rawDate),
  };
}

module.exports = { parseDeclineBody, parseAcceptBody, SIGNATURE_NAME_MAX };
