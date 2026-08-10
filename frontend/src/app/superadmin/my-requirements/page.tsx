'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, FileUp, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { superAdminApi } from '@/lib/superadmin/api'
import { projectStatusLabel } from '@/lib/projectStatus'

export default function MySuperAdminRequirementsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [summary, setSummary] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10))
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    superAdminApi.assignedRequirements()
      .then((res) => setRows(res.data || []))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load assigned requirements'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function uploadReport(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !file) {
      toast.error('Choose a report file')
      return
    }
    const fd = new FormData()
    fd.append('report_date', reportDate)
    fd.append('summary', summary)
    fd.append('report', file)
    setSaving(true)
    try {
      await superAdminApi.uploadRequirementReport(selected.requirement_type, selected.requirement_id, fd)
      toast.success('Daily report uploaded')
      setSelected(null)
      setSummary('')
      setFile(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  const running = rows.filter((row) => row.requirement?.derived_status === 'running' || row.requirement?.status === 'running').length
  const open = rows.filter((row) => {
    const status = row.requirement?.derived_status || row.requirement?.status
    return status === 'open' || status === 'pending'
  }).length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Assigned To Me" value={rows.length} icon={ListChecks} helper="Active owned requirements" />
        <StatCard label="Running" value={running} icon={ArrowRight} tone="blue" helper="Live work" />
        <StatCard label="Open" value={open} icon={FileUp} tone="amber" helper="Open for applications" />
      </div>

      <SectionCard title="My Requirements" description="Requirements assigned to your admin account. Upload daily reports from here.">
        {loading ? <p className="text-sm text-slate-600">Loading assignments...</p> : null}
        <div className="grid gap-3">
          {rows.length ? rows.map((row) => (
            <article key={row.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{row.requirement_type}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-[#008260]">
                      {projectStatusLabel(row.requirement?.derived_status || row.requirement?.status)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-950">{row.requirement?.title || row.requirement_id}</h3>
                  <p className="mt-1 text-sm text-slate-600">{row.requirement?.institutions?.name || row.requirementDetail?.institution?.name || 'Institution unavailable'}</p>
                  <p className="mt-2 text-xs text-slate-500">Assigned {row.assigned_at ? new Date(row.assigned_at).toLocaleDateString() : '-'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => setSelected(row)} className="bg-[#008260] hover:bg-[#006d51]">
                    <FileUp className="mr-2 h-4 w-4" />
                    Daily report
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/superadmin/requirements/${row.requirement_type}:${row.requirement_id}`}>
                      Open
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">No requirements are assigned to you.</div>
          )}
        </div>
      </SectionCard>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Daily Report</DialogTitle>
            <DialogDescription>{selected?.requirement?.title || 'Assigned requirement'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={uploadReport} className="space-y-4">
            <div className="space-y-2">
              <Label>Report date</Label>
              <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short daily update" />
            </div>
            <div className="space-y-2">
              <Label>Document</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
              <p className="text-xs text-slate-500">PDF, Word, Excel, JPG, PNG, or WebP up to 20MB.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelected(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" className="bg-[#008260] hover:bg-[#006d51]" disabled={saving}>{saving ? 'Uploading...' : 'Upload'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
