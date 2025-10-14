'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center text-[#6A6A6A]">Project not found</div>
  }

  const applied = applicationStatus?.applied
  const status = applicationStatus?.status || 'pending'

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] backdrop-blur-sm sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-white">View Freelance</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} student={student} userType="student" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Project Details Card */}
        <Card className="bg-white borde-2 border-[#D6D6D6] rounded-lg mb-6">
          <CardContent className="p-8">
            {/* Title and Badge */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <h1 className="text-2xl font-bold text-[#000000]">{project.title}</h1>
              <Badge className="bg-[#FFF2E5] text-[#FF6B00] hover:bg-[#FFE5CC] border-none font-medium shrink-0">
                Open
              </Badge>
            </div>

            {/* Description */}
            <p className="text-sm text-[#000000] mb-6 leading-relaxed whitespace-pre-wrap">
              {project.description}
            </p>

            {/* Details Grid */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-xs text-[#C91B1B] font-medium mb-1">Deadline:</div>
                <div className="text-sm font-semibold text-[#000000]">
                  {project.deadline 
                    ? new Date(project.deadline).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'Not specified'}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#717171] font-medium mb-1">Budget:</div>
                <div className="text-sm font-semibold text-[#008260]">
                  {project.budget_min && project.budget_max 
                    ? `₹${project.budget_min}-₹${project.budget_max}/month`
                    : project.budget_min 
                    ? `₹${project.budget_min}/month`
                    : 'Negotiable'}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#717171] font-medium mb-1">Posted on:</div>
                <div className="text-sm font-semibold text-[#000000]">
                  {new Date(project.created_at || Date.now()).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Required Skills */}
            {(project.required_skills || []).length > 0 && (
              <div className="mb-4">
                <span className="text-xs text-[#717171] font-medium">Required Skills: </span>
                <span className="text-sm text-[#000000]">
                  {(project.required_skills || []).join(', ')}
                </span>
              </div>
            )}

            {/* Draft Attachments */}
            {project.draft_attachment_url && (
              <div>
                <span className="text-xs text-[#717171] font-medium">Draft Attachements: </span>
                <a 
                  href={project.draft_attachment_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-[#0066CC] hover:underline"
                >
                  {project.draft_attachment_url.split('/').pop() || 'Design-system.pdf'}
                </a>
              </div>
            )}

            {/* View Button (if already applied, show status instead) */}
            {applied && (
              <div className="mt-6 flex justify-end">
                <Button 
                  disabled
                  className="bg-[#008260] text-white rounded-full px-8 font-medium cursor-not-allowed"
                >
                  Already Applied
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Apply Now Section */}
        {!applied && (
          <Card className="bg-white border-2 border-[#D6D6D6] rounded-lg">
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-[#000000] mb-6">Apply Now</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#000000] mb-2">
                  Cover Letter (optional)
                </label>
                <Textarea 
                  rows={6} 
                  placeholder="Write in a brief sentences" 
                  value={coverLetter} 
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={apply} 
                  disabled={submitting}
                  className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-lg px-8 py-2 font-medium"
                >
                  {submitting ? 'Submitting...' : 'Apply Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Work Section - for shortlisted applications */}
        {applied && status === 'shortlisted' && applicationStatus?.application_id && (
          <Card className="bg-white border-2 border-[#D6D6D6] rounded-lg mt-6">
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-[#000000] mb-6">Submit Your Work</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#000000] mb-2">Note (optional)</label>
                <Textarea 
                  rows={4} 
                  placeholder="Describe your submission..." 
                  value={submitNote} 
                  onChange={(e) => setSubmitNote(e.target.value)}
                  className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#000000] mb-2">Attachment (PDF)</label>
                <div className="relative">
                  <Input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={(e) => setSubmitFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload"
                    className="flex items-center gap-3 px-4 py-2.5 border border-[#DCDCDC] rounded-md cursor-pointer hover:border-[#008260] transition-colors bg-white"
                  >
                    <svg className="w-5 h-5 text-[#6A6A6A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-sm text-[#6A6A6A]">
                      {submitFile ? submitFile.name : 'No File Chosen'}
                    </span>
                    <span className="ml-auto px-4 py-1 bg-[#E8E8E8] text-[#000000] text-sm rounded hover:bg-[#D8D8D8] transition-colors">
                      Choose File
                    </span>
                  </label>
                </div>
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
                      toast.success('Submission uploaded successfully')
                    } catch (e: any) { 
                      setError(e.message || 'Failed to submit')
                      toast.error(e.message || 'Failed to submit')
                    }
                    finally { setSubmitLoading(false) }
                  }}
                  className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-md px-8 py-2 font-medium"
                >
                  {submitLoading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submission Status - for submitted applications */}
        {applied && status === 'submitted' && (
          <Card className="bg-white border-2 border-[#D6D6D6] rounded-lg mt-6">
            <CardContent className="p-8">
              <h2 className="text-xl font-bold text-[#000000] mb-2">Submission Status</h2>
              <p className="text-sm text-[#6A6A6A] mb-4">You have submitted your work for this project</p>
              <div className="text-sm text-[#000000]">
                Status: <span className="font-semibold text-[#008260]">Submitted</span>
              </div>
            </CardContent>
          </Card>
        )}
        
      </div>
    </div>
  )
}


