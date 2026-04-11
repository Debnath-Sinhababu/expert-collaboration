'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Logo from '@/components/Logo'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Building2, MapPin, Search, Shield, ArrowRight } from 'lucide-react'

type InstitutionRow = {
  id: string
  name?: string
  city?: string
  state?: string
  type?: string
  logo_url?: string
}

export default function SuperAdminHome() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([])
  const [sessionUser, setSessionUser] = useState<any>(null)

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

  useEffect(() => {
    if (loading) return
    const load = async () => {
      try {
        const res = await api.institutions.getAll({ page: 1, limit: 500, search: search.trim() || undefined })
        const list = Array.isArray(res) ? res : (res as any)?.data || []
        setInstitutions(list)
      } catch (e) {
        console.error(e)
        setInstitutions([])
      }
    }
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [loading, search])

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
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] sticky top-0 z-50 shadow-sm">
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
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Institutions
          </h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Open an institution workspace to manage requirements, applications, and collaborations on their behalf.
          </p>
        </div>

        <Card className="border border-slate-200/80 shadow-md bg-white/95 backdrop-blur-sm mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-900">Search</CardTitle>
            <CardDescription>Filter by institution name</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search institutions..."
                className="pl-10 bg-[#F8FAFF] border-slate-200"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutions.map((inst) => (
            <Card
              key={inst.id}
              className="border border-slate-200/80 shadow-md hover:shadow-lg transition-shadow bg-white/95 overflow-hidden group"
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
          ))}
        </div>

        {institutions.length === 0 && (
          <Card className="border-dashed border-slate-300 bg-white/60">
            <CardContent className="py-12 text-center text-slate-600">
              No institutions match your search.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
