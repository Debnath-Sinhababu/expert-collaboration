'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  capDisplayEndDate,
  groupSlotsByDay,
  isoRangeForDateOnly,
  summarizeAvailability,
  type AvailabilitySlot,
  type DayAvailabilityGroup,
} from '@/lib/expertAvailabilityUtils'

type Options = {
  expertId: string
  startDate: string | null | undefined
  endDate: string | null | undefined
  projectId?: string | null
  enabled?: boolean
}

export function useExpertAvailabilitySlots({
  expertId,
  startDate,
  endDate,
  projectId,
  enabled = true,
}: Options) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasDates = Boolean(startDate && endDate)

  const load = useCallback(async () => {
    if (!expertId || !startDate || !endDate || !enabled) return
    setLoading(true)
    setError(null)
    try {
      const { from, to } = isoRangeForDateOnly(startDate, endDate)
      const data = await api.experts.getAvailability(expertId, {
        from,
        to,
        project_id: projectId || undefined,
      })
      setSlots(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      setSlots([])
      setError(e instanceof Error ? e.message : 'Failed to load availability')
    } finally {
      setLoading(false)
    }
  }, [expertId, startDate, endDate, projectId, enabled])

  useEffect(() => {
    if (enabled && hasDates) load()
    else {
      setSlots([])
      setError(null)
    }
  }, [enabled, hasDates, load])

  const summary =
    hasDates && startDate && endDate
      ? summarizeAvailability(slots, startDate, endDate)
      : { totalDays: 0, daysWithSlots: 0, label: 'Dates not set' }

  const cap =
    hasDates && startDate && endDate
      ? capDisplayEndDate(startDate, endDate)
      : { displayEnd: '', truncated: false, totalDays: 0 }

  const displaySlots =
    hasDates && startDate && cap.displayEnd
      ? slots.filter((s) => {
          const d = s.start_at.slice(0, 10)
          return d >= (startDate!.slice(0, 10) || startDate!) && d <= cap.displayEnd
        })
      : slots

  const groups: DayAvailabilityGroup[] = groupSlotsByDay(displaySlots)

  return {
    slots,
    displaySlots,
    groups,
    summary,
    cap,
    loading,
    error,
    reload: load,
    hasDates,
  }
}
