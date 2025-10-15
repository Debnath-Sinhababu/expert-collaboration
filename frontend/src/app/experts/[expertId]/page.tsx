'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Star, Briefcase, Calendar, IndianRupee, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'

type Expert = {
  id: string
  name?: string
  email?: string
  photo_url?: string
  bio?: string
  domain_expertise?: string[]
  subskills?: string[]
  experience_years?: number
  hourly_rate?: number
}

export default function PublicExpertProfile() {
  const params = useParams()
  const router = useRouter()
  const expertId = params.expertId as string

  const [expert, setExpert] = useState<Expert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [studentFeedback, setStudentFeedback] = useState<{ student_name: string; pros: string; rating: 'VERY_GOOD' | 'GOOD' }[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await api.experts.getById(expertId)
        setExpert(data)
        // Load student feedback highlights (no expert filter per request)
        const res = await api.studentFeedback.getByExpertName('', 20)
        if (res?.success && Array.isArray(res.feedback)) {
          setStudentFeedback(res.feedback as any)
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load expert')
      } finally {
        setLoading(false)
      }
    }
    if (expertId) load()
  }, [expertId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-slate-200 bg-white">
          <CardContent className="p-6">
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error || 'Expert not found'}</AlertDescription>
            </Alert>
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Simple public header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 border-b border-blue-200/20 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center"><Logo size="header" /></Link>
          <Link href="/contact-us" className="text-white/80 hover:text-white text-sm">Contact Us</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero */}
        <Logo size="lg" className='mb-4' />
        <div className="text-center mb-8">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-slate-200">
            <AvatarImage src={expert.photo_url || ''} />
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              {expert.name?.charAt(0) || 'E'}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">{expert.name || 'Expert'}</h1>
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <div className="flex items-center space-x-0.5">
              <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
              <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
              <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
              <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
              <Star className="h-4 w-4 text-slate-300" />
            </div>
            <span className="text-slate-700 font-semibold">4+</span>
          </div>
        </div>

        {/* Core Info Card */}
        <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Expertise</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(expert.domain_expertise) && expert.domain_expertise.length > 0 ? (
                      expert.domain_expertise.map((d, i) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1">{d}</Badge>
                      ))
                    ) : (
                      <Badge variant="secondary" className="px-3 py-1">Expert</Badge>
                    )}
                  </div>
                </div>

                {Array.isArray(expert.subskills) && expert.subskills.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Subskills</p>
                    <div className="flex flex-wrap gap-2">
                      {expert.subskills.slice(0, 6).map((s, i) => (
                        <Badge key={i} variant="outline" className="px-3 py-1 text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-500 mb-1">Bio</p>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line line-clamp-6">
                    {expert.bio || 'No bio provided.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="text-slate-600">Experience</span>
                  </div>
                  <span className="font-bold text-slate-900">{expert.experience_years || 0} years</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <IndianRupee className="h-5 w-5 text-green-600" />
                    <span className="text-slate-600">Hourly Rate</span>
                  </div>
                  <span className="font-bold text-slate-900">₹{expert.hourly_rate || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Feedback Carousel */}
        {studentFeedback.length > 0 && (
          <div className="mb-8">
            <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <CardTitle className="text-slate-900 mb-4">Student Feedback</CardTitle>
                <div className="mb-2 text-slate-600 text-sm">What students loved about the sessions</div>
                <Carousel
                  opts={{ align: 'start', containScroll: 'trimSnaps' }}
                  plugins={[Autoplay({ delay: 3500 })]}
                  className="w-full max-w-5xl mx-auto"
                >
                  <CarouselContent className="-ml-2">
                    {studentFeedback.map((fb, idx) => (
                      <CarouselItem key={idx} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/3">
                        <Card className="h-full mx-2 transition-all duration-300 hover:shadow-lg border border-slate-200/50 hover:border-blue-300/50 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-blue-100/20 relative group">
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10"></div>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-3 gap-3">
                              <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-blue-600 transition-colors duration-200">{fb.student_name}</h3>
                              <span className={`${fb.rating === 'VERY_GOOD' ? 'border-green-200 bg-green-50 text-green-700' : 'border-blue-200 bg-blue-50 text-blue-700'} px-2 py-0.5 rounded-full border text-xs flex-shrink-0`}>{fb.rating === 'VERY_GOOD' ? 'Very Good' : 'Good'}</span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed line-clamp-4">{fb.pros}</p>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                  <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                </Carousel>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Minimal CTA */}
        <div className="text-center text-slate-600 text-sm">
          Looking to collaborate with {expert.name || 'this expert'}? Contact us via the Calxmap platform.
        </div>
      </main>
    </div>
  )
}


