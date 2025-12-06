'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone, User, GraduationCap, Calendar, Users, Building2, Edit, Globe, Award, Shield, MapPin, Briefcase, FileText, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'

export default function InstitutionProfile() {
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [topExperts, setTopExperts] = useState<any[]>([])
  const router = useRouter()

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
        await loadTopExperts(institutionProfile.id)
      }
    } catch (error) {
      console.error('Error loading institution data:', error)
    }
  }

  const loadTopExperts = async (institutionId: string) => {
    try {
      // Fetch experts from bookings and applications for this institution
      const [bookings, applications] = await Promise.all([
        api.bookings.getAll({ institution_id: institutionId, limit: 100 }).catch(() => []),
        api.applications.getAll({ institution_id: institutionId, status: 'accepted', limit: 100 }).catch(() => [])
      ])

      const expertsMap = new Map()
      
      // Extract experts from bookings
      if (Array.isArray(bookings)) {
        bookings.forEach((booking: any) => {
          if (booking.experts && booking.experts.id) {
            const expert = booking.experts
            if (!expertsMap.has(expert.id)) {
              expertsMap.set(expert.id, {
                id: expert.id,
                name: expert.name,
                photo_url: expert.photo_url || expert.profile_photo_thumbnail_url || expert.profile_photo_small_url,
                domain_expertise: expert.domain_expertise?.[0] || '',
                rating: expert.rating || 0,
                is_verified: expert.is_verified || false
              })
            }
          }
        })
      }

      // Extract experts from applications
      if (Array.isArray(applications)) {
        applications.forEach((app: any) => {
          if (app.experts && app.experts.id) {
            const expert = app.experts
            if (!expertsMap.has(expert.id)) {
              expertsMap.set(expert.id, {
                id: expert.id,
                name: expert.name,
                photo_url: expert.photo_url || expert.profile_photo_thumbnail_url || expert.profile_photo_small_url,
                domain_expertise: expert.domain_expertise?.[0] || '',
                rating: expert.rating || 0,
                is_verified: expert.is_verified || false
              })
            }
          }
        })
      }

      // Sort by rating and take top 4
      const expertsArray = Array.from(expertsMap.values())
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 4)
      
      setTopExperts(expertsArray)
    } catch (error) {
      console.error('Error loading top experts:', error)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
    }
    return phone
  }

  const formatStudentCount = (count: number | null) => {
    if (!count) return 'N/A'
    if (count >= 100000) {
      return `${(count / 100000).toFixed(1)} Lakhs+`
    }
    return `${count}+`
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
            <Link href="/institution/home" className="flex items-center group">
              <Logo size="header" />
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/institution/home" className="text-white font-medium transition-colors duration-200 relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
              <Link href="/institution/dashboard" className="text-white/80 hover:text-white font-medium transition-colors duration-200 relative group">
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
                institution={institution} 
                userType="institution" 
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-7xl py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Summary Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* Light Gray Header Section */}
              <div className="bg-[#E3E3E3] h-48 relative">
                {/* Logo overlapping both sections - positioned on the left */}
                <div className="absolute left-6 -bottom-12">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                    <AvatarImage src={institution?.logo_url} />
                    <AvatarFallback className="text-4xl font-bold bg-gradient-to-r from-[#008260] to-[#006b4f] text-white">
                      {institution?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'I'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* White Content Section */}
              <CardContent className="pt-20 pb-6 px-6">
                <div className="flex flex-col">
                  {/* Name and Type */}
                  <div className="mb-2">
                    <h1 className="text-2xl font-bold text-slate-900">
                      {institution?.name || 'Institution'}
                    </h1>
                    <p className="text-base text-slate-600 mt-1">
                      {institution?.type || 'Educational Institution'}
                    </p>
                    {(institution?.city || institution?.state) && (
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-[#008260]" />
                        <p className="text-sm text-slate-500">
                          {[institution?.city, institution?.state].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2 mt-4">
                    {institution?.phone && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="h-5 w-5 text-[#008260]" />
                        <span className="text-base">{formatPhoneNumber(institution.phone)}</span>
                      </div>
                    )}
                    {institution?.website_url && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Globe className="h-5 w-5 text-[#008260]" />
                        <a 
                          href={institution.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-base text-[#008260] hover:text-[#006b4f] hover:underline"
                        >
                          {institution.website_url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Institute Bio Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-[#008260]" />
                  <h2 className="text-lg font-semibold text-slate-900">Institute Bio</h2>
                </div>
                <p className="text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                  {institution?.description || 'No description provided.'}
                </p>
              </CardContent>
            </Card>

            {/* Courses & Certifications Card */}
            {
              institution?.type && institution.type.toLowerCase() !== 'corporate' && 
              <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="h-5 w-5 text-[#008260]" />
                  <h2 className="text-lg font-semibold text-slate-900">Courses & Certifications</h2>
                </div>
                {institution?.accreditation ? (
                  <div className="space-y-2">
                    {institution.accreditation.split(',').filter((item: string) => item.trim()).map((item: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 break-words">
                        <span className="text-[#008260] mt-1">•</span>
                        <span className="text-slate-700 flex-1">{item.trim()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No certifications listed.</p>
                )}
              </CardContent>
            </Card>
            }
          

            {/* Corporate-Specific Sections */}
            {institution?.type === 'Corporate' && (
              <>
                {/* Compliance & Legal Card */}
                {(institution?.gstin || institution?.pan || institution?.cin) && (
                  <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="h-5 w-5 text-[#008260]" />
                        <h2 className="text-lg font-semibold text-slate-900">Compliance & Legal</h2>
                      </div>
                      <div className="space-y-4">
                        {institution?.gstin && (
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">GSTIN</span>
                            <span className="text-slate-900 font-mono text-sm">
                              {institution.gstin}
                            </span>
                          </div>
                        )}
                        {institution?.pan && (
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">PAN</span>
                            <span className="text-slate-900 font-mono text-sm">
                              {institution.pan}
                            </span>
                          </div>
                        )}
                        {institution?.cin && (
                          <div className="flex items-center justify-between py-2">
                            <span className="text-slate-600">CIN</span>
                            <span className="text-slate-900 font-mono text-sm">
                              {institution.cin}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Engagement Preferences Card */}
                {(institution?.preferred_engagements?.length > 0 || institution?.work_mode_preference || institution?.requires_po !== undefined || institution?.nda_required !== undefined) && (
                  <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-[#008260]" />
                        <h2 className="text-lg font-semibold text-slate-900">Engagement Preferences</h2>
                      </div>
                      <div className="space-y-4">
                        {institution?.preferred_engagements && Array.isArray(institution.preferred_engagements) && institution.preferred_engagements.length > 0 && (
                          <div className="py-2 border-b border-slate-100">
                            <span className="text-slate-600 block mb-2">Preferred Engagements</span>
                            <div className="flex flex-wrap gap-2">
                              {institution.preferred_engagements.map((engagement: string, index: number) => (
                                <span 
                                  key={index}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {engagement}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {institution?.work_mode_preference && (
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-slate-600">Work Mode Preference</span>
                            <span className="text-slate-900 font-semibold">
                              {institution.work_mode_preference}
                            </span>
                          </div>
                        )}
                        <div className="space-y-2 py-2">
                          {institution?.requires_po !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Requires Purchase Order</span>
                              <div className="flex items-center gap-1">
                                {institution.requires_po ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-green-600 font-semibold text-sm">Yes</span>
                                  </>
                                ) : (
                                  <span className="text-slate-400 font-semibold text-sm">No</span>
                                )}
                              </div>
                            </div>
                          )}
                          {institution?.nda_required !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">NDA Required</span>
                              <div className="flex items-center gap-1">
                                {institution.nda_required ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-green-600 font-semibold text-sm">Yes</span>
                                  </>
                                ) : (
                                  <span className="text-slate-400 font-semibold text-sm">No</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Action Buttons Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Link href="/institution/profile/edit">
                    <Button className="w-full bg-[#008260] hover:bg-[#006b4f] text-white rounded-lg py-6 font-medium">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                  
                  {institution?.website_url && (
                    <a 
                      href={institution.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="outline" className="w-full border-[#008260] text-[#008260] hover:bg-[#ECF2FF] rounded-lg py-6 font-medium">
                        <Globe className="h-4 w-4 mr-2" />
                        Visit Website
                      </Button>
                    </a>
                  )}
                  
                  {institution?.accreditation && (
                    <Button variant="outline" className="w-full border-[#008260] text-[#008260] hover:bg-[#ECF2FF] rounded-lg py-6 font-medium">
                      <Award className="h-4 w-4 mr-2" />
                      View Accreditation
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Institute Details Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  {institution?.type === 'Corporate' ? 'Company Details' : 'Institute Details'}
                </h2>
                <div className="space-y-4">
                  {institution?.established_year && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Established</span>
                      <span className="text-slate-900 font-semibold">
                        {institution.established_year}
                      </span>
                    </div>
                  )}
                  {institution?.student_count && institution?.type !== 'Corporate' && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Student Count</span>
                      <span className="text-slate-900 font-semibold">
                        {formatStudentCount(institution.student_count)}
                      </span>
                    </div>
                  )}
                  {institution?.industry && institution?.type === 'Corporate' && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Industry</span>
                      <span className="text-slate-900 font-semibold">
                        {institution.industry}
                      </span>
                    </div>
                  )}
                  {institution?.company_size && institution?.type === 'Corporate' && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600">Company Size</span>
                      <span className="text-slate-900 font-semibold">
                        {institution.company_size} employees
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Experts Card */}
            {topExperts.length > 0 && (
              <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Experts</h2>
                  <div className="space-y-3">
                    {topExperts.map((expert) => (
                      <Link 
                        key={expert.id}
                        href={`/experts/${expert.id}`}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={expert.photo_url} />
                          <AvatarFallback className="text-sm font-bold bg-gradient-to-r from-[#008260] to-[#006b4f] text-white">
                            {expert.name?.charAt(0) || 'E'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {expert.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {expert.domain_expertise || 'Expert'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
