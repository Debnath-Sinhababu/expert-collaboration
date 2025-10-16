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
import Logo from '@/components/Logo'
import Link from 'next/link'

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
        
        // Check if user is a student
        try {
          const studentData = await api.students.me()
          setStudent(studentData)
        } catch (e) {
          // If not a student, redirect to home page
          router.push('/')
          return
        }
        
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
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading internship...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] backdrop-blur-sm border-b border-white/10 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/student/home" className="flex items-center">
            <Logo size="header" />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} student={student} userType="student" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
        {!internship ? (
          <div className="text-center text-[#6A6A6A]">Internship not found</div>
        ) : (
          <div>
            {/* Title and Location */}
            <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-[#C5C5C5]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#000000]">{internship.title}</h1>
              {/* Show button on desktop only */}
              <div className="hidden sm:block">
                {hasApplied ? (
                  <div className="text-center sm:text-left">
                    <Button size="lg" className="w-full sm:w-auto bg-[#008260] hover:bg-[#008260] text-white font-medium rounded-full px-8" disabled>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Applied
                    </Button>
                  </div>
                ) : (
                  <div className="text-center sm:text-left space-y-2">
                    <Button size="lg" onClick={() => setDrawerOpen(true)} className="w-full sm:w-auto bg-[#008260] hover:bg-[#006B4F] text-white font-medium rounded-full px-8">
                      <Send className="h-4 w-4 mr-2" />
                      Apply Now
                    </Button>
                  </div>
                )}
              </div>
              </div>
              {internship.corporate?.name && (
                <p className="text-[#6A6A6A] text-base mb-2">{internship.corporate.name}</p>
              )}
              {(internship.location || internship.corporate?.state) && (
                <div className="flex items-center gap-2 text-[#6A6A6A] text-base">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {[internship.location, internship.corporate?.state].filter(Boolean).join(', ')}
                </div>
              )}
            </div>

            {/* Internship Description */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-[#000000] mb-2 sm:mb-3">Internship Description</h2>
              <p className="text-[#6A6A6A] text-sm sm:text-base leading-relaxed">{internship.responsibilities}</p>
            </div>
            
            {/* Drawer for application - used by both mobile and desktop */}
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
                          className="border-2 border-slate-200 focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
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
                          className="border-2 border-slate-200 focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
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
                        className="bg-[#D6D6D6] hover:bg-[#D6D6D6] rounded-lg w-24"
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
                          className="bg-[#008260] hover:bg-[#006B4F] text-white w-24"
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
                          className="bg-[#008260] hover:bg-[#006B4F] text-white"
                          disabled={isApplying}
                        >
                          {isApplying ? 'Submitting...' : 'Submit Application'}
                        </Button>
                      )}
                    </div>
                  </div>
              </div>
            </Drawer>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 sm:gap-x-16 gap-y-4 sm:gap-y-6 mb-6 sm:mb-8">
              <div>
                <div className="text-[#6A6A6A] text-xs sm:text-sm mb-1">Openings:</div>
                <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">{internship.openings}</div>
              </div>
              <div>
                <div className="text-[#6A6A6A] text-xs sm:text-sm mb-1">Duration:</div>
                <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">{internship.duration_value} {internship.duration_unit}</div>
              </div>
              <div>
                <div className="text-[#6A6A6A] text-xs sm:text-sm mb-1">Stipend:</div>
                <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">{internship.paid ? `₹${internship.stipend_min}${internship.stipend_max ? '-₹' + internship.stipend_max : ''}/month` : 'Unpaid'}</div>
              </div>
              <div>
                <div className="text-[#6A6A6A] text-xs sm:text-sm mb-1">Work Mode:</div>
                <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">{internship.work_mode}</div>
              </div>
              <div>
                <div className="text-[#6A6A6A] text-xs sm:text-sm mb-1">Engagement:</div>
                <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">{internship.engagement}</div>
              </div>
              <div>
                <div className="text-[#6A6A6A] text-xs sm:text-sm mb-1">Start:</div>
                <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">
                  {String(internship.start_timing).toLowerCase() === 'immediately' ? 'Immediately' : (internship.start_date ? new Date(internship.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-')}
                </div>
              </div>
              <div>
                <div className="text-[#6A6A6A] text-xs sm:text-sm mb-1">Posted on:</div>
                <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">{new Date(internship.created_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
              </div>
              {typeof internship.ppo !== 'undefined' && (
                <div>
                  <div className="text-[#6A6A6A] text-xs sm:text-sm mb-1">Pre-Placement Offer:</div>
                  <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">{internship.ppo ? 'Yes' : 'No'}</div>
                </div>
              )}
            </div>

            {/* Perks */}
            {Array.isArray(internship.perks) && internship.perks.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <h3 className="text-base sm:text-lg font-bold text-[#000000] mb-2 sm:mb-3">Perks</h3>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {internship.perks.map((perk: string, idx: number) => (
                    <Badge key={idx} className="bg-[#D8E9FF] text-[#000000] hover:bg-[#D8E9FF] border-none text-xs sm:text-sm rounded-lg font-medium px-3 sm:px-4 py-1.5 sm:py-2">{perk}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {Array.isArray(internship.skills_required) && internship.skills_required.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <h3 className="text-base sm:text-lg font-bold text-[#000000] mb-2 sm:mb-3">Skills Required</h3>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {internship.skills_required.map((skill: string, idx: number) => (
                    <Badge key={idx} className="bg-[#D8E9FF] text-[#000000] hover:bg-[#D8E9FF] rounded-lg border-none text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Apply Button Section - Mobile Only (at the bottom) */}
            <div className="sm:hidden mt-4">
              {hasApplied ? (
                <Button size="lg" className="w-full bg-[#008260] hover:bg-[#008260] text-white font-medium rounded-full px-8" disabled>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Applied
                </Button>
              ) : (
                <Button size="lg" onClick={() => setDrawerOpen(true)} className="w-full bg-[#008260] hover:bg-[#006B4F] text-white font-medium rounded-full px-8">
                  <Send className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>
              )}
            </div>
          
          </div>
        )}
      </div>
    </div>
  )
}


