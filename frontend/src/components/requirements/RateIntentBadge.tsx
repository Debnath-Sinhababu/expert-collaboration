'use client'

import { Badge } from '@/components/ui/badge'
import { rateIntentLabel, rateStatusLabel } from '@/lib/projectCompensation'

type Props = {
  rateIntent?: string | null
  rateStatus?: string | null
  className?: string
}

export function RateIntentBadge({ rateIntent, rateStatus, className }: Props) {
  const status = rateStatus || rateIntent
  const agreed = status === 'agreed_posted' || status === 'agreed'
  const negotiating =
    status === 'open_to_negotiate' ||
    status === 'expert_proposed' ||
    status === 'institution_countered' ||
    status === 'expert_countered'

  const label = rateStatus
    ? rateStatusLabel(rateStatus)
    : rateIntentLabel(rateIntent)

  if (!rateIntent && !rateStatus) {
    return (
      <Badge variant="secondary" className={className}>
        Rate preference not set
      </Badge>
    )
  }

  if (agreed) {
    return (
      <Badge className={`bg-emerald-100 text-emerald-800 border border-emerald-200 ${className || ''}`}>
        {label}
      </Badge>
    )
  }

  if (negotiating) {
    return (
      <Badge className={`bg-amber-100 text-amber-900 border border-amber-200 ${className || ''}`}>
        {label}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  )
}
