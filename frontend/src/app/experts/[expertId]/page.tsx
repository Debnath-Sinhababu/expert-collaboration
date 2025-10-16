'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Star, Briefcase, Calendar, IndianRupee, ArrowLeft, Shield, CheckCircle } from 'lucide-react'
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
  qualifications?: string
  is_verified?: boolean
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
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260]"></div>
      </div>
    )
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-[#D6D6D6] bg-white rounded-lg">
          <CardContent className="p-6">
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error || 'Expert not found'}</AlertDescription>
            </Alert>
            <Link href="/" className="inline-flex items-center text-[#008260] hover:text-[#006d51]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-[#008260] border-b-2 border-[#006d51] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Logo size="header" />
            </Link>
            <Link href="/contact-us" className="text-white hover:text-white/80 transition-colors text-sm sm:text-base">
              Contact Us
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <Avatar className="w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-4 border-4 border-white shadow-lg">
            <AvatarImage src={expert.photo_url || ''} />
            <AvatarFallback className="text-3xl sm:text-4xl font-bold bg-slate-400 text-white">
              {expert.name?.charAt(0) || 'E'}
            </AvatarFallback>
          </Avatar>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">{expert.name || 'Expert'}</h1>
          
          {/* Rating Stars */}
          <div className="flex items-center justify-center gap-1 mb-3">
            <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
            <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
            <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
            <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
            <Star className="h-5 w-5 text-slate-300" fill="currentColor" />
            <span className="ml-2 text-lg font-semibold text-slate-900">4.8</span>
          </div>
          
          {/* Verified Badge */}
          {expert.is_verified && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-[#008260]">
              <CheckCircle className="h-4 w-4 text-[#008260]" />
              <span className="text-sm text-[#008260] font-medium">Verified</span>
            </div>
          )}
        </div>

        {/* Main Info Card */}
        <Card className="bg-white border border-[#D6D6D6] rounded-lg shadow-sm mb-8">
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* ABOUT Section */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  ABOUT
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Domain Expertise</p>
                    <p className="text-base font-semibold text-slate-900">
                      {Array.isArray(expert.domain_expertise) && expert.domain_expertise.length > 0
                        ? expert.domain_expertise[0]
                        : 'Engineering'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Subskills</p>
                    {Array.isArray(expert.subskills) && expert.subskills.length > 0 ? (
                      <div className="space-y-1">
                        {expert.subskills.slice(0, 3).map((skill: string, idx: number) => (
                          <p key={idx} className="text-base font-semibold text-slate-900">
                            {skill}
                          </p>
                        ))}
                        {expert.subskills.length > 3 && (
                          <p className="text-sm text-slate-500">
                            +{expert.subskills.length - 3} more
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-base font-semibold text-slate-900">
                        Electrical Systems
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Bio</p>
                    <p className="text-base text-slate-900 leading-relaxed">
                      {expert.bio || 'Here is the background in my profession.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* DETAILS Section */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  DETAILS
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[#ECF2FF] rounded-xl">
                    <div className="w-10 h-10 bg-[#008260] rounded-full flex items-center justify-center flex-shrink-0">
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-600">Experience</p>
                      <p className="text-base font-bold text-slate-900">
                        {expert.experience_years || 3} years
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-[#ECF2FF] rounded-xl">
                    <div className="w-10 h-10 bg-[#008260] rounded-full flex items-center justify-center flex-shrink-0">
                      <IndianRupee className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-600">Hourly Rate</p>
                      <p className="text-base font-bold text-slate-900">
                        ₹{expert.hourly_rate || 4300}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Qualification Section */}
        {expert.qualifications && (
          <Card className="bg-white border border-[#D6D6D6] rounded-lg shadow-sm mb-8">
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                QUALIFICATION
              </h3>
              <div className="space-y-3">
                {expert.qualifications.split(',').map((qual, idx) => (
                  <div key={idx} className="p-3 bg-[#ECF2FF] rounded-lg">
                    <p className="text-base text-slate-900">{qual.trim()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Feedback Section */}
        {studentFeedback.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Student Feedback</h2>
            <p className="text-sm sm:text-base text-slate-600 mb-6">What students loved about the sessions</p>
            
            <Carousel
              opts={{ align: 'start', loop: true }}
              plugins={[Autoplay({ delay: 4000 })]}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {studentFeedback.map((fb, idx) => (
                  <CarouselItem key={idx} className="pl-4 basis-full sm:basis-1/2">
                    <Card className="bg-white border border-[#D6D6D6] rounded-lg shadow-sm h-full hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <h3 className="font-bold text-lg text-slate-900">
                            {fb.student_name}
                          </h3>
                          <Badge 
                            className={`${
                              fb.rating === 'VERY_GOOD' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            } flex-shrink-0`}
                            variant="outline"
                          >
                            {fb.rating === 'VERY_GOOD' ? 'Very Good' : 'Good'}
                          </Badge>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">
                          {fb.pros}
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex items-center justify-center gap-2 mt-4">
                <CarouselPrevious className="static translate-y-0 bg-white border-[#D6D6D6] hover:bg-[#ECF2FF]" />
                <CarouselNext className="static translate-y-0 bg-white border-[#D6D6D6] hover:bg-[#ECF2FF]" />
              </div>
            </Carousel>
          </div>
        )}
      </main>
    </div>
  )
}


