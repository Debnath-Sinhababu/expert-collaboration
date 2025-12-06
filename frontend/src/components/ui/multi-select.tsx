"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface MultiSelectProps {
  options: string[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      selected,
      onSelectionChange,
      placeholder = "Select items...",
      className,
      disabled,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)

    const handleToggle = (option: string) => {
      if (selected.includes(option)) {
        onSelectionChange(selected.filter((item) => item !== option))
      } else {
        onSelectionChange([...selected, option])
      }
    }

    const handleRemove = (option: string) => {
      onSelectionChange(selected.filter((item) => item !== option))
    }

    const handleClearAll = () => {
      onSelectionChange([])
    }

    return (
      <div ref={ref} className={cn("relative", className)}>
        <Popover open={open} onOpenChange={setOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-10 px-3 py-2 border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300 bg-transparent hover:bg-transparent"
              disabled={disabled}
            >
              <div className="flex items-center gap-1 flex-1 min-w-0">
                {selected.length > 0 ? (
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-[calc(100%-2rem)]">
                    {selected.map((item) => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="shrink-0 text-xs whitespace-nowrap bg-[#008260]/10 text-[#008260] border-[#008260]/20"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemove(item)
                          }}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 truncate">
                    {placeholder}
                  </span>
                )}
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-[#D6D6D6]" align="start">
            <div className="max-h-60 overflow-y-auto">
              {selected.length > 0 && (
                <div className="p-2 border-b border-[#D6D6D6]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-8 px-2 text-xs text-[#008260] hover:bg-[#008260]/10"
                  >
                    Clear all
                  </Button>
                </div>
              )}
              <div className="p-1">
                {options.map((option) => (
                  <div
                    key={option}
                    className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-[#008260]/10 cursor-pointer"
                    onMouseDown={(e) => e.preventDefault()} // ✅ Prevent popover from closing
                    onClick={() => handleToggle(option)}
                  >
                    <Checkbox
                      checked={selected.includes(option)}
                      onCheckedChange={() => handleToggle(option)}
                      onMouseDown={(e) => e.preventDefault()} // ✅ Same here
                      className="border-slate-300 data-[state=checked]:bg-[#008260] data-[state=checked]:border-[#008260]"
                    />
                    <span className="flex-1 text-sm text-slate-700">{option}</span>
                    {selected.includes(option) && (
                      <Check className="h-4 w-4 text-[#008260]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

MultiSelect.displayName = "MultiSelect"

export { MultiSelect }
