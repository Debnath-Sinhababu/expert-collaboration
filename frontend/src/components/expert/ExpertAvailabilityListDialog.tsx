'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, RefreshCw } from 'lucide-react'
import type { DayAvailabilityGroup } from '@/lib/expertAvailabilityUtils'
import { formatRangeLabel } from '@/lib/expertAvailabilityUtils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  startDate: string
  endDate: string
  groups: DayAvailabilityGroup[]
  daysWithSlots: number
  totalDays: number
  truncated: boolean
  loading: boolean
  error: string | null
  onRetry?: () => void
}

export function ExpertAvailabilityListDialog({
  open,
  onOpenChange,
  title = 'Expert availability',
  startDate,
  endDate,
  groups,
  daysWithSlots,
  totalDays,
  truncated,
  loading,
  error,
  onRetry,
}: Props) {
  const rangeLabel = formatRangeLabel(startDate, endDate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-[#000000]">
            <Clock className="h-5 w-5 text-[#008260]" />
            {title}
          </DialogTitle>
          {rangeLabel && (
            <DialogDescription className="text-[#6A6A6A]">{rangeLabel}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2 min-h-[120px]">
          {loading && (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-[#F5F5F5] animate-pulse" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-[#9B0000]">{error}</p>
              {onRetry && (
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          )}

          {!loading && !error && groups.length === 0 && (
            <p className="text-sm text-[#6A6A6A] py-6 text-center">
              Expert has not published calendar availability for these dates.
            </p>
          )}

          {!loading && !error && groups.length > 0 && (
            <ul className="space-y-3 pb-2">
              {groups.map((day) => (
                <li
                  key={day.dateKey}
                  className="rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3"
                >
                  <p className="text-sm font-semibold text-[#000000] mb-2">{day.label}</p>
                  <ul className="space-y-1">
                    {day.slots.map((slot) => (
                      <li
                        key={slot.id}
                        className="text-sm text-[#008260] font-medium flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#008260] shrink-0" />
                        {slot.startLabel} – {slot.endLabel}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}

          {truncated && !loading && !error && (
            <p className="text-xs text-[#92400E] mt-3 pb-2">
              Showing first 14 days of this period. Contact the expert for their full schedule.
            </p>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-[#ECECEC] shrink-0 bg-white">
          <p className="text-xs text-[#6A6A6A] mr-auto">
            {daysWithSlots > 0
              ? `${daysWithSlots} day${daysWithSlots !== 1 ? 's' : ''} with slots`
              : `No slots across ${totalDays} day${totalDays !== 1 ? 's' : ''}`}
          </p>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
