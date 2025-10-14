'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, School, FileText, CalendarDays, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Drawer } from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'

export default function CorporateInternshipDetail() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [internship, setInternship] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [appsPage, setAppsPage] = useState(1)
  const [appsHasMore, setAppsHasMore] = useState(true)
  const [activeStage, setActiveStage] = useState<'pending' | 'interview' | 'selected' | 'rejected'>('pending')
  const [stageLoading, setStageLoading] = useState(false)
  const [stageCounts, setStageCounts] = useState<{ pending: number; interview: number; selected: number; rejected: number; total: number }>({ pending: 0, interview: 0, selected: 0, rejected: 0, total: 0 })
  const appsScrollRef = useRef<HTMLDivElement>(null)
  const [visibility, setVisibility] = useState<'public' | 'restricted' | string>('public')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined)
  const [interviewTime, setInterviewTime] = useState<string>('')
  const [appDrawerOpen, setAppDrawerOpen] = useState(false)
  const [activeApp, setActiveApp] = useState<any>(null)

  const statusClass = (status: string) => {
    const s = String(status || '').toLowerCase()
    if (s.includes('reject')) return 'bg-red-100 text-red-800 border border-red-200'
    if (s.includes('interview')) return 'bg-purple-100 text-purple-800 border border-purple-200'
    if (s.includes('shortlist') || s.includes('offer') || s.includes('hire')) return 'bg-green-100 text-green-800 border border-green-200'
    if (s.includes('pending')) return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    return 'bg-slate-100 text-slate-700 border border-slate-200'
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        const inst = await api.institutions.getByUserId(user.id)
        if (!inst) { router.push('/institution/profile-setup'); return }
        setInstitution(inst)
        if ((inst.type || '').toLowerCase() !== 'corporate') { router.push('/institution/home'); return }
        const data = await api.internships.getById(id)
        if (data?.error) throw new Error(data.error)
        setInternship(data)
        // Fetch applications for this internship
        // Initial load for pending stage
        const appsRes = await api.internships.getApplications(id, { page: 1, limit: 10, stage: 'pending' })
        setApplications(appsRes?.data || [])
        setVisibility(appsRes?.visibility || 'public')
        setAppsPage(1)
        setAppsHasMore((appsRes?.data || []).length >= 10)
        if (appsRes?.counts) setStageCounts(appsRes.counts)
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
      <header className="bg-[#008260] backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-white">CalXMap</div>
          <div className="flex items-center space-x-6">
        
          
            <NotificationBell />
            <ProfileDropdown user={user} institution={institution} userType="institution" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-[#000000] mb-6">Profile</h1>
        
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
        {!internship ? (
          <div className="text-center text-[#6A6A6A]">Internship not found</div>
        ) : (
          <>
            <Card className="bg-white border border-[#E0E0E0] rounded-xl mb-6">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-semibold text-xl text-[#000000]">{internship.title}</h2>
                  <Badge className={`capitalize ml-2 flex-shrink-0 ${internship.status === 'open' ? 'bg-[#FFF5E6] text-[#FF8A00] border border-[#FF8A00]' : 'bg-[#F5F5F5] text-[#6A6A6A] border border-[#DCDCDC]'}`}>
                    {internship.status === 'open' ? 'Open' : 'Closed'}
                  </Badge>
                </div>
                <p className="text-sm text-[#6A6A6A] mb-4">{internship.responsibilities}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[#6A6A6A] mb-1">Deadline:</p>
                    <p className="text-sm font-medium text-[#000000]">
                      {internship.start_timing === 'immediately' ? 'Immediately' : new Date(internship.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6A6A6A] mb-1">Duration:</p>
                    <p className="text-sm font-medium text-[#000000]">{internship.duration_value} {internship.duration_unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6A6A6A] mb-1">Stipend:</p>
                    <p className="text-sm font-medium text-[#000000]">
                      {internship.paid ? `₹${internship.stipend_min}-₹${internship.stipend_max}/${internship.stipend_unit}` : 'Unpaid'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6A6A6A] mb-1">Work Mode:</p>
                    <p className="text-sm font-medium text-[#000000]">{internship.work_mode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6A6A6A] mb-1">Engagement:</p>
                    <p className="text-sm font-medium text-[#000000]">{internship.engagement}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6A6A6A] mb-1">Posted on:</p>
                    <p className="text-sm font-medium text-[#000000]">{new Date(internship.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

               
              </CardContent>
            </Card>

        {/* Application Drawer for Screening Answers */}
        <Drawer open={appDrawerOpen} onOpenChange={setAppDrawerOpen} title="Application Details">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeApp?.screening_answers ? (
                <div>
                  <h4 className="font-medium mb-1">Screening Answers</h4>
                  <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap">
                    {activeApp.screening_answers}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600">No screening answers provided.</div>
              )}
              {activeApp?.cover_letter && (
                <div>
                  <h4 className="font-medium mb-1">Cover Letter</h4>
                  <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap">
                    {activeApp.cover_letter}
                  </div>
                </div>
              )}
          </div>
        </Drawer>

            {/* Applications Section */}
            <Card className="bg-white border border-[#DCDCDC] rounded-2xl">
              <CardContent className="p-6">
                <div className="space-y-6">
                    <Tabs value={activeStage} onValueChange={(v) => {
                      const stage = (v as 'pending' | 'interview' | 'selected' | 'rejected')
                      setActiveStage(stage)
                      ;(async () => {
                        try {
                          setStageLoading(true)
                          const res = await api.internships.getApplications(id, { page: 1, limit: 10, stage })
                          setApplications(res?.data || [])
                          setAppsPage(1)
                          setAppsHasMore((res?.data || []).length >= 10)
                          if (res?.counts) setStageCounts(res.counts)
                        } finally {
                          setStageLoading(false)
                        }
                      })()
                    }} className="space-y-4">
                      <div className="w-full overflow-x-auto md:overflow-x-visible scrollbar-hide">
                        <TabsList className="flex md:grid w-max md:w-full md:grid-cols-4 gap-2 bg-white border-b border-[#DCDCDC] h-12 px-4 md:px-0">
                          {[
                            { key: 'pending', label: 'Pending' },
                            { key: 'interview', label: 'Interview' },
                            { key: 'selected', label: 'Selected' },
                            { key: 'rejected', label: 'Rejected' }
                          ].map(({ key, label }) => (
                            <TabsTrigger
                              key={key}
                              value={key}
                              className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-[#6A6A6A] flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                            >
                              {label} ({stageCounts[key as keyof typeof stageCounts] || 0})
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                      <TabsContent value="pending" />
                      <TabsContent value="interview" />
                      <TabsContent value="selected" />
                      <TabsContent value="rejected" />
                    </Tabs>
                    
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-[#000000]">Applications</h3>
                      <p className="text-sm text-[#6A6A6A]">
                        {visibility === 'public' ? 'Institution-approved applications appear under Pending. Proceed with interview/selection here.' : 'Institution-approved applications appear under Pending. Proceed with interview/selection here.'}
                      </p>
                    </div>

                    {stageLoading && applications.length === 0 && (
                      <div className="text-center py-8 text-[#6A6A6A]">Loading applications...</div>
                    )}
                    {applications.length === 0 ? (
                      <div className="text-center py-8 text-[#6A6A6A]">No applications yet</div>
                    ) : (
                      applications.map((app) => {
                        const name = app.student?.name || 'Student'
                        const email = app.student?.email || '-'
                        const initial = String(name).charAt(0).toUpperCase()
                        
                        // Parse screening answers
                        const parseScreeningAnswers = (text: string | null | undefined): Array<{question: string, answer: string}> => {
                          if (!text) return []
                          const qaBlocks = text.split('\n\n')
                          return qaBlocks.map(block => {
                            const lines = block.split('\n')
                            const qLine = lines.find(l => l.startsWith('Q'))
                            const aLine = lines.find(l => l.startsWith('A'))
                            return {
                              question: qLine ? qLine.substring(qLine.indexOf(':') + 1).trim() : '',
                              answer: aLine ? aLine.substring(aLine.indexOf(':') + 1).trim() : ''
                            }
                          }).filter(qa => qa.question || qa.answer)
                        }
                        
                        const screeningQA = parseScreeningAnswers(app.screening_answers)
                        
                        // Get badge text based on active stage
                        const getBadgeText = () => {
                          if (activeStage === 'pending') return 'Pending'
                          if (activeStage === 'interview') return 'Interview'
                          if (activeStage === 'selected') return 'Selected'
                          if (activeStage === 'rejected') return 'Rejected'
                          return 'Pending'
                        }
                        
                        return (
                          <div key={app.id} className="bg-white border border-[#E0E0E0] rounded-xl p-5 hover:border-[#008260] hover:shadow-md transition-all duration-300">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={app.student?.photo_url} />
                                  <AvatarFallback className="bg-[#E0E0E0] text-[#6A6A6A] text-lg">
                                    {initial}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-[#000000] truncate">{name}</h4>
                                  <div className="text-sm text-[#6A6A6A] truncate">{email}</div>
                                </div>
                              </div>
                              <Badge className="bg-[#FFF5E6] text-[#FF8A00] border border-[#FF8A00] flex-shrink-0">
                                {getBadgeText()}
                              </Badge>
                            </div>

                            {app.institution?.name && (
                              <div className="mb-3">
                                <p className="text-xs text-[#6A6A6A]">Institution:</p>
                                <p className="text-sm font-medium text-[#000000]">{app.institution.name}</p>
                              </div>
                            )}

                            {screeningQA.length > 0 && screeningQA.map((qa, idx) => (
                              <div key={idx} className="mb-3">
                                <p className="text-xs text-[#6A6A6A] mb-1">{qa.question}</p>
                                <p className="text-sm text-[#000000]">{qa.answer}</p>
                              </div>
                            ))}

                            {app.cover_letter && (
                              <div className="mb-3">
                                <p className="text-xs text-[#6A6A6A] mb-1">Cover letter (optional)</p>
                                <p className="text-sm text-[#000000] line-clamp-3">{app.cover_letter}</p>
                              </div>
                            )}

                            <div className="mb-4">
                              <p className="text-xs text-[#6A6A6A]">Applied: <span className="font-medium text-[#000000]">{new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="border border-[#DCDCDC] hover:border-[#008260] hover:bg-[#E8F5F1] text-[#000000] hover:text-[#008260]">
                                    View Profile
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl bg-white border-2 border-slate-200">
                                  <div className="space-y-4">
                                      <div className="flex items-center gap-4">
                                        <Avatar className="w-16 h-16 border-2 border-blue-200">
                                          <AvatarImage src={app.student?.photo_url} />
                                          <AvatarFallback className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">{initial}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="font-semibold text-lg text-slate-900">{name}</div>
                                          {app.institution?.name && (
                                            <div className="text-sm text-slate-600 flex items-center gap-1"><School className="h-3 w-3" /> {app.institution?.name}</div>
                                          )}
                                          <div className="text-sm text-slate-600 flex items-center gap-1"><Mail className="h-3 w-3" /> {email}</div>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <h4 className="font-medium mb-1">Basic Info</h4>
                                          <div className="text-sm text-slate-700 space-y-1">
                                            {app.student?.degree && <p><span className="text-slate-500">Degree:</span> {app.student.degree}</p>}
                                            {app.student?.specialization && <p><span className="text-slate-500">Specialization:</span> {app.student.specialization}</p>}
                                            {app.student?.year && <p><span className="text-slate-500">Year:</span> {app.student.year}</p>}
                                            {app.student?.availability && <p><span className="text-slate-500">Availability:</span> {app.student.availability}</p>}
                                            {(app.student?.preferred_engagement || app.student?.preferred_work_mode) && (
                                              <p><span className="text-slate-500">Preference:</span> {app.student?.preferred_engagement || '-'} · {app.student?.preferred_work_mode || '-'}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <h4 className="font-medium mb-1">Location</h4>
                                          <div className="text-sm text-slate-700 space-y-1">
                                            {(app.student?.city || app.student?.state) && <p><span className="text-slate-500">City/State:</span> {app.student?.city || '-'}{app.student?.state ? `, ${app.student.state}` : ''}</p>}
                                            {app.student?.address && <p className="line-clamp-2"><span className="text-slate-500">Address:</span> {app.student.address}</p>}
                                          </div>
                                        </div>
                                      </div>
                                      {(Array.isArray(app.student?.skills) && app.student.skills.length > 0) && (
                                        <div>
                                          <h4 className="font-medium mb-1">Skills</h4>
                                          <div className="flex flex-wrap gap-2">
                                            {app.student.skills.map((s: string, i: number) => (
                                              <span key={`${s}-${i}`} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 border border-slate-200">{s}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {app.cover_letter && (
                                        <div>
                                          <h4 className="font-medium mb-1">Cover Letter</h4>
                                          <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap">{app.cover_letter}</div>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <h4 className="font-medium mb-1">Applied On</h4>
                                          <p className="text-sm text-slate-700">{new Date(app.created_at).toLocaleDateString()}</p>
                                        </div>
                                        {app.resume_url && (
                                          <div>
                                            <h4 className="font-medium mb-1">Resume</h4>
                                            <a href={app.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline text-sm"><FileText className="h-4 w-4" /> Open Resume</a>
                                          </div>
                                        )}
                                      </div>
                                      {(app.student?.linkedin_url || app.student?.github_url || app.student?.portfolio_url) && (
                                        <div>
                                          <h4 className="font-medium mb-1">Links</h4>
                                          <div className="flex flex-wrap gap-3 text-sm">
                                            {app.student?.linkedin_url && <a href={app.student.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">LinkedIn</a>}
                                            {app.student?.github_url && <a href={app.student.github_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">GitHub</a>}
                                            {app.student?.portfolio_url && <a href={app.student.portfolio_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">Portfolio</a>}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>

                              <div className="flex items-center gap-2">
                                {String(app.status).startsWith('pending') || String(app.status).startsWith('approved') ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border border-[#9B0000] text-[#9B0000] hover:bg-[#9B0000] hover:text-white rounded-3xl w-[100px]"
                                      onClick={async () => {
                                        try {
                                          await api.internships.updateApplicationStatus(app.id, 'rejected_corporate')
                                          setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'rejected_corporate' } : a))
                                        } catch {}
                                      }}
                                    >
                                      Reject
                                    </Button>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button size="sm" className="bg-[#008260] hover:bg-[#006B4F] text-white">Proceed to Interview</Button>
                                      </DialogTrigger>
                                        <DialogContent className="max-w-md">
                                          <DialogHeader>
                                            <DialogTitle>Schedule Interview</DialogTitle>
                                            <DialogDescription>Set an optional interview date and time</DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                            <div>
                                              <Label>Interview Date (Optional)</Label>
                                              <DatePicker value={interviewDate} onChange={setInterviewDate} />
                                            </div>
                                            <div>
                                              <Label>Interview Time (Optional)</Label>
                                              <TimePicker value={interviewTime} onChange={setInterviewTime} />
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                              <Button variant="outline" onClick={() => { setInterviewDate(undefined); setInterviewTime('') }}>Cancel</Button>
                                              <Button
                                                onClick={async () => {
                                                  try {
                                                    let iso: string | undefined
                                                    if (interviewDate && interviewTime) {
                                                      const [hh, mm] = interviewTime.split(':')
                                                      const d = new Date(interviewDate)
                                                      d.setHours(parseInt(hh || '0', 10), parseInt(mm || '0', 10), 0, 0)
                                                      iso = d.toISOString()
                                                    }
                                                    await api.internships.updateApplicationStatus(app.id, 'interview', iso ? { interview_scheduled_at: iso } : undefined)
                                                    // Refetch interview stage, update counts, switch tab
                                                    setActiveStage('interview')
                                                    const res = await api.internships.getApplications(id, { page: 1, limit: 10, stage: 'interview' })
                                                    setApplications(res?.data || [])
                                                    setAppsPage(1)
                                                    setAppsHasMore((res?.data || []).length >= 10)
                                                    if (res?.counts) setStageCounts(res.counts)
                                                  } catch {}
                                                }}
                                                className="bg-[#008260] hover:bg-[#006B4F] text-white"
                                              >
                                                Proceed
                                              </Button>
                                            </div>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    </>
                                  ) : String(app.status).startsWith('interview') ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                          try {
                                            await api.internships.updateApplicationStatus(app.id, 'shortlisted_corporate')
                                            setActiveStage('selected')
                                            const res = await api.internships.getApplications(id, { page: 1, limit: 10, stage: 'selected' })
                                            setApplications(res?.data || [])
                                            setAppsPage(1)
                                            setAppsHasMore((res?.data || []).length >= 10)
                                            if (res?.counts) setStageCounts(res.counts)
                                          } catch {}
                                        }}
                                        className='bg-[#008260] hover:bg-[#006B4F] text-white w-[100px] rounded-3xl'
                                      >
                                        Select
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                          className="border border-[#9B0000] text-[#9B0000] hover:bg-[#9B0000] hover:text-white rounded-3xl w-[100px]"
                                        onClick={async () => {
                                          try {
                                            await api.internships.updateApplicationStatus(app.id, 'rejected_corporate')
                                            setActiveStage('rejected')
                                            const res = await api.internships.getApplications(id, { page: 1, limit: 10, stage: 'rejected' })
                                            setApplications(res?.data || [])
                                            setAppsPage(1)
                                            setAppsHasMore((res?.data || []).length >= 10)
                                            if (res?.counts) setStageCounts(res.counts)
                                          } catch {}
                                        }}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  ) : null}
                                </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    {appsHasMore && (
                      <div
                        ref={(el) => {
                          if (!el) return
                          const obs = new IntersectionObserver(([entry]) => {
                            if (entry.isIntersecting) {
                              (async () => {
                                try {
                                  const nextPage = appsPage + 1
                                  const next = await api.internships.getApplications(id, { page: nextPage, limit: 10, stage: activeStage })
                                  const arr = next?.data || []
                                  if (arr.length > 0) {
                                    setApplications(prev => [...prev, ...arr])
                                    setAppsPage(nextPage)
                                  }
                                  if (arr.length < 10) setAppsHasMore(false)
                                } catch {}
                              })()
                            }
                          }, { threshold: 0.2 })
                          obs.observe(el)
                          return () => obs.disconnect()
                        }}
                        className="text-center py-4 text-sm text-slate-500"
                      >
                        Loading more applications...
                      </div>
                    )}
                  </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}


