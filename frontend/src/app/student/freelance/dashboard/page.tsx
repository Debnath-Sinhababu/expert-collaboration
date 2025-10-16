'use client'

import { useEffect, useState } from 'react'
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
import { Briefcase, FileText } from 'lucide-react'
import { usePagination } from '@/hooks/usePagination'
import Logo from '@/components/Logo'

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
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
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
        <h2 className="text-2xl font-semibold text-black mb-6">Freelance Dashboard</h2>

        <Card className="">
          <CardHeader>
            <CardTitle className="text-slate-900">My Freelance Applications</CardTitle>
            <CardDescription className="text-slate-600">Track and submit your work</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
              <div className="w-full overflow-x-auto md:overflow-x-visible scrollbar-hide">
                <TabsList className="flex md:grid w-max md:w-full md:grid-cols-3 gap-2 bg-white border-b border-slate-200 h-12 px-4 md:px-0">
                  <TabsTrigger value="pending" className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max">Pending</TabsTrigger>
                  <TabsTrigger value="shortlisted" className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max">Shortlisted</TabsTrigger>
                  <TabsTrigger value="submitted" className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max">Submitted</TabsTrigger>
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
                    <div key={a.id} className="bg-white border border-[#DCDCDC] rounded-lg p-6 hover:border-[#008260] transition-all duration-300">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <h3 className="text-lg font-bold text-[#000000]">{a.project?.title || a.project_id}</h3>
                        <Badge className="bg-[#FFF2E5] text-[#FF6B00] hover:bg-[#FFE5CC] border-none font-medium shrink-0">
                          Pending
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-[#000000] mb-4 line-clamp-2 leading-relaxed">
                        {a.project?.description || ''}
                      </p>

                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <div className="text-xs text-[#C91B1B] font-medium mb-1">Deadline:</div>
                          <div className="text-sm font-semibold text-[#000000]">
                            {a.project?.deadline 
                              ? new Date(a.project.deadline).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              : 'Not specified'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#717171] font-medium mb-1">Budget:</div>
                          <div className="text-sm font-semibold text-[#008260]">
                            {a.project?.budget_min || a.project?.budget_max 
                              ? `₹${a.project.budget_min || 0}${a.project.budget_max ? `-₹${a.project.budget_max}` : ''}/month`
                              : 'Not specified'}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          onClick={() => router.push(`/student/freelance/${a.project_id}`)}
                          className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-full px-6 font-medium"
                        >
                          View
                        </Button>
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
                    <div key={a.id} className="bg-white border border-[#DCDCDC] rounded-lg p-6 hover:border-[#008260] transition-all duration-300">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <h3 className="text-lg font-bold text-[#000000]">{a.project?.title || a.project_id}</h3>
                        <Badge className="bg-[#E8F5F1] text-[#008260] hover:bg-[#D0EDE3] border border-[#B8E6D5] font-medium shrink-0">
                          Shortlisted
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-[#000000] mb-4 line-clamp-2 leading-relaxed">
                        {a.project?.description || ''}
                      </p>

                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <div className="text-xs text-[#C91B1B] font-medium mb-1">Deadline:</div>
                          <div className="text-sm font-semibold text-[#000000]">
                            {a.project?.deadline 
                              ? new Date(a.project.deadline).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              : 'Not specified'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#717171] font-medium mb-1">Budget:</div>
                          <div className="text-sm font-semibold text-[#008260]">
                            {a.project?.budget_min || a.project?.budget_max 
                              ? `₹${a.project.budget_min || 0}${a.project.budget_max ? `-₹${a.project.budget_max}` : ''}/month`
                              : 'Not specified'}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          onClick={() => router.push(`/student/freelance/${a.project_id}`)}
                          className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-full px-6 font-medium"
                        >
                          Submit
                        </Button>
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
                    <div key={s.id} className="bg-white border border-[#DCDCDC] rounded-lg p-6 hover:border-[#008260] transition-all duration-300">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <h3 className="text-lg font-bold text-[#000000]">{s.project?.title || 'Project'}</h3>
                        <Badge className="bg-[#FFF2E5] text-[#FF6B00] hover:bg-[#FFE5CC] border-none font-medium shrink-0">
                          Submitted
                        </Badge>
                      </div>
                      
                      {s.note && (
                        <div className="mb-4">
                          <div className="text-xs text-[#717171] font-medium mb-1">Note:</div>
                          <p className="text-sm text-[#000000] leading-relaxed break-all">{s.note}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <div className="text-xs text-[#717171] font-medium mb-1">Submitted on:</div>
                          <div className="text-sm font-semibold text-[#000000]">
                            {new Date(s.created_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </div>
                        </div>
                        {s.attachment_url && (
                          <div>
                            <div className="text-xs text-[#717171] font-medium mb-1">Attachment:</div>
                            <a 
                              href={s.attachment_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1 text-sm text-[#0066CC] hover:underline font-medium"
                            >
                              <FileText className="h-4 w-4" /> View PDF
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          onClick={() => router.push(`/student/freelance/${s.project_id || s.project?.id}`)}
                          className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-full px-6 font-medium"
                        >
                          View
                        </Button>
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


