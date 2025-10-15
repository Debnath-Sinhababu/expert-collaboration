'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, School, FileText, Briefcase } from 'lucide-react'
import Logo from '@/components/Logo'

export default function FreelanceProjectDetail() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [pendingList, setPendingList] = useState<any[]>([])
  const [approvedList, setApprovedList] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [appsPagePending, setAppsPagePending] = useState(1)
  const [appsHasMorePending, setAppsHasMorePending] = useState(true)
  const [appsPageApproved, setAppsPageApproved] = useState(1)
  const [appsHasMoreApproved, setAppsHasMoreApproved] = useState(true)
  const [subsPage, setSubsPage] = useState(1)
  const [subsHasMore, setSubsHasMore] = useState(true)
  const [error, setError] = useState('')

  const loadProject = async () => {
    const p = await api.freelance.getProjectById(id)
    setProject(p)
    try {
      const appsRes = await api.freelance.listApplications(id, { page: 1, limit: 10, status: 'pending' })
      const subsRes = await api.freelance.listSubmissions(id, { page: 1, limit: 10 })
      const counts = (appsRes && typeof appsRes === 'object' && 'counts' in appsRes) ? (appsRes as any).counts : null
      const subsCounts = (subsRes && typeof subsRes === 'object' && 'counts' in subsRes) ? (subsRes as any).counts : null
      if (counts || subsCounts) {
        setProject((prev: any) => ({ ...(prev || {}), counts: counts || subsCounts }))
      }
    } catch {}
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      try {
        const inst = await api.institutions.getByUserId(user.id)
        if (!inst) { router.push('/institution/profile-setup'); return }
        setInstitution(inst)
        if ((inst.type || '').toLowerCase() !== 'corporate') { router.push('/institution/home'); return }
        await loadProject()
        // initial pending apps
        const apps = await api.freelance.listApplications(id, { page: 1, limit: 10, status: 'pending' })
        const appsArr = Array.isArray(apps) ? apps : ((apps as any)?.data || [])
        setPendingList(appsArr)
        setAppsPagePending(1)
        setAppsHasMorePending(appsArr.length === 10)
        // initial approved apps
        const appr = await api.freelance.listApplications(id, { page: 1, limit: 10, status: 'shortlisted' })
        const apprArr = Array.isArray(appr) ? appr : ((appr as any)?.data || [])
        setApprovedList(apprArr)
        setAppsPageApproved(1)
        setAppsHasMoreApproved(apprArr.length === 10)
        // initial submissions
        const subs = await api.freelance.listSubmissions(id, { page: 1, limit: 10 })
        const subsArr = Array.isArray(subs) ? subs : ((subs as any)?.data || [])
        setSubmissions(subsArr)
        setSubsPage(1)
        setSubsHasMore(subsArr.length === 10)
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    if (id) init()
  }, [id, router])

  const updateStatus = async (appId: string, status: 'shortlisted' | 'rejected') => {
    // Find in pending or approved
    const pendingIdx = pendingList.findIndex(a => a.id === appId)
    const approvedIdx = approvedList.findIndex(a => a.id === appId)
    const prevPending = pendingList
    const prevApproved = approvedList
    let reverted = false

    // Optimistic mutation
    if (status === 'shortlisted') {
      if (pendingIdx >= 0) {
        const moved = { ...prevPending[pendingIdx], status: 'shortlisted' }
        setPendingList(prev => prev.filter((_, i) => i !== pendingIdx))
        setApprovedList(prev => [moved, ...prev])
      }
    } else if (status === 'rejected') {
      // Remove from whichever list it exists in
      if (pendingIdx >= 0) setPendingList(prev => prev.filter((_, i) => i !== pendingIdx))
      if (approvedIdx >= 0) setApprovedList(prev => prev.filter((_, i) => i !== approvedIdx))
    }

    try {
      await api.freelance.updateApplicationStatus(appId, status)
       loadProject()
    } catch (e: any) {
      reverted = true
      // Revert
      setPendingList(prev => prevPending)
      setApprovedList(prev => prevApproved)
      setError(e.message || 'Failed to update')
    }

    // If we successfully shortlisted, ensure approved pagination base is valid
    if (!reverted && status === 'shortlisted' && appsPageApproved === 1 && approvedList.length === 0) {
      // nothing to do; optimistic insert already visible
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

  if (!project) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center text-[#6A6A6A]">Not found</div>
    )
  }

  // Derived lists and counts
  const pendingApps = pendingList
  const approvedApps = approvedList
  const submittedCount = submissions.length

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Logo size="header" />
          <div className="flex items-center space-x-6">
            <NotificationBell />
            <ProfileDropdown user={user} institution={institution} userType="institution" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#000000] mb-6">View Project</h1>
        
        <Card className="bg-white border border-[#E0E0E0] rounded-xl mb-6">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <h2 className="font-semibold text-base sm:text-lg text-[#000000] pr-2">{project.title}</h2>
              {project.status && <span className="capitalize text-xs px-3 py-1 rounded-full flex-shrink-0 self-start bg-[#FFF5E6] text-[#FF8A00] border border-[#FF8A00]">{project.status}</span>}
            </div>
            <p className="text-xs sm:text-sm text-[#6A6A6A] mb-4">{project.description}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
              {project.deadline && (
                <div>
                  <p className="text-xs text-[#9B0000] mb-1">Deadline:</p>
                  <p className="text-sm font-medium text-[#000000]">{new Date(project.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </div>
              )}
              {(project.budget_min || project.budget_max) && (
                <div>
                  <p className="text-xs text-[#6A6A6A] mb-1">Budget:</p>
                  <p className="text-sm font-medium text-[#000000]">₹{project.budget_min || '5000'}-₹{project.budget_max || '8000'}/month</p>
                </div>
              )}
              {project.created_at && (
                <div>
                  <p className="text-xs text-[#6A6A6A] mb-1">Posted on:</p>
                  <p className="text-sm font-medium text-[#000000]">{new Date(project.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </div>
              )}
            </div>

            {(project.required_skills || []).length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-[#6A6A6A] mb-2">Required Skills:</p>
                <div className="text-sm font-medium text-[#000000]">{(project.required_skills || []).join(', ')}</div>
              </div>
            )}

            {project.draft_attachments && (
              <div>
                <p className="text-xs text-[#6A6A6A] mb-1">Draft Attachements:</p>
                <a href={project.draft_attachments} target="_blank" rel="noreferrer" className="text-sm text-[#008260] hover:text-[#006B4F] hover:underline">Design-system.pdf</a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E0E0E0] rounded-xl">
          <CardContent className="p-6">
            <Tabs defaultValue="pending" className="w-full">
              <div className="w-full overflow-x-auto md:overflow-x-visible scrollbar-hide">
                <TabsList className="flex md:grid w-max md:w-full md:grid-cols-3 gap-2 bg-white border-b border-[#DCDCDC] h-12 px-4 md:px-0 mb-6">
                  <TabsTrigger 
                    value="pending"
                    className="data-[state=active]:bg-[#008260] data-[state=active]:text-white hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-[#6A6A6A] flex items-center justify-center h-full px-4 rounded-md shrink-0 whitespace-nowrap min-w-max"
                  >
                    Pending ({(project?.counts?.pending) ?? pendingApps.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="approved"
                    className="data-[state=active]:bg-[#008260] data-[state=active]:text-white hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-[#6A6A6A] flex items-center justify-center h-full px-4 rounded-md shrink-0 whitespace-nowrap min-w-max"
                  >
                    Approved ({(project?.counts?.approved) ?? approvedApps.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="submitted"
                    className="data-[state=active]:bg-[#008260] data-[state=active]:text-white hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-[#6A6A6A] flex items-center justify-center h-full px-4 rounded-md shrink-0 whitespace-nowrap min-w-max"
                  >
                    Submitted ({(project?.counts?.submitted) ?? submittedCount})
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-semibold text-[#000000] mb-1">Applications</h3>
                <p className="text-sm text-[#6A6A6A]">Track your applications here</p>
              </div>

          <TabsContent value="pending">
            <div className="space-y-4">
              {pendingApps.length === 0 && (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-[#6A6A6A] mx-auto mb-3" />
                  <p className="text-[#000000] font-medium">No Pending Applications</p>
                </div>
              )}
              {pendingApps.map((a) => {
                const name = a.student?.name || 'Student'
                const email = a.student?.email || '-'
                const initial = String(name).charAt(0).toUpperCase()
                
                return (
                <div key={a.id} className="bg-white border border-[#E0E0E0] rounded-xl p-4 sm:p-5 hover:border-[#008260] hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                        <AvatarImage src={a.student?.photo_url} />
                        <AvatarFallback className="bg-[#E0E0E0] text-[#6A6A6A] text-base sm:text-lg">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-[#000000] truncate">{name}</h4>
                        <div className="text-xs sm:text-sm text-[#6A6A6A] truncate">{email}</div>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full flex-shrink-0 self-start bg-[#FFF5E6] text-[#FF8A00] border border-[#FF8A00]">Pending</span>
                  </div>

                  {a.institution?.name && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6A6A6A]">Institution:</p>
                      <p className="text-sm font-medium text-[#000000]">{a.institution.name}</p>
                    </div>
                  )}

                  {Array.isArray(a.student?.skills) && a.student.skills.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6A6A6A] mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {a.student.skills.map((s: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 text-xs rounded-full bg-[#E8F5F1] text-[#008260] border border-[#008260]">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {a.cover_letter && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6A6A6A] mb-1">Cover letter (optional)</p>
                      <p className="text-sm text-[#000000] line-clamp-3">{a.cover_letter}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="border border-[#DCDCDC] hover:border-[#008260] hover:bg-[#E8F5F1] text-[#000000] hover:text-[#008260] w-full sm:w-auto">View Profile</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-[#E0E0E0]">
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-16 h-16">
                                <AvatarImage src={a.student?.photo_url} />
                                <AvatarFallback className="text-xl font-bold bg-[#E0E0E0] text-[#6A6A6A]">{initial}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-lg text-[#000000]">{name}</div>
                                {a.institution?.name && (
                                  <div className="text-sm text-[#6A6A6A] flex items-center gap-1"><School className="h-3 w-3" /> {a.institution?.name}</div>
                                )}
                                <div className="text-sm text-[#6A6A6A] flex items-center gap-1"><Mail className="h-3 w-3" /> {email}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Basic Info</h4>
                                <div className="text-sm text-[#000000] space-y-1">
                                  {a.student?.degree && <p><span className="text-[#6A6A6A]">Degree:</span> {a.student.degree}</p>}
                                  {a.student?.specialization && <p><span className="text-[#6A6A6A]">Specialization:</span> {a.student.specialization}</p>}
                                  {a.student?.year && <p><span className="text-[#6A6A6A]">Year:</span> {a.student.year}</p>}
                                  {a.student?.availability && <p><span className="text-[#6A6A6A]">Availability:</span> {a.student.availability}</p>}
                                  {(a.student?.preferred_engagement || a.student?.preferred_work_mode) && (
                                    <p><span className="text-[#6A6A6A]">Preference:</span> {a.student?.preferred_engagement || '-'} · {a.student?.preferred_work_mode || '-'}</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Location</h4>
                                <div className="text-sm text-[#000000] space-y-1">
                                  {(a.student?.city || a.student?.state) && <p><span className="text-[#6A6A6A]">City/State:</span> {a.student?.city || '-'}{a.student?.state ? `, ${a.student.state}` : ''}</p>}
                                  {a.student?.address && <p className="line-clamp-2"><span className="text-[#6A6A6A]">Address:</span> {a.student.address}</p>}
                                </div>
                              </div>
                            </div>
                            {(Array.isArray(a.student?.skills) && a.student.skills.length > 0) && (
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                  {a.student.skills.map((s: string, i: number) => (
                                    <span key={`${s}-${i}`} className="px-3 py-1 text-xs rounded-full bg-[#E8F5F1] text-[#008260] border border-[#008260]">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Applied On</h4>
                                <p className="text-sm text-[#000000]">{new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              </div>
                              {a.student?.resume_url && (
                                <div>
                                  <h4 className="font-semibold text-[#000000] mb-2">Resume</h4>
                                  <a href={a.student.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#008260] hover:text-[#006B4F] hover:underline text-sm"><FileText className="h-4 w-4" /> Open Resume</a>
                                </div>
                              )}
                            </div>
                            {(a.student?.linkedin_url || a.student?.github_url || a.student?.portfolio_url) && (
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Links</h4>
                                <div className="flex flex-wrap gap-3 text-sm">
                                  {a.student?.linkedin_url && <a href={a.student.linkedin_url} target="_blank" rel="noreferrer" className="text-[#008260] hover:text-[#006B4F] hover:underline">LinkedIn</a>}
                                  {a.student?.github_url && <a href={a.student.github_url} target="_blank" rel="noreferrer" className="text-[#008260] hover:text-[#006B4F] hover:underline">GitHub</a>}
                                  {a.student?.portfolio_url && <a href={a.student.portfolio_url} target="_blank" rel="noreferrer" className="text-[#008260] hover:text-[#006B4F] hover:underline">Portfolio</a>}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateStatus(a.id, 'shortlisted')} className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-3xl w-[100px]">Select</Button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {appsHasMorePending && (
                <div
                  ref={(el) => {
                    if (!el) return
                    const obs = new IntersectionObserver(async ([entry]) => {
                      if (entry.isIntersecting) {
                        try {
                          const nextPage = appsPagePending + 1
                          const next = await api.freelance.listApplications(id, { page: nextPage, limit: 10, status: 'pending' })
                          const nextArr = Array.isArray(next) ? next : ((next as any)?.data || [])
                          if (nextArr.length > 0) {
                            setPendingList(prev => [...prev, ...nextArr])
                            setAppsPagePending(nextPage)
                            if (nextArr.length < 10) setAppsHasMorePending(false)
                          } else {
                            setAppsHasMorePending(false)
                          }
                        } catch {
                          setAppsHasMorePending(false)
                        }
                      }
                    }, { threshold: 0.2 })
                    obs.observe(el)
                    return () => obs.disconnect()
                  }}
                  className="text-center py-4 text-sm text-[#6A6A6A]"
                >
                  Loading more applications...
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approved">
            <div className="space-y-4">
              {approvedApps.length === 0 && (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-[#6A6A6A] mx-auto mb-3" />
                  <p className="text-[#000000] font-medium">No Approved Applications</p>
                </div>
              )}
              {approvedApps.map((a) => {
                const name = a.student?.name || 'Student'
                const email = a.student?.email || '-'
                const initial = String(name).charAt(0).toUpperCase()
                
                return (
                <div key={a.id} className="bg-white border border-[#E0E0E0] rounded-xl p-4 sm:p-5 hover:border-[#008260] hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                        <AvatarImage src={a.student?.photo_url} />
                        <AvatarFallback className="bg-[#E0E0E0] text-[#6A6A6A] text-base sm:text-lg">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-[#000000] truncate">{name}</h4>
                        <div className="text-xs sm:text-sm text-[#6A6A6A] truncate">{email}</div>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full flex-shrink-0 self-start bg-[#FFF5E6] text-[#FF8A00] border border-[#FF8A00]">Pending</span>
                  </div>

                  {a.institution?.name && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6A6A6A]">Institution:</p>
                      <p className="text-sm font-medium text-[#000000]">{a.institution.name}</p>
                    </div>
                  )}

                  {Array.isArray(a.student?.skills) && a.student.skills.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6A6A6A] mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {a.student.skills.map((s: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 text-xs rounded-full bg-[#E8F5F1] text-[#008260] border border-[#008260]">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {a.cover_letter && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6A6A6A] mb-1">Cover letter (optional)</p>
                      <p className="text-sm text-[#000000] line-clamp-3">{a.cover_letter}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border border-[#DCDCDC] hover:border-[#008260] hover:bg-[#E8F5F1] text-[#000000] hover:text-[#008260]">View Profile</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-[#E0E0E0]">
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-16 h-16">
                                <AvatarImage src={a.student?.photo_url} />
                                <AvatarFallback className="text-xl font-bold bg-[#E0E0E0] text-[#6A6A6A]">{initial}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-lg text-[#000000]">{name}</div>
                                {a.institution?.name && (
                                  <div className="text-sm text-[#6A6A6A] flex items-center gap-1"><School className="h-3 w-3" /> {a.institution?.name}</div>
                                )}
                                <div className="text-sm text-[#6A6A6A] flex items-center gap-1"><Mail className="h-3 w-3" /> {email}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Basic Info</h4>
                                <div className="text-sm text-[#000000] space-y-1">
                                  {a.student?.degree && <p><span className="text-[#6A6A6A]">Degree:</span> {a.student.degree}</p>}
                                  {a.student?.specialization && <p><span className="text-[#6A6A6A]">Specialization:</span> {a.student.specialization}</p>}
                                  {a.student?.year && <p><span className="text-[#6A6A6A]">Year:</span> {a.student.year}</p>}
                                  {a.student?.availability && <p><span className="text-[#6A6A6A]">Availability:</span> {a.student.availability}</p>}
                                  {(a.student?.preferred_engagement || a.student?.preferred_work_mode) && (
                                    <p><span className="text-[#6A6A6A]">Preference:</span> {a.student?.preferred_engagement || '-'} · {a.student?.preferred_work_mode || '-'}</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Location</h4>
                                <div className="text-sm text-[#000000] space-y-1">
                                  {(a.student?.city || a.student?.state) && <p><span className="text-[#6A6A6A]">City/State:</span> {a.student?.city || '-'}{a.student?.state ? `, ${a.student.state}` : ''}</p>}
                                  {a.student?.address && <p className="line-clamp-2"><span className="text-[#6A6A6A]">Address:</span> {a.student.address}</p>}
                                </div>
                              </div>
                            </div>
                            {(Array.isArray(a.student?.skills) && a.student.skills.length > 0) && (
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                  {a.student.skills.map((s: string, i: number) => (
                                    <span key={`${s}-${i}`} className="px-3 py-1 text-xs rounded-full bg-[#E8F5F1] text-[#008260] border border-[#008260]">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Applied On</h4>
                                <p className="text-sm text-[#000000]">{new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              </div>
                              {a.student?.resume_url && (
                                <div>
                                  <h4 className="font-semibold text-[#000000] mb-2">Resume</h4>
                                  <a href={a.student.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#008260] hover:text-[#006B4F] hover:underline text-sm"><FileText className="h-4 w-4" /> Open Resume</a>
                                </div>
                              )}
                            </div>
                            {(a.student?.linkedin_url || a.student?.github_url || a.student?.portfolio_url) && (
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Links</h4>
                                <div className="flex flex-wrap gap-3 text-sm">
                                  {a.student?.linkedin_url && <a href={a.student.linkedin_url} target="_blank" rel="noreferrer" className="text-[#008260] hover:text-[#006B4F] hover:underline">LinkedIn</a>}
                                  {a.student?.github_url && <a href={a.student.github_url} target="_blank" rel="noreferrer" className="text-[#008260] hover:text-[#006B4F] hover:underline">GitHub</a>}
                                  {a.student?.portfolio_url && <a href={a.student.portfolio_url} target="_blank" rel="noreferrer" className="text-[#008260] hover:text-[#006B4F] hover:underline">Portfolio</a>}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )
              })}
              {appsHasMoreApproved && (
                <div
                  ref={(el) => {
                    if (!el) return
                    const obs = new IntersectionObserver(async ([entry]) => {
                      if (entry.isIntersecting) {
                        try {
                          const nextPage = appsPageApproved + 1
                          const next = await api.freelance.listApplications(id, { page: nextPage, limit: 10, status: 'shortlisted' })
                          const nextArr = Array.isArray(next) ? next : ((next as any)?.data || [])
                          if (nextArr.length > 0) {
                            setApprovedList(prev => [...prev, ...nextArr])
                            setAppsPageApproved(nextPage)
                            if (nextArr.length < 10) setAppsHasMoreApproved(false)
                          } else {
                            setAppsHasMoreApproved(false)
                          }
                        } catch {
                          setAppsHasMoreApproved(false)
                        }
                      }
                    }, { threshold: 0.2 })
                    obs.observe(el)
                    return () => obs.disconnect()
                  }}
                  className="text-center py-4 text-sm text-[#6A6A6A]"
                >
                  Loading more applications...
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="submitted">
            <div className="space-y-4">
              {submissions.length === 0 && (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-[#6A6A6A] mx-auto mb-3" />
                  <p className="text-[#000000] font-medium">No submissions yet</p>
                </div>
              )}
              {submissions.map((s) => {
                const name = s.student?.name || 'Student'
                const email = s.student?.email || '-'
                const initial = String(name).charAt(0).toUpperCase()
                
                return (
                <div key={s.id} className="bg-white border border-[#E0E0E0] rounded-xl p-5 hover:border-[#008260] hover:shadow-md transition-all duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                        <AvatarImage src={s.student?.photo_url} />
                        <AvatarFallback className="bg-[#E0E0E0] text-[#6A6A6A] text-base sm:text-lg">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-[#000000] truncate">{name}</h4>
                        <div className="text-xs sm:text-sm text-[#6A6A6A] truncate">{email}</div>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full flex-shrink-0 bg-[#FFF5E6] text-[#FF8A00] border border-[#FF8A00]">Submitted</span>
                  </div>

                  {s.institution?.name && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6A6A6A]">Institution:</p>
                      <p className="text-sm font-medium text-[#000000]">{s.institution.name}</p>
                    </div>
                  )}

                  {Array.isArray(s.student?.skills) && s.student.skills.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6A6A6A] mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {s.student.skills.map((sk: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 text-xs rounded-full bg-[#E8F5F1] text-[#008260] border border-[#008260]">{sk}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.attachment_url && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6A6A6A] mb-1">Attachments:</p>
                      <a href={s.attachment_url} target="_blank" rel="noreferrer" className="text-sm text-[#008260] hover:text-[#006B4F] hover:underline">View Attachment</a>
                    </div>
                  )}

                  {s.note && (
                    <div className="mb-3">
                      <p className="text-xs text-[#6A6A6A] mb-1">Note (optional)</p>
                      <p className="text-sm text-[#000000]">{s.note}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border border-[#DCDCDC] hover:border-[#008260] hover:bg-[#E8F5F1] text-[#000000] hover:text-[#008260]">View Profile</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-[#E0E0E0]">
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-16 h-16">
                                <AvatarImage src={s.student?.photo_url} />
                                <AvatarFallback className="text-xl font-bold bg-[#E0E0E0] text-[#6A6A6A]">{initial}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-lg text-[#000000]">{name}</div>
                                <div className="text-sm text-[#6A6A6A] flex items-center gap-1"><Mail className="h-3 w-3" /> {email}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Basic Info</h4>
                                <div className="text-sm text-[#000000] space-y-1">
                                  {s.student?.degree && <p><span className="text-[#6A6A6A]">Degree:</span> {s.student.degree}</p>}
                                  {s.student?.specialization && <p><span className="text-[#6A6A6A]">Specialization:</span> {s.student.specialization}</p>}
                                  {s.student?.year && <p><span className="text-[#6A6A6A]">Year:</span> {s.student.year}</p>}
                                  {s.student?.availability && <p><span className="text-[#6A6A6A]">Availability:</span> {s.student.availability}</p>}
                                  {(s.student?.preferred_engagement || s.student?.preferred_work_mode) && (
                                    <p><span className="text-[#6A6A6A]">Preference:</span> {s.student?.preferred_engagement || '-'} · {s.student?.preferred_work_mode || '-'}</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Location</h4>
                                <div className="text-sm text-[#000000] space-y-1">
                                  {(s.student?.city || s.student?.state) && <p><span className="text-[#6A6A6A]">City/State:</span> {s.student?.city || '-'}{s.student?.state ? `, ${s.student.state}` : ''}</p>}
                                  {s.student?.address && <p className="line-clamp-2"><span className="text-[#6A6A6A]">Address:</span> {s.student.address}</p>}
                                </div>
                              </div>
                            </div>
                            {(Array.isArray(s.student?.skills) && s.student.skills.length > 0) && (
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                  {s.student.skills.map((sk: string, i: number) => (
                                    <span key={`${sk}-${i}`} className="px-3 py-1 text-xs rounded-full bg-[#E8F5F1] text-[#008260] border border-[#008260]">{sk}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Submitted On</h4>
                                <p className="text-sm text-[#000000]">{new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              </div>
                              {s.student?.resume_url && (
                                <div>
                                  <h4 className="font-semibold text-[#000000] mb-2">Resume</h4>
                                  <a href={s.student.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#008260] hover:text-[#006B4F] hover:underline text-sm"><FileText className="h-4 w-4" /> Open Resume</a>
                                </div>
                              )}
                            </div>
                            {(s.student?.linkedin_url || s.student?.github_url || s.student?.portfolio_url) && (
                              <div>
                                <h4 className="font-semibold text-[#000000] mb-2">Links</h4>
                                <div className="flex flex-wrap gap-3 text-sm">
                                  {s.student?.linkedin_url && <a href={s.student.linkedin_url} target="_blank" rel="noreferrer" className="text-[#008260] hover:text-[#006B4F] hover:underline">LinkedIn</a>}
                                  {s.student?.github_url && <a href={s.student.github_url} target="_blank" rel="noreferrer" className="text-[#008260] hover:text-[#006B4F] hover:underline">GitHub</a>}
                                  {s.student?.portfolio_url && <a href={s.student.portfolio_url} target="_blank" rel="noreferrer" className="text-[#008260] hover:text-[#006B4F] hover:underline">Portfolio</a>}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )
              })}
              {subsHasMore && (
                <div
                  ref={(el) => {
                    if (!el) return
                    const obs = new IntersectionObserver(async ([entry]) => {
                      if (entry.isIntersecting) {
                        try {
                          const nextPage = subsPage + 1
                          const next = await api.freelance.listSubmissions(id, { page: nextPage, limit: 10 })
                          const nextArr = Array.isArray(next) ? next : ((next as any)?.data || [])
                          if (nextArr.length > 0) {
                            setSubmissions(prev => [...prev, ...nextArr])
                            setSubsPage(nextPage)
                            if (nextArr.length < 10) setSubsHasMore(false)
                          } else {
                            setSubsHasMore(false)
                          }
                        } catch {
                          setSubsHasMore(false)
                        }
                      }
                    }, { threshold: 0.2 })
                    obs.observe(el)
                    return () => obs.disconnect()
                  }}
                  className="text-center py-4 text-sm text-[#6A6A6A]"
                >
                  Loading more submissions...
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


