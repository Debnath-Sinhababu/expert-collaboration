'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  isRateAgreed,
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

export function RateAgreementPanel({ application, project, role, onUpdated }: Props) {
  const display = useMemo(() => projectCompensationDisplay(project), [project])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const status = application.rate_status || application.rate_intent
  const agreed = isRateAgreed(status)
  const canNegotiate =
    application.rate_intent === 'open_to_negotiate' &&
    (application.status === 'interview' || application.status === 'accepted') &&
    !agreed
  const history = Array.isArray(application.negotiation_history)
    ? application.negotiation_history
    : []

  const runAction = async (action: string, payload: Record<string, unknown> = {}) => {
    try {
      setSubmitting(true)
      const res = await api.applications.updateRate(application.id, {
        action,
        ...payload,
      })
      if (res?.error) {
        toast.error(res.error)
        return
      }
      toast.success('Rate updated')
      setAmount('')
      setNote('')
      onUpdated?.(res)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update rate')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExpertPropose = async () => {
    const net = Number(amount)
    if (!Number.isFinite(net) || net <= 0) {
      toast.error(`Enter what you expect to earn per ${display.unitShort}`)
      return
    }
    await runAction('expert_propose', { proposed_net_per_unit: net, note: note.trim() || null })
  }

  const handleInstitutionCounter = async () => {
    const gross = Number(amount)
    if (!Number.isFinite(gross) || gross <= 0) {
      toast.error(`Enter what you will pay per ${display.unitShort}`)
      return
    }
    await runAction('institution_counter', {
      institution_counter_gross_per_unit: gross,
      note: note.trim() || null,
    })
  }

  const derivedExpertFromInput =
    role === 'institution' && Number(amount) > 0 ? toExpertNet(Number(amount)) : 0
  const derivedGrossFromInput =
    role === 'expert' && Number(amount) > 0 ? toInstitutionGrossFromNet(Number(amount)) : 0

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
            <p>You pay <span className="font-semibold">{moneyInr(display.grossPerUnitDisplay)}</span> / {display.unitShort}</p>
            <p className="text-[#6A6A6A]">Expert earns ~{moneyInr(display.netPerUnitDisplay)} / {display.unitShort}</p>
            <p className="text-[#6A6A6A]">Total budget {moneyInr(display.totalBudgetGross)}</p>
          </>
        ) : (
          <>
            <p>You earn <span className="font-semibold text-[#008260]">{moneyInr(display.netPerUnitDisplay)}</span> / {display.unitShort}</p>
            <p className="text-[#6A6A6A]">~{moneyInr(display.expertNetTotal)} total · {display.expectedTotalHours || '—'} hours</p>
          </>
        )}
      </div>

      {agreed ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Rate agreed — ready to confirm booking.
          {application.final_net_per_unit != null && (
            <span className="block mt-1">
              Locked: expert earns {moneyInr(Number(application.final_net_per_unit))} / {display.unitShort}
              {application.final_gross_per_unit != null
                ? ` · institution pays ${moneyInr(Number(application.final_gross_per_unit))} / ${display.unitShort}`
                : ''}
            </span>
          )}
          {status === 'agreed_posted' && !application.final_net_per_unit && (
            <span className="block mt-1">Agreed at application to the posted rate.</span>
          )}
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
              Institution counter: pay {moneyInr(Number(application.institution_counter_gross_per_unit))} / {display.unitShort}
              {' '}(~{moneyInr(toExpertNet(Number(application.institution_counter_gross_per_unit)))} earn)
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
            {derivedGrossFromInput > 0 && (
              <p className="text-xs text-[#6A6A6A] mt-1">
                Equivalent institution budget ~{moneyInr(derivedGrossFromInput)} / {display.unitShort}
              </p>
            )}
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
                onClick={() => runAction('accept_counter')}
              >
                Accept counter
              </Button>
            )}
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => runAction('accept_posted')}
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
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => runAction('accept_proposal')}
              >
                Accept expert proposal
              </Button>
            )}
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => runAction('accept_posted')}
            >
              Accept original posted rate
            </Button>
          </div>
        </div>
      )}

      {application.rate_intent === 'agreed_posted' && agreed && role === 'institution' && (
        <p className="text-xs text-[#6A6A6A]">Expert agreed at apply — proceed to Confirm & lock when ready.</p>
      )}

      {history.length > 0 && (
        <div className="border-t border-[#E8E8E8] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6A6A6A] mb-2">History</p>
          <ul className="space-y-1.5 text-sm text-[#4B5563]">
            {history.slice().reverse().map((entry, idx) => (
              <li key={`${entry.at}-${idx}`}>
                <span className="text-[#9CA3AF]">
                  {entry.at ? new Date(entry.at).toLocaleString('en-IN') : ''}
                </span>
                {' · '}
                {entry.actor} {entry.action}
                {entry.net_per_unit != null ? ` · earn ${moneyInr(Number(entry.net_per_unit))}` : ''}
                {entry.gross_per_unit != null ? ` · pay ${moneyInr(Number(entry.gross_per_unit))}` : ''}
                {entry.note ? ` — ${entry.note}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
