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
import { GraduationCap, DollarSign, ArrowLeft, Save, Edit, User, Shield, Star, Briefcase, Calendar, Globe } from 'lucide-react'
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
        if (expertProfile) {
          setExpert(expertProfile)
          setFormData({
            name: expertProfile.name || '',
            bio: expertProfile.bio || '',
            qualifications: expertProfile.qualifications || '',
            domain_expertise: expertProfile.domain_expertise || '',
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!formData.name || !formData.bio || !formData.domain_expertise || !formData.hourly_rate) {
        throw new Error('Please fill in all required fields')
      }

      const expertData = {
        ...formData,
        hourly_rate: parseFloat(formData.hourly_rate),
        experience_years: parseInt(formData.experience_years) || 0,
        updated_at: new Date().toISOString()
      }

      if (expert?.id) {
        await api.experts.update(expert.id, expertData)
        setSuccess('Profile updated successfully!')
      } else {
        await api.experts.create({
          ...expertData,
          user_id: user.id,
          email: user.email,
          created_at: new Date().toISOString(),
          verified: false,
          rating: 0,
          total_projects: 0
        })
        setSuccess('Profile created successfully!')
      }
      
      await loadExpertData(user.id)
      setEditing(false)
      
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
                  <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-blue-200">
                    <AvatarImage src={expert?.photo_url} />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                      {expert?.name?.charAt(0) || user?.email?.charAt(0) || 'E'}
                    </AvatarFallback>
                  </Avatar>
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
                  {editing ? 'Update your profile information below' : 'Your current profile information'}
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
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                        disabled={!editing}
                      />
                    </div>
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
                      <Label htmlFor="resume_url" className="text-slate-700">Resume/CV Link</Label>
                      <Input
                        id="resume_url"
                        placeholder="Link to your resume or CV (Google Drive, Dropbox, etc.)"
                        value={formData.resume_url}
                        onChange={(e) => handleInputChange('resume_url', e.target.value)}
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                        disabled={!editing}
                      />
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
