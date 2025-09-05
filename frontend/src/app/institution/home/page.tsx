'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { EXPERTISE_DOMAINS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import Logo from '@/components/Logo'
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Building2,
  Star,
  Eye,
  BookOpen,
  MessageSquare,
  Bell,
  Settings,
  Plus,
  UserCheck,
  GraduationCap,
  Award,
  Briefcase
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type UserMeta = { role?: string; name?: string }
type SessionUser = { id: string; email?: string; user_metadata?: UserMeta }

export default function InstitutionHome() {
  type InstitutionProfile = {
    id?: string
    user_id?: string
    name?: string
    email?: string
    type?: string
    description?: string
    logo_url?: string
    rating?: number
    total_ratings?: number
    is_verified?: boolean
  }

  type Expert = {
    id: string
    name?: string
    email?: string
    bio?: string
    hourly_rate?: number
    rating?: number
    total_ratings?: number
    is_verified?: boolean
    domain_expertise?: string[]
    experience_years?: number
    photo_url?: string
    qualifications?: string
  }

  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<InstitutionProfile | null>(null)
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [minRate, setMinRate] = useState('')
  const [maxRate, setMaxRate] = useState('')
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

  const router = useRouter()

  // Reuse existing getUser pattern from dashboard
  const getUser = async (): Promise<SessionUser | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return null
    }
    setUser(user)
    return user as unknown as SessionUser
  }

  // Reuse existing loadInstitutionData pattern
  const loadInstitutionData = async (userId: string) => {
    try {
      setLoading(true)
      const institutionsResponse = await api.institutions.getAll()
      const institutions = Array.isArray(institutionsResponse) ? institutionsResponse : (institutionsResponse?.data || [])
      const institutionProfile = institutions.find((i: any) => i.user_id === userId)
      
      if (!institutionProfile) {
        router.push('/institution/profile-setup')
        return
      }
      
      setInstitution(institutionProfile)
      
      // Load experts
      await loadExperts()
      
    } catch (error: any) {
      setError('Failed to load institution data')
      console.error('Institution home error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExperts = async () => {
    try {
      // Filter out undefined values to avoid sending "undefined" in URL
      const params: any = {
        is_verified: true
      }
      
      if (searchTerm) params.search = searchTerm
      if (selectedDomain !== 'all') params.domain_expertise = selectedDomain
      if (minRate) params.min_hourly_rate = parseFloat(minRate)
      if (maxRate) params.max_hourly_rate = parseFloat(maxRate)

      const data = await api.experts.getAll(params)
      setExperts(Array.isArray(data) ? data : (data?.data || []))
    } catch (error) {
      console.error('Error fetching experts:', error)
      setError('Failed to load experts')
    }
  }

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const currentUser = await getUser()
        if (!currentUser) return

        const userRole = currentUser.user_metadata?.role
        if (userRole !== 'institution') {
          router.push('/')
          return
        }
        
        await loadInstitutionData(currentUser.id)
      } catch (error: any) {
        setError('Failed to get user data')
        console.error('Error getting user:', error)
      }
    }
    initializeUser()
  }, [router])

  useEffect(() => {
    if (institution) {
      loadExperts()
    }
  }, [institution, searchTerm, selectedDomain, minRate, maxRate])

  const handleCreateProject = async () => {
    try {
      setSubmittingProject(true)
      
      const projectData = {
        ...projectForm,
        institution_id: institution?.id,
        hourly_rate: parseFloat(projectForm.hourly_rate),
        total_budget: parseFloat(projectForm.total_budget),
        duration_hours: parseInt(projectForm.duration_hours),
        required_expertise: projectForm.required_expertise.split(',').map(s => s.trim()).filter(s => s)
      }

      await api.projects.create(projectData)
      
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
        required_expertise: ''
      })
      
      setShowProjectForm(false)
      
      // Show success message (you can add toast notification here)
      alert('Project created successfully!')
      
      // TODO: Open modal with top 5 matching experts
      
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project')
    } finally {
      setSubmittingProject(false)
    }
  }

  const getDomainColor = (domain: string) => {
    const colors: { [key: string]: string } = {
      'Computer Science & IT': 'bg-blue-100 text-blue-800',
      'Engineering': 'bg-green-100 text-green-800',
      'Business & Management': 'bg-purple-100 text-purple-800',
      'Finance & Economics': 'bg-yellow-100 text-yellow-800',
      'Healthcare & Medicine': 'bg-red-100 text-red-800',
      'Education & Training': 'bg-indigo-100 text-indigo-800',
      'Research & Development': 'bg-pink-100 text-pink-800',
      'Marketing & Sales': 'bg-orange-100 text-orange-800',
      'Data Science & Analytics': 'bg-teal-100 text-teal-800',
      'Design & Creative': 'bg-rose-100 text-rose-800',
      'Law & Legal': 'bg-amber-100 text-amber-800'
    }
    return colors[domain] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <Logo size="md" />
              <span className="text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent group-hover:from-blue-200 group-hover:to-white transition-all duration-300">Calxmap</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/institution/home" className="text-white/90 hover:text-blue-200 font-medium transition-colors duration-200 relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
              <Link href="/institution/dashboard" className="text-white/70 hover:text-blue-200 font-medium transition-colors duration-200 relative group">
                Dashboard
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200">
                <NotificationBell />
              </div>
              <ProfileDropdown 
                user={user} 
                institution={institution} 
                userType="institution" 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {institution?.name}!
          </h1>
          <p className="text-slate-600">
            Connect with top experts and create impactful learning experiences
          </p>
        </div>

        {/* Post Requirement Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Post a New Requirement</h2>
            <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Post Requirement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Fill in the details to post a new requirement for experts
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Project Title</Label>
                    <Input
                      id="title"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                      placeholder="e.g., Guest Lecture on AI"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Project Type</Label>
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
                    <Label htmlFor="hourly_rate">Hourly Rate (₹)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      value={projectForm.hourly_rate}
                      onChange={(e) => setProjectForm({...projectForm, hourly_rate: e.target.value})}
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_budget">Total Budget (₹)</Label>
                    <Input
                      id="total_budget"
                      type="number"
                      value={projectForm.total_budget}
                      onChange={(e) => setProjectForm({...projectForm, total_budget: e.target.value})}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_hours">Duration (Hours)</Label>
                    <Input
                      id="duration_hours"
                      type="number"
                      value={projectForm.duration_hours}
                      onChange={(e) => setProjectForm({...projectForm, duration_hours: e.target.value})}
                      placeholder="40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="required_expertise">Required Skills (comma-separated)</Label>
                    <Input
                      id="required_expertise"
                      value={projectForm.required_expertise}
                      onChange={(e) => setProjectForm({...projectForm, required_expertise: e.target.value})}
                      placeholder="AI, Machine Learning, Data Science"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    placeholder="Describe the project requirements..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowProjectForm(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateProject}
                    disabled={submittingProject}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submittingProject ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-slate-600 text-sm">
            Post your requirements and we'll help you find the perfect experts for your needs
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Experts</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search experts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="domain">Domain Expertise</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="All domains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All domains</SelectItem>
                  {EXPERTISE_DOMAINS.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="minRate">Min Rate (₹/hr)</Label>
              <Input
                id="minRate"
                type="number"
                placeholder="0"
                value={minRate}
                onChange={(e) => setMinRate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="maxRate">Max Rate (₹/hr)</Label>
              <Input
                id="maxRate"
                type="number"
                placeholder="10000"
                value={maxRate}
                onChange={(e) => setMaxRate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Experts Carousel */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Featured Experts ({experts.length})
            </h2>
          </div>

          {experts.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No experts found</h3>
              <p className="text-slate-500">Try adjusting your search criteria</p>
            </div>
          ) : (
            <Carousel className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {experts.map((expert) => (
                  <CarouselItem key={expert.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="hover:shadow-lg transition-shadow duration-300">
                      <CardHeader>
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={expert.photo_url} alt={expert.name} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                              {expert.name?.charAt(0) || 'E'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg line-clamp-1">{expert.name}</CardTitle>
                            <div className="flex items-center text-slate-600 text-sm">
                              <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                              {expert.rating?.toFixed(1) || '0.0'} ({expert.total_ratings || 0})
                            </div>
                            <div className="flex items-center text-slate-600 text-sm">
                              <DollarSign className="h-4 w-4 mr-1" />
                              ₹{expert.hourly_rate}/hour
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <CardDescription className="line-clamp-2 mb-4">
                          {expert.bio}
                        </CardDescription>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-slate-600 text-sm">
                            <Briefcase className="h-4 w-4 mr-2" />
                            {expert.experience_years || 0} years experience
                          </div>
                          <div className="flex items-center text-slate-600 text-sm">
                            <Award className="h-4 w-4 mr-2" />
                            {expert.is_verified ? 'Verified' : 'Unverified'}
                          </div>
                        </div>

                        {expert.domain_expertise && expert.domain_expertise.length > 0 && (
                          <div className="mb-4">
                            <div className="flex flex-wrap gap-1">
                              {expert.domain_expertise.slice(0, 2).map((domain, index) => (
                                <Badge key={index} className={`text-xs ${getDomainColor(domain)}`}>
                                  {domain}
                                </Badge>
                              ))}
                              {expert.domain_expertise.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{expert.domain_expertise.length - 2} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex space-x-2">
                          <Button className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                            <UserCheck className="h-4 w-4 mr-2" />
                            Select Expert
                          </Button>
                          <Button variant="outline" size="icon" className="border-slate-300">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          )}
        </div>

      </main>
    </div>
  )
}
