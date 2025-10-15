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
import Logo from '@/components/Logo'

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
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/institution/home" className="flex items-center group">
              <Logo size="header" />
            </Link>
            <div className="flex items-center space-x-6">
             
         
              <NotificationBell />
              <ProfileDropdown user={user} institution={institution} userType="institution" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#000000]">Your Internships Project</h1>
          <Link href="/institution/post-requirement">
            <Button className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-md px-6">Create New Internship</Button>
          </Link>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-white border border-[#DCDCDC] rounded-2xl shadow-sm">
          <CardHeader className="border-b border-[#DCDCDC] pb-4">
            <CardTitle className="text-xl font-semibold text-[#000000]">Projects</CardTitle>
            <CardDescription className="text-[#6A6A6A]">Manage your freelance postings</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {listLoading && internships.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260] mx-auto mb-3"></div>
                <p className="text-[#6A6A6A]">Loading internships...</p>
              </div>
            ) : internships.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-[#6A6A6A] mx-auto mb-4" />
                <p className="text-[#000000] font-medium">No internships posted yet</p>
                <p className="text-sm text-[#6A6A6A] mt-1">Create your first internship to reach institutions</p>
                <div className="mt-4">
                  <Link href="/institution/post-requirement">
                    <Button className="bg-[#008260] hover:bg-[#006B4F] text-white">Post Internship</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {internships.map((item) => (
                  <div key={item.id} className="bg-white border border-[#E0E0E0] rounded-xl p-5 hover:border-[#008260] hover:shadow-md transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-xl text-[#000000]">{item.title}</h3>
                      <Badge className={`capitalize ml-2 flex-shrink-0 ${item.status === 'open' ? 'bg-[#FFF5E6] text-[#FF8A00] border border-[#FF8A00]' : 'bg-[#F5F5F5] text-[#6A6A6A] border border-[#DCDCDC]'}`}>
                        {item.status === 'open' ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#6A6A6A] mb-4 line-clamp-2">{item.responsibilities}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-[#6A6A6A] mb-1">Deadline:</p>
                        <p className="text-sm font-medium text-[#000000]">
                          {item.start_timing === 'immediately' ? 'Immediately' : new Date(item.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6A6A6A] mb-1">Duration:</p>
                        <p className="text-sm font-medium text-[#000000]">{item.duration_value} {item.duration_unit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6A6A6A] mb-1">Stipend:</p>
                        <p className="text-sm font-medium text-[#000000]">
                          {item.paid ? `₹${item.stipend_min}-₹${item.stipend_max}/${item.stipend_unit}` : 'Unpaid'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6A6A6A] mb-1">Work Mode:</p>
                        <p className="text-sm font-medium text-[#000000]">{item.work_mode}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6A6A6A] mb-1">Engagement:</p>
                        <p className="text-sm font-medium text-[#000000]">{item.engagement}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6A6A6A] mb-1">Posted on:</p>
                        <p className="text-sm font-medium text-[#000000]">{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        size="sm" 
                        onClick={() => router.push(`/institution/internships/${item.id}`)}
                        className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-md px-6"
                      >
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
                    className="text-center py-4 text-sm text-[#6A6A6A]"
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


