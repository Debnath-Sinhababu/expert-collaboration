'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function FreelanceForm() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    budget_min: '',
    budget_max: '',
    skills: ''
  })

  const [draftFile, setDraftFile] = useState<File | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      const inst = await api.institutions.getByUserId(user.id)
      if (!inst) { router.push('/institution/profile-setup'); return }
      setInstitution(inst)
      if ((inst.type || '').toLowerCase() !== 'corporate') { router.push('/institution/home'); return }
    }
    init()
  }, [router])

  const submit = async () => {
    // Validation
    if (!form.title.trim()) {
      toast.error('Please enter a project title')
      return
    }
    if (!form.description.trim()) {
      toast.error('Please enter a project description')
      return
    }
    if (!form.deadline) {
      toast.error('Please select a deadline')
      return
    }
    if (!form.budget_min) {
      toast.error('Please enter minimum budget')
      return
    }
    if (!form.budget_max) {
      toast.error('Please enter maximum budget')
      return
    }
    if (!form.skills?.trim()) {
      toast.error('Please enter required skills')
      return
    }
    if (!draftFile) {
      toast.error('Please upload a draft attachment')
      return
    }

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('deadline', form.deadline)
      fd.append('budget_min', form.budget_min)
      fd.append('budget_max', form.budget_max)
      fd.append('required_skills', form.skills)
      fd.append('draft', draftFile)
      await api.freelance.createProject(fd)
      toast.success('Freelance project created successfully!')
      router.push('/institution/freelance/dashboard')
    } catch (e: any) {
      toast.error(e.message || 'Failed to create project')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#000000] mb-1">Create a Freelance</h2>
      <p className="text-[#6A6A6A] mb-6">Post a freelance project for students</p>

      <Card className="bg-white border border-[#DCDCDC] rounded-2xl mb-6">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Title *</Label>
              <Input 
                placeholder="Guest Lecture on AI" 
                value={form.title} 
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} 
                className="border-[#DCDCDC]"
              />
            </div>

            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Description*</Label>
              <Textarea 
                rows={5} 
                placeholder="Describe the project details" 
                value={form.description} 
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} 
                className="border-[#DCDCDC]"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Deadline *</Label>
              <Input 
                type="date" 
                placeholder="DD/MM/YYYY"
                value={form.deadline} 
                onChange={(e) => setForm(prev => ({ ...prev, deadline: e.target.value }))} 
                className="border-[#DCDCDC]"
              />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Minimum Budget (₹) *</Label>
              <Input 
                type="number" 
                value={form.budget_min} 
                onChange={(e) => setForm(prev => ({ ...prev, budget_min: e.target.value }))} 
                className="border-[#DCDCDC]"
              />
            </div>
            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Maximum Budget (₹) *</Label>
              <Input 
                type="number" 
                value={form.budget_max} 
                onChange={(e) => setForm(prev => ({ ...prev, budget_max: e.target.value }))} 
                className="border-[#DCDCDC]"
              />
            </div>
            </div>

            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Required Skills (comma-separated) *</Label>
              <Input 
                placeholder="e.g. AI, Machine Learning, Deep Learning" 
                value={form.skills} 
                onChange={(e) => setForm(prev => ({ ...prev, skills: e.target.value }))} 
                className="border-[#DCDCDC]"
              />
            </div>

            <div>
              <Label className="text-[#000000] font-medium mb-2 block">Draft Attachment (PDF) *</Label>
              <div className="relative">
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setDraftFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="draft-upload"
                />
                <label
                  htmlFor="draft-upload"
                  className="flex items-center gap-3 px-4 py-2.5 border border-[#DCDCDC] rounded-md cursor-pointer hover:border-[#008260] transition-colors bg-white"
                >
                  <svg className="w-5 h-5 text-[#6A6A6A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-sm text-[#6A6A6A]">
                    {draftFile ? draftFile.name : 'No File Chosen'}
                  </span>
                  <span className="ml-auto px-4 py-1 bg-[#E8E8E8] text-[#000000] text-sm rounded hover:bg-[#D8D8D8] transition-colors">
                    Choose File
                  </span>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end items-center gap-3">
        <Button variant="outline" onClick={() => router.back()} className="border-[#DCDCDC] text-[#000000] hover:bg-slate-50 px-8">Back</Button>
        <Button onClick={submit} disabled={saving} className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-md px-8">{saving ? 'Creating...' : 'Create Freelance'}</Button>
      </div>
    </div>
  )
}


