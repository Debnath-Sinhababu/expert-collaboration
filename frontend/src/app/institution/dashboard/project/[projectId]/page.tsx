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
  BookOpen,
  FileText,
  IndianRupee,
  Hourglass
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
  const [rejectedCount, setRejectedCount] = useState(0)

  // Refs for infinite scroll detection
  const pendingScrollRef = useRef<HTMLDivElement>(null)
  const interviewScrollRef = useRef<HTMLDivElement>(null)
  const selectedScrollRef = useRef<HTMLDivElement>(null)
  const rejectedScrollRef = useRef<HTMLDivElement>(null)
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
        setRejectedCount(response.counts.rejected || 0)
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
        extractCounts(response, 'applications')
        return response.data
      }
      return response
    },
    [projectId]
  )

  // Paginated applications for rejected status (read-only)
  const {
    data: rejectedApplications,
    loading: rejectedLoading,
    hasMore: hasMoreRejected,
    loadMore: loadMoreRejected,
    refresh: refreshRejected
  } = usePagination(
    async (page: number) => {
      if (!projectId) return []
      const response = await api.applications.getAll({ 
        project_id: projectId, 
        status: 'rejected',
        page,
        limit: 10
      })
      
      if (response && typeof response === 'object' && 'data' in response) {
        extractCounts(response, 'applications')
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
            rejectedRef: rejectedScrollRef.current,
            hasMorePending,
            hasMoreInterview,
            hasMoreSelected,
            hasMoreRejected,
            pendingLoading,
            interviewLoading,
            selectedLoading,
            rejectedLoading,
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
          } else if (entry.target === rejectedScrollRef.current && hasMoreRejected && !rejectedLoading) {
            console.log('Loading more rejected applications')
            loadMoreRejected()
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
      if (rejectedScrollRef.current) {
        console.log('Observing rejected scroll ref')
        observer.observe(rejectedScrollRef.current)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [hasMorePending, hasMoreInterview, hasMoreSelected, hasMoreRejected, pendingLoading, interviewLoading, selectedLoading, rejectedLoading, loadMorePending, loadMoreInterview, loadMoreSelected, loadMoreRejected, activeTab])


  

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
        hours_booked: project.duration_hours,
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
      refreshRejected()
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
        refreshRejected()
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-slate-600 mb-4">{error || 'Project not found'}</p>
          <Button onClick={() => router.push('/institution/dashboard')} className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">

      {/* Header */}
      <header className="bg-[#008260] sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-white hover:text-white hover:bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
                Back 
              </Button>
              <Link href="/institution/home" className="flex items-center group">
                <Logo size="header" />
              </Link>
            </div>
            
            <div className="flex items-center space-x-2">
              <NotificationBell />
              <ProfileDropdown user={user} institution={institution} userType="institution" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Project Info Section */}
        <div 
                        key={project.id} 
                        className="bg-white border border-[#DCDCDC] rounded-lg p-6 transition-all duration-300 group"
                      >
                        <div className="flex items-center justify-between mb-2 min-w-0">
                          <h3 className="font-bold text-lg text-[#000000] truncate pr-2">{project.title}</h3>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Badge variant="secondary" className="capitalize bg-[#FFF1E7] rounded-[18px] text-xs font-semibold text-[#FF6A00] py-2 px-4">{project.status}</Badge>
                            <Badge variant="secondary" className="capitalize bg-[#FFF1E7] rounded-[18px] text-xs font-semibold text-[#FF6A00] py-2 px-4">{project.type}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-[#6A6A6A] mb-3">{project.description}</p>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
      <Clock className="w-5 h-5" style={{ color: '#008260' }} />
    </div>
    <div>
      <span className="text-[#717171] text-xs">Rate:</span>
      <p className="font-semibold text-[#008260] text-base">₹{project.hourly_rate}/hour</p>
    </div>
  </div>
                          <div className='flex items-start gap-3'>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
      <Hourglass className="w-5 h-5" style={{ color: '#008260' }} />
    </div>
                             <div>
                            <span className="text-[#717171] text-xs">Duration:</span>
                            <p className="font-medium text-base text-[#1D1D1D]">{project.duration_hours} hours</p>
                            </div>
                          </div>
                          <div className='flex items-start gap-3'>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
      <IndianRupee className="w-5 h-5" style={{ color: '#008260' }} />
    </div> 
                         <div>
                            <span className="text-[#717171] text-xs">Budget:</span>
                            <p className="font-medium text-base text-[#1D1D1D]">₹{project.total_budget}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
      <Calendar className="w-5 h-5" style={{ color: '#008260' }} />
    </div>
    <div>
      <span className="text-[#717171] text-xs">Posted:</span>
      <p className="font-medium text-base text-[#1D1D1D]">
       {new Date(project.created_at).toLocaleDateString()}
      </p>
    </div>
  </div>
                        </div>
                        {project.required_expertise && project.required_expertise.length > 0 && (
                          <div className="mb-4">
                            <span className="text-sm text-slate-500">Required Expertise:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {project.required_expertise.map((skill: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      
                      </div>
        {/* 3-Tab System */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mt-10">
          <div className="w-full overflow-x-auto md:overflow-x-visible scrollbar-hide">
            <TabsList className="flex md:grid w-max md:w-full md:grid-cols-4 gap-2 bg-white border-b border-slate-200 h-12 px-4 md:px-0">
              <TabsTrigger 
                value="pending" 
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-emerald-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
              >
                Pending ({pendingCount || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="interview" 
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-emerald-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
              >
                Interview ({interviewCount || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="rejected" 
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-emerald-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
              >
                Rejected ({rejectedCount || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="selected" 
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-emerald-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
              >
                Selected ({selectedCount || 0})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pending Tab */}
          <TabsContent value="pending">
            <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#000000]">Pending Applications</CardTitle>
                <CardDescription className="text-[#000000] text-base font-normal !-mt-[2px]">
                  Review and move applications to interview stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingApplications?.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No pending applications</p>
                    <p className="text-sm text-slate-500">Applications will appear here when experts apply</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApplications?.map((application: any) => (
                      <Card key={application.id} className="bg-white border border-[#DCDCDC] p-4">
                        <CardContent className="p-0">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10 border-2 border-[#008260]/40">
                                <AvatarImage src={application.experts?.photo_url} />
                                <AvatarFallback className="text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                  {application.experts?.name?.charAt(0) || 'E'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-black text-base">{application.experts?.name || 'Unknown Expert'}</h3>
                                <p className="text-sm text-black">₹{application.experts?.hourly_rate || 0}/hr</p>
                              </div>
                            </div>
                            <Badge className='bg-[#FFF6D3] text-xs font-semibold text-[#967800]'>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(application.status)}
                                <span className="capitalize">{application.status}</span>
                              </div>
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-[#000000] mb-4">{application.experts?.bio || 'No bio available'}</p>
                          
                          {/* Expert Details */}
                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                              <span className="text-[#666666] font-medium text-sm">Experience:</span>
                              <p className="font-medium text-[#000000] text-sm">{application.experts?.experience_years || 0} years</p>
                            </div>
                            <div>
                              <span className="text-[#666666] font-medium text-sm">Rating:</span>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span className="font-semibold text-[#000000] text-sm">
                                  {application.experts?.rating || 0}/5 ({application.experts?.total_ratings || 0})
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-[#666666] font-medium text-sm">Domain:</span>
                              <p className="font-medium text-[#000000] text-sm">
                                {application.experts?.domain_expertise && application.experts.domain_expertise.length > 0 
                                  ? application.experts.domain_expertise.join(', ') 
                                  : 'Not specified'}
                              </p>
                            </div>
                        
                          </div>

                          {/* Subskills */}
                          {application.experts?.subskills && application.experts.subskills.length > 0 && (
                            <div className="mb-4">
                              <span className="text-[#666666] font-medium text-sm">Specializations:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
  <span className="text-sm text-[#000000] font-medium ">
    {application.experts.subskills.join(', ')}
  </span>
</div>
                            </div>
                          )}

                          {/* Qualifications */}
                          {application.experts?.qualifications && (
                            <div className="mb-4">
                              <span className="text-[#666666] font-medium text-sm">Qualifications:</span>
                              <p className="font-medium text-[#000000] text-sm mt-1">{application.experts.qualifications}</p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="text-[#666666] font-medium text-sm">
                              Applied: {new Date(application.applied_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectApplication(application.id)}
                                disabled={processingApplications[application.id]}
                                className="border border-[#FF0000] text-[13px] font-medium text-[#FF0000] rounded-[25px] bg-white hover:bg-white hover:text-[#FF0000]"
                              >
                                <XCircle className="h-4 w-4" />
                                {processingApplications[application.id] ? 'Processing...' : 'Reject'}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleProceedToInterview(application.id)}
                                disabled={processingApplications[application.id]}
                                className="bg-[#008260] hover:bg-[#008260] text-white hover:text-white rounded-[25px] text-[13px]"
                              >
                                <Calendar className="h-4 w-4" />
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
                          <div className="flex items-center space-x-2 text-slate-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
  <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-[#000000]">Interview Stage</CardTitle>
      <CardDescription className="text-[#000000] text-base font-normal !-mt-[2px]">
        Applications ready for interview - proceed to create bookings
      </CardDescription>
    </CardHeader>
    <CardContent>
      {interviewApplications?.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No applications in interview stage</p>
          <p className="text-sm text-slate-500">Move applications from pending to see them here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {interviewApplications?.map((application: any) => (
            <Card key={application.id} className="bg-white border border-[#DCDCDC] p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10 border-2 border-[#008260]/40">
                      <AvatarImage src={application.experts?.photo_url} />
                      <AvatarFallback className="text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                        {application.experts?.name?.charAt(0) || 'E'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-black text-base">{application.experts?.name || 'Unknown Expert'}</h3>
                      <p className="text-sm text-black">₹{application.experts?.hourly_rate || 0}/hr</p>
                    </div>
                  </div>
                  <Badge className='bg-[#FFF6D3] text-xs font-semibold text-[#967800]'>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(application.status)}
                      <span className="capitalize">{application.status}</span>
                    </div>
                  </Badge>
                </div>
                
                <p className="text-sm text-[#000000] mb-4">{application.experts?.bio || 'No bio available'}</p>
                
                {/* Expert Details */}
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-[#666666] font-medium text-sm">Experience:</span>
                    <p className="font-medium text-[#000000] text-sm">{application.experts?.experience_years || 0} years</p>
                  </div>
                  <div>
                    <span className="text-[#666666] font-medium text-sm">Rating:</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="font-semibold text-[#000000] text-sm">
                        {application.experts?.rating || 0}/5 ({application.experts?.total_ratings || 0})
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[#666666] font-medium text-sm">Domain:</span>
                    <p className="font-medium text-[#000000] text-sm">
                      {application.experts?.domain_expertise && application.experts.domain_expertise.length > 0 
                        ? application.experts.domain_expertise.join(', ') 
                        : 'Not specified'}
                    </p>
                  </div>
               
                </div>

                {/* Subskills */}
                {application.experts?.subskills && application.experts.subskills.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[#666666] font-medium text-sm">Specializations:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-sm text-[#000000] font-medium ">
                        {application.experts.subskills.join(', ')}
                      </span>
                    </div>
                  </div>
                )}
                
                {application.interview_date && (
                  <div className="mb-4">
                    <span className="text-[#666666] font-medium text-sm">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Interview scheduled: <span className='text-black'> {new Date(application.interview_date).toLocaleString()}</span>
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-[#666666] font-medium text-sm">
                    Applied: {new Date(application.applied_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectApplication(application.id)}
                      disabled={processingApplications[application.id]}
                      className="border border-[#FF0000] text-[13px] font-medium text-[#FF0000] rounded-[25px] bg-white hover:bg-white hover:text-[#FF0000]"
                    >
                      <XCircle className="h-4 w-4" />
                      {processingApplications[application.id] ? 'Processing...' : 'Reject'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleProceedToBooking(application.id)}
                      disabled={processingApplications[application.id]}
                      className="bg-[#008260] hover:bg-[#008260] text-white hover:text-white rounded-[25px] text-[13px]"
                    >
                      <CheckCircle className="h-4 w-4" />
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
                <div className="flex items-center space-x-2 text-slate-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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

          {/* Rejected Tab */}
          <TabsContent value="rejected">
  <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-[#000000]">Rejected Applications</CardTitle>
      <CardDescription className="text-[#000000] text-base font-normal !-mt-[2px]">
        Applications that were not shortlisted for this project
      </CardDescription>
    </CardHeader>
    <CardContent>
      {rejectedApplications?.length === 0 ? (
        <div className="text-center py-8">
          <UserX className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No rejected applications</p>
          <p className="text-sm text-slate-500">Rejected applications will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rejectedApplications?.map((application: any) => (
            <Card key={application.id} className="bg-white border border-[#DCDCDC] p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10 border-2 border-[#008260]/40">
                      <AvatarImage src={application.experts?.photo_url} />
                      <AvatarFallback className="text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                        {application.experts?.name?.charAt(0) || 'E'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-black text-base">{application.experts?.name || 'Unknown Expert'}</h3>
                      <p className="text-sm text-black">₹{application.experts?.hourly_rate || 0}/hr</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(application.status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(application.status)}
                      <span className="capitalize">{application.status}</span>
                    </div>
                  </Badge>
                </div>
                
                <p className="text-sm text-[#000000] mb-4">{application.experts?.bio || 'No bio available'}</p>
                
                {/* Expert Details */}
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-[#666666] font-medium text-sm">Experience:</span>
                    <p className="font-medium text-[#000000] text-sm">{application.experts?.experience_years || 0} years</p>
                  </div>
                  <div>
                    <span className="text-[#666666] font-medium text-sm">Rating:</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="font-semibold text-[#000000] text-sm">
                        {application.experts?.rating || 0}/5 ({application.experts?.total_ratings || 0})
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[#666666] font-medium text-sm">Domain:</span>
                    <p className="font-medium text-[#000000] text-sm">
                      {application.experts?.domain_expertise && application.experts.domain_expertise.length > 0 
                        ? application.experts.domain_expertise.join(', ') 
                        : 'Not specified'}
                    </p>
                  </div>
                 
                </div>

                {/* Subskills */}
                {application.experts?.subskills && application.experts.subskills.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[#666666] font-medium text-sm">Specializations:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-sm text-[#000000] font-medium ">
                        {application.experts.subskills.join(', ')}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Qualifications */}
                {application.experts?.qualifications && (
                  <div className="mb-4">
                    <span className="text-[#666666] font-medium text-sm">Qualifications:</span>
                    <p className="font-medium text-[#000000] text-sm mt-1">{application.experts.qualifications}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-[#666666] font-medium text-sm">
                    Applied: {new Date(application.applied_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Infinite scroll trigger for Rejected Applications */}
          {hasMoreRejected && (
            <div ref={rejectedScrollRef} className="flex justify-center py-4">
              {rejectedLoading && (
                <div className="flex items-center space-x-2 text-slate-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
            <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#000000]">Selected Bookings</CardTitle>
                <CardDescription className="text-[#000000] text-base font-normal !-mt-[2px]">
                  Manage confirmed bookings for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedBookings?.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No bookings yet</p>
                    <p className="text-sm text-slate-500">Bookings will appear here when you proceed with applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
  {selectedBookings?.map((booking: any) => {
    return (
      <div key={booking.id} className="bg-white border border-[#DCDCDC] rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3">
            {/* Left Column */}
            <div>
              <span className="text-[#666666] font-medium text-sm">Expert: </span>
              <span className="text-[#000000] font-medium text-sm">{booking.experts?.name}</span>
            </div>
            
            {/* Right Column */}
            <div>
              <span className="text-[#666666] font-medium text-sm">Amount: </span>
              <span className="text-[#000000] font-medium text-sm">₹{booking.amount}</span>
            </div>
            
            {/* Left Column */}
            <div>
              <span className="text-[#666666] font-medium text-sm">Start Date: </span>
              <span className="text-[#000000] font-medium text-sm">{new Date(booking.start_date).toLocaleDateString()}</span>
            </div>
            
            {/* Right Column */}
            <div>
              <span className="text-[#666666] font-medium text-sm">End Date: </span>
              <span className="text-[#000000] font-medium text-sm">{new Date(booking.end_date).toLocaleDateString()}</span>
            </div>
            
            {/* Left Column */}
            <div>
              <span className="text-[#666666] font-medium text-sm">Status: </span>
              <span className="text-[#008260] font-medium text-sm capitalize">{booking.status.replace('_', ' ')}</span>
            </div>
            
            {/* Right Column */}
            <div>
              <span className="text-[#666666] font-medium text-sm">Rated: </span>
              <span className="text-[#000000] font-medium text-sm">
                {getBookingRating(booking.id) ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            {/* View Profile Button - Always visible */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border border-[#D6D6D6] text-[13px] font-medium text-[#000000] rounded-[25px] bg-white hover:bg-white hover:text-[#000000] whitespace-nowrap">
                  View Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle className="text-lg font-semibold text-[#000000]">{booking.experts?.name || 'Expert Profile'}</DialogTitle>
                  <DialogDescription className="text-[#666666] text-sm">Complete Expert Profile</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                  <div className="flex items-center space-x-4 mb-4">
                    <Avatar className="w-16 h-16 border-2 border-[#008260]/40 flex-shrink-0">
                      <AvatarImage src={booking.experts?.photo_url} />
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                        {booking.experts?.name?.charAt(0) || 'E'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-base text-[#000000] truncate">{booking.experts?.name || 'Unknown Expert'}</h4>
                      <p className="text-sm text-[#666666] truncate">
                        {booking.experts?.domain_expertise && booking.experts.domain_expertise.length > 0 
                          ? booking.experts.domain_expertise.join(', ') 
                          : 'Expert'}
                      </p>
                    </div>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    <h4 className="font-medium text-sm text-[#666666] mb-2">Professional Bio</h4>
                    <p className="text-sm text-[#000000] leading-relaxed">
                      {booking.experts?.bio || 'No bio available'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <h4 className="font-medium text-sm text-[#666666] mb-1">Domain Expertise</h4>
                      <p className="text-sm text-[#000000]">
                        {booking.experts?.domain_expertise && booking.experts.domain_expertise.length > 0 
                          ? booking.experts.domain_expertise.join(', ') 
                          : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-[#666666] mb-1">Hourly Rate</h4>
                      <p className="text-sm text-[#000000]">₹{booking.experts?.hourly_rate || 0}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-[#666666] mb-1">Experience</h4>
                      <p className="text-sm text-[#000000]">{booking.experts?.experience_years || 0} years</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-[#666666] mb-1">Contact</h4>
                      <p className="text-sm text-[#000000]">{booking.experts?.email || 'Not available'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-[#666666] mb-1">Phone</h4>
                      <p className="text-sm text-[#000000]">{booking.experts?.phone || 'Not available'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-[#666666] mb-1">Rating</h4>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <p className="text-sm text-[#000000]">
                          {booking.experts?.rating || 0}/5 ({booking.experts?.total_ratings || 0} reviews)
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-[#666666] mb-1">Verification</h4>
                      <Badge variant={booking.experts?.is_verified ? "default" : "secondary"} className="text-xs">
                        {booking.experts?.is_verified ? 'Verified' : 'Pending'}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-[#666666] mb-1">KYC Status</h4>
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
                      <h4 className="font-medium text-sm text-[#666666] mb-2">Specializations</h4>
                      <div className="max-h-24 overflow-y-auto">
                        <span className="text-sm text-[#000000] font-medium">
                          {booking.experts.subskills.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}
                  {booking.experts?.qualifications && (
                    <div>
                      <h4 className="font-medium text-sm text-[#666666] mb-1">Qualifications</h4>
                      <div className="max-h-20 overflow-y-auto">
                        <p className="text-sm text-[#000000] leading-relaxed">{booking.experts.qualifications}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <h4 className="font-medium text-sm text-[#666666] mb-1">Profile Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#666666]">
                      <div>
                        <span className="font-medium">Profile Created:</span>
                        <p className="text-[#000000]">{booking.experts?.created_at ? new Date(booking.experts.created_at).toLocaleDateString() : 'Unknown'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Last Updated:</span>
                        <p className="text-[#000000]">{booking.experts?.updated_at ? new Date(booking.experts.updated_at).toLocaleDateString() : 'Unknown'}</p>
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
                  className="bg-[#008260] hover:bg-[#008260] text-white hover:text-white rounded-[25px] text-[13px] whitespace-nowrap px-6"
                >
                  Mark Completed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateBookingStatus(booking.id, booking?.application_id, 'cancelled')}
                  className="border border-[#FF0000] text-[13px] font-medium text-[#FF0000] rounded-[25px] bg-white hover:bg-white hover:text-[#FF0000]"
                >
                  Delete
                </Button>
              </>
            )}
            
            {booking.status === 'completed' && !getBookingRating(booking.id) && (
              <Button
                size="sm"
                onClick={() => handleRateExpert(booking)}
                className="bg-[#008260] hover:bg-[#008260] text-white hover:text-white rounded-[25px] text-[13px] whitespace-nowrap"
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
        <div className="flex items-center space-x-2 text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
      </main>

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
                className="bg-[#008260] hover:bg-[#008260]"
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
