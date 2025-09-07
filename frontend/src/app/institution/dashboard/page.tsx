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
import ProjectApplications from '@/components/ProjectApplications'
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
        required_expertise: '',
        domain_expertise: '',
        subskills: []
      })
      setSelectedSubskills([])
      setAvailableSubskills([])
      setShowProjectForm(false)
      
      // Refresh data to show new project
      refreshProjects()
    
      setError('')
    } catch (error: any) {
      console.error('Project creation error:', error)
      setError('Failed to create project')
    } finally {
      setSubmittingProject(false)
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
      required_expertise: '',
      domain_expertise: '',
      subskills: []
    })
    setSelectedSubskills([])
    setAvailableSubskills([])
    setShowProjectForm(true)
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
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <Logo size="md" />
              <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Calxmap</span>
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

      <div className="container mx-auto px-4 py-8 relative z-10">
        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50/90 backdrop-blur-md border-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Welcome Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4 drop-shadow-2xl">
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
                  <Label htmlFor="edit-domain_expertise">Domain Expertise *</Label>
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
                  <Label htmlFor="edit-required_expertise">Additional Skills (comma-separated)</Label>
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
                              {project.applicationCounts?.total}
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
                              disabled={!project.applicationCounts?.total}
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







              
        </Tabs>
      </div>

    </div>
  )
}
