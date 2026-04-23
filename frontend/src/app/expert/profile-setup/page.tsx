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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MultiSelect } from '@/components/ui/multi-select'
import { Upload, Calendar, DollarSign, X, Camera, FileText, Download, Check, IndianRupee, Info, Video } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useExpertWorkspace } from '@/contexts/ExpertWorkspaceContext'
import { getAuthHeadersForFormData } from '@/lib/api'
import { toast } from 'sonner'
import Logo from '@/components/Logo'
import { EXPERTISE_DOMAINS, EXPERT_TYPES, EXPERT_SERVICES } from '@/lib/constants'

/** Indian PAN: five letters, four digits, one letter (normalized uppercase). */
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const PROFILE_VIDEO_MAX_BYTES = 20 * 1024 * 1024
const ALLOWED_PROFILE_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]

const AVAILABILITY_SLOTS = [
  'Monday Morning',
  'Monday Afternoon',
  'Monday Evening',
  'Tuesday Morning',
  'Tuesday Afternoon',
  'Tuesday Evening',
  'Wednesday Morning',
  'Wednesday Afternoon',
  'Wednesday Evening',
  'Thursday Morning',
  'Thursday Afternoon',
  'Thursday Evening',
  'Friday Morning',
  'Friday Afternoon',
  'Friday Evening',
  'Saturday Morning',
  'Saturday Afternoon',
  'Saturday Evening',
  'Sunday Morning',
  'Sunday Afternoon',
  'Sunday Evening'
]

export default function ExpertProfileSetup() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const { viewer, basePath } = useExpertWorkspace()

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    qualifications: '',
    domain_expertise: '',
    subskills: [] as string[],
    resume_url: '',
    hourly_rate: '',
    photo_url: '',
    availability: [] as string[],
    experience_years: '',
    phone: '',
    linkedin_url: '',
    last_working_company: '',
    current_designation: '',
    expert_types: [] as string[],
    expert_services: [] as string[],
    available_on_demand: false,
    city: '',
    state: '',
    pan_number: ''
    ,interested_in_services: false,
    service_price: ''
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

  const [selectedProfileVideo, setSelectedProfileVideo] = useState<File | null>(null)
  const [profileVideoError, setProfileVideoError] = useState('')
  const [profileVideoPreviewUrl, setProfileVideoPreviewUrl] = useState('')

  const [selectedCourseVideo, setSelectedCourseVideo] = useState<File | null>(null)
  const [courseVideoError, setCourseVideoError] = useState('')
  const [courseVideoPreviewUrl, setCourseVideoPreviewUrl] = useState('')

  useEffect(() => {
    return () => {
      if (profileVideoPreviewUrl) {
        URL.revokeObjectURL(profileVideoPreviewUrl)
      }
    }
  }, [profileVideoPreviewUrl])

  useEffect(() => {
    const getUser = async () => {
      if (viewer === 'super_admin') {
        router.replace('/superadmin/home')
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      setLoading(false)
      loadCustomDomains()
    }

    getUser()
  }, [router, viewer])

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
        current_designation: '',
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

  const handleAvailabilityChange = (slot: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      availability: checked
        ? [...prev.availability, slot]
        : prev.availability.filter(s => s !== slot)
    }))
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setPhotoError('Please select a valid image file (JPEG, PNG, or WebP)')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File size must be less than 5MB')
      return
    }

    setPhotoError('')
    setSelectedPhoto(file)
    
    // Create preview
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

    // Validate file type
    if (file.type !== 'application/pdf') {
      setResumeError('Please select a valid PDF file')
      return
    }

    // Validate file size (20MB limit)
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

    // Validate file type
    if (file.type !== 'application/pdf') {
      setQualificationsError('Please select a valid PDF file')
      return
    }

    // Validate file size (20MB limit)
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

  const handlePanChange = (value: string) => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, pan_number: normalized }))
  }

  const handleProfileVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_PROFILE_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_PROFILE_VIDEO_TYPES)[number])) {
      setProfileVideoError('Please use MP4, WebM, or MOV (QuickTime)')
      return
    }

    if (file.size > PROFILE_VIDEO_MAX_BYTES) {
      setProfileVideoError('Video must be 20MB or smaller')
      return
    }

    setProfileVideoError('')
    setSelectedProfileVideo(file)
    setProfileVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    e.target.value = ''
  }

  const removeProfileVideo = () => {
    setProfileVideoError('')
    setSelectedProfileVideo(null)
    setProfileVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }

  const handleCourseVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_PROFILE_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_PROFILE_VIDEO_TYPES)[number])) {
      setCourseVideoError('Please use MP4, WebM, or MOV (QuickTime)')
      return
    }

    if (file.size > PROFILE_VIDEO_MAX_BYTES) {
      setCourseVideoError('Video must be 20MB or smaller')
      return
    }

    setCourseVideoError('')
    setSelectedCourseVideo(file)
    setCourseVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    e.target.value = ''
  }

  const removeCourseVideo = () => {
    setCourseVideoError('')
    setSelectedCourseVideo(null)
    setCourseVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // Validate required fields with toast messages
      if (!formData.name?.trim()) {
        toast.error('Please enter your full name')
        setSaving(false)
        return
      }

      if (!formData.bio?.trim()) {
        toast.error('Please enter your professional bio')
        setSaving(false)
        return
      }

      if (!formData.phone?.trim()) {
        toast.error('Please enter your phone number')
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
        toast.error('Please enter your hourly rate')
        setSaving(false)
        return
      }

      if (!formData.last_working_company?.trim()) {
        toast.error('Please enter your last working company')
        setSaving(false)
        return
      }

      if (!formData.current_designation?.trim()) {
        toast.error('Please enter your current designation')
        setSaving(false)
        return
      }

      if (formData.expert_types.length === 0) {
        toast.error('Please select at least one expert type')
        setSaving(false)
        return
      }

      if (!formData.experience_years || parseFloat(formData.experience_years) <= 0) {
        toast.error('Please enter your years of experience')
        setSaving(false)
        return
      }

      if (!selectedPhoto) {
        toast.error('Please upload a profile photo')
        setSaving(false)
        return
      }

      const panNormalized = formData.pan_number
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10)
      if (!panNormalized) {
        toast.error('Please enter your PAN number')
        setSaving(false)
        return
      }
      if (!PAN_REGEX.test(panNormalized)) {
        toast.error('Enter a valid 10-character PAN (e.g. ABCDE1234F)')
        setSaving(false)
        return
      }

      console.log(formData,'formData')
      

      // Create FormData for file upload
      const formDataToSend = new FormData()
      formDataToSend.append('user_id', user.id)
      formDataToSend.append('email', user.email)
      formDataToSend.append('name', formData.name)
      formDataToSend.append('bio', formData.bio)
      formDataToSend.append('phone', formData.phone)
      formDataToSend.append('qualifications', formData.qualifications)
      formDataToSend.append('domain_expertise', formData.domain_expertise)
      formDataToSend.append('subskills', JSON.stringify(formData.subskills))
      formDataToSend.append('hourly_rate', formData.hourly_rate.toString())
      formDataToSend.append('resume_url', formData.resume_url)
      formDataToSend.append('experience_years', formData.experience_years)
      formDataToSend.append('linkedin_url', formData.linkedin_url)
      formDataToSend.append('availability', JSON.stringify(formData.availability))
      formDataToSend.append('last_working_company', formData.last_working_company)
      formDataToSend.append('current_designation', formData.current_designation)
      formDataToSend.append('expert_types', JSON.stringify(formData.expert_types))
      formDataToSend.append('expert_services', JSON.stringify(formData.expert_services))
      formDataToSend.append('available_on_demand', String(formData.available_on_demand))
      formDataToSend.append('interested_in_services', String(formData.interested_in_services))
      formDataToSend.append('service_price', String(formData.service_price || ''))
      formDataToSend.append('city', formData.city || '')
      formDataToSend.append('state', formData.state || '')
      formDataToSend.append('pan_number', panNormalized)
      
      // Add the photo file
      if (selectedPhoto) {
        formDataToSend.append('profile_photo', selectedPhoto)
      }
      
      // Add resume PDF if selected
      if (selectedResume) {
        formDataToSend.append('resume', selectedResume)
      }
      
      // Add qualifications PDF if selected
      if (selectedQualifications) {
        formDataToSend.append('qualifications', selectedQualifications)
      }

      if (selectedProfileVideo) {
        formDataToSend.append('profile_video', selectedProfileVideo)
      }

      if (selectedCourseVideo) {
        formDataToSend.append('course_video', selectedCourseVideo)
      }

      const authHeaders = await getAuthHeadersForFormData()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/experts`, {
        method: 'POST',
        headers: authHeaders,
        body: formDataToSend
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create profile')
      }
      toast.success('Profile created successfully! Redirecting to dashboard...')
   
      
        router.push(`${basePath}/home`)
      
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF] relative">
      {/* Background Elements */}
      <header className="relative bg-[#008260] shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href='/'>
              <Logo size="header" />
            </Link>
            <Link href="/contact-us">
              <Button variant="ghost" className="font-medium text-white hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 text-sm">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className='container mx-auto px-4 relative z-10 flex flex-col items-start gap-y-6 mt-20'>
      <h2 className='text-[#000000] font-semibold text-[42px]'>Welcome Expert</h2>
       <div>
        <p className='text-[#000000] font-semibold text-[20px]'>Let’s complete your profile</p>
        <p className='text-base font-sans text-[#000000] font-normal'>Tell us about your expertise and start receiving project opportunities</p>
       </div>
      </div>
      <div className="container mx-auto px-4  relative z-10 mt-8 pb-10">
        {/* Header */}
        {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

        <Card className="bg-white">
        
          <CardContent>
            <form className="space-y-6">
            

              {/* Basic Information */}
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-slate-800">Basic Information</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 max-w-md">
                  <Label htmlFor="pan_number" className="text-slate-700">PAN (Permanent Account Number) *</Label>
                  <Input
                    id="pan_number"
                    placeholder="e.g. ABCDE1234F"
                    value={formData.pan_number}
                    onChange={(e) => handlePanChange(e.target.value)}
                    autoComplete="off"
                    maxLength={10}
                    className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300 uppercase font-mono tracking-wide"
                    required
                  />
                  <p className="text-xs text-slate-500">10 characters: five letters, four digits, one letter. Used for verification only.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-slate-700">City</Label>
                    <Input
                      id="city"
                      placeholder="Enter your city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-slate-700">State</Label>
                    <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                      <SelectTrigger className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-slate-700">Professional Bio *</Label>
                  <Textarea
                    id="bio"
                    placeholder="Describe your professional background, expertise, and what makes you unique..."
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualifications" className="text-slate-700">Qualifications & Certifications</Label>
                  <Textarea
                    id="qualifications"
                    placeholder="List your degrees, certifications, and relevant qualifications..."
                    value={formData.qualifications}
                    onChange={(e) => handleInputChange('qualifications', e.target.value)}
                    rows={3}
                    className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                  />
                  <p className="text-xs text-slate-500">Brief summary of your qualifications (optional)</p>
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
                  
                  {/* Qualifications PDF Preview */}
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

                  {/* Photo Upload Area */}
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
                          {/* Top row: Avatar and Remove button */}
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
                          
                          {/* Bottom row: Image information */}
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

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile_video" className="text-slate-700 flex items-center space-x-2">
                      <Video className="h-4 w-4" />
                      <span>Profile intro video (optional)</span>
                    </Label>
                    <p className="text-sm text-slate-500">Short introduction — MP4, WebM, or MOV — max 20MB (same as PDF uploads)</p>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-[#008260] transition-colors">
                    <input
                      type="file"
                      id="profile_video"
                      accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                      onChange={handleProfileVideoSelect}
                      className="hidden"
                    />
                    <label htmlFor="profile_video" className="cursor-pointer">
                      <FileText className="mx-auto h-10 w-10 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600 mb-1">
                        <span className="font-medium text-[#008260] hover:text-[#006d51]">Click to upload</span> your intro video
                      </p>
                      <p className="text-xs text-slate-500">MP4, WebM, or MOV — max 20MB</p>
                    </label>
                  </div>
                  {profileVideoPreviewUrl && selectedProfileVideo && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 w-fit">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 break-all">{selectedProfileVideo.name}</span>
                        <button
                          type="button"
                          onClick={removeProfileVideo}
                          className="text-red-500 hover:text-red-700 shrink-0"
                          aria-label="Remove video"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <video
                        src={profileVideoPreviewUrl}
                        controls
                        className="max-h-64 rounded-md bg-black"
                      />
                    </div>
                  )}
                  {profileVideoError && (
                    <Alert variant="destructive">
                      <AlertDescription>{profileVideoError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Professional Details */}
            

              {/* Availability */}
           

             
            </form>
          </CardContent>
        </Card>
        <Card className="bg-white mt-3">
         <CardContent>
         <div className="space-y-4 pt-4">
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
                        <SelectValue placeholder="Select your primary domain" />
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
                        placeholder="Select your specializations..."
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
                    <Label htmlFor="experience_years" className="text-slate-700">Years of Experience *</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      placeholder="Enter years of experience"
                      value={formData.experience_years}
                      onChange={(e) => handleInputChange('experience_years', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                      required
                      min="0"
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
                        placeholder="Enter your hourly rate"
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

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="last_working_company" className="text-slate-700">Last Working Company *</Label>
                    <Input
                      id="last_working_company"
                      placeholder="Enter your last company name"
                      value={formData.last_working_company}
                      onChange={(e) => handleInputChange('last_working_company', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
                    <Label className="text-slate-700">Expert Type *</Label>
                    <MultiSelect
                      options={EXPERT_TYPES}
                      selected={formData.expert_types}
                      onSelectionChange={(types) => setFormData(prev => ({ ...prev, expert_types: types }))}
                      placeholder="Select expert types..."
                      className="w-full min-w-0"
                    />
                  </div>

                  <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
                    <Label className="text-slate-700">Expert Services</Label>
                    <MultiSelect
                      options={EXPERT_SERVICES}
                      selected={formData.expert_services}
                      onSelectionChange={(services) => setFormData(prev => ({ ...prev, expert_services: services }))}
                      placeholder="Select expert services..."
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
                      Are you available on demand?
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-slate-400 hover:text-[#008260] cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">
                              By checking this, you agree to be available immediately when a requirement is posted and will be connected with institutions right away.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                  </div>
                </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="interested_in_services"
                          checked={formData.interested_in_services}
                          onChange={(e) => setFormData(prev => ({ ...prev, interested_in_services: e.target.checked }))}
                          className="w-4 h-4 border-slate-300 rounded text-[#008260] focus:ring-[#008260] focus:ring-offset-0"
                        />
                        <Label htmlFor="interested_in_services" className="text-slate-700 cursor-pointer">Interested in providing services and courses?</Label>
                      </div>

                      {formData.interested_in_services && (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-slate-700">Course sample video (optional)</Label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-[#008260] transition-colors">
                              <input type="file" id="course_video" accept="video/*" onChange={handleCourseVideoSelect} className="hidden" />
                              <label htmlFor="course_video" className="cursor-pointer">
                                <Video className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                                <p className="text-sm text-slate-600">Upload a short course preview (max 20MB)</p>
                              </label>
                            </div>

                            {selectedCourseVideo && (
                              <div className="mt-3 p-3 bg-[#008260]/10 border border-[#008260]/30 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Video className="h-5 w-5 text-[#008260]" />
                                    <span className="text-sm font-medium text-slate-900 break-all">{selectedCourseVideo.name}</span>
                                  </div>
                                  <button type="button" onClick={removeCourseVideo} className="text-red-500 hover:text-red-700"><X className="h-4 w-4"/></button>
                                </div>
                              </div>
                            )}

                            {courseVideoError && (
                              <Alert variant="destructive" className="mt-2"><AlertDescription>{courseVideoError}</AlertDescription></Alert>
                            )}
                          </div>

                          <div>
                            <Label className="text-slate-700">Service price (optional)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              placeholder="Enter a single numeric price (INR)"
                              value={formData.service_price}
                              onChange={(e) => setFormData(prev => ({ ...prev, service_price: e.target.value }))}
                              className="border-slate-200 focus:border-[#008260]"
                            />
                            <p className="text-xs text-slate-500">Optional: a single numeric price for your services/courses.</p>
                          </div>
                        </div>
                      )}
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
                  
                  {/* Resume Preview */}
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
         </CardContent>
        </Card>
        <div className="flex justify-end pt-6 flex-wrap gap-3">
                <Link href="/auth/login">
                  <Button variant="outline" className="bg-white rounded-md w-[150px]">
                    Back 
                  </Button>
                </Link>
                <Button
                  type="button"
                  className="bg-[#008260] hover:bg-[#006d51] text-white rounded-md w-[150px]"
                  disabled={saving}
                  onClick={handleSubmit}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
      </div>
    </div>
  )
}
