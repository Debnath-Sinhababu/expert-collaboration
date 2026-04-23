'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, Check, User } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const PAGE_SIZE = 10

export default function InterestedExpertsPage() {
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [experts, setExperts] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.experts.getAll({ page, limit: PAGE_SIZE, interested: true })
      const list = Array.isArray(res) ? res : (res as any)?.data || []
      setExperts(list)
      setHasMore(list.length === PAGE_SIZE)
    } catch (e) {
      console.error(e)
      setExperts([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const verify = async (id: string, calxbook_verified: boolean) => {
    try {
      await api.experts.setCalxbookVisibility(id, !calxbook_verified)
      toast.success(`Expert ${calxbook_verified ? 'marked as not visible' : 'marked as visible'} on Calxbook`)
      load()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to verify')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8EEF9] via-[#ECF2FF] to-[#E8EEF9]">
      <header className="bg-[#008260] sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <h2 className="text-white text-lg font-semibold">Interested Experts</h2>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm px-5 py-6 sm:px-8 sm:py-8 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Experts Interested in Selling Courses / Services</h1>
              <p className="mt-1 text-sm text-slate-600">Review experts who indicated interest and verify their course/service details.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading && experts.length === 0 && <div className="col-span-full text-center text-slate-500 py-8">Loading…</div>}
          {!loading && experts.length === 0 && <div className="col-span-full text-center text-slate-500 py-8">No interested experts found.</div>}
          {experts.map((ex) => (
            <Card key={ex.id} className="border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow bg-white/95 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#008260]/10 text-[#008260]">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base leading-snug text-slate-900 line-clamp-2">{ex.name || 'Unnamed expert'}</CardTitle>
                    {ex.domain_expertise && ex.domain_expertise.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">{ex.domain_expertise[0]}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="text-sm text-slate-700">
                  <strong>Services</strong>
                  <div className="mt-2">
                    <div className="text-sm text-slate-800">{ex.expert_services && ex.expert_services.length ? ex.expert_services.join(', ') : '—'}</div>
                    {ex.service_price !== undefined && ex.service_price !== null && (
                      <div className="mt-1 text-slate-900 font-semibold">Price: ₹{ex.service_price}</div>
                    )}
                  </div>
                </div>

                {ex.course_video_url && (
                  <div>
                    <video controls src={ex.course_video_url} className="w-full rounded-md" />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button onClick={() => verify(ex.id, ex.calxbook_verified)} className={`${!ex.calxbook_verified ? 'bg-[#008260]' : 'bg-red-500 hover:bg-red-700'} text-white`} size="sm">
                    <Check className="mr-2"/>
                    {!ex.calxbook_verified ? 'Verify' : 'Unverify'}
                  </Button>
                  <Link href={`/superadmin/experts/${ex.id}/home`} className="ml-auto text-sm text-slate-600 hover:underline">Open workspace</Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end">
          <div className="flex gap-2">
            <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} variant="outline">Prev</Button>
            <Button onClick={() => setPage((p) => p + 1)} disabled={!hasMore} variant="outline">Next</Button>
          </div>
        </div>
      </main>
    </div>
  )
}
