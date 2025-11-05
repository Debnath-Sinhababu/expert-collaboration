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
import { ArrowLeft, Save, Building, MapPin, Users, Award } from 'lucide-react'
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

export default function InstitutionProfileEdit() {
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    setSuccess('')

    try {
      // Validate required fields
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

      // Corporate-specific required checks
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
        // Format validations
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

      if (!institution?.id) {
        throw new Error('Institution profile not found')
      }

      const isCorporate = formData.type === 'Corporate'
      
      // Prepare update data - only include corporate fields if type is Corporate
      const updateData: any = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        website_url: formData.website_url || null,
        logo_url: formData.logo_url || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        contact_person: formData.contact_person,
        email: formData.email,
        phone: formData.phone,
        established_year: parseInt(formData.established_year) || null,
        accreditation: formData.accreditation || null,
        student_count: parseInt(formData.student_count) || null,
        updated_at: new Date().toISOString()
      }

      // Only include corporate fields if type is Corporate
      if (isCorporate) {
        updateData.gstin = formData.gstin || null
        updateData.pan = formData.pan || null
        updateData.cin = formData.cin || null
        updateData.industry = formData.industry || null
        updateData.company_size = formData.company_size || null
        updateData.requires_po = formData.requires_po === 'true'
        updateData.nda_required = formData.nda_required === 'true'
        updateData.preferred_engagements = formData.preferred_engagements
          ? formData.preferred_engagements.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []
        updateData.work_mode_preference = formData.work_mode_preference || null
      } else {
        // For non-corporate, explicitly set corporate fields to null
        updateData.gstin = null
        updateData.pan = null
        updateData.cin = null
        updateData.industry = null
        updateData.company_size = null
        updateData.requires_po = false
        updateData.nda_required = false
        updateData.preferred_engagements = null
        updateData.work_mode_preference = null
      }

      await api.institutions.update(institution.id, updateData)
      
      toast.success('Profile updated successfully!')
      setTimeout(() => {
        router.push('/institution/profile')
      }, 1500)
    } catch (error: any) {
      setError(error.message)
      toast.error(error.message)
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
      <header className="bg-[#008260] border-b border-white/10 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/institution/home" className="flex items-center group">
              <Logo size="header" />
            </Link>

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
        <div className="mb-6">
          <Link href="/institution/profile" className="inline-flex items-center text-[#008260] hover:text-[#006b4f] transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Link>
        </div>

        <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Edit Institution Profile</CardTitle>
            <CardDescription className="text-slate-600">
              Update your institution information
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-[#000000] font-medium">Institution Type *</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
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
                    />
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-[#008260]" />
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-[#000000] font-medium">State</Label>
                    <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
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
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                  <Users className="h-5 w-5 text-[#008260]" />
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
                    required
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                  <Award className="h-5 w-5 text-[#008260]" />
                  <span>Additional Information</span>
                </h3>
                
                {formData.type !== 'Corporate' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accreditation" className="text-[#000000] font-medium">Accreditation</Label>
                      <Input
                        id="accreditation"
                        placeholder="e.g., NAAC A+, NBA, UGC"
                        value={formData.accreditation}
                        onChange={(e) => handleInputChange('accreditation', e.target.value)}
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
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
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="logo_url" className="text-[#000000] font-medium">Logo URL</Label>
                  <Input
                    id="logo_url"
                    placeholder="Link to your institution logo"
                    value={formData.logo_url}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                    className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-300"
                  />
                </div>
              </div>

              {formData.type === 'Corporate' && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#000000] font-medium">Industry *</Label>
                      <Input 
                        value={formData.industry} 
                        onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))} 
                        required
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#000000] font-medium">Company Size *</Label>
                      <Select value={formData.company_size} onValueChange={(v) => setFormData(prev => ({ ...prev, company_size: v }))}>
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
                      <Input 
                        value={formData.gstin} 
                        required 
                        maxLength={15} 
                        onChange={(e) => {
                          const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                          setFormData(prev => ({ ...prev, gstin: upper }))
                        }} 
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#000000] font-medium">PAN *</Label>
                      <Input 
                        value={formData.pan} 
                        required 
                        maxLength={10} 
                        onChange={(e) => {
                          const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                          setFormData(prev => ({ ...prev, pan: upper }))
                        }} 
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#000000] font-medium">CIN *</Label>
                      <Input 
                        value={formData.cin} 
                        required 
                        maxLength={21} 
                        onChange={(e) => {
                          const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                          setFormData(prev => ({ ...prev, cin: upper }))
                        }} 
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#000000] font-medium">Preferred Engagements (comma separated)</Label>
                      <Input 
                        value={formData.preferred_engagements} 
                        onChange={(e) => setFormData(prev => ({ ...prev, preferred_engagements: e.target.value }))} 
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#000000] font-medium">Work Mode Preference</Label>
                      <Input 
                        value={formData.work_mode_preference} 
                        onChange={(e) => setFormData(prev => ({ ...prev, work_mode_preference: e.target.value }))} 
                        className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#000000] font-medium">Requires PO?</Label>
                      <Select value={formData.requires_po} onValueChange={(v) => setFormData(prev => ({ ...prev, requires_po: v }))}>
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
                      <Select value={formData.nda_required} onValueChange={(v) => setFormData(prev => ({ ...prev, nda_required: v }))}>
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

              <div className="flex justify-end gap-4 pt-6">
                <Link href="/institution/profile">
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

