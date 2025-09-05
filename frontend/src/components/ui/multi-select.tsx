"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MultiSelectProps {
  options: string[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select items...",
  className,
  disabled,
}: MultiSelectProps) {
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
    <div className={cn("relative", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between h-10 px-3 py-2"
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
                <span className="text-muted-foreground truncate">
                  {placeholder}
                </span>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-full max-h-60 overflow-y-auto"
         onSelect={(e) => e.preventDefault()}
        >
          {selected.length > 0 && (
            <>
              <button
                className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                onClick={handleClearAll}
              >
                Clear all
              </button>
              <DropdownMenuSeparator />
            </>
          )}
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={selected.includes(option)}
              onCheckedChange={() => handleToggle(option)}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
