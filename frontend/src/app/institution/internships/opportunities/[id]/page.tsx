'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, School, FileText, CalendarDays, Eye, Check, X } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function InternshipDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [internship, setInternship] = useState<any>(null)
  const [apps, setApps] = useState<any[]>([])
  const [appCounts, setAppCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [activeStage, setActiveStage] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [appsPage, setAppsPage] = useState(1)
  const [appsHasMore, setAppsHasMore] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        const inst = await api.institutions.getByUserId(user.id)
        if (!inst) { router.push('/institution/profile-setup'); return }
        setInstitution(inst)
        const data = await api.internships.getById(id)
        if (data?.error) throw new Error(data.error)
        setInternship(data)
        // If restricted and tagged to this institution, load applications list
        if (data.visibility_scope !== 'public') {
          const res = await api.internshipApplicationsInstitution.list(id, { page: 1, limit: 10, stage: 'pending' })
          setApps(res?.data || [])
          setAppCounts(res?.counts || { pending: 0, approved: 0, rejected: 0, total: 0 })
          setAppsPage(1)
          setAppsHasMore((res?.data || []).length >= 10)
        }
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
          <div className="text-xl font-bold text-white">Internship Details</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} institution={institution} userType="institution" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
        {!internship ? (
          <div className="text-center text-[#6A6A6A]">Internship not found</div>
        ) : (
           <div className="">
             <div>
              {/* Title and Location */}
              <div className="mb-6 border-b border-[#C5C5C5]">
                <h1 className="text-3xl font-bold text-[#000000] mb-3">{internship.title}</h1>
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
              <div className="mb-8">
                <h2 className="text-xl font-bold text-[#000000] mb-3">Internship Description</h2>
                <p className="text-[#6A6A6A] text-base leading-relaxed">{internship.responsibilities}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-3 gap-x-16 gap-y-6 mb-8">
                <div>
                  <div className="text-[#6A6A6A] text-sm mb-1">Openings:</div>
                  <div className="font-semibold text-[#000000] text-base">{internship.openings}</div>
                </div>
                <div>
                  <div className="text-[#6A6A6A] text-sm mb-1">Duration:</div>
                  <div className="font-semibold text-[#000000] text-base">{internship.duration_value} {internship.duration_unit}</div>
                </div>
                <div>
                  <div className="text-[#6A6A6A] text-sm mb-1">Stipend:</div>
                  <div className="font-semibold text-[#000000] text-base">{internship.paid ? `₹${internship.stipend_min}${internship.stipend_max ? '-₹' + internship.stipend_max : ''}/month` : 'Unpaid'}</div>
                </div>
                <div>
                  <div className="text-[#6A6A6A] text-sm mb-1">Work Mode:</div>
                  <div className="font-semibold text-[#000000] text-base">{internship.work_mode}</div>
                </div>
                <div>
                  <div className="text-[#6A6A6A] text-sm mb-1">Engagement:</div>
                  <div className="font-semibold text-[#000000] text-base">{internship.engagement}</div>
                </div>
                <div>
                  <div className="text-[#6A6A6A] text-sm mb-1">Start:</div>
                  <div className="font-semibold text-[#000000] text-base">
                    {String(internship.start_timing).toLowerCase() === 'immediately' ? 'Immediately' : (internship.start_date ? new Date(internship.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-')}
                  </div>
                </div>
                <div>
                  <div className="text-[#6A6A6A] text-sm mb-1">Posted on:</div>
                  <div className="font-semibold text-[#000000] text-base">{new Date(internship.created_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                </div>
                {typeof internship.ppo !== 'undefined' && (
                  <div>
                    <div className="text-[#6A6A6A] text-sm mb-1">Pre-Placement Offer:</div>
                    <div className="font-semibold text-[#000000] text-base">{internship.ppo ? 'Yes' : 'No'}</div>
                  </div>
                )}
              </div>

              {/* Perks */}
              {Array.isArray(internship.perks) && internship.perks.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-[#000000] mb-3">Perks</h3>
                  <div className="flex flex-wrap gap-3">
                    {internship.perks.map((perk: string, idx: number) => (
                      <Badge key={idx} className="bg-[#D8E9FF] text-[#000000] hover:bg-[#D8E9FF] border-none text-sm rounded-lg font-medium px-4 py-2">{perk}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {Array.isArray(internship.skills_required) && internship.skills_required.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#000000] mb-3">Skills Required</h3>
                  <div className="flex flex-wrap gap-3">
                    {internship.skills_required.map((skill: string, idx: number) => (
                      <Badge key={idx} className="bg-[#D8E9FF] text-[#000000] hover:bg-[#D8E9FF] rounded-lg border-none text-sm font-medium px-4 py-2">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Copy Link Button */}
              <div className="flex justify-end mb-6">
                <Button 
                  className="bg-[#008260] hover:bg-[#006B4F] text-white font-medium rounded-full px-6" 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    alert('Link copied to clipboard!')
                  }}
                >
                  Copy Link
                </Button>
              </div>

              {internship.visibility_scope !== 'public' && (
                <div className="pt-6 border-t border-[#E5E5E5]">
                  <h2 className="text-2xl font-bold text-[#000000] mb-6">Applications</h2>
                  <Tabs value={activeStage} onValueChange={async (v) => {
                    const stage = v as 'pending' | 'approved' | 'rejected'
                    setActiveStage(stage)
                    const res = await api.internshipApplicationsInstitution.list(id, { page: 1, limit: 10, stage })
                    setApps(res?.data || [])
                    setAppCounts(res?.counts || { pending: 0, approved: 0, rejected: 0, total: 0 })
                    setAppsPage(1)
                    setAppsHasMore((res?.data || []).length >= 10)
                  }} className="space-y-6">
                    <div className="w-full overflow-x-auto md:overflow-x-visible scrollbar-hide">
                      <TabsList className="flex md:grid w-max md:w-full md:grid-cols-3 gap-2 bg-white border-b border-slate-200 h-12 px-4 md:px-0">
                        <TabsTrigger 
                          value="pending"
                          className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                        >
                          Pending ({appCounts.pending})
                        </TabsTrigger>
                        <TabsTrigger 
                          value="approved"
                          className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                        >
                          Approved ({appCounts.approved})
                        </TabsTrigger>
                        <TabsTrigger 
                          value="rejected"
                          className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                        >
                          Rejected ({appCounts.rejected})
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value={activeStage} />
                  </Tabs>

                  <div className="space-y-4">
                    {apps.length === 0 ? (
                      <div className="text-center py-6 text-slate-600">No applications in this stage</div>
                    ) : (
                      apps.map((app) => {
                        const name = app.student?.name || 'Student'
                        const email = app.student?.email || '-'
                        const initial = String(name).charAt(0).toUpperCase()
                        return (
                          <div key={app.id} className="bg-white border border-[#DCDCDC] rounded-lg p-6 relative">
                            {activeStage === 'rejected' && (
                              <Badge className="absolute top-4 right-4 rounded-3xl bg-white border border-[#9B0000] text-[#9B0000] hover:bg-white text-[13px] font-medium">
                                Rejected
                              </Badge>
                            )}
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-12 w-12"><AvatarImage src={app.student?.photo_url} /><AvatarFallback className="bg-[#C8E6F5] text-[#008260] text-base font-semibold">{initial}</AvatarFallback></Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-[#000000] text-base">{name}</h4>
                                <div className="text-sm text-[#6A6A6A]">{email}</div>
                              </div>
                            </div>
                            
                            <div className="mb-4 text-sm text-[#6A6A6A]">
                              <span className="font-medium">Applied:</span> {new Date(app.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            
                            {app.cover_letter && (
                              <div className="mb-4 text-sm text-[#6A6A6A] leading-relaxed line-clamp-3">{app.cover_letter}</div>
                            )}
                            
                            <div className="flex items-center justify-end gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="border border-[#008260] text-[#008260] hover:bg-[#008260]/10 rounded-full px-4">View Profile</Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl bg-white border border-[#DCDCDC]">
                                    <DialogHeader>
                                      <DialogTitle className="text-2xl font-bold text-[#000000]">Student Profile</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-6">
                                      {/* Student Info Header */}
                                      <div className="flex items-center gap-4 pb-4 border-b border-[#E5E5E5]">
                                        <Avatar className="w-16 h-16 border-2 border-[#008260]"><AvatarImage src={app.student?.photo_url} /><AvatarFallback className="text-xl font-bold bg-[#C8E6F5] text-[#008260]">{initial}</AvatarFallback></Avatar>
                                        <div>
                                          <div className="font-bold text-xl text-[#000000]">{name}</div>
                                          <div className="text-sm text-[#6A6A6A] flex items-center gap-1 mt-1"><Mail className="h-4 w-4" /> {email}</div>
                                          {app.student?.city && (<div className="text-sm text-[#6A6A6A] mt-1">{[app.student.city, app.student.state].filter(Boolean).join(', ')}</div>)}
                                        </div>
                                      </div>
                                      
                                      {/* Cover Letter */}
                                      {app.cover_letter && (
                                        <div>
                                          <h4 className="font-semibold text-[#000000] mb-3 text-base">Cover Letter</h4>
                                          <div className="text-sm text-[#6A6A6A] leading-relaxed whitespace-pre-wrap">{app.cover_letter}</div>
                                        </div>
                                      )}
                                      
                                      {/* Education & Preferences Grid */}
                                      <div className="grid grid-cols-2 gap-6">
                                        <div>
                                          <h4 className="font-semibold text-[#000000] mb-2 text-base">Education</h4>
                                          <p className="text-sm text-[#6A6A6A] mb-1">{app.student?.degree || '-'} {app.student?.year ? `· ${app.student.year}` : ''}</p>
                                          <p className="text-xs text-[#6A6A6A]">{app.student?.education_start_date || '-'} {app.student?.currently_studying ? ' - Present' : (app.student?.education_end_date ? ` - ${app.student.education_end_date}` : '')}</p>
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-[#000000] mb-2 text-base">Preferences</h4>
                                          <p className="text-sm text-[#6A6A6A] mb-1">{app.student?.preferred_engagement || '-'} {app.student?.preferred_work_mode ? `· ${app.student.preferred_work_mode}` : ''}</p>
                                          <p className="text-xs text-[#6A6A6A]">Availability: {app.student?.availability || '-'}</p>
                                        </div>
                                      </div>
                                      
                                      {/* Skills */}
                                      {Array.isArray(app.student?.skills) && app.student.skills.length > 0 && (
                                        <div>
                                          <h4 className="font-semibold text-[#000000] mb-3 text-base">Skills</h4>
                                          <div className="flex flex-wrap gap-2">{app.student.skills.map((s: string, i: number) => (<Badge key={`${s}-${i}`} className="bg-[#D8E9FF] text-[#000000] hover:bg-[#D8E9FF] border-none text-sm font-medium px-3 py-1">{s}</Badge>))}</div>
                                        </div>
                                      )}
                                      
                                      {/* Applied On & Resume */}
                                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#E5E5E5]">
                                        <div>
                                          <h4 className="font-semibold text-[#000000] mb-2 text-base">Applied On</h4>
                                          <p className="text-sm text-[#6A6A6A]">{new Date(app.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                        {app.resume_url && (
                                          <div>
                                            <h4 className="font-semibold text-[#000000] mb-2 text-base">Resume</h4>
                                            <a href={app.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#008260] hover:text-[#006B4F] hover:underline text-sm font-medium"><FileText className="h-4 w-4" /> Open Resume</a>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                {activeStage === 'pending' && (
                                  <>
                                    <Button size="sm" className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-full px-4" onClick={async () => {
                                      await api.internshipApplicationsInstitution.updateStatus(app.id, 'approved_institution')
                                      const res = await api.internshipApplicationsInstitution.list(id, { page: 1, limit: 10, stage: 'pending' })
                                      setApps(res?.data || [])
                                      setAppCounts(res?.counts || appCounts)
                                      setAppsPage(1)
                                      setAppsHasMore((res?.data || []).length >= 10)
                                    }}>Approve</Button>
                                    <Button size="sm" variant="outline" className="text-[#C91B1B] border border-[#C91B1B] hover:bg-[#C91B1B]/10 rounded-full px-4" onClick={async () => {
                                      await api.internshipApplicationsInstitution.updateStatus(app.id, 'rejected_institution')
                                      const res = await api.internshipApplicationsInstitution.list(id, { page: 1, limit: 10, stage: 'pending' })
                                      setApps(res?.data || [])
                                      setAppCounts(res?.counts || appCounts)
                                      setAppsPage(1)
                                      setAppsHasMore((res?.data || []).length >= 10)
                                    }}>Reject</Button>
                                  </>
                                )}
                              </div>
                          </div>
                        )
                      })
                    )}
                    {appsHasMore && (
                      <div className="text-center py-3 text-sm text-slate-500" ref={(el) => {
                        if (!el) return
                        const obs = new IntersectionObserver(async ([entry]) => {
                          if (entry.isIntersecting) {
                            const nextPage = appsPage + 1
                            const res = await api.internshipApplicationsInstitution.list(id, { page: nextPage, limit: 10, stage: activeStage })
                            const arr = res?.data || []
                            if (arr.length > 0) {
                              setApps(prev => [...prev, ...arr])
                              setAppsPage(nextPage)
                            }
                            if (arr.length < 10) setAppsHasMore(false)
                          }
                        }, { threshold: 0.2 })
                        obs.observe(el)
                        return () => obs.disconnect()
                      }}>Loading more...</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


