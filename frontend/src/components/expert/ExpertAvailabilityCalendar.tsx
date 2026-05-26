'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import 'react-day-picker/style.css'

type Slot = {
  id: string
  start_at: string
  end_at: string
  source?: string
}

type Props = {
  expertId: string
}

const WEEKDAYS = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
]

export function ExpertAvailabilityCalendar({ expertId }: Props) {
  const [month, setMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date())
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [bulkDays, setBulkDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [bulkFrom, setBulkFrom] = useState('')
  const [bulkTo, setBulkTo] = useState('')
  const [saving, setSaving] = useState(false)

  const range = useMemo(() => {
    const from = startOfMonth(month)
    const to = endOfMonth(addMonths(month, 1))
    return { from: from.toISOString(), to: to.toISOString() }
  }, [month])

  const loadSlots = useCallback(async () => {
    if (!expertId) return
    setLoading(true)
    try {
      const data = await api.experts.getAvailability(expertId, range)
      setSlots(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load availability')
    } finally {
      setLoading(false)
    }
  }, [expertId, range])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  const daysWithSlots = useMemo(() => {
    const set = new Set<string>()
    slots.forEach((s) => {
      set.add(format(new Date(s.start_at), 'yyyy-MM-dd'))
    })
    return set
  }, [slots])

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDay) return []
    const key = format(selectedDay, 'yyyy-MM-dd')
    return slots.filter((s) => format(new Date(s.start_at), 'yyyy-MM-dd') === key)
  }, [slots, selectedDay])

  const addSlotForDay = async () => {
    if (!selectedDay || !expertId) return
    const dayStr = format(selectedDay, 'yyyy-MM-dd')
    const startAt = new Date(`${dayStr}T${startTime}:00`)
    const endAt = new Date(`${dayStr}T${endTime}:00`)
    if (endAt <= startAt) {
      toast.error('End time must be after start time')
      return
    }
    setSaving(true)
    try {
      await api.experts.addAvailability(expertId, {
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
      })
      toast.success('Availability added')
      await loadSlots()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add slot')
    } finally {
      setSaving(false)
    }
  }

  const deleteSlot = async (slotId: string) => {
    try {
      await api.experts.deleteAvailability(expertId, slotId)
      toast.success('Removed')
      await loadSlots()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove')
    }
  }

  const applyBulk = async () => {
    if (!bulkFrom || !bulkTo) {
      toast.error('Select from and to dates for bulk apply')
      return
    }
    setSaving(true)
    try {
      await api.experts.addAvailabilityBulk(expertId, {
        days_of_week: bulkDays,
        start_time: startTime,
        end_time: endTime,
        from_date: bulkFrom,
        to_date: bulkTo,
      })
      toast.success('Recurring availability added')
      await loadSlots()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Bulk apply failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleBulkDay = (d: number) => {
    setBulkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="rounded-xl border border-[#DCDCDC] bg-white p-4">
        <DayPicker
          mode="single"
          selected={selectedDay}
          onSelect={setSelectedDay}
          month={month}
          onMonthChange={setMonth}
          modifiers={{
            hasSlots: (date) => daysWithSlots.has(format(date, 'yyyy-MM-dd')),
          }}
          modifiersClassNames={{
            hasSlots: 'font-bold text-[#008260]',
          }}
        />
        {loading && <p className="text-xs text-[#6A6A6A] mt-2">Loading…</p>}
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-[#DCDCDC] bg-white p-4 space-y-4">
          <h3 className="font-semibold text-[#000000]">
            {selectedDay ? format(selectedDay, 'EEEE, d MMMM yyyy') : 'Select a day'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <Button type="button" onClick={addSlotForDay} disabled={saving || !selectedDay} className="bg-[#008260] hover:bg-[#006B4F] text-white w-full">
            Add availability for this day
          </Button>
          <ul className="space-y-2">
            {slotsForSelectedDay.length === 0 ? (
              <li className="text-sm text-[#6A6A6A]">No slots on this day.</li>
            ) : (
              slotsForSelectedDay.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm border border-[#E8E8E8] rounded-lg px-3 py-2">
                  <span>
                    {format(new Date(s.start_at), 'h:mm a')} – {format(new Date(s.end_at), 'h:mm a')}
                  </span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => deleteSlot(s.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-[#DCDCDC] bg-white p-4 space-y-4">
          <h3 className="font-semibold text-[#000000]">Apply to multiple days</h3>
          <p className="text-xs text-[#6A6A6A]">Same time window on selected weekdays across a date range.</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <label key={d.id} className="inline-flex items-center gap-1 text-sm cursor-pointer">
                <Checkbox checked={bulkDays.includes(d.id)} onCheckedChange={() => toggleBulkDay(d.id)} />
                {d.label}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From date</Label>
              <Input type="date" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)} />
            </div>
            <div>
              <Label>To date</Label>
              <Input type="date" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={applyBulk} disabled={saving} className="w-full border-[#008260] text-[#008260]">
            Apply recurring schedule
          </Button>
        </div>
      </div>
    </div>
  )
}
