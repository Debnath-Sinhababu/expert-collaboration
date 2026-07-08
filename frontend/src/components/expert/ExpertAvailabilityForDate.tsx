'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { api } from '@/lib/api'
import { Clock } from 'lucide-react'

type Slot = { id: string; start_at: string; end_at: string }

type Props = {
  expertId: string
  /** ISO date string (YYYY-MM-DD) or Date */
  date: string | Date
  className?: string
}

export function ExpertAvailabilityForDate({ expertId, date, className }: Props) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!expertId || !date) return
      setLoading(true)
      try {
        const d = typeof date === 'string' ? date.slice(0, 10) : format(date, 'yyyy-MM-dd')
        const from = new Date(`${d}T00:00:00.000Z`).toISOString()
        const to = new Date(`${d}T23:59:59.999Z`).toISOString()
        const data = await api.experts.getAvailability(expertId, { from, to })
        if (!cancelled) setSlots(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setSlots([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [expertId, date])

  if (loading) {
    return <p className={`text-xs text-[#6A6A6A] ${className || ''}`}>Loading availability…</p>
  }

  if (!slots.length) {
    return (
      <p className={`text-xs text-[#6A6A6A] flex items-center gap-1 ${className || ''}`}>
        <Clock className="h-3 w-3 shrink-0" />
        No availability published for this date.
      </p>
    )
  }

  return (
    <div className={`text-xs text-[#000000] ${className || ''}`}>
      <p className="font-medium text-[#008260] mb-1 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Available on this date
      </p>
      <ul className="space-y-0.5">
        {slots.map((s) => (
          <li key={s.id}>
            {format(new Date(s.start_at), 'h:mm a')} – {format(new Date(s.end_at), 'h:mm a')}
          </li>
        ))}
      </ul>
    </div>
  )
}
