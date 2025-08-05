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
  User, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Star, 
  MessageSquare,
  Settings,
  LogOut,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Filter,
  Search,
  Bell,
  Shield,
  Award,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ExpertDashboard() {
  const [user, setUser] = useState<any>(null)
  const [expert, setExpert] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [filteredProjects, setFilteredProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [applicationForm, setApplicationForm] = useState({
    cover_letter: '',
    proposed_rate: ''
  })
  const [submittingApplication, setSubmittingApplication] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      await loadExpertData(user.id)
    }

    getUser()
  }, [router])

  const loadExpertData = async (userId: string) => {
    try {
      const expertsResponse = await api.experts.getAll()
      const expertProfile = expertsResponse.find((e: any) => e.user_id === userId)
      
      if (!expertProfile) {
        router.push('/expert/profile-setup')
        return
      }
      
      setExpert(expertProfile)
      
      const [applicationsResponse, projectsResponse] = await Promise.all([
        api.applications.getAll(),
        api.projects.getAll()
      ])
      
      const expertApplications = applicationsResponse.filter((app: any) => app.expert_id === expertProfile.id)
      setApplications(expertApplications)
      
      const openProjects = projectsResponse.filter((project: any) => project.status === 'open')
      setProjects(openProjects)
      setFilteredProjects(openProjects)
      
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

  const handleSearchProjects = (term: string) => {
    setSearchTerm(term)
    if (!term) {
      setFilteredProjects(projects)
    } else {
      const filtered = projects.filter((project: any) =>
        project.title.toLowerCase().includes(term.toLowerCase()) ||
        project.description.toLowerCase().includes(term.toLowerCase()) ||
        project.type.toLowerCase().includes(term.toLowerCase())
      )
      setFilteredProjects(filtered)
    }
  }

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject || !applicationForm.cover_letter || !applicationForm.proposed_rate) {
      setError('Please fill in all required fields')
      return
    }

    setSubmittingApplication(true)
    try {
      await api.applications.create({
        expert_id: expert.id,
        project_id: selectedProject.id,
        cover_letter: applicationForm.cover_letter,
        proposed_rate: parseFloat(applicationForm.proposed_rate),
        status: 'pending'
      })
      
      setApplicationForm({ cover_letter: '', proposed_rate: '' })
      setSelectedProject(null)
      await loadExpertData(user.id)
      setError('')
    } catch (error: any) {
      setError('Failed to submit application')
    } finally {
      setSubmittingApplication(false)
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
                <User className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">{expert?.name}</span>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {expert?.name}!
          </h1>
          <p className="text-gray-600">
            Manage your applications, browse projects, and track your academic engagements.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
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
                <Briefcase className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hourly Rate</p>
                  <p className="text-2xl font-bold text-gray-900">₹{expert?.hourly_rate || 0}</p>
                  <p className="text-xs text-gray-500">per hour</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{expert?.rating || 0}/5</p>
                  <p className="text-xs text-gray-500">{expert?.total_ratings || 0} reviews</p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">KYC Status</p>
                  <Badge variant={expert?.is_verified ? "default" : "secondary"} className="mb-1">
                    {expert?.is_verified ? 'Verified' : 'Pending'}
                  </Badge>
                  <p className="text-xs text-gray-500">
                    {expert?.kyc_status || 'pending'}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="applications">My Applications</TabsTrigger>
            <TabsTrigger value="projects">Browse Projects</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>My Applications</CardTitle>
                <CardDescription>
                  Track the status of your project applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No applications yet</p>
                    <p className="text-sm text-gray-500">Browse projects to start applying</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application) => (
                      <div key={application.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Project Application</h3>
                          <Badge className={getStatusColor(application.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(application.status)}
                              <span className="capitalize">{application.status}</span>
                            </div>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Applied on: {new Date(application.applied_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Proposed Rate: ₹{application.proposed_rate}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>Available Projects</CardTitle>
                <CardDescription>
                  Browse and apply to open projects from institutions
                </CardDescription>
                <div className="flex items-center space-x-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search projects by title, description, or type..."
                      value={searchTerm}
                      onChange={(e) => handleSearchProjects(e.target.value)}
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
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm ? 'No projects match your search' : 'No open projects available'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {searchTerm ? 'Try different keywords' : 'Check back later for new opportunities'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProjects.map((project) => (
                      <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{project.title}</h3>
                          <Badge variant="outline" className="capitalize">{project.type}</Badge>
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
                            <span className="text-gray-500">Start Date:</span>
                            <p className="font-medium">{new Date(project.start_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Budget:</span>
                            <p className="font-medium">₹{project.total_budget}</p>
                          </div>
                        </div>
                        {project.required_expertise && (
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
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{project.title}</DialogTitle>
                                  <DialogDescription>
                                    Project details and application form
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Description</h4>
                                    <p className="text-sm text-gray-600">{project.description}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-1">Project Type</h4>
                                      <p className="text-sm capitalize">{project.type}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Duration</h4>
                                      <p className="text-sm">{project.duration_hours} hours</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Hourly Rate</h4>
                                      <p className="text-sm">₹{project.hourly_rate}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-1">Total Budget</h4>
                                      <p className="text-sm">₹{project.total_budget}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Timeline</h4>
                                    <p className="text-sm">
                                      {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => setSelectedProject(project)}
                                  disabled={applications.some(app => app.project_id === project.id)}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  {applications.some(app => app.project_id === project.id) ? 'Applied' : 'Apply'}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Apply to {project.title}</DialogTitle>
                                  <DialogDescription>
                                    Submit your application with a cover letter and proposed rate
                                  </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleApplicationSubmit} className="space-y-4">
                                  <div>
                                    <Label htmlFor="cover_letter">Cover Letter *</Label>
                                    <Textarea
                                      id="cover_letter"
                                      placeholder="Explain why you're the perfect fit for this project..."
                                      value={applicationForm.cover_letter}
                                      onChange={(e) => setApplicationForm(prev => ({ ...prev, cover_letter: e.target.value }))}
                                      rows={4}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="proposed_rate">Proposed Hourly Rate (₹) *</Label>
                                    <Input
                                      id="proposed_rate"
                                      type="number"
                                      placeholder="Enter your proposed rate"
                                      value={applicationForm.proposed_rate}
                                      onChange={(e) => setApplicationForm(prev => ({ ...prev, proposed_rate: e.target.value }))}
                                      required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      Project budget: ₹{project.hourly_rate}/hour
                                    </p>
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <Button type="button" variant="outline" onClick={() => setSelectedProject(null)}>
                                      Cancel
                                    </Button>
                                    <Button type="submit" disabled={submittingApplication}>
                                      {submittingApplication ? 'Submitting...' : 'Submit Application'}
                                    </Button>
                                  </div>
                                </form>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <CardTitle>Availability Management</CardTitle>
                <CardDescription>
                  Manage your weekly availability for academic engagements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expert?.availability?.map((slot: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{slot}</span>
                      </div>
                    )) || (
                      <div className="col-span-full text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No availability set</p>
                        <p className="text-sm text-gray-500">Update your profile to set availability</p>
                      </div>
                    )}
                  </div>
                  <div className="pt-4">
                    <Link href="/expert/profile-setup">
                      <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Update Availability
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Stay updated on application status and new opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications.length > 0 ? (
                    applications.map((application) => (
                      <div key={application.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                        <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Application Status Update
                          </p>
                          <p className="text-sm text-gray-600">
                            Your application status is: <Badge className={getStatusColor(application.status)}>{application.status}</Badge>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(application.applied_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No notifications yet</p>
                      <p className="text-sm text-gray-500">Apply to projects to receive updates</p>
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
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    View and manage your expert profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Name</Label>
                        <p className="text-gray-900 font-medium">{expert?.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Email</Label>
                        <p className="text-gray-900">{expert?.email}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Professional Bio</Label>
                      <p className="text-gray-900 mt-1">{expert?.bio}</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Domain Expertise</Label>
                        <p className="text-gray-900">{expert?.domain_expertise}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Hourly Rate</Label>
                        <p className="text-gray-900">₹{expert?.hourly_rate}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Phone</Label>
                        <p className="text-gray-900">{expert?.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Experience</Label>
                        <p className="text-gray-900">{expert?.experience_years || 0} years</p>
                      </div>
                    </div>

                    {expert?.qualifications && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Qualifications</Label>
                        <p className="text-gray-900 mt-1">{expert.qualifications}</p>
                      </div>
                    )}

                    {expert?.resume_url && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Resume</Label>
                        <div className="mt-1">
                          <a 
                            href={expert.resume_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Resume
                          </a>
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 flex space-x-4">
                      <Link href="/expert/profile-setup">
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
                  <CardTitle>Verification & Ratings</CardTitle>
                  <CardDescription>
                    Your verification status and performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>KYC Status</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={expert?.is_verified ? "default" : "secondary"}>
                          {expert?.kyc_status || 'pending'}
                        </Badge>
                        {expert?.is_verified ? (
                          <Shield className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Rating</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{expert?.rating || 0}/5</span>
                        <span className="text-gray-500">({expert?.total_ratings || 0} reviews)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-sm font-medium">KYC Status</p>
                        <Badge variant={expert?.is_verified ? "default" : "secondary"} className="mt-1">
                          {expert?.kyc_status || 'pending'}
                        </Badge>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Star className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                        <p className="text-sm font-medium">Average Rating</p>
                        <p className="text-lg font-bold">{expert?.rating || 0}/5</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <Award className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-sm font-medium">Total Reviews</p>
                        <p className="text-lg font-bold">{expert?.total_ratings || 0}</p>
                      </div>
                    </div>
                    
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
          </Tabs>
        </main>
      </div>
    </div>
  )
}
