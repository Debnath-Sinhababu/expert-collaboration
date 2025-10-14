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
      <div className="min-h-screen bg-[#E8F3F1] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#E8F3F1] min-h-screen">
      <header className="bg-[#008260] backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/institution/home" className="flex items-center space-x-2 group">
              <span className="text-xl font-bold text-white">CalXMap</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/institution/home" className="text-white hover:text-white/80 transition-colors">Home</Link>
            
          
              <NotificationBell />
              <ProfileDropdown user={user} institution={institution} userType="institution" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-6xl py-8">
        <h1 className="text-3xl font-bold text-[#000000] mb-6">Choose Institution</h1>
        
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#DCDCDC] p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-[#000000] mb-2 block">Search Institutions</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A6A] h-4 w-4" />
                <Input className="pl-10 border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:border-[#008260]" placeholder="Titles, responsibilities" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-[#000000] mb-2 block">Institution Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="border-[#DCDCDC] focus:ring-[#008260] focus:border-[#008260]"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {['University','College','Research Institute','Technical Institute','Business School','Medical College','Engineering College','Arts & Science College','Community College','Training Institute','Other'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-end gap-3">
              <Button variant="outline" onClick={() => { setSelectedInstitutionIds([]) }} className="border-[#DCDCDC] text-[#000000] hover:bg-slate-50">Clear Selection</Button>
              <Button className="bg-[#008260] hover:bg-[#006B4F] text-white" onClick={finish}>
                {selectedInstitutionIds.length > 0 
                  ? `Publish (${selectedInstitutionIds.length})` 
                  : 'Publish All'}
              </Button>
            </div>
          </div>
        </div>

        {/* Institutions List */}
        <div className="space-y-4">
          {listLoading && institutions.length === 0 ? (
            <div className="text-center py-12 text-[#6A6A6A]">Loading institutions...</div>
          ) : (
            institutions.map((inst: any) => {
              const selected = selectedInstitutionIds.includes(inst.id)
              return (
                <div key={inst.id} className={`bg-white rounded-2xl border transition-all duration-300 ${selected ? 'border-[#008260] shadow-sm' : 'border-[#DCDCDC]'} p-5 hover:shadow-md`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <Avatar className="h-14 w-14 flex-shrink-0 bg-[#E0E0E0]">
                        <AvatarImage src={inst.logo_url || ''} />
                        <AvatarFallback className="bg-[#E0E0E0] text-[#6A6A6A] text-lg">{(inst.name || 'I').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[#000000] text-lg mb-1">{inst.name}</div>
                        <div className="text-sm text-[#6A6A6A]">{inst.type} • {inst.city}{inst.state ? `, ${inst.state}` : ''}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSelect(inst.id)}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selected 
                          ? 'border-[#008260] bg-[#008260]' 
                          : 'border-[#DCDCDC] bg-white hover:border-[#008260]'
                      }`}
                    >
                      {selected && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
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


