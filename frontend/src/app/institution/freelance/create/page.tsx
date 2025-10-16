'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function CreateFreelanceProject() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
      setLoading(false)
    }
    init()
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (!form.title.trim()) throw new Error('Title required')
      if (!form.description.trim()) throw new Error('Description required')
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      if (form.deadline) fd.append('deadline', form.deadline)
      if (form.budget_min) fd.append('budget_min', form.budget_min)
      if (form.budget_max) fd.append('budget_max', form.budget_max)
      if (form.skills?.trim()) fd.append('required_skills', form.skills)
      if (draftFile) fd.append('draft', draftFile)
      await api.freelance.createProject(fd)
      router.push('/institution/freelance/dashboard')
    } catch (e: any) {
      setError(e.message || 'Failed to create project')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Create Freelance Project</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} institution={institution} userType="institution" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="bg-white border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Freelancing</CardTitle>
            <CardDescription className="text-slate-600">Post a freelance project for students</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} required />
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea rows={5} value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} required />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Deadline</Label>
                  <Input type="date" value={form.deadline} onChange={(e) => setForm(prev => ({ ...prev, deadline: e.target.value }))} />
                </div>
                <div>
                  <Label>Budget Min (₹)</Label>
                  <Input type="number" value={form.budget_min} onChange={(e) => setForm(prev => ({ ...prev, budget_min: e.target.value }))} />
                </div>
                <div>
                  <Label>Budget Max (₹)</Label>
                  <Input type="number" value={form.budget_max} onChange={(e) => setForm(prev => ({ ...prev, budget_max: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Required Skills (comma-separated)</Label>
                <Input placeholder="e.g., JavaScript, React, Node.js" value={form.skills} onChange={(e) => setForm(prev => ({ ...prev, skills: e.target.value }))} />
              </div>
              <div>
                <Label>Draft Attachment (PDF)</Label>
                <Input type="file" accept="application/pdf" onChange={(e) => setDraftFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white" disabled={saving}>{saving ? 'Saving...' : 'Create'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


