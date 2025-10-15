'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { EXPERTISE_DOMAINS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MultiSelect } from '@/components/ui/multi-select'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Checkbox } from '@/components/ui/checkbox'
import Autoplay from 'embla-carousel-autoplay'
import { usePagination } from '@/hooks/usePagination'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import Logo from '@/components/Logo'
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Building2,
  Star,
  Eye,
  BookOpen,
  MessageSquare,
  Bell,
  Settings,
  Plus,
  UserCheck,
  GraduationCap,
  CheckCircle,
  Award,
  Briefcase
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type UserMeta = { role?: string; name?: string }
type SessionUser = { id: string; email?: string; user_metadata?: UserMeta }

export default function InstitutionHome() {
  type InstitutionProfile = {
    id?: string
    user_id?: string
    name?: string
    email?: string
    type?: string
    description?: string
    logo_url?: string
    rating?: number
    total_ratings?: number
    is_verified?: boolean
  }

  type Expert = {
    id: string
    name?: string
    email?: string
    bio?: string
    hourly_rate?: number
    rating?: number
    total_ratings?: number
    is_verified?: boolean
    domain_expertise?: string[]
    subskills?: string[]
    experience_years?: number
    photo_url?: string
    qualifications?: string
    resume_url?: string
  }

  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<InstitutionProfile | null>(null)
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [minRate, setMinRate] = useState('')
  const [maxRate, setMaxRate] = useState('')
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    type: '',
    hourly_rate: '',
    total_budget: '',
    start_date: '',
    end_date: '',
    duration_hours: '',
    required_expertise: '',
    domain_expertise: '',
    subskills: [] as string[]
  })
  const [submittingProject, setSubmittingProject] = useState(false)
  const [selectedSubskills, setSelectedSubskills] = useState<string[]>([])
  const [availableSubskills, setAvailableSubskills] = useState<string[]>([])
  const [partneredInstitutions, setPartneredInstitutions] = useState<any[]>([])
  const [institutionsLoading, setInstitutionsLoading] = useState(true)
  // Featured experts (top-rated, independent of filters)
  const [featuredExperts, setFeaturedExperts] = useState<Expert[]>([])
  const [featuredLoading, setFeaturedLoading] = useState(false)
  // Infinite experts list (filtered)
  const {
    data: allExperts,
    loading: expertsListLoading,
    hasMore: hasMoreExperts,
    loadMore: loadMoreExperts,
    refresh: refreshExpertsList
  } = usePagination(
    async (page: number) => {
      const params: any = {
        page,
        limit: 10,
        is_verified: true
      }
      if (searchTerm) params.search = searchTerm
      if (selectedDomain && selectedDomain !== 'all') params.domain_expertise = selectedDomain
      if (minRate) params.min_hourly_rate = parseFloat(minRate)
      if (maxRate) params.max_hourly_rate = parseFloat(maxRate)
      const data = await api.experts.getAll(params)
      return Array.isArray(data) ? data : (data?.data || [])
    },
    [searchTerm, selectedDomain, minRate, maxRate]
  )
  
  // Expert selection modal state
  const [showExpertSelectionModal, setShowExpertSelectionModal] = useState(false)
  const [recommendedExperts, setRecommendedExperts] = useState<any[]>([])
  const [expertsLoading, setExpertsLoading] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedExperts, setSelectedExperts] = useState<string[]>([])
  // Per-expert quick select modal
  const [showQuickSelectModal, setShowQuickSelectModal] = useState(false)
  const [quickSelectExpert, setQuickSelectExpert] = useState<Expert | null>(null)
  const [institutionProjects, setInstitutionProjects] = useState<any[]>([])
  const [quickSelectedProjectId, setQuickSelectedProjectId] = useState<string | null>(null)
  const [sendingQuickMessage, setSendingQuickMessage] = useState(false)
  // Infinite list sentinel
  const expertsListEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = expertsListEndRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && hasMoreExperts && !expertsListLoading) {
        loadMoreExperts()
      }
    }, { root: null, rootMargin: '200px', threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMoreExperts, expertsListLoading, loadMoreExperts, allExperts])

  const router = useRouter()

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

  // Reuse existing loadInstitutionData pattern
  const loadInstitutionData = async (userId: string) => {
    try {
      setLoading(true)
      const institutionProfile = await api.institutions.getByUserId(userId)
     
      
      if (!institutionProfile) {
        router.push('/institution/profile-setup')
        return
      }
      
      setInstitution(institutionProfile)
      
      // Load experts
      await loadExperts()
      
    } catch (error: any) {
      setError('Failed to load institution data')
      console.error('Institution home error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExperts = async () => {
    try {
      // Filter out undefined values to avoid sending "undefined" in URL
      const params: any = {
        is_verified: true
      }
      
      if (searchTerm) params.search = searchTerm
      if (selectedDomain && selectedDomain !== 'all') params.domain_expertise = selectedDomain
      if (minRate) params.min_hourly_rate = parseFloat(minRate)
      if (maxRate) params.max_hourly_rate = parseFloat(maxRate)

      const data = await api.experts.getAll(params)
      setExperts(Array.isArray(data) ? data : (data?.data || []))
    } catch (error) {
      console.error('Error fetching experts:', error)
      setError('Failed to load experts')
    }
  }

  // Load featured experts: top-rated, limit 10, rating >= 4
  const loadFeaturedExperts = async () => {
    try {
      setFeaturedLoading(true)
      const data = await api.experts.getAll({
        limit: 10,
        is_verified: true,
        min_rating: 4,
        sort_by: 'rating',
        sort_order: 'desc'
      })
      setFeaturedExperts(Array.isArray(data) ? data : (data?.data || []))
    } catch (e) {
      console.error('Error loading featured experts:', e)
    } finally {
      setFeaturedLoading(false)
    }
  }

  const loadInstitutionProjects = async () => {
    if (!institution?.id) return
    try {
      // Fetch all open projects for this institution
      const projects = await api.projects.getAll({ institution_id: institution.id, status: 'open', limit: 100 })
      const list = Array.isArray(projects) ? projects : (projects?.data || [])
      setInstitutionProjects(list)
      // Preselect first if exists
      if (!quickSelectedProjectId && list.length > 0) {
        setQuickSelectedProjectId(list[0].id)
      }
    } catch (e) {
      console.error('Error loading institution projects:', e)
    }
  }

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const currentUser = await getUser()
        if (!currentUser) return

        const userRole = currentUser.user_metadata?.role
        if (userRole !== 'institution') {
          router.push('/')
          return
        }
        
        await loadInstitutionData(currentUser.id)
      } catch (error: any) {
        setError('Failed to get user data')
        console.error('Error getting user:', error)
      }
    }
    initializeUser()
  }, [router])

  useEffect(() => {
    if (institution) {
      // loadExperts()
      loadPartneredInstitutions()
      loadInstitutionProjects()
      loadFeaturedExperts()
    }
  }, [institution])

  useEffect(() => {
    // Refresh only the infinite list when filters change
    if (institution) {
      refreshExpertsList()
    }
  }, [searchTerm, selectedDomain, minRate, maxRate])

  // useEffect(()=>{
  //    loadRecommendedExperts('cb2b9213-077c-4115-845d-8699d489d2d6')
  // },[showExpertSelectionModal])

  const handleDomainChange = (domain: string) => {
    setProjectForm(prev => ({
      ...prev,
      domain_expertise: domain,
      subskills: [] // Reset subskills when domain changes
    }))
    
    // Find the selected domain and update available subskills
    const selectedDomain = EXPERTISE_DOMAINS.find(d => d.name === domain)
    if (selectedDomain) {
      setAvailableSubskills([...selectedDomain.subskills])
    } else {
      setAvailableSubskills([])
    }
    
    // Reset selected subskills
    setSelectedSubskills([])
  }

  const handleSubskillChange = (newSubskills: string[]) => {
    setSelectedSubskills(newSubskills)
    setProjectForm(prev => ({
      ...prev,
      subskills: newSubskills
    }))
  }

  const loadPartneredInstitutions = async () => {
    try {
      setInstitutionsLoading(true)
      const data = await api.institutions.getAll({ limit: 8 })
      const institutions = Array.isArray(data) ? data : (data?.data || [])
      
      // Filter out current institution if institution is loaded
      const filteredInstitutions = institution?.id 
        ? institutions.filter((inst: any) => inst.id !== institution.id)
        : institutions
      
      setPartneredInstitutions(filteredInstitutions.slice(0, 6)) // Show max 6 institutions
    } catch (error) {
      console.error('Error fetching partnered institutions:', error)
    } finally {
      setInstitutionsLoading(false)
    }
  }

  const loadRecommendedExperts = async (projectId: string) => {
    try {
      setExpertsLoading(true)
      setSelectedProjectId(projectId)
      const data = await api.experts.getRecommended(projectId)
      setRecommendedExperts(Array.isArray(data) ? data : [])
      setShowExpertSelectionModal(true)
    } catch (error) {
      console.error('Error fetching recommended experts:', error)
      toast.error('Failed to load expert recommendations')
    } finally {
      setExpertsLoading(false)
    }
  }

  const handleExpertSelection = (expertId: string) => {
    setSelectedExperts(prev => 
      prev.includes(expertId) 
        ? prev.filter(id => id !== expertId)
        : [...prev, expertId]
    )
  }

  const handleSelectExperts = async () => {
    if (selectedExperts.length === 0) {
      toast.error('Please select at least one expert')
      return
    }

    if (!selectedProjectId) {
      toast.error('No project selected')
      return
    }

    try {
      // Check application status for all selected experts
      const applicationStatuses = await api.applications.checkStatus(selectedProjectId, selectedExperts)
      
      // Get project and institution details for notifications
      const projectDetails = await api.projects.getById(selectedProjectId)
      const institutionDetails = await api.institutions.getById(institution?.id || '')
      
      if (!projectDetails || !institutionDetails) {
        toast.error('Failed to get project or institution details')
        return
      }

      // Separate experts into two groups
      const expertsWithApplications = []
      const expertsWithoutApplications = []

      for (const status of applicationStatuses) {
        const expert = recommendedExperts.find(e => e.id === status.expertId)
        if (!expert) continue

        if (status.hasApplied) {
          expertsWithApplications.push(expert)
        } else {
          expertsWithoutApplications.push(expert)
        }
      }

      // Create bookings for experts who have already applied
      for (const expert of expertsWithApplications) {
        try {
          // Check if a booking already exists for this expert and project
          const existing = await api.bookings.getAll({ expert_id: expert.id, project_id: selectedProjectId, page: 1, limit: 1 })
          const existingCount = Array.isArray(existing) ? existing.length : (existing?.data?.length || 0)
          if (existingCount > 0) {
            continue
          }
          // Create booking using existing API
          const bookingData = {
            expert_id: expert.id,
            project_id: selectedProjectId,
            institution_id: institution?.id,
            amount: projectDetails.hourly_rate,
            start_date: new Date().toISOString().split('T')[0],
            end_date: projectDetails.end_date,
            status: 'in_progress',
            hours_booked: projectDetails.duration_hours
          }

          await api.bookings.create(bookingData)

          // Update application status for this expert and project
          const appsResp = await api.applications.getAll({ expert_id: expert.id, project_id: selectedProjectId, page: 1, limit: 1 })
          const appId = Array.isArray(appsResp) ? appsResp[0]?.id : (appsResp?.data?.[0]?.id)
          if (appId) {
            await api.applications.update(appId, { status: 'accepted', reviewed_at: new Date().toISOString() })
          }
          
          // Send custom notification for selected expert with booking
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/send-expert-selected`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              expertId: expert.id,
              projectTitle: projectDetails.title,
              institutionName: institutionDetails.name,
              projectId: selectedProjectId,
              type: 'expert_selected_with_booking'
            })
          })
        } catch (error) {
          console.error(`Error creating booking for expert ${expert.id}:`, error)
        }
      }

      // Send interest notifications for experts who haven't applied
      for (const expert of expertsWithoutApplications) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/send-expert-interest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              expertId: expert.id,
              projectTitle: projectDetails.title,
              institutionName: institutionDetails.name,
              projectId: projectDetails.id,
              type: 'expert_interest_shown'
            })
          })
        } catch (error) {
          console.error(`Error sending interest notification to expert ${expert.id}:`, error)
        }
      }

      // Show success message
      const bookingCount = expertsWithApplications.length
      const interestCount = expertsWithoutApplications.length
      
      let message = `Successfully processed ${selectedExperts.length} experts: `
      if (bookingCount > 0) message += `${bookingCount} bookings created, `
      if (interestCount > 0) message += `${interestCount} interest notifications sent`
      
      toast.success(message)
      setShowExpertSelectionModal(false)
      setSelectedExperts([])
      setSelectedProjectId(null)
    } catch (error) {
      console.error('Error selecting experts:', error)
      toast.error('Failed to select experts')
    }
  }

  const handleCreateProject = async () => {
    // Frontend validation
    if (!projectForm.title.trim()) {
      toast.error('Project title is required.')
      return
    }
    
    if (!projectForm.type) {
      toast.error('Project type is required.')
      return
    }
    
    if (!projectForm.hourly_rate || parseFloat(projectForm.hourly_rate) <= 0) {
      toast.error('Valid hourly rate is required.')
      return
    }
    
    if (!projectForm.total_budget || parseFloat(projectForm.total_budget) <= 0) {
      toast.error('Valid total budget is required.')
      return
    }
    
    if (!projectForm.start_date) {
      toast.error('Start date is required.')
      return
    }
    
    if (!projectForm.end_date) {
      toast.error('End date is required.')
      return
    }
    
    if (!projectForm.duration_hours || parseInt(projectForm.duration_hours) <= 0) {
      toast.error('Valid duration in hours is required.')
      return
    }
    
    if (!projectForm.domain_expertise) {
      toast.error('Domain expertise is required.')
      return
    }
    
    if (!projectForm.subskills || projectForm.subskills.length === 0) {
      toast.error('At least one specialization is required.')
      return
    }
    
    if (!projectForm.description.trim()) {
      toast.error('Project description is required.')
      return
    }
    
    // Validate date logic
    const startDate = new Date(projectForm.start_date)
    const endDate = new Date(projectForm.end_date)
    
    if (endDate <= startDate) {
      toast.error('End date must be after start date.')
      return
    }

    try {
      setSubmittingProject(true)
      
      const projectData = {
        ...projectForm,
        institution_id: institution?.id,
        hourly_rate: parseFloat(projectForm.hourly_rate),
        total_budget: parseFloat(projectForm.total_budget),
        duration_hours: parseInt(projectForm.duration_hours),
        required_expertise: projectForm.required_expertise.split(',').map(s => s.trim()).filter(s => s),
        domain_expertise: projectForm.domain_expertise,
        subskills: projectForm.subskills
      }

      const response = await api.projects.create(projectData)
      
      // Reset form
      setProjectForm({
        title: '',
        description: '',
        type: '',
        hourly_rate: '',
        total_budget: '',
        start_date: '',
        end_date: '',
        duration_hours: '',
        required_expertise: '',
        domain_expertise: '',
        subskills: []
      })
      
      setSelectedSubskills([])
      setAvailableSubskills([])
      
      setShowProjectForm(false)
      
      // Show success toast with dashboard navigation
      toast.success('Requirement posted successfully!', {
        description: 'Navigate to your dashboard to view the latest requirement and manage applications.',
        action: {
          label: 'Go to Dashboard',
          onClick: () => router.push('/institution/dashboard')
        },
        duration: 5000
      })
      
      // Load recommended experts for the new project
      if (response && response.id) {
        await loadRecommendedExperts(response.id)
      }
      
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project. Please try again or contact support if the issue persists.')
    } finally {
      setSubmittingProject(false)
    }
  }

  const getDomainColor = (domain: string) => {
    const colors: { [key: string]: string } = {
      'Computer Science & IT': 'bg-blue-100 text-blue-800',
      'Engineering': 'bg-green-100 text-green-800',
      'Business & Management': 'bg-purple-100 text-purple-800',
      'Finance & Economics': 'bg-yellow-100 text-yellow-800',
      'Healthcare & Medicine': 'bg-red-100 text-red-800',
      'Education & Training': 'bg-indigo-100 text-indigo-800',
      'Research & Development': 'bg-pink-100 text-pink-800',
      'Marketing & Sales': 'bg-orange-100 text-orange-800',
      'Data Science & Analytics': 'bg-teal-100 text-teal-800',
      'Design & Creative': 'bg-rose-100 text-rose-800',
      'Law & Legal': 'bg-amber-100 text-amber-800'
    }
    return colors[domain] || 'bg-gray-100 text-gray-800'
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
    <div className="bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-[#008260] sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/institution/home" className="flex items-center group">
              <Logo size="header" />
            </Link>

            {/* Navigation */}
          

            {/* Right side */}
            <div className="flex items-center space-x-4">
             
            {institution?.type && institution.type !== 'Corporate' && (
                <Link href="/institution/internships/opportunities">
                  <p className="hidden md:inline-flex text-white text-[15px] font-medium">Browse Internships</p>
                </Link>
              )}
          
                <ProfileDropdown 
                user={user} 
                institution={institution} 
                userType="institution" 
              />
               <div className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200">
                <NotificationBell />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Partnered Institutions Banner */}
      {partneredInstitutions.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-[28px] font-semibold text-[#000000] mb-1">
                Partner Institutions
              </h2>
              <p className="text-[#000000CC] text-base font-normal">
                Join our network of leading educational institutions
              </p>
            </div>

            {institutionsLoading ? (
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
                <CarouselContent className="-ml-2">
                  {partneredInstitutions.map((institution, index) => {
                    // Use real institution banner images from public folder
                    const institutionImages = [
                      '/images/universitylogo1.jpeg',
                      '/images/universitylogo2.jpeg', 
                      '/images/universitylogo3.jpeg',
                      '/images/universitylogo1.jpeg', // Reuse for more than 3
                      '/images/universitylogo2.jpeg'
                    ]
                    
                    return (
                      <CarouselItem key={institution.id} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/2">
                        <div className="relative h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
                          {/* Background Image */}
                          <div 
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                              backgroundImage: `url('${institutionImages[index % institutionImages.length]}')`
                            }}
                          >
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                          </div>
                          
                          {/* Institution Name */}
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <h3 className="text-white font-bold text-xl mb-2 group-hover:text-blue-200 transition-colors duration-300">
                              {institution.name}
                            </h3>
                            <p className="text-white/90 text-base mb-1">
                              {institution.institution_type || 'Educational Institution'}
                            </p>
                            <p className="text-white/80 text-sm">
                              {[institution.city, institution.state, institution.country].filter(Boolean).join(', ') || 'India'}
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
      )}

      {/* Featured Experts (Top-rated) - moved above filters */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-[28px] font-semibold text-[#000000] mb-1">Featured Experts</h2>
            <p className="text-[#000000CC] text-base font-normal">Top-rated experts (4.0+), curated for you</p>
          </div>
          {featuredLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260]"></div>
            </div>
          ) : (
            <Carousel className="w-full"
              opts={{ align: 'start', containScroll: 'trimSnaps' }}
              plugins={[Autoplay({ delay: 3000 })]}
            >
              <CarouselContent className="-ml-2 md:-ml-4 pb-4">
                {featuredExperts.map((expert) => (
                  <CarouselItem key={expert.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="bg-[#ECF2FF]  shadow-[-4px_4px_4px_0px_#A0A0A040,_4px_4px_4px_0px_#A0A0A040] rounded-xl transition-all duration-300 group border-2 border-[#D6D6D6]">
                      <CardHeader>
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={expert.photo_url} alt={expert.name} />
                            <AvatarFallback className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
                              {expert.name?.charAt(0) || 'E'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg line-clamp-1">{expert.name}</CardTitle>
                            <div className='flex gap-2 flex-wrap'>
                            <div className="flex items-center text-slate-600 text-sm">
                              <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                              {expert.rating?.toFixed(1) || '0.0'} ({expert.total_ratings || 0})
                            </div>
                            <div className="flex items-center text-slate-600 text-sm">₹{expert.hourly_rate}/hour</div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="truncate mb-4">{expert.bio}</CardDescription>
                        {expert.domain_expertise && expert.domain_expertise.length > 0 && (
                          <div className="mb-4">
                            <div className="flex flex-wrap gap-1">
                              {expert.domain_expertise.slice(0, 2).map((domain: string, index: number) => (
                                <Badge key={index} className={`text-xs bg-[#EBDA98] hover:bg-[#EBDA98] rounded-sm text-black py-[6px]`}>{domain}</Badge>
                              ))}
                              {expert.domain_expertise.length > 2 && (
                                <Badge variant="secondary" className="text-xs">+{expert.domain_expertise.length - 2} more</Badge>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <Button className="flex-1 bg-[#008260] text-white rounded-md hover:bg-[#008260]" onClick={() => { setQuickSelectExpert(expert); setShowQuickSelectModal(true); }}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Select Expert
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon" className="border-2 border-slate-300 bg-[#ECF2FF] transition-all duration-300">
                                <Eye className="h-4 w-4 text-[#008260]" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                              <DialogHeader className="flex-shrink-0">
                                <DialogTitle>{expert.name}</DialogTitle>
                                <DialogDescription>Complete Expert Profile</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                                <div className="flex items-center space-x-4 mb-4">
                                  <Avatar className="w-16 h-16 border-2 border-blue-200 flex-shrink-0">
                                    <AvatarImage src={expert.photo_url} />
                                    <AvatarFallback className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
                                      {expert.name?.charAt(0) || 'E'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-lg truncate">{expert.name}</h4>
                                    <p className="text-sm text-gray-600 truncate">{expert.domain_expertise?.join(', ')}</p>
                                  </div>
                                </div>
                                <div className="max-h-32 overflow-y-auto">
                                  <h4 className="font-medium mb-2">Professional Bio</h4>
                                  <p className="text-sm text-gray-600 leading-relaxed">{expert.bio}</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <h4 className="font-medium mb-1">Domain Expertise</h4>
                                    <p className="text-sm">{expert.domain_expertise?.join(', ')}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Hourly Rate</h4>
                                    <p className="text-sm">₹{expert.hourly_rate}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Experience</h4>
                                    <p className="text-sm">{expert.experience_years || 0} years</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Contact</h4>
                                    <p className="text-sm">{expert.email}</p>
                                  </div>
                                </div>
                                {expert.subskills && expert.subskills.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Specializations</h4>
                                    <div className="max-h-24 overflow-y-auto">
                                      <div className="flex flex-wrap gap-2">
                                        {expert.subskills.map((skill: string, index: number) => (
                                          <Badge key={index} variant="secondary" className="text-xs">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {expert.qualifications && (
                                  <div>
                                    <h4 className="font-medium mb-1">Qualifications</h4>
                                    <div className="max-h-20 overflow-y-auto">
                                      <p className="text-sm leading-relaxed">{expert.qualifications}</p>
                                    </div>
                                  </div>
                                )}
                                {/* {expert.resume_url && (
                                  <div>
                                    <h4 className="font-medium mb-1">Resume</h4>
                                    <a 
                                      href={expert.resume_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline text-sm"
                                    >
                                      View Resume
                                    </a>
                                  </div>
                                )} */}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className='text-slate-600 hover:text-slate-900 hidden sm:block' />
              <CarouselNext className='text-slate-600 hover:text-slate-900 hidden sm:block' />
            </Carousel>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-black mb-2 leading-tight">
            Welcome back, <span className='text-[#008260]'> {institution?.name}! </span>
          </h1>
          <p className="text-lg text-[#000000CC] font-medium leading-relaxed">
            Connect with top experts and create impactful learning experiences
          </p>
        </div>

        {/* Post Requirement Section */}
        <div className="bg-white rounded-2xl  border-2 border-[#D6D6D6] p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
            <div>
              <h2 className="text-2xl font-bold text-black mb-1">Post a New Requirement</h2>
              <p className="text-[#000000CC] text-lg font-normal">
                Create opportunities for experts to collaborate with your institution
              </p>
            </div>
            <Dialog open={false}>
              <DialogTrigger asChild>
                <Button className="bg-[#008260] hover:bg-[#008260] text-sm font-semibold" onClick={() => router.push('/institution/post-requirement')}>
                  <Plus className="h-3 w-3 mr-1 border border-white rounded-full" />
                  Post Requirement
                </Button>
              </DialogTrigger>
              <DialogContent className="hidden">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle></DialogTitle>
                  <DialogDescription>
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 pr-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Project Title *</Label>
                    <Input
                      id="title"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                      placeholder="e.g., Guest Lecture on AI"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Project Type *</Label>
                    <Select value={projectForm.type} onValueChange={(value) => setProjectForm({...projectForm, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guest_lecture">Guest Lecture</SelectItem>
                        <SelectItem value="fdp">Faculty Development Program</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="curriculum_dev">Curriculum Development</SelectItem>
                        <SelectItem value="research_collaboration">Research Collaboration</SelectItem>
                        <SelectItem value="training_program">Training Program</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hourly_rate">Hourly Rate (₹) *</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      min="1"
                      value={projectForm.hourly_rate}
                      onChange={(e) => setProjectForm({...projectForm, hourly_rate: e.target.value})}
                      placeholder="1000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_budget">Total Budget (₹) *</Label>
                    <Input
                      id="total_budget"
                      type="number"
                      min="1"
                      value={projectForm.total_budget}
                      onChange={(e) => setProjectForm({...projectForm, total_budget: e.target.value})}
                      placeholder="50000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_hours">Duration (Hours) *</Label>
                    <Input
                      id="duration_hours"
                      type="number"
                      min="1"
                      value={projectForm.duration_hours}
                      onChange={(e) => setProjectForm({...projectForm, duration_hours: e.target.value})}
                      placeholder="40"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="domain_expertise">Domain Expertise *</Label>
                    <Select value={projectForm.domain_expertise} onValueChange={handleDomainChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select required domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERTISE_DOMAINS.map((domain) => (
                          <SelectItem key={domain.name} value={domain.name}>
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="required_expertise">Additional Skills (comma-separated)</Label>
                    <Input
                      id="required_expertise"
                      value={projectForm.required_expertise}
                      onChange={(e) => setProjectForm({...projectForm, required_expertise: e.target.value})}
                      placeholder="AI, Machine Learning, Data Science"
                    />
                  </div>
                </div>
                
                {/* Subskills Multi-Select */}
                {projectForm.domain_expertise && availableSubskills.length > 0 && (
                  <div className='my-3' onClick={(e) => e.stopPropagation()}>
                    <Label className="text-slate-700" htmlFor="required_specialization">Required Specializations *</Label>
                    <MultiSelect
                      options={availableSubskills}
                      selected={selectedSubskills}
                      onSelectionChange={handleSubskillChange}
                      placeholder="Select required specializations..."
                      className="w-full"
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    placeholder="Describe the project requirements..."
                    rows={4}
                    required
                  />
                </div>
                </div>
                <div className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t border-slate-200">
                  <Button variant="outline" onClick={() => setShowProjectForm(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateProject}
                    disabled={submittingProject}
                    className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {submittingProject ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border-2 border-[#D6D6D6] p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Experts</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search experts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="domain">Domain Expertise</Label>
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

        {/* All Experts (List View with infinite scrolling) */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#000000]">All Experts</h2>
            <span className="text-slate-600">{(allExperts || []).length} loaded</span>
          </div>
          {(!allExperts || allExperts.length === 0) && !expertsListLoading ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No experts found</h3>
              <p className="text-slate-500">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allExperts?.map((expert: any) => (
                <Card key={expert.id} className="transition-all duration-300 border-2 border-[#D6D6D6] bg-white rounded-[18px]">
                  <CardContent className="p-4">
                    {/* Mobile Layout */}
                    <div className="block sm:hidden">
                      {/* Avatar, Name, Rating - Centered */}
                      <div className="flex flex-col items-center text-center mb-4">
                        <Avatar className="w-12 h-12 mb-2">
                          <AvatarImage src={expert.photo_url} alt={expert.name} />
                          <AvatarFallback className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
                            {expert.name?.charAt(0) || 'E'}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="text-lg font-semibold text-slate-900 truncate mb-1">{expert.name}</h3>
                        <div className="flex items-center text-slate-600 text-sm">
                          <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                          {expert.rating?.toFixed(1) || '0.0'} ({expert.total_ratings || 0})
                        </div>
                      </div>
                      
                      {/* Description and other info */}
                      <p className="text-slate-600 text-sm line-clamp-2 mt-1">{expert.bio}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {expert.domain_expertise?.slice(0, 3)?.map((d: string, i: number) => (
                          <Badge key={i} className={`text-xs bg-[#EBDA98] hover:bg-[#EBDA98] rounded-sm text-black py-[6px]`}>{d}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                        <span>₹{expert.hourly_rate}/hour</span>
                        {expert.experience_years ? <span>{expert.experience_years}+ yrs</span> : null}
                      </div>
                      
                      {/* Buttons - Select stretched, Eye in corner */}
                      <div className="flex gap-2 mt-4">
                        <Button 
                          className="flex-1 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white" 
                          onClick={() => { setQuickSelectExpert(expert); setShowQuickSelectModal(true); }}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Select
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 flex-shrink-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                            <DialogHeader className="flex-shrink-0">
                              <DialogTitle>{expert.name}</DialogTitle>
                              <DialogDescription>Complete Expert Profile</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                              <div className="flex items-center space-x-4 mb-4">
                                <Avatar className="w-16 h-16 border-2 border-blue-200 flex-shrink-0">
                                  <AvatarImage src={expert.photo_url} />
                                  <AvatarFallback className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
                                    {expert.name?.charAt(0) || 'E'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-lg truncate">{expert.name}</h4>
                                  <p className="text-sm text-gray-600 truncate">{expert.domain_expertise?.join(', ')}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4 mb-4">
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">{expert.rating?.toFixed(1) || '0.0'}</span>
                                  <span className="text-gray-500 ml-1">({expert.total_ratings || 0})</span>
                                </div>
                                <div className="text-lg font-bold text-green-600">
                                  ₹{expert.hourly_rate}/hour
                                </div>
                              </div>
                              <div className="mb-4">
                                <h5 className="font-medium mb-2">About</h5>
                                <p className="text-sm text-gray-600">{expert.bio}</p>
                              </div>
                              <div className="mb-4">
                                <h5 className="font-medium mb-2">Domain Expertise</h5>
                                <div className="flex flex-wrap gap-1">
                                  {expert.domain_expertise?.map((domain: string, index: number) => (
                                    <Badge key={index} className={`text-xs ${getDomainColor(domain)}`}>
                                      {domain}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              {expert.experience_years && (
                                <div className="mb-4">
                                  <h5 className="font-medium mb-2">Experience</h5>
                                  <p className="text-sm text-gray-600">{expert.experience_years}+ years</p>
                                </div>
                              )}
                              {expert.certifications && expert.certifications.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="font-medium mb-2">Certifications</h5>
                                  <div className="space-y-1">
                                    {expert.certifications.map((cert: string, index: number) => (
                                      <p key={index} className="text-sm text-gray-600">• {cert}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {expert.education && expert.education.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="font-medium mb-2">Education</h5>
                                  <div className="space-y-1">
                                    {expert.education.map((edu: string, index: number) => (
                                      <p key={index} className="text-sm text-gray-600">• {edu}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Desktop Layout - Keep original */}
                    <div className="hidden sm:flex items-stretch gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={expert.photo_url} alt={expert.name} />
                        <AvatarFallback className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
                          {expert.name?.charAt(0) || 'E'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-2">
                          <h3 className="text-lg font-semibold text-[#000000] truncate">{expert.name}</h3>
                          <div className="flex items-center text-[#000000] font-semibold text-sm">
                            <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                            {expert.rating?.toFixed(1) || '0.0'} ({expert.total_ratings || 0})
                          </div>
                        </div>
                        <p className="text-slate-600 text-sm line-clamp-2 mt-1">{expert.bio}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {expert.domain_expertise?.slice(0, 3)?.map((d: string, i: number) => (
                            <Badge key={i} className={`text-xs bg-[#EBDA98] hover:bg-[#EBDA98] rounded-sm text-black py-[6px]`}>{d}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#6A6A6A] font-medium mt-3">
                          <span>₹{expert.hourly_rate}/hour</span>
                          {expert.experience_years ? <span>{expert.experience_years}+ yrs</span> : null}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2 flex gap-2 items-end flex-1 justify-end h-full">
                        <div className='flex gap-2'>
                        <Button className="bg-[#008260] hover:bg-[#008260] text-white rounded-3xl text-sm" onClick={() => { setQuickSelectExpert(expert); setShowQuickSelectModal(true); }}>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Select
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="border-2 border-slate-300 bg-[#ECF2FF] transition-all duration-300">
                                <Eye className="h-4 w-4 text-[#008260]" />
                              </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                            <DialogHeader className="flex-shrink-0">
                              <DialogTitle>{expert.name}</DialogTitle>
                              <DialogDescription>Complete Expert Profile</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                              <div className="flex items-center space-x-4 mb-4">
                                <Avatar className="w-16 h-16 border-2 border-blue-200 flex-shrink-0">
                                  <AvatarImage src={expert.photo_url} />
                                  <AvatarFallback className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
                                    {expert.name?.charAt(0) || 'E'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-lg truncate">{expert.name}</h4>
                                  <p className="text-sm text-gray-600 truncate">{expert.domain_expertise?.join(', ')}</p>
                                </div>
                              </div>
                              <div className="max-h-32 overflow-y-auto">
                                <h4 className="font-medium mb-2">Professional Bio</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">{expert.bio}</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <h4 className="font-medium mb-1">Domain Expertise</h4>
                                  <p className="text-sm">{expert.domain_expertise?.join(', ')}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Hourly Rate</h4>
                                  <p className="text-sm">₹{expert.hourly_rate}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Experience</h4>
                                  <p className="text-sm">{expert.experience_years || 0} years</p>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Contact</h4>
                                  <p className="text-sm">{expert.email}</p>
                                </div>
                              </div>
                              {expert.subskills && expert.subskills.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Specializations</h4>
                                  <div className="max-h-24 overflow-y-auto">
                                    <div className="flex flex-wrap gap-2">
                                      {expert.subskills.map((skill: string, index: number) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {skill}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {expert.qualifications && (
                                <div>
                                  <h4 className="font-medium mb-1">Qualifications</h4>
                                  <div className="max-h-20 overflow-y-auto">
                                    <p className="text-sm leading-relaxed">{expert.qualifications}</p>
                                  </div>
                                </div>
                              )}
                              {/* {expert.resume_url && (
                                <div>
                                  <h4 className="font-medium mb-1">Resume</h4>
                                  <a 
                                    href={expert.resume_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm"
                                  >
                                    View Resume
                                  </a>
                                </div>
                              )} */}
                            </div>
                          </DialogContent>
                        </Dialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Infinite sentinel */}
              <div ref={expertsListEndRef} />
              {expertsListLoading && (
                <div className="flex justify-center py-6 text-slate-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#008260] mr-2"></div>
                  Loading more experts...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expert Selection Modal */}
        <Dialog open={showExpertSelectionModal} onOpenChange={setShowExpertSelectionModal}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Select Recommended Experts</DialogTitle>
              <DialogDescription>
                Choose experts who match your project requirements. They will be notified about your project.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {expertsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260]"></div>
                </div>
              ) : recommendedExperts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No matching experts found for this project.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendedExperts.map((expert) => (
                    <Card key={expert.id} className={`relative transition-all duration-200 hover:shadow-md ${
                      selectedExperts.includes(expert.id) 
                        ? 'bg-blue-50/50' 
                        : 'hover:border-blue-300'
                    }`}>
                      <CardContent className="p-4">
                        {/* Desktop view icon (top-right) */}
                        <Link
                          href={`/experts/${expert.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hidden sm:inline-flex items-center justify-center absolute top-3 right-3 rounded-md p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          aria-label="View expert profile"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          {/* Expert Info */}
                          <div className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0 gap-3 sm:gap-4">
                            {/* Expert Photo */}
                            <div className="flex-shrink-0 mx-auto sm:mx-0">
                              {expert.photo_url ? (
                                <img
                                  src={expert.photo_url}
                                  alt={expert.name}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                                  {expert.name?.charAt(0) || 'E'}
                                </div>
                              )}
                            </div>
                            
                            {/* Expert Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row items-center gap-2 mb-1 relative w-full">
                                <div className="w-full sm:w-auto">
                                  <h3 className="text-lg font-semibold text-slate-900 truncate mx-auto text-center sm:text-left">
                                    {expert.name}
                                  </h3>
                                </div>
                                {/* Mobile view icon (inline, right) */}
                                <Link
                                  href={`/experts/${expert.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                                  aria-label="View expert profile"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                                <div className="flex items-center gap-2">
                                  {expert.is_verified && (
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      Verified
                                    </Badge>
                                  )}
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    {expert.matchScore}% Match
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row items-center text-slate-600 text-sm mb-2 gap-1 sm:gap-0">
                                <span className="font-medium">₹{expert.hourly_rate}/hour</span>
                                <span className="hidden sm:inline mx-2">•</span>
                                <span>{expert.experience_years || 0} years experience</span>
                                <span className="hidden sm:inline mx-2">•</span>
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                  <span>{expert.rating || 0}</span>
                                </div>
                              </div>
                              
                              <p className="text-slate-600 text-sm line-clamp-2 mb-2">
                                {expert.bio}
                              </p>
                              
                              {/* Skills */}
                              {expert.subskills && expert.subskills.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {expert.subskills.slice(0, 3).map((skill: string, index: number) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {expert.subskills.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{expert.subskills.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Select Button */}
                          <div className="flex-shrink-0 w-full sm:w-auto sm:ml-4">
                            <Button
                              variant={selectedExperts.includes(expert.id) ? "default" : "outline"}
                              onClick={() => handleExpertSelection(expert.id)}
                              className={`w-full sm:w-auto ${selectedExperts.includes(expert.id) 
                                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                : "border-blue-300 text-blue-600 hover:bg-blue-50"
                              }`}
                            >
                              {selectedExperts.includes(expert.id) ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Selected
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Select
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                {selectedExperts.length} expert{selectedExperts.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowExpertSelectionModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSelectExperts}
                  disabled={selectedExperts.length === 0}
                  className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300"
                >
                  Send Request ({selectedExperts.length})
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Select Expert Modal */}
        <Dialog open={showQuickSelectModal} onOpenChange={(open) => {
          setShowQuickSelectModal(open)
          if (!open) {
            setQuickSelectedProjectId(null)
            setQuickSelectExpert(null)
          }
        }}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col bg-white border border-[#E0E0E0]">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-xl font-bold text-[#000000]">Notify Expert</DialogTitle>
              <DialogDescription className="text-sm text-[#6A6A6A]">
                Select one of your projects to notify {quickSelectExpert?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {institutionProjects.length === 0 ? (
                <div className="text-center py-8 text-[#6A6A6A]">
                  No projects found. Create a project first.
                </div>
              ) : (
                <div className="space-y-3">
                  {institutionProjects.map((proj) => {
                    const isSelected = quickSelectedProjectId === proj.id
                    return (
                      <label key={proj.id} className="block">
                        <div
                          className={`flex items-start gap-3 p-4 rounded-xl border bg-white transition-all duration-200 cursor-pointer ${isSelected ? 'border-[#008260] bg-[#E8F5F1] shadow-md' : 'border-[#E0E0E0] hover:border-[#008260] hover:shadow-sm'}`}
                          onClick={() => setQuickSelectedProjectId(isSelected ? null : proj.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => setQuickSelectedProjectId(checked ? proj.id : null)}
                            className="mt-1 border-2 rounded-md border-[#DCDCDC] data-[state=checked]:bg-[#008260] data-[state=checked]:border-[#008260]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <h4 className="font-semibold text-[#000000] truncate">{proj.title}</h4>
                              {proj.type && <Badge className="capitalize text-xs flex-shrink-0 bg-[#E8F5F1] text-[#008260] border border-[#008260]">{proj.type}</Badge>}
                            </div>
                            <p className="text-sm text-[#6A6A6A] line-clamp-2">{proj.description}</p>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t border-[#DCDCDC]">
              <Button variant="outline" onClick={() => setShowQuickSelectModal(false)} className="border border-[#DCDCDC] hover:border-[#008260] hover:bg-[#E8F5F1] text-[#000000] hover:text-[#008260]">Cancel</Button>
              <Button
                disabled={!quickSelectedProjectId || sendingQuickMessage}
                className="bg-[#008260] hover:bg-[#006B4F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={async () => {
                  if (!quickSelectExpert || !quickSelectedProjectId || !institution?.id) return
                  try {
                    setSendingQuickMessage(true)
                    const projectDetails = await api.projects.getById(quickSelectedProjectId)
                    const institutionDetails = await api.institutions.getById(institution.id)

                    if (!projectDetails || !institutionDetails) {
                      toast.error('Failed to get project or institution details')
                      return
                    }

                    // Check if expert already applied to this project
                    const status = await api.applications.checkStatus(quickSelectedProjectId, [quickSelectExpert.id])
                    const hasApplied = Array.isArray(status) && status[0]?.hasApplied

                    if (hasApplied) {
                      // Create booking directly
                      const bookingData = {
                        expert_id: quickSelectExpert.id,
                        project_id: quickSelectedProjectId,
                        institution_id: institution.id,
                        amount: projectDetails.hourly_rate,
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: projectDetails.end_date,
                        status: 'in_progress',
                        hours_booked: projectDetails.duration_hours
                      }
                      // Check if booking already exists for this expert and project
                      const existingQuick = await api.bookings.getAll({ expert_id: quickSelectExpert.id, project_id: quickSelectedProjectId, page: 1, limit: 1 })
                      const existingQuickCount = Array.isArray(existingQuick) ? existingQuick.length : (existingQuick?.data?.length || 0)
                      if (existingQuickCount === 0) {
                        await api.bookings.create(bookingData)
                        // Update the existing application to accepted for this expert and project
                        const quickApps = await api.applications.getAll({ expert_id: quickSelectExpert.id, project_id: quickSelectedProjectId, page: 1, limit: 1 })
                        const quickAppId = Array.isArray(quickApps) ? quickApps[0]?.id : (quickApps?.data?.[0]?.id)
                        if (quickAppId) {
                          await api.applications.update(quickAppId, { status: 'accepted', reviewed_at: new Date().toISOString() })
                        }
                      }
                      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/send-expert-selected`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                        },
                        body: JSON.stringify({
                          expertId: quickSelectExpert.id,
                          projectTitle: projectDetails.title,
                          institutionName: institutionDetails.name,
                          type: 'expert_selected_with_booking',
                          projectId: quickSelectedProjectId
                        })
                      })
                    } else {
                      // Send interest notification only
                      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/send-expert-interest`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                        },
                        body: JSON.stringify({
                          expertId: quickSelectExpert.id,
                          projectTitle: projectDetails.title,
                          institutionName: institutionDetails.name,
                          type: 'expert_interest_shown',
                          projectId: quickSelectedProjectId
                        })
                      })
                    }

                    toast.success('Message sent successfully')
                    setShowQuickSelectModal(false)
                    setQuickSelectedProjectId(null)
                    setQuickSelectExpert(null)
                  } catch (e) {
                    console.error('Quick select send error:', e)
                    toast.error('Failed to send message')
                  } finally {
                    setSendingQuickMessage(false)
                  }
                }}
              >
                {sendingQuickMessage ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </main>

      {institution?.type === 'Corporate' && (
        <div className="fixed bottom-4 inset-x-0 px-4 md:hidden z-50">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl p-3 flex gap-3">
            <Link href="/institution/internships/create" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">Create Internship</Button>
            </Link>
            <Link href="/institution/freelance/create" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">Create Freelance</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
