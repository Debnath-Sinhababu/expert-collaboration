'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Banknote, FileText, ReceiptText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PermissionGate } from '@/components/superadmin/common/PermissionGate'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'
import { superAdminApi } from '@/lib/superadmin/api'

const PAGE_SIZE = 15

function money(value: unknown) {
  return `Rs. ${Number(value || 0).toFixed(2)}`
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function statusClass(status?: string) {
  if (status === 'paid') return 'bg-emerald-50 text-[#008260]'
  if (status === 'invoiced') return 'bg-blue-50 text-blue-700'
  if (status === 'cancelled') return 'bg-red-50 text-red-700'
  return 'bg-amber-50 text-amber-700'
}

function FinanceMetricCard({
  label,
  value,
  icon: Icon,
  tone = 'green',
  helper,
}: {
  label: string
  value: string
  icon: typeof Banknote
  tone?: 'green' | 'blue' | 'amber' | 'slate'
  helper: string
}) {
  const styles = {
    green: 'border-emerald-200 bg-emerald-50 text-[#008260]',
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }[tone]

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#008260]/30 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${styles}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="break-words text-[clamp(1.25rem,1.7vw,1.9rem)] font-bold leading-tight tracking-tight text-slate-950">
        {value}
      </p>
    </article>
  )
}

export default function SuperAdminFinancePage() {
  const [summary, setSummary] = useState<any>({})
  const [activeTab, setActiveTab] = useState<'institution' | 'expert' | 'invoices'>('institution')
  const [rows, setRows] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const partyType = activeTab === 'expert' ? 'expert' : 'institution'

  async function loadSummary() {
    try {
      setSummary(await superAdminApi.financeSummary())
    } catch {
      setSummary({})
    }
  }

  async function loadRows() {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'invoices') {
        const res = await superAdminApi.financeInvoices({
          page,
          limit: PAGE_SIZE,
          recipient_type: status === 'expert' || status === 'institution' ? status : '',
          search,
        })
        setInvoices(res.data || [])
        setRows([])
        setTotal(res.total || 0)
      } else {
        const res = await superAdminApi.financePayments({
          party_type: partyType,
          status: status === 'all' ? '' : status,
          page,
          limit: PAGE_SIZE,
          search,
        })
        setRows(res.data || [])
        setInvoices([])
        setTotal(res.total || 0)
      }
    } catch (err) {
      setRows([])
      setInvoices([])
      setTotal(0)
      setError(err instanceof Error ? err.message : 'Failed to load finance records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [])

  useEffect(() => {
    loadRows()
  }, [activeTab, page, status])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      loadRows()
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  function openPayment(row: any) {
    setSelected(row)
    setInvoiceAmount(String(row.invoice_amount || row.calculated_amount || 0))
    setPaidAmount(String(row.paid_amount || row.invoice_amount || row.calculated_amount || 0))
    setNotes(row.notes || '')
  }

  async function refreshAfterChange(updated?: any) {
    if (updated) {
      setSelected(updated)
      setInvoiceAmount(String(updated.invoice_amount || updated.calculated_amount || 0))
      setPaidAmount(String(updated.paid_amount || updated.invoice_amount || updated.calculated_amount || 0))
      setNotes(updated.notes || '')
    }
    await Promise.all([loadSummary(), loadRows()])
  }

  async function sendInvoice() {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await superAdminApi.sendFinanceInvoice(selected.id, {
        invoice_amount: Number(invoiceAmount || 0),
        notes,
      })
      toast.success('Invoice sent')
      await refreshAfterChange(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invoice')
    } finally {
      setSaving(false)
    }
  }

  async function markPaid() {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await superAdminApi.markFinancePaymentPaid(selected.id, {
        paid_amount: Number(paidAmount || 0),
        notes,
      })
      toast.success('Payment marked paid')
      await refreshAfterChange(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark paid')
    } finally {
      setSaving(false)
    }
  }

  const tableTitle = activeTab === 'expert'
    ? 'Expert Payments'
    : activeTab === 'institution'
      ? 'Institute Payments'
      : 'Generated Invoices'

  const statusOptions = useMemo(() => (
    activeTab === 'invoices'
      ? [
          { value: 'all', label: 'All recipients' },
          { value: 'institution', label: 'Institute invoices' },
          { value: 'expert', label: 'Expert invoices' },
        ]
      : [
          { value: 'all', label: 'All statuses' },
          { value: 'pending', label: 'Pending' },
          { value: 'invoiced', label: 'Invoiced' },
          { value: 'paid', label: 'Paid' },
          { value: 'cancelled', label: 'Cancelled' },
        ]
  ), [activeTab])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <FinanceMetricCard label="Receivable" value={money(summary.total_receivable)} icon={Banknote} helper="Institute collections" />
        <FinanceMetricCard label="Payable" value={money(summary.total_payable)} icon={Banknote} tone="blue" helper="Expert payouts" />
        <FinanceMetricCard label="Invoiced" value={money(summary.invoiced)} icon={ReceiptText} tone="blue" helper="Invoices sent" />
        <FinanceMetricCard label="Paid" value={money(summary.paid)} icon={ReceiptText} helper="Settled amount" />
        <FinanceMetricCard label="Pending" value={money(summary.pending)} icon={FileText} tone="amber" helper="Awaiting invoice" />
      </div>

      <SectionCard
        title="Finance Operations"
        description="Manage institute collections and expert payouts from approved training attendance."
      >
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as typeof activeTab)
              setStatus('all')
              setPage(1)
            }}
          >
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-lg bg-slate-100 p-1 lg:w-[520px]">
              <TabsTrigger value="institution">Institute Payments</TabsTrigger>
              <TabsTrigger value="expert">Expert Payments</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-9 sm:w-64" placeholder="Search project, person, email" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1) }}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        {activeTab === 'invoices' ? (
          <DataTable
            rows={invoices}
            columns={[
              { key: 'invoice', header: 'Invoice', render: (row) => <span className="font-semibold text-slate-950">{row.invoice_number}</span> },
              { key: 'recipient', header: 'Recipient', render: (row) => <div><p>{row.recipient_name || '-'}</p><p className="text-xs text-slate-500">{row.recipient_email}</p></div> },
              { key: 'type', header: 'Type', render: (row) => row.recipient_type },
              { key: 'amount', header: 'Amount', render: (row) => money(row.amount) },
              { key: 'sent', header: 'Sent', render: (row) => formatDate(row.sent_at || row.created_at) },
              { key: 'pdf', header: 'PDF', render: (row) => row.pdf_url ? <a className="font-medium text-[#008260]" href={row.pdf_url} target="_blank" rel="noreferrer">Open</a> : '-' },
            ]}
            emptyText="No invoices generated yet."
          />
        ) : (
          <DataTable
            rows={rows}
            columns={[
              { key: 'project', header: 'Project', render: (row) => <span className="font-semibold text-slate-950">{row.projects?.title || row.project_id}</span> },
              { key: 'party', header: activeTab === 'expert' ? 'Expert' : 'Institute', render: (row) => {
                const party = activeTab === 'expert' ? row.experts : row.institutions
                return <div><p>{party?.name || '-'}</p><p className="text-xs text-slate-500">{party?.email}</p></div>
              } },
              { key: 'other', header: activeTab === 'expert' ? 'Institute' : 'Expert', render: (row) => {
                const party = activeTab === 'expert' ? row.institutions : row.experts
                return party?.name || '-'
              } },
              { key: 'hours', header: 'Hours', render: (row) => Number(row.approved_hours || 0).toFixed(2) },
              { key: 'rate', header: 'Rate', render: (row) => money(row.hourly_rate_snapshot) },
              { key: 'amount', header: 'Amount', render: (row) => money(row.invoice_amount || row.calculated_amount) },
              { key: 'status', header: 'Status', render: (row) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(row.status)}`}>{row.status}</span> },
              { key: 'action', header: '', render: (row) => <Button type="button" size="sm" variant="outline" onClick={() => openPayment(row)}>Details</Button> },
            ]}
            emptyText={`No ${activeTab} payment records found.`}
          />
        )}
        <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
      </SectionCard>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.party_type === 'expert' ? 'Expert Payout' : 'Institute Collection'}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm md:grid-cols-2">
                <div><span className="text-slate-500">Project</span><p className="font-medium text-slate-950">{selected.projects?.title || selected.project_id}</p></div>
                <div><span className="text-slate-500">Booking</span><p className="font-medium text-slate-950">{selected.booking_id}</p></div>
                <div><span className="text-slate-500">Expert</span><p className="font-medium text-slate-950">{selected.experts?.name || '-'}</p></div>
                <div><span className="text-slate-500">Institute</span><p className="font-medium text-slate-950">{selected.institutions?.name || '-'}</p></div>
                <div><span className="text-slate-500">Approved hours</span><p className="font-medium text-slate-950">{Number(selected.approved_hours || 0).toFixed(2)}</p></div>
                <div><span className="text-slate-500">Hourly rate</span><p className="font-medium text-slate-950">{money(selected.hourly_rate_snapshot)}</p></div>
                <div><span className="text-slate-500">Calculated amount</span><p className="font-medium text-slate-950">{money(selected.calculated_amount)}</p></div>
                <div><span className="text-slate-500">Current status</span><p className="font-medium capitalize text-slate-950">{selected.status}</p></div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoiceAmount">Invoice amount</Label>
                  <Input id="invoiceAmount" type="number" min="0" step="0.01" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Paid amount</Label>
                  <Input id="paidAmount" type="number" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="financeNotes">Notes</Label>
                  <Textarea id="financeNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional internal notes" />
                </div>
              </div>

              {selected.invoice?.pdf_url || selected.pdf_url ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm">
                  <p className="font-semibold text-[#008260]">Latest invoice sent</p>
                  <a className="mt-1 inline-block text-[#008260] underline" href={selected.invoice?.pdf_url || selected.pdf_url} target="_blank" rel="noreferrer">
                    {selected.invoice?.invoice_number || 'Open invoice PDF'}
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>Close</Button>
            <PermissionGate permission="finance:confirm" fallback={null}>
              <Button type="button" variant="outline" onClick={sendInvoice} disabled={saving || !selected}>
                {saving ? 'Working...' : 'Send Invoice'}
              </Button>
              <Button type="button" className="bg-[#008260] hover:bg-[#006d51]" onClick={markPaid} disabled={saving || !selected}>
                {saving ? 'Working...' : 'Mark Paid'}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
