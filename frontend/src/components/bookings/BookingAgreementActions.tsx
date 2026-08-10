'use client'

import { useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type BookingLike = {
  id: string
  agreement_pdf_url?: string | null
}

type Props = {
  booking: BookingLike
  /** institution can upload/replace; expert only views when present */
  role: 'institution' | 'expert'
  onUpdated?: (updated: any) => void
}

/**
 * Optional booking agreement PDF.
 * Does not gate confirmation, attendance, completion, or payment.
 */
export function BookingAgreementActions({ booking, role, onUpdated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const url = booking.agreement_pdf_url || null

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file')
      return
    }
    setUploading(true)
    try {
      const updated = await api.bookings.uploadAgreementPdf(booking.id, file)
      toast.success(url ? 'Agreement PDF replaced' : 'Agreement PDF uploaded')
      onUpdated?.(updated)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload agreement PDF')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (role === 'expert') {
    if (!url) return null
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border border-[#D6D6D6] text-[13px] font-medium text-[#000000] rounded-[25px] bg-white hover:bg-white"
      >
        <a href={url} target="_blank" rel="noopener noreferrer">
          <FileText className="h-4 w-4 mr-1" />
          View agreement
        </a>
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {url ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border border-[#D6D6D6] text-[13px] font-medium text-[#000000] rounded-[25px] bg-white hover:bg-white"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            <FileText className="h-4 w-4 mr-1" />
            View agreement
          </a>
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="border border-[#008260] text-[13px] font-medium text-[#008260] rounded-[25px] bg-white hover:bg-white"
      >
        <Upload className="h-4 w-4 mr-1" />
        {uploading ? 'Uploading…' : url ? 'Replace agreement' : 'Upload agreement (optional)'}
      </Button>
    </div>
  )
}
