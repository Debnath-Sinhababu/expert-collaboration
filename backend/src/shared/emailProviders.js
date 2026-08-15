const COMMON_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'live.com',
  'msn.com',
  'protonmail.com',
  'gmx.com',
  'zoho.com',
  'mail.com',
  'yandex.com',
];

function isCommonEmailProvider(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return false;
  const domain = normalized.split('@').pop();
  return !!domain && COMMON_EMAIL_DOMAINS.some(
    (common) => domain === common || domain.endsWith(`.${common}`),
  );
}

module.exports = {
  isCommonEmailProvider,
  COMMON_EMAIL_DOMAINS,
};
