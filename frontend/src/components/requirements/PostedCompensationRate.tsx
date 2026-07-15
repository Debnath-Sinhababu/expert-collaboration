'use client'

import {
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

/** Posted project rate in compensation unit only (no equivalent hourly for day/month/session). */
export function PostedCompensationRate({
  project,
  audience = 'institution',
  className = 'font-semibold text-[#008260] text-sm sm:text-base',
  showLabel = true,
}: Props) {
  const display = projectCompensationDisplay(project)
  const primary =
    audience === 'expert' ? display.netPerUnitDisplay : display.grossPerUnitDisplay
  const label = audience === 'expert' ? 'You earn' : 'You pay'
  const hint = quantityHint(display)

  return (
    <div className="min-w-0">
      <p className={`${className} truncate`}>
        {showLabel ? `${label} ` : ''}
        {primary > 0 ? `${moneyInr(primary)}/${display.unitShort}` : '—'}
        {hint}
      </p>
    </div>
  )
}
