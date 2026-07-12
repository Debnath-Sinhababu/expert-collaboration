const {
  resolveSettlementRates,
} = require('../src/shared/compensation');

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function approvedHoursFromDays(days = []) {
  let hours = 0;
  for (const day of days) {
    if (day.status !== 'approved') continue;
    const entry = day.effective_entry_at || day.expert_entry_at;
    const exit = day.effective_exit_at || day.expert_exit_at;
    if (!entry || !exit) continue;
    hours += Math.max(0, new Date(exit) - new Date(entry)) / 3600000;
  }
  return roundMoney(hours);
}

function approvedDaysFromDays(days = []) {
  return (days || []).filter((day) => String(day.status || '').toLowerCase() === 'approved').length;
}

/**
 * Billable quantity for settlement based on compensation unit.
 * - hourly: approved hours
 * - per_day / per_session: approved attendance days
 * - fixed_package: 1 when completed or any delivery recorded; else hours-based proration
 */
function billableQuantity(unit, { approvedHours = 0, approvedDays = 0, hoursBooked = 0, bookingStatus = '' } = {}) {
  const status = String(bookingStatus || '').toLowerCase();
  if (unit === 'per_day' || unit === 'per_session') {
    return Math.max(0, Number(approvedDays) || 0);
  }
  if (unit === 'fixed_package') {
    if (status === 'completed') return 1;
    const booked = Number(hoursBooked) || 0;
    const hours = Number(approvedHours) || 0;
    if (booked > 0 && hours > 0) return Math.min(1, roundMoney(hours / booked));
    return (Number(approvedDays) || 0) > 0 ? 1 : 0;
  }
  // hourly (default)
  return Math.max(0, Number(approvedHours) || 0);
}

/** @deprecated Prefer resolveSettlementRates + party-specific rate. Kept for callers. */
function hourlyRateForBooking(booking) {
  const rates = resolveSettlementRates(booking);
  return roundMoney(rates.grossPerUnit || 0);
}

function buildPaymentRecordDraft(booking, partyType, approvedHours, options = {}) {
  const rates = resolveSettlementRates(booking);
  const approvedDays =
    options.approvedDays != null
      ? Number(options.approvedDays) || 0
      : approvedDaysFromDays(options.days || []);
  const hoursBooked =
    Number(booking?.hours_booked) ||
    Number(booking?.projects?.duration_hours) ||
    Number(booking?.project?.duration_hours) ||
    0;

  const quantity = billableQuantity(rates.unit, {
    approvedHours: Number(approvedHours) || 0,
    approvedDays,
    hoursBooked,
    bookingStatus: booking?.status,
  });

  const ratePerUnit =
    partyType === 'expert' ? rates.netPerUnit : rates.grossPerUnit;
  const amount = roundMoney(quantity * (Number(ratePerUnit) || 0));

  return {
    booking_id: booking.id,
    project_id: booking.project_id || booking.projects?.id || null,
    expert_id: booking.expert_id || booking.experts?.id || null,
    institution_id: booking.institution_id || booking.institutions?.id || null,
    party_type: partyType,
    direction: partyType === 'expert' ? 'payable' : 'receivable',
    approved_hours: roundMoney(Number(approvedHours) || 0),
    // Column name is legacy; stores the party's locked rate per compensation unit.
    hourly_rate_snapshot: roundMoney(ratePerUnit || 0),
    calculated_amount: amount,
    invoice_amount: amount,
  };
}

function estimateSettlementAmounts(booking, approvedHours, approvedDays = 0) {
  const rates = resolveSettlementRates(booking);
  const hoursBooked =
    Number(booking?.hours_booked) ||
    Number(booking?.projects?.duration_hours) ||
    0;
  const quantity = billableQuantity(rates.unit, {
    approvedHours: Number(approvedHours) || 0,
    approvedDays: Number(approvedDays) || 0,
    hoursBooked,
    bookingStatus: booking?.status,
  });
  return {
    unit: rates.unit,
    unitShort: rates.unitShort,
    quantity,
    grossPerUnit: rates.grossPerUnit,
    netPerUnit: rates.netPerUnit,
    estimated_expert_amount: roundMoney(quantity * (rates.netPerUnit || 0)),
    estimated_institution_amount: roundMoney(quantity * (rates.grossPerUnit || 0)),
  };
}

module.exports = {
  approvedHoursFromDays,
  approvedDaysFromDays,
  billableQuantity,
  buildPaymentRecordDraft,
  estimateSettlementAmounts,
  hourlyRateForBooking,
  resolveSettlementRates,
  roundMoney,
};
