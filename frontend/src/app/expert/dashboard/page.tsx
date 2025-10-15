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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
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
  AlertCircle,
  IndianRupee
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
  const tabsListRef = useRef<HTMLDivElement>(null)

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

  // Ensure the tabs list starts scrolled to show the active (pending) tab fully on mobile
  useEffect(() => {
    if (!tabsListRef.current) return
    const container = tabsListRef.current
    const active = container.querySelector('[data-state="active"]') as HTMLElement | null
    if (active) {
      // If active trigger is partially out of view, bring it to the start
      const cRect = container.getBoundingClientRect()
      const aRect = active.getBoundingClientRect()
      if (aRect.left < cRect.left || aRect.right > cRect.right) {
        active.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'start' })
      }
      // For initial pending, ensure we are at start
      if (activeTab === 'pending') {
        container.scrollTo({ left: 0 })
      }
    } else {
      container.scrollTo({ left: 0 })
    }
  }, [activeTab])

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] sticky top-0 z-50 border-b border-slate-200/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/expert/home" className="flex items-center group">
              <Logo size="header" />
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight">Expert Dashboard</h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 font-medium">Welcome back, {expert?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-[#D6D6D6] bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#000000]">Total Applications</p>
                  <p className="text-3xl font-bold text-[#000000] my-1">{applicationCounts.pending + applicationCounts.interview + applicationCounts.rejected + analytics.completedBookings}</p>
                  <div className="flex space-x-2 text-xs text-[#656565] font-medium my-2">
                    <span>{applicationCounts.pending} pending</span>
                    <span>•</span>
                    <span>{applicationCounts.interview} interview</span>
                    <span>•</span>
                    <span>{analytics.completedBookings} completed</span>
                  </div>
                </div>
                <div className="p-3 bg-[#ECF2FF] rounded-full">
                  <Briefcase className="h-8 w-8 text-[#008260]" />
                </div>
              </div>
            </CardContent>
          </Card>

        

          <Card className="border-2 border-[#D6D6D6] bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#000000]">Success Rate</p>
                  <p className="text-3xl font-bold text-[#000000] my-1">{analytics.successRate.toFixed(1)}%</p>
                  <div className="flex space-x-2 text-xs text-[#656565] font-medium my-2">
                    <span>{expertAggregate.avg}/5 rating</span>
                    <span>•</span>
                    <span>{expertAggregate.count} reviews</span>
                  </div>
                </div>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`h-6 w-6 ${star <= Math.round(expertAggregate.avg) ? 'text-[#008260] fill-current' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[#D6D6D6] bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#000000]">This Week</p>
                  <p className="text-3xl font-bold text-[#000000] my-1">{analytics.weeklyApplications}</p>
                  <div className="flex space-x-2 text-xs text-[#656565] font-medium my-2">
                    <span>New applications</span>
                    <span>•</span>
                    <span>₹{analytics.averageProjectValue.toFixed(0)} avg project</span>
                  </div>
                </div>
                <div className="p-3 bg-[#ECF2FF] rounded-full">
                  <Calendar className="h-8 w-8 text-[#008260]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-[#D6D6D6] bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#000000]">Hourly Rate</p>
                  <p className="text-3xl font-bold text-[#000000] my-1">₹{expert?.hourly_rate}</p>
                  <p className="text-xs text-[#656565] font-medium my-1">Current rate</p>
                </div>
                <div className="p-3 bg-[#ECF2FF] rounded-full">
                  <Clock className="h-8 w-8 text-[#008260]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-[#D6D6D6] bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#000000]">Completed Projects</p>
                  <p className="text-2xl font-bold text-[#000000]">{analytics.completedBookings}</p>
                  {/* <p className="text-xs text-slate-500">{analytics.totalHoursWorked}h total work</p> */}
                </div>
                <div className="p-3 bg-[#ECF2FF] rounded-full">
                  <CheckCircle className="h-8 w-8 text-[#008260]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* <Card className="bg-gradient-to-br from-white to-slate-50/30 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300">
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
                <div className="p-3 bg-slate-100 rounded-full">
                  {expert?.is_verified ? (
                    <Shield className="h-8 w-8 text-slate-600" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-slate-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card> */}

          <Card className="border-2 border-[#D6D6D6] bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#000000]">Active Bookings</p>
                  <p className="text-2xl font-bold text-[#000000] my-1">{bookingCounts.in_progress || 0}</p>
                  <p className="text-xs text-slate-500">
                    {bookingCounts.completed || 0} completed 
                  </p>
                </div>
                <div className="p-3 bg-[#ECF2FF] rounded-full">
                  <BookOpen className="h-8 w-8 text-[#008260]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications Section */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Applications</h2>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="w-full overflow-x-auto md:overflow-x-visible scrollbar-hide">
              <TabsList ref={tabsListRef} className="flex md:grid w-max md:w-full md:grid-cols-4 gap-2 bg-white border-b border-slate-200 h-12 px-4 md:px-0">
              <TabsTrigger 
  value="pending" 
  className="data-[state=active]:bg-emerald-50 data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-emerald-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
>
  Pending ({applicationCounts.pending || 0})
</TabsTrigger>
                <TabsTrigger 
                  value="interview" 
                 className="data-[state=active]:bg-emerald-50 data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-emerald-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                >
                  Interview ({applicationCounts.interview || 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="bookings" 
                  className="data-[state=active]:bg-emerald-50 data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-emerald-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                >
                  Bookings ({bookingCounts.total || 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="rejected" 
                  className="data-[state=active]:bg-emerald-50 data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-emerald-50/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max"
                >
                  Rejected ({applicationCounts.rejected || 0})
                </TabsTrigger>
              </TabsList>
            </div>


            {/* Pending Applications Tab */}
            <TabsContent value="pending" className="space-y-6">
            <Card className="border-2 border-[#D6D6D6] bg-white">
              <CardHeader>
                  <CardTitle className="text-[#000000] font-semibold text-[18px]">Pending Applications</CardTitle>
                <CardDescription className="text-[#000000] font-base font-normal">
                    Applications waiting for review
                </CardDescription>
              </CardHeader>
              <CardContent>
                  {pagedPendingApplications?.length === 0 ? (
                  <div className="text-center py-8 flex flex-col justify-center items-center gap-3">
                      <div className="p-3 bg-[#ECF2FF] rounded-full flex justify-center items-center w-16 h-16">
                  <Briefcase className="h-8 w-8 text-[#008260]" />
                </div>
                      <p className="text-slate-600 font-medium">No pending applications</p>
                      <p className="text-sm text-slate-500">Your pending applications will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                      {pagedPendingApplications?.map((application: any) => (
                      <div key={application.id} className="bg-white border border-[#DCDCDC] rounded-lg p-4 sm:p-6 hover:border-[#008260] hover:shadow-md transition-all duration-300 group">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                          <h3 className="font-bold text-base sm:text-lg text-[#000000] group-hover:text-[#008260] hover:cursor-pointer transition-colors duration-300 min-w-0 break-words"
                          onClick={()=>router.push(`/expert/project/${application.project_id}`)}
                          >{application.projects?.title || 'Project Title'}</h3>
                          <Badge className="capitalize bg-[#FFF1E7] hover:bg-[#FFF1E7] rounded-[18px] text-xs font-semibold text-[#FF6A00] py-1.5 sm:py-2 px-3 sm:px-4 flex-shrink-0 self-start">
                            {new Date(application.applied_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-[#6A6A6A] mb-3 line-clamp-2">{application.projects?.description || 'Project description'}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 text-sm">
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#008260' }} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[#717171] text-xs">Rate:</span>
                              <p className="font-semibold text-[#008260] text-sm sm:text-base truncate">₹{application.proposed_rate || application.projects?.hourly_rate}/hrs</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#008260' }} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[#717171] text-xs">Budget:</span>
                              <p className="font-medium text-sm sm:text-base text-[#1D1D1D] truncate">₹{application.projects?.total_budget || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 sm:flex-none bg-[#ECF2FF] rounded-[25px] text-[#1D1D1D] font-medium text-[13px] hover:bg-[#008260] hover:text-white transition-colors"
                            onClick={() => router.push(`/expert/project/${application.project_id}`)}
                          >
                            View Application
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                      {pendingApplicationsLoading && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260] mx-auto"></div>
                      </div>
                    )}
                    
                      {hasMorePendingApplications && !pendingApplicationsLoading && (
                        <div ref={pendingScrollRef} className="text-center py-4">
                        <p className="text-gray-500 text-sm">Loading more applications...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

            {/* Interview Applications Tab */}
            <TabsContent value="interview" className="space-y-6">
            <Card className="border-2 border-[#D6D6D6]">
              <CardHeader>
                  <CardTitle className="text-[#000000] font-semibold text-[18px]">Interview Applications</CardTitle>
                <CardDescription className="text-[#000000] font-base font-normal">
                    Applications selected for interview
                </CardDescription>
              </CardHeader>
              <CardContent>
                  {pagedInterviewApplications?.length === 0 ? (
                  <div className="text-center py-4 flex flex-col justify-center items-center">
                      <div className="p-3 bg-[#ECF2FF] rounded-full flex justify-center items-center w-16 h-16">
                  <Briefcase className="h-8 w-8 text-[#008260]" />
                </div>
                      <p className="text-[#000000] font-semibold">No interview applications</p>
                      <p className="text-sm text-[#6A6A6A]">Applications selected for interview will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                      {pagedInterviewApplications?.map((application: any) => (
                      <div key={application.id} className="bg-white border border-[#DCDCDC] rounded-lg p-4 sm:p-6 hover:border-[#008260] hover:shadow-md transition-all duration-300 group">
                        
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                          <h3 className="font-bold text-base sm:text-lg text-[#000000] group-hover:text-[#008260] hover:cursor-pointer transition-colors duration-300 min-w-0 break-words"
                          onClick={()=>router.push(`/expert/project/${application.project_id}`)}
                          >{application.projects?.title || 'Project Title'}</h3>
                          <Badge className="capitalize bg-[#FFF1E7] hover:bg-[#FFF1E7] rounded-[18px] text-xs font-semibold text-[#FF6A00] py-1.5 sm:py-2 px-3 sm:px-4 flex-shrink-0 self-start">
                            {new Date(application.applied_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-[#6A6A6A] mb-3 line-clamp-2">{application.projects?.description || 'Project description'}</p>
                        
                        {/* Interview Date Highlight */}
                        {application.interview_date && (
                          <div className="border-l-4 border-[#008260] bg-[#F8F8F8] rounded-r-lg p-2 sm:p-3 mb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#008260] flex-shrink-0" />
                                <span className="text-xs font-semibold text-[#008260]">Interview Scheduled:</span>
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-[#000000] break-words">
                                {new Date(application.interview_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 text-sm">
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#008260]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#717171] text-xs">Rate</div>
                              <div className="font-semibold text-[#008260] text-sm sm:text-base truncate">₹{application.proposed_rate}/hrs</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-[#008260]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#717171] text-xs">Budget</div>
                              <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">₹{application.projects?.total_budget || 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3">
                          <Badge className="capitalize bg-[#E8F4F8] hover:bg-[#E8F4F8] text-[#008260] border border-[#008260] rounded-full text-xs font-semibold py-1.5 px-3 self-start">
                            Interview
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#008260] text-[#008260] hover:bg-[#008260] hover:text-white text-xs font-semibold px-4 w-full sm:w-auto"
                            onClick={() => router.push(`/expert/project/${application.project_id}`)}
                          >
                            View Application
                          </Button>
                        </div>
                      </div>
                      ))}
                      
                      {interviewApplicationsLoading && (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260] mx-auto"></div>
                        </div>
                      )}
                      
                      {hasMoreInterviewApplications && !interviewApplicationsLoading && (
                        <div ref={interviewScrollRef} className="text-center py-4">
                          <p className="text-gray-500 text-sm">Loading more applications...</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rejected Applications Tab */}
            <TabsContent value="rejected" className="space-y-6">
              <Card className="bg-gradient-to-br from-white to-slate-50/30 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-slate-900">Rejected Applications</CardTitle>
                  <CardDescription className="text-slate-600">
                    Applications that were not selected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pagedRejectedApplications?.length === 0 ? (
                    <div className="text-center py-4 flex flex-col justify-center items-center gap-y-2">
                       <div className="p-3 bg-[#ECF2FF] rounded-full flex justify-center items-center w-16 h-16">
                  <Briefcase className="h-8 w-8 text-[#008260]" />
                </div>
                      <p className="text-slate-600">No rejected applications</p>
                      <p className="text-sm text-slate-500">Rejected applications will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pagedRejectedApplications?.map((application: any) => (
                        <div key={application.id} className="bg-white border border-[#DCDCDC] rounded-lg p-4 sm:p-6 hover:border-[#008260] hover:shadow-md transition-all duration-300 group">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-base sm:text-lg text-slate-900 group-hover:text-[#008260] transition-colors duration-300 break-words">{application.projects?.title || 'Project Title'}</h3>
                            <Badge className={`${getStatusColor(application.status)} flex-shrink-0 self-start`}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(application.status)}
                                <span className="capitalize">{application.status}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 mb-2 break-words line-clamp-2">{application.projects?.description || 'Project description'}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-slate-500">
                            <span>Applied: {new Date(application.applied_at || Date.now()).toLocaleDateString()}</span>
                            <span className="font-medium text-slate-700">Proposed Rate: ₹{application.proposed_rate}</span>
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
            <Card className="border-2 border-[#D6D6D6]">
                <CardHeader>
                  <CardTitle className="text-[#000000] font-semibold text-[18px]">My Bookings</CardTitle>
                <CardDescription className="text-[#000000] font-base font-normal">
                    View and manage your current bookings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pagedBookings?.length === 0 ? (
                    <div className="text-center py-4 flex flex-col justify-center items-center">
                         <div className="p-3 bg-[#ECF2FF] rounded-full flex justify-center items-center w-16 h-16">
                  <BookOpen className="h-8 w-8 text-[#008260]" />
                </div>
                     
                      <p className="text-[#000000] font-semibold">No bookings yet</p>
                      <p className="text-sm text-[#6A6A6A]">Accepted applications will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pagedBookings?.map((booking: any) => (
                      <div key={booking.id} className="bg-white border border-[#DCDCDC] rounded-lg p-4 sm:p-6 hover:border-[#008260] hover:shadow-md transition-all duration-300 group">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                          <h3 className="font-bold text-base sm:text-lg text-[#000000] group-hover:text-[#008260] hover:cursor-pointer transition-colors duration-300 break-words"
                          onClick={()=>router.push(`/expert/project/${booking.project_id}`)}
                          >{booking.projects?.title || 'Project'}</h3>
                          <Badge className="capitalize bg-[#E8F4F8] hover:bg-[#E8F4F8] text-[#008260] border border-[#008260] rounded-full text-xs font-semibold py-1.5 px-3 self-start flex-shrink-0">
                            {booking.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-[#6A6A6A] mb-3">{booking.institutions?.name || 'Institution'}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 text-sm">
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-[#008260]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#717171] text-xs">Amount</div>
                              <div className="font-semibold text-[#008260] text-sm sm:text-base truncate">₹{booking.amount}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#008260]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#717171] text-xs">Hours Booked</div>
                              <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">{booking.hours_booked} hrs</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#008260]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#717171] text-xs">Start Date</div>
                              <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">{new Date(booking.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#008260]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#717171] text-xs">End Date</div>
                              <div className="font-semibold text-[#000000] text-sm sm:text-base truncate">{new Date(booking.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end pt-3 border-t border-[#ECECEC]">
                          {booking.status === 'in_progress' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className='bg-[#FFF2F2] rounded-3xl border border-[#9B0000] text-[#9B0000] font-medium hover:bg-[#FFE5E5] w-full sm:w-auto'
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel Booking
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this booking? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>No, Keep Booking</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-[#9B0000] hover:bg-[#7A0000]"
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
                                    Yes, Cancel Booking
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
