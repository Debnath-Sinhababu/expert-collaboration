'use client'

import {
  moneyInr,
  projectCompensationDisplay,
  projectEngagementQuantityDisplay,
  type ProjectCompensationLike,
} from '@/lib/projectCompensation'

type Props = {
  project?: ProjectCompensationLike | null
  /** @deprecated Prefer passing project; kept for callers still using flat props */
  hourlyRate?: number | string | null
  totalBudget?: number | string | null
  durationHours?: number | string | null
  /** expert = net earn; institution = gross pay */
  audience?: 'expert' | 'institution'
  compact?: boolean
}

export function PricingSummary({
  project,
  hourlyRate,
  totalBudget,
  durationHours,
  audience = 'institution',
  compact = false,
}: Props) {
  const display = projectCompensationDisplay(
    project || {
      hourly_rate: hourlyRate,
      total_budget: totalBudget,
      duration_hours: durationHours,
      compensation_unit: 'hourly',
    }
  )
  const engagement = projectEngagementQuantityDisplay(
    project || {
      hourly_rate: hourlyRate,
      total_budget: totalBudget,
      duration_hours: durationHours,
      compensation_unit: 'hourly',
    }
  )
  const cls = compact ? 'text-xs' : 'text-sm'
  const primaryLabel = audience === 'expert' ? 'You earn' : 'You pay'
  const primaryValue =
    audience === 'expert'
      ? display.netPerUnitDisplay
      : display.grossPerUnitDisplay
  const totalLabel = audience === 'expert' ? 'Approx. total earn' : 'Total budget'
  const totalValue = audience === 'expert' ? display.expertNetTotal : display.totalBudgetGross
  const hoursPerDay =
    Number(project?.hours_per_day) > 0
      ? Number(project?.hours_per_day)
      : (display.unit === 'per_day' || display.unit === 'per_session' || display.unit === 'per_month') &&
          Number(display.durationPerUnit) > 1
        ? Number(display.durationPerUnit)
        : 0

  return (
    <div className={`space-y-1 ${cls}`}>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[#717171]">{primaryLabel}</p>
          <p className="font-semibold text-[#008260]">
            {primaryValue > 0 ? `${moneyInr(primaryValue)}/${display.unitShort}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[#717171]">{totalLabel}</p>
          <p className="font-semibold text-[#000000]">
            {totalValue > 0 ? moneyInr(totalValue) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[#717171]">{engagement.label}</p>
          <p className="font-semibold text-[#000000]">{engagement.value}</p>
        </div>
      </div>
      {hoursPerDay > 0 ? (
        <p className="text-[#6A6A6A]">{hoursPerDay} hrs / day</p>
      ) : null}
    </div>
  )
}
