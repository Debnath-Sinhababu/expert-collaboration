'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import Logo from '@/components/Logo'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePagination } from '@/hooks/usePagination'
import { Search, Building2, MapPin, Star, Filter } from 'lucide-react'

export default function CorporateInternshipsIndexPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [institution, setInstitution] = useState<any>(null)
  const [institutions, setInstitutions] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [selectedInstitutionIds, setSelectedInstitutionIds] = useState<string[]>([])
  const listEndRef = useState<HTMLDivElement | null>(null)[0]
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        const inst = await api.institutions.getByUserId(user.id)
        if (!inst) {
          setError('Institution profile not found. Please complete your profile setup first.')
          setLoading(false)
          return
        }
        if (inst.type !== 'Corporate') {
          setError('Internships are available only for Corporate institutions.')
        }
        setInstitution(inst)
        // No eager institution list needed; pagination will fetch as user scrolls
      } catch (e: any) {
        setError(e.message || 'Failed to load institution')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  // Pagination for institutions (mirrors expert list behavior)
  const {
    data: pagedInstitutions,
    loading: listLoading,
    hasMore,
    loadMore,
    refresh
  } = usePagination(
    async (page: number) => {
      const params: any = { page, limit: 12, exclude_type: 'Corporate' }
      if (search) params.search = search
      if (selectedType && selectedType !== 'all') params.type = selectedType
      const data = await api.institutions.getAll(params)
      const arr = Array.isArray(data) ? data : (data?.data || [])
      return arr
    },
    [search, selectedType]
  )

  // Rely on usePagination's internal refresh when dependencies change

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !listLoading) {
        loadMore()
      }
    }, { root: null, rootMargin: '200px', threshold: 0.1 })
    const el = document.getElementById('internships-list-end')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, listLoading, loadMore])

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
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header (mirrors institution home) */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/institution/internships" className="flex items-center space-x-2 group">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Corporate Internships</span>
            </Link>
            <div className="flex items-center space-x-2">
              <NotificationBell />
              <ProfileDropdown user={{}} institution={institution} userType="institution" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-6xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-3">
            <Link href="/institution/home">
              <Button variant="outline">Expert Marketplace</Button>
            </Link>
            {institution?.type === 'Corporate' && (
              <Link href="/institution/internships/create">
                <Button className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">Post Internship</Button>
              </Link>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Partnered Institutions carousel (mirrors home; excluding featured experts) */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-slate-900">Partnered Institutions</h2>
          </div>
          <Carousel
            opts={{ align: 'start' }}
            plugins={[Autoplay({ delay: 4000 })]}
            className="w-full max-w-7xl mx-auto"
          >
            <CarouselContent className="-ml-2">
              {pagedInstitutions.slice(0, 8).map((institution: any, index: number) => {
                const institutionImages = [
                  '/images/universitylogo1.jpeg',
                  '/images/universitylogo2.jpeg',
                  '/images/universitylogo3.jpeg',
                  '/images/universitylogo1.jpeg',
                  '/images/universitylogo2.jpeg'
                ]
                return (
                  <CarouselItem key={institution.id} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/2">
                    <div className="relative h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
                      <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url('${institutionImages[index % institutionImages.length]}')` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h3 className="text-white font-bold text-xl mb-2 group-hover:text-blue-200 transition-colors duration-300">
                          {institution.name}
                        </h3>
                        <p className="text-white/90 text-base mb-1">
                          {institution.type || 'Educational Institution'}
                        </p>
                        <p className="text-white/80 text-sm">
                          {[institution.city, institution.state, institution.country].filter(Boolean).join(', ') || 'India'}
                        </p>
                      </div>
                      <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  </CarouselItem>
                )
              })}
            </CarouselContent>
            <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
            <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
          </Carousel>
        </section>

        {/* Search and Filters (stacked above list to match home) */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-700 mb-1">Search Institutions</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search institutions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-700 mb-1">Institution Type</div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {['University','College','Research Institute','Technical Institute','Business School','Medical College','Engineering College','Arts & Science College','Community College','Training Institute','Other'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white" onClick={() => setShowSelectModal(true)} disabled={selectedInstitutionIds.length === 0}>
                Select Institutions ({selectedInstitutionIds.length})
              </Button>
            </div>
          </div>
        </div>

        {/* Institutions list */}
        <div className="space-y-4">
          {listLoading && pagedInstitutions.length === 0 ? (
            <div className="text-center py-12 text-slate-600">Loading institutions...</div>
          ) : (
            pagedInstitutions
              .filter((i: any) => (i.type || '').toLowerCase() !== 'corporate')
              .filter((i: any) => {
                if (selectedType !== 'all' && (i.type || '') !== selectedType) return false
                if (!search.trim()) return true
                const q = search.toLowerCase()
                return (
                  (i.name || '').toLowerCase().includes(q) ||
                  (i.city || '').toLowerCase().includes(q) ||
                  (i.state || '').toLowerCase().includes(q)
                )
              })
              .map((inst: any) => {
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
                        onClick={() => setSelectedInstitutionIds((prev) => prev.includes(inst.id) ? prev.filter(id => id !== inst.id) : [...prev, inst.id])}
                      >
                        {selected ? 'Selected' : 'Select'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })
          )}
          <div id="internships-list-end" />
        </div>

        <Dialog open={showSelectModal} onOpenChange={setShowSelectModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Institutions</DialogTitle>
              <DialogDescription>Confirm the institutions you want to target for your internship.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {pagedInstitutions.filter((i: any) => selectedInstitutionIds.includes(i.id)).map((inst: any) => (
                <div key={inst.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <div className="font-medium text-slate-900">{inst.name}</div>
                    <div className="text-sm text-slate-600">{inst.city}{inst.state ? `, ${inst.state}` : ''}</div>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedInstitutionIds(prev => prev.filter(id => id !== inst.id))}>Remove</Button>
                </div>
              ))}
              {selectedInstitutionIds.length === 0 && (
                <div className="text-center text-slate-600 py-6">No institutions selected.</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSelectModal(false)}>Close</Button>
              <Button onClick={() => { setShowSelectModal(false); toast.success('Institutions selected. Backend save will be wired next.')}} disabled={selectedInstitutionIds.length === 0}>Confirm Selection</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}


