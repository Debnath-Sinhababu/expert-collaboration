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
import { GraduationCap, Building, Globe, MapPin, ArrowLeft, Save, Edit, Users, Shield, Star, Calendar, Award } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const INSTITUTION_TYPES = [
  'University',
  'College',
  'Research Institute',
  'Technical Institute',
  'Business School',
  'Medical College',
  'Engineering College',
  'Arts & Science College',
  'Community College',
  'Training Institute',
  'Other'
]

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]

export default function InstitutionProfile() {
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    website_url: '',
    logo_url: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_person: '',
    email: '',
    phone: '',
    established_year: '',
    accreditation: '',
    student_count: ''
  })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      await loadInstitutionData(user.id)
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadInstitutionData = async (userId: string) => {
    try {
      const institutionsResponse = await api.institutions.getAll()
      if (institutionsResponse && Array.isArray(institutionsResponse)) {
        const institutionProfile = institutionsResponse.find((inst: any) => inst.user_id === userId)
        if (institutionProfile) {
          setInstitution(institutionProfile)
          setFormData({
            name: institutionProfile.name || '',
            type: institutionProfile.type || '',
            description: institutionProfile.description || '',
            website_url: institutionProfile.website_url || '',
            logo_url: institutionProfile.logo_url || '',
            address: institutionProfile.address || '',
            city: institutionProfile.city || '',
            state: institutionProfile.state || '',
            pincode: institutionProfile.pincode || '',
            contact_person: institutionProfile.contact_person || '',
            email: institutionProfile.email || '',
            phone: institutionProfile.phone || '',
            established_year: institutionProfile.established_year?.toString() || '',
            accreditation: institutionProfile.accreditation || '',
            student_count: institutionProfile.student_count?.toString() || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading institution data:', error)
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
      if (!formData.name || !formData.type || !formData.description || !formData.contact_person) {
        throw new Error('Please fill in all required fields')
      }

      const institutionData = {
        ...formData,
        established_year: parseInt(formData.established_year) || null,
        student_count: parseInt(formData.student_count) || null,
        updated_at: new Date().toISOString()
      }

      if (institution?.id) {
        await api.institutions.update(institution.id, institutionData)
        setSuccess('Profile updated successfully!')
      } else {
        await api.institutions.create({
          ...institutionData,
          user_id: user.id,
          email: user.email,
          created_at: new Date().toISOString()
        })
        setSuccess('Profile created successfully!')
      }
      
      await loadInstitutionData(user.id)
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
          <Link href="/institution/dashboard" className="inline-flex items-center space-x-2 text-slate-300 hover:text-white transition-colors duration-300">
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">Institution Profile</h1>
          <p className="text-xl text-slate-300">
            Manage your institution profile and showcase your academic excellence
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Summary Card */}
          <div className="lg:col-span-1">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15)'}}>
              <CardContent className="p-6 text-center">
                <div className="mb-6">
                  <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-blue-200">
                    <AvatarImage src={institution?.logo_url} />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                      {institution?.name?.charAt(0) || user?.email?.charAt(0) || 'I'}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{institution?.name || 'Institution'}</h2>
                  <p className="text-slate-600 mb-4">{institution?.type || 'Educational Institution'}</p>
                  
                  {/* Status Badges */}
                  <div className="flex justify-center space-x-2 mb-4">
                    <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 rounded-full">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">Active</span>
                    </div>
                    <div className="flex items-center space-x-1 px-3 py-1 bg-blue-100 rounded-full">
                      <Award className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700 font-medium">
                        {institution?.accreditation || 'Standard'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <span className="text-slate-600">Established</span>
                    </div>
                    <span className="font-bold text-slate-900">{institution?.established_year || 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="text-slate-600">Students</span>
                    </div>
                    <span className="font-bold text-slate-900">{institution?.student_count || 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-purple-600" />
                      <span className="text-slate-600">Location</span>
                    </div>
                    <span className="font-bold text-slate-900">{institution?.city || 'N/A'}</span>
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
                <CardTitle className="text-slate-900">Institution Information</CardTitle>
                <CardDescription className="text-slate-600">
                  {editing ? 'Update your institution information below' : 'Your current institution information'}
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
                      <Building className="h-5 w-5 text-blue-500" />
                      <span>Basic Information</span>
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-slate-700">Institution Name *</Label>
                        <Input
                          id="name"
                          placeholder="Enter institution name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          required
                          disabled={!editing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="type" className="text-slate-700">Institution Type *</Label>
                        <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)} disabled={!editing}>
                          <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300">
                            <SelectValue placeholder="Select institution type" />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTITUTION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-slate-700">Institution Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your institution, its mission, and academic focus..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                        required
                        disabled={!editing}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="website_url" className="text-slate-700">Website URL</Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            id="website_url"
                            placeholder="https://www.yourinstitution.edu"
                            value={formData.website_url}
                            onChange={(e) => handleInputChange('website_url', e.target.value)}
                            className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                            disabled={!editing}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="established_year" className="text-slate-700">Established Year</Label>
                        <Input
                          id="established_year"
                          type="number"
                          placeholder="e.g., 1990"
                          value={formData.established_year}
                          onChange={(e) => handleInputChange('established_year', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-indigo-500" />
                      <span>Location Information</span>
                    </h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-slate-700">Address</Label>
                      <Textarea
                        id="address"
                        placeholder="Enter complete address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={3}
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                        disabled={!editing}
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-slate-700">City</Label>
                        <Input
                          id="city"
                          placeholder="Enter city"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-slate-700">State</Label>
                        <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)} disabled={!editing}>
                          <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300">
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

                      <div className="space-y-2">
                        <Label htmlFor="pincode" className="text-slate-700">Pincode</Label>
                        <Input
                          id="pincode"
                          placeholder="Enter pincode"
                          value={formData.pincode}
                          onChange={(e) => handleInputChange('pincode', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                      <Users className="h-5 w-5 text-green-500" />
                      <span>Contact Information</span>
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact_person" className="text-slate-700">Contact Person *</Label>
                        <Input
                          id="contact_person"
                          placeholder="Name of primary contact person"
                          value={formData.contact_person}
                          onChange={(e) => handleInputChange('contact_person', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          required
                          disabled={!editing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-slate-700">Contact Phone *</Label>
                        <Input
                          id="phone"
                          placeholder="Enter contact phone number"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          disabled={!editing}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700">Contact Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter contact email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                        disabled={!editing}
                      />
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                      <Award className="h-5 w-5 text-purple-500" />
                      <span>Additional Information</span>
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accreditation" className="text-slate-700">Accreditation</Label>
                        <Input
                          id="accreditation"
                          placeholder="e.g., NAAC A+, NBA, UGC"
                          value={formData.accreditation}
                          onChange={(e) => handleInputChange('accreditation', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="student_count" className="text-slate-700">Student Count</Label>
                        <Input
                          id="student_count"
                          type="number"
                          placeholder="Approximate number of students"
                          value={formData.student_count}
                          onChange={(e) => handleInputChange('student_count', e.target.value)}
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logo_url" className="text-slate-700">Logo URL</Label>
                      <Input
                        id="logo_url"
                        placeholder="Link to your institution logo"
                        value={formData.logo_url}
                        onChange={(e) => handleInputChange('logo_url', e.target.value)}
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
