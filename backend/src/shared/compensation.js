/**
 * Shared compensation math (70% expert net / 30% platform of institution gross).
 */

const EXPERT_NET_SHARE = 0.7;
const PLATFORM_FEE_SHARE = 0.3;

const COMPENSATION_UNITS = new Set(['per_session', 'per_day', 'fixed_package', 'hourly']);
const RATE_INTENTS = new Set(['agreed_posted', 'open_to_negotiate']);
const RATE_STATUSES = new Set([
  'agreed_posted',
  'open_to_negotiate',
  'expert_proposed',
  'institution_countered',
  'expert_countered',
  'agreed',
]);

function toExpertNet(gross) {
  const n = Number(gross);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * EXPERT_NET_SHARE);
}

function toInstitutionGrossFromNet(net) {
  const n = Number(net);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n / EXPERT_NET_SHARE);
}

function toPlatformFee(gross) {
  const n = Number(gross);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * PLATFORM_FEE_SHARE);
}

function isRateAgreed(status) {
  return status === 'agreed_posted' || status === 'agreed';
}

function projectPostedRates(project) {
  const unit =
    project?.compensation_unit && COMPENSATION_UNITS.has(project.compensation_unit)
      ? project.compensation_unit
      : 'hourly';

  const quantity =
    Number(project?.unit_quantity) > 0
      ? Number(project.unit_quantity)
      : unit === 'hourly' && Number(project?.duration_hours) > 0
        ? Number(project.duration_hours)
        : 1;

  let grossPerUnit = Number(project?.institution_gross_per_unit);
  if (!(Number.isFinite(grossPerUnit) && grossPerUnit > 0)) {
    if (unit === 'fixed_package' && Number(project?.institution_gross_total) > 0) {
      grossPerUnit = Number(project.institution_gross_total);
    } else if (Number(project?.total_budget) > 0 && unit === 'fixed_package') {
      grossPerUnit = Number(project.total_budget);
    } else if (Number(project?.hourly_rate) > 0) {
      grossPerUnit = Number(project.hourly_rate);
    } else {
      grossPerUnit = 0;
    }
  }

  const netPerUnit = toExpertNet(grossPerUnit) || 0;
  const totalGross =
    unit === 'fixed_package'
      ? Number(project?.institution_gross_total) || Number(project?.total_budget) || grossPerUnit
      : grossPerUnit * quantity;

  return {
    unit,
    quantity,
    grossPerUnit,
    netPerUnit,
    totalGross,
    durationHours: Number(project?.duration_hours) > 0 ? Number(project.duration_hours) : null,
  };
}

function appendNegotiationHistory(existing, entry) {
  const list = Array.isArray(existing) ? existing.slice() : [];
  list.push({
    at: new Date().toISOString(),
    ...entry,
  });
  return list.slice(-40);
}

/** Legacy booking amount: prefer locked gross, then final hourly, proposed, project hourly. */
function resolveBookingAmount(application, project) {
  const finalGross = Number(application?.final_gross_per_unit);
  if (Number.isFinite(finalGross) && finalGross > 0) return finalGross;

  const finalHourly = Number(application?.final_hourly_rate);
  if (Number.isFinite(finalHourly) && finalHourly > 0) return finalHourly;

  const proposed = Number(application?.proposed_rate);
  if (Number.isFinite(proposed) && proposed > 0) return proposed;

  const posted = projectPostedRates(project);
  if (posted.grossPerUnit > 0) return posted.grossPerUnit;

  return null;
}

module.exports = {
  EXPERT_NET_SHARE,
  PLATFORM_FEE_SHARE,
  COMPENSATION_UNITS,
  RATE_INTENTS,
  RATE_STATUSES,
  toExpertNet,
  toInstitutionGrossFromNet,
  toPlatformFee,
  isRateAgreed,
  projectPostedRates,
  appendNegotiationHistory,
  resolveBookingAmount,
};
