'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePagination } from '@/hooks/usePagination'
import { Search } from 'lucide-react'

export default function SelectInstitutionsForInternship() {
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedInstitutionIds, setSelectedInstitutionIds] = useState<string[]>([])
  const router = useRouter()

  // Guard and preload
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        const inst = await api.institutions.getByUserId(user.id)
        if (!inst) { router.push('/institution/profile-setup'); return }
        if ((inst.type || '').toLowerCase() !== 'corporate') { router.push('/institution/home'); return }
        setInstitution(inst)
      } catch (e: any) {
        setError(e.message || 'Failed to load context')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  // Institutions list
  const { data: institutions, loading: listLoading, hasMore, loadMore } = usePagination(
    async (page: number) => {
      const params: any = { page, limit: 12, exclude_type: 'Corporate' }
      if (search) params.search = search
      if (selectedType && selectedType !== 'all') params.type = selectedType
      const res = await api.institutions.getAll(params)
      return Array.isArray(res) ? res : (res?.data || [])
    },
    [search, selectedType]
  )

  const toggleSelect = (id: string) => {
    setSelectedInstitutionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const finish = async () => {
    try {
      const raw = localStorage.getItem('internship_create_payload')
      if (!raw) { setError('No internship data found. Please restart creation.'); return }
      const payload = JSON.parse(raw)
      if (selectedInstitutionIds.length > 0) {
        payload.selected_institution_ids = selectedInstitutionIds
      }
      const created = await api.internships.create(payload)
      localStorage.removeItem('internship_create_payload')
      router.push('/institution/home')
    } catch (e: any) {
      setError(e.message || 'Failed to create internship')
    }
  }

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
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/institution/home" className="flex items-center space-x-2 group">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Select Institutions</span>
            </Link>
            <div className="flex items-center space-x-2">
              <NotificationBell />
              <ProfileDropdown user={user} institution={institution} userType="institution" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-6xl py-8">
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-slate-700 mb-1">Search Institutions</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input className="pl-10" placeholder="Name, city, state" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-700 mb-1">Institution Type</div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {['University','College','Research Institute','Technical Institute','Business School','Medical College','Engineering College','Arts & Science College','Community College','Training Institute','Other'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button variant="outline" onClick={() => { setSelectedInstitutionIds([]) }}>Clear Selection</Button>
              <Button className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white" onClick={finish}>
                {selectedInstitutionIds.length > 0 
                  ? `Publish (${selectedInstitutionIds.length})` 
                  : 'Publish All'}
              </Button>
            </div>
          </div>
        </div>

        {/* Institutions List */}
        <div className="space-y-3">
          {listLoading && institutions.length === 0 ? (
            <div className="text-center py-12 text-slate-600">Loading institutions...</div>
          ) : (
            institutions.map((inst: any) => {
              const selected = selectedInstitutionIds.includes(inst.id)
              return (
                <Card key={inst.id} className={`hover:shadow-md transition-all duration-300 border-2 ${selected ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200'} bg-white`}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={inst.logo_url || ''} />
                        <AvatarFallback>{(inst.name || 'I').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{inst.name}</div>
                        <div className="text-sm text-slate-600 truncate">{inst.type} · {inst.city}{inst.state ? `, ${inst.state}` : ''}</div>
                      </div>
                    </div>
                    <Button
                      variant={selected ? 'default' : 'outline'}
                      className={selected ? '' : 'border-slate-300'}
                      onClick={() => toggleSelect(inst.id)}
                    >
                      {selected ? 'Selected' : 'Select'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })
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


