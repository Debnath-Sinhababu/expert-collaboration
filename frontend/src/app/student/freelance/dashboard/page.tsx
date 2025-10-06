'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Briefcase, FileText } from 'lucide-react'
import { usePagination } from '@/hooks/usePagination'

export default function StudentFreelanceDashboard() {
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'shortlisted' | 'submitted'>('pending')
  const [pending, setPending] = useState<any[]>([])
  const [shortlisted, setShortlisted] = useState<any[]>([])
  const [submitted, setSubmitted] = useState<any[]>([])

  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        const s = await api.students.me(); setStudent(s)
      } catch (e: any) {
        setError(e.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const { data: pendingData, loading: pendingLoading, hasMore: hasMorePending, loadMore: loadMorePending } = usePagination(
    async (page: number) => {
      const res = await api.freelance.listMyApplications({ page, limit: 10, status: 'pending' })
      return Array.isArray(res) ? res : (res?.data || [])
    },
    [user?.id]
  )
  const { data: shortlistedData, loading: shortlistedLoading, hasMore: hasMoreShortlisted, loadMore: loadMoreShortlisted } = usePagination(
    async (page: number) => {
      const res = await api.freelance.listMyApplications({ page, limit: 10, status: 'shortlisted' })
      return Array.isArray(res) ? res : (res?.data || [])
    },
    [user?.id]
  )
  const { data: submittedData, loading: submittedLoading, hasMore: hasMoreSubmitted, loadMore: loadMoreSubmitted } = usePagination(
    async (page: number) => {
      const res = await api.freelance.listMySubmissions({ page, limit: 10 })
      return Array.isArray(res) ? res : (res?.data || [])
    },
    [user?.id]
  )

  useEffect(() => { setPending(pendingData as any[]) }, [pendingData])
  useEffect(() => { setShortlisted(shortlistedData as any[]) }, [shortlistedData])
  useEffect(() => { setSubmitted(submittedData as any[]) }, [submittedData])

  // Submission is now handled on the project detail page

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/student/home" className="flex items-center space-x-2 group">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Freelancing</span>
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

        <Card className="bg-white border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">My Freelance Applications</CardTitle>
            <CardDescription className="text-slate-600">Track and submit your work</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
              <div className="w-full overflow-x-auto md:overflow-x-visible scrollbar-hide">
                <TabsList className="flex md:grid w-max md:w-full md:grid-cols-3 gap-2 bg-white border-b border-slate-200 h-12 px-4 md:px-0">
                  <TabsTrigger value="pending" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max">Pending</TabsTrigger>
                  <TabsTrigger value="shortlisted" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max">Shortlisted</TabsTrigger>
                  <TabsTrigger value="submitted" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max">Submitted</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pending">
                <div className="space-y-4">
                  {pendingLoading && pending.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">Loading applications...</div>
                  ) : pending.length === 0 ? (
                    <div className="text-center py-12">
                      <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-700 font-medium">No applications in this stage</p>
                    </div>
                  ) : pending.map((a) => (
                    <div key={a.id} className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-slate-900 truncate pr-2">{a.project?.title || a.project_id}</div>
                        <div className="text-xs text-slate-600">Pending</div>
                      </div>
                      <div className="text-sm text-slate-600 mb-2">{a.project?.description || ''}</div>
                      <div className="flex justify-end mt-1">
                        <Button size="sm" variant="outline" className="border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700" onClick={() => router.push(`/student/freelance/${a.project_id}`)}>View</Button>
                      </div>
                    </div>
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
              </TabsContent>

              <TabsContent value="shortlisted">
                <div className="space-y-4">
                  {shortlistedLoading && shortlisted.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">Loading applications...</div>
                  ) : shortlisted.length === 0 ? (
                    <div className="text-center py-12">
                      <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-700 font-medium">No applications in this stage</p>
                    </div>
                  ) : shortlisted.map((a) => (
                    <div key={a.id} className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-slate-900 truncate pr-2">{a.project?.title || a.project_id}</div>
                        <div className="text-xs text-slate-600">Shortlisted</div>
                      </div>
                      <div className="text-sm text-slate-600 mb-2">{a.project?.description || ''}</div>
                      {a.project?.deadline && (
                        <div className="mb-3 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            Deadline: <span className="font-medium">{new Date(a.project.deadline).toLocaleDateString()}</span>
                          </span>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 mt-1">
                        <Button className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white" onClick={() => router.push(`/student/freelance/${a.project_id}`)}>View & Submit</Button>
                      </div>
                    </div>
                  ))}
                  {hasMoreShortlisted && !shortlistedLoading && (
                    <div
                      ref={(el) => {
                        if (!el) return
                        const obs = new IntersectionObserver(([entry]) => {
                          if (entry.isIntersecting) loadMoreShortlisted()
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
              </TabsContent>

              <TabsContent value="submitted">
                <div className="space-y-4">
                  {submittedLoading && submitted.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">Loading submissions...</div>
                  ) : submitted.length === 0 ? (
                    <div className="text-center py-12">
                      <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-700 font-medium">No submissions yet</p>
                    </div>
                  ) : submitted.map((s) => (
                    <div key={s.id} className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-slate-900 truncate pr-2">{s.project?.title || 'Project'}</div>
                        <div className="text-xs text-slate-600">{new Date(s.created_at).toLocaleString()}</div>
                      </div>
                      {s.note && <div className="text-sm text-slate-700 mb-2 whitespace-pre-wrap">{s.note}</div>}
                      {s.attachment_url && (
                        <a href={s.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline text-sm"><FileText className="h-4 w-4" /> View Attachment</a>
                      )}
                      <div className="flex justify-end mt-3">
                        <Button size="sm" variant="outline" className="border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700" onClick={() => router.push(`/student/freelance/${s.project_id || s.project?.id}`)}>View</Button>
                      </div>
                    </div>
                  ))}
                  {hasMoreSubmitted && !submittedLoading && (
                    <div
                      ref={(el) => {
                        if (!el) return
                        const obs = new IntersectionObserver(([entry]) => {
                          if (entry.isIntersecting) loadMoreSubmitted()
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


