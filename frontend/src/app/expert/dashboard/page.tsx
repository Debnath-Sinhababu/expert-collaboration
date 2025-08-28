'use client'

import { useState, useEffect } from 'react'
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
import Logo from '@/components/Logo'
import { 
  User, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Star, 
  MessageSquare,
  
  LogOut,
  
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

  const [expert, setExpert] = useState<ExpertProfile | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationCounts, setApplicationCounts] = useState<any>({ total: 0, pending: 0, accepted: 0, rejected: 0 })
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

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    qualifications: '',
    domain_expertise: '',
    hourly_rate: '',
    resume_url: ''
  })
  const router = useRouter()

  const getUser = async (): Promise<SessionUser | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return null
    }
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

      const [, expertsResponse] = await Promise.all([
        api.projects.getAll(),
        api.experts.getAll()
      ])

      let expertProfile: ExpertProfile | null = null
      if (expertsResponse && Array.isArray(expertsResponse)) {
        console.log('Current user ID:', currentUser.id)
        console.log('Experts data:', expertsResponse)
        expertProfile = (expertsResponse as ExpertProfile[]).find((exp) => exp.user_id === currentUser.id) || null
        console.log('Found expert profile:', expertProfile)
      }
      let applicationsResponse: Application[] | unknown = []
      if (expertProfile?.id) {
        applicationsResponse = await api.applications.getAll({ expert_id: expertProfile.id, status: 'pending' })
      }

      setApplications(Array.isArray(applicationsResponse) ? (applicationsResponse as Application[]) : [])
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
          availability: expertProfile.availability || []
        }
        setExpert(expertData)
        
        setProfileForm({
          name: expertData.name || '',
          email: expertData.email ?? '',
          phone: expertProfile.phone || '',
          bio: expertData.bio || '',
          qualifications: Array.isArray(expertData.qualifications) ? expertData.qualifications.join(', ') : '',
          domain_expertise: Array.isArray(expertData.domain_expertise) ? expertData.domain_expertise.join(', ') : '',
          hourly_rate: String(expertData.hourly_rate ?? 0),
          resume_url: expertData.resume_url || ''
        })
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
        
        setProfileForm({
          name: defaultData.name || '',
          email: defaultData.email ?? '',
          phone: '',
          bio: '',
          qualifications: '',
          domain_expertise: '',
          hourly_rate: '0',
          resume_url: ''
        })
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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

  const {
    data: projects,
    loading: projectsLoading,
    hasMore: hasMoreProjects,
    loadMore: loadMoreProjects,
    // refresh: refreshProjects
  } = usePagination(
    async (page: number) => {
      return await api.projects.getAll({
        page,
        limit: 10,
        search: searchTerm,
        type: filterType === 'all' ? '' : filterType,
        status: 'open',
        expert_id: expert?.id // Pass expert_id to filter out projects they've already applied to
      });
    },
    [searchTerm, filterType, expert?.id] // Add expert?.id to dependencies
  );

  // Paginate expert's own applications
  const {
    data: pagedApplications,
    loading: applicationsLoading,
    hasMore: hasMoreApplications,
    loadMore: loadMoreApplications,
    // refresh: refreshApplications
  } = usePagination(
    async (page: number) => {
      if (!expert?.id) return []
      return await api.applications.getAll({ expert_id: expert.id, page, limit: 10, status: 'pending' })
    },
    [expert?.id]
  )

  useEffect(() => {
    setApplications(pagedApplications as Application[])
  }, [pagedApplications])

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
      return await api.bookings.getAll({ expert_id: expert.id, page, limit: 10 })
    },
    [expert?.id]
  )

  useEffect(() => {
    setBookings(pagedBookings as Booking[])
  }, [pagedBookings])

  const fetchApplicationCounts = async () => {
    try {
      if (expert?.id) {
        const counts = await api.applications.getCounts({ expert_id: expert.id, status: 'pending' })
        setApplicationCounts(counts)
      }
    } catch (error) {
      console.error('Error fetching application counts:', error)
    }
  }

  const handleSearchProjects = (term: string, type: string) => {
    setSearchTerm(term)
    setFilterType(type)
  }

  const handleApplicationSubmit = async (projectId: string) => {
    try {
      const response = await api.applications.create({
        project_id: projectId,
        cover_letter: applicationForm.coverLetter,
        proposed_rate: parseFloat(applicationForm.proposedRate)
      })

      if (response && response.id) {
        setSuccess('Application submitted successfully!')
        setApplicationForm({ coverLetter: '', proposedRate: '' })
        loadExpertData()
        // Refresh application counts after submitting new application
        setTimeout(() => fetchApplicationCounts(), 1000)
      } else {
        setError(response.error || 'Failed to submit application')
      }
    } catch (error) {
      console.error('Application submission error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      setError(message)
    }
  }

  const handleProfileUpdate = async () => {
    try {
      setLoading(true)
      const currentUser = await getUser()
      if (!currentUser) return

      const updateData = {
        ...profileForm,
        qualifications: profileForm.qualifications.split(',').map((q: string) => q.trim()).filter(q => q),
        domain_expertise: profileForm.domain_expertise.split(',').map((d: string) => d.trim()).filter(d => d),
        hourly_rate: parseFloat(profileForm.hourly_rate) || 0
      }
      
      let updatedExpert
      if (expert?.id) {
        console.log('Updating existing expert profile with ID:', expert.id)
        updatedExpert = await api.experts.update(expert.id, updateData)
      } else {
        console.log('Creating new expert profile for user:', currentUser.id)
        const createData = {
          ...updateData,
          user_id: currentUser.id
        }
        updatedExpert = await api.experts.create(createData)
      }
      
      if (updatedExpert && updatedExpert.id) {
        setExpert(updatedExpert)
        console.log('Expert profile updated/created successfully:', updatedExpert)
      }
      
      setError('')
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpertData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch application counts when expert data is loaded
  useEffect(() => {
    if (expert?.id) {
      fetchApplicationCounts()
    }
  }, [expert?.id])

  const computeExpertRating = (): { avg: number; count: number } => {
    const count = expertRatings.length
    if (count === 0) return { avg: 0, count: 0 }
    const sum = expertRatings.reduce((acc: number, r: RatingItem) => acc + (Number(r.rating) || 0), 0)
    const avg = expert?.rating || 0
    return { avg, count }
  }

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
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-slate-600 transition-all duration-300">
                <LogOut className="h-4 w-4" />
              </Button>
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
                  <p className="text-sm font-medium text-slate-700">Applications</p>
                  <p className="text-2xl font-bold text-slate-900">{applicationCounts.total}</p>
                  <p className="text-xs text-slate-500">{applicationCounts.pending} pending</p>
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
                  <p className="text-sm font-medium text-slate-700">Hourly Rate</p>
                  <p className="text-2xl font-bold text-slate-900">₹{expert?.hourly_rate}</p>
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
                  <p className="text-sm font-medium text-slate-700">Rating</p>
                  <p className="text-2xl font-bold text-slate-900">{expertAggregate.avg}/5</p>
                  <p className="text-xs text-slate-500">{expertAggregate.count} reviews</p>
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
                  <p className="text-sm font-medium text-slate-700">KYC Status</p>
                  <Badge variant={expert?.is_verified ? 'default' : 'secondary'}>
                    {expert?.kyc_status || 'Pending'}
                  </Badge>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full shadow-lg">
                  {expert?.is_verified ? (
                    <Shield className="h-8 w-8 text-white" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-white" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
        <TabsList className="flex w-full gap-2 overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-6 sm:gap-0 sm:overflow-visible scrollbar-hide bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <TabsTrigger className="px-3 py-2 snap-start ml-3 sm:ml-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white hover:bg-slate-100/80 transition-all rounded-lg" value="applications">
          My Applications
        </TabsTrigger>
        <TabsTrigger className="px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white hover:bg-slate-100/80 transition-all rounded-lg" value="projects">
          Browse Projects
        </TabsTrigger>
        <TabsTrigger className="px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white hover:bg-slate-100/80 transition-all rounded-lg" value="bookings">
          Bookings
        </TabsTrigger>
        <TabsTrigger className="px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white hover:bg-slate-100/80 transition-all rounded-lg" value="availability">
          Availability
        </TabsTrigger>
        <TabsTrigger className="px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white hover:bg-slate-100/80 transition-all rounded-lg" value="notifications">
          Notifications
        </TabsTrigger>
        <TabsTrigger className="px-3 py-2 snap-start mr-3 sm:mr-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white hover:bg-slate-100/80 transition-all rounded-lg" value="profile">
          Profile
        </TabsTrigger>
      </TabsList>


          <TabsContent value="applications" className="space-y-6">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15)'}}>
              <CardHeader>
                <CardTitle className="text-slate-900">My Applications</CardTitle>
                <CardDescription className="text-slate-600">
                  Track the status of your project applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No applications yet</p>
                    <p className="text-sm text-slate-500">Browse projects to start applying</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application) => (
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
                    
                    {applicationsLoading && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    )}
                    
                    {hasMoreApplications && !applicationsLoading && (
                      <div 
                        ref={(el) => {
                          if (el) {
                            const observer = new IntersectionObserver(
                              ([entry]) => {
                                if (entry.isIntersecting) {
                                  loadMoreApplications();
                                }
                              },
                              { threshold: 0.1 }
                            );
                            observer.observe(el);
                            return () => observer.disconnect();
                          }
                        }}
                        className="text-center py-4"
                      >
                        <p className="text-gray-500">Loading more applications...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
                <CardDescription>
                  View and manage your current bookings. You can cancel an in-progress booking.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No bookings yet</p>
                    <p className="text-sm text-gray-500">Accepted applications will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking: Booking) => (
                      <div key={booking.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2 min-w-0">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate pr-2">{booking.projects?.title || 'Project'}</h3>
                            <p className="text-sm text-gray-600 truncate">{booking.experts?.name || 'You'} with {booking.institutions?.name || 'Institution'}</p>
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
                      <div 
                        ref={(el) => {
                          if (el) {
                            const observer = new IntersectionObserver(([entry]) => {
                              if (entry.isIntersecting) {
                                loadMoreBookings();
                              }
                            }, { threshold: 0.1 });
                            observer.observe(el);
                            return () => observer.disconnect();
                          }
                        }}
                        className="text-center py-4"
                      >
                        <p className="text-gray-500">Loading more bookings...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Browse Projects</CardTitle>
                <CardDescription>
                  Find and apply to projects that match your expertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e) => handleSearchProjects(e.target.value, filterType)}
                      className="w-full"
                    />
                  </div>
                  <Select value={filterType} onValueChange={(value) => handleSearchProjects(searchTerm, value)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {PROJECT_TYPES.map((type: string) => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                                 {(projects as ProjectListItem[]).length === 0 && !projectsLoading ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No projects found</p>
                    <p className="text-sm text-gray-500">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                                         {(projects as ProjectListItem[]).map((project: ProjectListItem) => (
                      <div key={project.id} className="border rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{project.title}</h3>
                            <p className="text-gray-600 mb-3">{project.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {project.start_date} - {project.end_date}
                              </span>
                              <span className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                ₹{project.hourly_rate}/hour
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {project.duration_hours} hours
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-4">
                            {project.type?.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>

        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto">
                              <Send className="h-4 w-4 mr-2" />
              Apply Now
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Apply to Project</DialogTitle>
                              <DialogDescription>
                Submit your application for &quot;{project.title}&quot;
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="coverLetter">Cover Letter</Label>
                                <Textarea
                                  id="coverLetter"
                                  placeholder="Explain why you're the perfect fit for this project..."
                                  value={applicationForm.coverLetter}
                                  onChange={(e) => setApplicationForm({...applicationForm, coverLetter: e.target.value})}
                                  rows={4}
                                />
                              </div>
                              <div>
                                <Label htmlFor="proposedRate">Proposed Hourly Rate (₹)</Label>
                                <Input
                                  id="proposedRate"
                                  type="number"
                                  placeholder="1500"
                                  value={applicationForm.proposedRate}
                                  onChange={(e) => setApplicationForm({...applicationForm, proposedRate: e.target.value})}
                                />
                              </div>
                              <Button 
                                onClick={() => handleApplicationSubmit(project.id)}
                                className="w-full"
                                disabled={!applicationForm.coverLetter || !applicationForm.proposedRate}
                              >
                                Submit Application
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                    {/* Infinite loader sentinel for projects */}
                    {(hasMoreProjects && !projectsLoading) && (
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
                        className="text-center py-4"
                      >
                        <p className="text-gray-500">Loading more projects...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Availability Schedule</CardTitle>
                <CardDescription>
                  Manage your weekly availability for projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Weekly Schedule</h3>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{day}</span>
                        <div className="flex items-center space-x-2">
                          <Input type="time" defaultValue="09:00" className="w-24" />
                          <span>to</span>
                          <Input type="time" defaultValue="17:00" className="w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Preferences</h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="maxHours">Maximum hours per week</Label>
                        <Input id="maxHours" type="number" defaultValue="20" />
                      </div>
                      <div>
                        <Label htmlFor="minRate">Minimum hourly rate (₹)</Label>
                        <Input id="minRate" type="number" defaultValue="1000" />
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select defaultValue="ist">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ist">IST (UTC+5:30)</SelectItem>
                            <SelectItem value="utc">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button className="w-full">Save Availability</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Stay updated on application status and new opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No new notifications</p>
                  <p className="text-sm text-gray-500">Application updates and messages will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Expert Profile</CardTitle>
                <CardDescription>
                  Manage your professional profile and credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-10 w-10 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{expert?.name}</h3>
                      <p className="text-gray-600">{expert?.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={expert?.is_verified ? 'default' : 'secondary'}>
                          {expert?.kyc_status || 'Pending'}
                        </Badge>
                        {expert?.is_verified ? (
                          <Shield className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
                      <Input 
                        id="hourlyRate" 
                        type="number" 
                        value={profileForm.hourly_rate}
                        onChange={(e) => setProfileForm({...profileForm, hourly_rate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea 
                      id="bio" 
                      placeholder="Tell institutions about your expertise and experience..."
                      rows={4}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="qualifications">Qualifications</Label>
                    <Textarea 
                      id="qualifications" 
                      placeholder="List your degrees, certifications, and credentials..."
                      rows={3}
                      value={profileForm.qualifications}
                      onChange={(e) => setProfileForm({...profileForm, qualifications: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="expertise">Domain Expertise</Label>
                    <Textarea 
                      id="expertise" 
                      placeholder="Specify your areas of expertise (e.g., Machine Learning, Data Science, Web Development)..."
                      rows={3}
                      value={profileForm.domain_expertise}
                      onChange={(e) => setProfileForm({...profileForm, domain_expertise: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="resume">Resume URL</Label>
                    <Input 
                      id="resume" 
                      placeholder="https://example.com/resume.pdf"
                      value={profileForm.resume_url}
                      onChange={(e) => setProfileForm({...profileForm, resume_url: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Rating & Reviews</h4>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-4 w-4 ${star <= Math.round(expertAggregate.avg) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {expertAggregate.avg} ({expertAggregate.count} reviews)
                        </span>
                      </div>
                    </div>
                    <Button variant="outline">
                      <Award className="h-4 w-4 mr-2" />
                      View Reviews
                    </Button>
                  </div>

                  <Button className="w-full" onClick={handleProfileUpdate} disabled={loading}>
                    {loading ? 'Updating...' : 'Update Profile'}
                  </Button>

                  {!expert?.is_verified && (
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Complete your KYC verification to unlock more opportunities and build trust with institutions.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
