'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { Calendar, Clock, MapPin, Building, Send, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react'

export default function PublicContractDetail() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [user, setUser] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        // If user is logged in and is an expert, redirect to authenticated detail page
        if (user) {
          const role = (user as any)?.user_metadata?.role
          if (role === 'expert') {
            router.push(`/expert/project/${id}`)
            return
          }
        }
        
        // Load project details (public API)
        const data = await api.projects.getById(id)
        if (data?.error) throw new Error(data.error)
        setProject(data)
      } catch (e: any) {
        setError(e.message || 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    if (id) init()
    
    // Listen for auth state changes (e.g., user logs in on another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const role = (session.user as any)?.user_metadata?.role
        if (role === 'expert') {
          router.push(`/expert/project/${id}`)
        }
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [id, router])

  const handleApplyClick = () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = `/requirements/contract/${id}`
      router.push(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`)
    } else {
      // Check user role and redirect to appropriate detail page
      const role = (user as any)?.user_metadata?.role
      if (role === 'expert') {
        router.push(`/expert/project/${id}`)
      } else {
        // For non-experts, show message or redirect
        router.push(`/auth/login?returnUrl=${encodeURIComponent(`/requirements/contract/${id}`)}&message=${encodeURIComponent('Only experts can apply to contracts')}`)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The project you are looking for does not exist'}</p>
          <Button onClick={() => router.push('/requirements')} className="bg-[#008260] hover:bg-[#006d51]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requirements
          </Button>
        </div>
      </div>
    )
  }

  const getProjectTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      guest_lecture: 'Guest Lecture',
      workshop: 'Workshop',
      consulting: 'Consulting',
      training: 'Training',
      mentorship: 'Mentorship',
      fdp: 'FDP',
      curriculum_dev: 'Curriculum Development',
      research_collaboration: 'Research Collaboration',
      training_program: 'Training Program',
      consultation: 'Consultation',
      other: 'Other'
    }
    return labels[type] || type
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-landing-header sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/requirements">
              <Logo size="header" />
            </Link>
            <div className="flex items-center gap-2">
              {user ? (
                <Link href="/auth/login">
                  <Button variant="ghost" className="text-white hover:bg-white/10">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" className="text-white hover:bg-white/10">Sign In</Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button className="bg-white text-[#008260] hover:bg-white/90">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/requirements')}
          className="mb-6 text-[#008260] hover:text-[#006d51]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requirements
        </Button>

        {/* Project Details Card */}
        <Card className="bg-white border-2 border-[#D6D6D6] rounded-lg mb-6">
          <CardContent className="p-8">
            {/* Title and Badge */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <h1 className="text-3xl font-bold text-[#000000]">{project.title}</h1>
              <Badge className="bg-[#FFF2E5] text-[#FF6B00] hover:bg-[#FFE5CC] border-none font-medium">
                {getProjectTypeLabel(project.type)}
              </Badge>
            </div>

            {/* Institution Info */}
            {project.institutions && (
              <div className="flex items-center gap-3 mb-6">
                <Building className="h-5 w-5 text-[#008260]" />
                <div>
                  <p className="text-lg font-semibold text-[#000000]">{project.institutions.name}</p>
                  {(project.institutions.city || project.institutions.state) && (
                    <p className="text-sm text-[#6A6A6A]">
                      {[project.institutions.city, project.institutions.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#000000] mb-3">Project Description</h2>
              <p className="text-[#6A6A6A] leading-relaxed whitespace-pre-wrap break-words">{project.description}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div>
                <div className="text-xs text-[#6A6A6A] font-medium mb-1">Hourly Rate</div>
                <div className="text-lg font-semibold text-[#008260]">₹{project.hourly_rate}/hr</div>
              </div>
              {project.start_date && (
                <div>
                  <div className="text-xs text-[#6A6A6A] font-medium mb-1">Start Date</div>
                  <div className="text-sm font-semibold text-[#000000]">
                    {new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )}
              {project.end_date && (
                <div>
                  <div className="text-xs text-[#6A6A6A] font-medium mb-1">End Date</div>
                  <div className="text-sm font-semibold text-[#000000]">
                    {new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )}
              {project.duration_hours && (
                <div>
                  <div className="text-xs text-[#6A6A6A] font-medium mb-1">Duration</div>
                  <div className="text-sm font-semibold text-[#000000]">{project.duration_hours} Hours</div>
                </div>
              )}
            </div>

            {/* Required Expertise */}
            {project.required_expertise && project.required_expertise.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-semibold text-[#000000] mb-3">Required Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {project.required_expertise.map((skill: string, idx: number) => (
                    <Badge key={idx} className="bg-[#D8E9FF] text-[#000000] hover:bg-[#D8E9FF] border-none">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Apply Button */}
            <div className="flex justify-end mt-8">
              <Button
                size="lg"
                onClick={handleApplyClick}
                className="bg-[#008260] hover:bg-[#006d51] text-white font-medium rounded-lg px-8"
              >
                <Send className="h-4 w-4 mr-2" />
                Apply Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

