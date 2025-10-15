'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { usePagination } from '@/hooks/usePagination'
import { Briefcase } from 'lucide-react'
import Logo from '@/components/Logo'

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'interview' | 'selected' | 'rejected'>('pending')
  const [counts, setCounts] = useState({ pending: 0, interview: 0, selected: 0, rejected: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pendingScrollRef = useRef<HTMLDivElement>(null)
  const interviewScrollRef = useRef<HTMLDivElement>(null)
  const selectedScrollRef = useRef<HTMLDivElement>(null)
  const rejectedScrollRef = useRef<HTMLDivElement>(null)

  // Pending applications
  const {
    data: pendingApps,
    loading: pendingLoading,
    hasMore: hasMorePending,
    loadMore: loadMorePending,
    refresh: refreshPending
  } = usePagination(
    async (page: number) => {
      const res = await api.internshipApplications.list({ page, limit: 10, stage: 'pending' })
      if (res && typeof res === 'object' && 'data' in res) {
        if (page === 1 && res.counts) setCounts(res.counts)
        return res.data
      }
      return res
    },
    [user?.id]
  )

  // Interview applications
  const {
    data: interviewApps,
    loading: interviewLoading,
    hasMore: hasMoreInterview,
    loadMore: loadMoreInterview,
    refresh: refreshInterview
  } = usePagination(
    async (page: number) => {
      const res = await api.internshipApplications.list({ page, limit: 10, stage: 'interview' })
      if (res && typeof res === 'object' && 'data' in res) {
        if (page === 1 && res.counts) setCounts(res.counts)
        return res.data
      }
      return res
    },
    [user?.id]
  )

  // Selected applications
  const {
    data: selectedApps,
    loading: selectedLoading,
    hasMore: hasMoreSelected,
    loadMore: loadMoreSelected,
    refresh: refreshSelected
  } = usePagination(
    async (page: number) => {
      const res = await api.internshipApplications.list({ page, limit: 10, stage: 'selected' })
      if (res && typeof res === 'object' && 'data' in res) {
        if (page === 1 && res.counts) setCounts(res.counts)
        return res.data
      }
      return res
    },
    [user?.id]
  )

  // Rejected applications
  const {
    data: rejectedApps,
    loading: rejectedLoading,
    hasMore: hasMoreRejected,
    loadMore: loadMoreRejected,
    refresh: refreshRejected
  } = usePagination(
    async (page: number) => {
      const res = await api.internshipApplications.list({ page, limit: 10, stage: 'rejected' })
      if (res && typeof res === 'object' && 'data' in res) {
        if (page === 1 && res.counts) setCounts(res.counts)
        return res.data
      }
      return res
    },
    [user?.id]
  )

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        const s = await api.students.me()
        setStudent(s)
      } catch (e: any) {
        setError(e.message || 'Failed to load dashboard')
      }
    }
    init()
  }, [router])

  const switchTab = async (tab: 'pending' | 'interview' | 'selected' | 'rejected') => {
    setActiveTab(tab)
    // Ensure first pages are loaded for each tab when switching
    if (tab === 'pending') refreshPending()
    if (tab === 'interview') refreshInterview()
    if (tab === 'selected') refreshSelected()
    if (tab === 'rejected') refreshRejected()
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/student/home" className="flex items-center group">
              <Logo size="header" />
            </Link>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ProfileDropdown user={user} student={student} userType="student" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

        <h2 className="text-2xl font-semibold text-[#000000] mb-6">Student Dashboard</h2>

        <Card className="bg-white border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg text-[#000000] font-semibold">My Applications</CardTitle>
            <CardDescription className="text-slate-600">Track your internship application stages</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => switchTab(v as any)} className="space-y-6">
              <div className="w-full overflow-x-auto md:overflow-x-visible scrollbar-hide">
                <TabsList className="flex md:grid w-max md:w-full md:grid-cols-4 gap-2 bg-white border-b border-slate-200 h-12 px-4 md:px-0">
                  <TabsTrigger 
                    value="pending"
                    className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                  >
                    Pending ({counts.pending})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="interview"
                    className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                  >
                    Interview ({counts.interview})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="selected"
                    className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                  >
                    Selected ({counts.selected})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rejected"
                    className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                  >
                    Rejected ({counts.rejected})
                  </TabsTrigger>
                </TabsList>
              </div>
              {/* Pending */}
              <TabsContent value="pending">
                {pendingLoading && (pendingApps as any[])?.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">Loading applications...</div>
                ) : (pendingApps as any[])?.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium">No applications in this stage</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(pendingApps as any[])?.map((app) => (
                      <Card key={app.id} className="bg-white border-2 border-[#D6D6D6] rounded-xl hover:border-[#008260] hover:shadow-md transition-all duration-300">
                        <CardContent className="p-6">
                          {/* Header with title and badge */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base text-[#000000] mb-1">
                                {app.internships?.title || 'Internship'}
                              </h3>
                            </div>
                            <Badge className="bg-[#FFF2E5] text-[#FF6B00] hover:bg-[#FFE5CC] border-none font-medium shrink-0 ml-3">
                              Pending
                            </Badge>
                          </div>

                          {/* Description */}
                          {app.internships?.responsibilities && (
                            <p className="text-sm text-[#6A6A6A] mb-4 line-clamp-2">
                              {app.internships.responsibilities}
                            </p>
                          )}

                          {/* Grid Layout for Details - 2 rows x 3 columns */}
                          <div className="grid grid-cols-3 gap-x-8 gap-y-4 mb-4">
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Deadline:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {app.internships?.start_date 
                                  ? new Date(app.internships.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Duration:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {app.internships?.duration_value} {app.internships?.duration_unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Stipend:</div>
                              <div className="font-semibold text-[#008260] text-sm">
                                {app.internships?.paid 
                                  ? `₹${app.internships.stipend_min}${app.internships.stipend_max ? '-₹' + app.internships.stipend_max : ''}/month`
                                  : 'Unpaid'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Work Mode:</div>
                              <div className="font-semibold text-[#000000] text-sm">{app.internships?.work_mode}</div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Engagement:</div>
                              <div className="font-semibold text-[#000000] text-sm">{app.internships?.engagement}</div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Posted on:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {new Date(app.internships?.created_at || app.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>

                          {/* View Button */}
                          <div className="flex justify-end">
                            <Button 
                              className="bg-[#008260] hover:bg-[#006B4F] text-white font-medium rounded-full px-6"
                              onClick={() => router.push(`/student/internships/${app.internship_id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {hasMorePending && !pendingLoading && (
                      <div
                        ref={(el) => {
                          if (!el) return
                          const obs = new IntersectionObserver(([entry]) => {
                            if (entry.isIntersecting) loadMorePending()
                          }, { threshold: 0.2 })
                          obs.observe(el)
                          return () => obs.disconnect()
                        }}
                        className="text-center py-4 text-sm text-slate-500"
                      >
                        Loading more...
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Interview */}
              <TabsContent value="interview">
                {interviewLoading && (interviewApps as any[])?.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">Loading applications...</div>
                ) : (interviewApps as any[])?.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium">No applications in this stage</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(interviewApps as any[])?.map((app) => (
                      <Card key={app.id} className="bg-white border-2 border-[#D6D6D6] rounded-xl hover:border-[#008260] hover:shadow-md transition-all duration-300">
                        <CardContent className="p-6">
                          {/* Header with title and badge */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base text-[#000000] mb-1">
                                {app.internships?.title || 'Internship'}
                              </h3>
                            </div>
                            <Badge className="bg-[#FFF2E5] text-[#FF6B00] hover:bg-[#FFE5CC] border-none font-medium shrink-0 ml-3">
                              Interview
                            </Badge>
                          </div>

                          {/* Description */}
                          {app.internships?.responsibilities && (
                            <p className="text-sm text-[#6A6A6A] mb-4 line-clamp-2">
                              {app.internships.responsibilities}
                            </p>
                          )}

                          {/* Grid Layout for Details - 2 rows x 3 columns */}
                          <div className="grid grid-cols-3 gap-x-8 gap-y-4 mb-4">
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Deadline:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {app.internships?.start_date 
                                  ? new Date(app.internships.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Duration:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {app.internships?.duration_value} {app.internships?.duration_unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Stipend:</div>
                              <div className="font-semibold text-[#008260] text-sm">
                                {app.internships?.paid 
                                  ? `₹${app.internships.stipend_min}${app.internships.stipend_max ? '-₹' + app.internships.stipend_max : ''}/month`
                                  : 'Unpaid'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Work Mode:</div>
                              <div className="font-semibold text-[#000000] text-sm">{app.internships?.work_mode}</div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Engagement:</div>
                              <div className="font-semibold text-[#000000] text-sm">{app.internships?.engagement}</div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Posted on:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {new Date(app.internships?.created_at || app.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>

                          {/* View Button */}
                          <div className="flex justify-end">
                            <Button 
                              className="bg-[#008260] hover:bg-[#006B4F] text-white font-medium rounded-full px-6"
                              onClick={() => router.push(`/student/internships/${app.internship_id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {hasMoreInterview && !interviewLoading && (
                      <div
                        ref={(el) => {
                          if (!el) return
                          const obs = new IntersectionObserver(([entry]) => {
                            if (entry.isIntersecting) loadMoreInterview()
                          }, { threshold: 0.2 })
                          obs.observe(el)
                          return () => obs.disconnect()
                        }}
                        className="text-center py-4 text-sm text-slate-500"
                      >
                        Loading more...
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Selected */}
              <TabsContent value="selected">
                {selectedLoading && (selectedApps as any[])?.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">Loading applications...</div>
                ) : (selectedApps as any[])?.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium">No applications in this stage</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(selectedApps as any[])?.map((app) => (
                      <Card key={app.id} className="bg-white border-2 border-[#D6D6D6] rounded-xl hover:border-[#008260] hover:shadow-md transition-all duration-300">
                        <CardContent className="p-6">
                          {/* Header with title and badge */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base text-[#000000] mb-1">
                                {app.internships?.title || 'Internship'}
                              </h3>
                            </div>
                            <Badge className="bg-[#FFF2E5] text-[#FF6B00] hover:bg-[#FFE5CC] border-none font-medium shrink-0 ml-3">
                              Selected
                            </Badge>
                          </div>

                          {/* Description */}
                          {app.internships?.responsibilities && (
                            <p className="text-sm text-[#6A6A6A] mb-4 line-clamp-2">
                              {app.internships.responsibilities}
                            </p>
                          )}

                          {/* Grid Layout for Details - 2 rows x 3 columns */}
                          <div className="grid grid-cols-3 gap-x-8 gap-y-4 mb-4">
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Deadline:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {app.internships?.start_date 
                                  ? new Date(app.internships.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Duration:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {app.internships?.duration_value} {app.internships?.duration_unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Stipend:</div>
                              <div className="font-semibold text-[#008260] text-sm">
                                {app.internships?.paid 
                                  ? `₹${app.internships.stipend_min}${app.internships.stipend_max ? '-₹' + app.internships.stipend_max : ''}/month`
                                  : 'Unpaid'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Work Mode:</div>
                              <div className="font-semibold text-[#000000] text-sm">{app.internships?.work_mode}</div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Engagement:</div>
                              <div className="font-semibold text-[#000000] text-sm">{app.internships?.engagement}</div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Posted on:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {new Date(app.internships?.created_at || app.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>

                          {/* View Button */}
                          <div className="flex justify-end">
                            <Button 
                              className="bg-[#008260] hover:bg-[#006B4F] text-white font-medium rounded-full px-6"
                              onClick={() => router.push(`/student/internships/${app.internship_id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {hasMoreSelected && !selectedLoading && (
                      <div
                        ref={(el) => {
                          if (!el) return
                          const obs = new IntersectionObserver(([entry]) => {
                            if (entry.isIntersecting) loadMoreSelected()
                          }, { threshold: 0.2 })
                          obs.observe(el)
                          return () => obs.disconnect()
                        }}
                        className="text-center py-4 text-sm text-slate-500"
                      >
                        Loading more...
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Rejected */}
              <TabsContent value="rejected">
                {rejectedLoading && (rejectedApps as any[])?.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">Loading applications...</div>
                ) : (rejectedApps as any[])?.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium">No applications in this stage</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(rejectedApps as any[])?.map((app) => (
                      <Card key={app.id} className="bg-white border-2 border-[#D6D6D6] rounded-xl hover:border-[#008260] hover:shadow-md transition-all duration-300">
                        <CardContent className="p-6">
                          {/* Header with title and badge */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base text-[#000000] mb-1">
                                {app.internships?.title || 'Internship'}
                              </h3>
                            </div>
                            <Badge className="bg-[#FFF1E7] text-[#9B0000] hover:bg-[#FFF1E7] border-none font-medium shrink-0 ml-3 text-xs">
                              Rejected
                            </Badge>
                          </div>

                          {/* Description */}
                          {app.internships?.responsibilities && (
                            <p className="text-sm text-[#6A6A6A] mb-4 line-clamp-2">
                              {app.internships.responsibilities}
                            </p>
                          )}

                          {/* Grid Layout for Details - 2 rows x 3 columns */}
                          <div className="grid grid-cols-3 gap-x-8 gap-y-4 mb-4">
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Deadline:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {app.internships?.start_date 
                                  ? new Date(app.internships.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Duration:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {app.internships?.duration_value} {app.internships?.duration_unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Stipend:</div>
                              <div className="font-semibold text-[#008260] text-sm">
                                {app.internships?.paid 
                                  ? `₹${app.internships.stipend_min}${app.internships.stipend_max ? '-₹' + app.internships.stipend_max : ''}/month`
                                  : 'Unpaid'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Work Mode:</div>
                              <div className="font-semibold text-[#000000] text-sm">{app.internships?.work_mode}</div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Engagement:</div>
                              <div className="font-semibold text-[#000000] text-sm">{app.internships?.engagement}</div>
                            </div>
                            <div>
                              <div className="text-[#717171] text-xs mb-1">Posted on:</div>
                              <div className="font-semibold text-[#000000] text-sm">
                                {new Date(app.internships?.created_at || app.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>

                          {/* View Button */}
                          <div className="flex justify-end">
                            <Button 
                              className="bg-[#008260] hover:bg-[#006B4F] text-white font-medium rounded-full px-6"
                              onClick={() => router.push(`/student/internships/${app.internship_id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {hasMoreRejected && !rejectedLoading && (
                      <div
                        ref={(el) => {
                          if (!el) return
                          const obs = new IntersectionObserver(([entry]) => {
                            if (entry.isIntersecting) loadMoreRejected()
                          }, { threshold: 0.2 })
                          obs.observe(el)
                          return () => obs.disconnect()
                        }}
                        className="text-center py-4 text-sm text-slate-500"
                      >
                        Loading more...
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


