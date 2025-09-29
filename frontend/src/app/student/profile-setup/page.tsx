'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

export default function StudentProfileSetup() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [institutionList, setInstitutionList] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    institution_id: '',
    degree: '',
    year: '',
    specialization: '',
    skills: '',
    date_of_birth: '',
    gender: '',
    city: '',
    state: '',
    address: '',
    availability: '',
    preferred_engagement: '',
    preferred_work_mode: '',
    education_start_date: '',
    education_end_date: '',
    currently_studying: false,
    resume_url: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: ''
  })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeError, setResumeError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setForm(prev => ({ ...prev, email: user.email || '' }))
      try {
        const list = await api.institutions.getAll({ page: 1, limit: 50, exclude_type: 'Corporate' })
        const arr = Array.isArray(list) ? list : (list?.data || [])
        setInstitutionList(arr)
      } catch {}
      setLoading(false)
    }
    init()
  }, [router])

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setResumeError('Please select a PDF file'); return }
    if (file.size > 20 * 1024 * 1024) { setResumeError('Max size 20MB'); return }
    setResumeError('')
    setResumeFile(file)
    e.target.value = ''
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (!form.name.trim()) { toast.error('Enter name'); setSaving(false); return }
      if (!form.email.trim()) { toast.error('Enter email'); setSaving(false); return }
      if (!form.phone.trim()) { toast.error('Enter phone'); setSaving(false); return }
      if (!form.institution_id) { toast.error('Select institution'); setSaving(false); return }
      if (!form.degree.trim()) { toast.error('Enter degree'); setSaving(false); return }
      if (!form.specialization.trim()) { toast.error('Enter specialization'); setSaving(false); return }
      if (!form.skills.trim()) { toast.error('Enter skills'); setSaving(false); return }
      if (!form.city.trim()) { toast.error('Enter city'); setSaving(false); return }
      if (!form.state.trim()) { toast.error('Enter state'); setSaving(false); return }
      if (!form.availability) { toast.error('Select availability'); setSaving(false); return }
      if (!form.preferred_engagement) { toast.error('Select preferred engagement'); setSaving(false); return }
      if (!form.preferred_work_mode) { toast.error('Select preferred work mode'); setSaving(false); return }
      if (!form.education_start_date) { toast.error('Select education start'); setSaving(false); return }
      if (!form.currently_studying && !form.education_end_date) { toast.error('Select education end'); setSaving(false); return }
      if (!resumeFile) { toast.error('Upload resume (PDF)'); setSaving(false); return }
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const fd = new FormData()
      Object.entries({
        name: form.name,
        email: form.email,
        phone: form.phone || '',
        institution_id: form.institution_id || '',
        degree: form.degree || '',
        year: form.year || '',
        specialization: form.specialization || '',
        date_of_birth: form.date_of_birth || '',
        gender: form.gender || '',
        city: form.city || '',
        state: form.state || '',
        address: form.address || '',
        availability: form.availability || '',
        preferred_engagement: form.preferred_engagement || '',
        preferred_work_mode: form.preferred_work_mode || '',
        education_start_date: form.education_start_date || '',
        education_end_date: form.currently_studying ? '' : (form.education_end_date || ''),
        currently_studying: String(!!form.currently_studying),
        skills: form.skills,
        linkedin_url: form.linkedin_url || '',
        github_url: form.github_url || '',
        portfolio_url: form.portfolio_url || ''
      }).forEach(([k, v]) => fd.append(k, v as string))
      if (resumeFile) fd.append('resume', resumeFile)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${API_BASE_URL}/api/students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: fd
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to create profile')

      toast.success('Profile created')
      router.push('/student/home')
    } catch (e: any) {
      toast.error(e.message || 'Failed to create profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="bg-white border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Student Profile Setup</CardTitle>
            <CardDescription className="text-slate-600">Create your student profile to apply to internships</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
            <form onSubmit={submit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} required />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} required />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.date_of_birth} onChange={(e) => setForm(prev => ({ ...prev, date_of_birth: e.target.value }))} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm(prev => ({ ...prev, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>City *</Label>
                  <Input value={form.city} onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))} required />
                </div>
                <div>
                  <Label>State *</Label>
                  <Input value={form.state} onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))} required />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Institution *</Label>
                  <Select value={form.institution_id} onValueChange={(v) => setForm(prev => ({ ...prev, institution_id: v }))}>
                    <SelectTrigger aria-required="true"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {institutionList.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Degree *</Label>
                  <Input value={form.degree} onChange={(e) => setForm(prev => ({ ...prev, degree: e.target.value }))} required />
                </div>
                <div>
                  <Label>Year</Label>
                  <Input value={form.year} onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))} />
                </div>
                <div>
                  <Label>Specialization *</Label>
                  <Input value={form.specialization} onChange={(e) => setForm(prev => ({ ...prev, specialization: e.target.value }))} required />
                </div>
              </div>
              <div>
                <Label>Skills (comma-separated) *</Label>
                <Input value={form.skills} onChange={(e) => setForm(prev => ({ ...prev, skills: e.target.value }))} required />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Availability *</Label>
                  <Select value={form.availability} onValueChange={(v) => setForm(prev => ({ ...prev, availability: v }))}>
                    <SelectTrigger aria-required="true"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediately">Immediately</SelectItem>
                      <SelectItem value="1 month">1 month</SelectItem>
                      <SelectItem value="2+ months">2+ months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preferred Engagement *</Label>
                  <Select value={form.preferred_engagement} onValueChange={(v) => setForm(prev => ({ ...prev, preferred_engagement: v }))}>
                    <SelectTrigger aria-required="true"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preferred Work Mode *</Label>
                  <Select value={form.preferred_work_mode} onValueChange={(v) => setForm(prev => ({ ...prev, preferred_work_mode: v }))}>
                    <SelectTrigger aria-required="true"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In office">In office</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Education period */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Education Start *</Label>
                  <Input type="month" value={form.education_start_date} onChange={(e) => setForm(prev => ({ ...prev, education_start_date: e.target.value }))} required />
                </div>
                <div>
                  <Label>Education End{!form.currently_studying ? ' *' : ''}</Label>
                  <Input type="month" value={form.education_end_date} onChange={(e) => setForm(prev => ({ ...prev, education_end_date: e.target.value }))} disabled={form.currently_studying} required={!form.currently_studying} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" checked={form.currently_studying} onChange={(e) => setForm(prev => ({ ...prev, currently_studying: e.target.checked }))} />
                  <span className="text-sm text-slate-700">Currently studying</span>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>LinkedIn URL</Label>
                  <Input value={form.linkedin_url} onChange={(e) => setForm(prev => ({ ...prev, linkedin_url: e.target.value }))} />
                </div>
                <div>
                  <Label>GitHub URL</Label>
                  <Input value={form.github_url} onChange={(e) => setForm(prev => ({ ...prev, github_url: e.target.value }))} />
                </div>
                <div>
                  <Label>Portfolio URL</Label>
                  <Input value={form.portfolio_url} onChange={(e) => setForm(prev => ({ ...prev, portfolio_url: e.target.value }))} />
                </div>
              </div>

              {/* Resume Upload */}
              <div className="space-y-2">
                <Label>Resume/CV (PDF) *</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input type="file" id="student_resume" accept=".pdf" onChange={handleResumeSelect} className="hidden" />
                  <label htmlFor="student_resume" className="cursor-pointer">
                    <p className="text-sm text-slate-600 mb-1"><span className="font-medium text-blue-600">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-slate-500">PDF only, max 20MB</p>
                  </label>
                </div>
                {resumeFile && (
                  <div className="mt-2 text-sm text-slate-700">{resumeFile.name}</div>
                )}
                {resumeError && <Alert variant="destructive"><AlertDescription>{resumeError}</AlertDescription></Alert>}
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


