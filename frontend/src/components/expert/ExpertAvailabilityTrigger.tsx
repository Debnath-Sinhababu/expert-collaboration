'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, Loader2 } from 'lucide-react'
import { useExpertAvailabilitySlots } from '@/hooks/useExpertAvailabilitySlots'
import { ExpertAvailabilityListDialog } from './ExpertAvailabilityListDialog'
import { normalizeDateOnly } from '@/lib/dateOnly'

type Props = {
  expertId: string
  startDate?: string | null
  endDate?: string | null
  projectId?: string | null
  /** Compact row vs card block on profile */
  variant?: 'inline' | 'card'
  className?: string
  /**
   * After a successful fetch, render only when the expert has at least one day with
   * published slots in range. Hidden while loading or on error (avoids empty-state noise on cards).
   */
  showOnlyWhenHasSlots?: boolean
  /** Show only the “View availability” button (no summary / checking line). */
  hideSummary?: boolean
}

export function ExpertAvailabilityTrigger({
  expertId,
  startDate,
  endDate,
  projectId,
  variant = 'inline',
  className = '',
  showOnlyWhenHasSlots = false,
  hideSummary = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const normStart = startDate ? normalizeDateOnly(startDate) || startDate : null
  const normEnd = endDate ? normalizeDateOnly(endDate) || endDate : null

  const { groups, summary, cap, loading, error, reload, hasDates } = useExpertAvailabilitySlots({
    expertId,
    startDate: normStart,
    endDate: normEnd,
    projectId,
    enabled: Boolean(expertId && normStart && normEnd),
  })

  if (!normStart || !normEnd) {
    if (showOnlyWhenHasSlots) return null
    return (
      <p className={`text-xs text-[#6A6A6A] ${className}`}>
        Add start and end dates to compare expert availability.
      </p>
    )
  }

  if (showOnlyWhenHasSlots) {
    if (loading || error) return null
    if (summary.daysWithSlots === 0) return null
  }

  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {!hideSummary &&
          (loading ? (
            <span className="text-xs text-[#6A6A6A] flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking availability…
            </span>
          ) : error ? (
            <span className="text-xs text-[#92400E]">Availability could not be loaded</span>
          ) : (
            <span className="text-xs text-[#008260] font-medium">{summary.label}</span>
          ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-[#008260] text-[#008260] hover:bg-[#E8F5F1] rounded-full h-8 text-xs"
          disabled={!hasDates || loading}
          onClick={() => setOpen(true)}
        >
          <Clock className="h-3.5 w-3.5 mr-1" />
          View availability
        </Button>
      </div>

      <ExpertAvailabilityListDialog
        open={open}
        onOpenChange={setOpen}
        title={projectId ? 'Availability for this requirement' : 'Schedule availability'}
        startDate={normStart}
        endDate={normEnd}
        groups={groups}
        daysWithSlots={summary.daysWithSlots}
        totalDays={summary.totalDays}
        truncated={cap.truncated}
        loading={loading && open}
        error={error}
        onRetry={reload}
      />
    </>
  )

  if (variant === 'card') {
    return (
      <div
        className={`rounded-xl border border-[#DCDCDC] bg-gradient-to-br from-white to-[#F8FBFF] p-5 ${className}`}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#ECF2FF] flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-[#008260]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#000000] text-sm">Schedule availability</h3>
            <p className="text-xs text-[#6A6A6A] mt-0.5">
              Published time slots from the expert&apos;s calendar (next {summary.totalDays || 30}{' '}
              days).
            </p>
          </div>
        </div>
        {inner}
      </div>
    )
  }

  return <div className={className}>{inner}</div>
}
