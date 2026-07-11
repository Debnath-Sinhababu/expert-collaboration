'use client'

import {
  equivalentHourlyFromDisplay,
  moneyInr,
  projectCompensationDisplay,
  quantityHint,
  type ProjectCompensationLike,
} from '@/lib/projectCompensation'

type Props = {
  project?: ProjectCompensationLike | null
  audience?: 'institution' | 'expert'
  /** Primary line class */
  className?: string
  showLabel?: boolean
}

/** Posted project rate in compensation unit + optional grey hourly equivalent. */
export function PostedCompensationRate({
  project,
  audience = 'institution',
  className = 'font-semibold text-[#008260] text-sm sm:text-base',
  showLabel = true,
}: Props) {
  const display = projectCompensationDisplay(project)
  const primary =
    audience === 'expert' ? display.netPerUnitDisplay : display.grossPerUnitDisplay
  const hourly = equivalentHourlyFromDisplay(display, audience)
  const label = audience === 'expert' ? 'You earn' : 'You pay'
  const hint = quantityHint(display)

  return (
    <div className="min-w-0">
      <p className={`${className} truncate`}>
        {showLabel ? `${label} ` : ''}
        {primary > 0 ? `${moneyInr(primary)}/${display.unitShort}` : '—'}
        {hint}
      </p>
      {hourly > 0 && display.unit !== 'hourly' && (
        <p className="text-xs text-[#9CA3AF] mt-0.5">≈ {moneyInr(hourly)}/hr</p>
      )}
    </div>
  )
}
