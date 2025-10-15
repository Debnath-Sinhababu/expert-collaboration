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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
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
  BookOpen,
  Hourglass,
  IndianRupee,
  FileText
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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [projectToClose, setProjectToClose] = useState<string | null>(null)
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

  const handleCloseProjectClick = (projectId: string) => {
    setProjectToClose(projectId)
    setShowCloseConfirm(true)
  }

  const confirmCloseProject = async () => {
    if (!projectToClose) return
    
    try {
      const result = await api.projects.update(projectToClose, { status: 'closed' })
      console.log('Project closed successfully:', result)
      toast.success('Project closed successfully!')
      refreshProjects()
      setError('')
      setShowCloseConfirm(false)
      setProjectToClose(null)
    } catch (error: any) {
      console.error('Project close error:', error)
      toast.error(`Failed to close project: ${error.message}`)
      setShowCloseConfirm(false)
      setProjectToClose(null)
    }
  }

  // Load ratings when institution is available
// Only depend on institution ID

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-[#008260]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/institution/home" className="flex items-center group">
              <Logo size="header" />
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
             <h1 className="text-3xl font-semibold text-[#000000] mb-1">
               Welcome back, <span className='text-[#008260]'>{institution?.name}!</span>
             </h1>
             <p className="text-lg text-[#000000CC] font-medium">
               Manage your projects, review applications, and connect with qualified experts.
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
                              
                                <div className="flex items-center gap-2">
                                  {expert.is_verified && (
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      Verified
                                    </Badge>
                                  )}
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    {expert.matchScore}% Match
                                  </Badge>
                                  <Link
                                  href={`/experts/${expert.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="sm:hidden text-slate-500 hover:text-slate-900"
                                  aria-label="View expert profile"
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                                  
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

          {/* Edit Project Dialog */}
          <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
            <DialogContent className="max-w-3xl max-h-[90vh]  flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-2xl font-bold text-[#000000]">Edit Project</DialogTitle>
                <DialogDescription className="text-[#6A6A6A]">
                  Update your project details
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 pr-2 p-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title" className="text-[#000000] font-medium mb-2 block">Project Title *</Label>
                    <Input
                      id="title"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                      placeholder="e.g., Guest Lecture on AI"
                      className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:border-[#008260]"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="type" className="text-[#000000] font-medium mb-2 block">Project Type *</Label>
                    <Select value={projectForm.type} onValueChange={(value) => setProjectForm({...projectForm, type: value})}>
                      <SelectTrigger className="border-[#DCDCDC] focus:ring-[#008260] focus:border-[#008260]">
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
                    <Label htmlFor="hourly_rate" className="text-[#000000] font-medium mb-2 block">Hourly Rate (₹) *</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      min="1"
                      value={projectForm.hourly_rate}
                      onChange={(e) => setProjectForm({...projectForm, hourly_rate: e.target.value})}
                      placeholder="1000"
                      className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:border-[#008260]"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_budget" className="text-[#000000] font-medium mb-2 block">Total Budget (₹) *</Label>
                    <Input
                      id="total_budget"
                      type="number"
                      min="1"
                      value={projectForm.total_budget}
                      onChange={(e) => setProjectForm({...projectForm, total_budget: e.target.value})}
                      placeholder="50000"
                      className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:border-[#008260]"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_date" className="text-[#000000] font-medium mb-2 block">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                      className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:border-[#008260]"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date" className="text-[#000000] font-medium mb-2 block">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                      className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:border-[#008260]"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_hours" className="text-[#000000] font-medium mb-2 block">Duration (Hours) *</Label>
                    <Input
                      id="duration_hours"
                      type="number"
                      min="1"
                      value={projectForm.duration_hours}
                      onChange={(e) => setProjectForm({...projectForm, duration_hours: e.target.value})}
                      placeholder="40"
                      className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:border-[#008260]"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="domain_expertise" className="text-[#000000] font-medium mb-2 block">Domain Expertise *</Label>
                    <Select value={projectForm.domain_expertise} onValueChange={handleDomainChange}>
                      <SelectTrigger className="border-[#DCDCDC] focus:ring-[#008260] focus:border-[#008260]">
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
                  <div className="md:col-span-2">
                    <Label htmlFor="required_expertise" className="text-[#000000] font-medium mb-2 block">Additional Skills (comma-separated)</Label>
                    <Input
                      id="required_expertise"
                      value={projectForm.required_expertise}
                      onChange={(e) => setProjectForm({...projectForm, required_expertise: e.target.value})}
                      placeholder="AI, Machine Learning, Data Science"
                      className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:border-[#008260]"
                    />
                  </div>
                </div>
                
                {/* Subskills Multi-Select */}
                {projectForm.domain_expertise && availableSubskills.length > 0 && (
                  <div className='my-4' onClick={(e) => e.stopPropagation()}>
                    <Label className="text-[#000000] font-medium mb-2 block" htmlFor="required_specialization">Required Specializations *</Label>
                    <MultiSelect
                      options={availableSubskills}
                      selected={selectedSubskills}
                      onSelectionChange={handleSubskillChange}
                      placeholder="Select required specializations..."
                      className="w-full"
                    />
                  </div>
                )}
                
                <div className="mt-4">
                  <Label htmlFor="description" className="text-[#000000] font-medium mb-2 block">Description *</Label>
                  <Textarea
                    id="description"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    placeholder="Describe the project requirements..."
                    rows={4}
                    className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:border-[#008260]"
                    required
                  />
                </div>
                </div>
                <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t border-[#DCDCDC]">
                  <Button variant="outline" onClick={() => setShowEditForm(false)} className="border-[#DCDCDC] text-[#000000] hover:bg-slate-50">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateProject}
                    disabled={submittingProject}
                    className="bg-[#008260] hover:bg-[#006B4F] text-white"
                  >
                    {submittingProject ? 'Updating...' : 'Update Project'}
                  </Button>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-2 border-[#D6D6D6]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#000000]">Total Projects</p>
                  <p className="text-3xl font-bold text-[#000000] my-2">{projects.length}</p>
                  <p className="text-xs text-[#656565]">
                    {projects.filter(p => p.status === 'open').length} open
                  </p>
                </div>
                <div className="p-3 bg-[#ECF2FF] rounded-full">
                  <Briefcase className="h-8 w-8 text-[#008260]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-[#D6D6D6]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#000000]">Applications</p>
                  <p className="text-3xl font-bold text-[#000000] my-2">
                    {projects.reduce((total, project) => total + (project.applicationCounts?.total || 0), 0)}
                  </p>
                  <p className="text-xs text-[#656565]">
                    {projects.reduce((total, project) => total + (project.applicationCounts?.pending || 0), 0)} pending
                  </p>
                </div>
                <div className="p-3 bg-[#ECF2FF] rounded-full">
                  <Users className="h-8 w-8 text-[#008260]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-[#D6D6D6]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#000000]">Active Bookings</p>
                  <p className="text-3xl font-bold text-[#000000] my-2">
                    {bookingCounts.in_progress}
                  </p>
                  <p className="text-xs text-[#656565]">in progress</p>
                </div>
                <div className="p-3 bg-[#ECF2FF] rounded-full">
                  <BookOpen className="h-8 w-8 text-[#008260]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-[#D6D6D6]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#000000]">Completed</p>
                  <p className="text-3xl font-bold text-[#000000] my-2">
                    {bookingCounts.completed}
                  </p>
                  <p className="text-xs text-[#656565]">bookings</p>
                </div>
                <div className="p-3 bg-[#ECF2FF] rounded-full">
                  <CheckCircle className="h-8 w-8 text-[#008260]" />
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
              <CardTitle className="text-lg font-semibold text-[#000000]">My Projects</CardTitle>
              <CardDescription className="text-[#000000] font-normal text-base !-mt-[2px]">
                Manage your posted projects and track their progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No projects posted yet</p>
                  <p className="text-sm text-slate-500">Create your first project to find experts</p>
                
                </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project: any) => (
                      <div 
                        key={project.id} 
                        className="bg-white border border-[#DCDCDC] rounded-lg p-4 sm:p-6 transition-all duration-300 group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <h3 className="font-bold text-base sm:text-lg text-[#000000]">{project.title}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="capitalize bg-[#FFF1E7] rounded-[18px] text-xs font-semibold text-[#FF6A00] py-1.5 px-3 sm:py-2 sm:px-4">{project.status}</Badge>
                            <Badge variant="secondary" className="capitalize bg-[#FFF1E7] rounded-[18px] text-xs font-semibold text-[#FF6A00] py-1.5 px-3 sm:py-2 sm:px-4">{project.type}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-[#6A6A6A] mb-3 line-clamp-2">{project.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 text-sm">
                          <div className="flex items-start gap-2.5 sm:gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <Clock className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#008260' }} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[#717171] text-xs">Rate:</span>
                              <p className="font-semibold text-[#008260] text-sm sm:text-base truncate">₹{project.hourly_rate}/hour</p>
                            </div>
                          </div>
                          <div className='flex items-start gap-2.5 sm:gap-3'>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <Hourglass className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#008260' }} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[#717171] text-xs">Duration:</span>
                              <p className="font-medium text-sm sm:text-base text-[#1D1D1D] truncate">{project.duration_hours} hours</p>
                            </div>
                          </div>
                          <div className='flex items-start gap-2.5 sm:gap-3'>
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#008260' }} />
                            </div> 
                            <div className="min-w-0">
                              <span className="text-[#717171] text-xs">Budget:</span>
                              <p className="font-medium text-sm sm:text-base text-[#1D1D1D] truncate">₹{project.total_budget}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 sm:gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ECF2FF' }}>
                              <FileText className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#008260' }} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[#717171] text-xs">Applications:</span>
                              <p className="font-medium text-sm sm:text-base text-[#1D1D1D] truncate">
                                {project.applicationCounts?.total}
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-sm text-slate-500">
                            Posted: {new Date(project.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 sm:flex-none bg-[#ECF2FF] rounded-[25px] text-[#1D1D1D] font-medium text-[13px]"
                              onClick={() => handleViewApplications(project)}
                              disabled={!project.applicationCounts?.total}
                            >
                              <Eye className="h-4 w-4" />
                              View Applications ({project.applicationCounts?.pending || 0})
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditProject(project)} className="flex-1 sm:flex-none bg-[#ECF2FF] rounded-[25px] text-[#1D1D1D] font-semibold text-[13px]">
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            {project.status === 'open' && (
                              <Button size="sm" variant="outline" onClick={() => handleCloseProjectClick(project.id)} className="flex-1 sm:flex-none bg-[#9B0000] hover:bg-[#9B0000] rounded-[25px] text-white hover:text-white font-semibold text-[13px]">
                                <XCircle className="h-4 w-4" />
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

        {/* Close Project Confirmation */}
        <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close Project?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to close this project? This action will mark the project as closed and it will no longer be visible to experts.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmCloseProject} className="bg-[#9B0000] hover:bg-[#800000]">
                Yes, Close Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }
