'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Eye, Briefcase } from 'lucide-react'
import { usePagination } from '@/hooks/usePagination'

export default function CorporateInternshipsDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [internships, setInternships] = useState<any[]>([])
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
        if ((inst.type || '').toLowerCase() !== 'corporate') {
          router.push('/institution/home')
          return
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load internships')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const { data, loading: listLoading, hasMore, loadMore, refresh } = usePagination(
    async (page: number) => {
      const res = await api.internships.getAll({ page, limit: 10 })
      return Array.isArray(res) ? res : (res?.data || [])
    },
    []
  )

  useEffect(() => {
    setInternships(data as any[])
  }, [data])

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
            <Link href="/institution/internships" className="flex items-center space-x-2 group">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Corporate Internships</span>
            </Link>
            <div className="flex items-center space-x-2">
              <NotificationBell />
              <ProfileDropdown user={user} institution={institution} userType="institution" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900">My Internships</CardTitle>
            <CardDescription className="text-slate-600">Manage your posted internship opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading && internships.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-slate-600">Loading internships...</p>
              </div>
            ) : internships.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No internships posted yet</p>
                <p className="text-sm text-slate-500">Create your first internship to reach institutions</p>
                <div className="mt-4">
                  <Link href="/institution/internships/create">
                    <Button className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">Post Internship</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {internships.map((item) => (
                  <div key={item.id} className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-2 min-w-0">
                      <h3 className="font-semibold text-lg text-slate-900 truncate pr-2">{item.title}</h3>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Badge variant="outline" className="capitalize border-slate-300 text-slate-700">{item.status}</Badge>
                        <Badge variant="secondary" className="capitalize bg-slate-100 text-slate-700">{item.work_mode}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{item.responsibilities}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-slate-500">Engagement:</span>
                        <p className="font-medium text-slate-900">{item.engagement}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Openings:</span>
                        <p className="font-medium text-slate-900">{item.openings}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Duration:</span>
                        <p className="font-medium text-slate-900">{item.duration_value} {item.duration_unit}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Posted:</span>
                        <p className="font-medium text-slate-900">{new Date(item.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button size="sm" variant="outline" className="border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700" onClick={() => router.push(`/institution/internships/${item.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
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
                    Loading more internships...
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


