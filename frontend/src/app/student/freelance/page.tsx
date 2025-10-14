'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Search } from 'lucide-react'

export default function StudentFreelanceList() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      try {
        const s = await api.students.me(); setStudent(s)
        const list = await api.freelance.getVisibleProjects()
        setProjects(Array.isArray(list) ? list : [])
      } catch (e: any) { setError(e.message || 'Failed to load') }
      finally { setLoading(false) }
    }
    init()
  }, [router])

  const filtered = projects.filter((p) => {
    const q = search.trim().toLowerCase()
    if (q) {
      const inTitle = p.title?.toLowerCase().includes(q)
      const inDesc = p.description?.toLowerCase().includes(q)
      const inSkills = (p.required_skills || []).some((s: string) => (s || '').toLowerCase().includes(q))
      const inCorp = p.corporate?.name?.toLowerCase().includes(q)
      if (!inTitle && !inDesc && !inSkills && !inCorp) return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading freelancing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] backdrop-blur-sm sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-white">Browse Freelance</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} student={student} userType="student" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
        
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-[#000000] mb-6">Browse Freelance</h1>
        
        {/* Search Bar */}
        <div className="mb-8 max-w-2xl">
          <div className="relative">
            <Input 
              placeholder="Search by title, corporate, skills, or keyword..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 bg-white border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:border-[#008260] shadow-sm text-base pr-10"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6A6A6A] pointer-events-none" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <svg className="w-20 h-20 mx-auto text-[#008260]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#000000] mb-2">No Projects Found</h3>
            <p className="text-[#6A6A6A] text-base max-w-md mx-auto">
              We couldn't find any freelance projects matching your search. Try adjusting your search terms or check back later for new opportunities.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => (
              <Card key={p.id} className="bg-white border border-[#DCDCDC] hover:border-[#008260] transition-colors group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-xl font-bold text-[#000000] group-hover:text-[#008260] transition-colors">
                      {p.title}
                    </h3>
                    <Badge className="bg-[#FFF2E5] text-[#FF6B00] hover:bg-[#FFE5CC] border-none font-medium shrink-0">
                      Open
                    </Badge>
                  </div>

                 

                  <p className="text-sm text-[#000000] mb-4 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>

                  <div className="flex items-center gap-28 mb-4">
                    <div>
                      <div className="text-xs text-[#C91B1B] font-medium">Deadline:</div>
                      <div className="text-sm font-semibold text-[#000000]">
                        {p.deadline 
                          ? new Date(p.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Not specified'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-[#717171]">Budget:</div>
                      <div className="text-sm font-semibold text-[#008260]">
                        {p.budget_min && p.budget_max 
                          ? `₹${p.budget_min}-₹${p.budget_max}/month`
                          : p.budget_min 
                          ? `₹${p.budget_min}/month`
                          : 'Negotiable'}
                      </div>
                    </div>
                  </div>

                  {(p.required_skills || []).length > 0 && (
                    <div className="">
                      <div className="text-xs text-[#717171] font-medium mb-1">Required Skills:</div>
                      <div className="text-sm text-[#000000]">
                        {(p.required_skills || []).join(', ')}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end">
                    <Button 
                      onClick={() => router.push(`/student/freelance/${p.id}`)} 
                      className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-full px-6 font-medium"
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


