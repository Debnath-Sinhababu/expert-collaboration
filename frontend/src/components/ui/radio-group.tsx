"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

interface RadioGroupItemProps {
  value: string
  id: string
  className?: string
  children: React.ReactNode
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn("grid gap-2", className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, children, ...props }, ref) => {
    return (
      <div className="flex items-center space-x-2">
        <input
          ref={ref}
          type="radio"
          id={id}
          value={value}
          className={cn(
            "h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500",
            className
          )}
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer">
          {children}
        </label>
      </div>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
