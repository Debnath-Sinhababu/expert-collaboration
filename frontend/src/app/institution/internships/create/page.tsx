'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import Logo from '@/components/Logo'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

const WORK_MODES = ['In office', 'Hybrid', 'Remote'] as const
const ENGAGEMENT = ['Part-time', 'Full-time'] as const
const DURATION_UNITS = ['weeks', 'months'] as const

export default function CreateInternshipPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [institution, setInstitution] = useState<any>(null)
  const router = useRouter()

  const [form, setForm] = useState({
    title: '',
    skills: '',
    work_mode: '', // In office | Hybrid | Remote
    engagement: 'Full-time', // Part-time | Full-time
    openings: '',
    start_timing: 'immediately', // immediately | later
    start_date: '',
    duration_value: '',
    duration_unit: 'months',
    responsibilities: '',
    paid: 'Paid', // Paid | Unpaid
    stipend_min: '',
    stipend_max: '',
    stipend_unit: 'month',
    incentives_min: '',
    incentives_max: '',
    incentives_unit: 'month',
    ppo: 'false',
    perks: [] as string[],
    screening_questions: ['Please confirm your availability for this internship. If not available immediately, how early would you be able to join?'],
    alt_phone: '',
  })

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        const inst = await api.institutions.getByUserId(user.id)
        if (!inst) {
          setError('Institution profile not found. Please complete your profile setup first.')
          setLoading(false)
          return
        }
        if (inst.type !== 'Corporate') {
          setError('Only Corporate institutions can create internships.')
        }
        setInstitution(inst)
      } catch (e: any) {
        setError(e.message || 'Failed to load institution')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleChange = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  const validate = (): boolean => {
    if (!form.title.trim()) { toast.error('Please enter internship profile'); return false }
    if (!form.skills.trim()) { toast.error('Please enter required skills'); return false }
    if (!form.work_mode) { toast.error('Please select internship type'); return false }
    if (!form.engagement) { toast.error('Please select Part-time/Full-time'); return false }
    const openings = parseInt(form.openings)
    if (!openings || openings < 1) { toast.error('Please enter number of openings'); return false }
    if (form.start_timing === 'later' && !form.start_date) { toast.error('Please choose start date'); return false }
    const durVal = parseInt(form.duration_value)
    if (!durVal || durVal < 1) { toast.error('Please enter duration'); return false }
    if (!form.responsibilities.trim()) { toast.error('Please describe intern responsibilities'); return false }
    if (form.paid === 'Paid') {
      const min = parseInt(form.stipend_min || '0')
      const max = parseInt(form.stipend_max || '0')
      if (!min) { toast.error('Enter minimum stipend'); return false }
      if (max && max < min) { toast.error('Max stipend cannot be less than Min'); return false }
    }
    if (form.alt_phone && !/^\d{10}$/.test(form.alt_phone)) { toast.error('Alternate mobile must be 10 digits'); return false }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        skills_required: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        work_mode: form.work_mode,
        engagement: form.engagement,
        openings: parseInt(form.openings),
        start_timing: form.start_timing,
        start_date: form.start_timing === 'later' ? form.start_date : null,
        duration_value: parseInt(form.duration_value),
        duration_unit: form.duration_unit,
        responsibilities: form.responsibilities,
        paid: form.paid === 'Paid',
        stipend_min: form.paid === 'Paid' ? parseInt(form.stipend_min || '0') : null,
        stipend_max: form.paid === 'Paid' ? parseInt(form.stipend_max || '0') : null,
        stipend_unit: form.paid === 'Paid' ? form.stipend_unit : null,
        incentives_min: form.incentives_min ? parseInt(form.incentives_min) : null,
        incentives_max: form.incentives_max ? parseInt(form.incentives_max) : null,
        incentives_unit: (form.incentives_min || form.incentives_max) ? form.incentives_unit : null,
        ppo: form.ppo === 'true',
        perks: form.perks,
        screening_questions: form.screening_questions,
        alt_phone: form.alt_phone || null,
        visibility_scope: 'public',
        status: 'open'
      }

      const created = await api.internships.create(payload)
      toast.success('Internship created successfully')
      router.push('/institution/internships')
    } catch (err: any) {
      toast.error(err.message || 'Failed to create internship')
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
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div className="inline-flex items-center space-x-2">
            <Logo size="md" />
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">Post an Internship</span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-white border-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Internship details</CardTitle>
            <CardDescription className="text-slate-600">Provide complete information to attract better applicants</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Internship profile *</Label>
                  <Input placeholder="e.g. Android App Development" value={form.title} onChange={(e) => handleChange('title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Skills required *</Label>
                  <Input placeholder="e.g. Java" value={form.skills} onChange={(e) => handleChange('skills', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Internship type *</Label>
                  <div className="flex gap-4">
                    {WORK_MODES.map(m => (
                      <label key={m} className="inline-flex items-center gap-2">
                        <input type="radio" name="work_mode" checked={form.work_mode === m} onChange={() => handleChange('work_mode', m)} />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Part-time/Full-time *</Label>
                  <div className="flex gap-4">
                    {ENGAGEMENT.map(m => (
                      <label key={m} className="inline-flex items-center gap-2">
                        <input type="radio" name="engagement" checked={form.engagement === m} onChange={() => handleChange('engagement', m)} />
                        <span>{m}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Number of openings *</Label>
                  <Input type="number" placeholder="e.g. 4" value={form.openings} onChange={(e) => handleChange('openings', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Internship start date *</Label>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-6">
                      <label className="inline-flex items-center gap-2">
                        <input type="radio" name="start_timing" checked={form.start_timing === 'immediately'} onChange={() => handleChange('start_timing', 'immediately')} />
                        <span>Immediately (within next 30 days)</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="radio" name="start_timing" checked={form.start_timing === 'later'} onChange={() => handleChange('start_timing', 'later')} />
                        <span>Later</span>
                      </label>
                    </div>
                    {form.start_timing === 'later' && (
                      <Input type="date" value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)} />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Internship duration *</Label>
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    <Input type="number" placeholder="Choose duration" value={form.duration_value} onChange={(e) => handleChange('duration_value', e.target.value)} />
                    <Select value={form.duration_unit} onValueChange={(v) => handleChange('duration_unit', v)}>
                      <SelectTrigger className="col-span-2">
                        <SelectValue placeholder="months" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_UNITS.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Intern’s responsibilities *</Label>
                  <Textarea rows={4} placeholder="Describe responsibilities" value={form.responsibilities} onChange={(e) => handleChange('responsibilities', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Stipend *</Label>
                  <div className="flex gap-6">
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name="paid" checked={form.paid === 'Paid'} onChange={() => handleChange('paid', 'Paid')} />
                      <span>Paid</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" name="paid" checked={form.paid === 'Unpaid'} onChange={() => handleChange('paid', 'Unpaid')} />
                      <span>Unpaid</span>
                    </label>
                  </div>
                  {form.paid === 'Paid' && (
                    <div className="grid md:grid-cols-3 gap-3 max-w-xl">
                      <Input type="number" placeholder="Min" value={form.stipend_min} onChange={(e) => handleChange('stipend_min', e.target.value)} />
                      <Input type="number" placeholder="Max" value={form.stipend_max} onChange={(e) => handleChange('stipend_max', e.target.value)} />
                      <Select value={form.stipend_unit} onValueChange={(v) => handleChange('stipend_unit', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="/month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">/month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Incentives</Label>
                  <div className="grid md:grid-cols-3 gap-3 max-w-xl">
                    <Input type="number" placeholder="Min" value={form.incentives_min} onChange={(e) => handleChange('incentives_min', e.target.value)} />
                    <Input type="number" placeholder="Max" value={form.incentives_max} onChange={(e) => handleChange('incentives_max', e.target.value)} />
                    <Select value={form.incentives_unit} onValueChange={(v) => handleChange('incentives_unit', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="/month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">/month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Does this internship come with a pre-placement offer (PPO)?</Label>
                  <div className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.ppo === 'true'} onChange={(e) => handleChange('ppo', e.target.checked ? 'true' : 'false')} />
                    <span>Yes</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Alternate mobile number for this listing</Label>
                  <div className="grid grid-cols-6 gap-2 max-w-md items-center">
                    <div className="col-span-1">+91</div>
                    <Input className="col-span-5" placeholder="10 digit mobile number" value={form.alt_phone} onChange={(e) => handleChange('alt_phone', e.target.value.replace(/[^0-9]/g, ''))} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/institution/internships')}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">{saving ? 'Saving...' : 'Save & Continue'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


