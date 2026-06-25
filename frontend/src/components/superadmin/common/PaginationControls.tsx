'use client'

import { Button } from '@/components/ui/button'

export function PaginationControls({
  page,
  limit,
  total,
  loading,
  onPageChange,
}: {
  page: number
  limit: number
  total?: number
  loading?: boolean
  onPageChange: (page: number) => void
}) {
  const safeTotal = typeof total === 'number' && total >= 0 ? total : 0
  const totalPages = safeTotal > 0 ? Math.ceil(safeTotal / limit) : 1
  const hasPrevious = page > 1
  const hasNext = page < totalPages
  const start = safeTotal === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, safeTotal)

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        {safeTotal === 0 ? 'No records' : `Showing ${start}-${end} of ${safeTotal}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || !hasPrevious}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <span className="min-w-20 text-center text-sm font-medium text-slate-700">
          Page {page} / {totalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || !hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
