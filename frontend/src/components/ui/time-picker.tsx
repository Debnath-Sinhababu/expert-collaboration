"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface TimePickerProps {
  value?: string
  onChange?: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  format?: "12" | "24"
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
  className,
  format = "24"
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [timeValue, setTimeValue] = React.useState(value || "")

  React.useEffect(() => {
    setTimeValue(value || "")
  }, [value])

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime)
  }

  const handleApply = () => {
    onChange?.(timeValue)
    setOpen(false)
  }

  const handleCancel = () => {
    setTimeValue(value || "")
    setOpen(false)
  }

  const displayValue = React.useMemo(() => {
    if (!timeValue) return placeholder
    return timeValue
  }, [timeValue, placeholder])

  // Generate time options for 24-hour format
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !timeValue && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start" 
     
      >
        <div className="p-3" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-3">
            <div>
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => {
               
                  handleTimeChange(e.target.value)
                }}
                className="w-full"
                step="900" // 15-minute intervals
              
              />
            </div>
            
            {/* Quick time options */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Quick select:</p>
              <div className="grid grid-cols-4 gap-1 max-h-32 overflow-y-auto">
                {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((time) => (
                  <Button
                    key={time}
                    variant={timeValue === time ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 text-xs ${timeValue===time ? '!bg-[#ECF2FF] text-black':''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTimeChange(time)
                    }}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCancel()
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleApply()
                }}
                className="bg-[#008260] hover:bg-[#008260]"
                disabled={!timeValue}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
