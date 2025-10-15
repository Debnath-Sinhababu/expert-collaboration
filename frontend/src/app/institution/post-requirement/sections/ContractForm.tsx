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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

export default function ContractForm() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [error, setError] = useState('')
  const [availableSubskills, setAvailableSubskills] = useState<string[]>([])
  const [selectedSubskills, setSelectedSubskills] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  
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
      router.push('/institution/dashboard')
    } catch (error) {
      console.error('Error notifying experts:', error)
      toast.error('Failed to notify some experts')
    } finally {
      setSendingNotifications(false)
    }
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
      const response = await api.projects.create(payload)
      toast.success('Requirement posted successfully!')
      
      // Load recommended experts for the new project
      if (response && response.id) {
        await loadRecommendedExperts(response.id)
      } else {
        router.push('/institution/dashboard')
      }
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
                    router.push('/institution/dashboard')
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
                              <h4 className="font-semibold text-[#000000] truncate">{expert.name}</h4>
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
                            <p className="text-xs text-[#000000] font-medium mt-2">₹{expert.hourly_rate}/hour</p>
                          )}
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
                  router.push('/institution/dashboard')
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


