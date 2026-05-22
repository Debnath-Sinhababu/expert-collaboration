'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ProfileCardDeleteMenu } from '@/components/superadmin/ProfileCardDeleteMenu'
import {
  Building2,
  MapPin,
  Search,
  Shield,
  ArrowRight,
  User,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from 'lucide-react'
import { toast } from 'sonner'

const PAGE_SIZE = 12

function parseListPayload(raw: unknown): { rows: Record<string, unknown>[]; apiError?: string } {
  if (Array.isArray(raw)) return { rows: raw as Record<string, unknown>[] }
  if (raw && typeof raw === 'object' && 'error' in raw && typeof (raw as { error: unknown }).error === 'string') {
    return { rows: [], apiError: (raw as { error: string }).error }
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return { rows: (raw as { data: Record<string, unknown>[] }).data }
  }
  return { rows: [] }
}

type InstitutionRow = {
  id: string
  name?: string
  city?: string
  state?: string
  type?: string
  logo_url?: string
  email?: string
}

type ExpertRow = {
  id: string
  name?: string
  city?: string
  state?: string
  domain_expertise?: string[]
  rating?: number
  email?: string
}

type StudentRow = {
  id: string
  name?: string
  email?: string
  degree?: string
  city?: string
  state?: string
  institutions?: { name?: string; city?: string; state?: string } | null
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
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100">
      <p className="text-sm text-slate-600">
        {loading
          ? 'Loading directory…'
          : empty && page <= 1
            ? 'No profiles on page 1. Refine search or create a profile.'
            : `Showing page ${page} (${PAGE_SIZE} per page)`}
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

type TabKey = 'experts' | 'institutions' | 'students'

export default function SuperAdminHome() {
  const [activeTab, setActiveTab] = useState<TabKey>('experts')

  const [institutionSearch, setInstitutionSearch] = useState('')
  const [debouncedInstSearch, setDebouncedInstSearch] = useState('')
  const [expertSearch, setExpertSearch] = useState('')
  const [debouncedExpertSearch, setDebouncedExpertSearch] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState('')

  const [instPage, setInstPage] = useState(1)
  const [expertPage, setExpertPage] = useState(1)
  const [studentPage, setStudentPage] = useState(1)

  const [institutions, setInstitutions] = useState<InstitutionRow[]>([])
  const [experts, setExperts] = useState<ExpertRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])

  const [instLoading, setInstLoading] = useState(false)
  const [expertLoading, setExpertLoading] = useState(false)
  const [studentLoading, setStudentLoading] = useState(false)

  const [instHasMore, setInstHasMore] = useState(false)
  const [expertHasMore, setExpertHasMore] = useState(false)
  const [studentHasMore, setStudentHasMore] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<{
    kind: TabKey
    id: string
    label: string
  } | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedInstSearch(institutionSearch), 400)
    return () => clearTimeout(t)
  }, [institutionSearch])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedExpertSearch(expertSearch), 400)
    return () => clearTimeout(t)
  }, [expertSearch])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedStudentSearch(studentSearch), 400)
    return () => clearTimeout(t)
  }, [studentSearch])

  useEffect(() => {
    setInstPage(1)
  }, [debouncedInstSearch])

  useEffect(() => {
    setExpertPage(1)
  }, [debouncedExpertSearch])

  useEffect(() => {
    setStudentPage(1)
  }, [debouncedStudentSearch])

  const loadInstitutions = useCallback(async () => {
    if (activeTab !== 'institutions') return
    setInstLoading(true)
    try {
      const res = await api.institutions.getAll({
        page: instPage,
        limit: PAGE_SIZE,
        search: debouncedInstSearch.trim() || undefined,
      })
      const { rows, apiError } = parseListPayload(res)
      if (apiError) {
        toast.error(apiError)
        setInstitutions([])
        setInstHasMore(false)
        return
      }
      setInstitutions(rows as InstitutionRow[])
      setInstHasMore(rows.length === PAGE_SIZE)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to load institutions')
      setInstitutions([])
      setInstHasMore(false)
    } finally {
      setInstLoading(false)
    }
  }, [activeTab, instPage, debouncedInstSearch])

  const loadExperts = useCallback(async () => {
    if (activeTab !== 'experts') return
    setExpertLoading(true)
    try {
      const res = await api.experts.getAll({
        page: expertPage,
        limit: PAGE_SIZE,
        search: debouncedExpertSearch.trim() || undefined,
      })
      const { rows, apiError } = parseListPayload(res)
      if (apiError) {
        toast.error(apiError)
        setExperts([])
        setExpertHasMore(false)
        return
      }
      setExperts(rows as ExpertRow[])
      setExpertHasMore(rows.length === PAGE_SIZE)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to load experts')
      setExperts([])
      setExpertHasMore(false)
    } finally {
      setExpertLoading(false)
    }
  }, [activeTab, expertPage, debouncedExpertSearch])

  const loadStudents = useCallback(async () => {
    if (activeTab !== 'students') return
    setStudentLoading(true)
    try {
      const res = await api.students.getAll({
        page: studentPage,
        limit: PAGE_SIZE,
        search: debouncedStudentSearch.trim() || undefined,
      })
      const { rows, apiError } = parseListPayload(res)
      if (apiError) {
        toast.error(apiError)
        setStudents([])
        setStudentHasMore(false)
        return
      }
      setStudents(rows as StudentRow[])
      setStudentHasMore(rows.length === PAGE_SIZE)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to load students')
      setStudents([])
      setStudentHasMore(false)
    } finally {
      setStudentLoading(false)
    }
  }, [activeTab, studentPage, debouncedStudentSearch])

  useEffect(() => {
    loadInstitutions()
  }, [loadInstitutions])

  useEffect(() => {
    loadExperts()
  }, [loadExperts])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    const kind = deleteTarget.kind
    try {
      if (kind === 'experts') {
        await api.superadmin.deleteExpert(deleteTarget.id)
      } else if (kind === 'institutions') {
        await api.superadmin.deleteInstitution(deleteTarget.id)
      } else {
        await api.superadmin.deleteStudent(deleteTarget.id)
      }
      toast.success('Profile deleted permanently')
      setDeleteTarget(null)
      if (kind === 'experts') await loadExperts()
      else if (kind === 'institutions') await loadInstitutions()
      else await loadStudents()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Delete failed'
      toast.error(message)
    } finally {
      setDeleteBusy(false)
    }
  }

  function emptyMessage(tab: TabKey) {
    const hasSearch =
      (tab === 'experts' && !!debouncedExpertSearch.trim()) ||
      (tab === 'institutions' && !!debouncedInstSearch.trim()) ||
      (tab === 'students' && !!debouncedStudentSearch.trim())
    if (tab === 'experts') {
      return hasSearch ? 'No experts match your search.' : 'No experts yet.'
    }
    if (tab === 'institutions') {
      return hasSearch ? 'No institutions match your search.' : 'No institutions yet.'
    }
    return hasSearch ? 'No students match your search.' : 'No students yet.'
  }

  return (
    <>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-14">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm px-5 py-6 sm:px-8 sm:py-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#008260]/10 text-[#006b4f] px-3 py-1 text-xs font-semibold mb-3">
                <Shield className="h-3.5 w-3.5" />
                Super-admin directory
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Profiles & workspaces
              </h1>
              <p className="mt-2 text-slate-600 max-w-2xl text-sm sm:text-base leading-relaxed">
                Browse experts, institutions, and students. Open a workspace where available.
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3 bg-white/90 border border-slate-200/90 p-1 h-auto">
            <TabsTrigger value="experts" className="gap-2 data-[state=active]:bg-[#008260] data-[state=active]:text-white">
              <User className="h-4 w-4" />
              Experts
            </TabsTrigger>
            <TabsTrigger value="institutions" className="gap-2 data-[state=active]:bg-[#008260] data-[state=active]:text-white">
              <Building2 className="h-4 w-4" />
              Institutions
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2 data-[state=active]:bg-[#008260] data-[state=active]:text-white">
              <GraduationCap className="h-4 w-4" />
              Students
            </TabsTrigger>
          </TabsList>

          <TabsContent value="experts" className="space-y-4 mt-0">
            <Card className="border border-slate-200/90 shadow-sm bg-white/95">
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-h-[140px]">
              {expertLoading && experts.length === 0 ? (
                <div className="col-span-full flex justify-center py-12 text-slate-500 text-sm">
                  Loading experts…
                </div>
              ) : (
                experts.map((ex) => (
                  <Card
                    key={ex.id}
                    className="border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden group relative"
                  >
                    <ProfileCardDeleteMenu
                      kind="experts"
                      id={ex.id}
                      label={ex.name || ex.email || ex.id}
                      onDelete={setDeleteTarget}
                    />
                    <CardHeader className="pb-2 pr-12">
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
                          {ex.email && (
                            <p className="text-xs text-slate-500 mt-1 truncate">{ex.email}</p>
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
              <Card className="border-dashed border-slate-300 bg-white/60">
                <CardContent className="py-10 text-center text-slate-600 text-sm">
                  {emptyMessage('experts')}
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
          </TabsContent>

          <TabsContent value="institutions" className="space-y-4 mt-0">
            <Card className="border border-slate-200/90 shadow-sm bg-white/95">
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-h-[140px]">
              {instLoading && institutions.length === 0 ? (
                <div className="col-span-full flex justify-center py-12 text-slate-500 text-sm">
                  Loading institutions…
                </div>
              ) : (
                institutions.map((inst) => (
                  <Card
                    key={inst.id}
                    className="border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden group relative"
                  >
                    <ProfileCardDeleteMenu
                      kind="institutions"
                      id={inst.id}
                      label={inst.name || inst.email || inst.id}
                      onDelete={setDeleteTarget}
                    />
                    <CardHeader className="pb-2 pr-12">
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
                          {inst.email && (
                            <p className="text-xs text-slate-500 mt-1 truncate">{inst.email}</p>
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
                  {emptyMessage('institutions')}
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
          </TabsContent>

          <TabsContent value="students" className="space-y-4 mt-0">
            <Card className="border border-slate-200/90 shadow-sm bg-white/95">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-900">Search</CardTitle>
                <CardDescription>Filter by name, email, or degree</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search students..."
                    className="pl-10 bg-[#F8FAFF] border-slate-200"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-h-[140px]">
              {studentLoading && students.length === 0 ? (
                <div className="col-span-full flex justify-center py-12 text-slate-500 text-sm">
                  Loading students…
                </div>
              ) : (
                students.map((st) => (
                  <Card
                    key={st.id}
                    className="border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden group relative"
                  >
                    <ProfileCardDeleteMenu
                      kind="students"
                      id={st.id}
                      label={st.name || st.email || st.id}
                      onDelete={setDeleteTarget}
                    />
                    <CardHeader className="pb-2 pr-12">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#008260]/10 text-[#008260]">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base leading-snug text-slate-900 line-clamp-2">
                            {st.name || 'Unnamed student'}
                          </CardTitle>
                          {st.degree && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{st.degree}</p>
                          )}
                          {st.email && (
                            <p className="text-xs text-slate-500 mt-1 truncate">{st.email}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 text-sm text-slate-600">
                      {st.institutions?.name && (
                        <p className="line-clamp-2">
                          <span className="text-slate-500">Institution: </span>
                          {st.institutions.name}
                        </p>
                      )}
                      {(st.city || st.state) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-[#008260]" />
                          <span className="line-clamp-1">
                            {[st.city, st.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {!studentLoading && students.length === 0 && (
              <Card className="border-dashed border-slate-300 bg-white/60">
                <CardContent className="py-10 text-center text-slate-600 text-sm">
                  {emptyMessage('students')}
                </CardContent>
              </Card>
            )}

            <PaginationBar
              page={studentPage}
              hasMore={studentHasMore}
              loading={studentLoading}
              empty={students.length === 0}
              onPrev={() => setStudentPage((p) => Math.max(1, p - 1))}
              onNext={() => setStudentPage((p) => p + 1)}
            />
          </TabsContent>
        </Tabs>
    </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleteBusy && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete profile permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.label}</strong> from the database.
              This cannot be undone. If the profile is linked to projects or applications, deletion may fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
            >
              {deleteBusy ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
</>
  )
}
