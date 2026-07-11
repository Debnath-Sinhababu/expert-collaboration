'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { EXPERTISE_DOMAINS } from '@/lib/constants'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useInstitutionWorkspace } from '@/contexts/InstitutionWorkspaceContext'
import { fetchInstitutionForWorkspace } from '@/lib/institutionWorkspace'
import { ScreeningQuestionsEditor } from '@/components/requirements/ScreeningQuestionsEditor'
import { EMPLOYMENT_TYPE_OPTIONS, WORKPLACE_TYPE_OPTIONS } from '@/lib/requirementLabels'
import { expertDisplayName } from '@/lib/privacyDisplay'
import { ExpertAvailabilityTrigger } from '@/components/expert/ExpertAvailabilityTrigger'
import {
  COMPENSATION_UNIT_OPTIONS,
  type CompensationUnit,
  compensationUnitShortLabel,
  deriveCompensation,
  getDefaultCompensationUnit,
  legacyHourlyRateFromCompensation,
  moneyInr,
} from '@/lib/projectCompensation'

function formatInterviewPeriodDate(value: string) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatInterviewPeriodInterval(startDate: string, endDate: string) {
  const start = formatInterviewPeriodDate(startDate)
  const end = formatInterviewPeriodDate(endDate)
  if (!start || !end) return ''
  return start === end ? start : `${start} to ${end}`
}

const INTERVIEW_MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

function toDateInputValue(value?: string | null) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function parseInterviewPeriodDateLabel(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
  if (!match) return ''
  const monthKey = `${match[2].slice(0, 1).toUpperCase()}${match[2].slice(1, 3).toLowerCase()}`
  const month = INTERVIEW_MONTHS[monthKey]
  if (!month) return ''
  return `${match[3]}-${month}-${String(match[1]).padStart(2, '0')}`
}

function parseInterviewPeriodInterval(interval?: string | null) {
  if (!interval?.trim()) return { start: '', end: '' }
  const parts = interval.split(/\s+to\s+/i).map((part) => part.trim()).filter(Boolean)
  if (parts.length === 1) {
    const date = parseInterviewPeriodDateLabel(parts[0])
    return { start: date, end: date }
  }
  return {
    start: parseInterviewPeriodDateLabel(parts[0]),
    end: parseInterviewPeriodDateLabel(parts[1]),
  }
}

function normalizeExpertiseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

type ContractFormProps = {
  mode?: 'create' | 'edit'
  projectId?: string
}

export default function ContractForm({ mode = 'create', projectId }: ContractFormProps) {
  const isEdit = mode === 'edit' && Boolean(projectId)
  const router = useRouter()
  const { viewer, actingInstitutionId, basePath } = useInstitutionWorkspace()
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [error, setError] = useState('')
  const [loadingProject, setLoadingProject] = useState(isEdit)
  const [availableSubskills, setAvailableSubskills] = useState<string[]>([])
  const [selectedSubskills, setSelectedSubskills] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [existingRequirementPdfUrl, setExistingRequirementPdfUrl] = useState<string | null>(null)
  
  // Expert selection modal state
  const [showExpertSelectionModal, setShowExpertSelectionModal] = useState(false)
  const [recommendedExperts, setRecommendedExperts] = useState<any[]>([])
  const [expertsLoading, setExpertsLoading] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedExperts, setSelectedExperts] = useState<string[]>([])
  const [sendingNotifications, setSendingNotifications] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: '',
    compensation_unit: '' as CompensationUnit | '',
    unit_quantity: '1',
    duration_per_unit: '',
    institution_gross_per_unit: '',
    institution_gross_total: '',
    schedule_notes: '',
    other_description: '',
    start_date: '',
    end_date: '',
    opening_count: '1',
    required_expertise: '',
    domain_expertise: '',
    subskills: [] as string[],
    job_location: '',
    workplace_type: '',
    employment_type: '',
    interview_period_start_date: '',
    interview_period_end_date: '',
    screening_questions: [] as string[],
  })

  const [requirementPdf, setRequirementPdf] = useState<File | null>(null)
  const [requirementPdfError, setRequirementPdfError] = useState<string | null>(null)

  const compensationDerived = useMemo(
    () =>
      deriveCompensation({
        compensation_unit: form.compensation_unit,
        unit_quantity: form.unit_quantity,
        duration_per_unit: form.duration_per_unit,
        institution_gross_per_unit: form.institution_gross_per_unit,
        institution_gross_total: form.institution_gross_total,
      }),
    [
      form.compensation_unit,
      form.unit_quantity,
      form.duration_per_unit,
      form.institution_gross_per_unit,
      form.institution_gross_total,
    ]
  )

  const unitShort = compensationUnitShortLabel(form.compensation_unit)
  const showUnitQuantity = form.compensation_unit === 'per_session' || form.compensation_unit === 'per_day' || form.compensation_unit === 'hourly'
  const showDurationPerUnit =
    form.compensation_unit === 'per_session' ||
    form.compensation_unit === 'per_day' ||
    form.compensation_unit === 'fixed_package'
  const showGrossPerUnit = form.compensation_unit === 'per_session' || form.compensation_unit === 'per_day' || form.compensation_unit === 'hourly'
  const showPackageTotal = form.compensation_unit === 'fixed_package'
  const showScheduleNotes = ['fdp', 'workshop', 'training_program'].includes(form.type)
  const requireOtherDescription = form.type === 'other'
  const requireExplicitUnit = form.type === 'other' || !getDefaultCompensationUnit(form.type)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        const inst = await fetchInstitutionForWorkspace(user.id, viewer, actingInstitutionId)
        setInstitution(inst)
      } catch (e: any) { setError(e.message || 'Failed to load context') }
    }
    init()
  }, [router, viewer, actingInstitutionId])

  useEffect(() => {
    if (!isEdit || !projectId || !institution?.id) return

    let cancelled = false
    const loadProject = async () => {
      setLoadingProject(true)
      setError('')
      try {
        const project = await api.projects.getById(projectId)
        if (cancelled) return
        if (!project?.id) {
          setError('Project not found')
          return
        }
        if (project.institution_id && project.institution_id !== institution.id) {
          setError('You do not have access to edit this project')
          return
        }

        const domain = typeof project.domain_expertise === 'string'
          ? project.domain_expertise
          : Array.isArray(project.domain_expertise)
            ? (project.domain_expertise[0] || '')
            : ''
        const subskills = normalizeExpertiseList(project.subskills)
        const requiredExpertise = normalizeExpertiseList(project.required_expertise)
        const interviewDates = parseInterviewPeriodInterval(project.interview_period_interval)
        const domainConfig = EXPERTISE_DOMAINS.find((item) => item.name === domain)
        const mergedSubskills = [...new Set([...(domainConfig?.subskills || []), ...subskills])]

        setForm({
          title: project.title || '',
          description: project.description || '',
          type: project.type || '',
          compensation_unit: (project.compensation_unit as CompensationUnit) || getDefaultCompensationUnit(project.type) || 'hourly',
          unit_quantity: project.unit_quantity != null
            ? String(project.unit_quantity)
            : project.duration_hours != null
              ? String(project.duration_hours)
              : '1',
          duration_per_unit: project.duration_per_unit != null
            ? String(project.duration_per_unit)
            : project.compensation_unit === 'hourly' || !project.compensation_unit
              ? '1'
              : '',
          institution_gross_per_unit: project.institution_gross_per_unit != null
            ? String(project.institution_gross_per_unit)
            : project.hourly_rate != null
              ? String(project.hourly_rate)
              : '',
          institution_gross_total: project.institution_gross_total != null
            ? String(project.institution_gross_total)
            : project.total_budget != null
              ? String(project.total_budget)
              : '',
          schedule_notes: project.schedule_notes || '',
          other_description: project.other_description || '',
          start_date: toDateInputValue(project.start_date),
          end_date: toDateInputValue(project.end_date),
          opening_count: project.opening_count != null ? String(project.opening_count) : '1',
          required_expertise: requiredExpertise.join(', '),
          domain_expertise: domain,
          subskills,
          job_location: project.job_location || '',
          workplace_type: project.workplace_type || '',
          employment_type: project.employment_type || '',
          interview_period_start_date: interviewDates.start,
          interview_period_end_date: interviewDates.end,
          screening_questions: Array.isArray(project.screening_questions)
            ? project.screening_questions.map((q: string) => String(q))
            : [],
        })
        setSelectedSubskills(subskills)
        setAvailableSubskills(mergedSubskills)
        setExistingRequirementPdfUrl(project.requirement_pdf_url || null)
        setRequirementPdf(null)
        setRequirementPdfError(null)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load project')
      } finally {
        if (!cancelled) setLoadingProject(false)
      }
    }

    loadProject()
    return () => { cancelled = true }
  }, [isEdit, projectId, institution?.id])

  const handleDomainChange = (domain: string) => {
    setForm(prev => ({ ...prev, domain_expertise: domain, subskills: [] }))
    const found = EXPERTISE_DOMAINS.find(d => d.name === domain)
    setAvailableSubskills([...(found?.subskills || [])])
    setSelectedSubskills([])
  }

  const applyCompensationUnit = (unit: CompensationUnit | '', prev: typeof form) => {
    if (unit === 'hourly') {
      return { ...prev, compensation_unit: unit, duration_per_unit: '1', unit_quantity: prev.unit_quantity || '1' }
    }
    if (unit === 'fixed_package') {
      return { ...prev, compensation_unit: unit, unit_quantity: '1' }
    }
    return { ...prev, compensation_unit: unit }
  }

  const handleTypeChange = (type: string) => {
    const defaultUnit = getDefaultCompensationUnit(type)
    setForm((prev) => {
      const nextUnit = (defaultUnit || (type === 'other' ? '' : prev.compensation_unit)) as CompensationUnit | ''
      return {
        ...applyCompensationUnit(nextUnit, prev),
        type,
        other_description: type === 'other' ? prev.other_description : '',
      }
    })
  }

  const handleCompensationUnitChange = (unit: CompensationUnit) => {
    setForm((prev) => applyCompensationUnit(unit, prev))
  }

  const handleSubskillChange = (vals: string[]) => {
    setSelectedSubskills(vals)
    setForm(prev => ({ ...prev, subskills: vals }))
  }

  const validate = (): boolean => {
    if (!form.title.trim()) { toast.error('Please enter project title'); return false }
    if (!form.type) { toast.error('Please select project type'); return false }
    if (requireOtherDescription && form.other_description.trim().length < 20) {
      toast.error('Describe the engagement in at least 20 characters for type Other')
      return false
    }
    if (!form.compensation_unit) {
      toast.error(requireExplicitUnit ? 'Select how you will pay' : 'Select compensation unit')
      return false
    }
    if (showUnitQuantity && (!form.unit_quantity || Number(form.unit_quantity) <= 0)) {
      toast.error(
        form.compensation_unit === 'hourly'
          ? 'Enter expected total hours'
          : form.compensation_unit === 'per_day'
            ? 'Enter number of days'
            : 'Enter number of sessions'
      )
      return false
    }
    if (showDurationPerUnit && (!form.duration_per_unit || Number(form.duration_per_unit) <= 0)) {
      toast.error(
        form.compensation_unit === 'fixed_package'
          ? 'Enter estimated total hours for the package'
          : form.compensation_unit === 'per_day'
            ? 'Enter hours per day'
            : 'Enter hours per session'
      )
      return false
    }
    if (showGrossPerUnit && (!form.institution_gross_per_unit || Number(form.institution_gross_per_unit) <= 0)) {
      toast.error(`Enter what you pay per ${unitShort}`)
      return false
    }
    if (showPackageTotal && (!form.institution_gross_total || Number(form.institution_gross_total) <= 0)) {
      toast.error('Enter total package fee you will pay')
      return false
    }
    if (compensationDerived.expectedTotalHours <= 0) {
      toast.error('Expected total hours must be greater than 0')
      return false
    }
    if (compensationDerived.totalBudgetGross <= 0) {
      toast.error('Total budget must be greater than 0')
      return false
    }
    if (!form.start_date) { toast.error('Select start date'); return false }
    if (!form.end_date) { toast.error('Select end date'); return false }
    if (new Date(form.end_date) <= new Date(form.start_date)) { toast.error('End date must be after start date'); return false }
    if (!form.opening_count || parseInt(form.opening_count) <= 0) { toast.error('Enter opening people count'); return false }
    if (!form.domain_expertise) { toast.error('Select domain expertise'); return false }
    if (!form.subskills || form.subskills.length === 0) { toast.error('Select required specializations'); return false }
    if (!form.workplace_type) { toast.error('Select workplace type'); return false }
    if (!form.employment_type) { toast.error('Select employment type'); return false }
    if (!form.job_location.trim()) { toast.error('Enter job location'); return false }
    if ((form.interview_period_start_date && !form.interview_period_end_date) || (!form.interview_period_start_date && form.interview_period_end_date)) {
      toast.error('Select both interview period dates or leave both blank')
      return false
    }
    if (
      form.interview_period_start_date &&
      form.interview_period_end_date &&
      new Date(form.interview_period_end_date) < new Date(form.interview_period_start_date)
    ) {
      toast.error('Interview period end date must be on or after start date')
      return false
    }
    if (!form.description.trim()) { toast.error('Add description'); return false }
    return true
  }

  const loadRecommendedExperts = async (projectId: string) => {
    try {
      setExpertsLoading(true)
      setSelectedProjectId(projectId)
      const data = await api.experts.getRecommended(projectId)
      setRecommendedExperts(Array.isArray(data) ? data : [])
      setShowExpertSelectionModal(true)
    } catch (error) {
      console.error('Error fetching recommended experts:', error)
      toast.error('Failed to load expert recommendations')
    } finally {
      setExpertsLoading(false)
    }
  }

  const handleNotifyExperts = async () => {
    if (selectedExperts.length === 0 || !selectedProjectId) return
    
    try {
      setSendingNotifications(true)
      const projectDetails = await api.projects.getById(selectedProjectId)
      const institutionDetails = await api.institutions.getById(institution.id)

      if (!projectDetails || !institutionDetails) {
        toast.error('Failed to get project or institution details')
        return
      }

      const expertsWithApplications = []
      const expertsWithoutApplications = []

      for (const expertId of selectedExperts) {
        const expert = recommendedExperts.find(e => e.id === expertId)
        if (!expert) continue

        const status = await api.applications.checkStatus(selectedProjectId, [expertId])
        const hasApplied = Array.isArray(status) && status[0]?.hasApplied

        if (hasApplied) {
          expertsWithApplications.push(expert)
        } else {
          expertsWithoutApplications.push(expert)
        }
      }

      // Create bookings for experts who have already applied
      for (const expert of expertsWithApplications) {
        try {
          const bookingData = {
            expert_id: expert.id,
            project_id: selectedProjectId,
            institution_id: institution.id,
            amount: projectDetails.hourly_rate,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hours_booked: projectDetails.duration_hours,
            status: 'in_progress',
            payment_status: 'pending'
          }
          await api.bookings.create(bookingData)
          
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/send-expert-selected`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              expertId: expert.id,
              projectTitle: projectDetails.title,
              institutionName: institutionDetails.name,
              type: 'expert_selected_with_booking',
              projectId: selectedProjectId
            })
          })
        } catch (error) {
          console.error(`Error creating booking for expert ${expert.id}:`, error)
        }
      }

      // Send interest notifications for experts who haven't applied
      for (const expert of expertsWithoutApplications) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/send-expert-interest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              expertId: expert.id,
              projectTitle: projectDetails.title,
              institutionName: institutionDetails.name,
              projectId: selectedProjectId,
              type: 'expert_interest_shown'
            })
          })
        } catch (error) {
          console.error(`Error sending interest notification to expert ${expert.id}:`, error)
        }
      }

      const bookingCount = expertsWithApplications.length
      const interestCount = expertsWithoutApplications.length
      
      let message = `Successfully processed ${selectedExperts.length} experts: `
      if (bookingCount > 0) message += `${bookingCount} bookings created, `
      if (interestCount > 0) message += `${interestCount} interest notifications sent`
      
      toast.success(message)
      setShowExpertSelectionModal(false)
      setSelectedExperts([])
      router.push(`${basePath}/dashboard`)
    } catch (error) {
      console.error('Error notifying experts:', error)
      toast.error('Failed to notify some experts')
    } finally {
      setSendingNotifications(false)
    }
  }

  const submit = async () => {
    if (!validate()) return
    if (requirementPdfError) {
      toast.error(requirementPdfError)
      return
    }
    if (isEdit && !projectId) {
      toast.error('Missing project id')
      return
    }
    setSubmitting(true)
    try {
      const interviewPeriodInterval = formatInterviewPeriodInterval(
        form.interview_period_start_date,
        form.interview_period_end_date
      )
      const unit = form.compensation_unit as CompensationUnit
      const derived = compensationDerived
      const payload = {
        ...form,
        interview_period_interval: interviewPeriodInterval || null,
        institution_id: institution?.id,
        compensation_unit: unit,
        unit_quantity: unit === 'fixed_package' ? 1 : derived.quantity,
        duration_per_unit: unit === 'hourly' ? 1 : derived.durationPerUnit,
        institution_gross_per_unit: unit === 'fixed_package' ? null : derived.grossPerUnit,
        institution_gross_total: derived.totalBudgetGross,
        total_budget: derived.totalBudgetGross,
        duration_hours: Math.round(derived.expectedTotalHours),
        hourly_rate: legacyHourlyRateFromCompensation(unit, derived),
        opening_count: parseInt(form.opening_count),
        required_expertise: form.required_expertise.split(',').map(s => s.trim()).filter(Boolean),
        schedule_notes: form.schedule_notes.trim() || null,
        other_description: form.type === 'other' ? form.other_description.trim() : null,
      }
      delete (payload as any).interview_period_start_date
      delete (payload as any).interview_period_end_date
      const formData = new FormData()
      const screeningFiltered = form.screening_questions.map((q) => q.trim()).filter(Boolean)

      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          if ((key === 'interview_period_interval' || key === 'schedule_notes' || key === 'other_description' || key === 'institution_gross_per_unit') && isEdit) {
            formData.append(key, '')
          }
          return
        }
        if (key === 'screening_questions') return
        if (Array.isArray(value)) {
          formData.append(key, value.join(','))
          return
        }
        formData.append(key, String(value))
      })
      formData.append('screening_questions', JSON.stringify(screeningFiltered))

      if (requirementPdf) {
        formData.append('requirement_pdf', requirementPdf)
      }

      if (isEdit && projectId) {
        await api.projects.update(projectId, formData)
        toast.success('Requirement updated successfully!')
        router.push(`${basePath}/dashboard`)
        return
      }

      const response = await api.projects.create(formData)
      toast.success('Requirement posted successfully!')
      
      // Load recommended experts for the new project
      if (response && response.id) {
        await loadRecommendedExperts(response.id)
      } else {
        router.push(`${basePath}/dashboard`)
      }
    } catch (e: any) {
      toast.error(e.message || (isEdit ? 'Failed to update project' : 'Failed to create project'))
    } finally { setSubmitting(false) }
  }

  if (loadingProject) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#008260]" />
      </div>
    )
  }

  return (
    <div>
      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
      <h2 className="text-2xl font-bold text-[#000000] mb-1">
        {isEdit ? 'Edit Contract Requirement' : 'Create a Contract Requirement'}
      </h2>
      <p className="text-[#6A6A6A] mb-6">
        {isEdit
          ? 'Update the requirement details. Experts already notified will keep their existing applications.'
          : 'Fill in the details to post a new requirement for experts'}
      </p>

      <Card className="bg-white border border-[#DCDCDC] rounded-2xl mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Project Title *</Label>
              <Input placeholder="Guest Lecture on AI" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} className="border-[#DCDCDC]" />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Project Type *</Label>
              <Select value={form.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="border-[#DCDCDC]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guest_lecture">Guest Lecture</SelectItem>
                  <SelectItem value="fdp">Faculty Development Program</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="curriculum_dev">Curriculum Development</SelectItem>
                  <SelectItem value="research_collaboration">Research Collaboration</SelectItem>
                  <SelectItem value="training_program">Training Program</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {requireOtherDescription && (
              <div className="md:col-span-2">
                <Label className="text-[#000000] font-medium mb-2 block">Engagement description *</Label>
                <Textarea
                  placeholder="Describe the engagement (what the expert will deliver, format, audience, etc.)"
                  value={form.other_description}
                  onChange={(e) => setForm((prev) => ({ ...prev, other_description: e.target.value }))}
                  className="border-[#DCDCDC] min-h-[80px]"
                />
                <p className="text-xs text-[#6A6A6A] mt-1">Required for type Other (min 20 characters).</p>
              </div>
            )}
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">How will you pay? *</Label>
              <Select
                value={form.compensation_unit || undefined}
                onValueChange={(v) => handleCompensationUnitChange(v as CompensationUnit)}
              >
                <SelectTrigger className="border-[#DCDCDC]">
                  <SelectValue placeholder={requireExplicitUnit ? 'Select pay unit' : 'Select pay unit'} />
                </SelectTrigger>
                <SelectContent>
                  {COMPENSATION_UNIT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!requireExplicitUnit && form.compensation_unit && (
                <p className="text-xs text-[#6A6A6A] mt-1">Default for this type — you can change it.</p>
              )}
            </div>
            {showUnitQuantity && (
              <div>
                <Label className="text-[#000000] font-medium mb-2 block">
                  {form.compensation_unit === 'hourly'
                    ? 'Expected total hours *'
                    : form.compensation_unit === 'per_day'
                      ? 'Number of days *'
                      : 'Number of sessions *'}
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder={form.compensation_unit === 'hourly' ? '40' : '8'}
                  value={form.unit_quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, unit_quantity: e.target.value }))}
                  className="border-[#DCDCDC]"
                />
              </div>
            )}
            {showDurationPerUnit && (
              <div>
                <Label className="text-[#000000] font-medium mb-2 block">
                  {form.compensation_unit === 'fixed_package'
                    ? 'Estimated total hours *'
                    : form.compensation_unit === 'per_day'
                      ? 'Hours per day *'
                      : 'Hours per session *'}
                </Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder={form.compensation_unit === 'fixed_package' ? '40' : '2'}
                  value={form.duration_per_unit}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration_per_unit: e.target.value }))}
                  className="border-[#DCDCDC]"
                />
              </div>
            )}
            {showGrossPerUnit && (
              <div>
                <Label className="text-[#000000] font-medium mb-2 block">
                  What you pay per {unitShort} (₹) *
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="15000"
                  value={form.institution_gross_per_unit}
                  onChange={(e) => setForm((prev) => ({ ...prev, institution_gross_per_unit: e.target.value }))}
                  className="border-[#DCDCDC]"
                />
                <p className="text-xs text-[#6A6A6A] mt-1">Gross amount you pay (100%). Expert sees ~70% of this.</p>
              </div>
            )}
            {showPackageTotal && (
              <div>
                <Label className="text-[#000000] font-medium mb-2 block">Total package fee you pay (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="100000"
                  value={form.institution_gross_total}
                  onChange={(e) => setForm((prev) => ({ ...prev, institution_gross_total: e.target.value }))}
                  className="border-[#DCDCDC]"
                />
                <p className="text-xs text-[#6A6A6A] mt-1">Gross package total (100%). Expert earns ~70%.</p>
              </div>
            )}
            {form.compensation_unit && (
              <div className="md:col-span-2 rounded-xl border border-[#DCDCDC] bg-[#FAFAFA] p-4">
                <p className="text-sm font-semibold text-[#000000] mb-3">Budget summary (auto-calculated)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-[#6A6A6A]">Expected total hours</p>
                    <p className="font-medium text-[#000000]">{compensationDerived.expectedTotalHours || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[#6A6A6A]">Total you pay (gross)</p>
                    <p className="font-medium text-[#000000]">
                      {compensationDerived.totalBudgetGross > 0 ? moneyInr(compensationDerived.totalBudgetGross) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6A6A6A]">Expert earns (approx)</p>
                    <p className="font-medium text-[#000000]">
                      {compensationDerived.expertNetTotal > 0 ? moneyInr(compensationDerived.expertNetTotal) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6A6A6A]">Platform fee (approx)</p>
                    <p className="font-medium text-[#000000]">
                      {compensationDerived.platformFeeTotal > 0 ? moneyInr(compensationDerived.platformFeeTotal) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {showScheduleNotes && (
              <div className="md:col-span-2">
                <Label className="text-[#000000] font-medium mb-2 block">Schedule notes (optional)</Label>
                <Input
                  placeholder='e.g. Saturdays only, 10am–1pm'
                  value={form.schedule_notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, schedule_notes: e.target.value }))}
                  className="border-[#DCDCDC]"
                />
              </div>
            )}
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))} placeholder="DD/MM/YYYY" className="border-[#DCDCDC]" />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Approx End Date *</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))} placeholder="DD/MM/YYYY" className="border-[#DCDCDC]" />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Opening people count *</Label>
              <Input type="number" min="1" placeholder="1" value={form.opening_count} onChange={(e) => setForm(prev => ({ ...prev, opening_count: e.target.value }))} className="border-[#DCDCDC]" />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Job location *</Label>
              <Input placeholder="e.g. Bengaluru, Karnataka or Remote — India" value={form.job_location} onChange={(e) => setForm(prev => ({ ...prev, job_location: e.target.value }))} className="border-[#DCDCDC]" />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Workplace type *</Label>
              <Select value={form.workplace_type} onValueChange={(v) => setForm(prev => ({ ...prev, workplace_type: v }))}>
                <SelectTrigger className="border-[#DCDCDC]">
                  <SelectValue placeholder="Remote / Hybrid / On-site" />
                </SelectTrigger>
                <SelectContent>
                  {WORKPLACE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Employment type *</Label>
              <Select value={form.employment_type} onValueChange={(v) => setForm(prev => ({ ...prev, employment_type: v }))}>
                <SelectTrigger className="border-[#DCDCDC]">
                  <SelectValue placeholder="Full-time / Part-time / Contract" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-[#000000] font-medium mb-2 block">Interview period (optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-[#DCDCDC] p-3">
                <div>
                  <Label className="text-xs text-[#6A6A6A] mb-1 block">Start date</Label>
                  <Input
                    type="date"
                    value={form.interview_period_start_date}
                    onChange={(e) => setForm(prev => ({ ...prev, interview_period_start_date: e.target.value }))}
                    className="border-[#DCDCDC]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#6A6A6A] mb-1 block">End date</Label>
                  <Input
                    type="date"
                    value={form.interview_period_end_date}
                    min={form.interview_period_start_date || undefined}
                    onChange={(e) => setForm(prev => ({ ...prev, interview_period_end_date: e.target.value }))}
                    className="border-[#DCDCDC]"
                  />
                </div>
              </div>
              {form.interview_period_start_date && form.interview_period_end_date && (
                <p className="mt-2 text-xs text-[#6A6A6A]">
                  Expert will see: <span className="font-medium text-[#000000]">{formatInterviewPeriodInterval(form.interview_period_start_date, form.interview_period_end_date)}</span>
                </p>
              )}
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Domain Expertise *</Label>
              <Select value={form.domain_expertise} onValueChange={handleDomainChange}>
                <SelectTrigger className="border-[#DCDCDC]">
                  <SelectValue placeholder="Select required domain" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERTISE_DOMAINS.map(d => (
                    <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-[#000000] font-medium mb-2 block">Additional Skills (comma-separated)</Label>
              <Input placeholder="AI, Machine Learning, Deep Learning" value={form.required_expertise} onChange={(e) => setForm(prev => ({ ...prev, required_expertise: e.target.value }))} className="border-[#DCDCDC]" />
            </div>
          </div>

          {form.domain_expertise && availableSubskills.length > 0 && (
            <div className="mt-4 min-w-0 max-w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <Label className="text-[#000000] font-medium mb-2 block">Required Specializations *</Label>
              <MultiSelect options={availableSubskills} selected={selectedSubskills} onSelectionChange={handleSubskillChange} placeholder="Select required specializations..." className="w-full min-w-0" />
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Not found? Type specialization and press Add"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    const value = e.currentTarget.value.trim()
                    if (!value) return
                    const next = [...new Set([...selectedSubskills, value])]
                    handleSubskillChange(next)
                    e.currentTarget.value = ''
                  }}
                  className="border-[#DCDCDC]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement | null
                    if (!input) return
                    const value = input?.value.trim()
                    if (!value) return
                    const next = [...new Set([...selectedSubskills, value])]
                    handleSubskillChange(next)
                    input.value = ''
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Label className="text-[#000000] font-medium mb-2 block">Requirement document (optional)</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
              className="border-[#DCDCDC]"
              onChange={(e) => {
                const file = e.target.files?.[0]
                setRequirementPdfError(null)
                if (!file) {
                  setRequirementPdf(null)
                  return
                }
                const allowedExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv']
                const ext = file.name.split('.').pop()?.toLowerCase()
                if (!ext || !allowedExt.includes(ext)) {
                  setRequirementPdf(null)
                  setRequirementPdfError('Only PDF, DOC, DOCX, XLS, XLSX, or CSV files are allowed.')
                  return
                }
                const maxSizeBytes = 20 * 1024 * 1024
                if (file.size > maxSizeBytes) {
                  setRequirementPdf(null)
                  setRequirementPdfError('File size must be 20MB or less.')
                  return
                }
                setRequirementPdf(file)
              }}
            />
            {existingRequirementPdfUrl && !requirementPdf && (
              <p className="mt-1 text-xs text-[#6A6A6A]">
                Current document:{' '}
                <a
                  href={existingRequirementPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#008260] hover:underline"
                >
                  View uploaded file
                </a>
                . Upload a new file only if you want to replace it.
              </p>
            )}
            {requirementPdf && !requirementPdfError && (
              <p className="mt-1 text-xs text-[#6A6A6A]">
                Selected file: <span className="font-medium text-[#000000]">{requirementPdf.name}</span>
              </p>
            )}
            {requirementPdfError && (
              <p className="mt-1 text-xs text-red-600">{requirementPdfError}</p>
            )}
          </div>

          <div className="mt-4">
            <ScreeningQuestionsEditor
              questions={form.screening_questions}
              onChange={(screening_questions) => setForm((prev) => ({ ...prev, screening_questions }))}
            />
          </div>

          <div className="mt-4">
            <Label className="text-[#000000] font-medium mb-2 block">Description*</Label>
            <Textarea rows={4} placeholder="Describe the project details" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} className="border-[#DCDCDC]" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end items-center gap-3">
        <Button variant="outline" onClick={() => router.push(`${basePath}/dashboard`)} className="border-[#DCDCDC] text-[#000000] hover:bg-slate-50 px-8">
          {isEdit ? 'Cancel' : 'Back'}
        </Button>
        <Button onClick={submit} disabled={submitting || Boolean(error && isEdit)} className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-md px-8">
          {submitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Contract' : 'Create Contract')}
        </Button>
      </div>

      {/* Expert Selection Modal */}
      <Dialog open={showExpertSelectionModal} onOpenChange={setShowExpertSelectionModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white border border-[#E0E0E0]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-[#000000]">Select Recommended Experts</DialogTitle>
            <DialogDescription className="text-sm text-[#6A6A6A]">
              Choose experts who match your project requirements. They will be notified about your project.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {expertsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260]"></div>
              </div>
            ) : recommendedExperts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#6A6A6A]">No recommended experts found for this project.</p>
                <Button 
                  onClick={() => {
                    setShowExpertSelectionModal(false)
                    router.push(`${basePath}/dashboard`)
                  }}
                  className="mt-4 bg-[#008260] hover:bg-[#006B4F] text-white"
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {recommendedExperts.map((expert) => {
                  const isSelected = selectedExperts.includes(expert.id)
                  return (
                    <label key={expert.id} className="block cursor-pointer">
                      <div className={`flex items-start gap-3 p-4 rounded-xl border bg-white transition-all duration-200 ${isSelected ? 'border-[#008260] bg-[#E8F5F1] shadow-md' : 'border-[#E0E0E0] hover:border-[#008260] hover:shadow-sm'}`}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedExperts(prev => [...prev, expert.id])
                            } else {
                              setSelectedExperts(prev => prev.filter(id => id !== expert.id))
                            }
                          }}
                          className="mt-1 border-2 rounded-md border-[#DCDCDC] data-[state=checked]:bg-[#008260] data-[state=checked]:border-[#008260]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-2">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarImage src={expert.photo_url} />
                              <AvatarFallback className="bg-[#E0E0E0] text-[#6A6A6A]">
                                {expert.name?.charAt(0)?.toUpperCase() || 'E'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[#000000] truncate">{expertDisplayName(expert)}</h4>
                              <p className="text-xs text-[#6A6A6A] truncate">{expert.email}</p>
                            </div>
                          </div>
                          {expert.domain_expertise && (
                            <Badge className="mb-2 bg-[#E8F5F1] text-[#008260] border border-[#008260] text-xs">
                              {expert.domain_expertise}
                            </Badge>
                          )}
                          {expert.bio && (
                            <p className="text-xs text-[#6A6A6A] line-clamp-2">{expert.bio}</p>
                          )}
                          {expert.hourly_rate && (
                            <p className="text-xs text-[#000000] font-medium mt-2">₹{getInstitutionRate(expert.hourly_rate)}/hour</p>
                          )}
                          <ExpertAvailabilityTrigger
                            expertId={expert.id}
                            startDate={form.start_date}
                            endDate={form.end_date}
                            projectId={selectedProjectId}
                            className="mt-3"
                          />
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t border-[#DCDCDC]">
            <p className="text-sm text-[#6A6A6A]">
              {selectedExperts.length} expert(s) selected
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowExpertSelectionModal(false)
                  router.push(`${basePath}/dashboard`)
                }}
                className="border border-[#DCDCDC] hover:border-[#008260] hover:bg-[#E8F5F1] text-[#000000] hover:text-[#008260]"
              >
                Skip
              </Button>
              <Button
                disabled={selectedExperts.length === 0 || sendingNotifications}
                onClick={handleNotifyExperts}
                className="bg-[#008260] hover:bg-[#006B4F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingNotifications ? 'Notifying...' : `Notify ${selectedExperts.length > 0 ? selectedExperts.length : ''} Expert${selectedExperts.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


