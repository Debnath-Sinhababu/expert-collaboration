'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { EXPERTISE_DOMAINS } from '@/lib/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Users, 
  Building2, 
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Star,
  Briefcase,
  Calendar,
  FileText,
  ExternalLink,
  Loader2
} from 'lucide-react'

type Expert = {
  id: string
  name: string
  email: string
  phone?: string
  bio?: string
  hourly_rate?: number
  rating?: number
  total_ratings?: number
  is_verified?: boolean
  domain_expertise?: string[]
  subskills?: string[]
  experience_years?: number
  photo_url?: string
  qualifications?: string
  resume_url?: string
  linkedin_url?: string
  city?: string
  state?: string
  created_at?: string
}

type Institution = {
  id: string
  name: string
  email: string
  phone?: string
  type?: string
  description?: string
  logo_url?: string
  rating?: number
  total_ratings?: number
  is_verified?: boolean
  city?: string
  state?: string
  country?: string
  created_at?: string
}

type Student = {
  id: string
  name: string
  email: string
  phone?: string
  degree?: string
  year?: string
  specialization?: string
  skills?: string[]
  photo_url?: string
  profile_photo_small_url?: string
  resume_url?: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  city?: string
  state?: string
  institution_id?: string
  institutions?: {
    name: string
    city?: string
    state?: string
  }
  created_at?: string
}

export default function AdminProfilesPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'experts' | 'institutions' | 'students'>('experts')
  
  // Experts state
  const [experts, setExperts] = useState<Expert[]>([])
  const [expertsPage, setExpertsPage] = useState(1)
  const [expertsHasMore, setExpertsHasMore] = useState(true)
  const [expertsLoading, setExpertsLoading] = useState(false)
  const [expertSearch, setExpertSearch] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('all')
  const [minRate, setMinRate] = useState('')
  const [maxRate, setMaxRate] = useState('')
  
  // Institutions state
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [institutionsPage, setInstitutionsPage] = useState(1)
  const [institutionsHasMore, setInstitutionsHasMore] = useState(true)
  const [institutionsLoading, setInstitutionsLoading] = useState(false)
  const [institutionSearch, setInstitutionSearch] = useState('')
  
  // Students state
  const [students, setStudents] = useState<Student[]>([])
  const [studentsPage, setStudentsPage] = useState(1)
  const [studentsHasMore, setStudentsHasMore] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  
  // Modal state
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  
  // Infinite scroll observers
  const expertsObserver = useRef<IntersectionObserver | null>(null)
  const institutionsObserver = useRef<IntersectionObserver | null>(null)
  const studentsObserver = useRef<IntersectionObserver | null>(null)
  
  const expertsLastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (expertsLoading) return
    if (expertsObserver.current) expertsObserver.current.disconnect()
    expertsObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && expertsHasMore) {
        setExpertsPage(prev => prev + 1)
      }
    })
    if (node) expertsObserver.current.observe(node)
  }, [expertsLoading, expertsHasMore])
  
  const institutionsLastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (institutionsLoading) return
    if (institutionsObserver.current) institutionsObserver.current.disconnect()
    institutionsObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && institutionsHasMore) {
        setInstitutionsPage(prev => prev + 1)
      }
    })
    if (node) institutionsObserver.current.observe(node)
  }, [institutionsLoading, institutionsHasMore])
  
  const studentsLastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (studentsLoading) return
    if (studentsObserver.current) studentsObserver.current.disconnect()
    studentsObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && studentsHasMore) {
        setStudentsPage(prev => prev + 1)
      }
    })
    if (node) studentsObserver.current.observe(node)
  }, [studentsLoading, studentsHasMore])

  useEffect(() => {
    if (isAuthenticated && activeTab === 'experts') {
      loadExperts()
    }
  }, [isAuthenticated, activeTab, expertsPage])

  useEffect(() => {
    if (isAuthenticated && activeTab === 'institutions') {
      loadInstitutions()
    }
  }, [isAuthenticated, activeTab, institutionsPage])

  useEffect(() => {
    if (isAuthenticated && activeTab === 'students') {
      loadStudents()
    }
  }, [isAuthenticated, activeTab, studentsPage])

  const handleAuth = () => {
    if (email === 'debnathsinhababu2017@gmail.com') {
      setIsAuthenticated(true)
      setLoading(false)
    } else {
      alert('Invalid email. Access denied.')
    }
  }

  const loadExperts = async () => {
    if (expertsLoading) return
    setExpertsLoading(true)
    
    try {
      // Build query params
      const params = new URLSearchParams({
        page: expertsPage.toString(),
        limit: '12'
      })
      
      if (expertSearch) params.append('search', expertSearch)
      if (selectedDomain && selectedDomain !== 'all') params.append('domain_expertise', selectedDomain)
      if (minRate) params.append('min_hourly_rate', minRate)
      if (maxRate) params.append('max_hourly_rate', maxRate)
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/profiles/experts?${params.toString()}`
      )
      
      if (response.ok) {
        const data = await response.json()
        const newExperts = Array.isArray(data) ? data : []
        
        if (expertsPage === 1) {
          setExperts(newExperts)
        } else {
          setExperts(prev => [...prev, ...newExperts])
        }
        
        setExpertsHasMore(newExperts.length === 12)
      }
    } catch (error) {
      console.error('Error loading experts:', error)
    } finally {
      setExpertsLoading(false)
    }
  }

  const loadInstitutions = async () => {
    if (institutionsLoading) return
    setInstitutionsLoading(true)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/profiles/institutions?page=${institutionsPage}&limit=12&search=${institutionSearch}`
      )
      
      if (response.ok) {
        const data = await response.json()
        const newInstitutions = Array.isArray(data) ? data : []
        
        if (institutionsPage === 1) {
          setInstitutions(newInstitutions)
        } else {
          setInstitutions(prev => [...prev, ...newInstitutions])
        }
        
        setInstitutionsHasMore(newInstitutions.length === 12)
      }
    } catch (error) {
      console.error('Error loading institutions:', error)
    } finally {
      setInstitutionsLoading(false)
    }
  }

  const loadStudents = async () => {
    if (studentsLoading) return
    setStudentsLoading(true)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/profiles/students?page=${studentsPage}&limit=12&search=${studentSearch}`
      )
      
      if (response.ok) {
        const data = await response.json()
        const newStudents = Array.isArray(data) ? data : []
        
        if (studentsPage === 1) {
          setStudents(newStudents)
        } else {
          setStudents(prev => [...prev, ...newStudents])
        }
        
        setStudentsHasMore(newStudents.length === 12)
      }
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setStudentsLoading(false)
    }
  }

  const handleExpertSearch = (value: string) => {
    setExpertSearch(value)
    setExpertsPage(1)
    setExperts([])
  }

  const handleInstitutionSearch = (value: string) => {
    setInstitutionSearch(value)
    setInstitutionsPage(1)
    setInstitutions([])
  }

  const handleStudentSearch = (value: string) => {
    setStudentSearch(value)
    setStudentsPage(1)
    setStudents([])
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'experts') {
        setExpertsPage(1)
        setExperts([])
        loadExperts()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [expertSearch, selectedDomain, minRate, maxRate])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'institutions') loadInstitutions()
    }, 500)
    return () => clearTimeout(timer)
  }, [institutionSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'students') loadStudents()
    }, 500)
    return () => clearTimeout(timer)
  }, [studentSearch])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF2FF]">
        <Card className="w-full max-w-md border border-[#E0E0E0]">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-[#008260] p-3 rounded-full">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Profile Management</CardTitle>
            <CardDescription>Enter your email to access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@calxmap.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className="border-[#DCDCDC]"
              />
            </div>
            <Button 
              onClick={handleAuth}
              className="w-full bg-[#008260] hover:bg-[#006d51]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Access Dashboard'
              )}
            </Button>
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => router.push('/')}
                className="text-sm text-gray-600"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-[#008260] text-white py-6 shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Profile Management</h1>
              <p className="text-white/90 text-sm mt-1">View and manage all platform profiles</p>
            </div>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-white">
            <TabsTrigger value="experts" className="data-[state=active]:bg-[#008260] data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Experts
            </TabsTrigger>
            <TabsTrigger value="institutions" className="data-[state=active]:bg-[#008260] data-[state=active]:text-white">
              <Building2 className="h-4 w-4 mr-2" />
              Institutions
            </TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-[#008260] data-[state=active]:text-white">
              <GraduationCap className="h-4 w-4 mr-2" />
              Students
            </TabsTrigger>
          </TabsList>

          {/* Experts Tab */}
          <TabsContent value="experts" className="space-y-6">
            {/* Search and Filters Section */}
            <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Input */}
                <div>
                  <Label htmlFor="expertSearch" className="text-sm font-medium text-[#000000] mb-2">
                    Search Experts
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="expertSearch"
                      placeholder="Search experts..."
                      value={expertSearch}
                      onChange={(e) => handleExpertSearch(e.target.value)}
                      className="pl-10 bg-white border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:border-[#008260]"
                    />
                  </div>
                </div>

                {/* Domain Expertise Filter */}
                <div>
                  <Label htmlFor="domainFilter" className="text-sm font-medium text-[#000000] mb-2">
                    Domain Expertise
                  </Label>
                  <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                    <SelectTrigger 
                      id="domainFilter"
                      className="bg-white border-[#DCDCDC] focus:ring-[#008260] focus:ring-1 focus:border-[#008260]"
                    >
                      <SelectValue placeholder="All domains" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All domains</SelectItem>
                      {EXPERTISE_DOMAINS.map((domain) => (
                        <SelectItem key={domain.name} value={domain.name}>
                          {domain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Min Hourly Rate Filter */}
                <div>
                  <Label htmlFor="minRate" className="text-sm font-medium text-[#000000] mb-2">
                    Min Rate (₹/hr)
                  </Label>
                  <Input
                    id="minRate"
                    type="number"
                    placeholder="Min rate"
                    value={minRate}
                    onChange={(e) => setMinRate(e.target.value)}
                    className="bg-white border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:border-[#008260]"
                  />
                </div>

                {/* Max Hourly Rate Filter */}
                <div>
                  <Label htmlFor="maxRate" className="text-sm font-medium text-[#000000] mb-2">
                    Max Rate (₹/hr)
                  </Label>
                  <Input
                    id="maxRate"
                    type="number"
                    placeholder="Max rate"
                    value={maxRate}
                    onChange={(e) => setMaxRate(e.target.value)}
                    className="bg-white border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:border-[#008260]"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {(selectedDomain !== 'all' || minRate || maxRate || expertSearch) && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDomain('all')
                      setMinRate('')
                      setMaxRate('')
                      setExpertSearch('')
                    }}
                    className="text-[#6A6A6A] border-[#DCDCDC] hover:bg-[#ECF2FF]"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {experts.map((expert, index) => (
                <Card
                  key={expert.id}
                  ref={index === experts.length - 1 ? expertsLastElementRef : null}
                  className="bg-white border border-[#E0E0E0] hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedExpert(expert)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={expert.photo_url} alt={expert.name} />
                        <AvatarFallback className="bg-[#008260] text-white text-lg">
                          {expert.name?.charAt(0) || 'E'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-1">{expert.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {expert.is_verified && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                          )}
                          {expert.rating && (
                            <div className="flex items-center text-sm">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                              {expert.rating.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{expert.email}</span>
                      </div>
                      {expert.phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {expert.phone}
                        </div>
                      )}
                      {expert.domain_expertise && expert.domain_expertise.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {expert.domain_expertise.slice(0, 2).map((domain, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {domain}
                            </Badge>
                          ))}
                          {expert.domain_expertise.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{expert.domain_expertise.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {expertsLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#008260]" />
              </div>
            )}

            {!expertsLoading && experts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No experts found
              </div>
            )}
          </TabsContent>

          {/* Institutions Tab */}
          <TabsContent value="institutions" className="space-y-6">
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search institutions by name, email, or type..."
                  value={institutionSearch}
                  onChange={(e) => handleInstitutionSearch(e.target.value)}
                  className="pl-10 bg-white border-[#DCDCDC]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {institutions.map((institution, index) => (
                <Card
                  key={institution.id}
                  ref={index === institutions.length - 1 ? institutionsLastElementRef : null}
                  className="bg-white border border-[#E0E0E0] hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedInstitution(institution)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={institution.logo_url} alt={institution.name} />
                        <AvatarFallback className="bg-[#008260] text-white text-lg">
                          {institution.name?.charAt(0) || 'I'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-1">{institution.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${
                            institution.type?.toLowerCase() === 'corporate' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {institution.type || 'Institution'}
                          </Badge>
                          {institution.is_verified && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{institution.email}</span>
                      </div>
                      {institution.phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {institution.phone}
                        </div>
                      )}
                      {(institution.city || institution.state) && (
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          {[institution.city, institution.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {institutionsLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#008260]" />
              </div>
            )}

            {!institutionsLoading && institutions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No institutions found
              </div>
            )}
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students by name, email, or degree..."
                  value={studentSearch}
                  onChange={(e) => handleStudentSearch(e.target.value)}
                  className="pl-10 bg-white border-[#DCDCDC]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((student, index) => (
                <Card
                  key={student.id}
                  ref={index === students.length - 1 ? studentsLastElementRef : null}
                  className="bg-white border border-[#E0E0E0] hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedStudent(student)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage 
                          src={student.profile_photo_small_url || student.photo_url} 
                          alt={student.name} 
                        />
                        <AvatarFallback className="bg-[#008260] text-white text-lg">
                          {student.name?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-1">{student.name}</CardTitle>
                        {student.degree && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs mt-1">
                            {student.degree}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      {student.phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {student.phone}
                        </div>
                      )}
                      {student.institutions?.name && (
                        <div className="flex items-center text-gray-600">
                          <Building2 className="h-4 w-4 mr-2" />
                          <span className="truncate">{student.institutions.name}</span>
                        </div>
                      )}
                      {student.skills && student.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {student.skills.slice(0, 2).map((skill, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {student.skills.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{student.skills.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {studentsLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#008260]" />
              </div>
            )}

            {!studentsLoading && students.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No students found
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Expert Detail Modal */}
      <Dialog open={!!selectedExpert} onOpenChange={() => setSelectedExpert(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Expert Profile</DialogTitle>
            <DialogDescription>Complete profile details</DialogDescription>
          </DialogHeader>
          {selectedExpert && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={selectedExpert.photo_url} alt={selectedExpert.name} />
                  <AvatarFallback className="bg-[#008260] text-white text-2xl">
                    {selectedExpert.name?.charAt(0) || 'E'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedExpert.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedExpert.is_verified && (
                      <Badge className="bg-green-100 text-green-800">Verified</Badge>
                    )}
                    {selectedExpert.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                        <span>{selectedExpert.rating.toFixed(1)} ({selectedExpert.total_ratings || 0} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedExpert.bio && (
                <div>
                  <h4 className="font-semibold mb-2">Bio</h4>
                  <p className="text-gray-600">{selectedExpert.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <a href={`mailto:${selectedExpert.email}`} className="text-[#008260] hover:underline">
                        {selectedExpert.email}
                      </a>
                    </div>
                    {selectedExpert.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <a href={`tel:${selectedExpert.phone}`} className="text-[#008260] hover:underline">
                          {selectedExpert.phone}
                        </a>
                      </div>
                    )}
                    {(selectedExpert.city || selectedExpert.state) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        {[selectedExpert.city, selectedExpert.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Professional Details</h4>
                  <div className="space-y-2 text-sm">
                    {selectedExpert.hourly_rate && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-500" />
                        ₹{selectedExpert.hourly_rate}/hour
                      </div>
                    )}
                    {selectedExpert.experience_years && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {selectedExpert.experience_years} years experience
                      </div>
                    )}
                    {selectedExpert.created_at && (
                      <div className="flex items-center gap-2 text-gray-500">
                        Joined: {new Date(selectedExpert.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedExpert.domain_expertise && selectedExpert.domain_expertise.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Domain Expertise</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedExpert.domain_expertise.map((domain, idx) => (
                      <Badge key={idx} className="bg-[#008260] text-white">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedExpert.subskills && selectedExpert.subskills.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedExpert.subskills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedExpert.qualifications && (
                <div>
                  <h4 className="font-semibold mb-2">Qualifications</h4>
                  <p className="text-gray-600">{selectedExpert.qualifications}</p>
                </div>
              )}

              {(selectedExpert.resume_url || selectedExpert.linkedin_url) && (
                <div>
                  <h4 className="font-semibold mb-2">Links</h4>
                  <div className="flex gap-3">
                    {selectedExpert.resume_url && (
                      <a
                        href={selectedExpert.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#008260] hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        View Resume
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedExpert.linkedin_url && (
                      <a
                        href={selectedExpert.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#008260] hover:underline"
                      >
                        LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Institution Detail Modal */}
      <Dialog open={!!selectedInstitution} onOpenChange={() => setSelectedInstitution(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Institution Profile</DialogTitle>
            <DialogDescription>Complete institution details</DialogDescription>
          </DialogHeader>
          {selectedInstitution && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={selectedInstitution.logo_url} alt={selectedInstitution.name} />
                  <AvatarFallback className="bg-[#008260] text-white text-2xl">
                    {selectedInstitution.name?.charAt(0) || 'I'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedInstitution.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`${
                      selectedInstitution.type?.toLowerCase() === 'corporate'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {selectedInstitution.type || 'Institution'}
                    </Badge>
                    {selectedInstitution.is_verified && (
                      <Badge className="bg-green-100 text-green-800">Verified</Badge>
                    )}
                    {selectedInstitution.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                        <span>{selectedInstitution.rating.toFixed(1)} ({selectedInstitution.total_ratings || 0} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedInstitution.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-gray-600">{selectedInstitution.description}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <a href={`mailto:${selectedInstitution.email}`} className="text-[#008260] hover:underline">
                      {selectedInstitution.email}
                    </a>
                  </div>
                  {selectedInstitution.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <a href={`tel:${selectedInstitution.phone}`} className="text-[#008260] hover:underline">
                        {selectedInstitution.phone}
                      </a>
                    </div>
                  )}
                  {(selectedInstitution.city || selectedInstitution.state || selectedInstitution.country) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      {[selectedInstitution.city, selectedInstitution.state, selectedInstitution.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {selectedInstitution.created_at && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="h-4 w-4" />
                      Joined: {new Date(selectedInstitution.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Detail Modal */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Student Profile</DialogTitle>
            <DialogDescription>Complete student details</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage 
                    src={selectedStudent.profile_photo_small_url || selectedStudent.photo_url} 
                    alt={selectedStudent.name} 
                  />
                  <AvatarFallback className="bg-[#008260] text-white text-2xl">
                    {selectedStudent.name?.charAt(0) || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedStudent.name}</h3>
                  {selectedStudent.degree && (
                    <Badge className="bg-purple-100 text-purple-800 mt-2">
                      {selectedStudent.degree} {selectedStudent.year && `- Year ${selectedStudent.year}`}
                    </Badge>
                  )}
                </div>
              </div>

              {selectedStudent.specialization && (
                <div>
                  <h4 className="font-semibold mb-2">Specialization</h4>
                  <p className="text-gray-600">{selectedStudent.specialization}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <a href={`mailto:${selectedStudent.email}`} className="text-[#008260] hover:underline">
                        {selectedStudent.email}
                      </a>
                    </div>
                    {selectedStudent.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <a href={`tel:${selectedStudent.phone}`} className="text-[#008260] hover:underline">
                          {selectedStudent.phone}
                        </a>
                      </div>
                    )}
                    {(selectedStudent.city || selectedStudent.state) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        {[selectedStudent.city, selectedStudent.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Institution</h4>
                  {selectedStudent.institutions?.name ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        {selectedStudent.institutions.name}
                      </div>
                      {(selectedStudent.institutions.city || selectedStudent.institutions.state) && (
                        <div className="text-gray-500 ml-6">
                          {[selectedStudent.institutions.city, selectedStudent.institutions.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No institution linked</p>
                  )}
                  {selectedStudent.created_at && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm mt-2">
                      <Calendar className="h-4 w-4" />
                      Joined: {new Date(selectedStudent.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {selectedStudent.skills && selectedStudent.skills.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(selectedStudent.resume_url || selectedStudent.linkedin_url || selectedStudent.github_url || selectedStudent.portfolio_url) && (
                <div>
                  <h4 className="font-semibold mb-2">Links</h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedStudent.resume_url && (
                      <a
                        href={selectedStudent.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#008260] hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        Resume
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedStudent.linkedin_url && (
                      <a
                        href={selectedStudent.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#008260] hover:underline"
                      >
                        LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedStudent.github_url && (
                      <a
                        href={selectedStudent.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#008260] hover:underline"
                      >
                        GitHub
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {selectedStudent.portfolio_url && (
                      <a
                        href={selectedStudent.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#008260] hover:underline"
                      >
                        Portfolio
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

