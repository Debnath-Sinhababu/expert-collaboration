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
import { GraduationCap, Upload, Calendar, DollarSign } from 'lucide-react'
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
    resume_url: '',
    hourly_rate: '',
    photo_url: '',
    availability: [] as string[],
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
      setLoading(false)
    }

    getUser()
  }, [router])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAvailabilityChange = (slot: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      availability: checked
        ? [...prev.availability, slot]
        : prev.availability.filter(s => s !== slot)
    }))
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
        user_id: user.id,
        email: user.email,
        hourly_rate: parseFloat(formData.hourly_rate),
        experience_years: parseInt(formData.experience_years) || 0,
        availability: formData.availability,
        created_at: new Date().toISOString(),
        verified: false,
        rating: 0,
        total_projects: 0
      }

      await api.experts.create(expertData)
      setSuccess('Profile created successfully! Redirecting to dashboard...')
      
      setTimeout(() => {
        router.push('/expert/dashboard')
      }, 2000)
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
          <p className="text-slate-300">Loading profile setup...</p>
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
      
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4 group">
            <GraduationCap className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">Calxmap</span>
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">Complete Your Expert Profile</h1>
          <p className="text-xl text-slate-300">
            Tell us about your expertise and start receiving project opportunities
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15)'}}>
          <CardHeader>
            <CardTitle className="text-slate-900">Expert Profile Setup</CardTitle>
            <CardDescription className="text-slate-600">
              Complete your profile to start connecting with universities and institutions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Basic Information</h3>
                
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
                  />
                </div>
              </div>

              {/* Professional Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Professional Details</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain_expertise" className="text-slate-700">Domain Expertise *</Label>
                    <Select value={formData.domain_expertise} onValueChange={(value) => handleInputChange('domain_expertise', value)}>
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
                  />
                </div>
              </div>

              {/* Availability */}
           

              <div className="flex justify-between pt-6">
                <Link href="/auth/login">
                  <Button variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700 transition-all duration-300">
                    Back to Login
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 border-2 border-blue-400/20 hover:border-blue-400/40"
                  disabled={saving}
                >
                  {saving ? 'Creating Profile...' : 'Complete Profile Setup'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
