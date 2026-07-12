const { RATE_INTENTS } = require('../../shared/compensation');

function parseRateIntent(value) {
  if (value == null || value === '') return null;
  const intent = String(value);
  return RATE_INTENTS.has(intent) ? intent : null;
}

function parsePositiveNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseRateActionBody(body = {}) {
  return {
    action: body.action ? String(body.action) : '',
    proposed_net_per_unit: parsePositiveNumber(body.proposed_net_per_unit),
    institution_counter_gross_per_unit: parsePositiveNumber(body.institution_counter_gross_per_unit),
    note: body.note != null && String(body.note).trim() !== '' ? String(body.note).trim() : null,
    approve_over_budget: body.approve_over_budget === true || body.approve_over_budget === 'true',
  };
}

function parseLockBody(body = {}) {
  return {
    approve_over_budget: body.approve_over_budget === true || body.approve_over_budget === 'true',
    note: body.note != null && String(body.note).trim() !== '' ? String(body.note).trim() : null,
  };
}

module.exports = {
  parseRateIntent,
  parsePositiveNumber,
  parseRateActionBody,
  parseLockBody,
};
