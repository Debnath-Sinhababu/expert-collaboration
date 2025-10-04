'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'

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
    if (!q) return true
    const inTitle = p.title?.toLowerCase().includes(q)
    const inDesc = p.description?.toLowerCase().includes(q)
    const inSkills = (p.required_skills || []).some((s: string) => (s || '').toLowerCase().includes(q))
    const inCorp = p.corporate?.name?.toLowerCase().includes(q)
    return inTitle || inDesc || inSkills || inCorp
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading freelancing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Freelancing</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} student={student} userType="student" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6 mb-8">
          <div className="text-sm text-slate-700 mb-1">Search Freelance Projects</div>
          <Input placeholder="Title, skills, company..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <Card className="bg-white border-2 border-slate-200"><CardContent className="p-6 text-slate-600">No projects found.</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => (
              <Card key={p.id} className="bg-white border-2 border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8"><AvatarImage src={p.corporate?.logo_url || ''} /><AvatarFallback>{(p.corporate?.name || 'C').charAt(0)}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{p.title}</div>
                          <div className="text-xs text-slate-600 truncate">{p.corporate?.name}{p.corporate?.city ? ` · ${p.corporate.city}` : ''}</div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-700 mt-2 line-clamp-2">{p.description}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(p.required_skills || []).slice(0,6).map((s: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button onClick={() => router.push(`/student/freelance/${p.id}`)} className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">View</Button>
                    </div>
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


