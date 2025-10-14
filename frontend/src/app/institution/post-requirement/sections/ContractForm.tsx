'use client'

import { useEffect, useState } from 'react'
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
import { toast } from 'sonner'

export default function ContractForm() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [error, setError] = useState('')
  const [availableSubskills, setAvailableSubskills] = useState<string[]>([])
  const [selectedSubskills, setSelectedSubskills] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: '',
    hourly_rate: '',
    total_budget: '',
    start_date: '',
    end_date: '',
    duration_hours: '',
    required_expertise: '',
    domain_expertise: '',
    subskills: [] as string[]
  })

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        const inst = await api.institutions.getByUserId(user.id)
        setInstitution(inst)
      } catch (e: any) { setError(e.message || 'Failed to load context') }
    }
    init()
  }, [router])

  const handleDomainChange = (domain: string) => {
    setForm(prev => ({ ...prev, domain_expertise: domain, subskills: [] }))
    const found = EXPERTISE_DOMAINS.find(d => d.name === domain)
    setAvailableSubskills([...(found?.subskills || [])])
    setSelectedSubskills([])
  }

  const handleSubskillChange = (vals: string[]) => {
    setSelectedSubskills(vals)
    setForm(prev => ({ ...prev, subskills: vals }))
  }

  const validate = (): boolean => {
    if (!form.title.trim()) { toast.error('Please enter project title'); return false }
    if (!form.type) { toast.error('Please select project type'); return false }
    if (!form.hourly_rate || parseFloat(form.hourly_rate) <= 0) { toast.error('Enter valid hourly rate'); return false }
    if (!form.total_budget || parseFloat(form.total_budget) <= 0) { toast.error('Enter valid total budget'); return false }
    if (!form.start_date) { toast.error('Select start date'); return false }
    if (!form.end_date) { toast.error('Select end date'); return false }
    if (new Date(form.end_date) <= new Date(form.start_date)) { toast.error('End date must be after start date'); return false }
    if (!form.duration_hours || parseInt(form.duration_hours) <= 0) { toast.error('Enter duration hours'); return false }
    if (!form.domain_expertise) { toast.error('Select domain expertise'); return false }
    if (!form.subskills || form.subskills.length === 0) { toast.error('Select required specializations'); return false }
    if (!form.description.trim()) { toast.error('Add description'); return false }
    return true
  }

  const submit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        institution_id: institution?.id,
        hourly_rate: parseFloat(form.hourly_rate),
        total_budget: parseFloat(form.total_budget),
        duration_hours: parseInt(form.duration_hours),
        required_expertise: form.required_expertise.split(',').map(s => s.trim()).filter(Boolean)
      }
      await api.projects.create(payload)
      toast.success('Requirement posted successfully!')
      router.push('/institution/dashboard')
    } catch (e: any) {
      toast.error(e.message || 'Failed to create project')
    } finally { setSubmitting(false) }
  }

  return (
    <div>
      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
      <h2 className="text-2xl font-bold text-[#000000] mb-1">Create a Contract Requirement</h2>
      <p className="text-[#6A6A6A] mb-6">Fill in the details to post a new requirement for experts</p>

      <Card className="bg-white border border-[#DCDCDC] rounded-2xl mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Project Title *</Label>
              <Input placeholder="Guest Lecture on AI" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} className="border-[#DCDCDC]" />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Project Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm(prev => ({ ...prev, type: v }))}>
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
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Hourly Rate (₹) *</Label>
              <Input type="number" placeholder="1000" value={form.hourly_rate} onChange={(e) => setForm(prev => ({ ...prev, hourly_rate: e.target.value }))} className="border-[#DCDCDC]" />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Total Budget (₹) *</Label>
              <Input type="number" placeholder="50000" value={form.total_budget} onChange={(e) => setForm(prev => ({ ...prev, total_budget: e.target.value }))} className="border-[#DCDCDC]" />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))} placeholder="DD/MM/YYYY" className="border-[#DCDCDC]" />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">End Date *</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))} placeholder="DD/MM/YYYY" className="border-[#DCDCDC]" />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Duration (Hours) *</Label>
              <Input type="number" placeholder="40" value={form.duration_hours} onChange={(e) => setForm(prev => ({ ...prev, duration_hours: e.target.value }))} className="border-[#DCDCDC]" />
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
            <div className="mt-4" onClick={(e) => e.stopPropagation()}>
              <Label className="text-[#000000] font-medium mb-2 block">Required Specializations *</Label>
              <MultiSelect options={availableSubskills} selected={selectedSubskills} onSelectionChange={handleSubskillChange} placeholder="Select required specializations..." className="w-full" />
            </div>
          )}

          <div className="mt-4">
            <Label className="text-[#000000] font-medium mb-2 block">Description*</Label>
            <Textarea rows={4} placeholder="Describe the project details" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} className="border-[#DCDCDC]" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end items-center gap-3">
        <Button variant="outline" onClick={() => router.back()} className="border-[#DCDCDC] text-[#000000] hover:bg-slate-50 px-8">Back</Button>
        <Button onClick={submit} disabled={submitting} className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-md px-8">{submitting ? 'Creating...' : 'Create Contract'}</Button>
      </div>
    </div>
  )
}


