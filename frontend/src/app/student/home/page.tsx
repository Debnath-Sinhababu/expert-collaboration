'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { usePagination } from '@/hooks/usePagination'
import { Search, MapPin, IndianRupee, Briefcase } from 'lucide-react'

export default function StudentHome() {
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Carousels
  const [experts, setExperts] = useState<any[]>([])
  const [corporates, setCorporates] = useState<any[]>([])

  // Filters for internships list
  const [search, setSearch] = useState('')
  const [workMode, setWorkMode] = useState<string>('all')
  const [engagement, setEngagement] = useState<string>('all')
  const [paid, setPaid] = useState<string>('all')

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        try {
          const s = await api.students.me()
          setStudent(s)
        } catch (e: any) {
          // If missing profile, send to setup
          router.push('/student/profile-setup')
          return
        }
        // Load carousels
        const [expertsList, corporateList] = await Promise.all([
          api.experts.getAll({ page: 1, limit: 12, is_verified: true }),
          api.institutions.getAll({ page: 1, limit: 12, type: 'Corporate' })
        ])
        setExperts(Array.isArray(expertsList) ? expertsList : (expertsList?.data || []))
        const corpArr = Array.isArray(corporateList) ? corporateList : (corporateList?.data || [])
        setCorporates(corpArr)
      } catch (e: any) {
        setError(e.message || 'Failed to load student home')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const { data: internships, loading: listLoading, hasMore, loadMore } = usePagination(
    async (page: number) => {
      const params: any = { page, limit: 10, exclude_applied: 'true' }
      if (search) params.search = search
      if (workMode !== 'all') params.work_mode = workMode
      if (engagement !== 'all') params.engagement = engagement
      if (paid !== 'all') params.paid = paid
      const data = await api.internships.getVisible(params)
      return Array.isArray(data) ? data : (data?.data || [])
    },
    [search, workMode, engagement, paid]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading student home...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header (clone expert style) */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/student/home" className="flex items-center space-x-2 group">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Student Home</span>
            </Link>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="hidden md:flex items-center gap-2">
                <Link href="/student/freelance" className="hidden md:inline-flex">
                  <Button className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">Browse Freelance</Button>
                </Link>
              
              </div>
              <ProfileDropdown user={user} student={student} userType="student" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Mobile-only quick action */}
        <div className="mb-4 md:hidden">
          <Link href="/student/freelance">
            <Button className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">Browse Freelance</Button>
          </Link>
        </div>
        {error && (
          <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>
        )}

        {/* Associated Experts Carousel */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Associated Experts</h2>
          <Carousel opts={{ align: 'start' }} plugins={[Autoplay({ delay: 3000 })]} className="w-full">
            <CarouselContent>
              {experts.map((expert: any) => (
                <CarouselItem key={expert.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={expert.photo_url || ''} />
                        <AvatarFallback>{(expert.name || 'E').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{expert.name}</div>
                        <div className="text-xs text-slate-600 truncate">{expert.domain_expertise?.[0] || 'Expert'}</div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        {/* Associated Corporates Carousel */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Associated Corporates</h2>
          <Carousel opts={{ align: 'start' }} plugins={[Autoplay({ delay: 3500 })]} className="w-full">
            <CarouselContent>
              {corporates.map((inst: any) => (
                <CarouselItem key={inst.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={inst.logo_url || ''} />
                        <AvatarFallback>{(inst.name || 'C').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{inst.name}</div>
                        <div className="text-xs text-slate-600 truncate">{inst.city}{inst.state ? `, ${inst.state}` : ''}</div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        {/* Search and Filters for internships */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-700 mb-1">Search Internships</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input className="pl-10" placeholder="Title, responsibilities..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-700 mb-1">Work Mode</div>
              <Select value={workMode} onValueChange={setWorkMode}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="In office">In office</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm text-slate-700 mb-1">Engagement</div>
              <Select value={engagement} onValueChange={setEngagement}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm text-slate-700 mb-1">Paid</div>
              <Select value={paid} onValueChange={setPaid}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Paid</SelectItem>
                  <SelectItem value="false">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Internships List */}
        <Card className="bg-white border-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Internship Opportunities</CardTitle>
            <CardDescription className="text-slate-600">Browse internships from corporates</CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading && internships.length === 0 ? (
              <div className="text-center py-8 text-slate-600">Loading internships...</div>
            ) : (
              <div className="space-y-4">
                {internships.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium">No internships found</p>
                    <p className="text-sm text-slate-500">Try adjusting filters or check back later</p>
                  </div>
                ) : (
                  <>
                    {internships.map((item: any) => (
                      <div key={item.id} className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-2 min-w-0">
                          <h3 className="font-semibold text-lg text-slate-900 truncate pr-2">{item.title}</h3>
                          <div className="text-xs text-slate-600 flex-shrink-0">{item.engagement} · {item.work_mode}</div>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-2">{item.responsibilities}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div><span className="text-slate-500">Openings:</span> <span className="font-medium text-slate-900">{item.openings}</span></div>
                          <div><span className="text-slate-500">Duration:</span> <span className="font-medium text-slate-900">{item.duration_value} {item.duration_unit}</span></div>
                          <div><span className="text-slate-500">Stipend:</span> <span className="font-medium text-slate-900">{item.paid ? `₹${item.stipend_min}${item.stipend_max ? ' - ₹' + item.stipend_max : ''}/month` : 'Unpaid'}</span></div>
                          <div><span className="text-slate-500">Posted:</span> <span className="font-medium text-slate-900">{new Date(item.created_at).toLocaleDateString()}</span></div>
                        </div>
                        <div className="flex justify-end mt-3 gap-2">
                          <Button variant="outline" className="border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700" onClick={() => router.push(`/student/internships/${item.id}`)}>
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                    {hasMore && !listLoading && (
                      <div
                        ref={(el) => {
                          if (!el) return
                          const obs = new IntersectionObserver(([entry]) => {
                            if (entry.isIntersecting) loadMore()
                          }, { threshold: 0.2 })
                          obs.observe(el)
                          return () => obs.disconnect()
                        }}
                        className="text-center py-4 text-sm text-slate-500"
                      >
                        Loading more...
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}


