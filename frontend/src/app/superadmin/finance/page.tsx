'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ArrowDownLeft, ArrowUpRight, Banknote, FileText, ReceiptText, Scale, Search } from 'lucide-react'
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
import { compensationUnitShortLabel, resolveBookingSettlementRates } from '@/lib/projectCompensation'

const PAGE_SIZE = 15

function money(value: unknown) {
  return `Rs. ${Number(value || 0).toFixed(2)}`
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function paymentPayUnit(row: any): string {
  const fromBooking =
    row?.booking?.compensation_unit ||
    row?.projects?.compensation_unit ||
    row?.booking?.projects?.compensation_unit
  if (fromBooking) return compensationUnitShortLabel(fromBooking)
  const rates = resolveBookingSettlementRates(row?.booking || { projects: row?.projects })
  return rates.unitShort || 'unit'
}

function formatRateWithUnit(row: any): string {
  const rate = row?.settlement?.rate_per_unit ?? row?.hourly_rate_snapshot
  const unit =
    row?.settlement?.unit_short ||
    paymentPayUnit(row)
  return `${money(rate)} / ${unit}`
}

function institutionContractQty(row: any): string {
  const qty = Number(row?.settlement?.contract_quantity)
  return qty > 0 ? String(qty) : '—'
}

/** Display label — DB still stores invoiced/paid; partial is derived from amounts. */
function displayPaymentStatus(row: any): string {
  const due = Number(row?.invoice_amount || row?.calculated_amount || 0)
  const paid = Number(row?.paid_amount || 0)
  const status = String(row?.status || 'pending').toLowerCase()
  if (status === 'paid' || (due > 0 && paid + 0.001 >= due)) return 'paid'
  if (paid > 0 && due > 0 && paid + 0.001 < due) return 'partial paid'
  return status
}

function statusClass(status?: string) {
  const key = String(status || '').toLowerCase()
  if (key === 'paid') return 'bg-emerald-50 text-[#008260]'
  if (key === 'partial paid') return 'bg-violet-50 text-violet-700'
  if (key === 'invoiced') return 'bg-blue-50 text-blue-700'
  if (key === 'cancelled') return 'bg-red-50 text-red-700'
  return 'bg-amber-50 text-amber-700'
}

function FinanceMetricCard({
  label,
  value,
  icon: Icon,
  tone = 'green',
  helper,
  footnote,
}: {
  label: string
  value: string
  icon: typeof Banknote
  tone?: 'green' | 'blue' | 'amber' | 'slate'
  helper: string
  footnote?: string
}) {
  const styles = {
    green: 'border-emerald-200 bg-emerald-50 text-[#008260]',
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }[tone]

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#008260]/30 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-xs leading-snug text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${styles}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="break-words text-[clamp(1.15rem,1.6vw,1.75rem)] font-bold leading-tight tracking-tight text-slate-950">
        {value}
      </p>
      {footnote ? <p className="mt-2 text-[11px] leading-snug text-slate-400">{footnote}</p> : null}
    </article>
  )
}

function FinanceStatSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  )
}

function emptyParty() {
  return {
    pipeline: 0,
    awaiting_invoice: 0,
    invoice_sent: 0,
    settled: 0,
    outstanding: 0,
    remaining: 0,
    cancelled: 0,
    counts: { pending: 0, invoiced: 0, paid: 0, cancelled: 0, other: 0 },
  }
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
    const due = Number(row.invoice_amount || row.calculated_amount || 0)
    const paid = Number(row.paid_amount || 0)
    setInvoiceAmount(String(due))
    setPaidAmount(String(paid))
    setNotes(row.notes || '')
  }

  async function refreshAfterChange(updated?: any) {
    if (updated) {
      setSelected(updated)
      const due = Number(updated.invoice_amount || updated.calculated_amount || 0)
      const paid = Number(updated.paid_amount || 0)
      setInvoiceAmount(String(due))
      setPaidAmount(String(paid))
      setNotes(updated.notes || '')
    }
    await Promise.all([loadSummary(), loadRows()])
  }

  async function sendInvoice() {
    if (!selected) return
    const amount = Number(invoiceAmount || 0)
    if (!(amount > 0)) {
      toast.error('Invoice amount must be greater than zero')
      return
    }
    setSaving(true)
    try {
      const updated = await superAdminApi.sendFinanceInvoice(selected.id, {
        invoice_amount: amount,
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
    const amount = Number(paidAmount || 0)
    if (!(amount > 0)) {
      toast.error('Enter the amount actually paid (cannot be zero)')
      return
    }
    setSaving(true)
    try {
      const updated = await superAdminApi.markFinancePaymentPaid(selected.id, {
        paid_amount: amount,
        notes,
      })
      const due = Number(updated?.invoice_amount || updated?.calculated_amount || invoiceAmount || 0)
      toast.success(
        amount + 0.001 >= due ? 'Marked as fully paid' : 'Partial payment saved'
      )
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
          { value: 'invoiced', label: 'Invoiced / partial paid' },
          { value: 'paid', label: 'Paid' },
          { value: 'cancelled', label: 'Cancelled' },
        ]
  ), [activeTab])

  const institute = summary.institute || emptyParty()
  const expert = summary.expert || emptyParty()
  const platform = summary.platform || { expected_margin: 0, realized_margin: 0, outstanding_net: 0 }

  const countLabel = (n: number, singular = 'payment', plural = 'payments') =>
    `${n} ${n === 1 ? singular : plural}`

  return (
    <div className="space-y-6">
      <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
        <FinanceStatSection
          title="Quick picture"
          description="The most useful numbers to check first."
        >
          <FinanceMetricCard
            label="CalxMap’s share (expected)"
            value={money(platform.expected_margin)}
            icon={Scale}
            tone="slate"
            helper="If everything currently listed gets paid as planned"
            footnote="Institute total minus expert total"
          />
          <FinanceMetricCard
            label="CalxMap’s share (already received)"
            value={money(platform.realized_margin)}
            icon={Banknote}
            helper="Based on amounts actually paid so far (including partials)"
            footnote="Money in from institutes minus money out to experts"
          />
          <FinanceMetricCard
            label="Still to collect from institutes"
            value={money(institute.outstanding)}
            icon={ArrowDownLeft}
            tone="amber"
            helper="Invoice due minus what institutes have paid"
            footnote={`${countLabel(institute.counts.pending || 0)} not billed yet · ${countLabel(institute.counts.invoiced || 0)} billed, unpaid`}
          />
          <FinanceMetricCard
            label="Still to pay to experts"
            value={money(expert.outstanding)}
            icon={ArrowUpRight}
            tone="blue"
            helper="Invoice due minus what has been paid out"
            footnote={`${countLabel(expert.counts.pending || 0)} not billed yet · ${countLabel(expert.counts.invoiced || 0)} billed, unpaid`}
          />
        </FinanceStatSection>

        <FinanceStatSection
          title="Money from institutes"
          description="What institutes owe CalxMap, and what they have already paid."
        >
          <FinanceMetricCard
            label="Total for institutes"
            value={money(institute.pipeline)}
            icon={Banknote}
            helper="Everything currently on the books for institutes"
            footnote="Not billed + billed + already paid"
          />
          <FinanceMetricCard
            label="Not billed yet"
            value={money(institute.awaiting_invoice)}
            icon={FileText}
            tone="amber"
            helper="Work is done / listed, but no invoice has been sent"
            footnote={countLabel(institute.counts.pending || 0)}
          />
          <FinanceMetricCard
            label="Invoice sent, waiting for payment"
            value={money(institute.invoice_sent)}
            icon={ReceiptText}
            tone="blue"
            helper="Remaining balance on sent invoices"
            footnote={countLabel(institute.counts.invoiced || 0)}
          />
          <FinanceMetricCard
            label="Already received"
            value={money(institute.settled)}
            icon={Banknote}
            helper="Sum of paid amounts from institutes"
            footnote={`${countLabel(institute.counts.paid || 0)} fully paid`}
          />
        </FinanceStatSection>

        <FinanceStatSection
          title="Money to experts"
          description="What CalxMap owes experts, and what has already been paid out."
        >
          <FinanceMetricCard
            label="Total for experts"
            value={money(expert.pipeline)}
            icon={Banknote}
            tone="blue"
            helper="Everything currently on the books for experts"
            footnote="Not billed + billed + already paid"
          />
          <FinanceMetricCard
            label="Not billed yet"
            value={money(expert.awaiting_invoice)}
            icon={FileText}
            tone="amber"
            helper="Ready to pay, but payout invoice has not been sent"
            footnote={countLabel(expert.counts.pending || 0)}
          />
          <FinanceMetricCard
            label="Invoice sent, waiting to pay out"
            value={money(expert.invoice_sent)}
            icon={ReceiptText}
            tone="blue"
            helper="Remaining balance on sent payout invoices"
            footnote={countLabel(expert.counts.invoiced || 0)}
          />
          <FinanceMetricCard
            label="Already paid to experts"
            value={money(expert.settled)}
            icon={Banknote}
            helper="Sum of amounts paid out so far"
            footnote={`${countLabel(expert.counts.paid || 0)} fully paid`}
          />
        </FinanceStatSection>
      </div>

      <SectionCard
        title="Payment list"
        description="Open a payment to send an invoice or mark it as paid."
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
              {
                key: 'hours',
                header: activeTab === 'institution' ? 'Contract qty' : 'Approved qty / hrs',
                render: (row) => {
                  if (activeTab === 'institution') return institutionContractQty(row)
                  return Number(row.approved_hours || 0).toFixed(2)
                },
              },
              {
                key: 'rate',
                header: activeTab === 'institution' ? 'Gross rate' : 'Net rate',
                render: (row) => formatRateWithUnit(row),
              },
              {
                key: 'amount',
                header: activeTab === 'institution' ? 'Institute total' : 'Amount',
                render: (row) => money(row.invoice_amount || row.calculated_amount),
              },
              {
                key: 'paid',
                header: 'Paid amount',
                render: (row) => money(row.paid_amount),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => {
                  const label = displayPaymentStatus(row)
                  return (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(label)}`}>
                      {label}
                    </span>
                  )
                },
              },
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
                {selected.party_type === 'institution' ? (
                  <>
                    <div>
                      <span className="text-slate-500">Contract qty</span>
                      <p className="font-medium text-slate-950">{institutionContractQty(selected)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Gross rate</span>
                      <p className="font-medium text-slate-950">{formatRateWithUnit(selected)}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500">Institute total (calculated)</span>
                      <p className="font-medium text-slate-950">
                        {money(selected.settlement?.expected_amount ?? selected.calculated_amount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Formula: {selected.settlement?.formula || 'gross_rate × contract_qty'}
                        {selected.settlement?.rate_per_unit != null && selected.settlement?.contract_quantity != null
                          ? ` = ${money(selected.settlement.rate_per_unit)} × ${selected.settlement.contract_quantity}`
                          : ''}
                      </p>
                      {selected.status !== 'pending' &&
                      Number(selected.invoice_amount || selected.calculated_amount) !==
                        Number(selected.settlement?.expected_amount || 0) ? (
                        <p className="mt-1 text-xs text-amber-700">
                          Saved invoice amount is {money(selected.invoice_amount || selected.calculated_amount)} (locked because status is {selected.status}).
                          Contract math is {money(selected.settlement?.expected_amount)}.
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-500">Approved hours</span>
                      <p className="font-medium text-slate-950">{Number(selected.approved_hours || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Net rate</span>
                      <p className="font-medium text-slate-950">{formatRateWithUnit(selected)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Calculated amount</span>
                      <p className="font-medium text-slate-950">{money(selected.calculated_amount)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Formula: net_rate × approved delivery qty
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-slate-500">Current status</span>
                  <p className="font-medium capitalize text-slate-950">{displayPaymentStatus(selected)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Paid amount</span>
                  <p className="font-medium text-slate-950">{money(selected.paid_amount)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoiceAmount">Invoice amount</Label>
                  <Input id="invoiceAmount" type="number" min="0" step="0.01" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />
                  <p className="text-xs text-slate-500">Amount on the invoice / payout statement</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Paid amount</Label>
                  <Input id="paidAmount" type="number" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
                  <p className="text-xs text-slate-500">
                    Amount actually received/paid so far.
                    {(() => {
                      const due = Number(invoiceAmount || 0)
                      const paid = Number(paidAmount || 0)
                      const remaining = Math.max(0, due - paid)
                      return ` Remaining: ${money(remaining)}`
                    })()}
                  </p>
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
                {saving ? 'Working...' : 'Save paid amount'}
              </Button>
            </PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
