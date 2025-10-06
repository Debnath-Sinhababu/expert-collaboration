'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { toast } from 'sonner'

export default function StudentFreelanceDetail() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [error, setError] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [applicationStatus, setApplicationStatus] = useState<{ applied: boolean; status: string | null; application_id?: string | null } | null>(null)
  const [submitNote, setSubmitNote] = useState('')
  const [submitFile, setSubmitFile] = useState<File | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      try {
        const s = await api.students.me(); setStudent(s)
        const p = await api.freelance.getProjectById(id); setProject(p)
        const st = await api.freelance.applicationStatus(id); setApplicationStatus(st)
      } catch (e: any) { setError(e.message || 'Failed to load') }
      finally { setLoading(false) }
    }
    if (id) init()
  }, [id, router])

  const apply = async () => {
    if (!project) return
    setSubmitting(true)
    try {
      await api.freelance.apply(project.id, coverLetter.trim() || undefined)
      const st = await api.freelance.applicationStatus(project.id)
      setApplicationStatus(st)
    } catch (e: any) { setError(e.message || 'Failed to apply') }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Not found</div>
  }

  const applied = applicationStatus?.applied
  const status = applicationStatus?.status || 'pending'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Freelance Project</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} student={student} userType="student" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card className="bg-white border-2 border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-slate-900">{project.title}</CardTitle>
            <CardDescription className="text-slate-600">{project.corporate?.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{project.description}</div>
            <div className="flex flex-wrap gap-2">
              {(project.required_skills || []).map((s: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">{s}</span>
              ))}
            </div>
            <div className="text-sm text-slate-600 flex flex-wrap gap-4">
              {project.deadline && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  Deadline: <span className="font-medium">{new Date(project.deadline).toLocaleDateString()}</span>
                </span>
              )}
              {(project.budget_min || project.budget_max) && <span>Budget: ₹{project.budget_min || '—'} - ₹{project.budget_max || '—'}</span>}
              {project.status && <span className="uppercase text-xs tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">{project.status}</span>}
            </div>
          </CardContent>
        </Card>

        {!applied && (
          <Card className="bg-white border-2 border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Apply</CardTitle>
              <CardDescription className="text-slate-600">Optional cover letter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={5} placeholder="Write a short cover letter (optional)" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={apply} disabled={submitting} className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">{submitting ? 'Submitting...' : 'Apply Now'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {applied && status === 'shortlisted' && applicationStatus?.application_id && (
          <Card className="bg-white border-2 border-slate-200 mt-6">
            <CardHeader>
              <CardTitle className="text-slate-900">Submit Your Work</CardTitle>
              <CardDescription className="text-slate-600">Optional note and PDF attachment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-700">Note (optional)</label>
                <Textarea rows={4} placeholder="Describe your submission..." value={submitNote} onChange={(e) => setSubmitNote(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-700">Attachment (PDF)</label>
                <Input type="file" accept="application/pdf" onChange={(e) => setSubmitFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={!submitFile || submitLoading}
                  onClick={async () => {
                    if (!applicationStatus?.application_id || !submitFile) return
                    const form = new FormData()
                    form.append('attachment', submitFile)
                    if (submitNote.trim()) form.append('note', submitNote.trim())
                    try {
                      setSubmitLoading(true)
                      await api.freelance.submitWork(project.id, applicationStatus.application_id, form)
                      setSubmitFile(null); setSubmitNote('')
                      const st = await api.freelance.applicationStatus(project.id)
                      setApplicationStatus(st)
                      // Hint: Optionally notify dashboard to refresh (can use router.refresh if needed)
                      toast.success('Submission uploaded successfully')
                    } catch (e: any) { setError(e.message || 'Failed to submit') }
                    finally { setSubmitLoading(false) }
                  }}
                  className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white"
                >
                  {submitLoading ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {applied && status === 'submitted' && (
          <Card className="bg-white border-2 border-slate-200 mt-6">
            <CardHeader>
              <CardTitle className="text-slate-900">Submission Status</CardTitle>
              <CardDescription className="text-slate-600">You have submitted your work for this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-700">Status: <span className="font-medium text-green-700">Submitted</span></div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


