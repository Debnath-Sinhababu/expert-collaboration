'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { usePagination } from '@/hooks/usePagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ProfileDropdown from '@/components/ProfileDropdown'
import Logo from '@/components/Logo'
import NotificationBell from '@/components/NotificationBell'
import { 
  ArrowLeft,
  Building, 
  Users, 
  Star, 
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
  BookOpen
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { RatingModal } from '@/components/RatingModal'

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [ratings, setRatings] = useState<any[]>([])
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('pending')
  
  // Tab counts
  const [pendingCount, setPendingCount] = useState(0)
  const [interviewCount, setInterviewCount] = useState(0)
  const [selectedCount, setSelectedCount] = useState(0)

  // Refs for infinite scroll detection
  const pendingScrollRef = useRef<HTMLDivElement>(null)
  const interviewScrollRef = useRef<HTMLDivElement>(null)
  const selectedScrollRef = useRef<HTMLDivElement>(null)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [interviewDate, setInterviewDate] = useState<Date | undefined>(undefined)
  const [interviewTime, setInterviewTime] = useState<string>('')
  const [processingApplications, setProcessingApplications] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        
        if (!user) {
          router.push('/auth/login')
          return
        }
        
        setUser(user)
        
        const userRole = user.user_metadata?.role
        if (userRole !== 'institution') {
          console.log('Non-institution user accessing project page, redirecting...')
          if (userRole === 'expert') {
            router.push('/expert/dashboard')
          } else {
            router.push('/')
          }
          return
        }
        
        await loadInstitutionData(user.id)
        await loadProjectData()
      } catch (error: any) {
        console.error('Error getting user:', error)
        setError('Failed to get user data')
      }
    }
    getUser()
  }, [router])

  // Load ratings when institution is available
  useEffect(() => {
    if (institution?.id) {
      fetchRatings()
    }
  }, [institution?.id])


  const loadInstitutionData = async (userId: string) => {
    try {
      const institutionProfile = await api.institutions.getByUserId(userId)
    
      
      if (!institutionProfile) {
        router.push('/institution/profile-setup')
        return
      }
      
      setInstitution(institutionProfile)
    } catch (error: any) {
      setError('Failed to load institution data')
      console.error('Institution data error:', error)
    }
  }

  const loadProjectData = async () => {
    try {
      const projectData = await api.projects.getById(projectId)
      if (!projectData) {
        setError('Project not found')
        return
      }
      setProject(projectData)
    } catch (error: any) {
      setError('Failed to load project data')
      console.error('Project data error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Extract counts from API responses
  const extractCounts = (response: any, type: 'applications' | 'bookings') => {
    if (response && typeof response === 'object' && 'counts' in response) {
      if (type === 'applications') {
        setPendingCount(response.counts.pending || 0)
        setInterviewCount(response.counts.interview || 0)
      } else if (type === 'bookings') {
        setSelectedCount(response.counts.total || 0)
      }
    }
  }

  // Paginated applications for pending status
  const {
    data: pendingApplications,
    loading: pendingLoading,
    hasMore: hasMorePending,
    loadMore: loadMorePending,
    refresh: refreshPending
  } = usePagination(
    async (page: number) => {
      if (!projectId) return []
      const response = await api.applications.getAll({ 
        project_id: projectId, 
        status: 'pending',
        page,
        limit: 10
      })
      
      // Handle new data structure with counts
      if (response && typeof response === 'object' && 'data' in response) {
        // Extract counts on first page load
      
          extractCounts(response, 'applications')
        
        return response.data
      }
      return response
    },
    [projectId]
  )

  // Paginated applications for interview status
  const {
    data: interviewApplications,
    loading: interviewLoading,
    hasMore: hasMoreInterview,
    loadMore: loadMoreInterview,
    refresh: refreshInterview
  } = usePagination(
    async (page: number) => {
      if (!projectId) return []
      const response = await api.applications.getAll({ 
        project_id: projectId, 
        status: 'interview',
        page,
        limit: 10
      })
      
      // Handle new data structure with counts
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data
      }
      return response
    },
    [projectId]
  )

  // Paginated bookings for selected status
  const {
    data: selectedBookings,
    loading: selectedLoading,
    hasMore: hasMoreSelected,
    loadMore: loadMoreSelected,
    refresh: refreshSelected
  } = usePagination(
    async (page: number) => {
      if (!projectId) return []
      const response = await api.bookings.getAll({ 
        project_id: projectId,
        page,
        limit: 10
      })
      
      // Handle new data structure with counts
      if (response && typeof response === 'object' && 'data' in response) {
        // Extract counts on first page load
        if (page === 1) {
          extractCounts(response, 'bookings')
        }
        return response.data
      }
      return response
    },
    [projectId]
  )

  // Infinite scroll logic using Intersection Observer
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          console.log('Intersection detected:', {
            target: entry.target,
            pendingRef: pendingScrollRef.current,
            interviewRef: interviewScrollRef.current,
            selectedRef: selectedScrollRef.current,
            hasMorePending,
            hasMoreInterview,
            hasMoreSelected,
            pendingLoading,
            interviewLoading,
            selectedLoading,
            activeTab
          })
          
          if (entry.target === pendingScrollRef.current && hasMorePending && !pendingLoading) {
            console.log('Loading more pending applications')
            loadMorePending()
          } else if (entry.target === interviewScrollRef.current && hasMoreInterview && !interviewLoading) {
            console.log('Loading more interview applications')
            loadMoreInterview()
          } else if (entry.target === selectedScrollRef.current && hasMoreSelected && !selectedLoading) {
            console.log('Loading more selected bookings')
            loadMoreSelected()
          }
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    // Add a small delay to ensure DOM is updated after tab change
    const timeoutId = setTimeout(() => {
      // Observe all scroll refs
      if (pendingScrollRef.current) {
        console.log('Observing pending scroll ref')
        observer.observe(pendingScrollRef.current)
      }
      if (interviewScrollRef.current) {
        console.log('Observing interview scroll ref')
        observer.observe(interviewScrollRef.current)
      }
      if (selectedScrollRef.current) {
        console.log('Observing selected scroll ref')
        observer.observe(selectedScrollRef.current)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [hasMorePending, hasMoreInterview, hasMoreSelected, pendingLoading, interviewLoading, selectedLoading, loadMorePending, loadMoreInterview, loadMoreSelected, activeTab])


  

  const handleProceedToInterview = (applicationId: string) => {
    setSelectedApplicationId(applicationId)
    setShowInterviewModal(true)
    setInterviewDate(undefined)
    setInterviewTime('')
  }

  const handleInterviewSubmit = async () => {
    if (!selectedApplicationId) return

    try {
      setProcessingApplications(prev => ({ ...prev, [selectedApplicationId]: true }))
      
      let interviewDateValue = null
      if (interviewDate && interviewTime) {
        const [hours, minutes] = interviewTime.split(':').map(Number)
        const combinedDateTime = new Date(interviewDate)
        combinedDateTime.setHours(hours, minutes, 0, 0)
        interviewDateValue = combinedDateTime.toISOString()
      }

      await api.applications.update(selectedApplicationId, {
        status: 'interview',
        interview_date: interviewDateValue,
        reviewed_at: new Date().toISOString()
      })

      toast.success('Application moved to interview stage!')
      setShowInterviewModal(false)
      setSelectedApplicationId(null)
      setInterviewDate(undefined)
      setInterviewTime('')
      refreshPending()
      refreshInterview()
    } catch (error) {
      console.error('Error moving to interview:', error)
      toast.error('Failed to move application to interview stage')
    } finally {
      setProcessingApplications(prev => ({ ...prev, [selectedApplicationId]: false }))
    }
  }

  const handleProceedToBooking = async (applicationId: string) => {
    try {
      setProcessingApplications(prev => ({ ...prev, [applicationId]: true }))
      
      // Get application details
      const application = [...(pendingApplications || []), ...(interviewApplications || [])].find((app: any) => app.id === applicationId)
      if (!application) {
        toast.error('Application not found')
        return
      }

      // Update application status to accepted
      await api.applications.update(applicationId, {
        status: 'accepted',
        reviewed_at: new Date().toISOString()
      })

      // Create booking (same logic as current accept flow)
      const bookingData = {
        expert_id: (application as any).expert_id,
        institution_id: institution.id,
        project_id: (application as any).project_id,
        application_id: applicationId,
        amount: (application as any).proposed_rate || 1000,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hours_booked: 1,
        status: 'in_progress',
        payment_status: 'pending'
      }
      
      await api.bookings.create(bookingData)

      toast.success('Booking created successfully!')
      refreshInterview()
      refreshSelected()
    } catch (error) {
      console.error('Error creating booking:', error)
      toast.error('Failed to create booking')
    } finally {
      setProcessingApplications(prev => ({ ...prev, [applicationId]: false }))
    }
  }

  const handleRejectApplication = async (applicationId: string) => {
    try {
      setProcessingApplications(prev => ({ ...prev, [applicationId]: true }))
      
      await api.applications.update(applicationId, {
        status: 'rejected',
        reviewed_at: new Date().toISOString()
      })

      toast.success('Application rejected')
      refreshPending()
      refreshInterview()
    } catch (error) {
      console.error('Error rejecting application:', error)
      toast.error('Failed to reject application')
    } finally {
      setProcessingApplications(prev => ({ ...prev, [applicationId]: false }))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'interview': return 'bg-blue-100 text-blue-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'interview': return <Calendar className="h-4 w-4" />
      case 'accepted': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'in_progress': return 'default'
      case 'completed': return 'secondary'
      case 'cancelled': return 'destructive'
      default: return 'outline'
    }
  }

  // Handle booking status update
  const handleUpdateBookingStatus = async (bookingId: string, applicationId: string, newStatus: string) => {
    try {
      if (newStatus === 'cancelled') {
        // For cancelled bookings, delete them immediately
        await handleBookingDelete(bookingId,applicationId)
      } else if (newStatus === 'completed') {
        // For completed bookings, update status and open rating modal
        await api.bookings.update(bookingId, { status: newStatus })
        
        // Refresh all data
        await loadProjectData()
        refreshSelected()
        
        // Find the updated booking and open rating modal
        const updatedBooking = selectedBookings?.find((b: any) => b.id === bookingId)
        if (updatedBooking) {
          setSelectedBooking({ ...updatedBooking, status: 'completed' })
          setRatingModalOpen(true)
        }
      } else {
        // For other status updates
        await api.bookings.update(bookingId, { status: newStatus })
        
        // Refresh all data
        await loadProjectData()
        refreshSelected()
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      toast.error('Failed to update booking status')
    }
  }

  // Handle booking deletion
  const handleBookingDelete = async (bookingId: string, applicationId: string) => {
    if (confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      try {
        await api.bookings.delete(bookingId)
         api.applications.update(applicationId, {
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
         loadProjectData()
        refreshSelected()
        toast.success('Booking deleted successfully')
      } catch (error) {
        console.error('Error deleting booking:', error)
        toast.error('Failed to delete booking')
      }
    }
  }

  // Handle rating modal
  const handleRateExpert = (booking: any) => {
    setSelectedBooking(booking)
    setRatingModalOpen(true)
  }

  const handleRatingSubmitted = () => {
    loadProjectData()
    fetchRatings()
    refreshSelected()
    refreshInterview()
  }

  // Fetch ratings for completed bookings
  const fetchRatings = async () => {
    try {
      if (institution?.id) {
        const ratingsData = await api.ratings.getAll({ institution_id: institution.id })
        setRatings(ratingsData)
      }
    } catch (error) {
      console.error('Error fetching ratings:', error)
    }
  }

  // Check if a booking has been rated
  const getBookingRating = (bookingId: string) => {
    const rating = ratings.find(r => r.booking_id === bookingId)
    console.log('Checking rating for booking:', bookingId, 'Rating found:', rating)
    return rating
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-slate-300 mb-4">{error || 'Project not found'}</p>
          <Button onClick={() => router.push('/institution/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-xl shadow-2xl border-b border-slate-700/50 relative z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/institution/dashboard')}
                className="text-white hover:text-white hover:bg-transparent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Link href="/" className="flex items-center space-x-2 group">
                <Logo size="md" />
                <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Calxmap</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-2">
              <NotificationBell />
              <ProfileDropdown user={user} institution={institution} userType="institution" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Project Info Section */}
        <Card className="mb-8 bg-white/90 backdrop-blur-md border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900 mb-2">{project.title}</CardTitle>
                <CardDescription className="text-slate-600">{project.description}</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="capitalize">{project.status}</Badge>
                <Badge variant="secondary" className="capitalize">{project.type}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Rate:</span>
                <p className="font-medium">₹{project.hourly_rate}/hour</p>
              </div>
              <div>
                <span className="text-slate-500">Duration:</span>
                <p className="font-medium">{project.duration_hours} hours</p>
              </div>
              <div>
                <span className="text-slate-500">Budget:</span>
                <p className="font-medium">₹{project.total_budget}</p>
              </div>
              <div>
                <span className="text-slate-500">Posted:</span>
                <p className="font-medium">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            {project.required_expertise && project.required_expertise.length > 0 && (
              <div className="mt-4">
                <span className="text-sm text-slate-500">Required Expertise:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {project.required_expertise.map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3-Tab System */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full gap-2 overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:gap-0 sm:overflow-visible scrollbar-hide bg-white/90 backdrop-blur-md border-0 shadow-lg">
            <TabsTrigger 
              className="flex-shrink-0 whitespace-nowrap px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:bg-gray-100/80 transition-all" 
              value="pending"
            >
              Pending ({pendingCount || 0})
            </TabsTrigger>
            <TabsTrigger 
              className="flex-shrink-0 whitespace-nowrap px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:bg-gray-100/80 transition-all" 
              value="interview"
            >
              Interview ({interviewCount || 0})
            </TabsTrigger>
            <TabsTrigger 
              className="flex-shrink-0 whitespace-nowrap px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:bg-gray-100/80 transition-all" 
              value="selected"
            >
              Selected ({selectedCount || 0})
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Applications</CardTitle>
                <CardDescription>
                  Review and move applications to interview stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingApplications?.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No pending applications</p>
                    <p className="text-sm text-gray-500">Applications will appear here when experts apply</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApplications?.map((application: any) => (
                      <Card key={application.id} className="bg-white/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10 border-2 border-blue-200">
                                <AvatarImage src={application.experts?.photo_url} />
                                <AvatarFallback className="text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                  {application.experts?.name?.charAt(0) || 'E'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-slate-900">{application.experts?.name || 'Unknown Expert'}</h3>
                                <p className="text-sm text-slate-600">₹{application.experts?.hourly_rate || 0}/hr</p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(application.status)}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(application.status)}
                                <span className="capitalize">{application.status}</span>
                              </div>
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-slate-600 mb-4">{application.experts?.bio || 'No bio available'}</p>
                          
                          {/* Expert Details */}
                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                              <span className="text-slate-500">Experience:</span>
                              <p className="font-medium text-slate-700">{application.experts?.experience_years || 0} years</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Rating:</span>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span className="font-medium text-slate-700">
                                  {application.experts?.rating || 0}/5 ({application.experts?.total_ratings || 0})
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500">Domain:</span>
                              <p className="font-medium text-slate-700">
                                {application.experts?.domain_expertise && application.experts.domain_expertise.length > 0 
                                  ? application.experts.domain_expertise.join(', ') 
                                  : 'Not specified'}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Status:</span>
                              <Badge 
                                variant={application.experts?.is_verified ? "default" : "secondary"} 
                                className="ml-1"
                              >
                                {application.experts?.is_verified ? 'Verified' : 'Pending'}
                              </Badge>
                            </div>
                          </div>

                          {/* Subskills */}
                          {application.experts?.subskills && application.experts.subskills.length > 0 && (
                            <div className="mb-4">
                              <span className="text-sm text-slate-500">Specializations:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {application.experts.subskills.slice(0, 4).map((skill: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {application.experts.subskills.length > 4 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{application.experts.subskills.length - 4} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Qualifications */}
                          {application.experts?.qualifications && (
                            <div className="mb-4">
                              <span className="text-sm text-slate-500">Qualifications:</span>
                              <p className="text-sm mt-1 text-slate-700">{application.experts.qualifications}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-500">
                              Applied: {new Date(application.applied_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectApplication(application.id)}
                                disabled={processingApplications[application.id]}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                {processingApplications[application.id] ? 'Processing...' : 'Reject'}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleProceedToInterview(application.id)}
                                disabled={processingApplications[application.id]}
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                {processingApplications[application.id] ? 'Processing...' : 'Proceed for Interview'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* Infinite scroll trigger for Pending Applications */}
                    {hasMorePending && (
                      <div ref={pendingScrollRef} className="flex justify-center py-4">
                        {pendingLoading && (
                          <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                            <span>Loading more applications...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interview Tab */}
          <TabsContent value="interview">
            <Card>
              <CardHeader>
                <CardTitle>Interview Stage</CardTitle>
                <CardDescription>
                  Applications ready for interview - proceed to create bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {interviewApplications?.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No applications in interview stage</p>
                    <p className="text-sm text-gray-500">Move applications from pending to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {interviewApplications?.map((application: any) => (
                      <Card key={application.id} className="bg-white/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10 border-2 border-blue-200">
                                <AvatarImage src={application.experts?.photo_url} />
                                <AvatarFallback className="text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                  {application.experts?.name?.charAt(0) || 'E'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-slate-900">{application.experts?.name || 'Unknown Expert'}</h3>
                                <p className="text-sm text-slate-600">₹{application.experts?.hourly_rate || 0}/hr</p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(application.status)}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(application.status)}
                                <span className="capitalize">{application.status}</span>
                              </div>
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-slate-600 mb-4">{application.experts?.bio || 'No bio available'}</p>
                          
                          {/* Expert Details */}
                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                              <span className="text-slate-500">Experience:</span>
                              <p className="font-medium text-slate-700">{application.experts?.experience_years || 0} years</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Rating:</span>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span className="font-medium text-slate-700">
                                  {application.experts?.rating || 0}/5 ({application.experts?.total_ratings || 0})
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500">Domain:</span>
                              <p className="font-medium text-slate-700">
                                {application.experts?.domain_expertise && application.experts.domain_expertise.length > 0 
                                  ? application.experts.domain_expertise.join(', ') 
                                  : 'Not specified'}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Status:</span>
                              <Badge 
                                variant={application.experts?.is_verified ? "default" : "secondary"} 
                                className="ml-1"
                              >
                                {application.experts?.is_verified ? 'Verified' : 'Pending'}
                              </Badge>
                            </div>
                          </div>

                          {/* Subskills */}
                          {application.experts?.subskills && application.experts.subskills.length > 0 && (
                            <div className="mb-4">
                              <span className="text-sm text-slate-500">Specializations:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {application.experts.subskills.slice(0, 4).map((skill: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {application.experts.subskills.length > 4 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{application.experts.subskills.length - 4} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {application.interview_date && (
                            <div className="text-sm text-blue-600 mb-4">
                              <Calendar className="h-4 w-4 inline mr-1" />
                              Interview scheduled: {new Date(application.interview_date).toLocaleString()}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-500">
                              Applied: {new Date(application.applied_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectApplication(application.id)}
                                disabled={processingApplications[application.id]}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                {processingApplications[application.id] ? 'Processing...' : 'Reject'}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleProceedToBooking(application.id)}
                                disabled={processingApplications[application.id]}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {processingApplications[application.id] ? 'Processing...' : 'Proceed for Booking'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* Infinite scroll trigger for Interview Applications */}
                    {hasMoreInterview && (
                      <div ref={interviewScrollRef} className="flex justify-center py-4">
                        {interviewLoading && (
                          <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                            <span>Loading more applications...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Selected Tab */}
          <TabsContent value="selected">
            <Card>
              <CardHeader>
                <CardTitle>Selected Bookings</CardTitle>
                <CardDescription>
                  Manage confirmed bookings for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedBookings?.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No bookings yet</p>
                    <p className="text-sm text-gray-500">Bookings will appear here when you proceed with applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedBookings?.map((booking: any) => {
                     
                      return (
                      <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 min-w-0">
                              <h4 className="font-semibold truncate pr-2">{booking.project?.title}</h4>
                              <Badge variant={getStatusVariant(booking.status)}>
                                {booking.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                              <div>
                                <span className="font-medium">Expert:</span> {booking.experts?.name}
                              </div>
                              <div>
                                <span className="font-medium">Amount:</span> ₹{booking.amount}
                              </div>
                              <div>
                                <span className="font-medium">Start Date:</span> {new Date(booking.start_date).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-medium">End Date:</span> {new Date(booking.end_date).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-medium">Status:</span> 
                                <Badge variant={getStatusVariant(booking.status)} className="ml-2">
                                  {booking.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div>
                                <span className="font-medium">Rated:</span> 
                                <span className="ml-2">
                                  {getBookingRating(booking.id) ? '✅ Yes' : '❌ No'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {/* View Profile Button - Always visible */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center space-x-1">
                                  <Eye className="h-4 w-4" />
                                  <span>View Profile</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                                <DialogHeader className="flex-shrink-0">
                                  <DialogTitle>{booking.experts?.name || 'Expert Profile'}</DialogTitle>
                                  <DialogDescription>Complete Expert Profile</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                                  <div className="flex items-center space-x-4 mb-4">
                                    <Avatar className="w-16 h-16 border-2 border-blue-200 flex-shrink-0">
                                      <AvatarImage src={booking.experts?.photo_url} />
                                      <AvatarFallback className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                        {booking.experts?.name?.charAt(0) || 'E'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-semibold text-lg truncate">{booking.experts?.name || 'Unknown Expert'}</h4>
                                      <p className="text-sm text-gray-600 truncate">
                                        {booking.experts?.domain_expertise && booking.experts.domain_expertise.length > 0 
                                          ? booking.experts.domain_expertise.join(', ') 
                                          : 'Expert'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="max-h-32 overflow-y-auto">
                                    <h4 className="font-medium mb-2">Professional Bio</h4>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                      {booking.experts?.bio || 'No bio available'}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <h4 className="font-medium mb-1">Domain Expertise</h4>
                                      <p className="text-sm">
                                        {booking.experts?.domain_expertise && booking.experts.domain_expertise.length > 0 
                                          ? booking.experts.domain_expertise.join(', ') 
                                          : 'Not specified'}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Hourly Rate</h4>
                                      <p className="text-sm">₹{booking.experts?.hourly_rate || 0}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Experience</h4>
                                      <p className="text-sm">{booking.experts?.experience_years || 0} years</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Contact</h4>
                                      <p className="text-sm">{booking.experts?.email || 'Not available'}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Phone</h4>
                                      <p className="text-sm">{booking.experts?.phone || 'Not available'}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Rating</h4>
                                      <div className="flex items-center space-x-1">
                                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                        <p className="text-sm">
                                          {booking.experts?.rating || 0}/5 ({booking.experts?.total_ratings || 0} reviews)
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Verification</h4>
                                      <Badge variant={booking.experts?.is_verified ? "default" : "secondary"} className="text-xs">
                                        {booking.experts?.is_verified ? 'Verified' : 'Pending'}
                                      </Badge>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">KYC Status</h4>
                                      <Badge 
                                        variant={booking.experts?.kyc_status === 'approved' ? "default" : "secondary"} 
                                        className="text-xs capitalize"
                                      >
                                        {booking.experts?.kyc_status || 'pending'}
                                      </Badge>
                                    </div>
                                  </div>
                                  {booking.experts?.subskills && booking.experts.subskills.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">Specializations</h4>
                                      <div className="max-h-24 overflow-y-auto">
                                        <div className="flex flex-wrap gap-2">
                                          {booking.experts.subskills.map((skill: string, index: number) => (
                                            <Badge key={index} variant="secondary" className="text-xs">
                                              {skill}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {booking.experts?.qualifications && (
                                    <div>
                                      <h4 className="font-medium mb-1">Qualifications</h4>
                                      <div className="max-h-20 overflow-y-auto">
                                        <p className="text-sm leading-relaxed">{booking.experts.qualifications}</p>
                                      </div>
                                    </div>
                                  )}
                                  {booking.experts?.resume_url && (
                                    <div>
                                      <h4 className="font-medium mb-1">Resume</h4>
                                      <a 
                                        href={booking.experts.resume_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-sm"
                                      >
                                        View Resume
                                      </a>
                                    </div>
                                  )}
                                  
                                  {booking.experts?.linkedin_url && (
                                    <div>
                                      <h4 className="font-medium mb-1">LinkedIn Profile</h4>
                                      <a 
                                        href={booking.experts.linkedin_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-sm"
                                      >
                                        View LinkedIn Profile
                                      </a>
                                    </div>
                                  )}


                                  <div className="pt-2 border-t">
                                    <h4 className="font-medium mb-1">Profile Information</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                      <div>
                                        <span className="font-medium">Profile Created:</span>
                                        <p>{booking.experts?.created_at ? new Date(booking.experts.created_at).toLocaleDateString() : 'Unknown'}</p>
                                      </div>
                                      <div>
                                        <span className="font-medium">Last Updated:</span>
                                        <p>{booking.experts?.updated_at ? new Date(booking.experts.updated_at).toLocaleDateString() : 'Unknown'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {booking.status === 'in_progress' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateBookingStatus(booking.id, booking?.application_id, 'completed')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark Complete & Rate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateBookingStatus(booking.id,booking?.application_id, 'cancelled')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel & Delete
                                </Button>
                              </>
                            )}
                            
                            {booking.status === 'completed' && !getBookingRating(booking.id) && (
                              <Button
                                size="sm"
                                onClick={() => handleRateExpert(booking)}
                                variant={getBookingRating(booking.id) ? "outline" : "default"}
                              >
                                <Star className="h-4 w-4 mr-1" />
                                Rate Expert
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      )
                    })}
                    
                    {/* Infinite scroll trigger for Selected Bookings */}
                    {hasMoreSelected && (
                      <div ref={selectedScrollRef} className="flex justify-center py-4">
                        {selectedLoading && (
                          <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                            <span>Loading more bookings...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Interview Date Modal */}
      <Dialog open={showInterviewModal} onOpenChange={setShowInterviewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Set an interview date and time for this application (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <div>
                <Label>Interview Date (Optional)</Label>
                <DatePicker
                  value={interviewDate}
                  onChange={setInterviewDate}
                  placeholder="Select interview date"
                  className="w-full"
                  minDate={new Date()} // Disable past dates
                />
              </div>
              <div>
                <Label>Interview Time (Optional)</Label>
                <TimePicker
                  value={interviewTime}
                  onChange={setInterviewTime}
                  placeholder="Select interview time"
                  className="w-full"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                You can schedule an interview or proceed without setting a specific date and time
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowInterviewModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInterviewSubmit}
                disabled={processingApplications[selectedApplicationId || '']}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processingApplications[selectedApplicationId || ''] ? 'Processing...' : 'Proceed to Interview'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        booking={selectedBooking}
        onRatingSubmitted={handleRatingSubmitted}
      />
    </div>
  )
}
