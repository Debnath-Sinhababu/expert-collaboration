'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { usePagination } from '@/hooks/usePagination'
import { PROJECT_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import Logo from '@/components/Logo'
import { 
  User, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Star, 
  MessageSquare,
  
  Clock,
  CheckCircle,
  XCircle,
  Send,
  
  Search,
  Bell,
  Shield,
  Award,
  AlertCircle
} from 'lucide-react'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type UserMeta = { role?: string; name?: string }
type SessionUser = { id: string; email?: string; user_metadata?: UserMeta }

export default function ExpertDashboard() {
  type ExpertProfile = {
    id?: string
    user_id?: string
    name?: string
    email?: string
    hourly_rate?: number
    rating?: number
    total_ratings?: number
    is_verified?: boolean
    kyc_status?: string
    bio?: string
    qualifications?: string[]
    domain_expertise?: string[]
    resume_url?: string
    availability?: string[]
    phone?: string
    photo_url?: string
    profile_photo_thumbnail_url?: string
    profile_photo_small_url?: string
  }

  type Application = {
    id: string
    status: 'pending' | 'accepted' | 'rejected'
    project_id: string
    projects?: { title?: string; description?: string }
    proposed_rate?: number
    applied_at?: string
    expert_id?: string
  }

  type ProjectListItem = {
    id: string
    title?: string
    description?: string
    start_date?: string
    end_date?: string
    hourly_rate?: number
    duration_hours?: number
    type?: string
  }

  const [user, setUser] = useState<any>(null)
  const [expert, setExpert] = useState<ExpertProfile | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationCounts, setApplicationCounts] = useState<any>({ total: 0, pending: 0, interview: 0, accepted: 0, rejected: 0 })
  const [bookingCounts, setBookingCounts] = useState<any>({ total: 0, in_progress: 0, completed: 0, cancelled: 0, pending: 0 })
  const [analytics, setAnalytics] = useState({
    totalEarnings: 0,
    completedBookings: 0,
    totalHoursWorked: 0,
    averageProjectValue: 0,
    successRate: 0,
    responseTime: 0,
    monthlyEarnings: 0,
    weeklyApplications: 0
  })
  interface Booking {
    id: string
    status: string
    amount: number
    hours_booked: number
    start_date: string
    end_date: string
    project?: { title?: string }
    expert?: { name?: string }
    institution?: { name?: string }
  }
  const [bookings, setBookings] = useState<Booking[]>([])
  type RatingItem = { rating: number }
  const [expertRatings, setExpertRatings] = useState<RatingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [applicationForm, setApplicationForm] = useState({
    coverLetter: '',
    proposedRate: ''
  })
  const [activeTab, setActiveTab] = useState('pending')

  // Scroll refs for infinite scrolling
  const pendingScrollRef = useRef<HTMLDivElement>(null)
  const interviewScrollRef = useRef<HTMLDivElement>(null)
  const rejectedScrollRef = useRef<HTMLDivElement>(null)
  const bookingsScrollRef = useRef<HTMLDivElement>(null)

  const router = useRouter()

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
      setLoading(true)
      const currentUser = await getUser()
      if (!currentUser) return

      const userRole = currentUser.user_metadata?.role
      if (userRole !== 'expert') {
        console.log('Non-expert user accessing expert dashboard, redirecting...')
        if (userRole === 'institution') {
          router.push('/institution/dashboard')
        } else {
          router.push('/')
        }
        return
      }

      const [, expertProfile] = await Promise.all([
        api.projects.getAll(),
        api.experts.getByUserId(currentUser.id)
      ])

   
      let applicationsResponse: Application[] | unknown = []
     

   
       if (expertProfile?.id) {
        // Fetch ratings for this expert for dynamic aggregates
        try {
          const ratingsForExpert = await api.ratings.getAll({ expert_id: expertProfile.id })
          setExpertRatings(ratingsForExpert || [])
        } catch (e) {
          console.log('Failed to fetch expert ratings:', e)
        }
      }

      if (expertProfile) {
        const expertData: ExpertProfile = {
          id: expertProfile.id,
          user_id: expertProfile.user_id,
          name: expertProfile.name || 'Expert User',
          email: expertProfile.email || currentUser.email,
          hourly_rate: expertProfile.hourly_rate || 0,
          rating: expertProfile.rating || 0,
          total_ratings: expertProfile.total_ratings || 0,
          is_verified: expertProfile.is_verified || false,
          kyc_status: expertProfile.kyc_status || 'pending',
          bio: expertProfile.bio || '',
          qualifications: expertProfile.qualifications || [],
          domain_expertise: expertProfile.domain_expertise || [],
          resume_url: expertProfile.resume_url || '',
          availability: expertProfile.availability || [],
          photo_url: expertProfile.photo_url || '',
          profile_photo_thumbnail_url: expertProfile.profile_photo_thumbnail_url || '',
          phone: expertProfile.phone || '',
          profile_photo_small_url: expertProfile.profile_photo_small_url || '',
        }
        setExpert(expertData)
        

      } else {
        const defaultData: ExpertProfile = {
          name: currentUser.user_metadata?.name || 'Expert User',
          email: currentUser.email,
          hourly_rate: 0,
          rating: 0,
          total_ratings: 0,
          is_verified: false,
          kyc_status: 'pending'
        }
        setExpert(defaultData)
        

      }
    } catch (error) {
      console.error('Error loading expert data:', error)
      const message = error instanceof Error ? error.message : ''
      if (message.includes('role') || message.includes('access')) {
        setError('You do not have access to the expert dashboard. Please contact support if you believe this is an error.')
      } else {
        setError(message || 'Failed to load expert data')
      }
    } finally {
      setLoading(false)
    }
  }



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  

  // Paginate expert's own applications - Pending
  const {
    data: pagedPendingApplications,
    loading: pendingApplicationsLoading,
    hasMore: hasMorePendingApplications,
    loadMore: loadMorePendingApplications,
    refresh: refreshPendingApplications
  } = usePagination(
    async (page: number) => {
      if (!expert?.id) return []
      const response = await api.applications.getAll({ expert_id: expert.id, page, limit: 10, status: 'pending' })
      if (response && typeof response === 'object' && 'data' in response) {
        if (page === 1) {
          setApplicationCounts((prev: any) => ({ ...prev, pending: response.counts?.pending || 0 }))
        }
        return response.data
      }
      return response
    },
    [expert?.id]
  )

  // Paginate expert's own applications - Interview
  const {
    data: pagedInterviewApplications,
    loading: interviewApplicationsLoading,
    hasMore: hasMoreInterviewApplications,
    loadMore: loadMoreInterviewApplications,
    refresh: refreshInterviewApplications
  } = usePagination(
    async (page: number) => {
      if (!expert?.id) return []
      const response = await api.applications.getAll({ expert_id: expert.id, page, limit: 10, status: 'interview' })
      if (response && typeof response === 'object' && 'data' in response) {
        if (page === 1) {
          setApplicationCounts((prev: any) => ({ ...prev, interview: response.counts?.interview || 0 }))
        }
        return response.data
      }
      return response
    },
    [expert?.id]
  )

  // Paginate expert's own applications - Rejected
  const {
    data: pagedRejectedApplications,
    loading: rejectedApplicationsLoading,
    hasMore: hasMoreRejectedApplications,
    loadMore: loadMoreRejectedApplications,
    refresh: refreshRejectedApplications
  } = usePagination(
    async (page: number) => {
      if (!expert?.id) return []
      const response = await api.applications.getAll({ expert_id: expert.id, page, limit: 10, status: 'rejected' })
      if (response && typeof response === 'object' && 'data' in response) {
        if (page === 1) {
          setApplicationCounts((prev: any) => ({ ...prev, rejected: response.counts?.rejected || 0 }))
        }
        return response.data
      }
      return response
    },
    [expert?.id]
  )

  // Paginated bookings for the expert
  const {
    data: pagedBookings,
    loading: bookingsLoading,
    hasMore: hasMoreBookings,
    loadMore: loadMoreBookings,
    refresh: refreshBookings
  } = usePagination(
    async (page: number) => {
      if (!expert?.id) return []
      const response = await api.bookings.getAll({ expert_id: expert.id, page, limit: 10 })
      if (response && typeof response === 'object' && 'data' in response) {
        if (page === 1) {
          setBookingCounts(response.counts || { total: 0, in_progress: 0, completed: 0, cancelled: 0, pending: 0 })
        }
        return response.data
      }
      return response
    },
    [expert?.id]
  )

  useEffect(() => {
    setBookings(pagedBookings as Booking[])
  }, [pagedBookings])






  useEffect(() => {
    loadExpertData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === pendingScrollRef.current) {
              loadMorePendingApplications()
            } else if (entry.target === interviewScrollRef.current) {
              loadMoreInterviewApplications()
            } else if (entry.target === rejectedScrollRef.current) {
              loadMoreRejectedApplications()
            } else if (entry.target === bookingsScrollRef.current) {
              loadMoreBookings()
            }
          }
        })
      },
      { threshold: 0.1 }
    )

    // Add a small delay to ensure DOM updates after tab change
    const timeoutId = setTimeout(() => {
      if (pendingScrollRef.current) observer.observe(pendingScrollRef.current)
      if (interviewScrollRef.current) observer.observe(interviewScrollRef.current)
      if (rejectedScrollRef.current) observer.observe(rejectedScrollRef.current)
      if (bookingsScrollRef.current) observer.observe(bookingsScrollRef.current)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [activeTab, loadMorePendingApplications, loadMoreInterviewApplications, loadMoreRejectedApplications, loadMoreBookings])


  const computeExpertRating = (): { avg: number; count: number } => {
    const count = expertRatings.length
    if (count === 0) return { avg: 0, count: 0 }
    const sum = expertRatings.reduce((acc: number, r: RatingItem) => acc + (Number(r.rating) || 0), 0)
    const avg = expert?.rating || 0
    return { avg, count }
  }

  const calculateAnalytics = useCallback(() => {
    if (!pagedBookings || !pagedPendingApplications || !pagedInterviewApplications || !pagedRejectedApplications) return

    // Calculate total earnings from completed bookings
    const completedBookings = pagedBookings.filter((booking: any) => booking.status === 'completed')
    const totalEarnings = completedBookings.reduce((sum: number, booking: any) => sum + (booking.amount || 0), 0)
    
    // Calculate total hours worked
    const totalHoursWorked = completedBookings.reduce((sum: number, booking: any) => sum + (booking.hours_booked || 0), 0)
    
    // Calculate average project value
    const averageProjectValue = completedBookings.length > 0 ? totalEarnings / completedBookings.length : 0
    
    // Calculate success rate (accepted applications / total applications)
    const totalApplications = (pagedPendingApplications?.length || 0) + 
                             (pagedInterviewApplications?.length || 0) + 
                             (pagedRejectedApplications?.length || 0) + 
                             completedBookings.length
    const acceptedApplications = completedBookings.length
    const successRate = totalApplications > 0 ? (acceptedApplications / totalApplications) * 100 : 0
    
    // Calculate monthly earnings (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const monthlyBookings = completedBookings.filter((booking: any) => 
      new Date(booking.created_at || booking.start_date) >= thirtyDaysAgo
    )
    const monthlyEarnings = monthlyBookings.reduce((sum: number, booking: any) => sum + (booking.amount || 0), 0)
    
    // Calculate weekly applications (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weeklyApplications = [
      ...(pagedPendingApplications || []),
      ...(pagedInterviewApplications || []),
      ...(pagedRejectedApplications || [])
    ].filter((app: any) => new Date(app.applied_at || app.created_at) >= sevenDaysAgo).length

    setAnalytics({
      totalEarnings,
      completedBookings: completedBookings.length,
      totalHoursWorked,
      averageProjectValue,
      successRate,
      responseTime: 0, // This would need to be calculated from application timestamps
      monthlyEarnings,
      weeklyApplications
    })
  }, [pagedBookings, pagedPendingApplications, pagedInterviewApplications, pagedRejectedApplications])

  // Update analytics when data changes
  useEffect(() => {
    calculateAnalytics()
  }, [calculateAnalytics])

  const expertAggregate = computeExpertRating()

  // Projects are now filtered by the backend API based on expert_id

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading dashboard...</p>
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      <header className="bg-slate-900/95 backdrop-blur-xl shadow-2xl border-b border-slate-700/50 relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 group">
              <Logo size="md" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Calxmap</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-slate-600 transition-all duration-300">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <ProfileDropdown user={user} expert={expert} userType="expert" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        {error && (
          <Alert className="mb-6 bg-red-50/90 backdrop-blur-md border-red-200" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50/90 backdrop-blur-md border-green-200" variant="default">
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4 drop-shadow-2xl">Expert Dashboard</h1>
          <p className="text-xl text-slate-300 drop-shadow-lg">Welcome back, {expert?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15)'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Total Applications</p>
                  <p className="text-2xl font-bold text-slate-900">{applicationCounts.pending + applicationCounts.interview + applicationCounts.rejected + analytics.completedBookings}</p>
                  <div className="flex space-x-2 text-xs text-slate-500">
                    <span>{applicationCounts.pending} pending</span>
                    <span>•</span>
                    <span>{applicationCounts.interview} interview</span>
                    <span>•</span>
                    <span>{analytics.completedBookings} completed</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-lg">
                  <Briefcase className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(34, 197, 94, 0.25), 0 0 0 1px rgba(34, 197, 94, 0.15)'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Total Earnings</p>
                  <p className="text-2xl font-bold text-slate-900">₹{analytics.totalEarnings.toLocaleString()}</p>
                  {/* <div className="flex space-x-2 text-xs text-slate-500">
                    <span>₹{analytics.monthlyEarnings.toLocaleString()} this month</span>
                    <span>•</span>
                    <span>{analytics.totalHoursWorked}h worked</span>
                  </div> */}
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(251, 191, 36, 0.25), 0 0 0 1px rgba(251, 191, 36, 0.15)'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Success Rate</p>
                  <p className="text-2xl font-bold text-slate-900">{analytics.successRate.toFixed(1)}%</p>
                  <div className="flex space-x-2 text-xs text-slate-500">
                    <span>{expertAggregate.avg}/5 rating</span>
                    <span>•</span>
                    <span>{expertAggregate.count} reviews</span>
                  </div>
                </div>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`h-6 w-6 ${star <= Math.round(expertAggregate.avg) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(147, 51, 234, 0.25), 0 0 0 1px rgba(147, 51, 234, 0.15)'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">This Week</p>
                  <p className="text-2xl font-bold text-slate-900">{analytics.weeklyApplications}</p>
                  <div className="flex space-x-2 text-xs text-slate-500">
                    <span>New applications</span>
                    <span>•</span>
                    <span>₹{analytics.averageProjectValue.toFixed(0)} avg project</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full shadow-lg">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.15)'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Hourly Rate</p>
                  <p className="text-2xl font-bold text-slate-900">₹{expert?.hourly_rate}</p>
                  <p className="text-xs text-slate-500">Current rate</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg">
                  <Clock className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.15)'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Completed Projects</p>
                  <p className="text-2xl font-bold text-slate-900">{analytics.completedBookings}</p>
                  {/* <p className="text-xs text-slate-500">{analytics.totalHoursWorked}h total work</p> */}
                </div>
                <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.15)'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">KYC Status</p>
                  <Badge variant={expert?.is_verified ? 'default' : 'secondary'} className="text-sm">
                    {expert?.kyc_status || 'Pending'}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-1">
                    {expert?.is_verified ? 'Verified Expert' : 'Verification Pending'}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full shadow-lg">
                  {expert?.is_verified ? (
                    <Shield className="h-8 w-8 text-white" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(168, 85, 247, 0.25), 0 0 0 1px rgba(168, 85, 247, 0.15)'}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Active Bookings</p>
                  <p className="text-2xl font-bold text-slate-900">{bookingCounts.in_progress || 0}</p>
                  <p className="text-xs text-slate-500">
                    {bookingCounts.completed || 0} completed 
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full shadow-lg">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications Section */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Applications</h2>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex w-full gap-2 overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-4 sm:gap-0 sm:overflow-visible scrollbar-hide bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
              <TabsTrigger className="px-3 py-2 snap-start ml-3 sm:ml-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white hover:bg-slate-100/80 transition-all rounded-lg" value="pending">
                Pending ({applicationCounts.pending || 0})
        </TabsTrigger>
              <TabsTrigger className="px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white hover:bg-slate-100/80 transition-all rounded-lg" value="interview">
                Interview ({applicationCounts.interview || 0})
              </TabsTrigger>
        <TabsTrigger className="px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white hover:bg-slate-100/80 transition-all rounded-lg" value="bookings">
                Bookings ({bookingCounts.total || 0})
        </TabsTrigger>
              <TabsTrigger className="px-3 py-2 snap-start mr-3 sm:mr-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white hover:bg-slate-100/80 transition-all rounded-lg" value="rejected">
                Rejected ({applicationCounts.rejected || 0})
        </TabsTrigger>
      </TabsList>


            {/* Pending Applications Tab */}
            <TabsContent value="pending" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15)'}}>
              <CardHeader>
                  <CardTitle className="text-slate-900">Pending Applications</CardTitle>
                <CardDescription className="text-slate-600">
                    Applications waiting for review
                </CardDescription>
              </CardHeader>
              <CardContent>
                  {pagedPendingApplications?.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No pending applications</p>
                      <p className="text-sm text-slate-500">Your pending applications will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                      {pagedPendingApplications?.map((application: any) => (
                      <div key={application.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2 min-w-0">
                          <h3 className="font-semibold truncate pr-2">{application.projects?.title || 'Project Title'}</h3>
                          <Badge className={getStatusColor(application.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(application.status)}
                              <span className="capitalize">{application.status}</span>
                            </div>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 break-words line-clamp-2">{application.projects?.description || 'Project description'}</p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Applied: {new Date(application.applied_at || Date.now()).toLocaleDateString()}</span>
                          <span>Proposed Rate: ₹{application.proposed_rate}</span>
                          </div>
                      </div>
                    ))}
                    
                      {pendingApplicationsLoading && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    )}
                    
                      {hasMorePendingApplications && !pendingApplicationsLoading && (
                        <div ref={pendingScrollRef} className="text-center py-4">
                        <p className="text-gray-500">Loading more applications...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

            {/* Interview Applications Tab */}
            <TabsContent value="interview" className="space-y-6">
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{boxShadow: '0 25px 50px -12px rgba(34, 197, 94, 0.25), 0 0 0 1px rgba(34, 197, 94, 0.15)'}}>
              <CardHeader>
                  <CardTitle className="text-slate-900">Interview Applications</CardTitle>
                  <CardDescription className="text-slate-600">
                    Applications selected for interview
                </CardDescription>
              </CardHeader>
              <CardContent>
                  {pagedInterviewApplications?.length === 0 ? (
                  <div className="text-center py-8">
                      <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No interview applications</p>
                      <p className="text-sm text-slate-500">Applications selected for interview will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                      {pagedInterviewApplications?.map((application: any) => (
                        <div key={application.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2 min-w-0">
                            <h3 className="font-semibold truncate pr-2">{application.projects?.title || 'Project Title'}</h3>
                            <Badge className={getStatusColor(application.status)}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(application.status)}
                                <span className="capitalize">{application.status}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 break-words line-clamp-2">{application.projects?.description || 'Project description'}</p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>Applied: {new Date(application.applied_at || Date.now()).toLocaleDateString()}</span>
                            <span>Proposed Rate: ₹{application.proposed_rate}</span>
                          </div>
                        </div>
                      ))}
                      
                      {interviewApplicationsLoading && (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      )}
                      
                      {hasMoreInterviewApplications && !interviewApplicationsLoading && (
                        <div ref={interviewScrollRef} className="text-center py-4">
                          <p className="text-gray-500">Loading more applications...</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rejected Applications Tab */}
            <TabsContent value="rejected" className="space-y-6">
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.15)'}}>
                <CardHeader>
                  <CardTitle className="text-slate-900">Rejected Applications</CardTitle>
                  <CardDescription className="text-slate-600">
                    Applications that were not selected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pagedRejectedApplications?.length === 0 ? (
                    <div className="text-center py-8">
                      <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No rejected applications</p>
                      <p className="text-sm text-slate-500">Rejected applications will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pagedRejectedApplications?.map((application: any) => (
                        <div key={application.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2 min-w-0">
                            <h3 className="font-semibold truncate pr-2">{application.projects?.title || 'Project Title'}</h3>
                            <Badge className={getStatusColor(application.status)}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(application.status)}
                                <span className="capitalize">{application.status}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 break-words line-clamp-2">{application.projects?.description || 'Project description'}</p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>Applied: {new Date(application.applied_at || Date.now()).toLocaleDateString()}</span>
                            <span>Proposed Rate: ₹{application.proposed_rate}</span>
                          </div>
                        </div>
                      ))}
                      
                      {rejectedApplicationsLoading && (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      )}
                      
                      {hasMoreRejectedApplications && !rejectedApplicationsLoading && (
                        <div ref={rejectedScrollRef} className="text-center py-4">
                          <p className="text-gray-500">Loading more applications...</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-6">
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{boxShadow: '0 25px 50px -12px rgba(147, 51, 234, 0.25), 0 0 0 1px rgba(147, 51, 234, 0.15)'}}>
                <CardHeader>
                  <CardTitle className="text-slate-900">My Bookings</CardTitle>
                  <CardDescription className="text-slate-600">
                    View and manage your current bookings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pagedBookings?.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No bookings yet</p>
                      <p className="text-sm text-slate-500">Accepted applications will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pagedBookings?.map((booking: any) => (
                      <div key={booking.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2 min-w-0">
                          <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate pr-2">{booking.project?.title || 'Project'}</h3>
                              <p className="text-sm text-gray-600 truncate">{booking.expert?.name || 'You'} with {booking.institution?.name || 'Institution'}</p>
                          </div>
                          <Badge className="capitalize" variant="outline">{booking.status?.replace('_', ' ')}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Amount:</span> ₹{booking.amount}
                          </div>
                          <div>
                            <span className="font-medium">Hours:</span> {booking.hours_booked}
                          </div>
                          <div>
                            <span className="font-medium">Start:</span> {new Date(booking.start_date).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">End:</span> {new Date(booking.end_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          {booking.status === 'in_progress' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await api.bookings.delete(booking.id)
                                  await refreshBookings()
                                } catch (e) {
                                  console.error('Failed to cancel booking', e)
                                  setError('Failed to cancel booking')
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Booking
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {bookingsLoading && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    )}

                    {hasMoreBookings && !bookingsLoading && (
                        <div ref={bookingsScrollRef} className="text-center py-4">
                        <p className="text-gray-500">Loading more bookings...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </div>
  )
}
