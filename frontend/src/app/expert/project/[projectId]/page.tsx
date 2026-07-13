'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import Autoplay from "embla-carousel-autoplay"
import { Alert, AlertDescription } from '@/components/ui/alert'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import Logo from '@/components/Logo'
import { 
  ArrowLeft,
  Calendar, 
  DollarSign, 
  Clock,
  MapPin,
  Building,
  User,
  Briefcase,
  Send,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  IndianRupee
} from 'lucide-react'
import Link from 'next/link'
import { useExpertWorkspace } from '@/contexts/ExpertWorkspaceContext'
import { fetchExpertForWorkspace, expertProfileSetupPath } from '@/lib/expertWorkspace'
import { ShareRequirementButton } from '@/components/requirements/ShareRequirementButton'
import { ProjectRequirementMeta } from '@/components/requirements/ProjectRequirementMeta'
import { ExpertApplicationDrawer } from '@/components/requirements/ExpertApplicationDrawer'
import { projectLocationLine } from '@/lib/requirementLabels'
import { formatLongDate } from '@/lib/dateFormat'
import type { InterviewSlot } from '@/components/requirements/InterviewAvailabilitySelector'
import {
  moneyInr,
  projectCompensationDisplay,
  type RateIntent,
} from '@/lib/projectCompensation'

type UserMeta = { role?: string; name?: string }
type SessionUser = { id: string; email?: string; user_metadata?: UserMeta }

interface Project {
  id: string
  title: string
  description: string
  type: string
  start_date: string
  end_date: string
  hourly_rate: number
  duration_hours: number
  compensation_unit?: string | null
  unit_quantity?: number | null
  duration_per_unit?: number | null
  institution_gross_per_unit?: number | null
  institution_gross_total?: number | null
  location: string
  status: string
  created_at: string
  institutions: {
    id: string
    name: string
    logo_url?: string
    description?: string,
    address?: string,
    city?: string,
    state?: string
  }
  required_expertise: string[]
  domain_expertise: string
  subskills: string[]
  job_location?: string | null
  workplace_type?: string | null
  employment_type?: string | null
  total_budget?: number | null
  screening_questions?: string[] | null
  interview_period_interval?: string | null
  requirement_pdf_url?: string | null
}

interface Application {
  id: string
  cover_letter: string
  proposed_rate: number
  status: string
  applied_at: string
}

interface ExpertProfile {
  id?: string
  user_id?: string
  name?: string
  email?: string
  hourly_rate?: number
  rating?: number
  total_ratings?: number
  is_verified?: boolean
  bio?: string
  qualifications?: string[]
  domain_expertise?: string[]
  photo_url?: string
}

export default function ExpertProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const { viewer, actingExpertId, basePath } = useExpertWorkspace()

  const [user, setUser] = useState<any>(null)
  const [expert, setExpert] = useState<ExpertProfile | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [similarProjects, setSimilarProjects] = useState<Project[]>([])
  const [recommendedProjects, setRecommendedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [applicationForm, setApplicationForm] = useState({
    coverLetter: '',
    rateIntent: 'agreed_posted' as RateIntent,
    rateNote: '',
    interviewAvailability: [] as InterviewSlot[]
  })
  const [showApplicationDrawer, setShowApplicationDrawer] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState('')


  // Load user and expert data
  const getUser = async (): Promise<SessionUser | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return null
    }
    setUser(user)
    return user as unknown as SessionUser
  }

  const loadExpertData = async () => {
    try {
      const currentUser = await getUser()
      if (!currentUser) return

      const userRole = currentUser.user_metadata?.role
      if (userRole !== 'expert' && userRole !== 'super_admin') {
        router.push('/')
        return
      }
      if (userRole === 'super_admin' && viewer !== 'super_admin') {
        router.push('/superadmin/home')
        return
      }
      if (viewer === 'super_admin' && userRole !== 'super_admin') {
        router.push('/')
        return
      }

      const expertProfile = await fetchExpertForWorkspace(currentUser.id, viewer, actingExpertId)

      if (!expertProfile) {
        router.push(expertProfileSetupPath(viewer))
        return
      }
      
      setExpert(expertProfile)
    } catch (error: any) {
      console.error('Expert data loading error:', error)
    }
  }

  const loadRecommendedProjects = async () => {
    try {
      if (!expert?.id) return
      
      const recommendedData = await api.projects.getRecommended(expert.id)
      setRecommendedProjects(Array.isArray(recommendedData) ? recommendedData.filter((p: Project) => p.id !== projectId) : [])
    } catch (error) {
      console.error('Error fetching recommended projects:', error)
    }
  }

  // Load project details
  const loadProjectDetails = async () => {
    try {
      setLoading(true)
      const projectData = await api.projects.getById(projectId)
      setProject(projectData)
    } catch (err: any) {
      setError(err.message || 'Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  // Check if user has already applied
  const checkApplicationStatus = async () => {
    try {
      if (!expert?.id) return
      
      const applications = await api.applications.getAll({ 
        project_id: projectId,
        expert_id: expert.id 
      })
      setHasApplied(applications?.data?.length > 0)
    } catch (err) {
      console.error('Error checking application status:', err)
    }
  }

  // Handle application submission
  const handleApplicationSubmit = async (payload: {
    cover_letter: string
    rate_intent: 'agreed_posted' | 'open_to_negotiate'
    rate_note: string | null
    interview_availability: any[]
    screening_answers: string | null
  }) => {
    if (!payload.cover_letter.trim()) {
      setApplyError('Please write a cover letter')
      return
    }

    try {
      setIsApplying(true)
      setApplyError('')

      const response = await api.applications.create({
        project_id: projectId,
        cover_letter: payload.cover_letter,
        rate_intent: payload.rate_intent,
        rate_note: payload.rate_note,
        interview_availability: payload.interview_availability,
        screening_answers: payload.screening_answers,
      })

      if (response?.error) {
        setApplyError(response.error)
        return
      }

      setApplySuccess('Application submitted successfully!')
      setApplicationForm({ coverLetter: '', rateIntent: 'agreed_posted', rateNote: '', interviewAvailability: [] })
      setHasApplied(true)
      setShowApplicationDrawer(false)
      loadSimilarProjects()
      loadRecommendedProjects()
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit application')
    } finally {
      setIsApplying(false)
    }
  }


  useEffect(() => {
    loadExpertData()
  }, [viewer, actingExpertId])

  useEffect(() => {
    if (expert) {
      loadRecommendedProjects()
    }
  }, [expert])

  useEffect(() => {
    if (projectId) {
      loadProjectDetails()
    }
  }, [projectId])

  // Check application status when both project and expert are available
  useEffect(() => {
    if (projectId && expert?.id) {
      checkApplicationStatus()
    }
  }, [projectId, expert])

  // Load similar projects when both project and expert data are available
  useEffect(() => {
    if (project && expert?.id) {
      loadSimilarProjects()
    }
  }, [project, expert])

  // Separate function to load similar projects
  const loadSimilarProjects = async () => {
    try {
      if (!project?.domain_expertise || !expert?.id) return
      
      const similarData = await api.projects.getAll({
        domain_expertise: project.domain_expertise,
        expert_id: expert.id, // Filter out projects expert has already applied to
        limit: 10
      })
      setSimilarProjects(similarData.filter((p: Project) => p.id !== projectId))
    } catch (error) {
      console.error('Error fetching similar projects:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260]"></div>
        </div>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push(`${basePath}/home`)} className="bg-[#008260] hover:bg-[#006d51]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!project) return null
  const pricing = projectCompensationDisplay(project)

  return (
    <div className="min-h-screen bg-[#ECF2FF] overflow-x-hidden">
      {/* Header */}
      <header className="bg-[#008260] border-b border-slate-200/20 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href={`${basePath}/home`} className="flex items-center group">
              <Logo size="header" />
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href={`${basePath}/home`} className="text-white font-medium transition-colors duration-200 relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
              <Link href={`${basePath}/dashboard`} className="text-white/80 hover:text-white font-medium transition-colors duration-200 relative group">
                Dashboard
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
           
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200">
                <NotificationBell />
              </div>
              <ProfileDropdown 
                user={user} 
                expert={expert} 
                userType={viewer === 'super_admin' ? 'super_admin' : 'expert'} 
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between w-full items-start sm:items-center border-b border-[#D6D6D6] pb-6 gap-4">
        <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-[32px] font-semibold text-black truncate">{project.title}</h1>
              {projectLocationLine(project) && (
                <p className="flex items-center text-[#6A6A6A] mt-1">
                  <MapPin className="h-4 w-4 mr-2 shrink-0" />
                  <span className="text-sm font-medium">{projectLocationLine(project)}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
                  <div className="text-lg sm:text-xl md:text-[24px] font-bold text-[#008260]">
                    {moneyInr(pricing.totalBudgetGross || Number(project.total_budget || 0))}
                  </div>
                  <div className="text-sm text-[#757575]">Total project budget</div>
                  <ShareRequirementButton
                    path={`/requirements/contract/${project.id}`}
                    title={project.title}
                    className="border-[#008260] text-[#008260]"
                  />
                </div>
            </div>
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Project Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Title */}
          

            <ProjectRequirementMeta project={project} />

            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">Project Description</h2>
              <p className="text-[#6A6A6A] text-sm sm:text-base leading-relaxed whitespace-pre-line">{project.description}</p>
            </div>

            {project.requirement_pdf_url && (
              <div>
                <h3 className="text-base font-semibold text-black mb-3">Requirement PDF</h3>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-[#008260] text-[#008260] hover:bg-[#E8F5F1]"
                >
                  <a
                    href={project.requirement_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View requirement PDF
                  </a>
                </Button>
              </div>
            )}

            <div>
              {/* Expertise Domain */}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-black mb-3">Expertise Domain</h3>
                <div className="inline-block">
                  <Badge className="bg-[#7BF2D3] text-[#000000] hover:bg-[#7BF2D3] px-4 py-1.5 text-sm font-medium border-0">
                    {project.domain_expertise}
                  </Badge>
                </div>
              </div>

              {/* Required Expertise */}
              {project.required_expertise && project.required_expertise.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-black mb-3">Required Expertise</h3>
                  <p className="text-[#6A6A6A] text-sm leading-relaxed">
                    {project.required_expertise.join(', ')}
                  </p>
                </div>
              )}

              {/* Sub-skills */}
              {project.subskills && project.subskills.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-black mb-3">Sub-skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.subskills.map((skill, index) => (
                      <Badge key={index} className="bg-[#D8E9FF] text-[#000000] hover:bg-[#D8E9FF] px-3 py-1 text-sm font-normal border border-[#D6D6D6]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar Card */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-2 border-[#D6D6D6] shadow-sm sticky top-24">
              <CardContent className="p-0">
                {/* Hourly Rate */}

                {/* Date and Duration Info */}
                <div className="space-y-4 p-4 sm:p-6">
                  {/* Start Date */}
                  <div className="flex items-start gap-3 p-4 bg-[#E8F4F8] rounded-lg">
                    <div className="w-12 h-12 bg-[#008260] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">Starts Date</p>
                      <p className="text-base font-medium text-black mt-1">{formatLongDate(project.start_date)}</p>
                    </div>
                  </div>

                  {/* End Date */}
                  <div className="flex items-start gap-3 p-4 bg-[#E8F4F8] rounded-lg">
                    <div className="w-12 h-12 bg-[#008260] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">End Date</p>
                      <p className="text-base font-medium text-black mt-1">{formatLongDate(project.end_date)}</p>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-start gap-3 p-4 bg-[#E8F4F8] rounded-lg">
                    <div className="w-12 h-12 bg-[#008260] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">Duration</p>
                      <p className="text-base font-medium text-black mt-1">{project.duration_hours} Hours</p>
                    </div>
                  </div>

                  {project.interview_period_interval ? (
                    <div className="flex items-start gap-3 rounded-lg border border-[#BFE3D8] bg-[#E8F5F1] p-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#008260]">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#008260]">Probable interview dates</p>
                        <p className="mt-1 text-base font-semibold text-black">{project.interview_period_interval}</p>
                        <p className="mt-1 text-xs text-[#4B5563]">Preferred interview window shared by the institution</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="p-4 sm:p-6 pt-0">
                  {hasApplied ? (
                    <Button size="lg" className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-medium rounded-lg h-12">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Applied
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-medium rounded-lg h-12"
                      onClick={() => {
                        setApplyError('')
                        setApplySuccess('')
                        setApplicationForm({ coverLetter: '', rateIntent: 'agreed_posted', rateNote: '', interviewAvailability: [] })
                        setShowApplicationDrawer(true)
                      }}
                    >
                      Apply Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <ExpertApplicationDrawer
          open={showApplicationDrawer}
          onOpenChange={setShowApplicationDrawer}
          project={project}
          form={applicationForm}
          onFormChange={setApplicationForm}
          isApplying={isApplying}
          error={applyError}
          success={applySuccess}
          onSubmit={handleApplicationSubmit}
        />

        {/* Similar Projects Section */}
        {similarProjects.length > 0 && (
          <div className="mt-12">
            <h2 className="text-[22px] font-semibold text-black mb-6">Similar Projects</h2>
            <Carousel
              opts={{ align: "start", containScroll: "trimSnaps" }}
              plugins={[Autoplay({ delay: 3500 })]}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {similarProjects.map((proj) => (
                  <CarouselItem key={proj.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/2">
                    <Card className="bg-white border-2 border-[#D6D6D6] hover:border-[#008260] transition-all duration-300 hover:shadow-lg h-full">
                      <CardContent className="p-4 sm:p-6 pb-4">
                        <h3 className="text-xl font-semibold text-black mb-3">{proj.title}</h3>
                        <p className="text-[#6A6A6A] text-sm mb-4 truncate">{proj.description}</p>
                        
                        <div className="flex items-center text-sm text-[#6A6A6A] mb-4">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{projectLocationLine(proj) || 'Location TBD'}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-bold text-[#008260]">
                            {moneyInr(projectCompensationDisplay(proj).netPerUnitDisplay)}/{projectCompensationDisplay(proj).unitShort}
                          </div>
                          <Link href={`${basePath}/project/${proj.id}`}>
                            <Button className="bg-[#008260] hover:bg-[#006d51] text-white rounded-lg w-20">
                              View
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex" />
              <CarouselNext className="hidden sm:flex" />
            </Carousel>
          </div>
        )}
         {recommendedProjects.length > 0 && (
          <div className="mt-12">
          <h2 className="text-[22px] font-semibold text-black mb-6">Recommended Projects</h2>
          <Carousel
            opts={{ align: "start", containScroll: "trimSnaps" }}
            plugins={[Autoplay({ delay: 3500 })]}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {recommendedProjects.map((proj) => (
                <CarouselItem key={proj.id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/2">
                  <Card className="bg-white border-2 border-[#D6D6D6] hover:border-[#008260] transition-all duration-300 hover:shadow-lg h-full">
                    <CardContent className="p-6 pb-4">
                      <h3 className="text-xl font-semibold text-black mb-3">{proj.title}</h3>
                      <p className="text-[#6A6A6A] text-sm mb-4 truncate">{proj.description}</p>
                      
                      <div className="flex items-center text-sm text-[#6A6A6A] mb-4">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{projectLocationLine(proj) || 'Location TBD'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-[#008260]">
                          {moneyInr(projectCompensationDisplay(proj).netPerUnitDisplay)}/{projectCompensationDisplay(proj).unitShort}
                        </div>
                        <Link href={`${basePath}/project/${proj.id}`}>
                          <Button className="bg-[#008260] hover:bg-[#006d51] text-white rounded-lg w-20">
                            View
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
        )}


      </main>
    </div>
  )
}
