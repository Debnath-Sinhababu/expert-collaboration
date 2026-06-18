'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { superAdminApi } from '@/lib/superadmin/api'

export default function SuperAdminRequirementDetailPage() {
  const params = useParams<{ id: string }>()
  const [expertSearch, setExpertSearch] = useState('')
  const [experts, setExperts] = useState<any[]>([])
  const [expertId, setExpertId] = useState('')
  const [stage, setStage] = useState('added')
  const [interviewAt, setInterviewAt] = useState('')
  const [notes, setNotes] = useState('')
  const [added, setAdded] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const decoded = decodeURIComponent(params.id)
  const { requirementType, requirementId } = useMemo(() => {
    const [type, ...rest] = decoded.split(':')
    return { requirementType: type || 'project', requirementId: rest.join(':') || decoded }
  }, [decoded])

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
    setSaving(true)
    try {
      const created = await superAdminApi.addRequirementExpert(requirementId, {
        expert_id: expertId,
        requirement_type: requirementType,
        stage,
        interview_scheduled_at: interviewAt || null,
        notes,
      })
      setAdded((current) => [created, ...current])
      setExpertId('')
      setStage('added')
      setInterviewAt('')
      setNotes('')
      toast.success('Expert added to requirement')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expert')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Requirement Pipeline" description={`Requirement ${requirementId} (${requirementType})`}>
        <form onSubmit={addExpert} className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expertSearch">Search expert</Label>
            <Input id="expertSearch" value={expertSearch} onChange={(e) => setExpertSearch(e.target.value)} placeholder="Search by name or email" />
          </div>
          <div className="space-y-2">
            <Label>Expert</Label>
            <Select value={expertId} onValueChange={setExpertId}>
              <SelectTrigger>
                <SelectValue placeholder="Select expert" />
              </SelectTrigger>
              <SelectContent>
                {experts.map((expert) => (
                  <SelectItem key={expert.id} value={expert.id}>{expert.name} ({expert.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="added">Added</SelectItem>
                <SelectItem value="interview_scheduled">Interview scheduled</SelectItem>
                <SelectItem value="selected">Selected</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interviewAt">Interview time</Label>
            <Input id="interviewAt" type="datetime-local" value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="lg:col-span-2">
            <Button type="submit" className="bg-[#008260] hover:bg-[#006d51]" disabled={saving}>
              {saving ? 'Adding...' : 'Add expert'}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Added In This Session">
        <DataTable
          rows={added}
          columns={[
            { key: 'expert', header: 'Expert', render: (row) => row.experts?.name || row.expert_id },
            { key: 'stage', header: 'Stage', render: (row) => row.stage },
            { key: 'interview', header: 'Interview', render: (row) => row.interview_scheduled_at ? new Date(row.interview_scheduled_at).toLocaleString() : '-' },
          ]}
        />
      </SectionCard>
    </div>
  )
}
