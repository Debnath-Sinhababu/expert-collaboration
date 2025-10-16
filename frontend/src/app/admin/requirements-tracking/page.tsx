'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Search, 
  Phone, 
  Building2, 
  Mail, 
  Globe, 
  MapPin, 
  Calendar, 
  DollarSign,
  Clock,
  Briefcase,
  Users,
  Loader2,
  CheckCircle2,
  PhoneCall
} from 'lucide-react'
import Link from 'next/link'

interface Institution {
  id: string
  name: string
  email: string
  phone?: string
  type: string
  city?: string
  state?: string
  website_url?: string
}

interface Requirement {
  id: string
  title: string
  description: string
  requirement_type: 'contract' | 'internship' | 'freelance'
  status: string
  call_status: string
  created_at: string
  institution_id?: string
  institutions?: Institution
  
  // Contract specific
  type?: string
  hourly_rate?: number
  total_budget?: number
  start_date?: string
  end_date?: string
  duration_hours?: number
  required_expertise?: string[]
  domain_expertise?: string
  subskills?: string[]
  
  // Internship specific
  stipend_min?: number
  stipend_max?: number
  duration_value?: number
  duration_unit?: string
  location?: string
  skills_required?: string[]
  responsibilities?: string
  paid?: boolean
  work_mode?: string
  engagement?: string
  
  // Freelance specific
  deadline?: string
  budget_min?: number
  budget_max?: number
  required_skills?: string[]
}

export default function AdminRequirementsTracking() {
  const [email, setEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'call_now' | 'called'>('call_now')
  
  // Requirements state
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [requirementsLoading, setRequirementsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  
  // Modal state
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  
  // Infinite scroll
  const lastElementRef = useRef<HTMLDivElement>(null)
  const observer = useRef<IntersectionObserver | null>(null)

  // Authentication check on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('admin_email')
    if (storedEmail === 'debnathsinhababu2017@gmail.com') {
      setIsAuthenticated(true)
    }
  }, [])

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !requirementsLoading) {
        setPage((prev) => prev + 1)
      }
    })
    if (lastElementRef.current) observer.current.observe(lastElementRef.current)
  }, [requirementsLoading, hasMore])

  // Load requirements when authenticated or filters change
  useEffect(() => {
    if (isAuthenticated) {
      loadRequirements()
    }
  }, [isAuthenticated, page])

  // Debounced search and filter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        setPage(1)
        setRequirements([])
        loadRequirements()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [search, typeFilter, activeTab])

  const handleAuth = () => {
    if (email === 'debnathsinhababu2017@gmail.com') {
      setIsAuthenticated(true)
      localStorage.setItem('admin_email', email)
      setLoading(false)
    } else {
      alert('Invalid email. Access denied.')
    }
  }

  const loadRequirements = async () => {
    if (requirementsLoading) return
    setRequirementsLoading(true)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        status: activeTab
      })
      
      if (search) params.append('search', search)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/requirements?${params.toString()}`
      )
      
      if (response.ok) {
        const result = await response.json()
        const newRequirements = Array.isArray(result.data) ? result.data : []
        
        if (page === 1) {
          setRequirements(newRequirements)
        } else {
          setRequirements(prev => [...prev, ...newRequirements])
        }
        
        setHasMore(result.hasMore || false)
      }
    } catch (error) {
      console.error('Error loading requirements:', error)
    } finally {
      setRequirementsLoading(false)
    }
  }

  const handleStatusUpdate = async (requirement: Requirement, newStatus: 'call_now' | 'called') => {
    setUpdatingStatus(true)
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/requirements/${requirement.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: requirement.requirement_type,
            status: newStatus
          })
        }
      )
      
      if (response.ok) {
        // Remove from current list
        setRequirements(prev => prev.filter(r => r.id !== requirement.id))
        setShowDetailModal(false)
        setSelectedRequirement(null)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
    setRequirements([])
  }

  const getRequirementTypeBadge = (type: string) => {
    const colors = {
      contract: 'bg-blue-100 text-blue-800',
      internship: 'bg-purple-100 text-purple-800',
      freelance: 'bg-orange-100 text-orange-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      open: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF2FF]">
        <Card className="w-full max-w-md border border-[#E0E0E0]">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-[#008260] p-3 rounded-full">
                <Phone className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Admin Requirements Tracking</CardTitle>
            <CardDescription>Enter your admin email to access the requirements dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  className="border-[#DCDCDC] focus-visible:ring-[#008260]"
                />
              </div>
              <Button
                onClick={handleAuth}
                disabled={loading}
                className="w-full bg-[#008260] hover:bg-[#006d51] text-white"
              >
                {loading ? 'Verifying...' : 'Access Dashboard'}
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
      <div className="bg-[#008260] text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Requirements Tracking</h1>
            </div>
            <Link href="/">
                <Button variant="ghost" className="font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 px-3 py-2 text-sm">Home</Button>
              </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as 'call_now' | 'called')
          setPage(1)
          setRequirements([])
        }}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="call_now" className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4" />
              Call Now ({requirements.length})
            </TabsTrigger>
            <TabsTrigger value="called" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Called
            </TabsTrigger>
          </TabsList>

          {/* Filters Section */}
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search Input */}
              <div>
                <Label htmlFor="search" className="text-sm font-medium text-[#000000] mb-2">
                  Search Requirements
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by title, institution, or description..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 bg-white border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:border-[#008260]"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <Label htmlFor="typeFilter" className="text-sm font-medium text-[#000000] mb-2">
                  Requirement Type
                </Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger 
                    id="typeFilter"
                    className="bg-white border-[#DCDCDC] focus:ring-[#008260] focus:ring-1 focus:border-[#008260]"
                  >
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="contract">Contracts</SelectItem>
                    <SelectItem value="internship">Internships</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(typeFilter !== 'all' || search) && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTypeFilter('all')
                    setSearch('')
                  }}
                  className="text-[#6A6A6A] border-[#DCDCDC] hover:bg-[#ECF2FF]"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            {requirementsLoading && page === 1 ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#008260]" />
              </div>
            ) : requirements.length === 0 ? (
              <Card className="bg-white border border-[#E0E0E0]">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Phone className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">No requirements found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {activeTab === 'call_now' 
                      ? 'All institutions have been contacted' 
                      : 'No follow-ups completed yet'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {requirements.map((requirement, index) => (
                  <Card
                    key={requirement.id}
                    ref={index === requirements.length - 1 ? lastElementRef : null}
                    className="bg-white border border-[#E0E0E0] hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedRequirement(requirement)
                      setShowDetailModal(true)
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getRequirementTypeBadge(requirement.requirement_type)}>
                              {requirement.requirement_type.charAt(0).toUpperCase() + requirement.requirement_type.slice(1)}
                            </Badge>
                            <Badge className={getStatusBadge(requirement.status)}>
                              {requirement.status}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl mb-2">{requirement.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {requirement.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Institution Details */}
                      {requirement.institutions && (
                        <div className="bg-[#ECF2FF] rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-[#008260]" />
                            <span className="font-semibold">{requirement.institutions.name}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            {requirement.institutions.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5" />
                                <a href={`mailto:${requirement.institutions.email}`} className="hover:text-[#008260]" onClick={(e) => e.stopPropagation()}>
                                  {requirement.institutions.email}
                                </a>
                              </div>
                            )}
                            {requirement.institutions.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5" />
                                <a href={`tel:${requirement.institutions.phone}`} className="hover:text-[#008260]" onClick={(e) => e.stopPropagation()}>
                                  {requirement.institutions.phone}
                                </a>
                              </div>
                            )}
                            {(requirement.institutions.city || requirement.institutions.state) && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" />
                                {[requirement.institutions.city, requirement.institutions.state].filter(Boolean).join(', ')}
                              </div>
                            )}
                            {requirement.institutions.website_url && (
                              <div className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5" />
                                <a href={requirement.institutions.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#008260]" onClick={(e) => e.stopPropagation()}>
                                  Website
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Requirement Specific Details */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {requirement.requirement_type === 'contract' && (
                          <>
                            {requirement.hourly_rate && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span>₹{requirement.hourly_rate}/hr</span>
                              </div>
                            )}
                            {requirement.duration_hours && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span>{requirement.duration_hours} hours</span>
                              </div>
                            )}
                          </>
                        )}
                        {requirement.requirement_type === 'internship' && (
                          <>
                            {(requirement.stipend_min || requirement.stipend_max) && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span>
                                  {requirement.paid 
                                    ? `₹${requirement.stipend_min || 0} - ₹${requirement.stipend_max || 0}` 
                                    : 'Unpaid'}
                                </span>
                              </div>
                            )}
                            {requirement.duration_value && requirement.duration_unit && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span>{requirement.duration_value} {requirement.duration_unit}</span>
                              </div>
                            )}
                          </>
                        )}
                        {requirement.requirement_type === 'freelance' && (
                          <>
                            {(requirement.budget_min || requirement.budget_max) && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span>₹{requirement.budget_min} - ₹{requirement.budget_max}</span>
                              </div>
                            )}
                            {requirement.deadline && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>{new Date(requirement.deadline).toLocaleDateString()}</span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(requirement.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {activeTab === 'call_now' && (
                        <div className="mt-4">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusUpdate(requirement, 'called')
                            }}
                            disabled={updatingStatus}
                            className="bg-[#008260] hover:bg-[#006d51] text-white"
                          >
                            {updatingStatus ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as Called
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {requirementsLoading && page > 1 && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-[#008260]" />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Requirement Details</DialogTitle>
            <DialogDescription>Full information about this requirement</DialogDescription>
          </DialogHeader>
          {selectedRequirement && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={getRequirementTypeBadge(selectedRequirement.requirement_type)}>
                    {selectedRequirement.requirement_type.charAt(0).toUpperCase() + selectedRequirement.requirement_type.slice(1)}
                  </Badge>
                  <Badge className={getStatusBadge(selectedRequirement.status)}>
                    {selectedRequirement.status}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold mb-2">{selectedRequirement.title}</h3>
                <p className="text-gray-600">{selectedRequirement.description}</p>
              </div>

              {/* Institution Details */}
              {selectedRequirement.institutions && (
                <div className="bg-[#ECF2FF] rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#008260]" />
                    Institution Details
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Name:</span> {selectedRequirement.institutions.name}
                    </div>
                    {selectedRequirement.institutions.email && (
                      <div>
                        <span className="font-medium">Email:</span>{' '}
                        <a href={`mailto:${selectedRequirement.institutions.email}`} className="text-[#008260] hover:underline">
                          {selectedRequirement.institutions.email}
                        </a>
                      </div>
                    )}
                    {selectedRequirement.institutions.phone && (
                      <div>
                        <span className="font-medium">Phone:</span>{' '}
                        <a href={`tel:${selectedRequirement.institutions.phone}`} className="text-[#008260] hover:underline">
                          {selectedRequirement.institutions.phone}
                        </a>
                      </div>
                    )}
                    {(selectedRequirement.institutions.city || selectedRequirement.institutions.state) && (
                      <div>
                        <span className="font-medium">Location:</span>{' '}
                        {[selectedRequirement.institutions.city, selectedRequirement.institutions.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {selectedRequirement.institutions.website_url && (
                      <div>
                        <span className="font-medium">Website:</span>{' '}
                        <a href={selectedRequirement.institutions.website_url} target="_blank" rel="noopener noreferrer" className="text-[#008260] hover:underline">
                          {selectedRequirement.institutions.website_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Requirement Specific Details */}
              <div>
                <h4 className="font-semibold mb-3">Requirement Details</h4>
                <div className="space-y-2 text-sm">
                  {selectedRequirement.requirement_type === 'contract' && (
                    <>
                      {selectedRequirement.type && <div><span className="font-medium">Type:</span> {selectedRequirement.type}</div>}
                      {selectedRequirement.hourly_rate && <div><span className="font-medium">Hourly Rate:</span> ₹{selectedRequirement.hourly_rate}/hr</div>}
                      {selectedRequirement.total_budget && <div><span className="font-medium">Total Budget:</span> ₹{selectedRequirement.total_budget}</div>}
                      {selectedRequirement.duration_hours && <div><span className="font-medium">Duration:</span> {selectedRequirement.duration_hours} hours</div>}
                      {selectedRequirement.start_date && <div><span className="font-medium">Start Date:</span> {new Date(selectedRequirement.start_date).toLocaleDateString()}</div>}
                      {selectedRequirement.end_date && <div><span className="font-medium">End Date:</span> {new Date(selectedRequirement.end_date).toLocaleDateString()}</div>}
                      {selectedRequirement.domain_expertise && <div><span className="font-medium">Domain:</span> {selectedRequirement.domain_expertise}</div>}
                      {selectedRequirement.subskills && selectedRequirement.subskills.length > 0 && (
                        <div>
                          <span className="font-medium">Required Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedRequirement.subskills.map((skill, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {selectedRequirement.requirement_type === 'internship' && (
                    <>
                      {selectedRequirement.paid !== undefined && (
                        <div>
                          <span className="font-medium">Type:</span> {selectedRequirement.paid ? 'Paid' : 'Unpaid'}
                        </div>
                      )}
                      {(selectedRequirement.stipend_min || selectedRequirement.stipend_max) && selectedRequirement.paid && (
                        <div>
                          <span className="font-medium">Stipend Range:</span> ₹{selectedRequirement.stipend_min || 0} - ₹{selectedRequirement.stipend_max || 0}
                        </div>
                      )}
                      {selectedRequirement.duration_value && selectedRequirement.duration_unit && (
                        <div>
                          <span className="font-medium">Duration:</span> {selectedRequirement.duration_value} {selectedRequirement.duration_unit}
                        </div>
                      )}
                      {selectedRequirement.work_mode && <div><span className="font-medium">Work Mode:</span> {selectedRequirement.work_mode}</div>}
                      {selectedRequirement.engagement && <div><span className="font-medium">Engagement:</span> {selectedRequirement.engagement}</div>}
                      {selectedRequirement.location && <div><span className="font-medium">Location:</span> {selectedRequirement.location}</div>}
                      {selectedRequirement.skills_required && selectedRequirement.skills_required.length > 0 && (
                        <div>
                          <span className="font-medium">Required Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedRequirement.skills_required.map((skill, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedRequirement.responsibilities && (
                        <div>
                          <span className="font-medium">Responsibilities:</span>
                          <p className="mt-1 text-gray-600">{selectedRequirement.responsibilities}</p>
                        </div>
                      )}
                    </>
                  )}
                  {selectedRequirement.requirement_type === 'freelance' && (
                    <>
                      {(selectedRequirement.budget_min || selectedRequirement.budget_max) && (
                        <div>
                          <span className="font-medium">Budget Range:</span> ₹{selectedRequirement.budget_min} - ₹{selectedRequirement.budget_max}
                        </div>
                      )}
                      {selectedRequirement.deadline && <div><span className="font-medium">Deadline:</span> {new Date(selectedRequirement.deadline).toLocaleDateString()}</div>}
                      {selectedRequirement.required_skills && selectedRequirement.required_skills.length > 0 && (
                        <div>
                          <span className="font-medium">Required Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedRequirement.required_skills.map((skill, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div className="pt-2 border-t">
                    <span className="font-medium">Posted On:</span> {new Date(selectedRequirement.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailModal(false)}
                  className="border-[#DCDCDC]"
                >
                  Close
                </Button>
                {activeTab === 'call_now' && (
                  <Button
                    onClick={() => {
                      if (selectedRequirement) {
                        handleStatusUpdate(selectedRequirement, 'called')
                      }
                    }}
                    disabled={updatingStatus}
                    className="bg-[#008260] hover:bg-[#006d51] text-white"
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as Called
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

