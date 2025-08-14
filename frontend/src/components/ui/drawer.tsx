"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
  className?: string
}

const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  ({ open, onOpenChange, children, title, className, ...props }, ref) => {
    if (!open) return null

    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => onOpenChange(false)}
        />
        {/* Drawer */}
        <div
          ref={ref}
          className={cn(
            "fixed right-0 top-0 h-full w-full sm:w-[50%] lg:w-[40%] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
            className
          )}
          {...props}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          )}
          {/* Content */}
          <div className="h-full overflow-hidden flex flex-col">
            {children}
          </div>
        </div>
      </>
    )
  }
)

Drawer.displayName = "Drawer"

export { Drawer }
