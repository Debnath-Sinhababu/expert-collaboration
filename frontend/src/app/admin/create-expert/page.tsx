'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MultiSelect } from '@/components/ui/multi-select'
import { Upload, Camera, X, FileText, IndianRupee, Info, ArrowLeft } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { toast } from 'sonner'
import Logo from '@/components/Logo'
import { EXPERTISE_DOMAINS } from '@/lib/constants'

export default function AdminCreateExpert() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    qualifications: '',
    domain_expertise: '',
    subskills: [] as string[],
    resume_url: '',
    hourly_rate: '',
    experience_years: '',
    linkedin_url: '',
    last_working_company: '',
    current_designation: '',
    expert_types: [] as string[],
    available_on_demand: false
  })

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoError, setPhotoError] = useState('')
  const [selectedSubskills, setSelectedSubskills] = useState<string[]>([])
  const [availableSubskills, setAvailableSubskills] = useState<string[]>([])
  const [customDomains, setCustomDomains] = useState<any[]>([])
  const [isCustomDomain, setIsCustomDomain] = useState(false)
  const [customDomainInput, setCustomDomainInput] = useState('')
  const [customSubskillInput, setCustomSubskillInput] = useState('')
  
  const [selectedResume, setSelectedResume] = useState<File | null>(null)
  const [resumeError, setResumeError] = useState('')
  
  const [selectedQualifications, setSelectedQualifications] = useState<File | null>(null)
  const [qualificationsError, setQualificationsError] = useState('')

  useEffect(() => {
    // Mark component as mounted (client-side only)
    setMounted(true)
    // Check if already authenticated
    const storedAuth = localStorage.getItem('admin_auth')
    if (storedAuth === 'debnathsinhababu2017@gmail.com') {
      setIsAuthenticated(true)
      loadCustomDomains()
    }
  }, [])

  const loadCustomDomains = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/custom-domains`)
      if (response.ok) {
        const data = await response.json()
        setCustomDomains(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading custom domains:', error)
    }
  }

  const handleAuth = () => {
    if (email === 'debnathsinhababu2017@gmail.com') {
      setIsAuthenticated(true)
      localStorage.setItem('admin_auth', email)
    } else {
      toast.error('Invalid email. Access denied.')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDomainChange = (domain: string) => {
    // Check if "Custom" option is selected
    if (domain === '__custom__') {
      setIsCustomDomain(true)
      setFormData(prev => ({
        ...prev,
        domain_expertise: '',
        subskills: []
      }))
      setAvailableSubskills([])
      setSelectedSubskills([])
      return
    }
    
    setIsCustomDomain(false)
    setCustomDomainInput('')
    setFormData(prev => ({
      ...prev,
      domain_expertise: domain,
      subskills: []
    }))
    
    // Check predefined domains
    const selectedDomain = EXPERTISE_DOMAINS.find(d => d.name === domain)
    if (selectedDomain) {
      setAvailableSubskills([...selectedDomain.subskills])
    } else {
      // Check custom domains
      const customDomain = customDomains.find(d => d.name === domain)
      if (customDomain && customDomain.subskills) {
        setAvailableSubskills([...customDomain.subskills])
      } else {
        setAvailableSubskills([])
      }
    }
    
    setSelectedSubskills([])
  }

  const handleCustomDomainInput = (value: string) => {
    setCustomDomainInput(value)
    setFormData(prev => ({
      ...prev,
      domain_expertise: value
    }))
  }

  const handleAddCustomSubskill = () => {
    if (customSubskillInput.trim()) {
      const newSubskills = [...selectedSubskills, customSubskillInput.trim()]
      setSelectedSubskills(newSubskills)
      setFormData(prev => ({
        ...prev,
        subskills: newSubskills
      }))
      setCustomSubskillInput('')
    }
  }

  const handleRemoveCustomSubskill = (subskill: string) => {
    const newSubskills = selectedSubskills.filter(s => s !== subskill)
    setSelectedSubskills(newSubskills)
    setFormData(prev => ({
      ...prev,
      subskills: newSubskills
    }))
  }

  const handleSubskillChange = (newSubskills: string[]) => {
    setSelectedSubskills(newSubskills)
    setFormData(prev => ({
      ...prev,
      subskills: newSubskills
    }))
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setPhotoError('Please select a valid image file (JPEG, PNG, or WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File size must be less than 5MB')
      return
    }

    setPhotoError('')
    setSelectedPhoto(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removePhoto = () => {
    setSelectedPhoto(null)
    setPhotoPreview('')
    setPhotoError('')
  }

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setResumeError('Please select a valid PDF file')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setResumeError('File size must be less than 20MB')
      return
    }

    setResumeError('')
    setSelectedResume(file)
    e.target.value = ''
  }

  const removeResume = () => {
    setSelectedResume(null)
    setResumeError('')
  }

  const handleQualificationsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setQualificationsError('Please select a valid PDF file')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setQualificationsError('File size must be less than 20MB')
      return
    }

    setQualificationsError('')
    setSelectedQualifications(file)
    e.target.value = ''
  }

  const removeQualifications = () => {
    setSelectedQualifications(null)
    setQualificationsError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        toast.error('Please enter expert name')
        setSaving(false)
        return
      }

      if (!formData.email?.trim()) {
        toast.error('Please enter email')
        setSaving(false)
        return
      }

      if (!formData.phone?.trim()) {
        toast.error('Please enter phone number')
        setSaving(false)
        return
      }

      if (!formData.domain_expertise || (isCustomDomain && !customDomainInput.trim())) {
        toast.error('Please select or enter domain expertise')
        setSaving(false)
        return
      }

      if (formData.subskills.length === 0) {
        toast.error('Please add at least one specialization/skill')
        setSaving(false)
        return
      }

      if (!formData.hourly_rate) {
        toast.error('Please enter hourly rate')
        setSaving(false)
        return
      }

      if (!formData.last_working_company?.trim()) {
        toast.error('Please enter last working company')
        setSaving(false)
        return
      }

      if (!formData.current_designation?.trim()) {
        toast.error('Please enter current designation')
        setSaving(false)
        return
      }

      if (formData.expert_types.length === 0) {
        toast.error('Please select at least one expert type')
        setSaving(false)
        return
      }

      if (!selectedPhoto) {
        toast.error('Please upload a profile photo')
        setSaving(false)
        return
      }

      // Create FormData for file upload
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('email', formData.email)
      formDataToSend.append('phone', formData.phone)
      formDataToSend.append('bio', formData.bio)
      formDataToSend.append('qualifications', formData.qualifications)
      formDataToSend.append('domain_expertise', formData.domain_expertise)
      formDataToSend.append('subskills', JSON.stringify(formData.subskills))
      formDataToSend.append('hourly_rate', formData.hourly_rate.toString())
      formDataToSend.append('experience_years', formData.experience_years)
      formDataToSend.append('linkedin_url', formData.linkedin_url)
      formDataToSend.append('last_working_company', formData.last_working_company)
      formDataToSend.append('current_designation', formData.current_designation)
      formDataToSend.append('expert_types', JSON.stringify(formData.expert_types))
      formDataToSend.append('available_on_demand', String(formData.available_on_demand))
      
      if (selectedPhoto) {
        formDataToSend.append('profile_photo', selectedPhoto)
      }
      
      if (selectedResume) {
        formDataToSend.append('resume', selectedResume)
      }
      
      if (selectedQualifications) {
        formDataToSend.append('qualifications', selectedQualifications)
      }

      // Get admin auth token
      const adminEmail = localStorage.getItem('admin_auth') || 'debnathsinhababu2017@gmail.com'
      const authToken = `Bearer ${adminEmail}`

      // Call the admin API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/experts`, {
        method: 'POST',
        headers: {
          'Authorization': authToken
        },
        body: formDataToSend
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create expert profile')
      }

      const result = await response.json()
      toast.success('Expert profile created successfully!')
      setSuccess('Expert profile created successfully!')
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        bio: '',
        qualifications: '',
        domain_expertise: '',
        subskills: [],
        resume_url: '',
        hourly_rate: '',
        experience_years: '',
        linkedin_url: '',
        last_working_company: '',
        current_designation: '',
        expert_types: [],
        available_on_demand: false
      })
      setSelectedPhoto(null)
      setPhotoPreview('')
      setSelectedResume(null)
      setSelectedQualifications(null)
      setSelectedSubskills([])
      setAvailableSubskills([])
      setIsCustomDomain(false)
      setCustomDomainInput('')
      setCustomSubskillInput('')
      
    } catch (error: any) {
      setError(error.message)
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  // Show loading state during hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF2FF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF2FF]">
        <Card className="w-full max-w-md border border-[#E0E0E0]">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-[#008260] p-3 rounded-full">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Create Expert Profile</CardTitle>
            <CardDescription>Enter your email to access the admin panel</CardDescription>
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
            >
              Access Admin Panel
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
    <div className="min-h-screen bg-[#ECF2FF] relative">
      <header className="relative bg-[#008260] shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Logo size="header" />
            <div className="flex items-center gap-4">
              <Link href="/admin/profiles">
                <Button variant="ghost" className="font-medium text-white hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 text-sm">
                  View Profiles
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="font-medium text-white hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 text-sm">
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-start gap-y-6 mt-8">
        <div className="flex items-center gap-4 w-full">
          <Link href="/admin/profiles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h2 className="text-[#000000] font-semibold text-[32px]">Create Expert Profile</h2>
            <p className="text-base font-sans text-[#000000] font-normal">Create expert profiles without requiring user authentication</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10 mt-8 pb-10">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-white">
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-slate-800">Basic Information</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter expert full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-slate-700">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Describe professional background, expertise, and what makes them unique..."
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualifications" className="text-slate-700">Qualifications & Certifications</Label>
                  <Textarea
                    id="qualifications"
                    placeholder="List degrees, certifications, and relevant qualifications..."
                    value={formData.qualifications}
                    onChange={(e) => handleInputChange('qualifications', e.target.value)}
                    rows={3}
                    className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualifications_pdf" className="text-slate-700">Qualifications Documents (PDF)</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-[#008260] transition-colors">
                    <input
                      type="file"
                      id="qualifications_pdf"
                      accept=".pdf"
                      onChange={handleQualificationsSelect}
                      className="hidden"
                    />
                    <label htmlFor="qualifications_pdf" className="cursor-pointer">
                      <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                      <p className="text-sm text-slate-600 mb-2">
                        <span className="font-medium text-[#008260] hover:text-[#006d51]">
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">PDF files only, max 20MB (optional)</p>
                    </label>
                  </div>
                  
                  {selectedQualifications && (
                    <div className="mt-3 p-3 bg-[#008260]/10 border border-[#008260]/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-[#008260]" />
                          <span className="text-sm font-medium text-slate-900 break-all">
                            {selectedQualifications.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={removeQualifications}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {qualificationsError && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription>{qualificationsError}</AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Profile Photo Upload */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile_photo" className="text-slate-700 flex items-center space-x-2">
                      <Camera className="h-4 w-4" />
                      <span>Profile Photo *</span>
                    </Label>
                    <p className="text-sm text-slate-500">Upload a professional photo (JPEG, PNG, or WebP, max 5MB)</p>
                  </div>

                  <div className="space-y-4">
                    {!photoPreview ? (
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-[#008260] transition-colors duration-300">
                        <input
                          type="file"
                          id="profile_photo"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                        <label htmlFor="profile_photo" className="cursor-pointer">
                          <div className="space-y-3">
                            <div className="mx-auto w-16 h-16 bg-[#008260]/10 rounded-full flex items-center justify-center">
                              <Upload className="h-8 w-8 text-[#008260]" />
                            </div>
                            <div>
                              <p className="text-slate-600 font-medium">Click to upload photo</p>
                              <p className="text-sm text-slate-500">or drag and drop</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                          <div className="flex items-center justify-between mb-3">
                            <Avatar className="w-20 h-20 border-4 border-[#008260]/30 flex-shrink-0">
                              <AvatarImage src={photoPreview} />
                              <AvatarFallback className="text-2xl font-bold bg-[#008260] text-white">
                                {formData.name?.charAt(0) || 'E'}
                              </AvatarFallback>
                            </Avatar>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={removePhoto}
                              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition-all duration-300 px-2 py-1 h-6 text-xs flex-shrink-0"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                          
                          <div className="text-center sm:text-left w-full min-w-0">
                            <p className="text-sm text-slate-600 font-medium">Photo selected</p>
                            <div className="w-full overflow-hidden">
                              <p className="text-xs text-slate-500 break-all">{selectedPhoto?.name}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {photoError && (
                      <Alert variant="destructive">
                        <AlertDescription>{photoError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold text-slate-800">Professional Details</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="current_designation" className="text-slate-700">Current Designation *</Label>
                    <Input
                      id="current_designation"
                      placeholder="e.g. Teacher, Developer, CTO, Professor, Senior Engineer — your current job title or role"
                      value={formData.current_designation}
                      onChange={(e) => handleInputChange('current_designation', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domain_expertise" className="text-slate-700">Domain Expertise *</Label>
                    <Select 
                      value={isCustomDomain ? '__custom__' : formData.domain_expertise} 
                      onValueChange={handleDomainChange}
                    >
                      <SelectTrigger className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300">
                        <SelectValue placeholder="Select primary domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERTISE_DOMAINS.map((domain) => (
                          <SelectItem key={domain.name} value={domain.name}>
                            {domain.name}
                          </SelectItem>
                        ))}
                        {customDomains.map((domain) => (
                          <SelectItem key={domain.id} value={domain.name}>
                            {domain.name} (Custom)
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">+ Add Custom Domain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Domain Input */}
                  {isCustomDomain && (
                    <div className="space-y-2">
                      <Label htmlFor="custom_domain" className="text-slate-700">Custom Domain Name *</Label>
                      <Input
                        id="custom_domain"
                        placeholder="Enter custom domain name"
                        value={customDomainInput}
                        onChange={(e) => handleCustomDomainInput(e.target.value)}
                        className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                      />
                    </div>
                  )}

                  {/* Predefined or Custom Domain Subskills */}
                  {formData.domain_expertise && !isCustomDomain && availableSubskills.length > 0 && (
                    <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
                      <Label className="text-slate-700">Specializations & Skills *</Label>
                      <MultiSelect
                        options={availableSubskills}
                        selected={selectedSubskills}
                        onSelectionChange={handleSubskillChange}
                        placeholder="Select specializations..."
                        className="w-full min-w-0"
                      />
                    </div>
                  )}

                  {/* Custom Subskills Input */}
                  {isCustomDomain && formData.domain_expertise && (
                    <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
                      <Label className="text-slate-700">Custom Specializations & Skills *</Label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter specialization/skill"
                            value={customSubskillInput}
                            onChange={(e) => setCustomSubskillInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddCustomSubskill()
                              }
                            }}
                            className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                          />
                          <Button
                            type="button"
                            onClick={handleAddCustomSubskill}
                            className="bg-[#008260] hover:bg-[#006d51] text-white"
                          >
                            Add
                          </Button>
                        </div>
                        {selectedSubskills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedSubskills.map((subskill, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1 px-3 py-1 bg-[#008260]/10 border border-[#008260]/30 rounded-md text-sm"
                              >
                                <span>{subskill}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomSubskill(subskill)}
                                  className="ml-1 text-red-500 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="experience_years" className="text-slate-700">Years of Experience</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      placeholder="Enter years of experience"
                      value={formData.experience_years}
                      onChange={(e) => handleInputChange('experience_years', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate" className="text-slate-700">Hourly Rate (₹) *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-[#008260]" />
                      <Input
                        id="hourly_rate"
                        type="number"
                        placeholder="Enter hourly rate"
                        value={formData.hourly_rate}
                        onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                        className="pl-10 border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url" className="text-slate-700">LinkedIn Profile</Label>
                    <Input
                      id="linkedin_url"
                      placeholder="https://linkedin.com/in/yourprofile"
                      value={formData.linkedin_url}
                      onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="last_working_company" className="text-slate-700">Last Working Company *</Label>
                    <Input
                      id="last_working_company"
                      placeholder="Enter last company name"
                      value={formData.last_working_company}
                      onChange={(e) => handleInputChange('last_working_company', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
                    <Label className="text-slate-700">Expert Type *</Label>
                    <MultiSelect
                      options={['Guest Faculty', 'Visiting Faculty', 'Industry Experts']}
                      selected={formData.expert_types}
                      onSelectionChange={(types) => setFormData(prev => ({ ...prev, expert_types: types }))}
                      placeholder="Select expert types..."
                      className="w-full min-w-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="available_on_demand"
                      checked={formData.available_on_demand}
                      onChange={(e) => setFormData(prev => ({ ...prev, available_on_demand: e.target.checked }))}
                      className="w-4 h-4 border-slate-300 rounded text-[#008260] focus:ring-[#008260] focus:ring-offset-0"
                    />
                    <Label htmlFor="available_on_demand" className="text-slate-700 cursor-pointer flex items-center gap-2">
                      Available on demand?
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-slate-400 hover:text-[#008260] cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              Expert will be available immediately when a requirement is posted.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resume" className="text-slate-700">Resume/CV (PDF)</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-[#008260] transition-colors">
                    <input
                      type="file"
                      id="resume"
                      accept=".pdf"
                      onChange={handleResumeSelect}
                      className="hidden"
                    />
                    <label htmlFor="resume" className="cursor-pointer">
                      <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                      <p className="text-sm text-slate-600 mb-2">
                        <span className="font-medium text-[#008260] hover:text-[#006d51]">
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">PDF files only, max 20MB</p>
                    </label>
                  </div>
                  
                  {selectedResume && (
                    <div className="mt-3 p-3 bg-[#008260]/10 border border-[#008260]/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-[#008260]" />
                          <span className="text-sm font-medium text-slate-900 break-all">
                            {selectedResume.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={removeResume}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {resumeError && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription>{resumeError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-6 flex-wrap gap-3 border-t">
                <Link href="/admin/profiles">
                  <Button variant="outline" className="bg-white rounded-md w-[150px]">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="bg-[#008260] hover:bg-[#006d51] text-white rounded-md w-[150px]"
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Create Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

