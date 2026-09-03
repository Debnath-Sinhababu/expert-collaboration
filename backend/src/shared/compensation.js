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

function compensationUnitShortLabel(unit) {
  if (unit === 'per_session') return 'session';
  if (unit === 'per_day') return 'day';
  if (unit === 'per_month') return 'month';
  if (unit === 'fixed_package') return 'package';
  return 'hour';
}

function compensationUnitLabel(unit) {
  if (unit === 'per_session') return 'Per session';
  if (unit === 'per_day') return 'Per day';
  if (unit === 'per_month') return 'Per month';
  if (unit === 'fixed_package') return 'Fixed package';
  return 'Per hour';
}

/** Prefer locked application values; fall back to the project requirement. */
function mergeEngagementSource(application, project) {
  const p = project || {};
  const a = application || {};
  return {
    ...p,
    compensation_unit: a.compensation_unit || p.compensation_unit,
    unit_quantity: a.unit_quantity ?? p.unit_quantity,
    duration_per_unit: a.duration_per_unit ?? p.duration_per_unit,
  };
}

/**
 * Normalize stored compensation — mirrors frontend normalizeStoredCompensation().
 * Repairs legacy per_day rows that saved qty=1 and duration_per_unit=<day count>.
 */
function normalizeStoredCompensation(source) {
  const project = source || {};
  const unit =
    project.compensation_unit && COMPENSATION_UNITS.has(project.compensation_unit)
      ? project.compensation_unit
      : 'hourly';

  let quantity = Number(project.unit_quantity);
  let durationPerUnit = Number(project.duration_per_unit);
  let grossPerUnit = Number(project.institution_gross_per_unit);
  const packageTotal =
    Number(project.institution_gross_total) > 0
      ? Number(project.institution_gross_total)
      : Number(project.total_budget) > 0
        ? Number(project.total_budget)
        : 0;
  const legacyHourly = Number(project.hourly_rate);
  const legacyHours = Number(project.duration_hours);
  const hoursPerDay = Number(project.hours_per_day);
  const isUnitPay = unit === 'per_day' || unit === 'per_session' || unit === 'per_month';

  if (
    isUnitPay &&
    quantity === 1 &&
    durationPerUnit > 1 &&
    packageTotal > 0 &&
    grossPerUnit > 0 &&
    Math.abs(grossPerUnit - packageTotal) / packageTotal < 0.01
  ) {
    quantity = durationPerUnit;
    grossPerUnit = Math.round((packageTotal / quantity) * 100) / 100;
    durationPerUnit = hoursPerDay > 0 ? hoursPerDay : 1;
  }

  if (!(Number.isFinite(quantity) && quantity > 0)) {
    quantity = unit === 'hourly' && legacyHours > 0 ? legacyHours : 1;
  }
  if (!(Number.isFinite(durationPerUnit) && durationPerUnit > 0)) {
    if (isUnitPay && hoursPerDay > 0) durationPerUnit = hoursPerDay;
    else if (unit === 'hourly') durationPerUnit = 1;
    else if (unit === 'fixed_package' && legacyHours > 0) durationPerUnit = legacyHours;
    else durationPerUnit = 1;
  }

  return { unit, quantity, durationPerUnit, legacyHours };
}

function expectedTotalHours(unit, quantity, durationPerUnit, legacyHours) {
  if (unit === 'per_session' || unit === 'per_day' || unit === 'per_month') {
    return quantity * durationPerUnit;
  }
  if (unit === 'hourly') return quantity;
  if (unit === 'fixed_package') return durationPerUnit || legacyHours || 0;
  return legacyHours || 0;
}

function pluralUnit(short, count) {
  return count === 1 ? short : `${short}s`;
}

/**
 * Engagement quantity line — mirrors frontend projectEngagementQuantityDisplay().
 */
function engagementQuantityDisplay(source) {
  const normalized = normalizeStoredCompensation(source);
  const posted = projectPostedRates(source);
  const { unit, quantity, durationPerUnit, legacyHours } = normalized;
  const unitShort = compensationUnitShortLabel(unit);
  const totalHours = expectedTotalHours(unit, quantity, durationPerUnit, legacyHours)
    || Number(posted.durationHours)
    || legacyHours
    || 0;

  if (unit === 'per_day' || unit === 'per_session' || unit === 'per_month') {
    return {
      label: unit === 'per_day' ? 'Duration' : 'Quantity',
      value: quantity > 0 ? `${quantity} ${pluralUnit(unitShort, quantity)}` : '—',
      unit,
      quantity,
      durationPerUnit,
      totalHours,
    };
  }
  if (unit === 'fixed_package') {
    return {
      label: 'Estimated effort',
      value: totalHours > 0 ? `${totalHours} ${pluralUnit('hour', totalHours)}` : '1 package',
      unit,
      quantity: totalHours > 0 ? totalHours : 1,
      durationPerUnit,
      totalHours,
    };
  }
  const hours = quantity > 0 ? quantity : totalHours;
  return {
    label: 'Duration',
    value: hours > 0 ? `${hours} ${pluralUnit('hour', hours)}` : '—',
    unit,
    quantity: hours,
    durationPerUnit,
    totalHours: hours,
  };
}

/**
 * Program Details bullets for the offer letter (engagement unit aware).
 * Course title, training mode, and dates are added by the letter template.
 */
function buildOfferLetterProgramDetails(application, project) {
  const merged = mergeEngagementSource(application, project);
  const engagement = engagementQuantityDisplay(merged);
  const { unit, quantity, durationPerUnit, totalHours } = engagement;
  const bullets = [['Compensation unit', compensationUnitLabel(unit)]];

  if (unit === 'per_session') {
    bullets.push(['Total sessions', quantity > 0 ? `${quantity} ${pluralUnit('session', quantity)}` : '—']);
    if (durationPerUnit > 0) {
      bullets.push([
        'Session duration',
        `${durationPerUnit} ${pluralUnit('hour', durationPerUnit)} each`,
      ]);
    }
  } else if (unit === 'per_day') {
    bullets.push(['Duration', engagement.value]);
    if (durationPerUnit > 0) {
      bullets.push([
        'Hours per day',
        `${durationPerUnit} ${pluralUnit('hour', durationPerUnit)}`,
      ]);
    }
  } else if (unit === 'per_month') {
    bullets.push(['Duration', engagement.value]);
    if (durationPerUnit > 0) {
      bullets.push([
        'Hours per month',
        `${durationPerUnit} ${pluralUnit('hour', durationPerUnit)}`,
      ]);
    }
  } else if (unit === 'fixed_package') {
    bullets.push(['Estimated effort', engagement.value]);
  } else {
    bullets.push(['Duration', engagement.value]);
  }

  if (
    totalHours > 0 &&
    (unit === 'per_session' || unit === 'per_day' || unit === 'per_month')
  ) {
    bullets.push(['Total training hours', `${totalHours} ${pluralUnit('hour', totalHours)}`]);
  }

  const trainingDuration = engagement.value;

  return {
    programDetailBullets: bullets,
    trainingDuration,
    compensationUnit: unit,
    engagementQuantity: quantity,
    engagementUnitShort: compensationUnitShortLabel(unit),
    totalTrainingHours: totalHours > 0 ? totalHours : undefined,
  };
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
  compensationUnitShortLabel,
  compensationUnitLabel,
  mergeEngagementSource,
  normalizeStoredCompensation,
  engagementQuantityDisplay,
  buildOfferLetterProgramDetails,
};
