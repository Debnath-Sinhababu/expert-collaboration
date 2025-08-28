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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Drawer } from '@/components/ui/drawer'
import ProjectApplications from '@/components/ProjectApplications'
import Logo from '@/components/Logo'
import { 
  Building, 
  Plus, 
  Users, 
  Star, 
  LogOut,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  Search,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Bell,
  Shield,
  MessageSquare,
  AlertCircle,
  BookOpen
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RatingModal } from '@/components/RatingModal'
import NotificationBell from '@/components/NotificationBell'


export default function InstitutionDashboard() {
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [bookingCounts, setBookingCounts] = useState<any>({ total: 0, in_progress: 0, completed: 0, cancelled: 0, pending: 0 })
  const [ratings, setRatings] = useState<any[]>([])
  const [allRatings, setAllRatings] = useState<any[]>([])
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedExpert, setSelectedExpert] = useState<any>(null)
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
    required_expertise: ''
  })
  const [submittingProject, setSubmittingProject] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [applicationsDrawerOpen, setApplicationsDrawerOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<{ id: string; title?: string } | null>(null)
  const [profileForm, setProfileForm] = useState({
    name: '',
    type: '',
    description: '',
    email: '',
    phone: '',
    website_url: '',
    city: '',
    state: '',
    country: '',
    address: ''
  })
  const router = useRouter()
  

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
          console.log('Non-institution user accessing institution dashboard, redirecting...')
          if (userRole === 'expert') {
            router.push('/expert/dashboard')
          } else {
            router.push('/')
          }
          return
        }
        
        await loadInstitutionData(user.id)
      } catch (error: any) {
        console.error('Error getting user:', error)
        setError('Failed to get user data')
      }
    }
    getUser()
  }, [router])

  const loadInstitutionData = async (userId: string) => {
    try {
      const institutionsResponse = await api.institutions.getAll()
      // Handle case where API might return { data: [...] } or direct array
      const institutions = Array.isArray(institutionsResponse) ? institutionsResponse : (institutionsResponse?.data || [])
      const institutionProfile = institutions.find((i: any) => i.user_id === userId)
      
      if (!institutionProfile) {
        router.push('/institution/profile-setup')
        return
      }
      
      setInstitution(institutionProfile)
      
      setProfileForm({
        name: institutionProfile.name || '',
        type: institutionProfile.type || '',
        description: institutionProfile.description || '',
        email: institutionProfile.email || '',
        phone: institutionProfile.phone || '',
        website_url: institutionProfile.website_url || '',
        city: institutionProfile.city || '',
        state: institutionProfile.state || '',
        country: institutionProfile.country || 'India',
        address: institutionProfile.address || ''
      })
      
      // Initial light calls (experts list is paginated below). Lists are fed by paginated hooks
      const [projectsResponse, applicationsResponse, expertsResponse, bookingsResponse, bookingCountsResponse] = await Promise.all([
        api.projects.getAll(),
        api.applications.getAll({ status: 'pending' }),
        api.experts.getAll(),
        api.bookings.getAll({ institution_id: institutionProfile.id }),
        api.bookings.getCounts({ institution_id: institutionProfile.id })
      ])

      // Handle API responses that might have data property
      const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse?.data || [])
      const applications = Array.isArray(applicationsResponse) ? applicationsResponse : (applicationsResponse?.data || [])
      const experts = Array.isArray(expertsResponse) ? expertsResponse : (expertsResponse?.data || [])
      const bookings = Array.isArray(bookingsResponse) ? bookingsResponse : (bookingsResponse?.data || [])
      const counts = bookingCountsResponse || { total: 0, in_progress: 0, completed: 0, cancelled: 0, pending: 0 }

      setBookings(bookings)
      setBookingCounts(counts)
      
      const institutionProjects = projects.filter((project: any) => project.institution_id === institutionProfile.id)
      setProjects(institutionProjects)

      console.log('institutionProjects', institutionProjects)
      console.log('applications', applications)
      const projectApplications = applications.filter((app: any) => 
        institutionProjects.some((project: any) => project.id === app.project_id)
      )

      console.log('projectApplications', projectApplications)
      setApplications(projectApplications)

      // Fetch all ratings (to compute expert aggregates globally)
      try {
        const ratingsAll = await api.ratings.getAll({institution_id: institutionProfile.id})
        const ratings = Array.isArray(ratingsAll) ? ratingsAll : (ratingsAll?.data || [])
        setAllRatings(ratings)
      } catch (e) {
        console.log('Failed to fetch global ratings:', e)
      }
      
    } catch (error: any) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', error)
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
      case 'open': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'accepted': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const {
    data: experts,
    loading: expertsLoading,
    hasMore: hasMoreExperts,
    loadMore: loadMoreExperts,
    refresh: refreshExperts
  } = usePagination(
    async (page: number) => {
      return await api.experts.getAll({
        page,
        limit: 10,
        search: searchTerm
      });
    },
    [searchTerm]
  );

  // Paginated projects owned by the institution
  const {
    data: pagedProjects,
    loading: projectsLoading,
    hasMore: hasMoreProjects,
    loadMore: loadMoreProjects,
    refresh: refreshProjects
  } = usePagination(
    async (page: number) => {
      if (!institution?.id) return []
      return await api.projects.getAll({ page, limit: 10, institution_id: institution?.id })
    },
    [institution?.id]
  )

  useEffect(() => {
    setProjects(pagedProjects)
  }, [pagedProjects])

  // Paginated applications targeting institution projects
  const {
    data: pagedApplications,
    loading: applicationsLoading,
    hasMore: hasMoreApplications,
    loadMore: loadMoreApplications,
    refresh: refreshApplications
  } = usePagination(
    async (page: number) => {
      if (!institution?.id) return []
      return await api.applications.getAll({ page, limit: 10, institution_id: institution?.id, status: 'pending' })
    },
    [institution?.id]
  )

  useEffect(() => {
    setApplications(pagedApplications)
  }, [pagedApplications])

  // Paginated bookings for the institution
  const {
    data: pagedBookings,
    loading: bookingsLoading,
    hasMore: hasMoreBookings,
    loadMore: loadMoreBookings,
    refresh: refreshBookings
  } = usePagination(
    async (page: number) => {
      if (!institution?.id) return []
      return await api.bookings.getAll({ page, limit: 10, institution_id: institution?.id })
    },
    [institution?.id]
  )

  useEffect(() => {
    setBookings(pagedBookings)
  }, [pagedBookings])

  // Refresh booking counts when institution changes (for stats display)
  useEffect(() => {
    if (institution?.id) {
      fetchBookingCounts()
    }
  }, [institution?.id])



  const handleSearchExperts = (term: string) => {
    setSearchTerm(term)
  }

  const fetchBookingCounts = async () => {
    try {
      if (institution?.id) {
        const counts = await api.bookings.getCounts({ institution_id: institution.id })
        setBookingCounts(counts)
      }
    } catch (error) {
      console.error('Error fetching booking counts:', error)
    }
  }

  const handleProfileUpdate = async () => {
    try {
      setSubmittingProject(true)
      const currentUser = await supabase.auth.getUser()
      if (!currentUser.data.user) return

      const updateData = {
        ...profileForm
      }
      
      let updatedInstitution
      if (institution?.id) {
        console.log('Updating existing institution profile with ID:', institution.id)
        updatedInstitution = await api.institutions.update(institution.id, updateData)
      } else {
        console.log('Creating new institution profile for user:', currentUser.data.user.id)
        const createData = {
          ...updateData,
          user_id: currentUser.data.user.id
        }
        updatedInstitution = await api.institutions.create(createData)
      }
      
      if (updatedInstitution && updatedInstitution.id) {
        setInstitution(updatedInstitution)
        console.log('Institution profile updated/created successfully:', updatedInstitution)
      }
      
      setError('')
      
    } catch (error: any) {
      console.error('Institution profile update error:', error)
      setError(`Failed to update profile: ${error.message}`)
    } finally {
      setSubmittingProject(false)
    }
  }

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectForm.title || !projectForm.description || !projectForm.type || !projectForm.hourly_rate) {
      setError('Please fill in all required fields')
      return
    }

    setSubmittingProject(true)
    try {
      await api.projects.create({
        institution_id: institution.id,
        title: projectForm.title,
        description: projectForm.description,
        type: projectForm.type,
        hourly_rate: parseFloat(projectForm.hourly_rate),
        total_budget: parseFloat(projectForm.total_budget) || parseFloat(projectForm.hourly_rate) * parseInt(projectForm.duration_hours || '1'),
        start_date: projectForm.start_date,
        end_date: projectForm.end_date,
        duration_hours: parseInt(projectForm.duration_hours) || 1,
        required_expertise: projectForm.required_expertise.split(',').map(s => s.trim()).filter(s => s),
        status: 'open'
      })
      
      // Reset form and close dialog
      setProjectForm({
        title: '',
        description: '',
        type: '',
        hourly_rate: '',
        total_budget: '',
        start_date: '',
        end_date: '',
        duration_hours: '',
        required_expertise: ''
      })
      setShowProjectForm(false)
      
      // Refresh data to show new project
      await loadInstitutionData(user.id)
      setError('')
    } catch (error: any) {
      console.error('Project creation error:', error)
      setError('Failed to create project')
    } finally {
      setSubmittingProject(false)
    }
  }

  const handleApplicationAction = async (applicationId: string, action: 'accept' | 'reject') => {
    try {
      await api.applications.update(applicationId, { status: action === 'accept' ? 'accepted' : 'rejected',reviewed_at: new Date() })
      
      // If accepting, create a booking
      if (action === 'accept') {
        const application = applications.find(app => app.id === applicationId)
        if (application) {
          const bookingData = {
            expert_id: application.expert_id,
            institution_id: institution.id,
            project_id: application.project_id,
            application_id: applicationId,
            amount: application.proposed_rate || 1000,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
            hours_booked: 1,
            status: 'in_progress',
            payment_status: 'pending'
          }
          
          await api.bookings.create(bookingData)
        }
      }
      
      // Refresh all data to show updated applications and new bookings
      await loadInstitutionData(user.id)
      setError('')
    } catch (error: any) {
      console.error('Application action error:', error)
      setError(`Failed to ${action} application`)
    }
  }

  const handleEditProject = (project: any) => {
    setEditingProject(project)
    setProjectForm({
      title: project.title,
      description: project.description,
      type: project.type,
      hourly_rate: project.hourly_rate.toString(),
      total_budget: project.total_budget.toString(),
      start_date: project.start_date,
      end_date: project.end_date,
      duration_hours: project.duration_hours.toString(),
      required_expertise: project.required_expertise.join(', ')
    })
    setShowEditForm(true)
  }

  const handleViewApplications = (project: any) => {
    setSelectedProject({ id: project.id, title: project.title })
    setApplicationsDrawerOpen(true)
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectForm.title || !projectForm.description || !projectForm.type || !projectForm.hourly_rate) {
      setError('Please fill in all required fields')
      return
    }

    setSubmittingProject(true)
    try {
      const result = await api.projects.update(editingProject.id, {
        title: projectForm.title,
        description: projectForm.description,
        type: projectForm.type,
        hourly_rate: parseFloat(projectForm.hourly_rate),
        total_budget: parseFloat(projectForm.total_budget) || parseFloat(projectForm.hourly_rate) * parseInt(projectForm.duration_hours || '1'),
        start_date: projectForm.start_date,
        end_date: projectForm.end_date,
        duration_hours: parseInt(projectForm.duration_hours) || 1,
        required_expertise: projectForm.required_expertise.split(',').map(s => s.trim()).filter(s => s)
      })
      
      console.log('Project updated successfully:', result)
      
      setProjectForm({
        title: '',
        description: '',
        type: '',
        hourly_rate: '',
        total_budget: '',
        start_date: '',
        end_date: '',
        duration_hours: '',
        required_expertise: ''
      })
      setShowEditForm(false)
      setEditingProject(null)
      await loadInstitutionData(user.id)
      setError('')
    } catch (error: any) {
      console.error('Project update error:', error)
      setError(`Failed to update project: ${error.message}`)
    } finally {
      setSubmittingProject(false)
    }
  }

  const handleCreateProject = () => {
    setProjectForm({
      title: '',
      description: '',
      type: '',
      hourly_rate: '',
      total_budget: '',
      start_date: '',
      end_date: '',
      duration_hours: '',
      required_expertise: ''
    })
    setShowProjectForm(true)
  }

  const handleCloseProject = async (projectId: string) => {
    try {
      const result = await api.projects.update(projectId, { status: 'closed' })
      console.log('Project closed successfully:', result)
      await loadInstitutionData(user.id)
      setError('')
    } catch (error: any) {
      console.error('Project close error:', error)
      setError(`Failed to close project: ${error.message}`)
    }
  }



  // Get status variant for badges
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'default'
      case 'completed':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Handle booking status update
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      if (newStatus === 'cancelled') {
        // For cancelled bookings, delete them immediately
        await handleBookingDelete(bookingId)
      } else if (newStatus === 'completed') {
        // For completed bookings, update status and open rating modal
        await api.bookings.update(bookingId, { status: newStatus })
        await loadInstitutionData(user.id)
        
        // Find the updated booking and open rating modal
        const updatedBooking = bookings.find(b => b.id === bookingId)
        if (updatedBooking) {
          setSelectedBooking({ ...updatedBooking, status: 'completed' })
          setRatingModalOpen(true)
        }
      } else {
        // For other status updates
        await api.bookings.update(bookingId, { status: newStatus })
        await loadInstitutionData(user.id)
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      alert('Failed to update booking status')
    }
  }

  // Handle booking deletion
  const handleBookingDelete = async (bookingId: string) => {
    if (confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      try {
        await api.bookings.delete(bookingId)
        await loadInstitutionData(user.id)
      } catch (error) {
        console.error('Error deleting booking:', error)
        alert('Failed to delete booking')
      }
    }
  }

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Fetch ratings for completed bookings
  const fetchRatings = async () => {
    try {
      const ratingsData = await api.ratings.getAll({ institution_id: institution.id })
      setRatings(ratingsData)
    } catch (error) {
      console.error('Error fetching ratings:', error)
    }
  }

  // Handle rating modal
  const handleRateExpert = (booking: any) => {
    setSelectedBooking(booking)
    setRatingModalOpen(true)
  }

  const handleRatingSubmitted = () => {
    loadInstitutionData(user.id)
    fetchRatings()
  }

  // Check if a booking has been rated
  const getBookingRating = (bookingId: string) => {
    return ratings.find(r => r.booking_id === bookingId)
  }

  // Aggregate rating for an expert from allRatings
  const getExpertAggregate = (expertId: string | undefined) => {
    if (!expertId) return { avg: 0, count: 0 }
    const list = allRatings.filter(r => r.expert_id === expertId)
    const count = list.length
    if (count === 0) return { avg: 0, count: 0 }
    const sum = list.reduce((acc, r) => acc + (Number(r.rating) || 0), 0)
    const avg = Math.round((sum / count) * 10) / 10
    return { avg, count }
  }

  // Load ratings when institution is available
  useEffect(() => {
    if (institution) {
      fetchRatings()
    }
  }, [institution?.id]) // Only depend on institution ID

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto mb-4"></div>
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
      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-xl shadow-2xl border-b border-slate-700/50 relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link href="/" className="flex items-center space-x-2 group">
              <Logo size="md" />
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Calxmap</span>
            </Link>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-slate-400" />
                <span className="text-sm sm:text-base text-slate-300 truncate">{institution?.name}</span>
              </div>
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full sm:w-auto text-slate-300 hover:text-white hover:bg-slate-800/50 border-slate-600 hover:border-slate-500 transition-all duration-300">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50/90 backdrop-blur-md border-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Welcome Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4 truncate drop-shadow-2xl">
              Welcome back, {institution?.name}!
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 drop-shadow-lg">
              Manage your projects, review applications, and connect with qualified experts.
            </p>
          </div>
          <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-2xl hover:shadow-3xl hover:shadow-blue-500/25 transition-all duration-300 w-full sm:w-auto border-2 border-blue-400/20 hover:border-blue-400/40" onClick={handleCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              Post New Project
            </Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Post New Project</DialogTitle>
                <DialogDescription>
                  Create a new project to find qualified experts
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Project Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter project title"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Project Type *</Label>
                    <Select value={projectForm.type} onValueChange={(value) => setProjectForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the project requirements and objectives..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="hourly_rate">Hourly Rate (₹) *</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      placeholder="Enter hourly rate"
                      value={projectForm.hourly_rate}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_hours">Duration (hours)</Label>
                    <Input
                      id="duration_hours"
                      type="number"
                      placeholder="Total hours"
                      value={projectForm.duration_hours}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, duration_hours: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_budget">Total Budget (₹)</Label>
                    <Input
                      id="total_budget"
                      type="number"
                      placeholder="Maximum budget"
                      value={projectForm.total_budget}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, total_budget: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="required_expertise">Required Expertise</Label>
                  <Input
                    id="required_expertise"
                    placeholder="Enter skills separated by commas (e.g., Machine Learning, Data Science)"
                    value={projectForm.required_expertise}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, required_expertise: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-0 sm:space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowProjectForm(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingProject} className="w-full sm:w-auto">
                    {submittingProject ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Project Dialog */}
          <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
                <DialogDescription>
                  Update your project details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-title">Project Title *</Label>
                    <Input
                      id="edit-title"
                      placeholder="Enter project title"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-type">Project Type *</Label>
                    <Select value={projectForm.type} onValueChange={(value) => setProjectForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description *</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Describe the project requirements and objectives..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-hourly_rate">Hourly Rate (₹) *</Label>
                    <Input
                      id="edit-hourly_rate"
                      type="number"
                      placeholder="Enter hourly rate"
                      value={projectForm.hourly_rate}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-duration_hours">Duration (hours)</Label>
                    <Input
                      id="edit-duration_hursor"
                      type="number"
                      placeholder="Total hours"
                      value={projectForm.duration_hours}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, duration_hours: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-total_budget">Total Budget (₹)</Label>
                    <Input
                      id="edit-total_budget"
                      type="number"
                      placeholder="Maximum budget"
                      value={projectForm.total_budget}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, total_budget: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-start_date">Start Date</Label>
                    <Input
                      id="edit-start_date"
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-end_date">End Date</Label>
                    <Input
                      id="edit-end_date"
                      type="date"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-required_expertise">Required Expertise</Label>
                  <Input
                    id="edit-required_expertise"
                    placeholder="Enter skills separated by commas (e.g., Machine Learning, Data Science)"
                    value={projectForm.required_expertise}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, required_expertise: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-0 sm:space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditForm(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingProject} className="w-full sm:w-auto">
                    {submittingProject ? 'Updating...' : 'Update Project'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/90 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                  <p className="text-xs text-gray-500">
                    {projects.filter(p => p.status === 'open').length} open
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg">
                  <Briefcase className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                                  <div>
                    <p className="text-sm font-medium text-gray-600">Applications</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {projects.reduce((total, project) => total + (project.applicationCounts?.total || 0), 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {projects.reduce((total, project) => total + (project.applicationCounts?.pending || 0), 0)} pending
                    </p>
                  </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bookingCounts.in_progress}
                  </p>
                  <p className="text-xs text-gray-500">in progress</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full shadow-lg">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bookingCounts.completed}
                  </p>
                  <p className="text-xs text-gray-500">bookings</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{institution?.rating || 0}/5</p>
                  <p className="text-xs text-gray-500">{institution?.total_ratings || 0} reviews</p>
                </div>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`h-6 w-6 ${star <= Math.floor(institution?.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="flex w-full gap-2 overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-4 sm:gap-0 sm:overflow-visible scrollbar-hide bg-white/90 backdrop-blur-md border-0 shadow-lg">
            <TabsTrigger className="flex-shrink-0 whitespace-nowrap px-3 py-2 snap-start ml-3 sm:ml-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:bg-gray-100/80 transition-all" value="projects">My Projects</TabsTrigger>
            <TabsTrigger className="flex-shrink-0 whitespace-nowrap px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:bg-gray-100/80 transition-all" value="bookings">Bookings</TabsTrigger>
            <TabsTrigger className="flex-shrink-0 whitespace-nowrap px-3 py-2 snap-start data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:bg-gray-100/80 transition-all" value="experts">Browse Experts</TabsTrigger>
            {/* <TabsTrigger className="flex-shrink-0 whitespace-nowrap px-3 py-2 snap-start" value="notifications">Notifications</TabsTrigger> */}
            <TabsTrigger className="flex-shrink-0 whitespace-nowrap px-3 py-2 snap-start mr-3 sm:mr-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:bg-gray-100/80 transition-all" value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>My Projects</CardTitle>
                <CardDescription>
                  Manage your posted projects and track their progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No projects posted yet</p>
                    <p className="text-sm text-gray-500">Create your first project to find experts</p>
                    <Button className="mt-4" onClick={handleCreateProject}>
                      <Plus className="h-4 w-4 mr-2" />
                      Post Your First Project
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project: any) => (
                      <div 
                        key={project.id} 
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-2 min-w-0">
                          <h3 className="font-semibold text-lg truncate pr-2">{project.title}</h3>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Badge variant="outline" className="capitalize">{project.status}</Badge>
                            <Badge variant="secondary" className="capitalize">{project.type}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-500">Rate:</span>
                            <p className="font-medium">₹{project.hourly_rate}/hour</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <p className="font-medium">{project.duration_hours} hours</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Budget:</span>
                            <p className="font-medium">₹{project.total_budget}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Applications:</span>
                            <p className="font-medium">
                              {applications.filter(app => app.project_id === project.id).length}
                            </p>
                          </div>
                        </div>
                        {project.required_expertise && project.required_expertise.length > 0 && (
                          <div className="mb-4">
                            <span className="text-sm text-gray-500">Required Expertise:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {project.required_expertise.map((skill: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-sm text-gray-500">
                            Posted: {new Date(project.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 sm:flex-none"
                              onClick={() => handleViewApplications(project)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Applications ({project.applicationCounts?.pending || 0})
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditProject(project)} className="flex-1 sm:flex-none">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            {project.status === 'open' && (
                              <Button size="sm" variant="outline" onClick={() => handleCloseProject(project.id)} className="flex-1 sm:flex-none">
                                <XCircle className="h-4 w-4 mr-2" />
                                Close
                              </Button>
                            )}
                          </div>
                        </div>
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
                        className="text-center py-4 text-sm text-gray-500"
                      >
                        Loading more projects...
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
        

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
                <CardDescription>
                  Manage your booked projects and track their progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No bookings yet</p>
                    <p className="text-sm text-gray-500">Bookings will appear here when you accept expert applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking: any) => {
                      const rating = getBookingRating(booking.id)
                      return (
                        <div 
                          key={booking.id} 
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
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
                                  <span className="font-medium">Amount:</span> ${booking.amount}
                                </div>
                                <div>
                                  <span className="font-medium">Start Date:</span> {new Date(booking.start_date).toLocaleDateString()}
                                </div>
                                <div>
                                  <span className="font-medium">End Date:</span> {new Date(booking.end_date).toLocaleDateString()}
                                </div>
                              </div>

                              {/* Show rating if completed and rated */}
                              {booking.status === 'completed' && rating && (
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-4 w-4 ${
                                          star <= rating.rating
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-600">
                                    {rating.rating}/5 - {rating.feedback && `"${rating.feedback}"`}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              {booking.status === 'in_progress' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Mark Complete & Rate
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel & Delete
                                  </Button>
                                </>
                              )}
                              
                              {booking.status === 'completed' && !rating && (
                                <Button
                                  size="sm"
                                  onClick={() => handleRateExpert(booking)}
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
                    {/* Infinite loader sentinel for bookings */}
                    {(hasMoreBookings && !bookingsLoading) && (
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
                        className="text-center py-4 text-sm text-gray-500"
                      >
                        Loading more bookings...
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experts Tab */}
          <TabsContent value="experts">
            <Card>
              <CardHeader>
                <CardTitle>Browse Experts</CardTitle>
                <CardDescription>
                  Find and connect with qualified experts for your projects
                </CardDescription>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search experts by name, domain, or skills..."
                      value={searchTerm}
                      onChange={(e) => handleSearchExperts(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {experts.length === 0 && !expertsLoading ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm ? 'No experts match your search' : 'No experts available'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {searchTerm ? 'Try different keywords' : 'Check back later for new expert profiles'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {experts.map((expert: any) => (
                      <div key={expert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3 min-w-0">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-lg truncate pr-2">{expert.name}</h3>
                            <p className="text-sm text-gray-600 truncate pr-2">{expert.domain_expertise}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={expert.is_verified ? "default" : "secondary"}>
                              {expert.is_verified ? 'Verified' : 'Pending'}
                            </Badge>
                          {(() => {
                            const agg = getExpertAggregate(expert?.id)
                            return (
                              <div className="flex items-center space-x-1">
                                <div className="flex items-center">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                      key={star} 
                                      className={`h-3 w-3 ${star <= Math.round(agg.avg) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-sm">{agg.avg || 0}</span>
                              </div>
                            )
                          })()}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{expert.bio}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-500">Hourly Rate:</span>
                            <p className="font-medium">₹{expert.hourly_rate}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Experience:</span>
                            <p className="font-medium">{expert.experience_years || 0} years</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Rating:</span>
                            {(() => {
                              const agg = getExpertAggregate(expert?.id)
                              return (
                                <p className="font-medium">{agg.avg || 0}/5 ({agg.count || 0})</p>
                              )
                            })()}
                          </div>
                          <div>
                            <span className="text-gray-500">Availability:</span>
                            <p className="font-medium">
                              {expert.availability?.length || 0} slots
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-sm text-gray-500">
                            Joined: {new Date(expert.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Full Profile
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{expert.name}</DialogTitle>
                                  <DialogDescription>Complete Expert Profile</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Professional Bio</h4>
                                    <p className="text-sm text-gray-600">{expert.bio}</p>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-1">Domain Expertise</h4>
                                      <p className="text-sm">{expert.domain_expertise}</p>
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
                                  {expert.qualifications && (
                                    <div>
                                      <h4 className="font-medium mb-1">Qualifications</h4>
                                      <p className="text-sm">{expert.qualifications}</p>
                                    </div>
                                  )}
                                  {expert.availability && expert.availability.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">Availability</h4>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {expert.availability.map((slot: string, index: number) => (
                                          <Badge key={index} variant="secondary" className="text-xs">
                                            {slot}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {expert.resume_url && (
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
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Contact Expert
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Infinite loader sentinel for experts */}
                    {(hasMoreExperts && !expertsLoading) && (
                      <div 
                        ref={(el) => {
                          if (el) {
                            const observer = new IntersectionObserver(([entry]) => {
                              if (entry.isIntersecting) {
                                loadMoreExperts();
                              }
                            }, { threshold: 0.1 });
                            observer.observe(el);
                            return () => observer.disconnect();
                          }
                        }}
                        className="text-center py-4 text-sm text-gray-500"
                      >
                        Loading more experts...
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          {/* <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Stay updated on project applications and expert activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications.length > 0 ? (
                    applications.map((application) => {
                      const project = projects.find(p => p.id === application.project_id)
                      const expert: any = experts.find((e: any) => e.id === application.expert_id)
                      return (
                        <div key={application.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                          <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              New Application Received
                            </p>
                            <p className="text-sm text-gray-600">
                              {expert?.name} applied to "{project?.title}"
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(application.applied_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={getApplicationStatusColor(application.status)}>
                            {application.status}
                          </Badge>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No notifications yet</p>
                      <p className="text-sm text-gray-500">You'll receive updates when experts apply to your projects</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Institution Profile</CardTitle>
                  <CardDescription>
                    Manage your institution profile and information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building className="h-10 w-10 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{institution?.name}</h3>
                        <p className="text-gray-600">{institution?.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={institution?.is_verified ? 'default' : 'secondary'}>
                            {institution?.is_verified ? 'Verified' : 'Pending'}
                          </Badge>
                          {institution?.is_verified ? (
                            <Shield className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name">Institution Name</Label>
                        <Input 
                          id="name" 
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Institution Type</Label>
                        <Select value={profileForm.type} onValueChange={(value) => setProfileForm({...profileForm, type: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select institution type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="university">University</SelectItem>
                            <SelectItem value="college">College</SelectItem>
                            <SelectItem value="institute">Institute</SelectItem>
                            <SelectItem value="school">School</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <Label htmlFor="website">Website URL</Label>
                        <Input 
                          id="website" 
                          value={profileForm.website_url}
                          onChange={(e) => setProfileForm({...profileForm, website_url: e.target.value})}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Describe your institution..."
                        rows={4}
                        value={profileForm.description}
                        onChange={(e) => setProfileForm({...profileForm, description: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input 
                          id="city" 
                          value={profileForm.city}
                          onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input 
                          id="state" 
                          value={profileForm.state}
                          onChange={(e) => setProfileForm({...profileForm, state: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input 
                          id="country" 
                          value={profileForm.country}
                          onChange={(e) => setProfileForm({...profileForm, country: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea 
                        id="address" 
                        placeholder="Full address..."
                        rows={2}
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input 
                          id="phone" 
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <Button className="w-full" onClick={handleProfileUpdate} disabled={submittingProject}>
                      {submittingProject ? 'Updating...' : 'Update Profile'}
                    </Button>

                    {!institution?.is_verified && (
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          Complete your institution verification to build trust with experts and access premium features.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Institution Statistics</CardTitle>
                  <CardDescription>
                    Your institution's performance and verification status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <Briefcase className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-sm font-medium">Total Projects</p>
                        <p className="text-lg font-bold">{projects.length}</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-sm font-medium">Applications</p>
                        <p className="text-lg font-bold">{applications.length}</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Star className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                        <p className="text-sm font-medium">Average Rating</p>
                        <p className="text-lg font-bold">{institution?.rating || 0}/5</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Shield className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <p className="text-sm font-medium">Verification</p>
                        <Badge variant={institution?.is_verified ? "default" : "secondary"} className="mt-1">
                          {institution?.is_verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                    
                    {!institution?.is_verified && (
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          Complete your institution verification to build trust with experts and access premium features.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        booking={selectedBooking}
        onRatingSubmitted={handleRatingSubmitted}
      />

      {/* Applications Drawer */}
      <Drawer
        open={applicationsDrawerOpen}
        onOpenChange={setApplicationsDrawerOpen}
        title={`Applications for: ${selectedProject?.title || 'Project'}`}
      >
        {selectedProject && (
          <ProjectApplications
            projectId={selectedProject.id}
            projectTitle={selectedProject.title || ''}
            onClose={() => setApplicationsDrawerOpen(false)}
            pageSize={20}
            institutionId={institution?.id || ''}
          />
        )}
      </Drawer>
    </div>
  )
}
