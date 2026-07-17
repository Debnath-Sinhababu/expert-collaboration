'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { TrainingAttendancePanel } from '@/components/training/TrainingAttendancePanel'
import { RateIntentBadge } from '@/components/requirements/RateIntentBadge'
import { RateAgreementPanel } from '@/components/requirements/RateAgreementPanel'
import { ProjectEditRequestPanel } from '@/components/requirements/ProjectEditRequestPanel'
import { PostedCompensationRate } from '@/components/requirements/PostedCompensationRate'
import { BookingCompletionActions } from '@/components/bookings/BookingCompletionActions'
import { BookingAgreementActions } from '@/components/bookings/BookingAgreementActions'
import { useSuperAdminAccess } from '@/components/superadmin/layout/SuperAdminAccessContext'
import { superAdminApi } from '@/lib/superadmin/api'
import { formatInterviewDateTime, datetimeLocalToIso } from '@/lib/datetime'
import { canAccessAny } from '@/lib/superadmin/permissions'
import type { SuperAdminPermission } from '@/lib/superadmin/types'
import { getInstitutionRate } from '@/lib/utils'
import { setSuperAdminActingInstitutionId } from '@/lib/superAdminActing'
import {
  isPostedRateDeclined,
  isPostedRateOfferPending,
  isRateAgreed,
  moneyInr,
  projectCompensationDisplay,
  projectEngagementQuantityDisplay,
  bookingEngagementQuantityDisplay,
  resolveBookingSettlementRates,
  toExpertNet,
} from '@/lib/projectCompensation'
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  normalizeProjectStatus,
} from '@/lib/projectStatus'

const STAGES = [
  { value: 'pending', label: 'Pending' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'selected', label: 'Selected' },
]

const ADD_STAGES = [
  { value: 'added', label: 'Add as pending and notify' },
  { value: 'interview_scheduled', label: 'Schedule interview' },
]

function stageLabel(value: string) {
  if (value === 'added') return 'Pending'
  if (value === 'interview_scheduled') return 'Interview'
  if (value === 'completed') return 'Completed'
  return STAGES.find((stage) => stage.value === value)?.label || value
}

function isRejectedApplicationStatus(status?: string | null) {
  const value = String(status || '').toLowerCase()
  return value === 'rejected' || value === 'rejected_corporate'
}

function isRejectedPipelineStage(stage?: string | null) {
  return String(stage || '').toLowerCase() === 'rejected'
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function money(value: unknown) {
  return `Rs. ${Number(value || 0).toFixed(2)}`
}

function paymentSummaryCard(label: string, record: any) {
  if (!record) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-700">Not calculated yet</p>
      </div>
    )
  }
  const due = Number(record.invoice_amount || record.calculated_amount || 0)
  const paid = Number(record.paid_amount || 0)
  let statusLabel = String(record.status || 'pending').replace(/_/g, ' ')
  if (String(record.status || '').toLowerCase() === 'partial_paid') statusLabel = 'partial paid'
  else if (
    String(record.status || '').toLowerCase() === 'invoiced' &&
    paid > 0 &&
    due > 0 &&
    paid + 0.001 < due
  ) {
    statusLabel = 'partial paid'
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">{statusLabel}</span>
      </div>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        <div><span className="text-slate-500">Amount</span><p className="font-semibold text-slate-950">{money(record.invoice_amount || record.calculated_amount)}</p></div>
        <div><span className="text-slate-500">Paid</span><p className="font-semibold text-slate-950">{money(record.paid_amount)}</p></div>
        <div><span className="text-slate-500">Remaining</span><p className="font-semibold text-slate-950">{money(record.remaining_amount)}</p></div>
      </div>
      {record.pdf_url ? <a className="mt-2 inline-block text-sm font-medium text-[#008260]" href={record.pdf_url} target="_blank" rel="noreferrer">Open invoice</a> : null}
    </div>
  )
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 16)
}

export default function SuperAdminRequirementDetailPage() {
  const params = useParams<{ id: string }>()
  const me = useSuperAdminAccess()
  const [detail, setDetail] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeStage, setActiveStage] = useState('pending')
  const [expertSearch, setExpertSearch] = useState('')
  const [experts, setExperts] = useState<any[]>([])
  const [expertId, setExpertId] = useState('')
  const [stage, setStage] = useState('added')
  const [interviewAt, setInterviewAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [workflowSaving, setWorkflowSaving] = useState(false)
  const [dateEdits, setDateEdits] = useState({ start_date: '', end_date: '' })
  const [dateSaving, setDateSaving] = useState(false)
  const [bookingStatusSaving, setBookingStatusSaving] = useState<Record<string, boolean>>({})
  const [requirementStatusSaving, setRequirementStatusSaving] = useState(false)
  const [bookingEditOpen, setBookingEditOpen] = useState(false)
  const [bookingEditSaving, setBookingEditSaving] = useState(false)
  const [bookingEditTarget, setBookingEditTarget] = useState<any | null>(null)
  const [bookingEditForm, setBookingEditForm] = useState({
    total_budget: '',
    final_gross_per_unit: '',
    hours_booked: '',
    unit_quantity: '',
    start_date: '',
    end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    note: '',
  })
  const [interviewDialog, setInterviewDialog] = useState<null | {
    kind: 'pipeline' | 'native'
    row: any
    value: string
  }>(null)
  const [confirmActionDialog, setConfirmActionDialog] = useState<null | {
    title: string
    description: string
    confirmLabel: string
    destructive?: boolean
    onConfirm: () => Promise<void>
  }>(null)

  const decoded = decodeURIComponent(params.id)
  const { requirementType, requirementId } = useMemo(() => {
    const [type, ...rest] = decoded.split(':')
    return { requirementType: type || 'project', requirementId: rest.join(':') || decoded }
  }, [decoded])

  async function loadDetail() {
    setLoading(true)
    setError('')
    try {
      const res = await superAdminApi.requirementDetail(requirementType, requirementId)
      const institutionId = res?.requirement?.institution_id || res?.institution?.id || null
      if (institutionId) setSuperAdminActingInstitutionId(String(institutionId))
      setDetail(res)
    } catch (err) {
      setDetail(null)
      setError(err instanceof Error ? err.message : 'Failed to load requirement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [requirementType, requirementId])

  useEffect(() => {
    const requirement = detail?.requirement
    setDateEdits({
      start_date: requirement?.start_date ? String(requirement.start_date).slice(0, 10) : '',
      end_date: requirement?.end_date ? String(requirement.end_date).slice(0, 10) : '',
    })
  }, [detail?.requirement?.start_date, detail?.requirement?.end_date])

  async function saveRequirementDates() {
    if (!dateEdits.start_date || !dateEdits.end_date) {
      toast.error('Start and end dates are required')
      return
    }
    setDateSaving(true)
    try {
      await superAdminApi.updateRequirementDates(requirementType, requirementId, dateEdits)
      toast.success('Requirement dates updated')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update dates')
    } finally {
      setDateSaving(false)
    }
  }

  async function updateBookingStatus(booking: any, status: string) {
    setBookingStatusSaving((current) => ({ ...current, [booking.id]: true }))
    try {
      await superAdminApi.updateRequirementBooking(requirementType, requirementId, booking.id, { status })
      toast.success('Booking status updated')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update booking status')
    } finally {
      setBookingStatusSaving((current) => ({ ...current, [booking.id]: false }))
    }
  }

  async function updateRequirementStatus(status: string) {
    setRequirementStatusSaving(true)
    try {
      await superAdminApi.updateRequirementStatus(requirementType, requirementId, { status })
      toast.success('Requirement status updated')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update requirement status')
    } finally {
      setRequirementStatusSaving(false)
    }
  }

  async function reviewProjectEdit(action: 'approve' | 'reject', reviewNote?: string) {
    const requestId = detail?.pendingEditRequest?.id
    if (!requestId) return
    await superAdminApi.reviewProjectEditRequest(requirementType, requirementId, requestId, {
      action,
      review_note: reviewNote,
    })
    toast.success(action === 'approve' ? 'Institution edits approved and applied' : 'Institution edits rejected')
    await loadDetail()
  }

  function openBookingEdit(booking: any) {
    const settlement = resolveBookingSettlementRates({
      ...booking,
      projects: booking.projects || detail?.requirement,
    })
    const engagement = bookingEngagementQuantityDisplay({
      ...booking,
      projects: booking.projects || detail?.requirement,
    })
    const qty =
      booking.unit_quantity != null && Number(booking.unit_quantity) > 0
        ? Number(booking.unit_quantity)
        : engagement.quantity > 0
          ? engagement.quantity
          : 0
    const gross = Number(settlement.grossPerUnit || booking.final_gross_per_unit || booking.amount || 0)
    const totalBudget =
      settlement.unit === 'fixed_package'
        ? gross
        : qty > 0 && gross > 0
          ? Math.round(gross * qty * 100) / 100
          : 0
    setBookingEditTarget(booking)
    setBookingEditForm({
      total_budget: totalBudget > 0 ? String(totalBudget) : '',
      final_gross_per_unit: gross > 0 ? String(gross) : '',
      hours_booked: booking.hours_booked != null ? String(booking.hours_booked) : '',
      unit_quantity: qty > 0 ? String(qty) : '',
      start_date: booking.start_date ? String(booking.start_date).slice(0, 10) : '',
      end_date: booking.end_date ? String(booking.end_date).slice(0, 10) : '',
      actual_start_date: booking.actual_start_date ? String(booking.actual_start_date).slice(0, 10) : '',
      actual_end_date: booking.actual_end_date ? String(booking.actual_end_date).slice(0, 10) : '',
      note: '',
    })
    setBookingEditOpen(true)
  }

  function bookingEditUnitMeta() {
    if (!bookingEditTarget) {
      return { unit: 'hourly' as const, unitShort: 'hour', hoursPerDay: 0 }
    }
    const settlement = resolveBookingSettlementRates({
      ...bookingEditTarget,
      projects: bookingEditTarget.projects || detail?.requirement,
    })
    const project = bookingEditTarget.projects || detail?.requirement
    const hoursPerDay =
      Number(project?.hours_per_day) > 0
        ? Number(project.hours_per_day)
        : Number(project?.duration_per_unit) > 0 &&
            (settlement.unit === 'per_day' || settlement.unit === 'per_session' || settlement.unit === 'per_month')
          ? Number(project.duration_per_unit)
          : 0
    return { unit: settlement.unit, unitShort: settlement.unitShort, hoursPerDay }
  }

  function syncBookingEditHours(qty: number, prevHours: string, hoursPerDay: number, unit: string) {
    if (unit === 'hourly' && qty > 0) return String(qty)
    if ((unit === 'per_day' || unit === 'per_session' || unit === 'per_month') && qty > 0 && hoursPerDay > 0) {
      return String(Math.round(qty * hoursPerDay * 100) / 100)
    }
    return prevHours
  }

  function onBookingEditBudgetChange(value: string) {
    const { unit, hoursPerDay } = bookingEditUnitMeta()
    setBookingEditForm((prev) => {
      const qty = Number(prev.unit_quantity)
      const budget = Number(value)
      const nextRate =
        unit === 'fixed_package'
          ? Number.isFinite(budget) && budget > 0
            ? String(Math.round(budget * 100) / 100)
            : prev.final_gross_per_unit
          : Number.isFinite(budget) && budget > 0 && Number.isFinite(qty) && qty > 0
            ? String(Math.round((budget / qty) * 100) / 100)
            : prev.final_gross_per_unit
      return {
        ...prev,
        total_budget: value,
        final_gross_per_unit: nextRate,
        hours_booked: syncBookingEditHours(qty, prev.hours_booked, hoursPerDay, unit),
      }
    })
  }

  function onBookingEditQuantityChange(value: string) {
    const { unit, hoursPerDay } = bookingEditUnitMeta()
    setBookingEditForm((prev) => {
      const qty = Number(value)
      const budget = Number(prev.total_budget)
      const nextRate =
        unit === 'fixed_package'
          ? prev.final_gross_per_unit
          : Number.isFinite(budget) && budget > 0 && Number.isFinite(qty) && qty > 0
            ? String(Math.round((budget / qty) * 100) / 100)
            : prev.final_gross_per_unit
      return {
        ...prev,
        unit_quantity: value,
        final_gross_per_unit: nextRate,
        hours_booked: syncBookingEditHours(qty, prev.hours_booked, hoursPerDay, unit),
      }
    })
  }

  function onBookingEditRateChange(value: string) {
    const { unit, hoursPerDay } = bookingEditUnitMeta()
    setBookingEditForm((prev) => {
      const rate = Number(value)
      const qty = Number(prev.unit_quantity)
      const nextBudget =
        unit === 'fixed_package'
          ? Number.isFinite(rate) && rate > 0
            ? String(Math.round(rate * 100) / 100)
            : prev.total_budget
          : Number.isFinite(rate) && rate > 0 && Number.isFinite(qty) && qty > 0
            ? String(Math.round(rate * qty * 100) / 100)
            : prev.total_budget
      return {
        ...prev,
        final_gross_per_unit: value,
        total_budget: nextBudget,
        hours_booked: syncBookingEditHours(qty, prev.hours_booked, hoursPerDay, unit),
      }
    })
  }

  async function saveBookingEdit() {
    if (!bookingEditTarget) return
    const gross = Number(bookingEditForm.final_gross_per_unit)
    if (!Number.isFinite(gross) || gross <= 0) {
      toast.error('Institute pay rate must be a positive number')
      return
    }
    const qty = Number(bookingEditForm.unit_quantity)
    if (bookingEditForm.unit_quantity !== '' && (!Number.isFinite(qty) || qty <= 0)) {
      toast.error('Quantity must be a positive number')
      return
    }
    if (bookingEditForm.start_date && bookingEditForm.end_date && bookingEditForm.end_date < bookingEditForm.start_date) {
      toast.error('End date must be on or after start date')
      return
    }
    if (
      bookingEditForm.actual_start_date &&
      bookingEditForm.actual_end_date &&
      bookingEditForm.actual_end_date < bookingEditForm.actual_start_date
    ) {
      toast.error('Actual end date must be on or after actual start date')
      return
    }

    const payload: Record<string, unknown> = {
      final_gross_per_unit: gross,
      hours_booked: bookingEditForm.hours_booked === '' ? undefined : Number(bookingEditForm.hours_booked),
      unit_quantity: bookingEditForm.unit_quantity === '' ? undefined : Number(bookingEditForm.unit_quantity),
      start_date: bookingEditForm.start_date || null,
      end_date: bookingEditForm.end_date || null,
      actual_start_date: bookingEditForm.actual_start_date || null,
      actual_end_date: bookingEditForm.actual_end_date || null,
      note: bookingEditForm.note.trim() || null,
    }

    setBookingEditSaving(true)
    try {
      await superAdminApi.updateRequirementBooking(
        requirementType,
        requirementId,
        bookingEditTarget.id,
        payload
      )
      toast.success('Booking details updated')
      setBookingEditOpen(false)
      setBookingEditTarget(null)
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update booking')
    } finally {
      setBookingEditSaving(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (!expertSearch.trim()) {
        setExperts([])
        return
      }
      superAdminApi.profiles({ type: 'experts', search: expertSearch, limit: 10 })
        .then((res) => setExperts(res.data || []))
        .catch(() => setExperts([]))
    }, 250)
    return () => clearTimeout(t)
  }, [expertSearch])

  async function addExpert(e: React.FormEvent) {
    e.preventDefault()
    if (!expertId) {
      toast.error('Select an expert')
      return
    }
    if (stage === 'interview_scheduled' && !interviewAt?.trim()) {
      toast.error('Interview date and time are required')
      return
    }
    setSaving(true)
    try {
      const created = await superAdminApi.addRequirementExpert(requirementId, {
        expert_id: expertId,
        requirement_type: requirementType,
        stage,
        interview_scheduled_at: stage === 'interview_scheduled' ? datetimeLocalToIso(interviewAt) : null,
        notes,
      })
      if (!created?.id) {
        throw new Error('Expert was not added. The backend did not return an application id.')
      }
      setExpertId('')
      setExpertSearch('')
      setStage('added')
      setInterviewAt('')
      setNotes('')
      toast.success(stage === 'interview_scheduled' ? 'Expert moved to interview' : 'Expert notified')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expert')
    } finally {
      setSaving(false)
    }
  }

  async function runCandidateAction(row: any, action: string, interviewValue = row.interview_scheduled_at || null) {
    setWorkflowSaving(true)
    try {
      await superAdminApi.runRequirementExpertAction(requirementId, row.id, {
        action,
        interview_scheduled_at: interviewValue,
        notes: row.notes || null,
      })
      toast.success('Workflow updated')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update workflow')
    } finally {
      setWorkflowSaving(false)
    }
  }

  async function updateNativeApplication(row: any, status: string, interviewValue?: string | null) {
    setWorkflowSaving(true)
    try {
      await superAdminApi.updateNativeRequirementApplication(requirementType, requirementId, row.id, {
        status,
        interview_scheduled_at: interviewValue || null,
      })
      toast.success(status === 'accepted' ? 'Booking confirmed and locked' : 'Application updated')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update application')
    } finally {
      setWorkflowSaving(false)
    }
  }

  async function confirmInterview() {
    if (!interviewDialog) return
    if (!interviewDialog.value?.trim()) {
      toast.error('Interview date and time are required')
      return
    }
    const interviewValue = datetimeLocalToIso(interviewDialog.value)
    if (!interviewValue) {
      toast.error('Enter a valid interview date and time')
      return
    }
    const current = interviewDialog
    setInterviewDialog(null)
    if (current.kind === 'pipeline') {
      await runCandidateAction(current.row, 'schedule_interview', interviewValue)
      return
    }
    await updateNativeApplication(current.row, 'interview', interviewValue)
  }

  function getRowPersonName(row: any) {
    return row.experts?.name || row.site_students?.name || 'this candidate'
  }

  function openConfirmAction(options: {
    title: string
    description: string
    confirmLabel: string
    destructive?: boolean
    onConfirm: () => Promise<void>
  }) {
    setConfirmActionDialog(options)
  }

  async function handleConfirmAction() {
    if (!confirmActionDialog) return
    const action = confirmActionDialog.onConfirm
    setConfirmActionDialog(null)
    await action()
  }

  function confirmSelectNative(row: any, status: string, label = 'Select') {
    const name = getRowPersonName(row)
    if (requirementType === 'project' && status === 'accepted') {
      const rateStatus = row.rate_status || row.rate_intent
      if (isPostedRateDeclined(rateStatus)) {
        toast.error('Expert declined the posted rate. Booking cannot proceed for this application.')
        return
      }
      if (isPostedRateOfferPending(rateStatus)) {
        toast.error('Waiting for the expert to respond to the posted-rate request')
        return
      }
      if (!isRateAgreed(rateStatus) && row.rate_intent === 'open_to_negotiate') {
        toast.error('Complete rate negotiation before confirming booking')
        return
      }
      const pricing = projectCompensationDisplay(requirement || {})
      const gross =
        Number(row.final_gross_per_unit) > 0
          ? Number(row.final_gross_per_unit)
          : pricing.grossPerUnitDisplay
      const net =
        Number(row.final_net_per_unit) > 0
          ? Number(row.final_net_per_unit)
          : pricing.netPerUnitDisplay
      openConfirmAction({
        title: 'Confirm & lock booking?',
        description: `Lock booking for ${name} at institute pays ${moneyInr(gross)} / ${pricing.unitShort} and expert earns ${moneyInr(net)} / ${pricing.unitShort}.`,
        confirmLabel: 'Confirm & lock',
        onConfirm: () => updateNativeApplication(row, 'accepted'),
      })
      return
    }
    openConfirmAction({
      title: `${label} candidate?`,
      description: `Are you sure you want to ${label.toLowerCase()} ${name}?`,
      confirmLabel: label,
      onConfirm: () => updateNativeApplication(row, status),
    })
  }

  function confirmRejectNative(row: any, status: string) {
    const name = getRowPersonName(row)
    openConfirmAction({
      title: 'Reject candidate?',
      description: `Are you sure you want to reject ${name}? This action can be reversed by moving them back to pending.`,
      confirmLabel: 'Reject',
      destructive: true,
      onConfirm: () => updateNativeApplication(row, status),
    })
  }

  function confirmSelectPipeline(row: any) {
    const name = getRowPersonName(row)
    openConfirmAction({
      title: 'Select candidate?',
      description: `Are you sure you want to select ${name}?`,
      confirmLabel: 'Select',
      onConfirm: () => runCandidateAction(row, 'select'),
    })
  }

  function confirmRejectPipeline(row: any) {
    const name = getRowPersonName(row)
    openConfirmAction({
      title: 'Reject candidate?',
      description: `Are you sure you want to reject ${name}?`,
      confirmLabel: 'Reject',
      destructive: true,
      onConfirm: () => runCandidateAction(row, 'reject'),
    })
  }

  const tabActionVisibility = {
    hideInterview: activeStage === 'interview',
    hideSelect: activeStage === 'selected',
    // Once an application leaves pending, it cannot be moved back.
    hidePending: true,
    hideReject: activeStage === 'rejected',
  }

  function nativeActions(row: any, options?: {
    hideInterview?: boolean
    hideSelect?: boolean
    hidePending?: boolean
    hideReject?: boolean
  }) {
    if (!canManagePipeline) return null
    const visibility = { ...tabActionVisibility, ...options }
    if (requirementType === 'project') {
      const rateStatus = row.rate_status || row.rate_intent
      const lockDisabled =
        (row.rate_intent === 'open_to_negotiate' && !isRateAgreed(rateStatus)) ||
        isPostedRateOfferPending(rateStatus) ||
        isPostedRateDeclined(rateStatus)
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {!visibility.hideInterview ? (
              <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => setInterviewDialog({ kind: 'native', row, value: toDatetimeLocal(row.interview_date) })}>Interview</Button>
            ) : null}
            {!visibility.hideSelect ? (
              <Button
                type="button"
                size="sm"
                className="bg-[#008260] hover:bg-[#006d51]"
                disabled={workflowSaving || lockDisabled}
                onClick={() => confirmSelectNative(row, 'accepted')}
              >
                Confirm & lock
              </Button>
            ) : null}
            {!visibility.hidePending ? (
              <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'pending')}>Pending</Button>
            ) : null}
            {!visibility.hideReject ? (
              <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={workflowSaving} onClick={() => confirmRejectNative(row, 'rejected')}>Reject</Button>
            ) : null}
          </div>
          {isPostedRateOfferPending(rateStatus) ? (
            <p className="text-xs text-sky-800">Confirm &amp; lock is paused until the expert responds to the posted-rate request.</p>
          ) : null}
          {isPostedRateDeclined(rateStatus) ? (
            <p className="text-xs text-rose-700">Confirm &amp; lock is disabled — the expert declined proceeding at the posted rate only.</p>
          ) : null}
        </div>
      )
    }
    if (requirementType === 'internship') {
      return (
        <div className="flex flex-wrap gap-2">
          {!visibility.hideInterview ? (
            <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => setInterviewDialog({ kind: 'native', row, value: toDatetimeLocal(row.interview_scheduled_at) })}>Interview</Button>
          ) : null}
          {!visibility.hideSelect ? (
            <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" disabled={workflowSaving} onClick={() => confirmSelectNative(row, 'shortlisted_corporate', 'Shortlist')}>Shortlist</Button>
          ) : null}
          {!visibility.hidePending ? (
            <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'pending')}>Pending</Button>
          ) : null}
          {!visibility.hideReject ? (
            <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={workflowSaving} onClick={() => confirmRejectNative(row, 'rejected_corporate')}>Reject</Button>
          ) : null}
        </div>
      )
    }
    return (
      <div className="flex flex-wrap gap-2">
        {!visibility.hideSelect ? (
          <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" disabled={workflowSaving} onClick={() => confirmSelectNative(row, 'shortlisted', 'Shortlist')}>Shortlist</Button>
        ) : null}
        {!visibility.hidePending ? (
          <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'pending')}>Pending</Button>
        ) : null}
        {!visibility.hideReject ? (
          <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={workflowSaving} onClick={() => confirmRejectNative(row, 'rejected')}>Reject</Button>
        ) : null}
      </div>
    )
  }

  function detailValue(label: string, value: any) {
    if (value === undefined || value === null || value === '') return null
    return <div><span className="font-medium text-slate-950">{label}:</span> {String(value)}</div>
  }

  const requirement = detail?.requirement
  const institution = detail?.institution || requirement?.institutions
  const pipeline = detail?.pipelineExperts || detail?.pipeline || []
  const nativeApplications = detail?.nativeApplications || []
  const bookings = detail?.bookings || []
  const attendanceSummary = detail?.attendanceSummary || {}
  const counts = detail?.counts || {}
  const reports = detail?.reports || []
  const assignment = detail?.assignment || requirement?.assignment
  const pendingEditRequest = detail?.pendingEditRequest || null
  const managePermissions: SuperAdminPermission[] = requirementType === 'freelance'
    ? ['requirements:candidates', 'freelance:write']
    : requirementType === 'internship'
      ? ['requirements:candidates', 'internships:write']
      : ['requirements:candidates']
  const canManagePipeline = canAccessAny(me, managePermissions)
  const bookingExpertIds = new Set(bookings.map((booking: any) => String(booking.expert_id || '')))
  const nativeExpertIds = new Set(nativeApplications.map((application: any) => String(application.expert_id || application.student_id || '')))
  const pendingRows = [
    ...nativeApplications.filter((row: any) => row.status === 'pending').map((row: any) => ({ kind: 'application', row })),
    ...pipeline
      .filter((row: any) => row.stage === 'added' && !nativeExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'pipeline', row })),
  ]
  const interviewRows = [
    ...nativeApplications.filter((row: any) => row.status === 'interview').map((row: any) => ({ kind: 'application', row })),
    ...pipeline
      .filter((row: any) => row.stage === 'interview_scheduled' && !nativeExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'pipeline', row })),
  ]
  const rejectedRows = [
    ...nativeApplications
      .filter((row: any) => ['rejected', 'rejected_corporate'].includes(row.status))
      .map((row: any) => ({ kind: 'application', row })),
    ...pipeline
      .filter((row: any) => row.stage === 'rejected' && !nativeExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'pipeline', row })),
  ]
  const selectedRows = [
    ...bookings.map((row: any) => ({ kind: 'booking', row })),
    ...nativeApplications
      .filter((row: any) => ['accepted', 'shortlisted', 'shortlisted_corporate'].includes(row.status) && !bookingExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'application', row })),
    ...pipeline
      .filter((row: any) => ['selected', 'completed'].includes(row.stage) && !nativeExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'pipeline', row })),
  ]
  const rowsByStage: Record<string, any[]> = {
    pending: pendingRows,
    interview: interviewRows,
    rejected: rejectedRows,
    selected: selectedRows,
  }
  const activeRows = rowsByStage[activeStage] || []

  function getItemPerson(item: any) {
    if (item.kind === 'booking') return item.row.experts
    if (item.kind === 'pipeline') return item.row.experts
    return item.row.experts || item.row.site_students
  }

  function getItemStatus(item: any) {
    if (item.kind === 'booking') return item.row.status || 'selected'
    if (item.kind === 'pipeline') return stageLabel(item.row.stage)
    return item.row.status || '-'
  }

  function renderStatusActions(item: any) {
    if (!canManagePipeline) return null
    if (item.kind === 'booking') {
      if (requirementType !== 'project') return null
      return (
        <div className="flex flex-col gap-2 items-end">
          <BookingAgreementActions
            booking={item.row}
            role="institution"
            onUpdated={async () => {
              await loadDetail()
            }}
          />
          <BookingCompletionActions
            booking={item.row}
            role="institution"
            onUpdated={async () => {
              await loadDetail()
            }}
          />
        </div>
      )
    }
    if (item.kind === 'pipeline') {
      const hideInterview = tabActionVisibility.hideInterview || item.row.stage === 'interview_scheduled'
      return (
        <div className="flex flex-wrap gap-2">
          {item.row.stage === 'added' ? (
            <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => runCandidateAction(item.row, 'notify')}>Notify</Button>
          ) : null}
          {!hideInterview ? (
            <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => setInterviewDialog({ kind: 'pipeline', row: item.row, value: toDatetimeLocal(item.row.interview_scheduled_at) })}>Interview</Button>
          ) : null}
          {!tabActionVisibility.hideSelect ? (
            <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" disabled={workflowSaving} onClick={() => confirmSelectPipeline(item.row)}>Select</Button>
          ) : null}
          {!tabActionVisibility.hideReject ? (
            <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={workflowSaving} onClick={() => confirmRejectPipeline(item.row)}>Reject</Button>
          ) : null}
        </div>
      )
    }
    return nativeActions(item.row)
  }

  function renderStatusCard(item: any) {
    const person = getItemPerson(item)
    const booking = item.kind === 'booking' ? item.row : null
    const application = item.kind === 'application' ? item.row : null
    const title = person?.name || item.row.expert_id || item.row.student_id || 'Unknown'
    const settlement = booking
      ? resolveBookingSettlementRates({
          ...booking,
          projects: booking.projects || requirement,
        })
      : null
    const showProjectRateUi = requirementType === 'project' && Boolean(application?.experts || booking?.experts)

    return (
      <div key={`${item.kind}-${item.row.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-slate-950">{title}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{getItemStatus(item)}</span>
              {item.kind === 'booking' ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-[#008260]">Booking</span> : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{person?.email || person?.phone || '-'}</p>
            {person?.bio ? <p className="mt-3 line-clamp-2 text-sm text-slate-700">{person.bio}</p> : null}
            {showProjectRateUi && application ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-sm text-slate-700">
                  Original rate ₹{getInstitutionRate(person?.hourly_rate)}/hr
                </p>
                <RateIntentBadge rateIntent={application.rate_intent} rateStatus={application.rate_status} />
              </div>
            ) : null}
            {application?.cover_letter ? (
              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cover letter</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{application.cover_letter}</p>
              </div>
            ) : null}
            {application?.screening_answers ? (
              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Screening answers</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{application.screening_answers}</p>
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {booking && settlement ? (
                <>
                  <div>
                    <span className="text-slate-500">Institute pays</span>
                    <p className="font-medium text-slate-950">
                      {moneyInr(settlement.grossPerUnit)} / {settlement.unitShort}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Expert earns</span>
                    <p className="font-medium text-slate-950">
                      {moneyInr(settlement.netPerUnit)} / {settlement.unitShort}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <span className="text-slate-500">Original rate</span>
                  <p className="font-medium text-slate-950">
                    {person?.hourly_rate != null ? `₹${getInstitutionRate(person.hourly_rate)}/hr` : '-'}
                  </p>
                </div>
              )}
              <div><span className="text-slate-500">Experience</span><p className="font-medium text-slate-950">{person?.experience_years != null ? `${person.experience_years} years` : '-'}</p></div>
              <div><span className="text-slate-500">Domain</span><p className="font-medium text-slate-950">{Array.isArray(person?.domain_expertise) ? person.domain_expertise.join(', ') : person?.domain_expertise || '-'}</p></div>
              <div><span className="text-slate-500">Interview</span><p className="font-medium text-slate-950">{formatInterviewDateTime(item.row.interview_date || item.row.interview_scheduled_at)}</p></div>
              {booking ? (() => {
                const engagement = bookingEngagementQuantityDisplay({
                  ...booking,
                  projects: booking.projects || requirement,
                })
                return (
                  <div>
                    <span className="text-slate-500">{engagement.label}</span>
                    <p className="font-medium text-slate-950">{engagement.value}</p>
                  </div>
                )
              })() : null}
              {booking ? <div><span className="text-slate-500">Approved Hours</span><p className="font-medium text-slate-950">{booking.approved_hours || 0}</p></div> : null}
              {booking ? <div><span className="text-slate-500">Payment</span><p className="font-medium text-slate-950">{booking.payment_status || '-'}</p></div> : null}
              {booking ? <div><span className="text-slate-500">Dates</span><p className="font-medium text-slate-950">{booking.start_date || '-'} to {booking.end_date || '-'}</p></div> : null}
            </div>
            {person?.subskills?.length ? <p className="mt-3 text-sm text-slate-600"><span className="font-medium text-slate-800">Skills:</span> {person.subskills.join(', ')}</p> : null}
            {requirementType === 'project' && application && requirement && activeStage === 'interview' ? (
              <div className="mt-4">
                <RateAgreementPanel
                  application={application}
                  project={requirement}
                  role="institution"
                  onUpdated={() => loadDetail()}
                />
              </div>
            ) : null}
            {booking ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {paymentSummaryCard('Expert payable', booking.finance_summary?.expert)}
                {paymentSummaryCard('Institute receivable', booking.finance_summary?.institution)}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-2 lg:min-w-56">
            {renderStatusActions(item)}
            {booking ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Booking status</Label>
                  <Select
                    value={booking.status || ''}
                    onValueChange={(value) => updateBookingStatus(booking, value)}
                    disabled={Boolean(bookingStatusSaving[booking.id])}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completion_requested">Completion requested</SelectItem>
                      <SelectItem value="cancellation_requested">Cancellation requested</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {canManagePipeline ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => openBookingEdit(booking)}
                  >
                    Edit booking details
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {booking && requirementType === 'project' ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <TrainingAttendancePanel
              bookingId={booking.id}
              startDate={booking.actual_start_date || booking.start_date}
              endDate={booking.actual_end_date || booking.end_date}
              hoursBooked={booking.hours_booked}
              bookingStatus={booking.status}
              expectedViewerRole="institution"
              defaultExpanded={
                booking.status === 'in_progress' ||
                booking.status === 'completion_requested' ||
                booking.status === 'cancellation_requested'
              }
            />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button asChild variant="outline" className="w-fit">
          <Link href="/superadmin/requirements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to requirements
          </Link>
        </Button>
        <Button type="button" variant="outline" onClick={loadDetail} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? <SectionCard title="Loading">Loading requirement...</SectionCard> : null}
      {error ? <SectionCard title="Requirement"><p className="text-sm text-red-600">{error}</p></SectionCard> : null}

      {!loading && !error && requirement ? (
        <>
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex w-max min-w-full gap-4 px-1">
              <div className="w-[11.5rem] shrink-0"><StatCard label="Pending" value={pendingRows.length} /></div>
              <div className="w-[11.5rem] shrink-0"><StatCard label="Interview" value={interviewRows.length} tone="blue" /></div>
              <div className="w-[11.5rem] shrink-0"><StatCard label="Selected" value={selectedRows.length} tone="green" /></div>
              <div className="w-[11.5rem] shrink-0"><StatCard label="Rejected" value={rejectedRows.length} tone="amber" /></div>
              <div className="w-[11.5rem] shrink-0"><StatCard label="Applications" value={counts.applications_total || 0} tone="amber" /></div>
              <div className="w-[11.5rem] shrink-0"><StatCard label="Bookings" value={counts.bookings_total || 0} tone="blue" /></div>
              <div className="w-[11.5rem] shrink-0"><StatCard label="Approved Hours" value={counts.approved_hours || 0} tone="green" /></div>
            </div>
          </div>

          {requirementType === 'project' && pendingEditRequest ? (
            <ProjectEditRequestPanel
              editRequest={pendingEditRequest}
              canReview={canManagePipeline}
              onReview={reviewProjectEdit}
            />
          ) : null}

          <SectionCard title={requirement.title || 'Requirement'} description={`${requirement.requirement_type} requirement`}>
            <div className="grid gap-4 text-sm md:grid-cols-3">
              {detailValue('Institution', institution?.name || '-')}
              {detailValue('Institution Email', institution?.email)}
              {requirementType === 'project' ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                  <Select
                    value={String(normalizeProjectStatus(requirement.status) || 'open')}
                    onValueChange={updateRequirementStatus}
                    disabled={!canManagePipeline || requirementStatusSaving}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>{PROJECT_STATUS_LABELS[value]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-slate-500">
                    Independent of booking status. Auto: open→running on start date, →completed after end date. Closed stays closed.
                  </p>
                </div>
              ) : (
                detailValue('Status', requirement.status || requirement.call_status || '-')
              )}
              {detailValue('Progress', requirement.progress_label || 'Unknown')}
              {detailValue('Assigned Admin', assignment?.admin?.name || assignment?.admin?.email || 'Unassigned')}
              {detailValue('Created', formatDate(requirement.created_at))}
              {detailValue('Project Type', requirement.type)}
              {detailValue('Domain', requirement.domain_expertise)}
              {detailValue('Required Expertise', Array.isArray(requirement.required_expertise) ? requirement.required_expertise.join(', ') : requirement.required_expertise)}
              {detailValue('Skills', Array.isArray(requirement.skills_required || requirement.required_skills) ? (requirement.skills_required || requirement.required_skills).join(', ') : requirement.skills_required || requirement.required_skills)}
              {detailValue('Subskills', Array.isArray(requirement.subskills) ? requirement.subskills.join(', ') : requirement.subskills)}
              {requirementType === 'project' ? (
                <>
                  <div>
                    <span className="font-medium text-slate-950">Institute pays:</span>{' '}
                    <PostedCompensationRate project={requirement} audience="institution" showLabel={false} />
                  </div>
                  {(() => {
                    const pricing = projectCompensationDisplay(requirement)
                    const engagement = projectEngagementQuantityDisplay(requirement)
                    return (
                      <>
                        {detailValue('Pay unit', pricing.unitLabel)}
                        {engagement.quantity > 0 ? detailValue(engagement.label, engagement.value) : null}
                        {Number(requirement.hours_per_day) > 0 ||
                        ((pricing.unit === 'per_day' || pricing.unit === 'per_session' || pricing.unit === 'per_month') &&
                          pricing.durationPerUnit > 1)
                          ? detailValue(
                              'Hours per day',
                              `${Number(requirement.hours_per_day) > 0 ? requirement.hours_per_day : pricing.durationPerUnit} hrs`
                            )
                          : null}
                        {detailValue('Expert earns (approx)', pricing.netPerUnitDisplay > 0 ? `${moneyInr(pricing.netPerUnitDisplay)} / ${pricing.unitShort}` : null)}
                        {detailValue('Total budget', pricing.totalBudgetGross > 0 ? moneyInr(pricing.totalBudgetGross) : requirement.total_budget ? `Rs. ${requirement.total_budget}` : null)}
                      </>
                    )
                  })()}
                </>
              ) : (
                <>
                  {requirement.hourly_rate && projectCompensationDisplay(requirement).unit === 'hourly'
                    ? detailValue('Hourly', `Rs. ${requirement.hourly_rate}`)
                    : null}
                  {requirement.total_budget ? detailValue('Budget', `Rs. ${requirement.total_budget}`) : null}
                </>
              )}
              {requirement.budget_min || requirement.budget_max ? detailValue('Budget', [requirement.budget_min, requirement.budget_max].filter(Boolean).join(' - ')) : null}
              {requirement.stipend_min || requirement.stipend_max ? detailValue('Stipend', [requirement.stipend_min, requirement.stipend_max].filter(Boolean).join(' - ')) : null}
              {requirement.start_date ? detailValue('Start Date', new Date(requirement.start_date).toLocaleDateString()) : null}
              {requirement.end_date ? detailValue('End Date', new Date(requirement.end_date).toLocaleDateString()) : null}
              {requirement.deadline ? detailValue('Deadline', new Date(requirement.deadline).toLocaleDateString()) : null}
              {requirementType !== 'project' ? detailValue('Duration Hours', requirement.duration_hours) : null}
              {requirement.schedule_notes
                ? detailValue('Weekly schedule', requirement.schedule_notes)
                : null}
              {detailValue('Work Mode', requirement.work_mode || requirement.workplace_type)}
              {detailValue('Engagement', requirement.engagement || requirement.employment_type)}
              {detailValue('Openings', requirement.openings)}
              {detailValue('Location', requirement.location || requirement.job_location)}
              {requirementType === 'project' ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Requirement PDF</p>
                  {requirement.requirement_pdf_url ? (
                    <a
                      href={requirement.requirement_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex text-sm font-medium text-[#008260] hover:underline"
                    >
                      View requirement PDF
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">Not uploaded</p>
                  )}
                </div>
              ) : null}
            </div>
            {requirementType === 'project' ? (
              <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div>
                  <Label className="text-xs text-slate-500">Start date</Label>
                  <Input
                    type="date"
                    value={dateEdits.start_date}
                    onChange={(event) => setDateEdits((current) => ({ ...current, start_date: event.target.value }))}
                    className="mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">End date</Label>
                  <Input
                    type="date"
                    value={dateEdits.end_date}
                    onChange={(event) => setDateEdits((current) => ({ ...current, end_date: event.target.value }))}
                    className="mt-1 bg-white"
                  />
                </div>
                <Button type="button" onClick={saveRequirementDates} disabled={dateSaving} className="bg-[#008260] hover:bg-[#006d51]">
                  {dateSaving ? 'Saving...' : 'Update duration'}
                </Button>
              </div>
            ) : null}
            {requirement.description || requirement.responsibilities ? (
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                {requirement.description || requirement.responsibilities}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Daily Reports" description="Reports uploaded by the admin assigned to this requirement.">
            {reports.length ? (
              <div className="grid gap-3">
                {reports.map((report: any) => (
                  <div key={report.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{report.report_date ? new Date(report.report_date).toLocaleDateString() : 'Daily report'}</p>
                        <p className="mt-1 text-sm text-slate-600">{report.summary || 'No summary provided'}</p>
                        <p className="mt-1 text-xs text-slate-500">{report.original_filename || report.mime_type || 'Document'}</p>
                      </div>
                      {report.file_url ? (
                        <Button asChild variant="outline" size="sm">
                          <a href={report.file_url} target="_blank" rel="noreferrer">Open report</a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No daily reports uploaded yet.
              </div>
            )}
          </SectionCard>

          {canManagePipeline ? (
            <SectionCard title="Add Expert" description="Add an expert into the same pending or interview flow used by the institute dashboard.">
              <form onSubmit={addExpert} className="grid gap-4 lg:grid-cols-2">
                <div className="relative space-y-2 lg:col-span-2">
                  <Label htmlFor="expertSearch">Expert</Label>
                  <Input
                    id="expertSearch"
                    value={expertSearch}
                    onChange={(e) => {
                      setExpertSearch(e.target.value)
                      setExpertId('')
                    }}
                    placeholder="Search and select expert by name or email"
                  />
                  {experts.length > 0 && !expertId ? (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                      {experts.map((expert) => (
                        <button
                          type="button"
                          key={expert.id}
                          className="block w-full border-b border-slate-100 px-3 py-3 text-left text-sm hover:bg-slate-50"
                          onClick={() => {
                            setExpertId(expert.id)
                            setExpertSearch(`${expert.name} (${expert.email})`)
                            setExperts([])
                          }}
                        >
                          <span className="font-medium text-slate-950">{expert.name}</span>
                          <span className="ml-2 text-slate-500">{expert.email}</span>
                          {expert.hourly_rate ? <span className="ml-2 text-slate-500">Rs. {expert.hourly_rate}/hr</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {expertId ? <p className="text-xs font-medium text-[#008260]">Expert selected</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>Initial action</Label>
                  <Select value={stage} onValueChange={setStage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ADD_STAGES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {stage === 'interview_scheduled' ? (
                  <div className="space-y-2">
                    <Label htmlFor="interviewAt">Interview date and time <span className="text-red-600">*</span></Label>
                    <Input id="interviewAt" type="datetime-local" value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)} required />
                  </div>
                ) : null}
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="lg:col-span-2">
                  <Button
                    type="submit"
                    className="bg-[#008260] hover:bg-[#006d51]"
                    disabled={saving || (stage === 'interview_scheduled' && !interviewAt?.trim())}
                  >
                    {saving ? 'Saving...' : stage === 'interview_scheduled' ? 'Schedule interview' : 'Add and notify'}
                  </Button>
                </div>
              </form>
            </SectionCard>
          ) : null}

          <SectionCard title="Applications And Expert Flow" description="Manage the same pending, interview, rejected, and selected flow visible in the institute dashboard.">
            <Tabs value={activeStage} onValueChange={setActiveStage} className="mb-4">
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-white p-1 shadow-sm md:grid-cols-4">
                {STAGES.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="rounded-lg py-3 text-sm font-semibold data-[state=active]:bg-emerald-50 data-[state=active]:text-[#008260] data-[state=active]:shadow-none"
                  >
                    {item.label} ({rowsByStage[item.value]?.length || 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {activeRows.length ? (
              <div className="space-y-4">
                {activeRows.map(renderStatusCard)}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No records in {STAGES.find((item) => item.value === activeStage)?.label.toLowerCase()}.
              </div>
            )}
          </SectionCard>

        </>
      ) : null}

      <Dialog open={Boolean(interviewDialog)} onOpenChange={(open) => !open && setInterviewDialog(null)}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="workflowInterviewAt">Interview date and time <span className="text-red-600">*</span></Label>
            <Input
              id="workflowInterviewAt"
              type="datetime-local"
              value={interviewDialog?.value || ''}
              onChange={(e) => setInterviewDialog((current) => current ? { ...current, value: e.target.value } : current)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInterviewDialog(null)} disabled={workflowSaving}>Cancel</Button>
            <Button
              type="button"
              className="bg-[#008260] hover:bg-[#006d51]"
              onClick={confirmInterview}
              disabled={workflowSaving || !interviewDialog?.value?.trim()}
            >
              {workflowSaving ? 'Saving...' : 'Save interview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bookingEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBookingEditOpen(false)
            setBookingEditTarget(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit booking details</DialogTitle>
          </DialogHeader>
          {bookingEditTarget ? (
            <div className="space-y-4 text-sm">
              <p className="text-slate-600">
                Updates apply to this booking only. Expert and institution dashboards will show the new values.
                Finance/invoices are not auto-updated.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>
                    {bookingEditUnitMeta().unit === 'hourly'
                      ? 'Duration (hours)'
                      : bookingEditUnitMeta().unit === 'fixed_package'
                        ? 'Quantity'
                        : `Quantity (${bookingEditUnitMeta().unitShort}s)`}
                  </Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="mt-1"
                    value={bookingEditForm.unit_quantity}
                    onChange={(e) => onBookingEditQuantityChange(e.target.value)}
                    disabled={bookingEditUnitMeta().unit === 'fixed_package'}
                  />
                </div>
                <div>
                  <Label>Total budget (Rs.)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    className="mt-1"
                    value={bookingEditForm.total_budget}
                    onChange={(e) => onBookingEditBudgetChange(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Institute pays (gross / {bookingEditUnitMeta().unitShort})</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    className="mt-1"
                    value={bookingEditForm.final_gross_per_unit}
                    onChange={(e) => onBookingEditRateChange(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Auto-calculated from total budget ÷ quantity. You can still override it.
                    Expert earns (auto){' '}
                    {moneyInr(toExpertNet(Number(bookingEditForm.final_gross_per_unit) || 0))} /{' '}
                    {bookingEditUnitMeta().unitShort}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label>Total effort hours (attendance)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1"
                    value={bookingEditForm.hours_booked}
                    onChange={(e) => setBookingEditForm((prev) => ({ ...prev, hours_booked: e.target.value }))}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Used for attendance / completion. For per-day this is usually days × hours/day.
                  </p>
                </div>
                <div>
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={bookingEditForm.start_date}
                    onChange={(e) => setBookingEditForm((prev) => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={bookingEditForm.end_date}
                    onChange={(e) => setBookingEditForm((prev) => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Actual start date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={bookingEditForm.actual_start_date}
                    onChange={(e) =>
                      setBookingEditForm((prev) => ({ ...prev, actual_start_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Actual end date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={bookingEditForm.actual_end_date}
                    onChange={(e) =>
                      setBookingEditForm((prev) => ({ ...prev, actual_end_date: e.target.value }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Reason / note (optional)</Label>
                  <Textarea
                    className="mt-1"
                    rows={2}
                    value={bookingEditForm.note}
                    onChange={(e) => setBookingEditForm((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="Why is this booking being corrected?"
                  />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={bookingEditSaving}
              onClick={() => {
                setBookingEditOpen(false)
                setBookingEditTarget(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#008260] hover:bg-[#006d51]"
              disabled={bookingEditSaving || !bookingEditTarget}
              onClick={saveBookingEdit}
            >
              {bookingEditSaving ? 'Saving…' : 'Save booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmActionDialog)} onOpenChange={(open) => !open && setConfirmActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmActionDialog?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmActionDialog?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={workflowSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={workflowSaving}
              className={confirmActionDialog?.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#008260] hover:bg-[#006d51]'}
            >
              {workflowSaving ? 'Processing...' : confirmActionDialog?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
