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
import { INDIAN_STATES, INDIAN_DEGREES } from '@/lib/constants'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, X, Camera } from 'lucide-react'

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
  const [degreeOpen, setDegreeOpen] = useState(false)
  const [degreeHighlight, setDegreeHighlight] = useState(0)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string>('')
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp']
    if (!allowed.includes(file.type)) { setPhotoError('Select a valid image (JPEG/PNG/WebP)'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Max size 5MB'); return }
    setPhotoError('')
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
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
      if (photoFile) fd.append('profile_photo', photoFile)
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
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-[#008260] text-white py-4 px-6 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">CalXMap</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">Contact Us</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#000000] mb-2">Complete Your Student Profile</h1>
          <p className="text-[#6A6A6A]">Create your student profile to apply to internships</p>
        </div>

        <Card className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm">
          <CardHeader className="border-b border-[#E0E0E0]">
            <CardTitle className="text-xl font-semibold text-[#000000]">Student Profile Setup</CardTitle>
            <CardDescription className="text-sm text-[#6A6A6A]">Create your student profile to apply to internships</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
            <form  className="space-y-6">
              {/* Profile Photo */}
              <div className="space-y-2">
                <Label className="text-[#000000] font-medium flex items-center gap-2"><Camera className="h-4 w-4" /> Profile Picture</Label>
                <p className="text-xs text-[#6A6A6A]">Upload a professional photo (.JPEG, PNG, or WebP, max 5MB)</p>
                {!photoPreview ? (
                  <div className="border-2 border-dashed border-[#DCDCDC] rounded-lg p-8 text-center hover:border-[#008260] transition-colors">
                    <input type="file" id="student_profile_photo" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
                    <label htmlFor="student_profile_photo" className="cursor-pointer">
                      <div className="space-y-3">
                        <div className="mx-auto w-16 h-16 bg-[#E8F5F1] rounded-full flex items-center justify-center">
                          <Upload className="h-8 w-8 text-[#008260]" />
                        </div>
                        <div>
                          <p className="text-[#008260] font-medium">Click to Upload Photo</p>
                          <p className="text-xs text-[#6A6A6A]">or Drag & Drop</p>
                        </div>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="p-4 bg-[#F5F5F5] rounded-lg border border-[#DCDCDC]">
                    <div className="flex items-center justify-between mb-3">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={photoPreview} />
                        <AvatarFallback className="text-xl font-bold bg-[#E0E0E0] text-[#6A6A6A]">{form.name?.charAt(0) || 'S'}</AvatarFallback>
                      </Avatar>
                      <Button type="button" variant="outline" size="sm" className="border-[#9B0000] text-[#9B0000] hover:bg-[#9B0000] hover:text-white" onClick={() => { setPhotoFile(null); setPhotoPreview(''); setPhotoError('') }}>
                        <X className="h-3 w-3 mr-1" />Remove
                      </Button>
                    </div>
                    <p className="text-xs text-[#6A6A6A] break-all">{photoFile?.name}</p>
                  </div>
                )}
                {photoError && <Alert variant="destructive"><AlertDescription>{photoError}</AlertDescription></Alert>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Full Name *</Label>
                  <Input placeholder="Enter your full name" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} required className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Email *</Label>
                  <Input type="email" placeholder="example@gmail.com" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} required className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Phone Number *</Label>
                  <div className="flex gap-2">
                    <Input value="+91" disabled className="w-20 border-[#DCDCDC]" />
                    <Input placeholder="Phone Number" value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} required className="flex-1 border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                  </div>
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Date of Birth *</Label>
                  <Input type="date" placeholder="DD/MM/YYYY" value={form.date_of_birth} onChange={(e) => setForm(prev => ({ ...prev, date_of_birth: e.target.value }))} className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Gender *</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm(prev => ({ ...prev, gender: v }))}>
                    <SelectTrigger className="border-[#DCDCDC] focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">City *</Label>
                  <Input placeholder="Enter your city name" value={form.city} onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))} required className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">State *</Label>
                  <Select value={form.state} onValueChange={(v) => setForm(prev => ({ ...prev, state: v }))}>
                    <SelectTrigger aria-required="true" className="border-[#DCDCDC] focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[#000000] font-medium mb-2 block">Address</Label>
                  <Textarea placeholder="Enter your full address" value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Institution *</Label>
                  <Select value={form.institution_id} onValueChange={(v) => setForm(prev => ({ ...prev, institution_id: v }))}>
                    <SelectTrigger aria-required="true" className="border-[#DCDCDC] focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {institutionList.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Label className="text-[#000000] font-medium mb-2 block">Degree</Label>
                  <Input
                    placeholder="Enter your degree"
                    value={form.degree}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm(prev => ({ ...prev, degree: v }))
                      setDegreeOpen(v.length > 0)
                      setDegreeHighlight(0)
                    }}
                    onFocus={() => setDegreeOpen((form.degree || '').length > 0)}
                    onBlur={() => setTimeout(() => setDegreeOpen(false), 120)}
                    onKeyDown={(e) => {
                      const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                      const q = norm(form.degree)
                      const list = INDIAN_DEGREES.filter(d => q.length === 0 ? true : norm(d).includes(q))
                      if (!degreeOpen || list.length === 0) return
                      if (e.key === 'ArrowDown') { e.preventDefault(); setDegreeHighlight((h) => (h + 1) % list.length) }
                      if (e.key === 'ArrowUp') { e.preventDefault(); setDegreeHighlight((h) => (h - 1 + list.length) % list.length) }
                      if (e.key === 'Enter') { e.preventDefault(); const chosen = list[degreeHighlight]; if (chosen) { setForm(prev => ({ ...prev, degree: chosen })); setDegreeOpen(false) } }
                      if (e.key === 'Escape') { setDegreeOpen(false) }
                    }}
                    className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                  />
                  {degreeOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-[#DCDCDC] bg-white shadow-md max-h-64 overflow-auto">
                      {(() => {
                        const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                        const q = norm(form.degree)
                        return INDIAN_DEGREES.filter(d => q.length === 0 ? true : norm(d).includes(q))
                      })().map((d, idx) => (
                        <button
                          key={d}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setForm(prev => ({ ...prev, degree: d })); setDegreeOpen(false) }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-[#E8F5F1] ${idx === degreeHighlight ? 'bg-[#E8F5F1]' : ''}`}
                        >{d}</button>
                      ))}
                      {(() => {
                        const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                        const q = norm(form.degree)
                        return INDIAN_DEGREES.filter(d => q.length === 0 ? true : norm(d).includes(q)).length === 0
                      })() && (
                        <div className="px-3 py-2 text-sm text-[#6A6A6A]">No degree found</div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Year (semester)</Label>
                  <Input placeholder="e.g. 1998" value={form.year} onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))} className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Specialization *</Label>
                  <Input placeholder="Enter your specialization" value={form.specialization} onChange={(e) => setForm(prev => ({ ...prev, specialization: e.target.value }))} required className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                </div>
              </div>

              <div>
                <Label className="text-[#000000] font-medium mb-2 block">Skills (Comma-separated) *</Label>
                <Input placeholder="AI, Machine Learning, Python..." value={form.skills} onChange={(e) => setForm(prev => ({ ...prev, skills: e.target.value }))} required className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Availability *</Label>
                  <Select value={form.availability} onValueChange={(v) => setForm(prev => ({ ...prev, availability: v }))}>
                    <SelectTrigger aria-required="true" className="border-[#DCDCDC] focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediately">Immediately</SelectItem>
                      <SelectItem value="1 month">1 month</SelectItem>
                      <SelectItem value="2+ months">2+ months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Preferred Engagement *</Label>
                  <Select value={form.preferred_engagement} onValueChange={(v) => setForm(prev => ({ ...prev, preferred_engagement: v }))}>
                    <SelectTrigger aria-required="true" className="border-[#DCDCDC] focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Preferred Work Mode *</Label>
                  <Select value={form.preferred_work_mode} onValueChange={(v) => setForm(prev => ({ ...prev, preferred_work_mode: v }))}>
                    <SelectTrigger aria-required="true" className="border-[#DCDCDC] focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]"><SelectValue placeholder="Select" /></SelectTrigger>
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
                  <Label className="text-[#000000] font-medium mb-2 block">Education Start *</Label>
                  <Select value={form.education_start_date} onValueChange={(v) => setForm(prev => ({ ...prev, education_start_date: v }))}>
                    <SelectTrigger className="border-[#DCDCDC] focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="january">January</SelectItem>
                      <SelectItem value="february">February</SelectItem>
                      <SelectItem value="march">March</SelectItem>
                      <SelectItem value="april">April</SelectItem>
                      <SelectItem value="may">May</SelectItem>
                      <SelectItem value="june">June</SelectItem>
                      <SelectItem value="july">July</SelectItem>
                      <SelectItem value="august">August</SelectItem>
                      <SelectItem value="september">September</SelectItem>
                      <SelectItem value="october">October</SelectItem>
                      <SelectItem value="november">November</SelectItem>
                      <SelectItem value="december">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Education End *</Label>
                  <Select value={form.education_end_date} onValueChange={(v) => setForm(prev => ({ ...prev, education_end_date: v }))} disabled={form.currently_studying}>
                    <SelectTrigger className="border-[#DCDCDC] focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="january">January</SelectItem>
                      <SelectItem value="february">February</SelectItem>
                      <SelectItem value="march">March</SelectItem>
                      <SelectItem value="april">April</SelectItem>
                      <SelectItem value="may">May</SelectItem>
                      <SelectItem value="june">June</SelectItem>
                      <SelectItem value="july">July</SelectItem>
                      <SelectItem value="august">August</SelectItem>
                      <SelectItem value="september">September</SelectItem>
                      <SelectItem value="october">October</SelectItem>
                      <SelectItem value="november">November</SelectItem>
                      <SelectItem value="december">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <input type="checkbox" id="currently_studying" checked={form.currently_studying} onChange={(e) => setForm(prev => ({ ...prev, currently_studying: e.target.checked }))} className="w-4 h-4 border-[#DCDCDC] accent-[#008260]" />
                  <Label htmlFor="currently_studying" className="text-sm text-[#000000] font-normal cursor-pointer">Current Studying</Label>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">LinkedIn Profile URL</Label>
                  <Input placeholder="https://linkedin.com/in/..." value={form.linkedin_url} onChange={(e) => setForm(prev => ({ ...prev, linkedin_url: e.target.value }))} className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">GitHub Profile URL</Label>
                  <Input placeholder="https://github.com/..." value={form.github_url} onChange={(e) => setForm(prev => ({ ...prev, github_url: e.target.value }))} className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                </div>
                <div>
                  <Label className="text-[#000000] font-medium mb-2 block">Portfolio URL</Label>
                  <Input placeholder="https://..." value={form.portfolio_url} onChange={(e) => setForm(prev => ({ ...prev, portfolio_url: e.target.value }))} className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" />
                </div>
              </div>

              {/* Resume Upload */}
              <div className="space-y-2">
                <Label className="text-[#000000] font-medium mb-2 block">Resume/CV (PDF) *</Label>
                <p className="text-xs text-[#6A6A6A] mb-2">PDF files only, max 20MB</p>
                <div className="border-2 border-dashed border-[#DCDCDC] rounded-lg p-8 text-center hover:border-[#008260] transition-colors">
                  <input type="file" id="student_resume" accept=".pdf" onChange={handleResumeSelect} className="hidden" />
                  <label htmlFor="student_resume" className="cursor-pointer">
                    <div className="space-y-3">
                      <div className="mx-auto w-16 h-16 bg-[#E8F5F1] rounded-lg flex items-center justify-center">
                        <Upload className="h-8 w-8 text-[#008260]" />
                      </div>
                      <div>
                        <p className="text-[#008260] font-medium">Click to Upload</p>
                        <p className="text-xs text-[#6A6A6A]">or Drag & Drop</p>
                      </div>
                    </div>
                  </label>
                </div>
                {resumeFile && (
                  <div className="mt-2 p-3 bg-[#F5F5F5] rounded-md border border-[#DCDCDC]">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#000000] truncate">{resumeFile.name}</p>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setResumeFile(null); setResumeError('') }} className="text-[#9B0000] hover:text-[#9B0000] hover:bg-transparent">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {resumeError && <Alert variant="destructive"><AlertDescription>{resumeError}</AlertDescription></Alert>}
              </div>

             
            </form>
          </CardContent>
        </Card>
        <div className="flex justify-end items-center pt-4 gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()} className="border-[#DCDCDC] w-[120px] text-[#000000] hover:bg-slate-50 px-8 rounded-md">Back</Button>
                <Button type="button" onClick={submit} className="bg-[#008260] hover:bg-[#006B4F] text-white w-[120px] px-8 rounded-md" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              </div>
      </div>
    </div>
  )
}


