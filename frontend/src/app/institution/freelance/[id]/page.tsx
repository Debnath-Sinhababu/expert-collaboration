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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">Not found</div>
    )
  }

  // Derived lists and counts
  const pendingApps = pendingList
  const approvedApps = approvedList
  const submittedCount = submissions.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Freelance Project</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} institution={institution} userType="institution" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card className="bg-white border-2 border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-slate-900">{project.title}</CardTitle>
            <CardDescription className="text-slate-600">{project.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(project.required_skills || []).map((s: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">{s}</span>
              ))}
            </div>
            <div className="text-sm text-slate-600 flex flex-wrap gap-4">
              {project.deadline && <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>}
              {(project.budget_min || project.budget_max) && <span>Budget: ₹{project.budget_min || '—'} - ₹{project.budget_max || '—'}</span>}
              {project.status && <span className="uppercase text-xs tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">{project.status}</span>}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pending" className="w-full">
          <div className="w-full overflow-x-auto md:overflow-x-visible scrollbar-hide mb-4">
            <TabsList className="flex md:grid w-max md:w-full md:grid-cols-3 gap-2 bg-white border-b border-slate-200 h-12 px-4 md:px-0">
              <TabsTrigger 
                value="pending"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
              >
                Pending ({(project?.counts?.pending) ?? pendingApps.length})
              </TabsTrigger>
              <TabsTrigger 
                value="approved"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
              >
                Approved ({(project?.counts?.approved) ?? approvedApps.length})
              </TabsTrigger>
              <TabsTrigger 
                value="submitted"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
              >
                Submitted ({(project?.counts?.submitted) ?? submittedCount})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pending">
            <div className="space-y-4">
              {pendingApps.length === 0 && (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">No applications in this stage</p>
                </div>
              )}
              {pendingApps.map((a) => (
                <Card key={a.id} className="bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{a.student?.name || 'Student'}</div>
                        <div className="text-xs text-slate-600">{a.student?.email}</div>
                      </div>
                      <div className="uppercase text-xs tracking-wide px-2 py-0.5 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">Pending</div>
                    </div>
                    {Array.isArray(a.student?.skills) && a.student.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {a.student.skills.slice(0,6).map((s: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">{s}</span>
                        ))}
                      </div>
                    )}
                    {a.cover_letter && (
                      <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded p-3 whitespace-pre-wrap">{a.cover_letter}</div>
                    )}
                    <div className="flex gap-2 justify-between items-center pt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700">View Profile</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-white border-2 border-slate-200">
                          <DialogHeader>
                            <DialogTitle>Student Profile</DialogTitle>
                            <DialogDescription>Full details</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-16 h-16 border-2 border-blue-200">
                                <AvatarImage src={a.student?.photo_url} />
                                <AvatarFallback className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">{String(a.student?.name || 'S').charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-lg text-slate-900">{a.student?.name}</div>
                                {a.institution?.name && (
                                  <div className="text-sm text-slate-600 flex items-center gap-1"><School className="h-3 w-3" /> {a.institution?.name}</div>
                                )}
                                <div className="text-sm text-slate-600 flex items-center gap-1"><Mail className="h-3 w-3" /> {a.student?.email}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-1">Basic Info</h4>
                                <div className="text-sm text-slate-700 space-y-1">
                                  {a.student?.degree && <p><span className="text-slate-500">Degree:</span> {a.student.degree}</p>}
                                  {a.student?.specialization && <p><span className="text-slate-500">Specialization:</span> {a.student.specialization}</p>}
                                  {a.student?.year && <p><span className="text-slate-500">Year:</span> {a.student.year}</p>}
                                  {a.student?.availability && <p><span className="text-slate-500">Availability:</span> {a.student.availability}</p>}
                                  {(a.student?.preferred_engagement || a.student?.preferred_work_mode) && (
                                    <p><span className="text-slate-500">Preference:</span> {a.student?.preferred_engagement || '-'} · {a.student?.preferred_work_mode || '-'}</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">Location</h4>
                                <div className="text-sm text-slate-700 space-y-1">
                                  {(a.student?.city || a.student?.state) && <p><span className="text-slate-500">City/State:</span> {a.student?.city || '-'}{a.student?.state ? `, ${a.student.state}` : ''}</p>}
                                  {a.student?.address && <p className="line-clamp-2"><span className="text-slate-500">Address:</span> {a.student.address}</p>}
                                </div>
                              </div>
                            </div>
                            {(Array.isArray(a.student?.skills) && a.student.skills.length > 0) && (
                              <div>
                                <h4 className="font-medium mb-1">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                  {a.student.skills.map((s: string, i: number) => (
                                    <span key={`${s}-${i}`} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 border border-slate-200">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {a.cover_letter && (
                              <div>
                                <h4 className="font-medium mb-1">Cover Letter</h4>
                                <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap">{a.cover_letter}</div>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-1">Applied On</h4>
                                <p className="text-sm text-slate-700">{new Date(a.created_at).toLocaleDateString()}</p>
                              </div>
                              {a.student?.resume_url && (
                                <div>
                                  <h4 className="font-medium mb-1">Resume</h4>
                                  <a href={a.student.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline text-sm"><FileText className="h-4 w-4" /> Open Resume</a>
                                </div>
                              )}
                            </div>
                            {(a.student?.linkedin_url || a.student?.github_url || a.student?.portfolio_url) && (
                              <div>
                                <h4 className="font-medium mb-1">Links</h4>
                                <div className="flex flex-wrap gap-3 text-sm">
                                  {a.student?.linkedin_url && <a href={a.student.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">LinkedIn</a>}
                                  {a.student?.github_url && <a href={a.student.github_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">GitHub</a>}
                                  {a.student?.portfolio_url && <a href={a.student.portfolio_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">Portfolio</a>}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <div className="flex gap-2">
                        <Button onClick={() => updateStatus(a.id, 'shortlisted')} className="bg-blue-600 text-white">Shortlist</Button>
                        <Button variant="secondary" onClick={() => updateStatus(a.id, 'rejected')}>Reject</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  className="text-center py-4 text-sm text-slate-500"
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
                  <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">No applications in this stage</p>
                </div>
              )}
              {approvedApps.map((a) => (
                <Card key={a.id} className="bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{a.student?.name || 'Student'}</div>
                        <div className="text-xs text-slate-600">{a.student?.email}</div>
                      </div>
                      <div className="uppercase text-xs tracking-wide px-2 py-0.5 rounded bg-green-50 text-green-800 border border-green-200">Approved</div>
                    </div>
                    {Array.isArray(a.student?.skills) && a.student.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {a.student.skills.slice(0,6).map((s: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">{s}</span>
                        ))}
                      </div>
                    )}
                    {a.cover_letter && (
                      <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded p-3 whitespace-pre-wrap">{a.cover_letter}</div>
                    )}
                    <div className="flex gap-2 justify-between items-center pt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700">View Profile</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-white border-2 border-slate-200">
                          <DialogHeader>
                            <DialogTitle>Student Profile</DialogTitle>
                            <DialogDescription>Full details</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-16 h-16 border-2 border-blue-200">
                                <AvatarImage src={a.student?.photo_url} />
                                <AvatarFallback className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">{String(a.student?.name || 'S').charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-lg text-slate-900">{a.student?.name}</div>
                                {a.institution?.name && (
                                  <div className="text-sm text-slate-600 flex items-center gap-1"><School className="h-3 w-3" /> {a.institution?.name}</div>
                                )}
                                <div className="text-sm text-slate-600 flex items-center gap-1"><Mail className="h-3 w-3" /> {a.student?.email}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-1">Basic Info</h4>
                                <div className="text-sm text-slate-700 space-y-1">
                                  {a.student?.degree && <p><span className="text-slate-500">Degree:</span> {a.student.degree}</p>}
                                  {a.student?.specialization && <p><span className="text-slate-500">Specialization:</span> {a.student.specialization}</p>}
                                  {a.student?.year && <p><span className="text-slate-500">Year:</span> {a.student.year}</p>}
                                  {a.student?.availability && <p><span className="text-slate-500">Availability:</span> {a.student.availability}</p>}
                                  {(a.student?.preferred_engagement || a.student?.preferred_work_mode) && (
                                    <p><span className="text-slate-500">Preference:</span> {a.student?.preferred_engagement || '-'} · {a.student?.preferred_work_mode || '-'}</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">Location</h4>
                                <div className="text-sm text-slate-700 space-y-1">
                                  {(a.student?.city || a.student?.state) && <p><span className="text-slate-500">City/State:</span> {a.student?.city || '-'}{a.student?.state ? `, ${a.student.state}` : ''}</p>}
                                  {a.student?.address && <p className="line-clamp-2"><span className="text-slate-500">Address:</span> {a.student.address}</p>}
                                </div>
                              </div>
                            </div>
                            {(Array.isArray(a.student?.skills) && a.student.skills.length > 0) && (
                              <div>
                                <h4 className="font-medium mb-1">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                  {a.student.skills.map((s: string, i: number) => (
                                    <span key={`${s}-${i}`} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 border border-slate-200">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {a.cover_letter && (
                              <div>
                                <h4 className="font-medium mb-1">Cover Letter</h4>
                                <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap">{a.cover_letter}</div>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-1">Applied On</h4>
                                <p className="text-sm text-slate-700">{new Date(a.created_at).toLocaleDateString()}</p>
                              </div>
                              {a.student?.resume_url && (
                                <div>
                                  <h4 className="font-medium mb-1">Resume</h4>
                                  <a href={a.student.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline text-sm"><FileText className="h-4 w-4" /> Open Resume</a>
                                </div>
                              )}
                            </div>
                            {(a.student?.linkedin_url || a.student?.github_url || a.student?.portfolio_url) && (
                              <div>
                                <h4 className="font-medium mb-1">Links</h4>
                                <div className="flex flex-wrap gap-3 text-sm">
                                  {a.student?.linkedin_url && <a href={a.student.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">LinkedIn</a>}
                                  {a.student?.github_url && <a href={a.student.github_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">GitHub</a>}
                                  {a.student?.portfolio_url && <a href={a.student.portfolio_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">Portfolio</a>}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  className="text-center py-4 text-sm text-slate-500"
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
                  <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium">No submissions yet</p>
                </div>
              )}
              {submissions.map((s) => (
                <Card key={s.id} className="bg-white border-2 border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{s.student?.name || 'Student'}</div>
                        <div className="text-xs text-slate-600">{s.student?.email}</div>
                      </div>
                      <div className="text-xs text-slate-600">{new Date(s.created_at).toLocaleString()}</div>
                    </div>
                    {s.note && (
                      <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded p-3 whitespace-pre-wrap">{s.note}</div>
                    )}
                {s.attachment_url && (
                      <a href={s.attachment_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">View Attachment</a>
                    )}
                    <div className="pt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700">View Profile</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-white border-2 border-slate-200">
                          <DialogHeader>
                            <DialogTitle>Student Profile</DialogTitle>
                            <DialogDescription>Full details</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-16 h-16 border-2 border-blue-200">
                                <AvatarImage src={s.student?.photo_url} />
                                <AvatarFallback className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">{String(s.student?.name || 'S').charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-lg text-slate-900">{s.student?.name}</div>
                                <div className="text-sm text-slate-600 flex items-center gap-1"><Mail className="h-3 w-3" /> {s.student?.email}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-1">Basic Info</h4>
                                <div className="text-sm text-slate-700 space-y-1">
                                  {s.student?.degree && <p><span className="text-slate-500">Degree:</span> {s.student.degree}</p>}
                                  {s.student?.specialization && <p><span className="text-slate-500">Specialization:</span> {s.student.specialization}</p>}
                                  {s.student?.year && <p><span className="text-slate-500">Year:</span> {s.student.year}</p>}
                                  {s.student?.availability && <p><span className="text-slate-500">Availability:</span> {s.student.availability}</p>}
                                  {(s.student?.preferred_engagement || s.student?.preferred_work_mode) && (
                                    <p><span className="text-slate-500">Preference:</span> {s.student?.preferred_engagement || '-'} · {s.student?.preferred_work_mode || '-'}</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">Location</h4>
                                <div className="text-sm text-slate-700 space-y-1">
                                  {(s.student?.city || s.student?.state) && <p><span className="text-slate-500">City/State:</span> {s.student?.city || '-'}{s.student?.state ? `, ${s.student.state}` : ''}</p>}
                                  {s.student?.address && <p className="line-clamp-2"><span className="text-slate-500">Address:</span> {s.student.address}</p>}
                                </div>
                              </div>
                            </div>
                            {(Array.isArray(s.student?.skills) && s.student.skills.length > 0) && (
                              <div>
                                <h4 className="font-medium mb-1">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                  {s.student.skills.map((sk: string, i: number) => (
                                    <span key={`${sk}-${i}`} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 border border-slate-200">{sk}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-1">Submitted On</h4>
                                <p className="text-sm text-slate-700">{new Date(s.created_at).toLocaleDateString()}</p>
                              </div>
                              {s.student?.resume_url && (
                                <div>
                                  <h4 className="font-medium mb-1">Resume</h4>
                                  <a href={s.student.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline text-sm"><FileText className="h-4 w-4" /> Open Resume</a>
                                </div>
                              )}
                            </div>
                            {(s.student?.linkedin_url || s.student?.github_url || s.student?.portfolio_url) && (
                              <div>
                                <h4 className="font-medium mb-1">Links</h4>
                                <div className="flex flex-wrap gap-3 text-sm">
                                  {s.student?.linkedin_url && <a href={s.student.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">LinkedIn</a>}
                                  {s.student?.github_url && <a href={s.student.github_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">GitHub</a>}
                                  {s.student?.portfolio_url && <a href={s.student.portfolio_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">Portfolio</a>}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  className="text-center py-4 text-sm text-slate-500"
                >
                  Loading more submissions...
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


