'use client'

import {
  moneyInr,
  projectCompensationDisplay,
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
  const cls = compact ? 'text-xs' : 'text-sm'
  const primaryLabel = audience === 'expert' ? 'You earn' : 'You pay'
  const primaryValue =
    audience === 'expert'
      ? display.netPerUnitDisplay
      : display.grossPerUnitDisplay
  const totalLabel = audience === 'expert' ? 'Approx. total earn' : 'Total budget'
  const totalValue = audience === 'expert' ? display.expertNetTotal : display.totalBudgetGross

  return (
    <div className={`grid grid-cols-3 gap-2 ${cls}`}>
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
        <p className="text-[#717171]">Hours</p>
        <p className="font-semibold text-[#000000]">
          {display.expectedTotalHours > 0 ? display.expectedTotalHours : durationHours || '—'}
        </p>
      </div>
    </div>
  )
}
