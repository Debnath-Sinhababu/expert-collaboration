import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatInterviewSlotRange } from '@/lib/datetime'

export type InterviewSlot = {
  start_at: string
  end_at: string
}

type Props = {
  slots: InterviewSlot[]
  onChange?: (slots: InterviewSlot[]) => void
  selectable?: boolean
  selectedSlot?: InterviewSlot | null
  onSelectSlot?: (slot: InterviewSlot) => void
}

function slotLabel(slot: InterviewSlot) {
  return formatInterviewSlotRange(slot)
}

function emptySlot(): InterviewSlot {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  const end = new Date(now)
  end.setHours(end.getHours() + 1)
  return {
    start_at: now.toISOString().slice(0, 16),
    end_at: end.toISOString().slice(0, 16),
  }
}

export function InterviewAvailabilitySelector({
  slots,
  onChange,
  selectable = false,
  selectedSlot,
  onSelectSlot,
}: Props) {
  const updateSlot = (index: number, key: keyof InterviewSlot, value: string) => {
    const next = slots.map((slot, i) => (i === index ? { ...slot, [key]: value } : slot))
    onChange?.(next)
  }

  if (selectable) {
    if (!slots.length) {
      return <p className="text-sm text-[#6A6A6A]">No interview slots proposed by expert.</p>
    }
    return (
      <div className="space-y-2">
        {slots.map((slot, index) => {
          const isSelected = selectedSlot?.start_at === slot.start_at && selectedSlot?.end_at === slot.end_at
          return (
            <button
              key={`${slot.start_at}-${slot.end_at}-${index}`}
              type="button"
              onClick={() => onSelectSlot?.(slot)}
              className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${isSelected ? 'border-[#008260] bg-[#E8F5F1]' : 'border-[#DCDCDC] bg-white hover:border-[#008260]'}`}
            >
              {slotLabel(slot)}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-[#DCDCDC] bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label className="text-sm font-medium text-slate-700">Interview availability</Label>
          <p className="mt-1 text-xs text-[#6A6A6A]">Add up to 3 timings when you are available.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={slots.length >= 3}
          onClick={() => onChange?.([...slots, emptySlot()])}
          className="w-full sm:w-auto"
        >
          Add slot
        </Button>
      </div>
      <div className="space-y-3">
        {slots.map((slot, index) => (
          <div key={index} className="rounded-lg border border-[#ECECEC] bg-[#F8FBFA] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#000000]">Slot {index + 1}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange?.(slots.filter((_, i) => i !== index))}
                className="h-8 px-3 text-xs"
              >
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <Label className="text-xs">Start</Label>
                <Input
                  type="datetime-local"
                  value={slot.start_at}
                  onChange={(e) => updateSlot(index, 'start_at', e.target.value)}
                  className="w-full min-w-0 text-sm"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-xs">End</Label>
                <Input
                  type="datetime-local"
                  value={slot.end_at}
                  onChange={(e) => updateSlot(index, 'end_at', e.target.value)}
                  className="w-full min-w-0 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {slots.length > 0 && <Badge variant="secondary">{slots.length}/3 slots added</Badge>}
    </div>
  )
}
