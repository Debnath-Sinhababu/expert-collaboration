'use client'

import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  rows: T[]
  columns: Column<T>[]
  emptyText?: string
}

export function DataTable<T>({ rows, columns, emptyText = 'No records found.' }: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50/90">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.length ? rows.map((row, index) => (
            <tr key={index} className="transition hover:bg-emerald-50/40">
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-4 py-4 align-middle text-slate-700">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-14 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">{emptyText}</p>
                  <p className="mt-1 text-xs text-slate-500">Try changing filters or creating a new record.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  )
}
