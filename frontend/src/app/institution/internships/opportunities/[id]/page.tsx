'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function InternshipDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [internship, setInternship] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        const inst = await api.institutions.getByUserId(user.id)
        if (!inst) { router.push('/institution/profile-setup'); return }
        setInstitution(inst)
        const data = await api.internships.getById(id)
        if (data?.error) throw new Error(data.error)
        setInternship(data)
      } catch (e: any) {
        setError(e.message || 'Failed to load internship')
      } finally {
        setLoading(false)
      }
    }
    if (id) init()
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading internship...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Internship Details</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} institution={institution} userType="institution" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
        {!internship ? (
          <div className="text-center text-slate-600">Internship not found</div>
        ) : (
          <Card className="bg-white border-2 border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">{internship.title}</CardTitle>
              <CardDescription className="text-slate-600">{internship.corporate?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-slate-700">{internship.responsibilities}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-slate-500">Work mode:</span> <span className="font-medium text-slate-900">{internship.work_mode}</span></div>
                <div><span className="text-slate-500">Engagement:</span> <span className="font-medium text-slate-900">{internship.engagement}</span></div>
                <div><span className="text-slate-500">Openings:</span> <span className="font-medium text-slate-900">{internship.openings}</span></div>
                <div><span className="text-slate-500">Duration:</span> <span className="font-medium text-slate-900">{internship.duration_value} {internship.duration_unit}</span></div>
                <div><span className="text-slate-500">Stipend:</span> <span className="font-medium text-slate-900">{internship.paid ? `₹${internship.stipend_min}${internship.stipend_max ? ' - ₹' + internship.stipend_max : ''}/month` : 'Unpaid'}</span></div>
              </div>
              {Array.isArray(internship.perks) && internship.perks.length > 0 && (
                <div>
                  <div className="text-sm text-slate-500">Perks</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {internship.perks.map((perk: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs bg-slate-100 text-slate-700">{perk}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white" onClick={() => {/* apply flow later */}}>Apply</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


