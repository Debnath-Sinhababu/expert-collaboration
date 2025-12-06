'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star, Shield, Phone, Linkedin, User, GraduationCap, IndianRupee, Calendar, Building2, FileText, Edit, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Badge } from '@/components/ui/badge'

export default function ExpertProfile() {
  const [user, setUser] = useState<any>(null)
  const [expert, setExpert] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [leadingInstitutes, setLeadingInstitutes] = useState<any[]>([])
  const router = useRouter()

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
        await loadLeadingInstitutes(expertProfile.id)
      }
    } catch (error) {
      console.error('Error loading expert data:', error)
    }
  }

  const loadLeadingInstitutes = async (expertId: string) => {
    try {
      // Fetch accepted/completed bookings and applications to get institutions
      const [bookings, applications] = await Promise.all([
        api.bookings.getAll({ expert_id: expertId, limit: 100 }).catch(() => []),
        api.applications.getAll({ expert_id: expertId, status: 'accepted', limit: 100 }).catch(() => [])
      ])

      const institutionsMap = new Map()
      
      // Extract institutions from bookings
      if (Array.isArray(bookings)) {
        bookings.forEach((booking: any) => {
          if (booking.institutions && booking.institutions.id) {
            const inst = booking.institutions
            if (!institutionsMap.has(inst.id)) {
              institutionsMap.set(inst.id, {
                id: inst.id,
                name: inst.name,
                logo_url: inst.logo_url,
                type: booking.projects?.type || 'contract'
              })
            }
          }
        })
      }

      // Extract institutions from applications
      if (Array.isArray(applications)) {
        applications.forEach((app: any) => {
          if (app.projects?.institutions && app.projects.institutions.id) {
            const inst = app.projects.institutions
            if (!institutionsMap.has(inst.id)) {
              institutionsMap.set(inst.id, {
                id: inst.id,
                name: inst.name,
                logo_url: inst.logo_url,
                type: app.projects?.type || 'contract'
              })
            }
          }
        })
      }

      setLeadingInstitutes(Array.from(institutionsMap.values()).slice(0, 4))
    } catch (error) {
      console.error('Error loading leading institutes:', error)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    // Format as +91 XXXXX XXXXX
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
    }
    return phone
  }

  const getExpertTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'Guest Faculty': 'GF',
      'Visiting Faculty': 'VF',
      'Industry Experts': 'IE'
    }
    return typeMap[type] || type.substring(0, 2).toUpperCase()
  }

  const getProjectTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'contract': 'Contract',
      'internship': 'Internship',
      'freelance': 'Freelance'
    }
    return typeMap[type] || type
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

      <div className="container mx-auto px-4 max-w-7xl py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Summary Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* Light Gray Header Section */}
              <div className="bg-[#E3E3E3] h-48 relative">
                {/* Avatar overlapping both sections - positioned on the left */}
                <div className="absolute left-6 -bottom-12">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                    <AvatarImage src={expert?.photo_url} />
                    <AvatarFallback className="text-4xl font-bold bg-gradient-to-r from-[#008260] to-[#006b4f] text-white">
                      {expert?.name?.charAt(0) || user?.email?.charAt(0) || 'E'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* White Content Section */}
              <CardContent className="pt-20 pb-6 px-6">
                <div className="flex flex-col">
                  {/* Name and Rating side by side */}
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-slate-900">
                      {expert?.name || 'Expert User'}
                    </h1>
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <span className="text-base font-semibold text-slate-700">
                        {expert?.rating?.toFixed(1) || '4.9'}
                      </span>
                    </div>
                  </div>

                  {/* Domain Expertise, Subskills, and Expert Types */}
                  <div className="space-y-3 mb-4">
                    {/* Domain Expertise */}
                    {expert?.domain_expertise?.[0] && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge 
                          variant="outline"
                          className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50 px-3 py-1 text-sm font-medium"
                        >
                          {expert.domain_expertise[0]}
                        </Badge>
                      </div>
                    )}

                    {/* Subskills */}
                    {expert?.subskills && expert.subskills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {expert.subskills.slice(0, 6).map((skill: string, index: number) => (
                          <Badge 
                            key={index}
                            variant="outline"
                            className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50 px-2.5 py-0.5 text-xs font-normal"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {expert.subskills.length > 6 && (
                          <Badge 
                            variant="outline"
                            className="bg-white text-slate-500 border-slate-300 hover:bg-slate-50 px-2.5 py-0.5 text-xs font-normal"
                          >
                            +{expert.subskills.length - 6} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2 mt-4">
                    {expert?.phone && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="h-5 w-5 text-[#008260]" />
                        <span className="text-base">{formatPhoneNumber(expert.phone)}</span>
                      </div>
                    )}
                    {expert?.linkedin_url && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Linkedin className="h-5 w-5 text-[#008260]" />
                        <a 
                          href={expert.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-base text-[#008260] hover:text-[#006b4f] hover:underline"
                        >
                          {expert.linkedin_url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Bio Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-[#008260]" />
                  <h2 className="text-lg font-semibold text-slate-900">Professional Bio</h2>
                </div>
                <p className="text-slate-700 leading-relaxed break-words">
                  {expert?.bio || 'No bio available.'}
                </p>
              </CardContent>
            </Card>

            {/* Qualifications & Certifications Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="h-5 w-5 text-[#008260]" />
                  <h2 className="text-lg font-semibold text-slate-900">Qualifications & Certifications</h2>
                </div>
                {expert?.qualifications ? (
                  <div className="space-y-2">
                    {expert.qualifications.split('\n').filter((line: string) => line.trim()).map((line: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 break-words">
                        <span className="text-[#008260] mt-1">•</span>
                        <span className="text-slate-700 flex-1">{line.trim()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No qualifications listed.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Action Buttons Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Link href="/expert/profile/edit">
                    <Button className="w-full bg-[#008260] hover:bg-[#006b4f] text-white rounded-lg py-6 font-medium">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                  
                  {expert?.resume_url && (
                    <a 
                      href={expert.resume_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="outline" className="w-full border-[#008260] text-[#008260] hover:bg-[#ECF2FF] rounded-lg py-6 font-medium">
                        <FileText className="h-4 w-4 mr-2" />
                        View Resume (PDF)
                      </Button>
                    </a>
                  )}
                  
                  {expert?.qualifications_url && (
                    <a 
                      href={expert.qualifications_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="outline" className="w-full border-[#008260] text-[#008260] hover:bg-[#ECF2FF] rounded-lg py-6 font-medium">
                        <FileText className="h-4 w-4 mr-2" />
                        View Qualifications (PDF)
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Professional Details Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Professional Details</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Hourly Rate</span>
                    <span className="text-slate-900 font-semibold flex items-center gap-1">
                      <IndianRupee className="h-4 w-4" />
                      {expert?.hourly_rate || '0'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Years of Experience</span>
                    <span className="text-slate-900 font-semibold">
                      {expert?.experience_years || 0}+ Years
                    </span>
                  </div>

                  {expert?.last_working_company && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Last Working Company</span>
                      <span className="text-slate-900 font-semibold text-right max-w-[60%]">
                        {expert.last_working_company}
                      </span>
                    </div>
                  )}

                  {expert?.expert_types && expert.expert_types.length > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Expert Type</span>
                      <span className="text-slate-900 font-semibold">
                        {expert.expert_types.join(', ')}
                      </span>
                    </div>
                  )}

                  {expert?.available_on_demand !== undefined && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600">Available on Demand</span>
                      <div className="flex items-center gap-1">
                        {expert.available_on_demand ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-semibold">Yes</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-semibold">No</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Leading Institutes Card */}
            {leadingInstitutes.length > 0 && (
              <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Leading Institutes</h2>
                  <div className="space-y-3">
                    {leadingInstitutes.map((institute) => (
                      <div 
                        key={institute.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {institute.logo_url ? (
                            <img 
                              src={institute.logo_url} 
                              alt={institute.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {institute.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Specialization: {getProjectTypeLabel(institute.type)}
                          </p>
                        </div>
                      </div>
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
