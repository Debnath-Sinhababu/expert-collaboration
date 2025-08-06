'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
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
import { 
  GraduationCap, 
  Building, 
  Plus, 
  Users, 
  DollarSign, 
  Star, 
  Settings,
  LogOut,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Briefcase,
  Search,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Bell,
  Award,
  Shield,
  MessageSquare,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const PROJECT_TYPES = [
  'guest_lecture',
  'fdp',
  'workshop',
  'curriculum_dev',
  'research_collaboration',
  'training_program',
  'consultation',
  'other'
]

export default function InstitutionDashboard() {
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [experts, setExperts] = useState<any[]>([])
  const [filteredExperts, setFilteredExperts] = useState<any[]>([])
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
  const router = useRouter()
  

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      await loadInstitutionData(user.id)
    }

    getUser()
  }, [router])

  const loadInstitutionData = async (userId: string) => {
    try {
      const institutionsResponse = await api.institutions.getAll()
      const institutionProfile = institutionsResponse.find((i: any) => i.user_id === userId)
      
      if (!institutionProfile) {
        router.push('/institution/profile-setup')
        return
      }
      
      setInstitution(institutionProfile)
      
      const [projectsResponse, applicationsResponse, expertsResponse] = await Promise.all([
        api.projects.getAll(),
        api.applications.getAll(),
        api.experts.getAll()
      ])
      
      const institutionProjects = projectsResponse.filter((project: any) => project.institution_id === institutionProfile.id)
      setProjects(institutionProjects)
      
      const projectApplications = applicationsResponse.filter((app: any) => 
        institutionProjects.some((project: any) => project.id === app.project_id)
      )
      setApplications(projectApplications)
      
      setExperts(expertsResponse)
      setFilteredExperts(expertsResponse)
      
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

  const handleSearchExperts = (term: string) => {
    setSearchTerm(term)
    if (!term) {
      setFilteredExperts(experts)
    } else {
      const filtered = experts.filter((expert: any) =>
        expert.name.toLowerCase().includes(term.toLowerCase()) ||
        expert.domain_expertise.toLowerCase().includes(term.toLowerCase()) ||
        expert.bio.toLowerCase().includes(term.toLowerCase())
      )
      setFilteredExperts(filtered)
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
      await loadInstitutionData(user.id)
      setError('')
    } catch (error: any) {
      setError('Failed to create project')
    } finally {
      setSubmittingProject(false)
    }
  }

  const handleApplicationAction = async (applicationId: string, action: 'accept' | 'reject') => {
    try {
      await api.applications.update(applicationId, { status: action === 'accept' ? 'accepted' : 'rejected' })
      await loadInstitutionData(user.id)
    } catch (error: any) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Expert Collaboration</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">{institution?.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Welcome Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {institution?.name}!
            </h1>
            <p className="text-gray-600">
              Manage your projects, review applications, and connect with qualified experts.
            </p>
          </div>
          <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Post New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Post New Project</DialogTitle>
                <DialogDescription>
                  Create a new project to find qualified experts
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-3 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowProjectForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingProject}>
                    {submittingProject ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Project Dialog */}
          <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
                <DialogDescription>
                  Update your project details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-3 gap-4">
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
                      id="edit-duration_hours"
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingProject}>
                    {submittingProject ? 'Updating...' : 'Update Project'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                  <p className="text-xs text-gray-500">
                    {projects.filter(p => p.status === 'open').length} open
                  </p>
                </div>
                <Briefcase className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Applications</p>
                  <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
                  <p className="text-xs text-gray-500">
                    {applications.filter(app => app.status === 'pending').length} pending
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter(p => p.status === 'in_progress').length}
                  </p>
                  <p className="text-xs text-gray-500">in progress</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{institution?.rating || 0}/5</p>
                  <p className="text-xs text-gray-500">{institution?.total_ratings || 0} reviews</p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="projects">My Projects</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="experts">Browse Experts</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
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
                    <Button className="mt-4" onClick={() => setShowProjectForm(true)}>
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
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{project.title}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="capitalize">{project.status}</Badge>
                            <Badge variant="secondary" className="capitalize">{project.type}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{project.description}</p>
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
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Posted: {new Date(project.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              View Applications ({applications.filter(app => app.project_id === project.id).length})
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditProject(project)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            {project.status === 'open' && (
                              <Button size="sm" variant="outline" onClick={() => handleCloseProject(project.id)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Close
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
                <CardDescription>
                  Review and manage applications from experts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No applications yet</p>
                    <p className="text-sm text-gray-500">Applications will appear here when experts apply to your projects</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application) => {
                      const project = projects.find(p => p.id === application.project_id)
                      const expert = experts.find(e => e.id === application.expert_id)
                      return (
                        <div key={application.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{expert?.name || 'Expert'}</h3>
                              <p className="text-sm text-gray-600">Applied to: {project?.title}</p>
                            </div>
                            <Badge className={getApplicationStatusColor(application.status)}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(application.status)}
                                <span className="capitalize">{application.status}</span>
                              </div>
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <span className="text-sm text-gray-500">Expert Domain:</span>
                              <p className="font-medium">{expert?.domain_expertise}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Proposed Rate:</span>
                              <p className="font-medium">₹{application.proposed_rate}/hour</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Expert Rating:</span>
                              <p className="font-medium">{expert?.rating || 0}/5 ({expert?.total_ratings || 0} reviews)</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Applied On:</span>
                              <p className="font-medium">{new Date(application.applied_at).toLocaleDateString()}</p>
                            </div>
                          </div>

                          {application.cover_letter && (
                            <div className="mb-4">
                              <span className="text-sm text-gray-500">Cover Letter:</span>
                              <p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">{application.cover_letter}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Expert Profile
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>{expert?.name}</DialogTitle>
                                    <DialogDescription>Expert Profile Details</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium mb-2">Professional Bio</h4>
                                      <p className="text-sm text-gray-600">{expert?.bio}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-medium mb-1">Domain Expertise</h4>
                                        <p className="text-sm">{expert?.domain_expertise}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium mb-1">Hourly Rate</h4>
                                        <p className="text-sm">₹{expert?.hourly_rate}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium mb-1">Experience</h4>
                                        <p className="text-sm">{expert?.experience_years || 0} years</p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium mb-1">Verification</h4>
                                        <Badge variant={expert?.is_verified ? "default" : "secondary"}>
                                          {expert?.is_verified ? 'Verified' : 'Pending'}
                                        </Badge>
                                      </div>
                                    </div>
                                    {expert?.qualifications && (
                                      <div>
                                        <h4 className="font-medium mb-1">Qualifications</h4>
                                        <p className="text-sm">{expert.qualifications}</p>
                                      </div>
                                    )}
                                    {expert?.resume_url && (
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
                            </div>
                            
                            {application.status === 'pending' && (
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApplicationAction(application.id, 'accept')}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Accept
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleApplicationAction(application.id, 'reject')}
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
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
                <div className="flex items-center space-x-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search experts by name, domain, or skills..."
                      value={searchTerm}
                      onChange={(e) => handleSearchExperts(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredExperts.length === 0 ? (
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
                    {filteredExperts.map((expert) => (
                      <div key={expert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{expert.name}</h3>
                            <p className="text-sm text-gray-600">{expert.domain_expertise}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={expert.is_verified ? "default" : "secondary"}>
                              {expert.is_verified ? 'Verified' : 'Pending'}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">{expert.rating || 0}</span>
                            </div>
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
                            <p className="font-medium">{expert.rating || 0}/5 ({expert.total_ratings || 0})</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Availability:</span>
                            <p className="font-medium">
                              {expert.availability?.length || 0} slots
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Joined: {new Date(expert.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
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
                                  <div className="grid grid-cols-2 gap-4">
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
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Contact Expert
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
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
                      const expert = experts.find(e => e.id === application.expert_id)
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
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Institution Profile</CardTitle>
                  <CardDescription>
                    View and manage your institution profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Institution Name</Label>
                        <p className="text-gray-900 font-medium">{institution?.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Type</Label>
                        <p className="text-gray-900">{institution?.type}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Description</Label>
                      <p className="text-gray-900 mt-1">{institution?.description}</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Email</Label>
                        <p className="text-gray-900">{institution?.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Website</Label>
                        {institution?.website_url ? (
                          <a 
                            href={institution.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {institution.website_url}
                          </a>
                        ) : (
                          <p className="text-gray-500">Not provided</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">City</Label>
                        <p className="text-gray-900">{institution?.city || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">State</Label>
                        <p className="text-gray-900">{institution?.state || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Country</Label>
                        <p className="text-gray-900">{institution?.country || 'India'}</p>
                      </div>
                    </div>

                    {institution?.address && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Address</Label>
                        <p className="text-gray-900 mt-1">{institution.address}</p>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Contact Person</Label>
                        <p className="text-gray-900">{institution?.contact_person || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Contact Phone</Label>
                        <p className="text-gray-900">{institution?.contact_phone || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 flex space-x-4">
                      <Link href="/institution/profile-setup">
                        <Button variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </Link>
                    </div>
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
    </div>
  )
}
