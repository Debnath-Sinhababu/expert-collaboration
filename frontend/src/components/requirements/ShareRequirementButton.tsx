'use client'

import { useEffect, useState } from 'react'
import {
  EmailShareButton,
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  EmailIcon,
  FacebookIcon,
  LinkedinIcon,
  TwitterIcon,
  WhatsappIcon,
} from 'react-share'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Link2, Share2 } from 'lucide-react'
import { toast } from 'sonner'

type ShareRequirementButtonProps = {
  /** Path only, e.g. `/requirements/contract/uuid` */
  path: string
  title: string
  className?: string
}

function buildUrl(path: string, origin: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${origin.replace(/\/$/, '')}${normalizedPath}`
}

export function ShareRequirementButton({
  path,
  title,
  className,
}: ShareRequirementButtonProps) {
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    const envBase = process.env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, '')
    const origin = envBase || (typeof window !== 'undefined' ? window.location.origin : '')
    if (origin) {
      setShareUrl(buildUrl(path, origin))
    }
  }, [path])

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          disabled={!shareUrl}
          aria-label="Share this requirement"
        >
          <Share2 className="h-4 w-4 mr-2 shrink-0" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-2rem,280px)] p-3"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-xs text-slate-500 mb-3">Share this listing</p>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <WhatsappShareButton url={shareUrl} title={title} separator=" — ">
            <WhatsappIcon size={40} round />
          </WhatsappShareButton>
          <FacebookShareButton url={shareUrl} hashtag="#Calxmap">
            <FacebookIcon size={40} round />
          </FacebookShareButton>
          <TwitterShareButton url={shareUrl} title={title}>
            <TwitterIcon size={40} round />
          </TwitterShareButton>
          <LinkedinShareButton url={shareUrl} title={title} summary={title}>
            <LinkedinIcon size={40} round />
          </LinkedinShareButton>
          <EmailShareButton url={shareUrl} subject={title} body={shareUrl}>
            <EmailIcon size={40} round />
          </EmailShareButton>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-[#008260] hover:text-[#006d51] hover:bg-[#008260]/10"
          onClick={copyLink}
        >
          <Link2 className="h-4 w-4 mr-2 shrink-0" />
          Copy link
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
