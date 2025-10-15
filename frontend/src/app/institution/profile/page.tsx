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
import { toast } from 'sonner'
import Logo from '@/components/Logo'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'

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
  'Corporate',
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
    student_count: '',
    // Corporate specific
    gstin: '',
    pan: '',
    cin: '',
    industry: '',
    company_size: '',
    requires_po: 'false',
    nda_required: 'false',
    preferred_engagements: '',
    work_mode_preference: ''
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
      const institutionProfile = await api.institutions.getByUserId(userId)
      
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
            student_count: institutionProfile.student_count?.toString() || '',
            gstin: institutionProfile.gstin || '',
            pan: institutionProfile.pan || '',
            cin: institutionProfile.cin || '',
            industry: institutionProfile.industry || '',
            company_size: institutionProfile.company_size || '',
            requires_po: (institutionProfile.requires_po ? 'true' : 'false'),
            nda_required: (institutionProfile.nda_required ? 'true' : 'false'),
            preferred_engagements: Array.isArray(institutionProfile.preferred_engagements) ? institutionProfile.preferred_engagements.join(', ') : (institutionProfile.preferred_engagements || ''),
            work_mode_preference: institutionProfile.work_mode_preference || ''
          })
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
      // Validate required fields with toast messages
      if (!formData.name?.trim()) {
        toast.error('Please enter institution name')
        setSaving(false)
        return
      }

      if (!formData.type) {
        toast.error('Please select institution type')
        setSaving(false)
        return
      }

      if (!formData.description?.trim()) {
        toast.error('Please enter institution description')
        setSaving(false)
        return
      }

      if (!formData.contact_person?.trim()) {
        toast.error('Please enter contact person name')
        setSaving(false)
        return
      }

      // Corporate-specific required checks when editing
      if (formData.type === 'Corporate') {
        if (!formData.industry?.trim()) {
          toast.error('Please enter industry')
          setSaving(false)
          return
        }
        if (!formData.company_size) {
          toast.error('Please select company size')
          setSaving(false)
          return
        }
        if (!formData.gstin?.trim()) {
          toast.error('Please enter GSTIN')
          setSaving(false)
          return
        }
        if (!formData.pan?.trim()) {
          toast.error('Please enter PAN')
          setSaving(false)
          return
        }
        if (!formData.cin?.trim()) {
          toast.error('Please enter CIN')
          setSaving(false)
          return
        }
        // Format validations for GSTIN, PAN, CIN
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
        const cinRegex = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/

        if (!gstRegex.test(formData.gstin)) {
          toast.error('Please enter a valid GSTIN (15 characters)')
          setSaving(false)
          return
        }
        if (!panRegex.test(formData.pan)) {
          toast.error('Please enter a valid PAN (e.g., ABCDE1234F)')
          setSaving(false)
          return
        }
        if (!cinRegex.test(formData.cin)) {
          toast.error('Please enter a valid CIN (21 characters)')
          setSaving(false)
          return
        }

      
      }

      const institutionData = {
        ...formData,
        established_year: parseInt(formData.established_year) || null,
        student_count: parseInt(formData.student_count) || null,
        updated_at: new Date().toISOString()
      }

      if (institution?.id) {
        await api.institutions.update(institution.id, {
          ...formData,
          requires_po: formData.requires_po === 'true',
          nda_required: formData.nda_required === 'true',
          preferred_engagements: formData.preferred_engagements
            ? formData.preferred_engagements.split(',').map((s: string) => s.trim()).filter(Boolean)
            : []
        })
        toast.success('Profile updated successfully!')
      } else {
        await api.institutions.create({
          ...formData,
          requires_po: formData.requires_po === 'true',
          nda_required: formData.nda_required === 'true',
          preferred_engagements: formData.preferred_engagements
            ? formData.preferred_engagements.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          user_id: user.id,
          email: user.email,
          created_at: new Date().toISOString()
        })
        toast.success('Profile created successfully!')
      }
      
      await loadInstitutionData(user.id)
      setEditing(false)
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-[#008260] border-b border-white/10 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/institution/home" className="flex items-center group">
              <Logo size="header" />
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/institution/home" className="text-white/80 hover:text-white font-medium transition-colors duration-200 relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
              <Link href="/institution/dashboard" className="text-white/80 hover:text-white font-medium transition-colors duration-200 relative group">
                Dashboard
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
            
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <ProfileDropdown 
                user={user} 
                institution={institution} 
                userType="institution" 
              />
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl py-6 sm:py-8">
        {/* Page Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-[#000000] mb-4 sm:mb-6">Profile</h1>

        {/* Profile Header - Centered */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-lg">
              <AvatarImage src={institution?.logo_url} />
              <AvatarFallback className="text-3xl sm:text-4xl font-bold bg-[#C8E6F5] text-[#008260]">
                {institution?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'I'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-[#000000] mb-1 text-center px-4">
            {institution?.name || 'Institution'}
          </h2>
          
          <p className="text-sm sm:text-base text-[#6A6A6A] mb-3 text-center">
            {institution?.type || 'Educational Institution'}
          </p>
          
          {/* Verified Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 bg-[#8FFFA7] rounded-full border border-[#008260]">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#008260] flex items-center justify-center">
              <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
            </div>
            <span className="text-[11px] sm:text-[12px] text-[#008260] font-medium">Verified</span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="bg-white border border-[#DCDCDC] rounded-lg shadow-sm mb-8">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Responsive Grid - Stack on mobile, 2 columns on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* ABOUT Section */}
              <div>
                <h3 className="text-xs font-semibold text-[#6A6A6A] uppercase tracking-wider mb-4">
                  ABOUT
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#6A6A6A] mb-1">City</p>
                    <p className="text-base font-semibold text-[#000000]">
                      {institution?.city || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-[#6A6A6A] mb-1">State</p>
                    <p className="text-base font-semibold text-[#000000]">
                      {institution?.state || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-[#6A6A6A] mb-1">Bio</p>
                    <p className="text-base text-[#000000] leading-relaxed">
                      {institution?.description || 'No description provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* DETAILS Section */}
              <div>
                <h3 className="text-xs font-semibold text-[#6A6A6A] uppercase tracking-wider mb-4">
                  DETAILS
                </h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-[#ECF2FF] rounded-xl">
                    <div className="w-10 h-10 bg-[#008260] rounded-full flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#6A6A6A]">Established</p>
                      <p className="text-base font-bold text-[#000000] truncate">
                        {institution?.established_year ? `${institution.established_year} years` : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-[#ECF2FF] rounded-xl">
                    <div className="w-10 h-10 bg-[#008260] rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#6A6A6A]">Students</p>
                      <p className="text-base font-bold text-[#000000] truncate">
                        {institution?.student_count ? `${institution.student_count} Lakhs +` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setEditing(!editing)
                      if(editing){
                        loadInstitutionData(user.id)
                      }
                    }}
                    className="w-full bg-[#008260] hover:bg-[#006b4f] text-white rounded-xl py-4 sm:py-5 font-medium shadow-sm transition-all duration-200"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {editing ? 'Cancel Editing' : 'Edit Profile'}
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/institutions/${institution?.id || ''}`)
                      toast.success('Profile link copied!')
                    }}
                    className="w-full bg-[#008260] hover:bg-[#006b4f] text-white rounded-xl py-4 sm:py-5 font-medium shadow-sm transition-all duration-200"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Copy Profile Link
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Section */}
        <Card className="bg-white border border-[#DCDCDC] rounded-lg shadow-sm">
          <CardHeader className="border-b border-[#ECECEC]">
            <CardTitle className="text-xl font-bold text-[#000000]">Institution Profile Setup</CardTitle>
            <CardDescription className="text-[#6A6A6A]">
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

                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-[#000000] flex items-center space-x-2 pb-2 border-b border-[#ECECEC]">
                      <Building className="h-5 w-5 text-[#008260]" />
                      <span>Basic Information</span>
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[#000000] font-medium">Institution Name *</Label>
                        <Input
                          id="name"
                          placeholder="Enter institution name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                          required
                          disabled={!editing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="type" className="text-[#000000] font-medium">Institution Type *</Label>
                        <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))} disabled={!editing}>
                          <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
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
                      <Label htmlFor="description" className="text-[#000000] font-medium">Institution Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your institution, its mission, and academic focus..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                        required
                        disabled={!editing}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="website_url" className="text-[#000000] font-medium">Website URL</Label>
                        <Input
                          id="website_url"
                          placeholder="https://www.yourinstitution.edu"
                          value={formData.website_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                          className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="established_year" className="text-[#000000] font-medium">Established Year</Label>
                        <Input
                          id="established_year"
                          type="number"
                          placeholder="e.g., 1990"
                          value={formData.established_year}
                          onChange={(e) => handleInputChange('established_year', e.target.value)}
                          className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
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
                      <Label htmlFor="address" className="text-[#000000] font-medium">Address</Label>
                      <Textarea
                        id="address"
                        placeholder="Enter complete address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={3}
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                        disabled={!editing}
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-[#000000] font-medium">City</Label>
                        <Input
                          id="city"
                          placeholder="Enter city"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-[#000000] font-medium">State</Label>
                        <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)} disabled={!editing}>
                          <SelectTrigger className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300">
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
                        <Label htmlFor="pincode" className="text-[#000000] font-medium">Pincode</Label>
                        <Input
                          id="pincode"
                          placeholder="Enter pincode"
                          value={formData.pincode}
                          onChange={(e) => handleInputChange('pincode', e.target.value)}
                          className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
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
                        <Label htmlFor="contact_person" className="text-[#000000] font-medium">Contact Person *</Label>
                        <Input
                          id="contact_person"
                          placeholder="Name of primary contact person"
                          value={formData.contact_person}
                          onChange={(e) => handleInputChange('contact_person', e.target.value)}
                          className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                          required
                          disabled={!editing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-[#000000] font-medium">Contact Phone *</Label>
                        <Input
                          id="phone"
                          placeholder="Enter contact phone number"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                          disabled={!editing}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[#000000] font-medium">Contact Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter contact email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                        disabled={!editing}
                        required
                      />
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                      <Award className="h-5 w-5 text-purple-500" />
                      <span>Additional Information</span>
                    </h3>
                    
                    {
                      formData.type !== 'Corporate' &&
                      <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accreditation" className="text-[#000000] font-medium">Accreditation</Label>
                        <Input
                          id="accreditation"
                          placeholder="e.g., NAAC A+, NBA, UGC"
                          value={formData.accreditation}
                          onChange={(e) => handleInputChange('accreditation', e.target.value)}
                          className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="student_count" className="text-[#000000] font-medium">Student Count</Label>
                        <Input
                          id="student_count"
                          type="number"
                          placeholder="Approximate number of students"
                          value={formData.student_count}
                          onChange={(e) => handleInputChange('student_count', e.target.value)}
                          className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                          disabled={!editing}
                        />
                      </div>
                    </div>
                    }
                   

                    <div className="space-y-2">
                      <Label htmlFor="logo_url" className="text-[#000000] font-medium">Logo URL</Label>
                      <Input
                        id="logo_url"
                        placeholder="Link to your institution logo"
                        value={formData.logo_url}
                        onChange={(e) => handleInputChange('logo_url', e.target.value)}
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                        disabled={!editing}
                      />
                    </div>
                  </div>

                  {formData.type === 'Corporate' && (
                    <div className="space-y-4">
          
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[#000000] font-medium">Industry *</Label>
                          <Input value={formData.industry} onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))} disabled={!editing}
                          required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#000000] font-medium">Company Size *</Label>
                          <Select value={formData.company_size} onValueChange={(v) => setFormData(prev => ({ ...prev, company_size: v }))} disabled={!editing}>
                            <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0-1">0-1</SelectItem>
                              <SelectItem value="2-10">2-10</SelectItem>
                              <SelectItem value="11-50">11-50</SelectItem>
                              <SelectItem value="51-200">51-200</SelectItem>
                              <SelectItem value="201-500">201-500</SelectItem>
                              <SelectItem value="501-1000">501-1000</SelectItem>
                              <SelectItem value="1001-5000">1001-5000</SelectItem>
                              <SelectItem value="5001-10000">5001-10000</SelectItem>
                              <SelectItem value="10000+">10000+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#000000] font-medium">GSTIN *</Label>
                          <Input value={formData.gstin} required maxLength={15} onChange={(e) => {
                            const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                            setFormData(prev => ({ ...prev, gstin: upper }))
                          }} disabled={!editing} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#000000] font-medium">PAN *</Label>
                          <Input value={formData.pan} required maxLength={10} onChange={(e) => {
                            const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                            setFormData(prev => ({ ...prev, pan: upper }))
                          }} disabled={!editing} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#000000] font-medium">CIN *</Label>
                          <Input value={formData.cin} required maxLength={21} onChange={(e) => {
                            const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                            setFormData(prev => ({ ...prev, cin: upper }))
                          }} disabled={!editing} />
                        </div>
                     
                        <div className="space-y-2">
                          <Label className="text-[#000000] font-medium">Preferred Engagements (comma separated)</Label>
                          <Input value={formData.preferred_engagements} onChange={(e) => setFormData(prev => ({ ...prev, preferred_engagements: e.target.value }))} className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" disabled={!editing} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#000000] font-medium">Work Mode Preference</Label>
                          <Input value={formData.work_mode_preference} onChange={(e) => setFormData(prev => ({ ...prev, work_mode_preference: e.target.value }))} className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" disabled={!editing} />
                        </div>
                     
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[#000000] font-medium">Requires PO?</Label>
                          <Select value={formData.requires_po} onValueChange={(v) => setFormData(prev => ({ ...prev, requires_po: v }))} disabled={!editing}>
                            <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">No</SelectItem>
                              <SelectItem value="true">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#000000] font-medium">NDA Required?</Label>
                          <Select value={formData.nda_required} onValueChange={(v) => setFormData(prev => ({ ...prev, nda_required: v }))} disabled={!editing}>
                            <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">No</SelectItem>
                              <SelectItem value="true">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {editing && (
                    <div className="flex justify-end gap-3 pt-6">
                      <Button
                        type="button"
                        onClick={() => setEditing(false)}
                        variant="outline"
                        className="bg-white border-[#DCDCDC] text-[#000000] hover:bg-[#F8F8F8] px-8"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#008260] hover:bg-[#006b4f] text-white px-8"
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
      </div>
    </div>
  )
}
