const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function normalizePan(value) {
  if (value == null) return null;
  const s = String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s === '' ? null : s;
}

function isValidPan(pan) {
  return typeof pan === 'string' && PAN_REGEX.test(pan);
}

module.exports = {
  PAN_REGEX,
  normalizePan,
  isValidPan,
};
