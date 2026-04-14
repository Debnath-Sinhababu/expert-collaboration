'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Logo from '@/components/Logo'
import ProfileDropdown from '@/components/ProfileDropdown'
import {
  Building2,
  MapPin,
  Search,
  Shield,
  ArrowRight,
  User,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react'

const PAGE_SIZE = 10

type InstitutionRow = {
  id: string
  name?: string
  city?: string
  state?: string
  type?: string
  logo_url?: string
}

type ExpertRow = {
  id: string
  name?: string
  city?: string
  state?: string
  domain_expertise?: string[]
  rating?: number
}

function PaginationBar(props: {
  page: number
  hasMore: boolean
  loading: boolean
  onPrev: () => void
  onNext: () => void
  empty: boolean
}) {
  const { page, hasMore, loading, onPrev, onNext, empty } = props
  if (empty && page === 1 && !loading) return null
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100">
      <p className="text-sm text-slate-500">
        {loading ? 'Loading…' : empty ? 'No results' : `Page ${page}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-200"
          disabled={loading || page <= 1}
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-200"
          disabled={loading || !hasMore}
          onClick={onNext}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

export default function SuperAdminHome() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [institutionSearch, setInstitutionSearch] = useState('')
  const [debouncedInstSearch, setDebouncedInstSearch] = useState('')
  const [expertSearch, setExpertSearch] = useState('')
  const [debouncedExpertSearch, setDebouncedExpertSearch] = useState('')

  const [instPage, setInstPage] = useState(1)
  const [expertPage, setExpertPage] = useState(1)

  const [institutions, setInstitutions] = useState<InstitutionRow[]>([])
  const [experts, setExperts] = useState<ExpertRow[]>([])
  const [instLoading, setInstLoading] = useState(false)
  const [expertLoading, setExpertLoading] = useState(false)
  const [instHasMore, setInstHasMore] = useState(false)
  const [expertHasMore, setExpertHasMore] = useState(false)

  const [sessionUser, setSessionUser] = useState<any>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedInstSearch(institutionSearch), 300)
    return () => clearTimeout(t)
  }, [institutionSearch])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedExpertSearch(expertSearch), 300)
    return () => clearTimeout(t)
  }, [expertSearch])

  useEffect(() => {
    setInstPage(1)
  }, [debouncedInstSearch])

  useEffect(() => {
    setExpertPage(1)
  }, [debouncedExpertSearch])

  useEffect(() => {
    const gate = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      const role = user.user_metadata?.role
      if (role !== 'super_admin') {
        router.push('/')
        return
      }
      setSessionUser(user)
      setLoading(false)
    }
    gate()
  }, [router])

  const loadInstitutions = useCallback(async () => {
    if (loading) return
    setInstLoading(true)
    try {
      const res = await api.institutions.getAll({
        page: instPage,
        limit: PAGE_SIZE,
        search: debouncedInstSearch.trim() || undefined,
      })
      const list = Array.isArray(res) ? res : (res as any)?.data || []
      setInstitutions(list)
      setInstHasMore(list.length === PAGE_SIZE)
    } catch (e) {
      console.error(e)
      setInstitutions([])
      setInstHasMore(false)
    } finally {
      setInstLoading(false)
    }
  }, [loading, instPage, debouncedInstSearch])

  const loadExperts = useCallback(async () => {
    if (loading) return
    setExpertLoading(true)
    try {
      const res = await api.experts.getAll({
        page: expertPage,
        limit: PAGE_SIZE,
        search: debouncedExpertSearch.trim() || undefined,
      })
      const list = Array.isArray(res) ? res : (res as any)?.data || []
      setExperts(list)
      setExpertHasMore(list.length === PAGE_SIZE)
    } catch (e) {
      console.error(e)
      setExperts([])
      setExpertHasMore(false)
    } finally {
      setExpertLoading(false)
    }
  }, [loading, expertPage, debouncedExpertSearch])

  useEffect(() => {
    loadInstitutions()
  }, [loadInstitutions])

  useEffect(() => {
    loadExperts()
  }, [loadExperts])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4" />
          <p className="text-[#6A6A6A]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8EEF9] via-[#ECF2FF] to-[#E8EEF9]">
      <header className="bg-[#008260] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/superadmin/home" className="flex items-center gap-2 group">
              <Logo size="header" />
              <span className="hidden sm:inline text-white/90 text-sm font-medium border-l border-white/30 pl-3">
                Super Admin
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-white/90 text-xs font-medium bg-white/10 rounded-full px-3 py-1">
                <Shield className="h-3.5 w-3.5" />
                Elevated access
              </div>
              {sessionUser && (
                <ProfileDropdown user={sessionUser} userType="super_admin" />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm px-5 py-6 sm:px-8 sm:py-8 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#008260]/10 text-[#006b4f] px-3 py-1 text-xs font-semibold mb-3">
                <LayoutGrid className="h-3.5 w-3.5" />
                Admin console
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Workspaces
              </h1>
              <p className="mt-2 text-slate-600 max-w-2xl text-sm sm:text-base leading-relaxed">
                Open an institution or expert workspace to act on their behalf.
              </p>
            </div>
          </div>
        </div>

        {/* Institutions */}
        <section className="mb-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#008260]/15 text-[#008260]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Institutions</h2>
              <p className="text-sm text-slate-600">
                Requirements, applications, and collaborations
              </p>
            </div>
          </div>

          <Card className="border border-slate-200/90 shadow-sm bg-white/95 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900">Search</CardTitle>
              <CardDescription>Filter by name, city, or state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={institutionSearch}
                  onChange={(e) => setInstitutionSearch(e.target.value)}
                  placeholder="Search institutions..."
                  className="pl-10 bg-[#F8FAFF] border-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-h-[120px]">
            {instLoading && institutions.length === 0 ? (
              <div className="col-span-full flex justify-center py-12 text-slate-500 text-sm">
                Loading institutions…
              </div>
            ) : (
              institutions.map((inst) => (
                <Card
                  key={inst.id}
                  className="border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#008260]/10 text-[#008260]">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base leading-snug text-slate-900 line-clamp-2">
                          {inst.name || 'Unnamed institution'}
                        </CardTitle>
                        {inst.type && (
                          <p className="text-xs text-slate-500 mt-1 capitalize">{inst.type}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {(inst.city || inst.state) && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 shrink-0 text-[#008260]" />
                        <span className="line-clamp-1">
                          {[inst.city, inst.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    <Button
                      asChild
                      className="w-full bg-[#008260] hover:bg-[#006b4f] text-white font-semibold"
                    >
                      <Link href={`/superadmin/institutions/${inst.id}/home`}>
                        Open workspace
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {!instLoading && institutions.length === 0 && (
            <Card className="border-dashed border-slate-300 bg-white/60">
              <CardContent className="py-10 text-center text-slate-600 text-sm">
                No institutions match your search.
              </CardContent>
            </Card>
          )}

          <PaginationBar
            page={instPage}
            hasMore={instHasMore}
            loading={instLoading}
            empty={institutions.length === 0}
            onPrev={() => setInstPage((p) => Math.max(1, p - 1))}
            onNext={() => setInstPage((p) => p + 1)}
          />
        </section>

        {/* Experts */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#008260]/15 text-[#008260]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Experts</h2>
              <p className="text-sm text-slate-600">
                Dashboard, profile, and applications
              </p>
            </div>
          </div>

          <Card className="border border-slate-200/90 shadow-sm bg-white/95 mb-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900">Search</CardTitle>
              <CardDescription>Filter by name or bio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={expertSearch}
                  onChange={(e) => setExpertSearch(e.target.value)}
                  placeholder="Search experts..."
                  className="pl-10 bg-[#F8FAFF] border-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-h-[120px]">
            {expertLoading && experts.length === 0 ? (
              <div className="col-span-full flex justify-center py-12 text-slate-500 text-sm">
                Loading experts…
              </div>
            ) : (
              experts.map((ex) => (
                <Card
                  key={ex.id}
                  className="border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#008260]/10 text-[#008260]">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base leading-snug text-slate-900 line-clamp-2">
                          {ex.name || 'Unnamed expert'}
                        </CardTitle>
                        {ex.domain_expertise && ex.domain_expertise[0] && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ex.domain_expertise[0]}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {(ex.city || ex.state) && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 shrink-0 text-[#008260]" />
                        <span className="line-clamp-1">
                          {[ex.city, ex.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    <Button
                      asChild
                      className="w-full bg-[#008260] hover:bg-[#006b4f] text-white font-semibold"
                    >
                      <Link href={`/superadmin/experts/${ex.id}/home`}>
                        Open workspace
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {!expertLoading && experts.length === 0 && (
            <Card className="border-dashed border-slate-300 bg-white/60 mt-2">
              <CardContent className="py-10 text-center text-slate-600 text-sm">
                No experts match your search.
              </CardContent>
            </Card>
          )}

          <PaginationBar
            page={expertPage}
            hasMore={expertHasMore}
            loading={expertLoading}
            empty={experts.length === 0}
            onPrev={() => setExpertPage((p) => Math.max(1, p - 1))}
            onNext={() => setExpertPage((p) => p + 1)}
          />
        </section>
      </main>
    </div>
  )
}
