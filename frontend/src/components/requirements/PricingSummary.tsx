import { formatRupees } from '@/lib/projectPricing'

type Props = {
  hourlyRate?: number | string | null
  totalBudget?: number | string | null
  durationHours?: number | string | null
  compact?: boolean
}

export function PricingSummary({ hourlyRate, totalBudget, durationHours, compact = false }: Props) {
  const cls = compact ? 'text-xs' : 'text-sm'
  return (
    <div className={`grid grid-cols-3 gap-2 ${cls}`}>
      <div>
        <p className="text-[#717171]">Hourly</p>
        <p className="font-semibold text-[#008260]">{formatRupees(hourlyRate)}/hr</p>
      </div>
      <div>
        <p className="text-[#717171]">Budget</p>
        <p className="font-semibold text-[#000000]">{formatRupees(totalBudget)}</p>
      </div>
      <div>
        <p className="text-[#717171]">Hours</p>
        <p className="font-semibold text-[#000000]">{durationHours || '-'}</p>
      </div>
    </div>
  )
}
