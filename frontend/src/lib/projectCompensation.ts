/** Compensation / pricing helpers for contract requirements (70% expert net / 30% platform). */

export const COMPENSATION_UNITS = [
  'per_session',
  'per_day',
  'per_month',
  'fixed_package',
  'hourly',
] as const

export type CompensationUnit = (typeof COMPENSATION_UNITS)[number]

export const EXPERT_NET_SHARE = 0.7
export const PLATFORM_FEE_SHARE = 0.3

export const COMPENSATION_UNIT_OPTIONS: Array<{ value: CompensationUnit; label: string; shortLabel: string }> = [
  { value: 'hourly', label: 'Per hour', shortLabel: 'hour' },
  { value: 'per_day', label: 'Per day', shortLabel: 'day' },
  { value: 'per_month', label: 'Per month', shortLabel: 'month' },
]

/** Default pay unit by project type. `other` requires explicit choice. */
export const DEFAULT_COMPENSATION_UNIT_BY_TYPE: Record<string, CompensationUnit | null> = {
  guest_lecture: 'hourly',
  consultation: 'hourly',
  fdp: 'per_day',
  workshop: 'per_day',
  training_program: 'per_day',
  curriculum_dev: 'per_month',
  research_collaboration: 'per_month',
  other: 'hourly',
}

export function getDefaultCompensationUnit(projectType?: string | null): CompensationUnit | '' {
  if (!projectType) return ''
  return DEFAULT_COMPENSATION_UNIT_BY_TYPE[projectType] || ''
}

export function compensationUnitLabel(unit?: string | null): string {
  if (unit === 'per_session') return 'Per session'
  if (unit === 'fixed_package') return 'Fixed package'
  return COMPENSATION_UNIT_OPTIONS.find((item) => item.value === unit)?.label || 'Per unit'
}

export function compensationUnitShortLabel(unit?: string | null): string {
  if (unit === 'per_session') return 'session'
  if (unit === 'fixed_package') return 'package'
  return COMPENSATION_UNIT_OPTIONS.find((item) => item.value === unit)?.shortLabel || 'unit'
}

export function toExpertNet(gross: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0
  return Math.round(gross * EXPERT_NET_SHARE)
}

export function toInstitutionGrossFromNet(net: number): number {
  if (!Number.isFinite(net) || net <= 0) return 0
  return Math.round(net / EXPERT_NET_SHARE)
}

export function toPlatformFee(gross: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0
  return Math.round(gross * PLATFORM_FEE_SHARE)
}

export type CompensationInput = {
  compensation_unit: CompensationUnit | ''
  unit_quantity: string
  duration_per_unit: string
  institution_gross_per_unit: string
  institution_gross_total: string
}

export type CompensationDerived = {
  expectedTotalHours: number
  totalBudgetGross: number
  expertNetPerUnit: number
  expertNetTotal: number
  platformFeeTotal: number
  quantity: number
  durationPerUnit: number
  grossPerUnit: number
}

export function deriveCompensation(input: CompensationInput): CompensationDerived {
  const unit = input.compensation_unit
  const quantity = Math.max(0, Number(input.unit_quantity) || 0)
  const durationPerUnit = Math.max(0, Number(input.duration_per_unit) || 0)
  const grossPerUnit = Math.max(0, Number(input.institution_gross_per_unit) || 0)
  const packageTotal = Math.max(0, Number(input.institution_gross_total) || 0)

  let expectedTotalHours = 0
  let totalBudgetGross = 0

  if (unit === 'per_session' || unit === 'per_day' || unit === 'per_month') {
    expectedTotalHours = quantity * durationPerUnit
    totalBudgetGross = quantity * grossPerUnit
  } else if (unit === 'hourly') {
    expectedTotalHours = quantity
    totalBudgetGross = quantity * grossPerUnit
  } else if (unit === 'fixed_package') {
    expectedTotalHours = durationPerUnit
    totalBudgetGross = packageTotal
  }

  const expertNetPerUnit =
    unit === 'fixed_package'
      ? toExpertNet(totalBudgetGross)
      : toExpertNet(grossPerUnit)

  const expertNetTotal =
    unit === 'fixed_package'
      ? expertNetPerUnit
      : toExpertNet(totalBudgetGross)

  return {
    expectedTotalHours: Number.isFinite(expectedTotalHours) ? expectedTotalHours : 0,
    totalBudgetGross: Number.isFinite(totalBudgetGross) ? totalBudgetGross : 0,
    expertNetPerUnit,
    expertNetTotal,
    platformFeeTotal: toPlatformFee(totalBudgetGross),
    quantity,
    durationPerUnit,
    grossPerUnit: unit === 'fixed_package' ? totalBudgetGross : grossPerUnit,
  }
}

/** Legacy hourly_rate for older flows: equivalent institution gross per hour when possible. */
export function legacyHourlyRateFromCompensation(
  unit: CompensationUnit | '',
  derived: CompensationDerived
): number {
  if (unit === 'hourly') return derived.grossPerUnit
  if (derived.expectedTotalHours > 0 && derived.totalBudgetGross > 0) {
    return Math.round((derived.totalBudgetGross / derived.expectedTotalHours) * 100) / 100
  }
  return derived.grossPerUnit || 0
}

export function moneyInr(value: number): string {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`
}

export type ProjectCompensationLike = {
  compensation_unit?: string | null
  unit_quantity?: number | string | null
  duration_per_unit?: number | string | null
  institution_gross_per_unit?: number | string | null
  institution_gross_total?: number | string | null
  hourly_rate?: number | string | null
  total_budget?: number | string | null
  duration_hours?: number | string | null
}

/** Resolve project compensation for display; falls back to legacy hourly fields. */
export function projectCompensationDisplay(project?: ProjectCompensationLike | null) {
  const unit = (project?.compensation_unit as CompensationUnit) || 'hourly'
  const quantity = Number(project?.unit_quantity)
  const durationPerUnit = Number(project?.duration_per_unit)
  const grossPerUnit = Number(project?.institution_gross_per_unit)
  const packageTotal = Number(project?.institution_gross_total)
  const legacyHourly = Number(project?.hourly_rate)
  const legacyBudget = Number(project?.total_budget)
  const legacyHours = Number(project?.duration_hours)

  const derived = deriveCompensation({
    compensation_unit: unit,
    unit_quantity: String(
      Number.isFinite(quantity) && quantity > 0
        ? quantity
        : unit === 'hourly' && Number.isFinite(legacyHours) && legacyHours > 0
          ? legacyHours
          : 1
    ),
    duration_per_unit: String(
      Number.isFinite(durationPerUnit) && durationPerUnit > 0
        ? durationPerUnit
        : unit === 'hourly'
          ? 1
          : Number.isFinite(legacyHours) && legacyHours > 0 && unit === 'fixed_package'
            ? legacyHours
            : 1
    ),
    institution_gross_per_unit: String(
      Number.isFinite(grossPerUnit) && grossPerUnit > 0
        ? grossPerUnit
        : Number.isFinite(legacyHourly) && legacyHourly > 0
          ? legacyHourly
          : 0
    ),
    institution_gross_total: String(
      Number.isFinite(packageTotal) && packageTotal > 0
        ? packageTotal
        : Number.isFinite(legacyBudget) && legacyBudget > 0
          ? legacyBudget
          : 0
    ),
  })

  // Prefer stored totals when present
  if (Number.isFinite(legacyBudget) && legacyBudget > 0 && derived.totalBudgetGross <= 0) {
    derived.totalBudgetGross = legacyBudget
    derived.expertNetTotal = toExpertNet(legacyBudget)
    derived.platformFeeTotal = toPlatformFee(legacyBudget)
  }
  if (Number.isFinite(legacyHours) && legacyHours > 0 && derived.expectedTotalHours <= 0) {
    derived.expectedTotalHours = legacyHours
  }

  return {
    unit,
    unitLabel: compensationUnitLabel(unit),
    unitShort: compensationUnitShortLabel(unit),
    ...derived,
    grossPerUnitDisplay: unit === 'fixed_package' ? derived.totalBudgetGross : derived.grossPerUnit,
    netPerUnitDisplay: unit === 'fixed_package' ? derived.expertNetTotal : derived.expertNetPerUnit,
  }
}

/** Equivalent hourly amount for grey helper text (gross for institution, net for expert). */
export function equivalentHourlyFromDisplay(
  display: ReturnType<typeof projectCompensationDisplay>,
  audience: 'institution' | 'expert' = 'institution'
): number {
  let hourlyGross = 0
  if (display.unit === 'hourly') {
    hourlyGross = display.grossPerUnitDisplay
  } else if (display.expectedTotalHours > 0 && display.totalBudgetGross > 0) {
    hourlyGross = display.totalBudgetGross / display.expectedTotalHours
  }
  if (!(hourlyGross > 0)) return 0
  const rounded = Math.round(hourlyGross * 100) / 100
  return audience === 'expert' ? toExpertNet(rounded) : rounded
}

export function quantityHint(display: ReturnType<typeof projectCompensationDisplay>): string {
  if (display.unit === 'fixed_package' || display.unit === 'hourly') return ''
  if (!(display.quantity > 0)) return ''
  const plural = display.quantity === 1 ? display.unitShort : `${display.unitShort}s`
  return ` · ${display.quantity} ${plural}`
}

export const RATE_INTENTS = ['agreed_posted', 'open_to_negotiate'] as const
export type RateIntent = (typeof RATE_INTENTS)[number]

export const RATE_STATUSES = [
  'agreed_posted',
  'open_to_negotiate',
  'expert_proposed',
  'institution_countered',
  'expert_countered',
  'agreed',
  'posted_rate_offered',
  'posted_rate_declined',
] as const
export type RateStatus = (typeof RATE_STATUSES)[number]

export function isRateAgreed(status?: string | null): boolean {
  return status === 'agreed_posted' || status === 'agreed'
}

export function isPostedRateOfferPending(status?: string | null): boolean {
  return status === 'posted_rate_offered'
}

export function isPostedRateDeclined(status?: string | null): boolean {
  return status === 'posted_rate_declined'
}

export function isRateNegotiationClosed(status?: string | null): boolean {
  return isRateAgreed(status) || isPostedRateOfferPending(status) || isPostedRateDeclined(status)
}

export function rateIntentLabel(intent?: string | null): string {
  if (intent === 'agreed_posted') return 'Accepted posted rate'
  if (intent === 'open_to_negotiate') return 'Open to negotiate'
  return 'Rate preference not set'
}

export function rateStatusLabel(status?: string | null): string {
  switch (status) {
    case 'agreed_posted':
      return 'Accepted posted rate'
    case 'open_to_negotiate':
      return 'Open to negotiate'
    case 'expert_proposed':
      return 'Expert proposed'
    case 'institution_countered':
      return 'Institution countered'
    case 'expert_countered':
      return 'Expert countered'
    case 'agreed':
      return 'Rate agreed'
    case 'posted_rate_offered':
      return 'Posted rate requested'
    case 'posted_rate_declined':
      return 'Posted rate declined'
    default:
      return 'Pending rate discussion'
  }
}

export type NegotiationHistoryEntry = {
  at: string
  actor: 'expert' | 'institution' | 'system'
  action: string
  net_per_unit?: number | null
  gross_per_unit?: number | null
  note?: string | null
}

export type NegotiationHistoryDetailLine = { label: string; value: string }

export function formatNegotiationHistoryEntry(
  entry: NegotiationHistoryEntry,
  unitShort = 'unit',
  audience: 'institution' | 'expert' = 'institution'
): {
  title: string
  details: NegotiationHistoryDetailLine[]
  who: string
  tone: 'neutral' | 'expert' | 'institution' | 'success'
} {
  const who =
    entry.actor === 'expert'
      ? 'Expert'
      : entry.actor === 'institution'
        ? 'Institution'
        : 'System'
  const net = entry.net_per_unit != null && Number(entry.net_per_unit) > 0 ? Number(entry.net_per_unit) : null
  const gross = entry.gross_per_unit != null && Number(entry.gross_per_unit) > 0 ? Number(entry.gross_per_unit) : null
  const note = entry.note?.trim() || ''

  const amountDetails: NegotiationHistoryDetailLine[] = []
  if (audience === 'expert') {
    if (net != null) amountDetails.push({ label: 'Expert earn', value: `${moneyInr(net)} / ${unitShort}` })
  } else {
    if (gross != null) amountDetails.push({ label: 'Institution pays', value: `${moneyInr(gross)} / ${unitShort}` })
    if (net != null) amountDetails.push({ label: 'Expert earn', value: `${moneyInr(net)} / ${unitShort}` })
  }

  const noteDetails: NegotiationHistoryDetailLine[] = note
    ? [{ label: entry.action === 'expert_propose' || entry.action === 'institution_counter' ? 'Message' : 'Note', value: note }]
    : []

  const withFallback = (
    title: string,
    tone: 'neutral' | 'expert' | 'institution' | 'success',
    fallback?: NegotiationHistoryDetailLine
  ) => ({
    who,
    tone,
    title,
    details: [
      ...(amountDetails.length > 0 ? amountDetails : fallback ? [fallback] : []),
      ...noteDetails,
    ],
  })

  switch (entry.action) {
    case 'agreed_posted_at_apply':
      return withFallback(
        'Expert agreed to the posted rate while applying',
        'success',
        { label: 'Status', value: 'Accepted the rate shown on the requirement' }
      )
    case 'open_to_negotiate_at_apply':
      return withFallback(
        'Expert chose to negotiate if shortlisted',
        'expert',
        { label: 'Status', value: 'No amount was proposed at apply' }
      )
    case 'expert_propose':
      return withFallback('Expert sent a rate proposal', 'expert', {
        label: 'Status',
        value: 'Proposed a new rate',
      })
    case 'institution_counter':
      return withFallback('Institution sent a counter offer', 'institution', {
        label: 'Status',
        value: 'Proposed a revised rate',
      })
    case 'accept_proposal':
      return withFallback('Institution accepted the expert’s proposal', 'success', {
        label: 'Status',
        value: 'Rate agreed based on expert proposal',
      })
    case 'accept_counter':
      return withFallback('Expert accepted the institution’s counter offer', 'success', {
        label: 'Status',
        value: 'Rate agreed based on counter offer',
      })
    case 'accept_posted':
      return withFallback(`${who} accepted the original posted rate`, 'success', {
        label: 'Status',
        value: 'Returned to the original posted compensation',
      })
    case 'offer_posted_rate':
      return withFallback(
        'Institution requested to proceed at the posted rate only',
        'institution',
        {
          label: 'Status',
          value: 'Negotiation paused — waiting for expert approval',
        }
      )
    case 'accept_posted_offer':
      return withFallback('Expert agreed to proceed at the posted rate', 'success', {
        label: 'Status',
        value: 'Posted rate accepted; negotiation closed',
      })
    case 'decline_posted_offer':
      return withFallback('Expert declined proceeding at the posted rate only', 'expert', {
        label: 'Status',
        value: 'Negotiation closed; booking cannot proceed on this application',
      })
    case 'confirm_and_lock':
      return withFallback('Rates locked and booking confirmed', 'success', {
        label: 'Status',
        value: 'Final compensation was locked for this engagement',
      })
    default: {
      const readableAction = String(entry.action || 'update').replace(/_/g, ' ')
      return withFallback(`${who} updated the rate discussion`, 'neutral', {
        label: 'Action',
        value: readableAction,
      })
    }
  }
}

/** Resolve locked or in-progress rates for an application against its project. */
export function resolveApplicationRates(
  application: {
    rate_status?: string | null
    rate_intent?: string | null
    proposed_net_per_unit?: number | string | null
    institution_counter_gross_per_unit?: number | string | null
    final_gross_per_unit?: number | string | null
    final_net_per_unit?: number | string | null
    proposed_rate?: number | string | null
    final_hourly_rate?: number | string | null
    compensation_unit?: string | null
  } | null | undefined,
  project?: ProjectCompensationLike | null
) {
  const display = projectCompensationDisplay(project)
  const unit = (application?.compensation_unit as CompensationUnit) || display.unit

  const finalGross = Number(application?.final_gross_per_unit)
  const finalNet = Number(application?.final_net_per_unit)
  if (Number.isFinite(finalGross) && finalGross > 0 && Number.isFinite(finalNet) && finalNet > 0) {
    return {
      unit,
      unitShort: compensationUnitShortLabel(unit),
      grossPerUnit: finalGross,
      netPerUnit: finalNet,
      quantity: display.quantity || 1,
      totalGross: unit === 'fixed_package' ? finalGross : finalGross * (display.quantity || 1),
      totalNet: unit === 'fixed_package' ? finalNet : finalNet * (display.quantity || 1),
      locked: true,
      source: 'final' as const,
    }
  }

  const counterGross = Number(application?.institution_counter_gross_per_unit)
  if (Number.isFinite(counterGross) && counterGross > 0) {
    const net = toExpertNet(counterGross)
    return {
      unit,
      unitShort: compensationUnitShortLabel(unit),
      grossPerUnit: counterGross,
      netPerUnit: net,
      quantity: display.quantity || 1,
      totalGross: unit === 'fixed_package' ? counterGross : counterGross * (display.quantity || 1),
      totalNet: unit === 'fixed_package' ? net : net * (display.quantity || 1),
      locked: false,
      source: 'counter' as const,
    }
  }

  const proposedNet = Number(application?.proposed_net_per_unit)
  if (Number.isFinite(proposedNet) && proposedNet > 0) {
    const gross = toInstitutionGrossFromNet(proposedNet)
    return {
      unit,
      unitShort: compensationUnitShortLabel(unit),
      grossPerUnit: gross,
      netPerUnit: proposedNet,
      quantity: display.quantity || 1,
      totalGross: unit === 'fixed_package' ? gross : gross * (display.quantity || 1),
      totalNet: unit === 'fixed_package' ? proposedNet : proposedNet * (display.quantity || 1),
      locked: false,
      source: 'proposal' as const,
    }
  }

  // Legacy hourly fallback
  const legacyFinal = Number(application?.final_hourly_rate)
  const legacyProposed = Number(application?.proposed_rate)
  if (Number.isFinite(legacyFinal) && legacyFinal > 0) {
    return {
      unit: 'hourly' as CompensationUnit,
      unitShort: 'hour',
      grossPerUnit: legacyFinal,
      netPerUnit: toExpertNet(legacyFinal),
      quantity: display.expectedTotalHours || display.quantity || 1,
      totalGross: legacyFinal * (display.expectedTotalHours || 1),
      totalNet: toExpertNet(legacyFinal) * (display.expectedTotalHours || 1),
      locked: true,
      source: 'legacy_final' as const,
    }
  }
  if (Number.isFinite(legacyProposed) && legacyProposed > 0) {
    return {
      unit: 'hourly' as CompensationUnit,
      unitShort: 'hour',
      grossPerUnit: legacyProposed,
      netPerUnit: toExpertNet(legacyProposed),
      quantity: display.expectedTotalHours || display.quantity || 1,
      totalGross: legacyProposed * (display.expectedTotalHours || 1),
      totalNet: toExpertNet(legacyProposed) * (display.expectedTotalHours || 1),
      locked: false,
      source: 'legacy_proposed' as const,
    }
  }

  return {
    unit: display.unit,
    unitShort: display.unitShort,
    grossPerUnit: display.grossPerUnitDisplay,
    netPerUnit: display.netPerUnitDisplay,
    quantity: display.quantity || 1,
    totalGross: display.totalBudgetGross,
    totalNet: display.expertNetTotal,
    locked: application?.rate_intent === 'agreed_posted' || application?.rate_status === 'agreed_posted',
    source: 'posted' as const,
  }
}

/** Locked settlement rates for a booking — never expert profile hourly_rate. */
export function resolveBookingSettlementRates(
  booking?: {
    amount?: number | string | null
    final_gross_per_unit?: number | string | null
    final_net_per_unit?: number | string | null
    final_hourly_rate?: number | string | null
    compensation_unit?: string | null
    unit_quantity?: number | string | null
    projects?: ProjectCompensationLike | null
    project?: ProjectCompensationLike | null
  } | null
) {
  const project = booking?.projects || booking?.project || null
  const posted = projectCompensationDisplay(project)
  let unit = (booking?.compensation_unit as CompensationUnit) || posted.unit

  let grossPerUnit = Number(booking?.final_gross_per_unit)
  let netPerUnit = Number(booking?.final_net_per_unit)

  if (!(Number.isFinite(grossPerUnit) && grossPerUnit > 0)) {
    const amount = Number(booking?.amount)
    if (Number.isFinite(amount) && amount > 0) grossPerUnit = amount
  }
  if (!(Number.isFinite(grossPerUnit) && grossPerUnit > 0)) {
    const legacy = Number(booking?.final_hourly_rate)
    if (Number.isFinite(legacy) && legacy > 0) {
      grossPerUnit = legacy
      unit = 'hourly'
    }
  }
  if (!(Number.isFinite(grossPerUnit) && grossPerUnit > 0)) {
    grossPerUnit = posted.grossPerUnitDisplay
    unit = posted.unit
  }
  if (!(Number.isFinite(netPerUnit) && netPerUnit > 0)) {
    netPerUnit = toExpertNet(grossPerUnit)
  }

  return {
    unit,
    unitShort: compensationUnitShortLabel(unit),
    unitLabel: compensationUnitLabel(unit),
    grossPerUnit: Number.isFinite(grossPerUnit) && grossPerUnit > 0 ? grossPerUnit : 0,
    netPerUnit: Number.isFinite(netPerUnit) && netPerUnit > 0 ? netPerUnit : 0,
    locked: Boolean(
      Number(booking?.final_gross_per_unit) > 0 ||
        Number(booking?.final_net_per_unit) > 0 ||
        Number(booking?.amount) > 0
    ),
  }
}

export function formatInstitutionDealRate(
  bookingOrApp: Parameters<typeof resolveBookingSettlementRates>[0] | null | undefined,
  application?: Parameters<typeof resolveApplicationRates>[0],
  project?: ProjectCompensationLike | null
): string {
  if (application) {
    const rates = resolveApplicationRates(application, project || bookingOrApp?.projects || null)
    return `${moneyInr(rates.grossPerUnit)} / ${rates.unitShort}`
  }
  const rates = resolveBookingSettlementRates(bookingOrApp)
  return `${moneyInr(rates.grossPerUnit)} / ${rates.unitShort}`
}

export function formatExpertDealRate(
  bookingOrApp: Parameters<typeof resolveBookingSettlementRates>[0] | null | undefined,
  application?: Parameters<typeof resolveApplicationRates>[0],
  project?: ProjectCompensationLike | null
): string {
  if (application) {
    const rates = resolveApplicationRates(application, project || bookingOrApp?.projects || null)
    return `${moneyInr(rates.netPerUnit)} / ${rates.unitShort}`
  }
  const rates = resolveBookingSettlementRates(bookingOrApp)
  return `${moneyInr(rates.netPerUnit)} / ${rates.unitShort}`
}
