'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileText, Loader2, Lock, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'

// How close to the bottom (in px) counts as "reached the end" — small tolerance avoids a stuck checkbox.
const SCROLL_BOTTOM_THRESHOLD_PX = 24

function todayIso() {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

// Case and spacing differences are treated as the same name; anything else (including a
// different spelling) is a mismatch worth confirming with the expert before signing.
function normalizeName(value: string) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

type Props = {
  open: boolean
  offer: any
  processing?: boolean
  onClose: () => void
  onAccept: (signature: { signature_name: string; signature_date: string }) => void
  onDecline: () => void
}

export function OfferLetterPreviewDialog({ open, offer, processing, onClose, onAccept, onDecline }: Props) {
  const [html, setHtml] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [reachedEnd, setReachedEnd] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signatureName, setSignatureName] = useState('')
  const [signatureDate, setSignatureDate] = useState(todayIso())
  const [confirmMismatch, setConfirmMismatch] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!open || !offer?.id) return
    setHtml(null)
    setLoadError(false)
    setReachedEnd(false)
    setAgreed(false)
    setSignatureName('')
    setSignatureDate(todayIso())
    setConfirmMismatch(false)
    api.onboarding.previewHtml(offer.id)
      .then((res: any) => {
        if (res?.html) setHtml(res.html)
        else setLoadError(true)
      })
      .catch(() => setLoadError(true))
  }, [open, offer?.id])

  const trimmedSignature = signatureName.trim()
  const canAccept = Boolean(agreed && trimmedSignature && signatureDate)
  const profileName = String(offer?.experts?.name || '').trim()
  const nameMismatch = Boolean(
    profileName && trimmedSignature && normalizeName(profileName) !== normalizeName(trimmedSignature)
  )

  function submit(name: string) {
    onAccept({ signature_name: name, signature_date: signatureDate })
  }

  // A signature that differs from the profile name is allowed, but only after the expert
  // explicitly confirms which of the two names should appear on the signed letter.
  function handleAcceptClick() {
    if (nameMismatch) {
      setConfirmMismatch(true)
      return
    }
    submit(trimmedSignature)
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  // The letter renders inside a same-origin `srcDoc` iframe (isolates its own <style> from the
  // app's CSS). We resize it to its exact content height so it has no internal scrollbar of its
  // own — the wrapping div below is the only thing that scrolls, which is what lets us reliably
  // detect "the expert scrolled to the end".
  function handleIframeLoad() {
    const frame = iframeRef.current
    const doc = frame?.contentWindow?.document
    if (!frame || !doc) return
    requestAnimationFrame(() => {
      frame.style.height = `${doc.documentElement.scrollHeight}px`
    })
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD_PX
    // Also unlock if the wrapper never needed to scroll in the first place (e.g. a short letter).
    const notScrollable = el.scrollHeight <= el.clientHeight + SCROLL_BOTTOM_THRESHOLD_PX
    if (nearBottom || notScrollable) setReachedEnd(true)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl w-full h-[85vh] max-h-[85vh] p-0 flex flex-col gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="border-b border-[#E5E5E5] px-8 py-5 shrink-0 bg-white space-y-1">
          <DialogTitle className="flex items-center gap-2 text-[17px]">
            <FileText className="h-5 w-5 text-[#008260]" />
            Offer letter — {offer?.projects?.title || 'Requirement'}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Scroll all the way to the end to review the full offer letter. Signing unlocks once you&apos;ve reached
            the bottom — type your name and date, tick the agreement box, then accept. You can decline at any time.
          </DialogDescription>
        </DialogHeader>

        <div onScroll={handleScroll} className="flex-1 overflow-y-auto bg-slate-100">
          {loadError ? (
            <div className="py-16 text-center text-sm text-red-600">Couldn&apos;t load the offer letter preview.</div>
          ) : !html ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#008260]" />
              Loading offer letter…
            </div>
          ) : (
            <>
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

              {/* Agreement + Accept live at the very bottom of the scroll, past the letter itself —
                  there's no way to reach them without scrolling through the whole document. */}
              <div className="border-t border-[#E5E5E5] bg-white px-6 sm:px-10 py-6">
                <div
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 mb-4 transition-colors ${
                    reachedEnd ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <Checkbox
                    id="offer-agree"
                    checked={agreed}
                    disabled={!reachedEnd}
                    onCheckedChange={(v) => setAgreed(Boolean(v))}
                    className="mt-0.5"
                  />
                  <label htmlFor="offer-agree" className="text-sm text-[#000000] leading-snug flex items-center gap-2">
                    {!reachedEnd && <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    I agree to all the terms and conditions in this offer letter.
                  </label>
                </div>
                {/* Electronic execution (Clause 19): the typed name and date are rendered into
                    the trainer signature block of the signed copy generated on acceptance. */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 mb-4">
                  <p className="text-sm font-semibold text-[#000000] mb-1">Sign this offer letter</p>
                  <p className="text-xs text-[#6A6A6A] mb-3">
                    Type your full name as your signature. This is treated as your electronic signature and is
                    legally binding, the same as signing by hand.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor="offer-signature-name" className="text-xs text-[#6A6A6A]">
                        Trainer signature (full name)
                      </Label>
                      <Input
                        id="offer-signature-name"
                        value={signatureName}
                        disabled={!reachedEnd || processing}
                        placeholder="e.g. Arjun Mehta"
                        onChange={(e) => setSignatureName(e.target.value)}
                        maxLength={120}
                        className="bg-white font-semibold italic"
                      />
                      {profileName ? (
                        <p className="text-[11px] text-[#6A6A6A]">
                          Name on your CalxMap profile: <span className="font-medium text-[#000000]">{profileName}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="offer-signature-date" className="text-xs text-[#6A6A6A]">
                        Date
                      </Label>
                      <Input
                        id="offer-signature-date"
                        type="date"
                        value={signatureDate}
                        disabled={!reachedEnd || processing}
                        onChange={(e) => setSignatureDate(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="lg"
                    disabled={!canAccept || processing}
                    onClick={handleAcceptClick}
                    className="bg-[#008260] hover:bg-[#006d51] text-white w-full sm:w-auto"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {processing ? 'Processing...' : 'Sign & accept offer'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-[#E5E5E5] bg-white px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500 hidden sm:block">Not ready to decide? You can close this and come back later.</p>
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={onDecline}
            className="border-red-300 text-red-600 hover:bg-red-50 w-full sm:w-auto"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Decline
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmMismatch} onOpenChange={setConfirmMismatch}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>The name you typed doesn&apos;t match your profile</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                The name on your CalxMap profile is different from the signature you typed. Choose which
                name should appear on your signed offer letter.
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Your profile name</p>
                  <p className="text-sm font-semibold text-slate-900">{profileName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">The name you typed</p>
                  <p className="text-sm font-semibold italic text-slate-900">{trimmedSignature}</p>
                </div>
              </div>
              <p>Are you sure you want to proceed with the name you typed?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={() => {
              setConfirmMismatch(false)
              setSignatureName(profileName)
              submit(profileName)
            }}
            className="w-full sm:w-auto"
          >
            Use my profile name
          </Button>
          <Button
            type="button"
            disabled={processing}
            onClick={() => {
              setConfirmMismatch(false)
              submit(trimmedSignature)
            }}
            className="bg-[#008260] hover:bg-[#006d51] text-white w-full sm:w-auto"
          >
            Yes, use the name I typed
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
