'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Briefcase } from 'lucide-react'
import { usePagination } from '@/hooks/usePagination'

type FreelanceProject = {
  id: string
  title: string
  description: string
  required_skills?: string[]
  deadline?: string | null
  budget_min?: number | null
  budget_max?: number | null
  status?: string
  created_at?: string
}

export default function FreelanceDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<FreelanceProject[]>([])
  const [error, setError] = useState('')

  const statusClass = (status?: string) => {
    const s = String(status || '').toLowerCase()
    if (s === 'open') return 'bg-blue-50 text-blue-700 border border-blue-200'
    if (s === 'ongoing') return 'bg-purple-50 text-purple-700 border border-purple-200'
    if (s === 'completed') return 'bg-green-50 text-green-700 border border-green-200'
    if (s === 'closed') return 'bg-slate-100 text-slate-700 border border-slate-200'
    return 'bg-slate-100 text-slate-700 border border-slate-200'
  }

  const { data, loading: listLoading, hasMore, loadMore } = usePagination(
    async (page: number) => {
      const res = await api.freelance.getCorporateProjects({ page, limit: 10 })
      return Array.isArray(res) ? res : (res?.data || [])
    },
    []
  )

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
        // No direct fetch here; list is driven by usePagination
      } catch (e: any) {
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  // Keep projects in sync with pagination data
  useEffect(() => {
    setProjects(data as any)
  }, [data])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Freelancing Dashboard</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} institution={institution} userType="institution" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">Your Projects</h2>
          <Link href="/institution/freelance/create">
            <Button className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">Create Project</Button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm">{error}</div>
        )}

        <Card className="bg-white border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Projects</CardTitle>
            <CardDescription className="text-slate-600">Manage your freelance postings</CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading && projects.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-slate-600">Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-700 font-medium">No projects yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((p) => (
                  <div key={p.id} className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-2 min-w-0">
                      <h3 className="font-semibold text-lg text-slate-900 truncate pr-2">{p.title}</h3>
                      {p.status && <span className={`capitalize text-xs px-2 py-0.5 rounded ${statusClass(p.status)}`}>{p.status}</span>}
                    </div>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{p.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                      {p.deadline && <div><span className="text-slate-500">Deadline:</span> <span className="font-medium text-slate-900">{new Date(p.deadline).toLocaleDateString()}</span></div>}
                      {(p.budget_min || p.budget_max) && <div><span className="text-slate-500">Budget:</span> <span className="font-medium text-slate-900">₹{p.budget_min || '—'} - ₹{p.budget_max || '—'}</span></div>}
                      <div className="truncate"><span className="text-slate-500">Skills:</span> <span className="font-medium text-slate-900">{(p.required_skills || []).slice(0,4).join(', ')}{(p.required_skills || []).length > 4 ? '…' : ''}</span></div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" className="border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700" onClick={() => router.push(`/institution/freelance/${p.id}`)}>View</Button>
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
                    Loading more projects...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


