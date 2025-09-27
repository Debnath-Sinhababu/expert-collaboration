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
      const data = await api.internships.getVisible(params)
      return Array.isArray(data) ? data : (data?.data || [])
    },
    [search, workMode, engagement, paid, minStipend, maxStipend, skills, location]
  )

  // Do not call refresh() here; usePagination already refreshes on dependency change

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading internships...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/institution/internships" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Internship Opportunities</Link>
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

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-700 mb-1">Search</div>
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
            <div>
              <div className="text-sm text-slate-700 mb-1">Min stipend</div>
              <Input type="number" value={minStipend} onChange={(e) => setMinStipend(e.target.value)} placeholder="e.g. 5000" />
            </div>
            <div>
              <div className="text-sm text-slate-700 mb-1">Max stipend</div>
              <Input type="number" value={maxStipend} onChange={(e) => setMaxStipend(e.target.value)} placeholder="e.g. 20000" />
            </div>
            <div>
              <div className="text-sm text-slate-700 mb-1">Skills (comma-separated)</div>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Java, React" />
            </div>
            <div>
              <div className="text-sm text-slate-700 mb-1">Location</div>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or text" />
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {(listLoading && internships.length === 0) ? (
            <div className="text-center py-12 text-slate-600">Loading internships...</div>
          ) : (
            internships.map((item: any) => (
              <Card key={item.id} className="bg-white border-2 border-slate-200">
                <CardContent className="p-4">
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
                  <div className="flex justify-end mt-3">
                    <Button className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white" onClick={() => router.push(`/institution/internships/opportunities/${item.id}`)}>View</Button>
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
              className="text-center py-4 text-sm text-slate-500"
            >
              Loading more...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


