'use client'

import { useState, useEffect, useRef } from 'react'
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
import { ArrowLeft, Save, User, Briefcase, Upload, Camera, X, FileText, IndianRupee, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MultiSelect } from '@/components/ui/multi-select'
import { EXPERTISE_DOMAINS } from '@/lib/constants'
import Logo from '@/components/Logo'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'

export default function ExpertProfileEdit() {
  const [user, setUser] = useState<any>(null)
  const [expert, setExpert] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    qualifications: '',
    domain_expertise: '',
    subskills: [] as string[],
    resume_url: '',
    hourly_rate: '',
    photo_url: '',
    experience_years: '',
    phone: '',
    linkedin_url: '',
    last_working_company: '',
    expert_types: [] as string[],
    available_on_demand: false
  })

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoError, setPhotoError] = useState('')
  
  const [selectedResume, setSelectedResume] = useState<File | null>(null)
  const [resumeError, setResumeError] = useState('')
  
  const [selectedQualifications, setSelectedQualifications] = useState<File | null>(null)
  const [qualificationsError, setQualificationsError] = useState('')
  
  const [selectedSubskills, setSelectedSubskills] = useState<string[]>([])
  const [availableSubskills, setAvailableSubskills] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      await loadExpertData(user.id)
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadExpertData = async (userId: string) => {
    try {
      const expertProfile = await api.experts.getByUserId(userId)
      
      if (expertProfile) {
        setExpert(expertProfile)
        setFormData({
          name: expertProfile.name || '',
          bio: expertProfile.bio || '',
          qualifications: expertProfile.qualifications || '',
          domain_expertise: expertProfile.domain_expertise?.[0] || '',
          subskills: expertProfile.subskills || [],
          resume_url: expertProfile.resume_url || '',
          hourly_rate: expertProfile.hourly_rate?.toString() || '',
          photo_url: expertProfile.photo_url || '',
          experience_years: expertProfile.experience_years?.toString() || '',
          phone: expertProfile.phone || '',
          linkedin_url: expertProfile.linkedin_url || '',
          last_working_company: expertProfile.last_working_company || '',
          expert_types: expertProfile.expert_types || [],
          available_on_demand: expertProfile.available_on_demand || false
        })
        
        setSelectedSubskills(expertProfile.subskills || [])
        
        if (expertProfile.domain_expertise && expertProfile.domain_expertise[0]) {
          const selectedDomain = EXPERTISE_DOMAINS.find(d => d.name === expertProfile.domain_expertise[0])
          if (selectedDomain) {
            setAvailableSubskills([...selectedDomain.subskills])
          }
        }
      }
    } catch (error) {
      console.error('Error loading expert data:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDomainChange = (domain: string) => {
    setFormData(prev => ({
      ...prev,
      domain_expertise: domain,
      subskills: []
    }))
    
    const selectedDomain = EXPERTISE_DOMAINS.find(d => d.name === domain)
    if (selectedDomain) {
      setAvailableSubskills([...selectedDomain.subskills])
    } else {
      setAvailableSubskills([])
    }
    
    setSelectedSubskills([])
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
      if (!formData.name || !formData.bio || !formData.domain_expertise || !formData.hourly_rate) {
        throw new Error('Please fill in all required fields')
      }

      if (!formData.last_working_company?.trim()) {
        throw new Error('Please enter your last working company')
      }

      if (formData.expert_types.length === 0) {
        throw new Error('Please select at least one expert type')
      }

      if (!expert?.id) {
        throw new Error('Expert profile not found')
      }

      if (selectedPhoto || selectedResume || selectedQualifications) {
        const formDataToSend = new FormData()
        formDataToSend.append('name', formData.name)
        formDataToSend.append('bio', formData.bio)
        formDataToSend.append('phone', formData.phone)
        formDataToSend.append('qualifications', formData.qualifications)
        formDataToSend.append('hourly_rate', formData.hourly_rate.toString())
        formDataToSend.append('experience_years', formData.experience_years)
        formDataToSend.append('linkedin_url', formData.linkedin_url)
        formDataToSend.append('domain_expertise', formData.domain_expertise)
        formDataToSend.append('subskills', JSON.stringify(formData.subskills))
        formDataToSend.append('last_working_company', formData.last_working_company)
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

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/experts/${expert.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: formDataToSend
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update profile')
        }
      } else {
        const expertData = {
          ...formData,
          domain_expertise: formData.domain_expertise,
          subskills: formData.subskills,
          hourly_rate: parseFloat(formData.hourly_rate),
          experience_years: parseInt(formData.experience_years) || 0,
          updated_at: new Date().toISOString(),
        }
        await api.experts.update(expert.id, expertData)
      }
      
      setSuccess('Profile updated successfully!')
      setTimeout(() => {
        router.push('/expert/profile')
      }, 1500)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] border-b border-slate-200/20 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/expert/home" className="flex items-center group">
              <Logo size="header" />
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/expert/home" className="text-white font-medium transition-colors duration-200 relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
              <Link href="/expert/dashboard" className="text-white/80 hover:text-white font-medium transition-colors duration-200 relative group">
                Dashboard
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200">
                <NotificationBell />
              </div>
              <ProfileDropdown 
                user={user} 
                expert={expert} 
                userType="expert" 
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-6xl py-8">
        <div className="mb-6">
          <Link href="/expert/profile" className="inline-flex items-center text-[#008260] hover:text-[#006b4f] transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Link>
        </div>

        <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Edit Profile</CardTitle>
            <CardDescription className="text-slate-600">
              Update your profile information and documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 bg-green-50/90 backdrop-blur-sm border-green-200">
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                  <User className="h-5 w-5 text-[#008260]" />
                  <span>Basic Information</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] transition-all duration-300"
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
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] transition-all duration-300"
                      required
                    />
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
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center transition-all duration-300 hover:border-[#008260]">
                    <input
                      type="file"
                      id="qualifications_pdf"
                      accept=".pdf"
                      onChange={handleQualificationsSelect}
                      className="hidden"
                    />
                    <label htmlFor="qualifications_pdf" className="cursor-pointer">
                      <FileText className="mx-auto h-12 w-12 text-[#008260] mb-4" />
                      <p className="text-sm text-slate-600 mb-2">
                        <span className="font-medium text-[#008260]">
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">PDF files only, max 20MB (optional)</p>
                    </label>
                  </div>
                  
                  {selectedQualifications && (
                    <div className="mt-3 p-3 bg-[#ECF2FF] border border-[#008260] rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-[#008260]" />
                          <span className="text-sm font-medium text-[#008260] break-all">
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

                  {expert?.qualifications_url && !selectedQualifications && (
                    <div className="mt-2 flex items-center space-x-2 text-sm text-slate-600">
                      <FileText className="h-4 w-4 text-[#008260]" />
                      <span>Current file uploaded</span>
                    </div>
                  )}
                </div>

                {/* Profile Photo Upload */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile_photo" className="text-slate-700 flex items-center space-x-2">
                      <Camera className="h-5 w-5 text-[#008260]" />
                      <span>Profile Photo</span>
                    </Label>
                    <p className="text-sm text-slate-500">Upload a professional photo (JPEG, PNG, or WebP, max 5MB)</p>
                  </div>

                  <div className="space-y-4">
                    {selectedPhoto ? (
                      // Show preview when a new photo is selected
                      <div className="relative">
                        <div className="p-4 bg-[#ECF2FF] rounded-lg border border-slate-200 overflow-hidden">
                          <div className="flex items-center justify-between mb-3">
                            <Avatar className="w-20 h-20 border-4 border-[#008260] flex-shrink-0">
                              <AvatarImage src={photoPreview} />
                              <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
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
                            <p className="text-sm text-slate-600 font-medium">New photo selected</p>
                            <p className="text-xs text-slate-500 break-all">{selectedPhoto.name}</p>
                          </div>
                        </div>
                      </div>
                    ) : expert?.photo_url ? (
                      // Show current photo with option to change
                      <div className="relative">
                        <div className="p-4 bg-[#ECF2FF] rounded-lg border border-slate-200 overflow-hidden">
                          <div className="flex items-center justify-between mb-3">
                            <Avatar className="w-20 h-20 border-4 border-[#008260] flex-shrink-0">
                              <AvatarImage src={expert.photo_url} />
                              <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                {formData.name?.charAt(0) || 'E'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex gap-2">
                              <input
                                ref={fileInputRef}
                                type="file"
                                id="profile_photo_change"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handlePhotoSelect}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="border-[#008260] text-[#008260] hover:bg-[#ECF2FF] transition-all duration-300 px-3 py-1 h-8 text-xs flex-shrink-0"
                              >
                                Change
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-center sm:text-left w-full min-w-0">
                            <p className="text-sm text-slate-600 font-medium">Current photo</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Show upload area when no photo exists
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center hover:border-[#008260] transition-colors">
                        <input
                          type="file"
                          id="profile_photo"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                        <label htmlFor="profile_photo" className="cursor-pointer">
                          <div className="space-y-3">
                            <div className="mx-auto w-16 h-16 bg-[#ECF2FF] rounded-full flex items-center justify-center">
                              <Upload className="h-8 w-8 text-[#008260]" />
                            </div>
                            <div>
                              <p className="text-[#008260] font-medium">Click to upload <span className='text-slate-600'>new photo</span></p>
                              <p className="text-sm text-slate-500">or drag and drop</p>
                            </div>
                          </div>
                        </label>
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
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-[#008260]" />
                  <span>Professional Details</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain_expertise" className="text-slate-700">Domain Expertise *</Label>
                    <Select value={formData.domain_expertise} onValueChange={handleDomainChange}>
                      <SelectTrigger className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] focus:shadow-lg focus:shadow-[#008260]/20 transition-all duration-300">
                        <SelectValue placeholder="Select your primary domain" />
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

                  {formData.domain_expertise && availableSubskills.length > 0 && (
                    <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
                      <Label className="text-slate-700">Specializations & Skills *</Label>
                      <MultiSelect
                        options={availableSubskills}
                        selected={selectedSubskills}
                        onSelectionChange={handleSubskillChange}
                        placeholder="Select your specializations..."
                        className="w-full"
                      />
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
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate" className="text-slate-700">Hourly Rate (₹) *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
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
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="last_working_company" className="text-slate-700">Last Working Company *</Label>
                    <Input
                      id="last_working_company"
                      placeholder="Enter your last company name"
                      value={formData.last_working_company}
                      onChange={(e) => handleInputChange('last_working_company', e.target.value)}
                      className="border-slate-200 focus:border-[#008260] focus:ring-[#008260] transition-all duration-300"
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
                  <Label htmlFor="resume" className="text-slate-700">Resume/CV (PDF)</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-6 text-center transition-all duration-300 hover:border-[#008260]">
                    <input
                      type="file"
                      id="resume"
                      accept=".pdf"
                      onChange={handleResumeSelect}
                      className="hidden"
                    />
                    <label htmlFor="resume" className="cursor-pointer">
                      <FileText className="mx-auto h-12 w-12 text-[#008260] mb-4" />
                      <p className="text-sm text-slate-600 mb-2">
                        <span className="font-medium text-[#008260]">
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">PDF files only, max 20MB</p>
                    </label>
                  </div>
                  
                  {selectedResume && (
                    <div className="mt-3 p-3 bg-[#ECF2FF] border border-[#008260] rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-[#008260]" />
                          <span className="text-sm font-medium text-[#008260] break-all">
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

                  {expert?.resume_url && !selectedResume && (
                    <div className="mt-2 flex items-center space-x-2 text-sm text-slate-600">
                      <FileText className="h-4 w-4 text-[#008260]" />
                      <span>Current resume uploaded</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Link href="/expert/profile">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="bg-[#008260] hover:bg-[#006d51] text-white rounded-md px-6"
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

