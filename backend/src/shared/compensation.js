/**
 * Shared compensation math. Expert net / platform fee split is per-project,
 * driven by projects.margin_percent (set by super-admin on approval).
 * EXPERT_NET_SHARE/PLATFORM_FEE_SHARE are only the legacy fallback for rows
 * without a margin set.
 */

const EXPERT_NET_SHARE = 0.7;
const PLATFORM_FEE_SHARE = 0.3;

const COMPENSATION_UNITS = new Set(['per_session', 'per_day', 'per_month', 'fixed_package', 'hourly']);
const RATE_INTENTS = new Set(['agreed_posted', 'open_to_negotiate']);
const RATE_STATUSES = new Set([
  'agreed_posted',
  'open_to_negotiate',
  'expert_proposed',
  'institution_countered',
  'expert_countered',
  'agreed',
  'posted_rate_offered',
  'posted_rate_declined',
]);

/**
 * Resolve the expert's share (0-1) of a project's gross budget.
 * Per-project margin set by super-admin during approval takes priority;
 * EXPERT_NET_SHARE is only a defensive fallback for rows without one.
 */
function resolveExpertShare(project) {
  const marginPercent = Number(project?.margin_percent);
  if (Number.isFinite(marginPercent) && marginPercent >= 0 && marginPercent <= 100) {
    return (100 - marginPercent) / 100;
  }
  return EXPERT_NET_SHARE;
}

function toExpertNet(gross, expertShare = EXPERT_NET_SHARE) {
  const n = Number(gross);
  if (!Number.isFinite(n) || n <= 0) return null;
  const share = Number.isFinite(expertShare) ? expertShare : EXPERT_NET_SHARE;
  return Math.round(n * share);
}

function toInstitutionGrossFromNet(net, expertShare = EXPERT_NET_SHARE) {
  const n = Number(net);
  if (!Number.isFinite(n) || n <= 0) return null;
  const share = Number.isFinite(expertShare) && expertShare > 0 ? expertShare : EXPERT_NET_SHARE;
  return Math.round(n / share);
}

function toPlatformFee(gross, expertShare = EXPERT_NET_SHARE) {
  const n = Number(gross);
  if (!Number.isFinite(n) || n <= 0) return null;
  const share = Number.isFinite(expertShare) ? expertShare : EXPERT_NET_SHARE;
  return Math.round(n * (1 - share));
}

function isRateAgreed(status) {
  return status === 'agreed_posted' || status === 'agreed';
}

function isPostedRateOfferPending(status) {
  return status === 'posted_rate_offered';
}

function isPostedRateDeclined(status) {
  return status === 'posted_rate_declined';
}

/** Negotiation inputs closed (offer pending, declined, or already agreed). */
function isRateNegotiationClosed(status) {
  return (
    isRateAgreed(status) ||
    isPostedRateOfferPending(status) ||
    isPostedRateDeclined(status)
  );
}

function projectPostedRates(project) {
  const unit =
    project?.compensation_unit && COMPENSATION_UNITS.has(project.compensation_unit)
      ? project.compensation_unit
      : 'hourly';

  let quantity =
    Number(project?.unit_quantity) > 0
      ? Number(project.unit_quantity)
      : unit === 'hourly' && Number(project?.duration_hours) > 0
        ? Number(project.duration_hours)
        : 1;

  let durationPerUnit = Number(project?.duration_per_unit);
  let grossPerUnit = Number(project?.institution_gross_per_unit);
  const packageTotal =
    Number(project?.institution_gross_total) > 0
      ? Number(project.institution_gross_total)
      : Number(project?.total_budget) > 0
        ? Number(project.total_budget)
        : 0;
  const hoursPerDay = Number(project?.hours_per_day);
  const isUnitPay = unit === 'per_day' || unit === 'per_session' || unit === 'per_month';

  // Repair older bad saves: qty=1, duration_per_unit=day count, gross=full budget.
  if (
    isUnitPay &&
    quantity === 1 &&
    durationPerUnit > 1 &&
    packageTotal > 0 &&
    Number.isFinite(grossPerUnit) &&
    grossPerUnit > 0 &&
    Math.abs(grossPerUnit - packageTotal) / packageTotal < 0.01
  ) {
    quantity = durationPerUnit;
    grossPerUnit = Math.round((packageTotal / quantity) * 100) / 100;
    durationPerUnit = hoursPerDay > 0 ? hoursPerDay : 1;
  }

  if (!(Number.isFinite(grossPerUnit) && grossPerUnit > 0)) {
    if (unit === 'fixed_package' && packageTotal > 0) {
      grossPerUnit = packageTotal;
    } else if (isUnitPay && packageTotal > 0 && quantity > 0) {
      grossPerUnit = Math.round((packageTotal / quantity) * 100) / 100;
    } else if (Number(project?.hourly_rate) > 0) {
      grossPerUnit = Number(project.hourly_rate);
    } else {
      grossPerUnit = 0;
    }
  }

  const netPerUnit = toExpertNet(grossPerUnit, resolveExpertShare(project)) || 0;
  // Prefer the stored total budget over quantity * rounded-per-unit-rate, which can
  // drift by a few rupees from rounding (e.g. Rs.100000 / 7 days -> Rs.14285.71/day -> x7 = Rs.99999.97).
  const totalGross =
    unit === 'fixed_package'
      ? packageTotal || grossPerUnit
      : packageTotal > 0
        ? packageTotal
        : grossPerUnit * quantity;

  const durationHours =
    isUnitPay && quantity > 0 && (hoursPerDay > 0 || durationPerUnit > 0)
      ? quantity * (hoursPerDay > 0 ? hoursPerDay : durationPerUnit)
      : Number(project?.duration_hours) > 0
        ? Number(project.duration_hours)
        : unit === 'hourly' && quantity > 0
          ? quantity
          : null;

  return {
    unit,
    quantity,
    grossPerUnit,
    netPerUnit,
    totalGross,
    durationHours,
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

/** Resolve locked settlement rates for a booking (never expert profile hourly_rate). */
function resolveSettlementRates(booking) {
  const project = booking?.projects || booking?.project || {};
  const application = booking?.applications || booking?.application || {};

  let unit =
    (booking?.compensation_unit && COMPENSATION_UNITS.has(booking.compensation_unit)
      ? booking.compensation_unit
      : null) ||
    (application?.compensation_unit && COMPENSATION_UNITS.has(application.compensation_unit)
      ? application.compensation_unit
      : null) ||
    (project?.compensation_unit && COMPENSATION_UNITS.has(project.compensation_unit)
      ? project.compensation_unit
      : null) ||
    'hourly';

  let grossPerUnit = Number(booking?.final_gross_per_unit);
  let netPerUnit = Number(booking?.final_net_per_unit);

  if (!(Number.isFinite(grossPerUnit) && grossPerUnit > 0)) {
    grossPerUnit = Number(application?.final_gross_per_unit);
  }
  if (!(Number.isFinite(netPerUnit) && netPerUnit > 0)) {
    netPerUnit = Number(application?.final_net_per_unit);
  }

  // booking.amount historically stores locked institution gross per unit
  if (!(Number.isFinite(grossPerUnit) && grossPerUnit > 0)) {
    const amount = Number(booking?.amount);
    if (Number.isFinite(amount) && amount > 0) grossPerUnit = amount;
  }

  if (!(Number.isFinite(grossPerUnit) && grossPerUnit > 0)) {
    const legacyHourly = Number(booking?.final_hourly_rate || application?.final_hourly_rate);
    if (Number.isFinite(legacyHourly) && legacyHourly > 0) {
      grossPerUnit = legacyHourly;
      unit = 'hourly';
    }
  }

  if (!(Number.isFinite(grossPerUnit) && grossPerUnit > 0)) {
    const posted = projectPostedRates(project);
    if (posted.grossPerUnit > 0) {
      grossPerUnit = posted.grossPerUnit;
      unit = posted.unit;
      if (!(Number.isFinite(netPerUnit) && netPerUnit > 0)) {
        netPerUnit = posted.netPerUnit;
      }
    }
  }

  if (!(Number.isFinite(netPerUnit) && netPerUnit > 0) && Number.isFinite(grossPerUnit) && grossPerUnit > 0) {
    netPerUnit = toExpertNet(grossPerUnit, resolveExpertShare(project));
  }

  return {
    unit,
    unitShort:
      unit === 'per_session'
        ? 'session'
        : unit === 'per_day'
          ? 'day'
          : unit === 'per_month'
            ? 'month'
            : unit === 'fixed_package'
              ? 'package'
              : 'hour',
    grossPerUnit: Number.isFinite(grossPerUnit) && grossPerUnit > 0 ? grossPerUnit : 0,
    netPerUnit: Number.isFinite(netPerUnit) && netPerUnit > 0 ? netPerUnit : 0,
  };
}

/** Booking statuses that count as active work for dashboards / running stats. */
const ACTIVE_BOOKING_STATUSES_FOR_STATS = [
  'confirmed',
  'in_progress',
  'completion_requested',
  'cancellation_requested',
];

function isActiveBookingStatus(status) {
  return ACTIVE_BOOKING_STATUSES_FOR_STATS.includes(String(status || '').toLowerCase());
}

module.exports = {
  EXPERT_NET_SHARE,
  PLATFORM_FEE_SHARE,
  COMPENSATION_UNITS,
  RATE_INTENTS,
  RATE_STATUSES,
  ACTIVE_BOOKING_STATUSES_FOR_STATS,
  resolveExpertShare,
  toExpertNet,
  toInstitutionGrossFromNet,
  toPlatformFee,
  isRateAgreed,
  isPostedRateOfferPending,
  isPostedRateDeclined,
  isRateNegotiationClosed,
  isActiveBookingStatus,
  projectPostedRates,
  appendNegotiationHistory,
  resolveBookingAmount,
  resolveSettlementRates,
};
