'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Send, AlertCircle } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export default function StudentInternshipDetail() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [internship, setInternship] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasApplied, setHasApplied] = useState(false)
  const [applyStatus, setApplyStatus] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        try { setStudent(await api.students.me()) } catch {}
        const data = await api.internships.getById(id)
        if (data?.error) throw new Error(data.error)
        setInternship(data)
        try {
          const st = await api.internshipApplications.status(id)
          setHasApplied(!!st.applied)
          setApplyStatus(st.status || null)
        } catch {}
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
            <ProfileDropdown user={user} student={student} userType="student" />
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
              <div className="border-t pt-6">
                {hasApplied ? (
                  <div className="text-center sm:text-left">
                    <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white" disabled>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Applied
                    </Button>
                  </div>
                ) : (
                  <div className="text-center sm:text-left">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
                          <Send className="h-4 w-4 mr-2" />
                          Apply Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-white border-2 border-slate-200 shadow-xl">
                        <DialogHeader className="space-y-3">
                          <DialogTitle className="text-xl font-bold text-slate-900">Apply to Internship</DialogTitle>
                          <DialogDescription className="text-slate-600">
                            Submit your application for "{internship.title}". Cover letter is optional.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className="space-y-2">
                            <label htmlFor="coverLetter" className="text-sm font-medium text-slate-700">Cover Letter (optional)</label>
                            <Textarea
                              id="coverLetter"
                              placeholder="Share a brief note if you like..."
                              value={coverLetter}
                              onChange={(e) => setCoverLetter(e.target.value)}
                              rows={4}
                              className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                            />
                          </div>
                          {error && (
                            <Alert variant="destructive" className="border-2 border-red-200 bg-red-50">
                              <AlertDescription className="text-red-700">{error}</AlertDescription>
                            </Alert>
                          )}
                          <Button 
                            onClick={async () => {
                              try {
                                setIsApplying(true)
                                await api.internshipApplications.create({ internship_id: id, cover_letter: coverLetter || undefined })
                                setHasApplied(true)
                              } catch (e: any) {
                                setError(e.message || 'Failed to apply')
                              } finally {
                                setIsApplying(false)
                              }
                            }}
                            className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white"
                            disabled={isApplying}
                          >
                            {isApplying ? 'Submitting...' : 'Submit Application'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


