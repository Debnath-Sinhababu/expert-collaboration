'use client'

import { useEffect, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Save, Edit, ArrowLeft, FileText, X, Link2, GraduationCap, User, MapPin, Camera, Upload } from 'lucide-react'

export default function StudentProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [institutions, setInstitutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    portfolio_url: ''
  })

  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeError, setResumeError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        // Institutions (non corporate)
        try {
          const list = await api.institutions.getAll({ page: 1, limit: 100, exclude_type: 'Corporate' })
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
          portfolio_url: s.portfolio_url || ''
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
    e.target.value = ''
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
    e.target.value = ''
  }

  const removePhoto = () => {
    setSelectedPhoto(null)
    setPhotoPreview('')
    setPhotoError('')
  }

  const validate = () => {
    if (!form.name.trim()) { setError('Enter name'); return false }
    if (!form.phone.trim()) { setError('Enter phone'); return false }
    if (!form.institution_id) { setError('Select institution'); return false }
    if (!form.degree.trim()) { setError('Enter degree'); return false }
    if (!form.specialization.trim()) { setError('Enter specialization'); return false }
    if (!form.skills.trim()) { setError('Enter skills'); return false }
    if (!form.city.trim()) { setError('Enter city'); return false }
    if (!form.state.trim()) { setError('Enter state'); return false }
    if (!form.availability) { setError('Select availability'); return false }
    if (!form.preferred_engagement) { setError('Select preferred engagement'); return false }
    if (!form.preferred_work_mode) { setError('Select work mode'); return false }
    if (!form.education_start_date) { setError('Select education start'); return false }
    if (!form.currently_studying && !form.education_end_date) { setError('Select education end'); return false }
    setError('')
    return true
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student?.id) return
    if (!validate()) return
    setSaving(true)
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
          // Preserve existing resume_url when not uploading a new one
          resume_url: student?.resume_url || null,
          updated_at: new Date().toISOString()
        }
        await api.students.update(student.id, payload)
      }
      setSuccess('Profile updated')
      const s = await api.students.me()
      setStudent(s)
      setEditing(false)
      setResumeFile(null)
      setSelectedPhoto(null)
      setPhotoPreview('')
      setTimeout(() => setSuccess(''), 2000)
    } catch (e: any) {
      setError(e.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="inline-flex cursor-pointer items-center space-x-2" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 text-blue-100" />
            <span className="text-blue-100">Back</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} student={student} userType="student" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
        {success && <Alert className="mb-6 bg-green-50 border-green-200"><AlertDescription className="text-green-700">{success}</AlertDescription></Alert>}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="bg-white border-2 border-slate-200">
              <CardContent className="p-6 text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3 border-2 border-slate-200">
                  <AvatarImage src={photoPreview || student?.photo_url || ''} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                    {form.name?.charAt(0) || 'S'}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold text-slate-900">{form.name || 'Student'}</h2>
                <p className="text-slate-600 text-sm">{student?.specialization || 'Student specialization'}</p>
                {Array.isArray(student?.skills) && student.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1 justify-center">
                    {student.skills.slice(0, 5).map((s: string, i: number) => (
                      <Badge key={`${s}-${i}`} variant="secondary" className="text-xs bg-slate-100 text-slate-700">{s}</Badge>
                    ))}
                  </div>
                )}
                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  <div className="flex items-center justify-center gap-1"><User className="h-4 w-4" /> {form.email}</div>
                  <div className="flex items-center justify-center gap-1"><MapPin className="h-4 w-4" /> {[form.city, form.state].filter(Boolean).join(', ')}</div>
                </div>
                <Button className="w-full mt-4 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white" onClick={() => setEditing(!editing)}>
                  <Edit className="h-4 w-4 mr-2" />{editing ? 'Cancel' : 'Edit Profile'}
                </Button>
                {student?.resume_url && (
                  <a href={student.resume_url} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="w-full mt-2 border-2 border-slate-300 text-slate-700"><FileText className="h-4 w-4 mr-2" />View Resume</Button>
                  </a>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-white border-2 border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">Profile Information</CardTitle>
                <CardDescription className="text-slate-600">Update your student profile</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={save} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name *</Label>
                      <Input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} required disabled={!editing} />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} required disabled />
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} required disabled={!editing} />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <Select value={form.gender} onValueChange={(v) => setForm(prev => ({ ...prev, gender: v }))} disabled={!editing}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input type="date" value={form.date_of_birth} onChange={(e) => setForm(prev => ({ ...prev, date_of_birth: e.target.value }))} disabled={!editing} />
                    </div>
                    <div>
                      <Label>Institution *</Label>
                      <Select value={form.institution_id} onValueChange={(v) => setForm(prev => ({ ...prev, institution_id: v }))} disabled={!editing}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {institutions.map((i) => (
                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Degree *</Label>
                      <Input value={form.degree} onChange={(e) => setForm(prev => ({ ...prev, degree: e.target.value }))} required disabled={!editing} />
                    </div>
                    <div>
                      <Label>Academic Year</Label>
                      <Input value={form.year} onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))} disabled={!editing} />
                    </div>
                    <div>
                      <Label>Specialization *</Label>
                      <Input value={form.specialization} onChange={(e) => setForm(prev => ({ ...prev, specialization: e.target.value }))} required disabled={!editing} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Skills (comma-separated) *</Label>
                      <Input value={form.skills} onChange={(e) => setForm(prev => ({ ...prev, skills: e.target.value }))} required disabled={!editing} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Availability *</Label>
                      <Select value={form.availability} onValueChange={(v) => setForm(prev => ({ ...prev, availability: v }))} disabled={!editing}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediately">Immediately</SelectItem>
                          <SelectItem value="1 month">1 month</SelectItem>
                          <SelectItem value="2+ months">2+ months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Preferred Engagement *</Label>
                      <Select value={form.preferred_engagement} onValueChange={(v) => setForm(prev => ({ ...prev, preferred_engagement: v }))} disabled={!editing}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Preferred Work Mode *</Label>
                      <Select value={form.preferred_work_mode} onValueChange={(v) => setForm(prev => ({ ...prev, preferred_work_mode: v }))} disabled={!editing}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In office">In office</SelectItem>
                          <SelectItem value="Hybrid">Hybrid</SelectItem>
                          <SelectItem value="Remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Education Start *</Label>
                      <Input type="month" value={form.education_start_date} onChange={(e) => setForm(prev => ({ ...prev, education_start_date: e.target.value }))} required disabled={!editing} />
                    </div>
                    <div>
                      <Label>Education End{!form.currently_studying ? ' *' : ''}</Label>
                      <Input type="month" value={form.education_end_date} onChange={(e) => setForm(prev => ({ ...prev, education_end_date: e.target.value }))} required={!form.currently_studying} disabled={!editing || form.currently_studying} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input type="checkbox" checked={form.currently_studying} onChange={(e) => setForm(prev => ({ ...prev, currently_studying: e.target.checked }))} disabled={!editing} />
                      <span className="text-sm text-slate-700">Currently studying</span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>City *</Label>
                      <Input value={form.city} onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))} required disabled={!editing} />
                    </div>
                    <div>
                      <Label>State *</Label>
                      <Input value={form.state} onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))} required disabled={!editing} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Address</Label>
                      <Textarea value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} rows={3} disabled={!editing} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>LinkedIn URL</Label>
                      <Input value={form.linkedin_url} onChange={(e) => setForm(prev => ({ ...prev, linkedin_url: e.target.value }))} disabled={!editing} />
                    </div>
                    <div>
                      <Label>GitHub URL</Label>
                      <Input value={form.github_url} onChange={(e) => setForm(prev => ({ ...prev, github_url: e.target.value }))} disabled={!editing} />
                    </div>
                    <div>
                      <Label>Portfolio URL</Label>
                      <Input value={form.portfolio_url} onChange={(e) => setForm(prev => ({ ...prev, portfolio_url: e.target.value }))} disabled={!editing} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Resume/CV (PDF)</Label>
                    {editing ? (
                      <>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                          <input type="file" id="student_resume" accept=".pdf" onChange={handleResumeSelect} className="hidden" />
                          <label htmlFor="student_resume" className="cursor-pointer">
                            <p className="text-sm text-slate-600 mb-1"><span className="font-medium text-blue-600">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-slate-500">PDF only, max 20MB</p>
                          </label>
                        </div>
                        {resumeFile && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded"><div className="flex items-center justify-between"><span className="text-sm text-blue-900 break-all">{resumeFile.name}</span><Button type="button" variant="outline" size="sm" className="h-7 px-2 text-red-600 border-red-300" onClick={() => setResumeFile(null)}><X className="h-3 w-3 mr-1" />Remove</Button></div></div>
                        )}
                        {resumeError && <Alert variant="destructive"><AlertDescription>{resumeError}</AlertDescription></Alert>}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        {student?.resume_url ? (
                          <a href={student.resume_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline text-sm flex items-center"><FileText className="h-4 w-4 mr-1" />Open Resume</a>
                        ) : (
                          <span className="text-slate-500 text-sm">No resume uploaded</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Optional profile photo upload (expert-style) */}
                  {editing && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700 flex items-center gap-2"><Camera className="h-4 w-4" /> Update Profile Photo</Label>
                        <p className="text-xs text-slate-500">JPEG/PNG/WebP, max 5MB</p>
                      </div>
                      {!photoPreview ? (
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                          <input type="file" id="student_profile_photo_edit" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
                          <label htmlFor="student_profile_photo_edit" className="cursor-pointer">
                            <div className="space-y-3">
                              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                <Upload className="h-8 w-8 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-slate-600 font-medium">Click to upload photo</p>
                                <p className="text-xs text-slate-500">or drag and drop</p>
                              </div>
                            </div>
                          </label>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <Avatar className="w-20 h-20 border-4 border-blue-200"><AvatarImage src={photoPreview} /><AvatarFallback className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">{form.name?.charAt(0) || 'S'}</AvatarFallback></Avatar>
                            <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-300" onClick={removePhoto}><X className="h-3 w-3 mr-1" />Remove</Button>
                          </div>
                          <p className="text-xs text-slate-500 break-all">{selectedPhoto?.name}</p>
                        </div>
                      )}
                      {photoError && <Alert variant="destructive"><AlertDescription>{photoError}</AlertDescription></Alert>}
                    </div>
                  )}

                  {editing && (
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={saving} className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
                        <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


