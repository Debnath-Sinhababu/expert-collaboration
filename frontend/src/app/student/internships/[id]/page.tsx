'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Send, AlertCircle } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export default function StudentInternshipDetail() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [internship, setInternship] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasApplied, setHasApplied] = useState(false)
  const [applyStatus, setApplyStatus] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        try { setStudent(await api.students.me()) } catch {}
        const data = await api.internships.getById(id)
        if (data?.error) throw new Error(data.error)
        setInternship(data)
        const qs = Array.isArray(data?.screening_questions) ? data.screening_questions : []
        setAnswers(Array.from({ length: qs.length }, () => ''))
        try {
          const st = await api.internshipApplications.status(id)
          setHasApplied(!!st.applied)
          setApplyStatus(st.status || null)
        } catch {}
      } catch (e: any) {
        setError(e.message || 'Failed to load internship')
      } finally {
        setLoading(false)
      }
    }
    if (id) init()
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading internship...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Internship Details</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} student={student} userType="student" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
        {!internship ? (
          <div className="text-center text-slate-600">Internship not found</div>
        ) : (
          <Card className="bg-white border-2 border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">{internship.title}</CardTitle>
              <CardDescription className="text-slate-600">{internship.corporate?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-slate-700">{internship.responsibilities}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-slate-500">Work mode:</span> <span className="font-medium text-slate-900">{internship.work_mode}</span></div>
                <div><span className="text-slate-500">Engagement:</span> <span className="font-medium text-slate-900">{internship.engagement}</span></div>
                <div><span className="text-slate-500">Openings:</span> <span className="font-medium text-slate-900">{internship.openings}</span></div>
                <div><span className="text-slate-500">Duration:</span> <span className="font-medium text-slate-900">{internship.duration_value} {internship.duration_unit}</span></div>
                <div><span className="text-slate-500">Stipend:</span> <span className="font-medium text-slate-900">{internship.paid ? `₹${internship.stipend_min}${internship.stipend_max ? ' - ₹' + internship.stipend_max : ''}/month` : 'Unpaid'}</span></div>
                {internship.start_timing && (
                  <div><span className="text-slate-500">Start:</span> <span className="font-medium text-slate-900">{String(internship.start_timing).toLowerCase() === 'immediately' ? 'Immediately' : (internship.start_date ? new Date(internship.start_date).toLocaleDateString() : '-')}</span></div>
                )}
                {internship.location && (
                  <div><span className="text-slate-500">Location:</span> <span className="font-medium text-slate-900">{internship.location}</span></div>
                )}
                {typeof internship.ppo !== 'undefined' && (
                  <div><span className="text-slate-500">PPO:</span> <span className="font-medium text-slate-900">{internship.ppo ? 'Yes' : 'No'}</span></div>
                )}
              </div>
              {Array.isArray(internship.perks) && internship.perks.length > 0 && (
                <div>
                  <div className="text-sm text-slate-500">Perks</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {internship.perks.map((perk: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs bg-slate-100 text-slate-700">{perk}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(internship.skills_required) && internship.skills_required.length > 0 && (
                <div>
                  <div className="text-sm text-slate-500">Skills</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {internship.skills_required.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs border-slate-300 text-slate-700">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t pt-6">
                {hasApplied ? (
                  <div className="text-center sm:text-left">
                    <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white" disabled>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Applied
                    </Button>
                  </div>
                ) : (
                  <div className="text-center sm:text-left space-y-2">
                    <Button size="lg" onClick={() => setDrawerOpen(true)} className="w-full sm:w-auto bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
                      <Send className="h-4 w-4 mr-2" />
                      Apply Now
                    </Button>
                    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Screening Questions">
                      <div className="flex-1 overflow-y-auto p-4">
                            {Array.isArray(internship.screening_questions) && internship.screening_questions.length > 0 && stepIndex < internship.screening_questions.length ? (
                              <div className="space-y-4">
                                <div className="text-sm text-slate-600">Question {Math.min(stepIndex + 1, internship.screening_questions.length)} of {internship.screening_questions.length}</div>
                                <div className="text-slate-900 font-medium">{internship.screening_questions[stepIndex]}</div>
                                <Textarea
                                  placeholder="Type your answer"
                                  value={answers[stepIndex] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setAnswers(prev => prev.map((a, i) => i === stepIndex ? val : a))
                                  }}
                                  rows={5}
                                  className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                />
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="text-slate-900 font-medium">Cover Letter (optional)</div>
                                <Textarea
                                  placeholder="Share a brief note if you like..."
                                  value={coverLetter}
                                  onChange={(e) => setCoverLetter(e.target.value)}
                                  rows={6}
                                  className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                />
                              </div>
                            )}
                            {error && (
                              <Alert className="mt-4 border-2 border-red-200 bg-red-50"><AlertDescription className="text-red-700">{error}</AlertDescription></Alert>
                            )}
                          <div className="border-t p-4 flex items-center justify-between gap-2">
                            <div className="text-xs text-slate-500">
                              {Array.isArray(internship.screening_questions) && internship.screening_questions.length > 0 ? (
                                <span>Step {Math.min(stepIndex + 1, internship.screening_questions.length + 1)} of {internship.screening_questions.length + 1}</span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  if (Array.isArray(internship.screening_questions) && internship.screening_questions.length > 0) {
                                    if (stepIndex > 0) setStepIndex(stepIndex - 1)
                                    else setDrawerOpen(false)
                                  } else {
                                    setDrawerOpen(false)
                                  }
                                }}
                                className="border-2 border-slate-300"
                              >
                                Back
                              </Button>
                              {Array.isArray(internship.screening_questions) && internship.screening_questions.length > 0 && stepIndex < internship.screening_questions.length ? (
                                <Button
                                  onClick={() => {
                                    if (!(answers[stepIndex] || '').trim()) return
                                    setStepIndex(stepIndex + 1)
                                  }}
                                  disabled={!((answers[stepIndex] || '').trim())}
                                  className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white"
                                >
                                  Next
                                </Button>
                              ) : (
                                <Button
                                  onClick={async () => {
                                    try {
                                      setIsApplying(true)
                                      let combined = coverLetter || ''
                                      let screeningCombined: string | undefined = undefined
                                      if (Array.isArray(internship.screening_questions) && internship.screening_questions.length > 0) {
                                        const qa = internship.screening_questions.map((q: string, i: number) => `Q${i+1}: ${q}\nA${i+1}: ${answers[i] || ''}`).join("\n\n")
                                        screeningCombined = qa
                                      }
                                      await api.internshipApplications.create({ internship_id: id, cover_letter: combined || undefined, screening_answers: screeningCombined })
                                      setHasApplied(true)
                                      setDrawerOpen(false)
                                    } catch (e: any) {
                                      setError(e.message || 'Failed to apply')
                                    } finally {
                                      setIsApplying(false)
                                    }
                                  }}
                                  className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white"
                                  disabled={isApplying}
                                >
                                  {isApplying ? 'Submitting...' : 'Submit Application'}
                                </Button>
                              )}
                            </div>
                          </div>
                      </div>
                    </Drawer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


