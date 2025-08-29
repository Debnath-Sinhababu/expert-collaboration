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
import { GraduationCap, DollarSign, ArrowLeft, Save, Edit, User, Shield, Star, Briefcase, Calendar, Globe, Upload, Camera, X, FileText } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const EXPERTISE_DOMAINS = [
  'Computer Science & IT',
  'Engineering',
  'Business & Management',
  'Finance & Economics',
  'Healthcare & Medicine',
  'Education & Training',
  'Research & Development',
  'Marketing & Sales',
  'Data Science & Analytics',
  'Design & Creative',
  'Law & Legal',
  'Other'
]

export default function ExpertProfile() {
  const [user, setUser] = useState<any>(null)
  const [expert, setExpert] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    qualifications: '',
    domain_expertise: '',
    resume_url: '',
    hourly_rate: '',
    photo_url: '',
    experience_years: '',
    phone: '',
    linkedin_url: ''
  })

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoError, setPhotoError] = useState('')
  
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
      await loadExpertData(user.id)
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadExpertData = async (userId: string) => {
    try {
      const expertsResponse = await api.experts.getAll()
      if (expertsResponse && Array.isArray(expertsResponse)) {
        const expertProfile = expertsResponse.find((exp: any) => exp.user_id === userId)
        console.log(expertProfile,'expertProfile')
        if (expertProfile) {
          setExpert(expertProfile)
          setFormData({
            name: expertProfile.name || '',
            bio: expertProfile.bio || '',
            qualifications: expertProfile.qualifications || '',
            domain_expertise: expertProfile.domain_expertise[0] || '',
            resume_url: expertProfile.resume_url || '',
            hourly_rate: expertProfile.hourly_rate?.toString() || '',
            photo_url: expertProfile.photo_url || '',
            experience_years: expertProfile.experience_years?.toString() || '',
            phone: expertProfile.phone || '',
            linkedin_url: expertProfile.linkedin_url || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading expert data:', error)
    }
  }

  console.log(formData,'formData')

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
      if (!formData.name || !formData.bio || !formData.domain_expertise || !formData.hourly_rate) {
        throw new Error('Please fill in all required fields')
      }

      if (expert?.id) {
        // Update existing profile
        if (selectedPhoto || selectedResume || selectedQualifications) {
          // Handle file uploads for update
          console.log(formData,'formData')
          const formDataToSend = new FormData()
          formDataToSend.append('name', formData.name)
          formDataToSend.append('bio', formData.bio)
          formDataToSend.append('phone', formData.phone)
          formDataToSend.append('qualifications', formData.qualifications)
          formDataToSend.append('hourly_rate', formData.hourly_rate.toString())
          formDataToSend.append('experience_years', formData.experience_years)
          formDataToSend.append('linkedin_url', formData.linkedin_url)
          formDataToSend.append('domain_expertise', formData.domain_expertise)

          // Add the photo file if selected
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
          // No photo change, use regular API
          const expertData = {
            ...formData,
            domain_expertise: formData.domain_expertise,
            hourly_rate: parseFloat(formData.hourly_rate),
            experience_years: parseInt(formData.experience_years) || 0,
            updated_at: new Date().toISOString(),
            qualifications: ''
          }
          await api.experts.update(expert.id, expertData)
        }
        
        setSuccess('Profile updated successfully!')
      } else {
        // Create new profile
        if (!selectedPhoto) {
          throw new Error('Profile photo is required for new profiles')
        }

        const formDataToSend = new FormData()
        formDataToSend.append('user_id', user.id)
        formDataToSend.append('email', user.email)
        formDataToSend.append('name', formData.name)
        formDataToSend.append('bio', formData.bio)
        formDataToSend.append('phone', formData.phone)
        formDataToSend.append('qualifications', formData.qualifications)
        formDataToSend.append('domain_expertise', formData.domain_expertise)
        formDataToSend.append('hourly_rate', formData.hourly_rate.toString())
        formDataToSend.append('experience_years', formData.experience_years)
        formDataToSend.append('linkedin_url', formData.linkedin_url)
        
        // Add the photo file
        formDataToSend.append('profile_photo', selectedPhoto)
        
        // Add resume PDF if selected
        if (selectedResume) {
          formDataToSend.append('resume', selectedResume)
        }
        
        // Add qualifications PDF if selected
        if (selectedQualifications) {
          formDataToSend.append('qualifications', selectedQualifications)
        }

        // Call the API with FormData
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/experts`, {
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

        setSuccess('Profile created successfully!')
      }
      
      await loadExpertData(user.id)
      setEditing(false)
      setSelectedPhoto(null)
      setPhotoPreview('')
      setSelectedResume(null)
      setSelectedQualifications(null)
      
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 relative py-8">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/expert/dashboard" className="inline-flex items-center space-x-2 text-slate-300 hover:text-white transition-colors duration-300">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="text-center">
            <Link href="/" className="inline-flex items-center space-x-2 mb-4 group">
              <GraduationCap className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Calxmap</span>
            </Link>
          </div>
          
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">Expert Profile</h1>
          <p className="text-xl text-slate-300">
            Manage your professional profile and showcase your expertise
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Summary Card */}
          <div className="lg:col-span-1">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15)'}}>
              <CardContent className="p-6 text-center">
                <div className="mb-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-blue-200">
                      <AvatarImage src={expert?.photo_url} />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                        {expert?.name?.charAt(0) || user?.email?.charAt(0) || 'E'}
                      </AvatarFallback>
                    </Avatar>
                    {editing && (
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                        <Camera className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{expert?.name || 'Expert User'}</h2>
                  <p className="text-slate-600 mb-4">{expert?.domain_expertise || 'Domain Expert'}</p>
                  
                  {/* Status Badges */}
                  <div className="flex justify-center space-x-2 mb-4">
                    <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 rounded-full">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">
                        {expert?.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 px-3 py-1 bg-blue-100 rounded-full">
                      <Star className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700 font-medium">
                        {expert?.rating || 0}/5
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-slate-600">Hourly Rate</span>
                    </div>
                    <span className="font-bold text-slate-900">₹{expert?.hourly_rate || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span className="text-slate-600">Experience</span>
                    </div>
                    <span className="font-bold text-slate-900">{expert?.experience_years || 0} years</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Briefcase className="h-5 w-5 text-purple-600" />
                      <span className="text-slate-600">Projects</span>
                    </div>
                    <span className="font-bold text-slate-900">{expert?.total_projects || 0}</span>
                  </div>
                </div>

                <Button
                  onClick={() => setEditing(!editing)}
                  className="w-full mt-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 border-2 border-blue-400/20 hover:border-blue-400/40"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {editing ? 'Cancel Editing' : 'Edit Profile'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form Card */}
          <div className="lg:col-span-2">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15)'}}>
              <CardHeader>
                <CardTitle className="text-slate-900">Profile Information</CardTitle>
                <CardDescription className="text-slate-600">
                  {editing ? 'Update your profile information and photo below' : 'Your current profile information'}
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
                      <User className="h-5 w-5 text-blue-500" />
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
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          required
                          disabled={!editing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-slate-700">Phone Number</Label>
                        <Input
                          id="phone"
                          placeholder="Enter your phone number"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          disabled={!editing}
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
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                        required
                        disabled={!editing}
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
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                        disabled={!editing}
                      />
                      <p className="text-xs text-slate-500">Brief summary of your qualifications (optional)</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="qualifications_pdf" className="text-slate-700">Qualifications Documents (PDF)</Label>
                      {editing ? (
                        <>
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
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
                                <span className="font-medium text-blue-600 hover:text-blue-500">
                                  Click to upload
                                </span>{' '}
                                or drag and drop
                              </p>
                              <p className="text-xs text-slate-500">PDF files only, max 20MB (optional)</p>
                            </label>
                          </div>
                          
                          {/* Qualifications PDF Preview */}
                          {selectedQualifications && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-5 w-5 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-900">
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
                        </>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {expert?.qualifications_url ? (
                            <>
                              <FileText className="h-5 w-5 text-blue-600" />
                              <a
                                href={expert.qualifications_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                View Qualifications
                              </a>
                            </>
                          ) : (
                            <span className="text-slate-500 text-sm">No qualifications document uploaded</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Profile Photo Upload */}
                    {editing && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="profile_photo" className="text-slate-700 flex items-center space-x-2">
                            <Camera className="h-5 w-5 text-blue-500" />
                            <span>Update Profile Photo</span>
                          </Label>
                          <p className="text-sm text-slate-500">Upload a new professional photo (JPEG, PNG, or WebP, max 5MB)</p>
                        </div>

                        {/* Photo Upload Area */}
                        <div className="space-y-4">
                          {!photoPreview ? (
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors duration-300">
                              <input
                                type="file"
                                id="profile_photo"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={handlePhotoSelect}
                                className="hidden"
                              />
                              <label htmlFor="profile_photo" className="cursor-pointer">
                                <div className="space-y-3">
                                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                    <Upload className="h-8 w-8 text-slate-400" />
                                  </div>
                                  <div>
                                    <p className="text-slate-600 font-medium">Click to upload new photo</p>
                                    <p className="text-sm text-slate-500">or drag and drop</p>
                                  </div>
                                </div>
                              </label>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <Avatar className="w-20 h-20 border-4 border-blue-200">
                                  <AvatarImage src={photoPreview} />
                                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                    {formData.name?.charAt(0) || 'E'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="text-sm text-slate-600 font-medium">New photo selected</p>
                                  <p className="text-xs text-slate-500">{selectedPhoto?.name}</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={removePhoto}
                                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition-all duration-300"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
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
                    )}
                  </div>

                  {/* Professional Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                      <Briefcase className="h-5 w-5 text-indigo-500" />
                      <span>Professional Details</span>
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="domain_expertise" className="text-slate-700">Domain Expertise *</Label>
                        <Select value={formData.domain_expertise} onValueChange={(value) => handleInputChange('domain_expertise', value)} disabled={!editing}>
                          <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300">
                            <SelectValue placeholder="Select your primary domain" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPERTISE_DOMAINS.map((domain) => (
                              <SelectItem key={domain} value={domain}>
                                {domain}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="experience_years" className="text-slate-700">Years of Experience</Label>
                        <Input
                          id="experience_years"
                          type="number"
                          placeholder="Enter years of experience"
                          value={formData.experience_years}
                          onChange={(e) => handleInputChange('experience_years', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hourly_rate" className="text-slate-700">Hourly Rate (₹) *</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="hourly_rate"
                            type="number"
                            placeholder="Enter your hourly rate"
                            value={formData.hourly_rate}
                            onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                            className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                            required
                            disabled={!editing}
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
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="resume" className="text-slate-700">Resume/CV (PDF)</Label>
                      {editing ? (
                        <>
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
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
                                <span className="font-medium text-blue-600 hover:text-blue-500">
                                  Click to upload
                                </span>{' '}
                                or drag and drop
                              </p>
                              <p className="text-xs text-slate-500">PDF files only, max 20MB</p>
                            </label>
                          </div>
                          
                          {/* Resume Preview */}
                          {selectedResume && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-5 w-5 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-900">
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
                        </>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {expert?.resume_url ? (
                            <>
                              <FileText className="h-5 w-5 text-blue-600" />
                              <a
                                href={expert.resume_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                View Resume
                              </a>
                            </>
                          ) : (
                            <span className="text-slate-500 text-sm">No resume uploaded</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {editing && (
                    <div className="flex justify-end pt-6">
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 border-2 border-blue-400/20 hover:border-blue-400/40"
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
