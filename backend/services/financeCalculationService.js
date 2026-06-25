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

function hourlyRateForBooking(booking) {
  return roundMoney(
    booking?.hourly_rate ||
    booking?.amount ||
    booking?.experts?.hourly_rate ||
    booking?.expert?.hourly_rate ||
    0,
  );
}

function buildPaymentRecordDraft(booking, partyType, approvedHours) {
  const hourlyRate = hourlyRateForBooking(booking);
  const amount = roundMoney(approvedHours * hourlyRate);
  return {
    booking_id: booking.id,
    project_id: booking.project_id || booking.projects?.id || null,
    expert_id: booking.expert_id || booking.experts?.id || null,
    institution_id: booking.institution_id || booking.institutions?.id || null,
    party_type: partyType,
    direction: partyType === 'expert' ? 'payable' : 'receivable',
    approved_hours: approvedHours,
    hourly_rate_snapshot: hourlyRate,
    calculated_amount: amount,
    invoice_amount: amount,
  };
}

module.exports = {
  approvedHoursFromDays,
  buildPaymentRecordDraft,
  hourlyRateForBooking,
  roundMoney,
};
