'use client'

import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// How close to the bottom (in px) counts as "reached the end" — real PDFs rarely
// land on an exact pixel due to rounding, so a small tolerance avoids a stuck checkbox.
const SCROLL_BOTTOM_THRESHOLD_PX = 24

type Props = {
  open: boolean
  offer: any
  processing?: boolean
  onClose: () => void
  onAccept: () => void
  onDecline: () => void
}

export function OfferLetterPreviewDialog({ open, offer, processing, onClose, onAccept, onDecline }: Props) {
  const [numPages, setNumPages] = useState(0)
  const [reachedEnd, setReachedEnd] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const url = offer?.offer_letter_url || null

  function reset() {
    setNumPages(0)
    setReachedEnd(false)
    setAgreed(false)
    setLoadError(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset()
      onClose()
    }
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD_PX) {
      setReachedEnd(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Offer letter — {offer?.projects?.title || 'Requirement'}</DialogTitle>
          <DialogDescription>
            Scroll all the way to the end to review the full offer letter before responding.
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div
            onScroll={handleScroll}
            className="flex-1 min-h-[50vh] overflow-y-auto border border-[#DCDCDC] rounded-lg bg-slate-50 p-2"
          >
            {loadError ? (
              <div className="py-10 text-center text-sm text-red-600">
                Couldn&apos;t load the offer letter preview.{' '}
                <a href={url} target="_blank" rel="noreferrer" className="underline">
                  Open it in a new tab
                </a>{' '}
                instead.
              </div>
            ) : (
              <Document
                file={url}
                onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                onLoadError={() => setLoadError(true)}
                loading={<div className="py-10 text-center text-sm text-slate-500">Loading offer letter…</div>}
              >
                {Array.from({ length: numPages }, (_, i) => (
                  <Page
                    key={i}
                    pageNumber={i + 1}
                    width={640}
                    className="mx-auto mb-2 shadow-sm"
                  />
                ))}
              </Document>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
            Offer letter not available yet.
          </div>
        )}

        <div className="flex items-start gap-2 pt-2">
          <Checkbox
            id="offer-agree"
            checked={agreed}
            disabled={!reachedEnd}
            onCheckedChange={(v) => setAgreed(Boolean(v))}
          />
          <label htmlFor="offer-agree" className="text-sm text-[#000000] leading-snug">
            {reachedEnd
              ? 'I agree to all the terms and conditions in this offer letter.'
              : 'Scroll to the end of the offer letter to enable this.'}
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={onDecline}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            Decline
          </Button>
          <Button
            type="button"
            disabled={!agreed || processing}
            onClick={onAccept}
            className="bg-[#008260] hover:bg-[#006d51] text-white"
          >
            {processing ? 'Processing...' : 'Accept offer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
