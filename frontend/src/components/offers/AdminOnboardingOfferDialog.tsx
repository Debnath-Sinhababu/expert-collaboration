'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, FileText, Loader2, Send } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DEFAULT_PAYMENT_TERM,
  PAYMENT_TERM_LABEL,
  PAYMENT_TERM_OPTIONS,
  type PaymentTermValue,
} from '@/lib/offerLetterPaymentTerms'
import { moneyInr, projectCompensationDisplay, projectEngagementQuantityDisplay } from '@/lib/projectCompensation'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  application: any
  project: any
  processing?: boolean
  onApprove: (payload: { payment_term: PaymentTermValue; approve_over_budget: boolean }) => void | Promise<void>
  /** Set when re-sending a declined/expired offer: shows what happened to the previous one. */
  renewal?: {
    previousStatus?: string
    previousPaymentTerm?: string | null
    declineReason?: string | null
  } | null
}

export function AdminOnboardingOfferDialog({
  open,
  onOpenChange,
  application,
  project,
  processing,
  onApprove,
  renewal = null,
}: Props) {
  const [step, setStep] = useState<'payment_term' | 'preview'>('payment_term')
  const [paymentTerm, setPaymentTerm] = useState<PaymentTermValue>(DEFAULT_PAYMENT_TERM)
  const [approveOverBudget, setApproveOverBudget] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const selectedOption = PAYMENT_TERM_OPTIONS.find((o) => o.value === paymentTerm)
  const pricing = project ? projectCompensationDisplay(project) : null
  const gross =
    Number(application?.final_gross_per_unit) > 0
      ? Number(application.final_gross_per_unit)
      : pricing?.grossPerUnitDisplay || 0
  const total =
    pricing?.unit === 'fixed_package' ? gross : gross * (pricing?.quantity || 1)
  const overBudget = Boolean(
    pricing && pricing.totalBudgetGross > 0 && total > pricing.totalBudgetGross * 1.001
  )

  useEffect(() => {
    if (!open) {
      setStep('payment_term')
      setPaymentTerm(DEFAULT_PAYMENT_TERM)
      setApproveOverBudget(false)
      setHtml(null)
      setLoadError(false)
      setLoadingPreview(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || step !== 'preview' || !application?.id) return
    setHtml(null)
    setLoadError(false)
    setLoadingPreview(true)
    api.applications
      .previewOfferLetter(application.id, { payment_term: paymentTerm })
      .then((res: any) => {
        if (res?.html) setHtml(res.html)
        else setLoadError(true)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoadingPreview(false))
  }, [open, step, application?.id, paymentTerm])

  function handleIframeLoad() {
    const frame = iframeRef.current
    const doc = frame?.contentWindow?.document
    if (!frame || !doc) return
    requestAnimationFrame(() => {
      frame.style.height = `${doc.documentElement.scrollHeight}px`
    })
  }

  async function goToPreview() {
    if (overBudget && !approveOverBudget) return
    setStep('preview')
  }

  async function handleApprove() {
    await onApprove({ payment_term: paymentTerm, approve_over_budget: approveOverBudget })
  }

  const expertName = application?.experts?.name || 'Expert'
  const projectTitle = project?.title || 'Requirement'
  const startDate = project?.start_date ? new Date(project.start_date) : null
  const programAlreadyStarted = Boolean(
    renewal && startDate && !Number.isNaN(startDate.getTime()) && startDate.getTime() < Date.now()
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={step === 'preview' ? 'max-w-3xl w-full h-[85vh] max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden' : 'max-w-lg'}>
        {step === 'payment_term' ? (
          <>
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>{renewal ? 'Renew offer' : 'Onboarding'} — {expertName}</DialogTitle>
              <DialogDescription>
                {renewal
                  ? 'Choose a new payment term, then preview the updated offer letter. It replaces the previous offer — the expert will only see this one.'
                  : 'Choose the payment term, then preview the offer letter before it is sent to the expert.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-6 pb-6">
              {renewal ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm space-y-1">
                  <p className="font-semibold text-rose-900">
                    Previous offer {renewal.previousStatus === 'expired' ? 'expired' : 'declined by expert'}
                  </p>
                  {renewal.previousPaymentTerm ? (
                    <p className="text-rose-800">
                      Payment term: {PAYMENT_TERM_LABEL[renewal.previousPaymentTerm] || renewal.previousPaymentTerm}
                    </p>
                  ) : null}
                  {renewal.declineReason ? (
                    <p className="text-rose-800 whitespace-pre-wrap">Reason: {renewal.declineReason}</p>
                  ) : null}
                </div>
              ) : null}

              {programAlreadyStarted ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  The program start date ({startDate!.toLocaleDateString('en-IN')}) has already passed. The letter will
                  still state the original program dates.
                </p>
              ) : null}

              {pricing ? (
                <div className="rounded-lg border border-[#DCDCDC] bg-[#F8FBFA] p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#6A6A6A]">Program</span>
                    <span className="font-semibold text-right max-w-[60%]">{projectTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6A6A6A]">Institution pays</span>
                    <span className="font-semibold">{moneyInr(gross)} / {pricing.unitShort}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6A6A6A]">Total institution pays</span>
                    <span className="font-semibold">{moneyInr(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6A6A6A]">{projectEngagementQuantityDisplay(project).label}</span>
                    <span className="font-semibold">{projectEngagementQuantityDisplay(project).value}</span>
                  </div>
                </div>
              ) : null}

              {overBudget ? (
                <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={approveOverBudget}
                    onChange={(e) => setApproveOverBudget(e.target.checked)}
                  />
                  <span>
                    Total exceeds posted budget ({moneyInr(pricing!.totalBudgetGross)}). I approve this amount.
                  </span>
                </label>
              ) : null}

              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-950">Payment term</p>
                <Select value={paymentTerm} onValueChange={(v) => setPaymentTerm(v as PaymentTermValue)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select payment term" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERM_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOption ? (
                  <p className="mt-2 text-xs text-slate-600">{selectedOption.description}</p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#008260] hover:bg-[#006d51]"
                  disabled={processing || (overBudget && !approveOverBudget)}
                  onClick={goToPreview}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Preview offer letter
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="border-b border-[#E5E5E5] px-6 py-4 shrink-0 bg-white space-y-1">
              <DialogTitle className="flex items-center gap-2 text-[17px]">
                <FileText className="h-5 w-5 text-[#008260]" />
                Offer letter preview — {projectTitle}
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                Payment term: <span className="font-medium text-slate-800">{selectedOption?.label}</span>.
                Review Section 3 before sending to {expertName}.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto bg-slate-100 min-h-0">
              {loadError ? (
                <div className="py-16 text-center text-sm text-red-600">Couldn&apos;t load the offer letter preview.</div>
              ) : loadingPreview || !html ? (
                <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-[#008260]" />
                  Generating preview…
                </div>
              ) : (
                <div className="p-5 sm:p-8">
                  <div className="mx-auto max-w-[720px] bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                    <div className="px-6 pt-6 sm:px-10 sm:pt-10">
                      <iframe
                        ref={iframeRef}
                        srcDoc={html}
                        onLoad={handleIframeLoad}
                        scrolling="no"
                        title="Offer letter preview"
                        style={{ width: '100%', border: 'none', display: 'block' }}
                      />
                    </div>
                    <div className="h-6 sm:h-10" />
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[#E5E5E5] bg-white px-6 py-4 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={processing}
                onClick={() => setStep('payment_term')}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                className="bg-[#008260] hover:bg-[#006d51]"
                disabled={processing || loadingPreview || loadError || !html}
                onClick={handleApprove}
              >
                <Send className="mr-2 h-4 w-4" />
                {processing ? 'Sending…' : renewal ? 'Renew & send to expert' : 'Approve & send to expert'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
