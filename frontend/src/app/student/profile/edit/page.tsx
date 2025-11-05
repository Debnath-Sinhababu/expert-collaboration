'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Save, ArrowLeft, FileText, X, GraduationCap, Camera, Upload } from 'lucide-react'
import { INDIAN_STATES, INDIAN_DEGREES } from '@/lib/constants'
import { toast } from 'sonner'
import Logo from '@/components/Logo'

export default function StudentProfileEdit() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [institutions, setInstitutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    about: ''
  })

  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeError, setResumeError] = useState('')
  const [degreeOpen, setDegreeOpen] = useState(false)
  const [degreeHighlight, setDegreeHighlight] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        // Institutions (non corporate)
        try {
          const list = await api.institutions.getAll({ page: 1, limit: 1000, exclude_type: 'Corporate' })
          setInstitutions(Array.isArray(list) ? list : (list?.data || []))
        } catch {}
        // Student profile
        const s = await api.students.me()
        setStudent(s)
        setForm({
          name: s.name || '',
          email: s.email || user.email || '',
          phone: s.phone || '',
          institution_id: s.institution_id || '',
          degree: s.degree || '',
          year: s.year || '',
          specialization: s.specialization || '',
          skills: Array.isArray(s.skills) ? s.skills.join(', ') : (s.skills || ''),
          date_of_birth: s.date_of_birth || '',
          gender: s.gender || '',
          city: s.city || '',
          state: s.state || '',
          address: s.address || '',
          availability: s.availability || '',
          preferred_engagement: s.preferred_engagement || '',
          preferred_work_mode: s.preferred_work_mode || '',
          education_start_date: s.education_start_date || '',
          education_end_date: s.education_end_date || '',
          currently_studying: !!s.currently_studying,
          linkedin_url: s.linkedin_url || '',
          github_url: s.github_url || '',
          portfolio_url: s.portfolio_url || '',
          about: s.about || ''
        })
      } catch (e: any) {
        setError(e.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
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
    if (e.target) e.target.value = ''
  }

  const removeResume = () => {
    setResumeFile(null)
    setResumeError('')
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp']
    if (!allowed.includes(file.type)) { setPhotoError('Please select a valid image (JPEG/PNG/WebP)'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('File size must be less than 5MB'); return }
    setPhotoError('')
    setSelectedPhoto(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    if (e.target) e.target.value = ''
  }

  const removePhoto = () => {
    setSelectedPhoto(null)
    setPhotoPreview('')
    setPhotoError('')
  }

  const validate = () => {
    if (!form.name.trim()) { toast.error('Enter name'); return false }
    if (!form.phone.trim()) { toast.error('Enter phone'); return false }
    if (!/^\d{10}$/.test(form.phone)) { toast.error('Phone number must be exactly 10 digits'); return false }
    if (!form.institution_id) { toast.error('Select institution'); return false }
    if (!form.degree.trim()) { toast.error('Enter degree'); return false }
    if (!form.specialization.trim()) { toast.error('Enter specialization'); return false }
    if (!form.skills.trim()) { toast.error('Enter skills'); return false }
    if (!form.city.trim()) { toast.error('Enter city'); return false }
    if (!form.state.trim()) { toast.error('Enter state'); return false }
    if (!form.availability) { toast.error('Select availability'); return false }
    if (!form.preferred_engagement) { toast.error('Select preferred engagement'); return false }
    if (!form.preferred_work_mode) { toast.error('Select work mode'); return false }
    if (!form.education_start_date) { toast.error('Select education start'); return false }
    if (!form.currently_studying && !form.education_end_date) { toast.error('Select education end'); return false }
    return true
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student?.id) return
    if (!validate()) return
    setSaving(true)
    setError('')
    try {
      if (resumeFile || selectedPhoto) {
        const fd = new FormData()
        Object.entries({
          ...form,
          skills: form.skills,
          currently_studying: String(!!form.currently_studying),
          education_end_date: form.currently_studying ? '' : (form.education_end_date || '')
        }).forEach(([k, v]) => fd.append(k as string, v as string))
        if (resumeFile) fd.append('resume', resumeFile)
        if (selectedPhoto) fd.append('profile_photo', selectedPhoto)
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const res = await fetch(`${API_BASE_URL}/api/students/${student.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token || ''}` },
          body: fd
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || 'Failed to update profile')
      } else {
        const payload: any = {
          ...form,
          skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
          currently_studying: !!form.currently_studying,
          education_end_date: form.currently_studying ? null : (form.education_end_date || null),
          resume_url: student?.resume_url || null,
          updated_at: new Date().toISOString()
        }
        await api.students.update(student.id, payload)
      }
      toast.success('Profile updated successfully!')
      setTimeout(() => {
        router.push('/student/profile')
      }, 1500)
    } catch (e: any) {
      setError(e.message || 'Failed to update profile')
      toast.error(e.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] border-b border-white/10 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/student/home" className="flex items-center group">
              <Logo size="header" />
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/student/home" className="text-white/80 hover:text-white font-medium transition-colors duration-200 relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200">
                <NotificationBell />
              </div>
              <ProfileDropdown user={user} student={student} userType="student" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-6 sm:py-8">
        <div className="mb-6">
          <Link href="/student/profile" className="inline-flex items-center text-[#008260] hover:text-[#006b4f] transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Link>
        </div>

        <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Edit Student Profile</CardTitle>
            <CardDescription className="text-slate-600">
              Update your student profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={save} className="space-y-8">
              {/* Profile Photo */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#000000] flex items-center space-x-2 pb-2 border-b border-[#ECECEC]">
                  <Camera className="h-5 w-5 text-[#008260]" />
                  <span>Profile Photo</span>
                </h3>
                {selectedPhoto ? (
                  <div className="relative">
                    <div className="p-4 bg-[#ECF2FF] rounded-lg border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <Avatar className="w-20 h-20 border-4 border-[#008260] flex-shrink-0">
                          <AvatarImage src={photoPreview} />
                          <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-[#008260] to-[#006b4f] text-white">
                            {form.name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removePhoto}
                          className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition-all duration-300 px-2 py-1 h-6 text-xs flex-shrink-0"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                      <div className="text-center sm:text-left w-full min-w-0">
                        <p className="text-sm text-slate-600 font-medium">New photo selected</p>
                        <p className="text-xs text-slate-500 break-all">{selectedPhoto.name}</p>
                      </div>
                    </div>
                  </div>
                ) : student?.photo_url ? (
                  <div className="relative">
                    <div className="p-4 bg-[#ECF2FF] rounded-lg border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <Avatar className="w-20 h-20 border-4 border-[#008260] flex-shrink-0">
                          <AvatarImage src={student.photo_url} />
                          <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-[#008260] to-[#006b4f] text-white">
                            {form.name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex gap-2">
                          <input
                            ref={photoInputRef}
                            type="file"
                            id="profile_photo_change"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => photoInputRef.current?.click()}
                            className="border-[#008260] text-[#008260] hover:bg-[#ECF2FF] transition-all duration-300 px-3 py-1 h-8 text-xs flex-shrink-0"
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                      <div className="text-center sm:text-left w-full min-w-0">
                        <p className="text-sm text-slate-600 font-medium">Current photo</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-[#008260] transition-colors">
                    <input
                      ref={photoInputRef}
                      type="file"
                      id="profile_photo"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <label htmlFor="profile_photo" className="cursor-pointer">
                      <div className="space-y-3">
                        <div className="mx-auto w-16 h-16 bg-[#ECF2FF] rounded-full flex items-center justify-center">
                          <Upload className="h-8 w-8 text-[#008260]" />
                        </div>
                        <div>
                          <p className="text-[#008260] font-medium">Click to upload <span className='text-slate-600'>new photo</span></p>
                          <p className="text-sm text-slate-500">or drag and drop</p>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
                {photoError && <Alert variant="destructive"><AlertDescription>{photoError}</AlertDescription></Alert>}
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#000000] flex items-center space-x-2 pb-2 border-b border-[#ECECEC]">
                  <GraduationCap className="h-5 w-5 text-[#008260]" />
                  <span>Basic Information</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#000000] font-medium">Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[#000000] font-medium">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      disabled
                      className="bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[#000000] font-medium">Phone *</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setForm(prev => ({ ...prev, phone: value }))
                      }}
                      type="tel"
                      maxLength={10}
                      pattern="\d{10}"
                      required
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-[#000000] font-medium">Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm(prev => ({ ...prev, gender: v }))}>
                      <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth" className="text-[#000000] font-medium">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={(e) => setForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution_id" className="text-[#000000] font-medium">Institution *</Label>
                    <Select value={form.institution_id} onValueChange={(v) => setForm(prev => ({ ...prev, institution_id: v }))}>
                      <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {institutions.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Education Information */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#000000] flex items-center space-x-2 pb-2 border-b border-[#ECECEC]">
                  <GraduationCap className="h-5 w-5 text-[#008260]" />
                  <span>Education Information</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="degree" className="text-[#000000] font-medium">Degree *</Label>
                    <div className="relative">
                      <Input
                        id="degree"
                        placeholder="Start typing degree..."
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
                        required
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                      />
                      {degreeOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-md max-h-64 overflow-auto">
                          {(() => {
                            const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                            const q = norm(form.degree)
                            return INDIAN_DEGREES.filter(d => q.length === 0 ? true : norm(d).includes(q))
                          })().map((d, idx) => (
                            <button
                              key={d}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); setForm(prev => ({ ...prev, degree: d })); setDegreeOpen(false) }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 ${idx === degreeHighlight ? 'bg-slate-100' : ''}`}
                            >{d}</button>
                          ))}
                          {(() => {
                            const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                            const q = norm(form.degree)
                            return INDIAN_DEGREES.filter(d => q.length === 0 ? true : norm(d).includes(q)).length === 0
                          })() && (
                            <div className="px-3 py-2 text-sm text-slate-500">No degree found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-[#000000] font-medium">Academic Year</Label>
                    <Input
                      id="year"
                      value={form.year}
                      onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization" className="text-[#000000] font-medium">Specialization *</Label>
                    <Input
                      id="specialization"
                      value={form.specialization}
                      onChange={(e) => setForm(prev => ({ ...prev, specialization: e.target.value }))}
                      required
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skills" className="text-[#000000] font-medium">Skills (comma-separated) *</Label>
                    <Input
                      id="skills"
                      value={form.skills}
                      onChange={(e) => setForm(prev => ({ ...prev, skills: e.target.value }))}
                      required
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                </div>
              </div>

              {/* Availability & Preferences */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#000000] flex items-center space-x-2 pb-2 border-b border-[#ECECEC]">
                  <span>Availability & Preferences</span>
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="availability" className="text-[#000000] font-medium">Availability *</Label>
                    <Select value={form.availability} onValueChange={(v) => setForm(prev => ({ ...prev, availability: v }))}>
                      <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediately">Immediately</SelectItem>
                        <SelectItem value="1 month">1 month</SelectItem>
                        <SelectItem value="2+ months">2+ months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferred_engagement" className="text-[#000000] font-medium">Preferred Engagement *</Label>
                    <Select value={form.preferred_engagement} onValueChange={(v) => setForm(prev => ({ ...prev, preferred_engagement: v }))}>
                      <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferred_work_mode" className="text-[#000000] font-medium">Preferred Work Mode *</Label>
                    <Select value={form.preferred_work_mode} onValueChange={(v) => setForm(prev => ({ ...prev, preferred_work_mode: v }))}>
                      <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In office">In office</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Education Dates */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#000000] flex items-center space-x-2 pb-2 border-b border-[#ECECEC]">
                  <span>Education Timeline</span>
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="education_start_date" className="text-[#000000] font-medium">Education Start (Month & Year) *</Label>
                    <Input
                      id="education_start_date"
                      type="month"
                      value={form.education_start_date}
                      onChange={(e) => setForm(prev => ({ ...prev, education_start_date: e.target.value }))}
                      required
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="education_end_date" className="text-[#000000] font-medium">Education End (Month & Year){!form.currently_studying ? ' *' : ''}</Label>
                    <Input
                      id="education_end_date"
                      type="month"
                      value={form.education_end_date}
                      onChange={(e) => setForm(prev => ({ ...prev, education_end_date: e.target.value }))}
                      required={!form.currently_studying}
                      disabled={form.currently_studying}
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="currently_studying"
                      checked={form.currently_studying}
                      onChange={(e) => setForm(prev => ({ ...prev, currently_studying: e.target.checked }))}
                      className="w-4 h-4 text-[#008260] border-gray-300 rounded focus:ring-[#008260]"
                    />
                    <Label htmlFor="currently_studying" className="text-sm text-slate-700 cursor-pointer">Currently studying</Label>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#000000] flex items-center space-x-2 pb-2 border-b border-[#ECECEC]">
                  <span>Location Information</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-[#000000] font-medium">City *</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                      required
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-[#000000] font-medium">State *</Label>
                    <Select value={form.state} onValueChange={(v) => setForm(prev => ({ ...prev, state: v }))}>
                      <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="address" className="text-[#000000] font-medium">Address</Label>
                    <Textarea
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#000000] flex items-center space-x-2 pb-2 border-b border-[#ECECEC]">
                  <span>Social Links</span>
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url" className="text-[#000000] font-medium">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      value={form.linkedin_url}
                      onChange={(e) => setForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github_url" className="text-[#000000] font-medium">GitHub URL</Label>
                    <Input
                      id="github_url"
                      value={form.github_url}
                      onChange={(e) => setForm(prev => ({ ...prev, github_url: e.target.value }))}
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolio_url" className="text-[#000000] font-medium">Portfolio URL</Label>
                    <Input
                      id="portfolio_url"
                      value={form.portfolio_url}
                      onChange={(e) => setForm(prev => ({ ...prev, portfolio_url: e.target.value }))}
                      className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#000000] flex items-center space-x-2 pb-2 border-b border-[#ECECEC]">
                  <span>About</span>
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="about" className="text-[#000000] font-medium">Bio/About</Label>
                  <Textarea
                    id="about"
                    value={form.about}
                    onChange={(e) => setForm(prev => ({ ...prev, about: e.target.value }))}
                    rows={4}
                    placeholder="Tell us about yourself..."
                    className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                  />
                </div>
              </div>

              {/* Resume */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#000000] flex items-center space-x-2 pb-2 border-b border-[#ECECEC]">
                  <FileText className="h-5 w-5 text-[#008260]" />
                  <span>Resume/CV</span>
                </h3>
                
                <div className="space-y-2">
                  <Label className="text-[#000000] font-medium">Resume/CV (PDF)</Label>
                  {resumeFile ? (
                    <div className="p-4 bg-[#ECF2FF] rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-[#008260] flex-shrink-0" />
                          <span className="text-sm text-slate-700 break-all">{resumeFile.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeResume}
                          className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition-all duration-300 px-2 py-1 h-6 text-xs flex-shrink-0 ml-2"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : student?.resume_url ? (
                    <div className="p-4 bg-[#ECF2FF] rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-[#008260]" />
                          <span className="text-sm text-slate-700">Current resume uploaded</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            id="resume_change"
                            accept=".pdf"
                            onChange={handleResumeSelect}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="border-[#008260] text-[#008260] hover:bg-[#ECF2FF] transition-all duration-300 px-3 py-1 h-8 text-xs"
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-[#008260] transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="resume"
                        accept=".pdf"
                        onChange={handleResumeSelect}
                        className="hidden"
                      />
                      <label htmlFor="resume" className="cursor-pointer">
                        <div className="space-y-3">
                          <div className="mx-auto w-16 h-16 bg-[#ECF2FF] rounded-full flex items-center justify-center">
                            <Upload className="h-8 w-8 text-[#008260]" />
                          </div>
                          <div>
                            <p className="text-[#008260] font-medium">Click to upload <span className='text-slate-600'>resume</span></p>
                            <p className="text-sm text-slate-500">PDF only, max 20MB</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                  {resumeError && <Alert variant="destructive"><AlertDescription>{resumeError}</AlertDescription></Alert>}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Link href="/student/profile">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="bg-[#008260] hover:bg-[#006d51] text-white rounded-md px-6"
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

