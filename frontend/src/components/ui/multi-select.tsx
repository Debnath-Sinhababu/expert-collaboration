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
  ({ options, selected, onSelectionChange, placeholder = "Select items...", className, disabled }, ref) => {
    const [open, setOpen] = React.useState(false)

    const handleToggle = (option: string) => {
      if (selected.includes(option)) {
        onSelectionChange(selected.filter(item => item !== option))
      } else {
        onSelectionChange([...selected, option])
      }
    }

    const handleRemove = (option: string) => {
      onSelectionChange(selected.filter(item => item !== option))
    }

    const handleClearAll = () => {
      onSelectionChange([])
    }

    return (
      <div ref={ref} className={cn("relative", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-10 px-3 py-2 border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300 bg-transparent"
              disabled={disabled}
            >
              <div className="flex items-center gap-1 flex-1 min-w-0">
                {selected.length > 0 ? (
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-[calc(100%-2rem)]">
                    {selected.map((item) => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="shrink-0 text-xs whitespace-nowrap"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemove(item)
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground truncate">{placeholder}</span>
                )}
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <div className="max-h-60 overflow-y-auto">
              {selected.length > 0 && (
                <div className="p-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-8 px-2 text-xs"
                  >
                    Clear all
                  </Button>
                </div>
              )}
              <div className="p-1">
                {options.map((option) => (
                  <div
                    key={option}
                    className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    onClick={() => handleToggle(option)}
                  >
                    <Checkbox
                      checked={selected.includes(option)}
                      onCheckedChange={() => handleToggle(option)}
                    />
                    <span className="flex-1 text-sm">{option}</span>
                    {selected.includes(option) && (
                      <Check className="h-4 w-4 text-primary" />
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
