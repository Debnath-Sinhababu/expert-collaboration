'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { usePagination } from '@/hooks/usePagination'

export default function InternshipOpportunitiesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [workMode, setWorkMode] = useState<string>('all')
  const [engagement, setEngagement] = useState<string>('all')
  const [paid, setPaid] = useState<string>('all')
  const [minStipend, setMinStipend] = useState('')
  const [maxStipend, setMaxStipend] = useState('')
  const [skills, setSkills] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'tagged'>('all')
  const [location, setLocation] = useState('')
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        setUser(user)
        const inst = await api.institutions.getByUserId(user.id)
        if (!inst) {
          router.push('/institution/profile-setup')
          return
        }
        setInstitution(inst)
      } catch (e: any) {
        setError(e.message || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const {
    data: internships,
    loading: listLoading,
    hasMore,
    loadMore,
    refresh
  } = usePagination(
    async (page: number) => {
      const params: any = { page, limit: 10 }
      if (search) params.search = search
      if (workMode !== 'all') params.work_mode = workMode
      if (engagement !== 'all') params.engagement = engagement
      if (paid !== 'all') params.paid = paid
      if (minStipend) params.min_stipend = minStipend
      if (maxStipend) params.max_stipend = maxStipend
      if (skills) params.skills = skills
      if (location) params.location = location
      if (visibilityFilter !== 'all') params.visibility = visibilityFilter
      const data = await api.internships.getVisible(params)
      return Array.isArray(data) ? data : (data?.data || [])
    },
    [search, workMode, engagement, paid, minStipend, maxStipend, skills, location, visibilityFilter]
  )

  // Do not call refresh() here; usePagination already refreshes on dependency change

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading internships...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] backdrop-blur-sm border-b border-white/10 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/institution/internships" className="text-xl font-bold text-white">Internship Opportunities</Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} institution={institution} userType="institution" />
          </div>
        </div>
      </header>

      

      <div className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>
        )}
       
       <h2 className="text-2xl font-semibold text-[#000000] mb-4 mx-auto">Browse Internships</h2>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-[#D6D6D6] p-6 mb-8">
         
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Search</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6A6A6A] h-4 w-4" />
                <Input 
                  className="pl-10 focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" 
                  placeholder="Titles, responsibilities" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Work Mode</div>
              <Select value={workMode} onValueChange={setWorkMode}>
                <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="In office">In office</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Engagement</div>
              <Select value={engagement} onValueChange={setEngagement}>
                <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Paid</div>
              <Select value={paid} onValueChange={setPaid}>
                <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Paid</SelectItem>
                  <SelectItem value="false">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Visibility</div>
              <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as any)}>
                <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="tagged">Tagged to me</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Minimum Stipend (₹)</div>
              <Input 
                type="number" 
                className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                value={minStipend} 
                onChange={(e) => setMinStipend(e.target.value)} 
                placeholder="e.g. 5000" 
              />
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Maximum Stipend (₹)</div>
              <Input 
                type="number" 
                className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                value={maxStipend} 
                onChange={(e) => setMaxStipend(e.target.value)} 
                placeholder="e.g. 20000" 
              />
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Skills (comma-separated)</div>
              <Input 
                className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                value={skills} 
                onChange={(e) => setSkills(e.target.value)} 
                placeholder="e.g. Java, React" 
              />
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Location</div>
              <Input 
                className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="City" 
              />
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {(listLoading && internships.length === 0) ? (
            <div className="text-center py-12 text-[#6A6A6A]">Loading internships...</div>
          ) : internships.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6A6A6A] text-lg">No internships found</p>
              <p className="text-[#6A6A6A] text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            internships.map((item: any) => (
              <Card key={item.id} className="bg-white border border-[#DCDCDC] hover:border-[#008260] hover:shadow-md transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-lg text-[#000000] group-hover:text-[#008260] transition-colors duration-300 mb-2">{item.title}</h3>
                    <p className="text-sm text-[#6A6A6A] line-clamp-2">{item.responsibilities}</p>
                  </div>
                  
                  <div className="grid grid-cols-2  sm:grid-cols-3 gap-x-8 gap-y-4 mb-4">
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Openings:</div>
                      <div className="font-semibold text-[#000000] text-sm">{item.openings}</div>
                    </div>
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Duration:</div>
                      <div className="font-semibold text-[#000000] text-sm">{item.duration_value} {item.duration_unit}</div>
                    </div>
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Stipend:</div>
                      <div className="font-semibold text-[#008260] text-sm">{item.paid ? `₹${item.stipend_min}${item.stipend_max ? '-₹' + item.stipend_max : ''}/month` : 'Unpaid'}</div>
                    </div>
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Engagement:</div>
                      <div className="font-semibold text-[#000000] text-sm">{item.engagement}</div>
                    </div>
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Work Mode:</div>
                      <div className="font-semibold text-[#000000] text-sm">{item.work_mode}</div>
                    </div>
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Posted on:</div>
                      <div className="font-semibold text-[#000000] text-sm">{new Date(item.created_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      className="bg-[#008260] hover:bg-[#006B4F] text-white font-medium rounded-full px-8" 
                      onClick={() => router.push(`/institution/internships/opportunities/${item.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
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
              className="text-center py-4 text-sm text-[#6A6A6A]"
            >
              Loading more...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


