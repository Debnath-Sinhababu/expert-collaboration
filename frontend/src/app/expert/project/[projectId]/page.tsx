'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

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
  location: string
  status: string
  created_at: string
  institutions: {
    id: string
    name: string
    logo_url?: string
    description?: string
  }
  required_expertise: string[]
  domain_expertise: string
  subskills: string[]
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
    proposedRate: ''
  })
  const [isApplying, setIsApplying] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)


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
      if (userRole !== 'expert') {
        router.push('/')
        return
      }

      // Get expert profile
      const expertProfile = await api.experts.getByUserId(currentUser.id)
      
      if (!expertProfile) {
        router.push('/expert/profile-setup')
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
  const handleApplicationSubmit = async () => {
    if (!applicationForm.coverLetter.trim()) {
      setError('Please write a cover letter')
      return
    }

    try {
      setIsApplying(true)
      setError('')
      
      await api.applications.create({
        project_id: projectId,
        cover_letter: applicationForm.coverLetter,
        proposed_rate: parseFloat(applicationForm.proposedRate) || project?.hourly_rate || 0
      })
      
      setSuccess('Application submitted successfully!')
      setApplicationForm({ coverLetter: '', proposedRate: '' })
      setHasApplied(true)
      
      // Refresh similar and recommended projects
      loadSimilarProjects()
      loadRecommendedProjects()
      
    } catch (err: any) {
      setError(err.message || 'Failed to submit application')
    } finally {
      setIsApplying(false)
    }
  }


  useEffect(() => {
    loadExpertData()
  }, [])

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/expert/home')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-x-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Back Button */}
            <div className="flex items-center space-x-4">
              <Link href="/expert/home" className="flex items-center space-x-2 group">
                <ArrowLeft className="h-5 w-5 text-white/70 group-hover:text-blue-200 transition-colors duration-200" />
                <span className="text-white/70 group-hover:text-blue-200 font-medium transition-colors duration-200">Back to Home</span>
              </Link>
              <div className="h-6 w-px bg-white/20" />
              <Link href="/" className="flex items-center space-x-2 group">
                {/* <Logo size="md" /> */}
                <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent group-hover:from-blue-200 group-hover:to-white transition-all duration-300">Calxmap</span>
              </Link>
            </div>

            {/* Navigation */}
          

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200">
                <NotificationBell />
              </div>
              <ProfileDropdown 
                user={user} 
                expert={expert} 
                userType="expert" 
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Details */}
        <Card className="bg-gradient-to-br from-white to-slate-50/30 border border-slate-200/50 shadow-sm hover:shadow-lg transition-all duration-300 mb-8 relative group">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 opacity-0 group-hover:opacity-5 transition-opacity duration-300 -z-10"></div>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">{project.title}</CardTitle>
                <div className="flex items-center space-x-4 text-slate-600 mb-4">
                  <div className="flex items-center space-x-1">
                    <Building className="h-4 w-4" />
                    <span>{project.institutions.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{project.location}</span>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {project.type?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">₹{project.hourly_rate}/hour</div>
                <div className="text-sm text-slate-500 text-left">{project.duration_hours} hours</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Project Description */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Project Description</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{project.description}</p>
            </div>

            {/* Project Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Start Date</p>
                  <p className="text-sm text-slate-600">{new Date(project.start_date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">End Date</p>
                  <p className="text-sm text-slate-600">{new Date(project.end_date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Duration</p>
                  <p className="text-sm text-slate-600">{project.duration_hours} hours</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
               
                <div>
                  <p className="text-sm font-medium text-slate-900">Hourly Rate</p>
                  <p className="text-sm text-slate-600">₹{project.hourly_rate}</p>
                </div>
              </div>
            </div>

            {/* Skills and Expertise */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {project.required_expertise?.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Expertise Domain</h3>
                <div className="flex flex-wrap gap-2">
                  {project.domain_expertise && (
                    <Badge variant="outline" className="px-3 py-1">
                      {project.domain_expertise}
                    </Badge>
                  )}
                </div>
              </div>
              
              {project.subskills && project.subskills.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Sub-skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.subskills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="px-3 py-1 text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Institution Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">About {project.institutions.name}</h3>
              <p className="text-slate-700">{project.institutions.description || 'No description available'}</p>
            </div>

            {/* Apply Button */}
            <div className="border-t pt-6">
              {hasApplied ? (
                 <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200">
                  <CheckCircle className="h-4 w-4 mr-2" />
                 Applied
               </Button>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200">
                      <Send className="h-4 w-4 mr-2" />
                      Apply Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white border-2 border-slate-200 shadow-xl">
                    <DialogHeader className="space-y-3">
                      <DialogTitle className="text-xl font-bold text-slate-900">Apply to Project</DialogTitle>
                      <DialogDescription className="text-slate-600">
                        Submit your application for "{project.title}"
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="coverLetter" className="text-sm font-medium text-slate-700">Cover Letter</Label>
                        <Textarea
                          id="coverLetter"
                          placeholder="Explain why you're the perfect fit for this project..."
                          value={applicationForm.coverLetter}
                          onChange={(e) => setApplicationForm({...applicationForm, coverLetter: e.target.value})}
                          rows={4}
                          className="border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proposedRate" className="text-sm font-medium text-slate-700">Proposed Hourly Rate (₹)</Label>
                        <input
                          id="proposedRate"
                          type="number"
                          placeholder={project.hourly_rate.toString()}
                          value={applicationForm.proposedRate}
                          onChange={(e) => setApplicationForm({...applicationForm, proposedRate: e.target.value})}
                          className="w-full px-3 py-2 border-2 border-slate-200 rounded-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        />
                      </div>
                      {error && (
                        <Alert variant="destructive" className="border-2 border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-red-700">{error}</AlertDescription>
                        </Alert>
                      )}
                      {success && (
                        <Alert className="border-2 border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription className="text-green-700">{success}</AlertDescription>
                        </Alert>
                      )}
                      <Button 
                        onClick={handleApplicationSubmit}
                        className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 py-2.5"
                        disabled={!applicationForm.coverLetter || isApplying}
                      >
                        {isApplying ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Similar Projects Carousel */}
        {similarProjects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Similar Projects</h2>
            <Carousel
              opts={{
                align: "start",
                containScroll: "trimSnaps"
              }}
              plugins={[
                Autoplay({
                  delay: 3000,
                }),
              ]}
              className="w-full max-w-7xl mx-auto"
            >
              <CarouselContent className="-ml-2">
                {similarProjects.map((project) => (
                  <CarouselItem key={project.id} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/3">
                    <Card className="h-full mx-2 transition-all duration-300 hover:shadow-lg border border-slate-200/50 hover:border-blue-300/50 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-blue-100/20 relative group">
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10"></div>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                          <h3 className="font-bold text-lg text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">{project.title}</h3>
                          <Badge variant="outline" className="ml-2 capitalize text-xs">
                            {project.type?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-slate-600 text-sm mb-4 truncate">{project.description}</p>
                        <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                          <span className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            {project.institutions.name}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {project.location}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-bold text-green-600">₹{project.hourly_rate}/hr</div>
                          <Link href={`/expert/project/${project.id}`}>
                            <Button size="sm" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200">View Details</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
              <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
            </Carousel>
          </div>
        )}

        {/* Recommended Projects Carousel */}
        {recommendedProjects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Recommended Projects</h2>
            <Carousel
              opts={{
                align: "start",
                containScroll: "trimSnaps"
              }}
              plugins={[
                Autoplay({
                  delay: 3000,
                }),
              ]}
              className="w-full max-w-7xl mx-auto"
            >
              <CarouselContent className="-ml-2">
                {recommendedProjects.map((project) => (
                  <CarouselItem key={project.id} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/3">
                    <Card className="h-full mx-2 transition-all duration-300 hover:shadow-lg border border-slate-200/50 hover:border-blue-300/50 bg-gradient-to-br from-white to-slate-50/30 shadow-sm hover:shadow-blue-100/20 relative group">
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10"></div>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-bold text-lg text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">{project.title}</h3>
                          <Badge variant="outline" className="ml-2 capitalize text-xs">
                            {project.type?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-slate-600 text-sm mb-4 truncate">{project.description}</p>
                        <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                          <span className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            {project.institutions.name}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {project.location}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-bold text-green-600">₹{project.hourly_rate}/hr</div>
                          <Link href={`/expert/project/${project.id}`}>
                            <Button size="sm" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200">View Details</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
              <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
            </Carousel>
          </div>
        )}
      </main>
    </div>
  )
}
