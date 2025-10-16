'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { usePagination } from '@/hooks/usePagination'
import { PROJECT_TYPES, EXPERTISE_DOMAINS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import Autoplay from "embla-carousel-autoplay"
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import Logo from '@/components/Logo'
import { 
  Search, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Building2,
  Star,
  Eye,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Send
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type UserMeta = { role?: string; name?: string }
type SessionUser = { id: string; email?: string; user_metadata?: UserMeta }

export default function ExpertHome() {
  type ExpertProfile = {
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

  type Project = {
    id: string
    title?: string
    description?: string
    start_date?: string
    end_date?: string
    hourly_rate?: number
    duration_hours?: number
    type?: string
    domain_expertise?: string
    required_expertise?: string[]
    subskills?: string[]
    institutions?: {
      id: string
      name: string
      logo_url?: string
    }
    applicationCounts?: {
      total: number
      pending: number
    }
    matchScore?: number
  }

  const [user, setUser] = useState<any>(null)
  const [expert, setExpert] = useState<ExpertProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedDomain, setSelectedDomain] = useState('all')
  const [minRate, setMinRate] = useState('')
  const [maxRate, setMaxRate] = useState('')
  const [applicationForm, setApplicationForm] = useState({
    coverLetter: '',
    proposedRate: ''
  })
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [universities, setUniversities] = useState<any[]>([])
  const [universitiesLoading, setUniversitiesLoading] = useState(true)
  const [partneredExperts, setPartneredExperts] = useState<any[]>([])
  const [expertsLoading, setExpertsLoading] = useState(true)
  
  // Recommended projects state
  const [recommendedProjects, setRecommendedProjects] = useState<Project[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)

  const router = useRouter()

  // Use pagination hook for projects (same pattern as dashboard)
  const {
    data: projects,
    loading: projectsLoading,
    hasMore: hasMoreProjects,
    loadMore: loadMoreProjects,
    refresh: refreshProjects
  } = usePagination(
    async (page: number) => {
      if (!expert?.id) return []
      
      // Filter out undefined values to avoid sending "undefined" in URL
      const params: any = {
        page,
        limit: 10,
        expert_id: expert.id // Filter out projects already applied to
      }
      
      if (searchTerm) params.search = searchTerm
      if (selectedType !== 'all') params.type = selectedType
      if (selectedDomain !== 'all') params.domain_expertise = selectedDomain
      if (minRate) params.min_hourly_rate = parseFloat(minRate)
      if (maxRate) params.max_hourly_rate = parseFloat(maxRate)

      return await api.projects.getAll(params)
    },
    [expert?.id, searchTerm, selectedType, selectedDomain, minRate, maxRate]
  )

  // Reuse existing getUser pattern from dashboard
  const getUser = async (): Promise<SessionUser | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return null
    }
    setUser(user)
    return user as unknown as SessionUser
  }

  // Reuse existing loadExpertData pattern
  const loadExpertData = async () => {
    try {
      setLoading(true)
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
      
      // Reload partnered experts to filter out current user
     
      
    } catch (error: any) {
      setError('Failed to load expert data')
      console.error('Expert home error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpertData()
    loadUniversities()
    
  }, [router])

  useEffect(()=>{
    if(expert){
      loadPartneredExperts()
      loadRecommendedProjects()
    }
  },[expert])

  const loadUniversities = async () => {
    try {
      setUniversitiesLoading(true)
      const data = await api.institutions.getAll({ limit: 5 })
      setUniversities(Array.isArray(data) ? data : (data?.data || []))
    } catch (error) {
      console.error('Error fetching universities:', error)
    } finally {
      setUniversitiesLoading(false)
    }
  }

  const loadPartneredExperts = async () => {
    try {
      setExpertsLoading(true)
      const data = await api.experts.getAll({ limit: 8, is_verified: true })
      const experts = Array.isArray(data) ? data : (data?.data || [])
      
      // Filter out current user if expert is loaded
      const filteredExperts = expert?.id 
        ? experts.filter((ex: any) => ex.id !== expert.id)
        : experts
      
      setPartneredExperts(filteredExperts.slice(0, 6)) // Show max 6 experts
    } catch (error) {
      console.error('Error fetching partnered experts:', error)
    } finally {
      setExpertsLoading(false)
    }
  }

  const loadRecommendedProjects = async () => {
    try {
      setLoadingRecommendations(true)
      if (!expert?.id) return
      
      const data = await api.projects.getRecommended(expert.id)
      setRecommendedProjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching recommended projects:', error)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const handleApplicationSubmit = async (projectId: string) => {
    if (!applicationForm.coverLetter.trim()) {
      setError('Please write a cover letter')
      return
    }

    try {
      setIsApplying(true)
      setError('')
       
      const response = await api.applications.create({
        project_id: projectId,
        cover_letter: applicationForm.coverLetter,
        proposed_rate: parseFloat(applicationForm.proposedRate) || expert?.hourly_rate || 0
      })

      if (response && response.id) {
        setSuccess('Application submitted successfully!')
        setApplicationForm({ coverLetter: '', proposedRate: '' })
        setShowApplicationModal(false)
        setSelectedProjectId(null)
        refreshProjects()
        loadRecommendedProjects()
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000)
        // Note: Projects will automatically refresh due to usePagination dependencies
      } else {
        setError(response?.error || 'Failed to submit application')
        // Clear error message after 5 seconds
        setTimeout(() => setError(''), 5000)
      }
    } catch (error: any) {
      console.error('Error applying to project:', error)
      setError('Failed to submit application')
      // Clear error message after 5 seconds
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsApplying(false)
    }
  }

  const handleOpenApplicationModal = (projectId: string) => {
    setSelectedProjectId(projectId)
    setShowApplicationModal(true)
    setApplicationForm({ coverLetter: '', proposedRate: '' })
  }

  const getProjectTypeLabel = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Other'
  }

  const getProjectTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'guest_lecture': 'bg-blue-100 text-blue-800',
      'fdp': 'bg-green-100 text-green-800',
      'workshop': 'bg-purple-100 text-purple-800',
      'curriculum_dev': 'bg-orange-100 text-orange-800',
      'research_collaboration': 'bg-pink-100 text-pink-800',
      'training_program': 'bg-indigo-100 text-indigo-800',
      'consultation': 'bg-yellow-100 text-yellow-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
        <p className="text-[#6A6A6A]">Loading...</p>
      </div>
    </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-[#008260] border-b border-slate-200/20 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/expert/home" className="flex items-center group">
              <Logo size="header" />
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/expert/home" className="text-white font-medium transition-colors duration-200 relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
              <Link href="/expert/dashboard" className="text-white/80 hover:text-white font-medium transition-colors duration-200 relative group">
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
                userType="expert" 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
              Welcome back, {expert?.name}! 👋
            </h1>
            <p className="text-lg text-slate-600 font-normal">
              Discover new opportunities and grow your expertise
            </p>
          </div>

        {/* Recommended for You Section */}
        {recommendedProjects.length > 0 && (
          <div className="mb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-6">
                <h2 className="text-[28px] font-bold text-black mb-1 tracking-tight">
                  🎯 Recommended for You
                </h2>
                <p className="text-black text-base">
                  Based on your expertise in <strong>{expert?.domain_expertise || 'your field'}</strong> - 
                  {recommendedProjects.length} matching {recommendedProjects.length === 1 ? 'project' : 'projects'}
                </p>
              </div>

              {loadingRecommendations ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260]"></div>
                </div>
              ) : (
                <Carousel
                  opts={{
                    align: "start",
                    containScroll: "trimSnaps"
                  }}
                  plugins={[
                    Autoplay({
                      delay: 6000,
                    }),
                  ]}
                  className="w-full max-w-7xl mx-auto"
                >
                  <CarouselContent className="-ml-2 pb-2">
                    {recommendedProjects.map((project) => (
                      <CarouselItem key={project.id} className="pl-2 pt-2 pb-4 basis-full sm:basis-1/2 lg:basis-1/3">
                        <Card className="h-full mx-2 transition-all duration-300 hover:shadow-lg border border-[#E0E0E0] bg-white shadow-sm relative group">
                          <div className="absolute inset-0 rounded-lg bg-[#008260] opacity-0 group-hover:opacity-5 transition-opacity duration-300 -z-10"></div>
                          <CardContent className="p-4 sm:p-6">
                            {/* Header Section */}
                            <div className="flex flex-col mb-4 gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                                  <Link href={`/expert/project/${project.id}`}>
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 hover:text-blue-600 cursor-pointer truncate transition-colors duration-200">
                                      {project.title}
                                    </h3>
                                  </Link>
                                  <div className="flex items-center gap-2">
                                   
                                    <Badge className="bg-green-100 text-green-800 border-green-200 flex-shrink-0">
                                      {project.matchScore}% Match
                                    </Badge>
                                   
                                  </div>
                                </div>
                             
                              
                              </div>
                              <Badge className={`${getProjectTypeColor(project.type || '')} text-xs w-fit`}>
                                      {getProjectTypeLabel(project.type || '')}
                                    </Badge>

                              <div className='flex flex-col'>
                              <div className="flex items-center text-slate-600 text-sm mb-3">
                                  <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span className="font-medium truncate">{project.institutions?.name}</span>
                                </div>
                                <p className="text-slate-600 text-sm truncate mb-4">
                                  {project.description}
                                </p>
                              </div>
                              
                              {/* Price Section - Only show on larger screens */}
                              <div className="hidden lg:flex justify-between items-start space-y-2 flex-shrink-0">
                                <div className="text-right flex items-center gap-x-2">
                                  <div className="text-2xl font-bold text-[#008260]">
                                    ₹{project.hourly_rate}
                                  </div>
                                  <div className="text-sm text-slate-500">per hour</div>
                                </div>
                             
                              </div>
                            </div>

                         

                            {/* Bottom Section - Project Details and Actions */}
                            <div className="flex flex-col gap-4">
                              {/* Project Details */}
                             
                              
                              {/* Action Buttons - Full width on mobile, auto on desktop */}
                              <div className="flex space-x-2 w-full sm:w-auto">
                                <Button 
                                  onClick={() => handleOpenApplicationModal(project.id)}
                                  className="flex-1 sm:flex-none bg-[#008260] hover:bg-[#006d51] text-white text-sm px-4 py-2 font-medium shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                                >
                                  <Send className="h-4 w-4 mr-1 sm:mr-2" />
                                  <span className="hidden sm:inline">Apply Now</span>
                                  <span className="sm:hidden">Apply</span>
                                </Button>
                                <Link href={`/expert/project/${project.id}`}>
                                  <Button variant="outline" size="icon" className="border-[#008260] hover:border-[#006d51] hover:bg-[#008260]/10 flex-shrink-0 transition-all duration-200">
                                    <Eye className="h-4 w-4 text-[#008260]" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                  <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                </Carousel>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats Cards */}
      

        {/* University Banners Carousel */}

        {
            universities.length > 0 && (
                <div className="mb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-6">
                    <h2 className="text-[28px] font-semibold text-[#000000] mb-1 tracking-tight">
                      Partner Universities
                    </h2>
                    <p className="text-black text-base">
                      Trusted by leading educational institutions across India
                    </p>
                  </div>
      
                  {universitiesLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260]"></div>
                    </div>
                  ) : (
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
                         {universities.map((university, index) => {
                           // Use real university images from public folder
                           const universityImages = [
                             '/images/universitylogo1.jpeg',
                             '/images/universitylogo2.jpeg', 
                             '/images/universitylogo3.jpeg',
                             '/images/universitylogo1.jpeg', // Reuse for more than 3
                             '/images/universitylogo2.jpeg'
                           ]
                           
                           return (
                             <CarouselItem key={university.id || index} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/2">
                              <div className="relative h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
                                {/* Background Image */}
                                <div 
                                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                  style={{
                                    backgroundImage: `url('${universityImages[index % universityImages.length]}')`
                                  }}
                                >
                                  {/* Overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                                </div>
                                
                                {/* University Name */}
                                <div className="absolute bottom-0 left-0 right-0 p-6">
                                  <h3 className="text-white font-bold text-xl mb-2 transition-colors duration-300">
                                    {university.name}
                                  </h3>
                                  <p className="text-white/90 text-base mb-1">
                                    {university.type || 'Educational Institution'}
                                  </p>
                                  <p className="text-white/80 text-sm">
                                    {[university.city, university.state, university.country].filter(Boolean).join(', ') || 'India'}
                                  </p>
                                </div>
      
                                {/* Hover Effect */}
                                <div className="absolute inset-0 bg-[#008260]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              </div>
                            </CarouselItem>
                          )
                        })}
                      </CarouselContent>
                      <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                      <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                    </Carousel>
                  )}
                </div>
              </div>
                
            )
        }
      

        {/* Partnered Experts Carousel */}
        {
            partneredExperts.length > 0 && (
                <div className="mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-6">
                    <h2 className="text-[28px] font-bold text-black mb-1 tracking-tight">
                      Partnered Experts
                    </h2>
                    <p className="text-black text-base">
                      Connect with verified professionals in your field
                    </p>
                  </div>
      
                  {expertsLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260]"></div>
                    </div>
                  ) : (
                                         <Carousel
                       opts={{
                         align: "start",
                         containScroll: "trimSnaps"
                       }}
                       plugins={[
                         Autoplay({
                           delay: 4000,
                         }),
                       ]}
                       className="w-full max-w-7xl mx-auto"
                     >
                       <CarouselContent className="-ml-2 pb-2">
                        {partneredExperts.map((expert, index) => {
                          // Color variations for expert cards
                          const colors = ['blue', 'purple', 'green', 'orange', 'cyan', 'indigo']
                          const expertColor = colors[index % colors.length]
                          
                                                     return (
                             <CarouselItem key={expert.id} className="pl-2 pt-2 pb-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                              <Card className="h-full mx-2 transition-all duration-300 bg-[#ECF2FF] shadow-[-4px_4px_4px_0px_#A0A0A040,_4px_4px_4px_0px_#A0A0A040] relative group">
                                <div className="absolute inset-0 rounded-lg bg-[#008260] opacity-0 group-hover:opacity-5 transition-opacity duration-300 -z-10"></div>
                                <CardContent className="p-6 text-center relative group">
                                  {/* Subtle green glow effect on hover */}
                                  <div className="absolute inset-0 bg-[#008260]/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  
                                  {/* Expert Avatar */}
                                  <div className="relative mb-4">
                                    {expert.photo_url ? (
                                      <div className="w-20 h-20 rounded-full overflow-hidden mx-auto shadow-lg border-2 border-[#008260] relative z-10 transition-colors duration-300">
                                        <img 
                                          src={expert.photo_url} 
                                          alt={expert.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-20 h-20 rounded-full bg-[#008260] flex items-center justify-center mx-auto shadow-lg border-2 border-[#008260] relative z-10 overflow-hidden transition-colors duration-300">
                                        <Users className="h-8 w-8 text-white" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Expert Name */}
                                  <h3 className="font-bold text-slate-900 mb-1 text-lg relative z-10 transition-colors duration-300">
                                    {expert.name}
                                  </h3>
                                  
                                  {/* Rating Display */}
                                  <div className="flex justify-center items-center mb-2 relative z-10">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`h-4 w-4 ${i < Math.floor(expert.rating || 4.5) ? "text-yellow-400 fill-current" : "text-slate-300"}`} />
                                    ))}
                                    <span className="text-sm text-slate-600 ml-2 font-medium">
                                      {expert.rating || '4.5'}
                                    </span>
                                  </div>
                                  
                                  {/* Expertise */}
                                  <p className="text-sm text-slate-600 font-medium relative z-10 mb-1">
                                    {expert.domain_expertise?.join(', ') || 'Professional Expert'}
                                  </p>
                                  
                                  {/* Experience & Rate */}
                                  <p className="text-xs text-slate-500 relative z-10 mb-2">
                                    {expert.experience_years ? `${expert.experience_years}+ years` : 'Experienced'} • ₹{expert.hourly_rate || '1500'}/hr
                                  </p>
                                  
                                  {/* Bottom accent line with green glow */}
                                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-[#008260] rounded-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </CardContent>
                              </Card>
                            </CarouselItem>
                          )
                        })}
                      </CarouselContent>
                      <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                      <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                    </Carousel>
                  )}
                </div>
              </div>
                
            )
        }
       

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Recommended for You */}
      

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap gap-2 mb-6 mt-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMinRate('2000')}
            className="hover:bg-[#008260]/10 border-[#008260]/30"
          >
            <Star className="h-4 w-4 mr-2" />
            High Paying (₹2000+)
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedType('consulting')}
            className="hover:bg-[#008260]/10 border-[#008260]/30"
          >
            <Clock className="h-4 w-4 mr-2" />
            Consulting
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedType('training')}
            className="hover:bg-[#008260]/10 border-[#008260]/30"
          >
            <Users className="h-4 w-4 mr-2" />
            Training
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setSelectedType('all')
              setSelectedDomain('all')
              setMinRate('')
              setMaxRate('')
            }}
            className="hover:bg-slate-50"
          >
            Clear Filters
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-[#D6D6D6] p-4 sm:p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="type">Project Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getProjectTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="domain">Expertise Domain</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="All domains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All domains</SelectItem>
                  {EXPERTISE_DOMAINS.map((domain) => (
                    <SelectItem key={domain.name} value={domain.name}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="minRate">Min Rate (₹/hr)</Label>
              <Input
                id="minRate"
                type="number"
                placeholder="0"
                value={minRate}
                onChange={(e) => setMinRate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="maxRate">Max Rate (₹/hr)</Label>
              <Input
                id="maxRate"
                type="number"
                placeholder="10000"
                value={maxRate}
                onChange={(e) => setMaxRate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#000000] tracking-tight">
              Available Projects ({projects.length})
            </h2>
          </div>

       

          {projects.length === 0 && !projectsLoading ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No projects found</h3>
              <p className="text-slate-500">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(projects as Project[]).map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-all duration-300 hover:border hover:border-[#008260]  bg-white shadow-sm relative group">
                  <div className="absolute inset-0 rounded-lg bg-[#008260] opacity-0 group-hover:opacity-5 transition-opacity duration-300 -z-10"></div>
                  <CardContent className="p-4 sm:p-6">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <Link href={`/expert/project/${project.id}`}>
                            <h3 className="text-lg sm:text-xl font-semibold text-[#000000] cursor-pointer truncate">
                              {project.title}
                            </h3>
                          </Link>
                          <Badge className={`${getProjectTypeColor(project.type || '')} text-xs w-fit`}>
                            {getProjectTypeLabel(project.type || '')}
                          </Badge>
                        </div>
                        {/* <div className="flex items-center text-slate-600 text-sm mb-3">
                          <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="font-medium truncate">{project.institutions?.name}</span>
                        </div> */}
                        <p className="text-[#6A6A6A] text-sm line-clamp-2">
                          {project.description}
                        </p>
                      </div>
                      
                      {/* Price Section - Only show on larger screens */}
                      <div className="hidden lg:flex flex-col items-end space-y-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#008260]">
                            ₹{project.hourly_rate}
                          </div>
                          <div className="text-sm text-slate-500">per hour</div>
                        </div>
                       
                      </div>
                    </div>

                    {/* Skills and Specializations Section */}
                    <div className="mb-4 space-y-3">
                      {/* Skills */}
                   
                      
                      {/* Expertise Domain */}
                      {project.domain_expertise && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                          <span className="text-sm font-semibold min-w-fit text-[#6A6A6A]">Expertise Domain:</span>
                          <span className="text-[#6A6A6A] font-medium text-sm break-words">
                            {project.domain_expertise}
                          </span>
                        </div>
                      )}
                      
                      {/* Specializations */}
                      {project.subskills && project.subskills.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                          <span className="text-sm font-semibold min-w-fit text-[#6A6A6A]">Specializations:</span>
                          <span className="text-[#6A6A6A] font-medium text-sm break-words">
                            {project.subskills.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Section - Project Details and Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Project Details */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center font-medium text-base">
                          <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>{project.duration_hours} hours</span>
                        </div>
                        <div className="flex items-center font-medium text-base">
                          <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{project.start_date} - {project.end_date}</span>
                        </div>
                        
                        {/* Price for mobile */}
                        <div className="lg:hidden flex items-center">
                          <span className="text-lg font-bold text-[#008260]">
                            ₹{project.hourly_rate}/hour
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex space-x-2 flex-shrink-0">
                        <Button 
                          onClick={() => handleOpenApplicationModal(project.id)}
                          className="bg-[#008260] hover:bg-[#006d51] text-white text-sm px-4 py-2 font-medium shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                        >
                          <Send className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Apply Now</span>
                          <span className="sm:hidden">Apply</span>
                        </Button>
                        <Link href={`/expert/project/${project.id}`}>
                          <Button variant="outline" size="icon" className="border-[#008260] hover:border-[#006d51] hover:bg-[#008260]/10 flex-shrink-0 transition-all duration-200">
                            <Eye className="h-4 w-4 text-[#008260]" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Infinite Scroll Trigger */}
              {hasMoreProjects && (
                <div 
                  ref={(el) => {
                    if (el) {
                      const observer = new IntersectionObserver(([entry]) => {
                        if (entry.isIntersecting) {
                          loadMoreProjects();
                        }
                      }, { threshold: 0.1 });
                      observer.observe(el);
                      return () => observer.disconnect();
                    }
                  }}
                  className="flex justify-center py-8"
                >
                  {projectsLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-slate-600">Loading more projects...</span>
                    </div>
                  ) : (
                    <Button 
                      onClick={loadMoreProjects}
                      variant="outline"
                      className="border-slate-300"
                    >
                      Load More Projects
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Application Modal */}
        <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold text-[#000000]">Apply to Project</DialogTitle>
              <DialogDescription className="text-[#000000] text-sm font-normal font-sans">
                Submit your application for {(projects as Project[]).find(p => p.id === selectedProjectId)?.title || 'this project'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 ">
              <div className="space-y-2">
                <Label htmlFor="coverLetter" className="text-sm font-medium text-slate-700">Cover Letter</Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Explain why you're the perfect fit for this project..."
                  value={applicationForm.coverLetter}
                  onChange={(e) => setApplicationForm({...applicationForm, coverLetter: e.target.value})}
                  rows={4}
                  className="border-2 border-slate-200 focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposedRate" className="text-sm font-medium text-slate-700">Proposed Hourly Rate (₹)</Label>
                <Input
                  id="proposedRate"
                  type="number"
                  placeholder={expert?.hourly_rate?.toString() || "1500"}
                  value={applicationForm.proposedRate}
                  onChange={(e) => setApplicationForm({...applicationForm, proposedRate: e.target.value})}
                  className="border-2 border-slate-200 focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
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
                onClick={() => selectedProjectId && handleApplicationSubmit(selectedProjectId)}
                className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 py-2.5 rounded-lg"
                disabled={!applicationForm.coverLetter || !selectedProjectId || isApplying}
              >
                {isApplying ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  )
}
