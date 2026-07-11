'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  formatNegotiationHistoryEntry,
  isPostedRateDeclined,
  isPostedRateOfferPending,
  isRateAgreed,
  isRateNegotiationClosed,
  moneyInr,
  projectCompensationDisplay,
  toExpertNet,
  toInstitutionGrossFromNet,
  type NegotiationHistoryEntry,
  type ProjectCompensationLike,
} from '@/lib/projectCompensation'

type ApplicationLike = {
  id: string
  status?: string
  rate_intent?: string | null
  rate_status?: string | null
  proposed_net_per_unit?: number | null
  institution_counter_gross_per_unit?: number | null
  final_gross_per_unit?: number | null
  final_net_per_unit?: number | null
  rate_note?: string | null
  negotiation_history?: NegotiationHistoryEntry[] | null
  experts?: { name?: string } | null
}

type Props = {
  application: ApplicationLike
  project: ProjectCompensationLike & { title?: string }
  role: 'expert' | 'institution'
  onUpdated?: (application: any) => void
}

type PendingOverBudget = {
  action: string
  payload: Record<string, unknown>
  proposedTotal: number
}

export function RateAgreementPanel({ application, project, role, onUpdated }: Props) {
  const display = useMemo(() => projectCompensationDisplay(project), [project])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [overBudgetConfirm, setOverBudgetConfirm] = useState<PendingOverBudget | null>(null)
  const [offerPostedConfirmOpen, setOfferPostedConfirmOpen] = useState(false)

  const status = application.rate_status || application.rate_intent
  const agreed = isRateAgreed(status)
  const postedOfferPending = isPostedRateOfferPending(status)
  const postedOfferDeclined = isPostedRateDeclined(status)
  const canNegotiate =
    application.rate_intent === 'open_to_negotiate' &&
    (application.status === 'interview' || application.status === 'accepted') &&
    !isRateNegotiationClosed(status)
  const history = Array.isArray(application.negotiation_history)
    ? application.negotiation_history
    : []

  const proposedTotalForGross = (grossPerUnit: number) =>
    display.unit === 'fixed_package'
      ? grossPerUnit
      : grossPerUnit * (display.quantity > 0 ? display.quantity : 1)

  const exceedsPostedBudget = (grossPerUnit: number) => {
    if (!(display.totalBudgetGross > 0) || !(grossPerUnit > 0)) return false
    return proposedTotalForGross(grossPerUnit) > display.totalBudgetGross * 1.001
  }

  const runAction = async (
    action: string,
    payload: Record<string, unknown> = {},
    successMessage = 'Rate updated'
  ) => {
    try {
      setSubmitting(true)
      const res = await api.applications.updateRate(application.id, {
        action,
        ...payload,
      })
      if (res?.error) {
        toast.error(res.error)
        return false
      }
      toast.success(successMessage)
      setAmount('')
      setNote('')
      setOverBudgetConfirm(null)
      setOfferPostedConfirmOpen(false)
      onUpdated?.(res)
      return true
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update rate')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const runInstitutionActionWithBudgetCheck = async (
    action: string,
    grossPerUnit: number,
    payload: Record<string, unknown>
  ) => {
    if (exceedsPostedBudget(grossPerUnit)) {
      setOverBudgetConfirm({
        action,
        payload,
        proposedTotal: proposedTotalForGross(grossPerUnit),
      })
      return
    }
    await runAction(action, payload)
  }

  const handleExpertPropose = async () => {
    const net = Number(amount)
    if (!Number.isFinite(net) || net <= 0) {
      toast.error(`Enter what you expect to earn per ${display.unitShort}`)
      return
    }
    await runAction('expert_propose', { proposed_net_per_unit: net, note: note.trim() || null }, 'Proposal sent')
  }

  const handleInstitutionCounter = async () => {
    const gross = Number(amount)
    if (!Number.isFinite(gross) || gross <= 0) {
      toast.error(`Enter what you will pay per ${display.unitShort}`)
      return
    }
    await runInstitutionActionWithBudgetCheck('institution_counter', gross, {
      institution_counter_gross_per_unit: gross,
      note: note.trim() || null,
    })
  }

  const handleAcceptProposal = async () => {
    const net = Number(application.proposed_net_per_unit)
    if (!(net > 0)) {
      toast.error('No expert proposal to accept')
      return
    }
    const gross = toInstitutionGrossFromNet(net)
    await runInstitutionActionWithBudgetCheck('accept_proposal', gross, {})
  }

  const confirmOfferPostedRate = async () => {
    await runAction(
      'offer_posted_rate',
      { note: note.trim() || null },
      'Request sent — waiting for the expert to respond'
    )
  }

  const confirmOverBudget = async () => {
    if (!overBudgetConfirm) return
    await runAction(overBudgetConfirm.action, {
      ...overBudgetConfirm.payload,
      approve_over_budget: true,
    })
  }

  const derivedExpertFromInput =
    role === 'institution' && Number(amount) > 0 ? toExpertNet(Number(amount)) : 0

  return (
    <div className="rounded-xl border border-[#DCDCDC] bg-white p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-[#000000]">
          {role === 'institution' ? 'Rate agreement' : 'Rate discussion'}
          {application.experts?.name ? ` · ${application.experts.name}` : ''}
        </h3>
        <p className="text-sm text-[#6A6A6A] mt-1">
          {display.unitLabel}
          {display.quantity > 0 ? ` · ${display.quantity} ${display.unitShort}${display.quantity === 1 ? '' : 's'}` : ''}
          {display.expectedTotalHours > 0 ? ` · ${display.expectedTotalHours} hours total` : ''}
        </p>
      </div>

      <div className="rounded-lg border border-[#E8E8E8] bg-[#FAFAFA] p-3 text-sm space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6A6A6A]">Posted rate</p>
        {role === 'institution' ? (
          <>
            <p>
              You pay <span className="font-semibold">{moneyInr(display.grossPerUnitDisplay)}</span> /{' '}
              {display.unitShort}
            </p>
            <p className="text-[#6A6A6A]">
              Expert earns ~{moneyInr(display.netPerUnitDisplay)} / {display.unitShort}
            </p>
            <p className="text-[#6A6A6A]">Total budget {moneyInr(display.totalBudgetGross)}</p>
          </>
        ) : (
          <>
            <p>
              You earn{' '}
              <span className="font-semibold text-[#008260]">{moneyInr(display.netPerUnitDisplay)}</span> /{' '}
              {display.unitShort}
            </p>
            <p className="text-[#6A6A6A]">
              ~{moneyInr(display.expertNetTotal)} total · {display.expectedTotalHours || '—'} hours
            </p>
          </>
        )}
      </div>

      {agreed ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Rate agreed — ready to confirm booking.
          {application.final_net_per_unit != null && (
            <span className="block mt-1">
              {role === 'expert'
                ? `Locked: you earn ${moneyInr(Number(application.final_net_per_unit))} / ${display.unitShort}`
                : `Locked: institution pays ${moneyInr(Number(application.final_gross_per_unit || 0))} / ${display.unitShort}${
                    application.final_net_per_unit != null
                      ? ` · expert earns ${moneyInr(Number(application.final_net_per_unit))} / ${display.unitShort}`
                      : ''
                  }`}
            </span>
          )}
          {status === 'agreed_posted' && !application.final_net_per_unit && (
            <span className="block mt-1">Agreed at application to the posted rate.</span>
          )}
        </div>
      ) : postedOfferPending ? (
        role === 'expert' ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-sky-950">Posted rate approval needed</p>
              <p className="text-sm text-sky-900/90 mt-1.5 leading-relaxed">
                The institution wants to close rate negotiation and continue only at the original posted
                rate of{' '}
                <span className="font-semibold">{moneyInr(display.netPerUnitDisplay)}</span> earn /{' '}
                {display.unitShort}.
              </p>
              <p className="text-sm text-sky-900/80 mt-2 leading-relaxed">
                If you decline, negotiation ends on both sides and this engagement cannot be booked at a
                different rate from here. You can still leave the interview process if this does not work
                for you.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                disabled={submitting}
                className="bg-[#008260] hover:bg-[#006d51]"
                onClick={() =>
                  runAction(
                    'accept_posted_offer',
                    {},
                    'Posted rate accepted — waiting for booking confirmation'
                  )
                }
              >
                Yes, proceed at posted rate
              </Button>
              <Button
                variant="outline"
                disabled={submitting}
                className="border-rose-300 text-rose-800 hover:bg-rose-50"
                onClick={() =>
                  runAction(
                    'decline_posted_offer',
                    {},
                    'Posted rate declined — negotiation closed'
                  )
                }
              >
                No, I cannot proceed at this rate
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950 space-y-1">
            <p className="font-semibold">Waiting for expert approval</p>
            <p className="text-sky-900/90 leading-relaxed">
              You asked to proceed at the posted rate only. Rate negotiation is paused until the expert
              accepts or declines. Confirm &amp; lock stays unavailable until they respond.
            </p>
            <p className="text-sky-900/80">
              Posted: you pay {moneyInr(display.grossPerUnitDisplay)} / {display.unitShort} (expert earns ~
              {moneyInr(display.netPerUnitDisplay)})
            </p>
          </div>
        )
      ) : postedOfferDeclined ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950 space-y-1">
          <p className="font-semibold">Negotiation closed</p>
          <p className="leading-relaxed text-rose-900/90">
            {role === 'expert'
              ? 'You declined continuing at the posted rate only. Rate discussion is closed for this application, and booking cannot proceed from here.'
              : 'The expert declined continuing at the posted rate only. Rate negotiation is closed, and Confirm & lock is disabled for this application.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {application.rate_intent === 'agreed_posted'
            ? 'Expert accepted the posted rate at apply.'
            : application.proposed_net_per_unit
              ? `Expert proposed earn ${moneyInr(Number(application.proposed_net_per_unit))} / ${display.unitShort}`
              : 'Open to negotiate — no number yet.'}
          {application.institution_counter_gross_per_unit != null && (
            <span className="block mt-1">
              {role === 'expert'
                ? `Institution counter: ${moneyInr(toExpertNet(Number(application.institution_counter_gross_per_unit)))} earn / ${display.unitShort}`
                : `Institution counter: pay ${moneyInr(Number(application.institution_counter_gross_per_unit))} / ${display.unitShort} (~${moneyInr(toExpertNet(Number(application.institution_counter_gross_per_unit)))} earn)`}
            </span>
          )}
          {application.rate_note && (
            <span className="block mt-1 text-[#6A6A6A]">Note: {application.rate_note}</span>
          )}
        </div>
      )}

      {canNegotiate && role === 'expert' && (
        <div className="space-y-3 border-t border-[#E8E8E8] pt-3">
          <div>
            <Label>You expect to earn (₹ / {display.unitShort})</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(display.netPerUnitDisplay || '')}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExpertPropose} disabled={submitting} className="bg-[#008260] hover:bg-[#006d51]">
              Send proposal
            </Button>
            {application.institution_counter_gross_per_unit != null && (
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => runAction('accept_counter', {}, 'Counter accepted')}
              >
                Accept counter
              </Button>
            )}
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => runAction('accept_posted', {}, 'Posted rate accepted')}
            >
              Accept posted rate
            </Button>
          </div>
        </div>
      )}

      {canNegotiate && role === 'institution' && (
        <div className="space-y-3 border-t border-[#E8E8E8] pt-3">
          <div>
            <Label>You pay per {display.unitShort} (₹)</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(display.grossPerUnitDisplay || '')}
              className="mt-1"
            />
            {derivedExpertFromInput > 0 && (
              <p className="text-xs text-[#6A6A6A] mt-1">
                Expert would earn ~{moneyInr(derivedExpertFromInput)} / {display.unitShort}
              </p>
            )}
          </div>
          <div>
            <Label>Message to expert (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleInstitutionCounter} disabled={submitting} className="bg-[#008260] hover:bg-[#006d51]">
              Send counter offer
            </Button>
            {application.proposed_net_per_unit != null && (
              <Button variant="outline" disabled={submitting} onClick={handleAcceptProposal}>
                Accept expert proposal
              </Button>
            )}
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setOfferPostedConfirmOpen(true)}
            >
              Request posted rate only
            </Button>
          </div>
        </div>
      )}

      {application.rate_intent === 'agreed_posted' && agreed && role === 'institution' && (
        <p className="text-xs text-[#6A6A6A]">
          Expert agreed at apply — proceed to Confirm &amp; lock when ready.
        </p>
      )}

      {history.length > 0 && (
        <div className="border-t border-[#E8E8E8] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6A6A6A] mb-3">
            Negotiation history
          </p>
          <ol className="relative max-h-64 space-y-0 overflow-y-auto border-l border-[#E5E7EB] ml-2 pl-4 pr-1">
            {history
              .slice()
              .reverse()
              .map((entry, idx) => {
                const formatted = formatNegotiationHistoryEntry(entry, display.unitShort, role)
                const when = entry.at
                  ? new Date(entry.at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : ''
                const toneClass =
                  formatted.tone === 'success'
                    ? 'bg-emerald-500'
                    : formatted.tone === 'expert'
                      ? 'bg-amber-500'
                      : formatted.tone === 'institution'
                        ? 'bg-[#008260]'
                        : 'bg-slate-400'
                const badgeClass =
                  formatted.tone === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : formatted.tone === 'expert'
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : formatted.tone === 'institution'
                        ? 'bg-[#E8F5F1] text-[#006B4F] border-[#BFE3D8]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'

                return (
                  <li key={`${entry.at}-${entry.action}-${idx}`} className="relative pb-4 last:pb-0">
                    <span
                      className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${toneClass}`}
                    />
                    <div className="rounded-lg border border-[#ECECEC] bg-[#FAFAFA] p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}
                        >
                          {formatted.who}
                        </span>
                        {when && <span className="text-[11px] text-[#9CA3AF]">{when}</span>}
                      </div>
                      <p className="text-sm font-medium text-[#111827] leading-snug">{formatted.title}</p>
                      {formatted.details.length > 0 && (
                        <dl className="mt-1.5 space-y-0.5 text-xs text-[#6B7280]">
                          {formatted.details.map((line) => (
                            <div key={`${line.label}-${line.value}`} className="leading-relaxed">
                              <dt className="inline font-medium text-[#4B5563]">{line.label}:</dt>{' '}
                              <dd className="inline">{line.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  </li>
                )
              })}
          </ol>
        </div>
      )}

      <AlertDialog
        open={offerPostedConfirmOpen}
        onOpenChange={(open) => {
          if (!submitting) setOfferPostedConfirmOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Proceed at posted rate only?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This sends a request to the expert to continue at the original posted rate of{' '}
                  <span className="font-semibold text-foreground">
                    {moneyInr(display.grossPerUnitDisplay)} / {display.unitShort}
                  </span>{' '}
                  (expert earns ~{moneyInr(display.netPerUnitDisplay)}).
                </p>
                <p>
                  Rate negotiation will pause on both sides while they decide. If they accept, you can
                  Confirm &amp; lock. If they decline, negotiation closes and booking stays disabled for
                  this application.
                </p>
                <p className="text-foreground/80">
                  Are you sure you want to end further rate discussion and ask them to proceed at the
                  posted rate only?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Keep negotiating</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault()
                void confirmOfferPostedRate()
              }}
              className="bg-[#008260] hover:bg-[#006d51]"
            >
              {submitting ? 'Sending...' : 'Yes, request posted rate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(overBudgetConfirm)}
        onOpenChange={(open) => {
          if (!open && !submitting) setOverBudgetConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm budget increase</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This offer totals{' '}
                  <span className="font-semibold text-foreground">
                    {moneyInr(overBudgetConfirm?.proposedTotal || 0)}
                  </span>
                  , which is above your posted budget of{' '}
                  <span className="font-semibold text-foreground">
                    {moneyInr(display.totalBudgetGross)}
                  </span>
                  .
                </p>
                <p>Please confirm that you approve this higher amount before we send it to the expert.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault()
                void confirmOverBudget()
              }}
              className="bg-[#008260] hover:bg-[#006d51]"
            >
              {submitting ? 'Sending...' : 'Approve & continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
