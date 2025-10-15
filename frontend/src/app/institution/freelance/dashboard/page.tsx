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
    // All statuses use the same orange color scheme as shown in the image
    return 'bg-[#FFF5E6] text-[#FF8A00] border border-[#FF8A00]'
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
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-white">CalXMap</div>
          <div className="flex items-center space-x-6">
            <NotificationBell />
            <ProfileDropdown user={user} institution={institution} userType="institution" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#000000]">Freelance Dashboard</h1>
          <Link href="/institution/post-requirement">
            <Button className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-md px-6">+ Post Requirement</Button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 text-[#9B0000] text-sm">{error}</div>
        )}

        <Card className="bg-white border border-[#E0E0E0] rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-[#000000]">Projects</CardTitle>
            <CardDescription className="text-sm text-[#6A6A6A]">Manage your freelance postings</CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading && projects.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260] mx-auto mb-3"></div>
                <p className="text-[#6A6A6A]">Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-[#6A6A6A] mx-auto mb-3" />
                <p className="text-[#000000] font-medium">No projects yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((p) => (
                  <div key={p.id} className="bg-white border border-[#E0E0E0] rounded-xl p-5 hover:border-[#008260] hover:shadow-md transition-all duration-300">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <h3 className="font-semibold text-lg text-[#000000]">{p.title}</h3>
                      {p.status && <span className={`capitalize text-xs px-3 py-1 rounded-full flex-shrink-0 ${statusClass(p.status)}`}>{p.status}</span>}
                    </div>
                    <p className="text-sm text-[#6A6A6A] mb-4 line-clamp-2">{p.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {p.deadline && (
                        <div>
                          <p className="text-xs text-[#9B0000] mb-1">Deadline:</p>
                          <p className="text-sm font-medium text-[#000000]">{new Date(p.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                        </div>
                      )}
                      {(p.budget_min || p.budget_max) && (
                        <div>
                          <p className="text-xs text-[#6A6A6A] mb-1">Budget:</p>
                          <p className="text-sm font-medium text-[#000000]">₹{p.budget_min || '5000'}-₹{p.budget_max || '8000'}/month</p>
                        </div>
                      )}
                    </div>
                    {p.required_skills && p.required_skills.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {p.required_skills.map((skill: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 text-xs rounded-full bg-[#E8F5F1] text-[#008260] border border-[#008260]">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button size="sm" className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-md px-6" onClick={() => router.push(`/institution/freelance/${p.id}`)}>View</Button>
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
                    className="text-center py-4 text-sm text-[#6A6A6A]"
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


