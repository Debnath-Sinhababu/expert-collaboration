'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { superAdminApi } from '@/lib/superadmin/api'
import { moneyInr, projectCompensationDisplay, projectEngagementQuantityDisplay, toExpertNet, toPlatformFee } from '@/lib/projectCompensation'

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value ?? '-'}</span>
    </div>
  )
}

export default function SuperAdminMarginReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: requirementId } = use(params)
  const router = useRouter()
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marginInput, setMarginInput] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await superAdminApi.requirementDetail('project', requirementId)
      setDetail(res)
    } catch (err) {
      setDetail(null)
      setError(err instanceof Error ? err.message : 'Failed to load requirement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [requirementId])

  async function approve() {
    const marginPercent = Number(marginInput)
    if (!marginInput || !Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent > 100) {
      toast.error('Enter a margin between 0 and 100')
      return
    }
    setSaving(true)
    try {
      await superAdminApi.setRequirementMargin('project', requirementId, { margin_percent: marginPercent })
      toast.success(`Margin set to ${marginPercent}% — requirement is now live to experts.`)
      router.push('/superadmin/margin-review')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve margin')
    } finally {
      setSaving(false)
    }
  }

  const requirement = detail?.requirement
  const institution = detail?.institution
  const totalBudget = requirement ? projectCompensationDisplay(requirement).totalBudgetGross : 0
  const previewMarginPercent = Number(marginInput)
  const hasValidPreview =
    totalBudget > 0 && marginInput !== '' && Number.isFinite(previewMarginPercent) && previewMarginPercent >= 0 && previewMarginPercent <= 100
  const previewExpertShare = hasValidPreview ? (100 - previewMarginPercent) / 100 : 0
  const previewExpertNet = hasValidPreview ? toExpertNet(totalBudget, previewExpertShare) : 0
  const previewPlatformFee = hasValidPreview ? toPlatformFee(totalBudget, previewExpertShare) : 0

  return (
    <div className="space-y-6">
      <Link href="/superadmin/margin-review" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" />
        Back to Margin Review
      </Link>

      {loading ? <p className="text-sm text-slate-600">Loading requirement...</p> : null}
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

      {requirement ? (
        <>
          <SectionCard title={requirement.title || 'Requirement'} description="Set the platform's cut for this requirement before it goes live to experts.">
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <DetailRow label="Institution" value={institution?.name || '-'} />
              <DetailRow label="Institution Email" value={institution?.email} />
              <DetailRow label="Type" value={requirement.type} />
              <DetailRow label="Submitted" value={formatDate(requirement.created_at)} />
              <DetailRow label="Start date" value={requirement.start_date ? new Date(requirement.start_date).toLocaleDateString() : '-'} />
              <DetailRow label="End date" value={requirement.end_date ? new Date(requirement.end_date).toLocaleDateString() : '-'} />
              {(() => {
                const pricing = projectCompensationDisplay(requirement)
                const engagement = projectEngagementQuantityDisplay(requirement)
                return (
                  <>
                    <DetailRow label="Pay unit" value={pricing.unitLabel} />
                    {engagement.quantity > 0 ? <DetailRow label={engagement.label} value={engagement.value} /> : null}
                    <DetailRow label="Total budget" value={pricing.totalBudgetGross > 0 ? moneyInr(pricing.totalBudgetGross) : requirement.total_budget ? `Rs. ${requirement.total_budget}` : '-'} />
                  </>
                )
              })()}
            </div>
            {requirement.description ? (
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                {requirement.description}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Margin approval" description="This requirement is not visible to experts until a margin is set. If unset within 15 minutes of posting, it auto-approves at the default 30%.">
            {requirement.margin_status === 'approved' ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <Percent className="h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-900">
                  Margin locked at {requirement.margin_percent}%. This requirement is live to experts.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Platform margin (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      placeholder="e.g. 30"
                      value={marginInput}
                      onChange={(event) => setMarginInput(event.target.value)}
                      className="mt-1 w-32 bg-white"
                    />
                  </div>
                  <Button type="button" onClick={approve} disabled={saving} className="bg-[#008260] hover:bg-[#006d51]">
                    {saving ? 'Approving...' : 'Approve & publish to experts'}
                  </Button>
                </div>
                {hasValidPreview ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Total budget</p>
                      <p className="mt-1 text-lg font-semibold text-slate-950">{moneyInr(totalBudget)}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-700">Expert will see (earns)</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-900">{moneyInr(previewExpertNet)}</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">Platform cut ({previewMarginPercent}%)</p>
                      <p className="mt-1 text-lg font-semibold text-amber-900">{moneyInr(previewPlatformFee)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">Enter a margin to preview what the expert will see and what the platform keeps.</p>
                )}
              </div>
            )}
          </SectionCard>
        </>
      ) : null}
    </div>
  )
}
