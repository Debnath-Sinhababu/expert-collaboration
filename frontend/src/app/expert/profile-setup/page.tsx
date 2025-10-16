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
import { Upload, Calendar, DollarSign, X, Camera, FileText, Download, Check, IndianRupee } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Logo from '@/components/Logo'
import { EXPERTISE_DOMAINS } from '@/lib/constants'

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
    linkedin_url: ''
  })

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoError, setPhotoError] = useState('')
  const [selectedSubskills, setSelectedSubskills] = useState<string[]>([])
  const [availableSubskills, setAvailableSubskills] = useState<string[]>([])
  
  const [selectedResume, setSelectedResume] = useState<File | null>(null)
  const [resumeError, setResumeError] = useState('')
  
  const [selectedQualifications, setSelectedQualifications] = useState<File | null>(null)
  const [qualificationsError, setQualificationsError] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [router])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDomainChange = (domain: string) => {
    setFormData(prev => ({
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

      if (!formData.domain_expertise) {
        toast.error('Please select your domain expertise')
        setSaving(false)
        return
      }

      if (formData.subskills.length === 0) {
        toast.error('Please select at least one specialization/skill')
        setSaving(false)
        return
      }

      if (!formData.hourly_rate) {
        toast.error('Please enter your hourly rate')
        setSaving(false)
        return
      }

      if (!selectedPhoto) {
        toast.error('Please upload a profile photo')
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

      // Call the API with FormData
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/experts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: formDataToSend
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create profile')
      }
      toast.success('Profile created successfully! Redirecting to dashboard...')
   
      
        router.push('/expert/home')
      
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
            <Logo size="header" />
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

                  {/* Subskills Multi-Select */}
                  {formData.domain_expertise && availableSubskills.length > 0 && (
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
                  className="bg-[#008260] rounded-md w-[150px]"
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
