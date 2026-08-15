function normalizeScreeningQuestionsBody(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
  }
  if (typeof value === 'string') {
    try {
      const j = JSON.parse(value);
      return Array.isArray(j) ? j.map((s) => String(s).trim()).filter(Boolean).slice(0, 20) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizePositiveInt(value, fallback = 1) {
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const PROJECT_COMPENSATION_UNITS = new Set(['per_session', 'per_day', 'per_month', 'fixed_package', 'hourly']);

function normalizeOptionalPositiveNumber(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeOptionalPositiveInt(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/** Normalize compensation fields on project create/update payloads. Mutates and returns body. */
function normalizeProjectCompensationFields(body) {
  if (!body || typeof body !== 'object') return body;

  if (body.compensation_unit !== undefined) {
    const unit = body.compensation_unit == null || body.compensation_unit === ''
      ? null
      : String(body.compensation_unit);
    body.compensation_unit = unit && PROJECT_COMPENSATION_UNITS.has(unit) ? unit : null;
  }

  if (body.unit_quantity !== undefined) {
    body.unit_quantity = normalizeOptionalPositiveInt(body.unit_quantity);
  }
  if (body.duration_per_unit !== undefined) {
    body.duration_per_unit = normalizeOptionalPositiveNumber(body.duration_per_unit);
  }
  if (body.hours_per_day !== undefined) {
    body.hours_per_day = normalizeOptionalPositiveNumber(body.hours_per_day);
  }
  if (body.institution_gross_per_unit !== undefined) {
    body.institution_gross_per_unit = normalizeOptionalPositiveNumber(body.institution_gross_per_unit);
  }
  if (body.institution_gross_total !== undefined) {
    body.institution_gross_total = normalizeOptionalPositiveNumber(body.institution_gross_total);
  }
  if (body.schedule_notes !== undefined) {
    body.schedule_notes =
      body.schedule_notes != null && String(body.schedule_notes).trim() !== ''
        ? String(body.schedule_notes).trim()
        : null;
  }
  if (body.other_description !== undefined) {
    body.other_description =
      body.other_description != null && String(body.other_description).trim() !== ''
        ? String(body.other_description).trim()
        : null;
  }
  if (body.hourly_rate !== undefined && body.hourly_rate !== '') {
    body.hourly_rate = Number(body.hourly_rate);
  }
  if (body.total_budget !== undefined && body.total_budget !== '') {
    body.total_budget = Number(body.total_budget);
  }
  if (body.duration_hours !== undefined && body.duration_hours !== '') {
    body.duration_hours = Number(body.duration_hours);
  }

  return body;
}

module.exports = {
  normalizeScreeningQuestionsBody,
  normalizePositiveInt,
  PROJECT_COMPENSATION_UNITS,
  normalizeOptionalPositiveNumber,
  normalizeOptionalPositiveInt,
  normalizeProjectCompensationFields,
};
