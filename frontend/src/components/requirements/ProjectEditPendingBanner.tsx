'use client'

import { Clock3 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Props = {
  submittedAt?: string | null
  className?: string
}

export function ProjectEditPendingBanner({ submittedAt, className = '' }: Props) {
  return (
    <Alert className={`border-amber-200 bg-amber-50 text-amber-950 ${className}`}>
      <Clock3 className="h-4 w-4 text-amber-700" />
      <AlertDescription className="text-sm leading-relaxed text-amber-950">
        <span className="font-semibold">Changes pending admin approval.</span>{' '}
        This project already has bookings, so your latest edits are queued for review and are not live yet.
        {submittedAt ? (
          <span className="mt-1 block text-amber-900/90">
            Submitted {new Date(submittedAt).toLocaleString()}
          </span>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
