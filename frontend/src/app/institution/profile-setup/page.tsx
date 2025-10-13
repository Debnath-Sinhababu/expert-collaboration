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
import { Building, Globe, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Logo from '@/components/Logo'

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

export default function InstitutionProfileSetup() {
  const [user, setUser] = useState<any>(null)
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
    contact_email: '',
    contact_phone: '',
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
      setFormData(prev => ({ ...prev, contact_email: user.email || '' }))
      setLoading(false)
    }

    getUser()
  }, [router])

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
      if (!formData.city?.trim()) {
        toast.error('Please enter city')
        setSaving(false)
        return
      }
      if (!formData.state?.trim()) {
        toast.error('Please enter state')
        setSaving(false)
        return
      }

      // If Corporate, validate a few key corporate fields
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
        // normalize types for backend
        requires_po: formData.requires_po === 'true',
        nda_required: formData.nda_required === 'true',
        preferred_engagements: formData.preferred_engagements
          ? formData.preferred_engagements.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        user_id: user.id,
        email: user.email,
        established_year: parseInt(formData.established_year) || null,
        student_count: parseInt(formData.student_count) || null,
        created_at: new Date().toISOString(),
        verified: false,
        rating: 0,
        total_projects: 0
      }
      
      await api.institutions.create(institutionData)
      toast.success('Institution profile created successfully! Redirecting to dashboard...')
      
        router.push('/institution/home')
      
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative py-8">
      {/* Background Elements */}
   
      
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4 group">
            <Logo size="md" />
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent group-hover:from-blue-800 group-hover:to-indigo-800 transition-all duration-300">Calxmap</span>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">Complete Your Institution Profile</h1>
          <p className="text-xl text-slate-600">
            Set up your institution profile to start posting projects and finding experts
          </p>
        </div>

        <Card className="bg-white border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900">Institution Profile Setup</CardTitle>
            <CardDescription className="text-slate-600">
              Complete your institution profile to start connecting with qualified experts
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
                <h3 className="text-lg font-semibold flex items-center space-x-2 text-slate-900">
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
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-slate-700">Institution Type *</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                        <SelectTrigger className="border-2 border-slate-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300">
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

                  {/* Corporate-only fields */}
                  {formData.type === 'Corporate' && (
                    <div className=" space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Industry *</Label>
                          <Input
                            placeholder="e.g., IT Services, Manufacturing"
                            value={formData.industry}
                            onChange={(e) => handleInputChange('industry', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Company Size *</Label>
                          <Select value={formData.company_size} onValueChange={(v) => handleInputChange('company_size', v)}>
                            <SelectTrigger>
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
                          <Label>GSTIN *</Label>
                          <Input
                            placeholder="15-digit GSTIN"
                            value={formData.gstin}
                            maxLength={15}
                            onChange={(e) => {
                              const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                              handleInputChange('gstin', upper)
                            }}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>PAN *</Label>
                          <Input
                            placeholder="PAN number"
                            value={formData.pan}
                            maxLength={10}
                            onChange={(e) => {
                              const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                              handleInputChange('pan', upper)
                            }}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>CIN *</Label>
                          <Input
                            placeholder="Corporate Identification Number"
                            value={formData.cin}
                            maxLength={21}
                            onChange={(e) => {
                              const upper = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                              handleInputChange('cin', upper)
                            }}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Preferred Engagements (comma separated)</Label>
                          <Input
                            placeholder="training, workshop, consulting"
                            value={formData.preferred_engagements}
                            onChange={(e) => handleInputChange('preferred_engagements', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Work Mode Preference</Label>
                          <Input
                            placeholder="onsite / remote / hybrid"
                            value={formData.work_mode_preference}
                            onChange={(e) => handleInputChange('work_mode_preference', e.target.value)}
                          />
                        </div>
                    
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Requires PO?</Label>
                          <Select value={formData.requires_po} onValueChange={(v) => handleInputChange('requires_po', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">No</SelectItem>
                              <SelectItem value="true">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>NDA Required?</Label>
                          <Select value={formData.nda_required} onValueChange={(v) => handleInputChange('nda_required', v)}>
                            <SelectTrigger>
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
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="established_year">Established Year</Label>
                    <Input
                      id="established_year"
                      type="number"
                      placeholder="e.g., 1985"
                      value={formData.established_year}
                      onChange={(e) => handleInputChange('established_year', e.target.value)}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website_url" className="text-slate-700">Website URL</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="website_url"
                        placeholder="https://www.yourinstitution.edu"
                        value={formData.website_url}
                        onChange={(e) => handleInputChange('website_url', e.target.value)}
                        className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2 text-slate-900">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  <span>Location Information</span>
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter complete address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="Enter city"
                      value={formData.city}
                      required
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map((state:any) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      placeholder="Enter pincode"
                      value={formData.pincode}
                      onChange={(e) => handleInputChange('pincode', e.target.value)}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Contact Information</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person *</Label>
                    <Input
                      id="contact_person"
                      placeholder="Name of primary contact person"
                      value={formData.contact_person}
                      onChange={(e) => handleInputChange('contact_person', e.target.value)}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone *</Label>
                    <Input
                      id="contact_phone"
                      placeholder="Enter contact phone number"
                      value={formData.contact_phone}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="Enter contact email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                    required
                  />
                </div>
              </div>

              {/* Additional Information */}
              {
                formData.type !== 'Corporate' && (
                  <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Additional Information</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accreditation">Accreditation</Label>
                      <Input
                        id="accreditation"
                        placeholder="e.g., NAAC A+, NBA, UGC"
                        value={formData.accreditation}
                        onChange={(e) => handleInputChange('accreditation', e.target.value)}
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                      />
                    </div>
  
                    <div className="space-y-2">
                      <Label htmlFor="student_count">Student Count</Label>
                      <Input
                        id="student_count"
                        type="number"
                        placeholder="Approximate number of students"
                        value={formData.student_count}
                        onChange={(e) => handleInputChange('student_count', e.target.value)}
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                      />
                    </div>
                  </div>
  
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <Input
                      id="logo_url"
                      placeholder="Link to your institution logo"
                      value={formData.logo_url}
                      onChange={(e) => handleInputChange('logo_url', e.target.value)}
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                    />
                  </div>
                </div>
                )
              }
            

              <div className="flex justify-between pt-6 flex-wrap gap-3">
                <Link href="/auth/login">
                  <Button variant="outline" className="border-2 border-slate-300 text-slate-700 transition-all duration-300 hover:text-white hover:border-transparent hover:bg-gradient-to-r hover:from-slate-900 hover:via-blue-900 hover:to-indigo-900 hover:shadow-sm">
                    Back to Login
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300"
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
