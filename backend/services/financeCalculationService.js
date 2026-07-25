const {
  resolveSettlementRates,
  projectPostedRates,
} = require('../src/shared/compensation');

/** Institution invoice: always +10% TDS +18% GST on base. Expert: +18% GST; optional +10% TDS when applyTds. */
const INSTITUTION_TDS_RATE = 0.10;
const GST_RATE = 0.18;

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

/**
 * Tax bifurcation for invoice / payout totals.
 * Base = pre-tax settlement (institution gross×qty or expert net×qty).
 * Institution: always TDS 10% + GST 18% on base → total = base × 1.28
 * Expert: GST 18% on base; optional TDS 10% when options.applyTds → total = base × 1.18 or 1.28
 */
function applyInvoiceTaxes(baseAmount, partyType, options = {}) {
  const base = roundMoney(baseAmount);
  const applyTds = partyType === 'institution' || Boolean(options.applyTds);
  const tdsRate = applyTds ? INSTITUTION_TDS_RATE : 0;
  const tdsAmount = roundMoney(base * tdsRate);
  const gstAmount = roundMoney(base * GST_RATE);
  const totalAmount = roundMoney(base + tdsAmount + gstAmount);
  return {
    base_amount: base,
    apply_tds: applyTds,
    tds_rate: tdsRate,
    tds_amount: tdsAmount,
    gst_rate: GST_RATE,
    gst_amount: gstAmount,
    total_amount: totalAmount,
    formula: applyTds
      ? 'base + TDS 10% + GST 18%'
      : 'base + GST 18%',
  };
}

function positiveNumber(...candidates) {
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/**
 * Contracted quantity the institute agreed to pay for.
 * Never uses attendance / approved hours.
 * Returns 0 when quantity is not explicitly contracted (do not invent 1).
 */
function resolveInstitutionContractQuantity(booking, unit, posted = {}) {
  if (unit === 'fixed_package') return 1;

  const fromBooking = positiveNumber(booking?.unit_quantity);
  if (fromBooking) return fromBooking;

  const project = booking?.projects || booking?.project || {};
  const fromProject = positiveNumber(project?.unit_quantity);
  if (fromProject) return fromProject;

  if (unit === 'hourly') {
    const hours = positiveNumber(
      booking?.hours_booked,
      project?.duration_hours,
      posted.durationHours
    );
    if (hours) return hours;
  }

  return 0;
}

/**
 * Institute amount rule (single source of truth):
 *   amount = gross_rate × contract_qty
 *
 * Edge cases:
 * - fixed_package → qty is always 1; amount = package gross
 * - rate + qty both known → always rate × qty (ignore stale total_budget)
 * - only package/total known, no rate → amount = that total, qty = 1 (package) or inferred
 * - rate known, qty missing → amount 0 (do not invent attendance qty)
 * - qty known, rate missing → derive rate from stored total / qty when total exists
 */
function resolveInstitutionContractBudget(booking) {
  const project = booking?.projects || booking?.project || {};
  const rates = resolveSettlementRates(booking);
  const posted = projectPostedRates(project);
  const unit = rates.unit;
  const unitShort = rates.unitShort;

  const storedPackageOrTotal = positiveNumber(
    project?.institution_gross_total,
    unit === 'fixed_package' ? project?.total_budget : 0
  );
  const storedTotalBudget = positiveNumber(project?.total_budget);

  let ratePerUnit = roundMoney(positiveNumber(rates.grossPerUnit, posted.grossPerUnit));
  let quantity = resolveInstitutionContractQuantity(booking, unit, posted);

  // Package with no per-unit rate: the package total IS the amount.
  if (unit === 'fixed_package') {
    quantity = 1;
    if (!(ratePerUnit > 0) && storedPackageOrTotal > 0) {
      ratePerUnit = roundMoney(storedPackageOrTotal);
    }
    if (!(ratePerUnit > 0) && storedTotalBudget > 0) {
      ratePerUnit = roundMoney(storedTotalBudget);
    }
    return {
      amount: roundMoney(ratePerUnit),
      quantity: 1,
      ratePerUnit,
      unit,
      unitShort,
      source: 'fixed_package_gross',
      formula: 'gross_rate × 1 (package)',
    };
  }

  // Qty known, rate missing → derive from stored total if it divides cleanly enough to use.
  if (!(ratePerUnit > 0) && quantity > 0) {
    const total = positiveNumber(project?.institution_gross_total, storedTotalBudget);
    if (total > 0) {
      ratePerUnit = roundMoney(total / quantity);
      return {
        amount: roundMoney(ratePerUnit * quantity),
        quantity,
        ratePerUnit,
        unit,
        unitShort,
        source: 'derived_rate_from_total',
        formula: 'gross_rate × contract_qty',
      };
    }
  }

  // Canonical path: rate × contract qty. Do NOT prefer stale total_budget over this.
  if (ratePerUnit > 0 && quantity > 0) {
    return {
      amount: roundMoney(ratePerUnit * quantity),
      quantity,
      ratePerUnit,
      unit,
      unitShort,
      source: 'gross_rate_x_contract_qty',
      formula: 'gross_rate × contract_qty',
    };
  }

  // Last resort: only a total exists (no usable rate/qty pair).
  const fallbackTotal = positiveNumber(project?.institution_gross_total, storedTotalBudget);
  if (fallbackTotal > 0) {
    return {
      amount: roundMoney(fallbackTotal),
      quantity: quantity > 0 ? quantity : 1,
      ratePerUnit: quantity > 0 ? roundMoney(fallbackTotal / quantity) : roundMoney(fallbackTotal),
      unit,
      unitShort,
      source: 'fallback_stored_total',
      formula: 'stored institute total (rate/qty incomplete)',
    };
  }

  return {
    amount: 0,
    quantity,
    ratePerUnit,
    unit,
    unitShort,
    source: 'incomplete_contract',
    formula: 'gross_rate × contract_qty',
  };
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
 * Billable quantity for expert settlement based on compensation unit.
 * - hourly: approved hours
 * - per_day / per_session / per_month: approved attendance days
 * - fixed_package: 1 when completed or any delivery recorded; else hours-based proration
 */
function billableQuantity(unit, { approvedHours = 0, approvedDays = 0, hoursBooked = 0, bookingStatus = '' } = {}) {
  const status = String(bookingStatus || '').toLowerCase();
  if (unit === 'per_day' || unit === 'per_session' || unit === 'per_month') {
    return Math.max(0, Number(approvedDays) || 0);
  }
  if (unit === 'fixed_package') {
    if (status === 'completed') return 1;
    const booked = Number(hoursBooked) || 0;
    const hours = Number(approvedHours) || 0;
    if (booked > 0 && hours > 0) return Math.min(1, roundMoney(hours / booked));
    return (Number(approvedDays) || 0) > 0 ? 1 : 0;
  }
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

  let ratePerUnit;
  let amount;
  let settlement = null;
  const applyTds =
    partyType === 'institution' ? true : Boolean(options.applyTds);

  if (partyType === 'institution') {
    const contract = resolveInstitutionContractBudget(booking);
    ratePerUnit = contract.ratePerUnit;
    const taxes = applyInvoiceTaxes(contract.amount, 'institution');
    amount = taxes.total_amount;
    settlement = {
      party_type: 'institution',
      unit: contract.unit,
      unit_short: contract.unitShort,
      contract_quantity: contract.quantity,
      delivery_quantity: null,
      rate_per_unit: contract.ratePerUnit,
      calculated_amount: taxes.total_amount,
      base_amount: taxes.base_amount,
      apply_tds: taxes.apply_tds,
      tds_rate: taxes.tds_rate,
      tds_amount: taxes.tds_amount,
      gst_rate: taxes.gst_rate,
      gst_amount: taxes.gst_amount,
      formula: `${contract.formula}; then ${taxes.formula}`,
      source: contract.source,
      tax: taxes,
    };
  } else {
    const quantity = billableQuantity(rates.unit, {
      approvedHours: Number(approvedHours) || 0,
      approvedDays,
      hoursBooked,
      bookingStatus: booking?.status,
    });
    ratePerUnit = rates.netPerUnit;
    const baseAmount = roundMoney(quantity * (Number(ratePerUnit) || 0));
    const taxes = applyInvoiceTaxes(baseAmount, 'expert', { applyTds });
    amount = taxes.total_amount;
    settlement = {
      party_type: 'expert',
      unit: rates.unit,
      unit_short: rates.unitShort,
      contract_quantity: null,
      delivery_quantity: quantity,
      rate_per_unit: roundMoney(ratePerUnit || 0),
      calculated_amount: taxes.total_amount,
      base_amount: taxes.base_amount,
      apply_tds: taxes.apply_tds,
      tds_rate: taxes.tds_rate,
      tds_amount: taxes.tds_amount,
      gst_rate: taxes.gst_rate,
      gst_amount: taxes.gst_amount,
      formula: `net_rate × approved_delivery_qty; then ${taxes.formula}`,
      source: 'delivery_x_net',
      tax: taxes,
    };
  }

  const unitQuantity =
    partyType === 'institution'
      ? Number(settlement.contract_quantity) || 0
      : Number(settlement.delivery_quantity) || 0;

  return {
    booking_id: booking.id,
    project_id: booking.project_id || booking.projects?.id || null,
    expert_id: booking.expert_id || booking.experts?.id || null,
    institution_id: booking.institution_id || booking.institutions?.id || null,
    party_type: partyType,
    direction: partyType === 'expert' ? 'payable' : 'receivable',
    // Stores billable qty for the pay unit (hours / days / months / 1 package) — not always clock hours.
    approved_hours: roundMoney(unitQuantity || Number(approvedHours) || 0),
    // Column name is legacy; stores the party's locked rate per compensation unit.
    hourly_rate_snapshot: roundMoney(ratePerUnit || 0),
    calculated_amount: amount,
    invoice_amount: amount,
    apply_tds: applyTds,
    settlement,
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
  const institution = resolveInstitutionContractBudget(booking);
  const institutionTaxes = applyInvoiceTaxes(institution.amount, 'institution');
  const expertBase = roundMoney(quantity * (rates.netPerUnit || 0));
  const expertTaxes = applyInvoiceTaxes(expertBase, 'expert');
  return {
    unit: rates.unit,
    unitShort: rates.unitShort,
    quantity,
    grossPerUnit: rates.grossPerUnit,
    netPerUnit: rates.netPerUnit,
    estimated_expert_amount: expertTaxes.total_amount,
    estimated_institution_amount: institutionTaxes.total_amount,
    estimated_expert_base: expertTaxes.base_amount,
    estimated_expert_gst: expertTaxes.gst_amount,
    estimated_institution_base: institutionTaxes.base_amount,
    estimated_institution_tds: institutionTaxes.tds_amount,
    estimated_institution_gst: institutionTaxes.gst_amount,
    institution_contract_quantity: institution.quantity,
    institution_contract_rate: institution.ratePerUnit,
    institution_contract_source: institution.source,
    institution_formula: institution.formula,
  };
}

function attachSettlementBreakdown(record, booking) {
  if (!booking) return record;
  if (record.party_type === 'institution') {
    const contract = resolveInstitutionContractBudget(booking);
    const storedQty = Number(record.approved_hours);
    const qty = Number(contract.quantity) > 0 ? Number(contract.quantity) : (storedQty > 0 ? storedQty : 0);
    const storedRate = Number(record.hourly_rate_snapshot);
    const rate = storedRate > 0 ? storedRate : Number(contract.ratePerUnit) || 0;
    const baseAmount = qty > 0 && rate > 0 ? roundMoney(qty * rate) : contract.amount;
    const taxes = applyInvoiceTaxes(baseAmount, 'institution');
    return {
      ...record,
      apply_tds: true,
      settlement: {
        party_type: 'institution',
        unit: contract.unit,
        unit_short: contract.unitShort,
        contract_quantity: qty,
        delivery_quantity: null,
        rate_per_unit: roundMoney(rate),
        expected_amount: taxes.total_amount,
        base_amount: taxes.base_amount,
        apply_tds: taxes.apply_tds,
        tds_rate: taxes.tds_rate,
        tds_amount: taxes.tds_amount,
        gst_rate: taxes.gst_rate,
        gst_amount: taxes.gst_amount,
        formula: `${contract.formula}; then ${taxes.formula}`,
        source: contract.source,
        tax: taxes,
      },
    };
  }
  const rates = resolveSettlementRates(booking);
  const deliveryQuantity = Number(record.approved_hours || 0);
  const storedRate = Number(record.hourly_rate_snapshot);
  const rate = storedRate > 0 ? storedRate : Number(rates.netPerUnit) || 0;
  const baseAmount = deliveryQuantity > 0 && rate > 0 ? roundMoney(deliveryQuantity * rate) : 0;
  const applyTds = Boolean(record.apply_tds);
  const taxes = applyInvoiceTaxes(baseAmount, 'expert', { applyTds });
  return {
    ...record,
    apply_tds: applyTds,
    settlement: {
      party_type: 'expert',
      unit: rates.unit,
      unit_short: rates.unitShort,
      contract_quantity: null,
      delivery_quantity: deliveryQuantity,
      rate_per_unit: roundMoney(rate),
      expected_amount: taxes.total_amount,
      base_amount: taxes.base_amount,
      apply_tds: taxes.apply_tds,
      tds_rate: taxes.tds_rate,
      tds_amount: taxes.tds_amount,
      gst_rate: taxes.gst_rate,
      gst_amount: taxes.gst_amount,
      formula: `net_rate × approved_delivery_qty; then ${taxes.formula}`,
      source: 'delivery_x_net',
      tax: taxes,
    },
  };
}

module.exports = {
  INSTITUTION_TDS_RATE,
  GST_RATE,
  applyInvoiceTaxes,
  approvedHoursFromDays,
  approvedDaysFromDays,
  billableQuantity,
  buildPaymentRecordDraft,
  estimateSettlementAmounts,
  hourlyRateForBooking,
  resolveInstitutionContractBudget,
  resolveInstitutionContractQuantity,
  attachSettlementBreakdown,
  resolveSettlementRates,
  roundMoney,
};
