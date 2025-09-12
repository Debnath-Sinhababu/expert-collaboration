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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MultiSelect } from '@/components/ui/multi-select'
import { Drawer } from '@/components/ui/drawer'
import ProfileDropdown from '@/components/ProfileDropdown'
import Logo from '@/components/Logo'
import { 
  Building, 
  Plus, 
  Users, 
  Star, 
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
import { toast } from 'sonner'

export default function InstitutionDashboard() {
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [bookingCounts, setBookingCounts] = useState<any>({ total: 0, in_progress: 0, completed: 0, cancelled: 0, pending: 0 })
  const [ratings, setRatings] = useState<any[]>([])
  const [allRatings, setAllRatings] = useState<any[]>([])
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
    required_expertise: '',
    domain_expertise: '',
    subskills: [] as string[]
  })
  const [submittingProject, setSubmittingProject] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedSubskills, setSelectedSubskills] = useState<string[]>([])
  const [availableSubskills, setAvailableSubskills] = useState<string[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [expertsLoading, setExpertsLoading] = useState(false)
  const [recommendedExperts, setRecommendedExperts] = useState<any[]>([])
  const [showExpertSelectionModal, setShowExpertSelectionModal] = useState(false)
  const [selectedExperts, setSelectedExperts] = useState<string[]>([])
  const router = useRouter()
  
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
          // Create booking using existing API
          const bookingData = {
            expert_id: expert.id,
            project_id: selectedProjectId,
            institution_id: institution?.id,
            amount: projectDetails.hourly_rate,
            hours_booked: projectDetails.duration_hours,
            start_date: new Date().toISOString().split('T')[0],
            end_date: projectDetails.end_date,
            status: 'in_progress'
          }

          await api.bookings.create(bookingData)
          
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
              projectId: projectDetails.id,
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

  const loadInstitutionData = async (userId: string) => {
    try {
      const institutionsResponse = await api.institutions.getByUserId(userId)
      
      if (!institutionsResponse) {
        router.push('/institution/profile-setup')
        return
      }
      
      setInstitution(institutionsResponse)
      
      // Initial light calls (experts list is paginated below). Lists are fed by paginated hooks
      const [bookingCountsResponse] = await Promise.all([
        api.bookings.getCounts({ institution_id: institutionsResponse.id })
      ])
    
      
      // Refresh projects after institution is set
      // The usePagination hook will automatically refresh when institution.id changes

     
   
      const counts = bookingCountsResponse || { total: 0, in_progress: 0, completed: 0, cancelled: 0, pending: 0 }

      setBookingCounts(counts)
      

    
     


  
      
    } catch (error: any) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }


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

 

  // Refresh booking counts when institution changes (for stats display)
  useEffect(() => {
    if (institution?.id) {
      fetchBookingCounts()
    }
  }, [institution?.id])



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
      required_expertise: project.required_expertise.join(', '),
      domain_expertise: project.domain_expertise || '',
      subskills: project.subskills || []
    })
    
    // Set subskills state
    setSelectedSubskills(project.subskills || [])
    
    // Set available subskills based on domain
    if (project.domain_expertise) {
      const selectedDomain = EXPERTISE_DOMAINS.find(d => d.name === project.domain_expertise)
      if (selectedDomain) {
        setAvailableSubskills([...selectedDomain.subskills])
      }
    }
    
    setShowEditForm(true)
  }

  const handleViewApplications = (project: any) => {
    // Check if there are any applications for this project
    
    
    // Navigate to the project details page
    router.push(`/institution/dashboard/project/${project.id}`)
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
   
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
        required_expertise: projectForm.required_expertise.split(',').map(s => s.trim()).filter(s => s),
        domain_expertise: projectForm.domain_expertise,
        subskills: projectForm.subskills
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
        required_expertise: '',
        domain_expertise: '',
        subskills: []
      })
      setSelectedSubskills([])
      setAvailableSubskills([])
      setShowEditForm(false)
      setEditingProject(null)
     
      refreshProjects()
      if (result && result.id) {
        await loadRecommendedExperts(result.id)
      }
      setError('')
    } catch (error: any) {
      console.error('Project update error:', error)
      setError(`Failed to update project: ${error.message}`)
    } finally {
      setSubmittingProject(false)
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

      console.log('Project data:', projectData)
   

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

      refreshProjects()
      
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

  const handleCloseProject = async (projectId: string) => {
    try {
      const result = await api.projects.update(projectId, { status: 'closed' })
      console.log('Project closed successfully:', result)
     
      refreshProjects()
      setError('')
    } catch (error: any) {
      console.error('Project close error:', error)
      setError(`Failed to close project: ${error.message}`)
    }
  }

  // Load ratings when institution is available
// Only depend on institution ID

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/institution/home" className="flex items-center space-x-2 group">
            
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Calxmap</span>
            </Link>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 lg:gap-4">
            
              <div className="flex items-center space-x-2 order-2 sm:order-none">
                <NotificationBell />
                <ProfileDropdown user={user} institution={institution} userType="institution"  />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className='container mx-auto px-4 py-8 relative z-10'>
        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50/90 backdrop-blur-md border-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Welcome Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 text-center sm:text-left">
             <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
               Welcome back, {institution?.name}!
             </h1>
             <p className="text-lg sm:text-xl text-slate-600">
               Manage your projects, review applications, and connect with qualified experts.
             </p>
          </div>
          <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300">
                  <Plus className="h-4 w-4 mr-2" />
                  Post Requirement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Fill in the details to post a new requirement for experts
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : recommendedExperts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No matching experts found for this project.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendedExperts.map((expert) => (
                    <Card key={expert.id} className={`transition-all duration-200 hover:shadow-md ${
                      selectedExperts.includes(expert.id) 
                        ? 'bg-blue-50/50' 
                        : 'hover:border-blue-300'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          {/* Expert Info */}
                          <div className="flex items-center space-x-4 flex-1 min-w-0">
                            {/* Expert Photo */}
                            <div className="flex-shrink-0">
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
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold text-slate-900 truncate">
                                  {expert.name}
                                </h3>
                                {expert.is_verified && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    Verified
                                  </Badge>
                                )}
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  {expert.matchScore}% Match
                                </Badge>
                              </div>
                              
                              <div className="flex items-center text-slate-600 text-sm mb-2">
                                <span className="font-medium">₹{expert.hourly_rate}/hour</span>
                                <span className="mx-2">•</span>
                                <span>{expert.experience_years || 0} years experience</span>
                                <span className="mx-2">•</span>
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
                          <div className="flex-shrink-0 ml-4">
                            <Button
                              variant={selectedExperts.includes(expert.id) ? "default" : "outline"}
                              onClick={() => handleExpertSelection(expert.id)}
                              className={selectedExperts.includes(expert.id) 
                                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                : "border-blue-300 text-blue-600 hover:bg-blue-50"
                              }
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

          {/* Edit Project Dialog */}
          <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Edit Project</DialogTitle>
                <DialogDescription>
                  Update your project details
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
                  <Button variant="outline" onClick={() => setShowEditForm(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateProject}
                    disabled={submittingProject}
                    className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {submittingProject ? 'Updating...' : 'Update Project'}
                  </Button>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-white to-slate-50/30 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Projects</p>
                  <p className="text-2xl font-bold text-slate-900">{projects.length}</p>
                  <p className="text-xs text-slate-500">
                    {projects.filter(p => p.status === 'open').length} open
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-full">
                  <Briefcase className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/30 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Applications</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {projects.reduce((total, project) => total + (project.applicationCounts?.total || 0), 0)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {projects.reduce((total, project) => total + (project.applicationCounts?.pending || 0), 0)} pending
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-full">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/30 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Bookings</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {bookingCounts.in_progress}
                  </p>
                  <p className="text-xs text-slate-500">in progress</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-full">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-slate-50/30 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {bookingCounts.completed}
                  </p>
                  <p className="text-xs text-slate-500">bookings</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-full">
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
        <div className="space-y-6">
          <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900">My Projects</CardTitle>
              <CardDescription className="text-slate-600">
                Manage your posted projects and track their progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No projects posted yet</p>
                  <p className="text-sm text-slate-500">Create your first project to find experts</p>
                  <Button className="mt-4 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300" onClick={handleCreateProject}>
                    <Plus className="h-4 w-4 mr-2" />
                    Post Your First Project
                  </Button>
                </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project: any) => (
                      <div 
                        key={project.id} 
                        className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300 group"
                      >
                        <div className="flex items-center justify-between mb-2 min-w-0">
                          <h3 className="font-semibold text-lg text-slate-900 truncate pr-2">{project.title}</h3>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Badge variant="outline" className="capitalize border-slate-300 text-slate-700">{project.status}</Badge>
                            <Badge variant="secondary" className="capitalize bg-slate-100 text-slate-700">{project.type}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{project.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-slate-500">Rate:</span>
                            <p className="font-medium text-slate-900">₹{project.hourly_rate}/hour</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Duration:</span>
                            <p className="font-medium text-slate-900">{project.duration_hours} hours</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Budget:</span>
                            <p className="font-medium text-slate-900">₹{project.total_budget}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Applications:</span>
                            <p className="font-medium text-slate-900">
                              {project.applicationCounts?.total}
                            </p>
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-sm text-slate-500">
                            Posted: {new Date(project.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 sm:flex-none border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700"
                              onClick={() => handleViewApplications(project)}
                              disabled={!project.applicationCounts?.total}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Applications ({project.applicationCounts?.pending || 0})
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditProject(project)} className="flex-1 sm:flex-none border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            {project.status === 'open' && (
                              <Button size="sm" variant="outline" onClick={() => handleCloseProject(project.id)} className="flex-1 sm:flex-none border-2 border-slate-300 hover:border-red-400 hover:bg-red-50 text-slate-700 hover:text-red-700">
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
                        className="text-center py-4 text-sm text-slate-500"
                      >
                        Loading more projects...
                      </div>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    
  )
}
