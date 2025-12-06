'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone, User, GraduationCap, MapPin, Edit, FileText, Linkedin, Github, Globe, Shield, Briefcase, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Badge } from '@/components/ui/badge'

export default function StudentProfile() {
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      await loadStudentData()
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadStudentData = async () => {
    try {
      const studentProfile = await api.students.me()
      
      if (studentProfile) {
        setStudent(studentProfile)
        // Load institution if institution_id exists
        if (studentProfile.institution_id) {
          try {
            const inst = await api.institutions.getById(studentProfile.institution_id)
            setInstitution(inst)
          } catch (error) {
            console.error('Error loading institution:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error loading student data:', error)
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

  const formatEducationDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr + '-01')
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const formatAvailability = (availability: string) => {
    const map: Record<string, string> = {
      'immediately': 'Available Immediately',
      '1 month': 'Available in 1 Month',
      '2+ months': 'Available in 2+ Months'
    }
    return map[availability] || availability
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
            <Link href="/student/home" className="flex items-center group">
              <Logo size="header" />
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/student/home" className="text-white font-medium transition-colors duration-200 relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
              <Link href="/student/dashboard" className="text-white font-medium transition-colors duration-200 relative group">
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
                student={student} 
                userType="student" 
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
                    <AvatarImage src={student?.photo_url} />
                    <AvatarFallback className="text-4xl font-bold bg-gradient-to-r from-[#008260] to-[#006b4f] text-white">
                      {student?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'S'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* White Content Section */}
              <CardContent className="pt-20 pb-6 px-6">
                <div className="flex flex-col">
                  {/* Name */}
                  <div className="mb-2">
                    <h1 className="text-2xl font-bold text-slate-900">
                      {student?.name || 'Student'}
                    </h1>
                    {institution && (
                      <p className="text-base text-slate-600 mt-1">
                        {institution.name}
                      </p>
                    )}
                    {(student?.city || student?.state) && (
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-[#008260]" />
                        <p className="text-sm text-slate-500">
                          {[student?.city, student?.state].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2 mt-4">
                    {student?.phone && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="h-5 w-5 text-[#008260]" />
                        <span className="text-base">{formatPhoneNumber(student.phone)}</span>
                      </div>
                    )}
                    {student?.linkedin_url && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Linkedin className="h-5 w-5 text-[#008260]" />
                        <a 
                          href={student.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-base text-[#008260] hover:text-[#006b4f] hover:underline"
                        >
                          {student.linkedin_url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                        </a>
                      </div>
                    )}
                    {student?.github_url && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Github className="h-5 w-5 text-[#008260]" />
                        <a 
                          href={student.github_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-base text-[#008260] hover:text-[#006b4f] hover:underline"
                        >
                          {student.github_url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Card */}
            {student?.about && (
              <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-[#008260]" />
                    <h2 className="text-lg font-semibold text-slate-900">About</h2>
                  </div>
                  <p className="text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                    {student.about}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Education Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="h-5 w-5 text-[#008260]" />
                  <h2 className="text-lg font-semibold text-slate-900">Education</h2>
                </div>
                <div className="space-y-4">
                  {student?.degree && (
                    <div>
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-slate-900">
                            {student.degree}
                            {student.specialization && ` - ${student.specialization}`}
                          </h3>
                          {institution && (
                            <p className="text-sm text-slate-600 mt-1">
                              {institution.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                        {student.education_start_date && (
                          <span>{formatEducationDate(student.education_start_date)}</span>
                        )}
                        {student.education_start_date && (student.education_end_date || student.currently_studying) && (
                          <span> - </span>
                        )}
                        {student.currently_studying ? (
                          <span className="text-[#008260] font-medium">Present</span>
                        ) : student.education_end_date ? (
                          <span>{formatEducationDate(student.education_end_date)}</span>
                        ) : null}
                        {student.year && (
                          <>
                            <span>•</span>
                            <span>{student.year}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Academic Performance Card */}
            {(student?.class_10th_percentage || student?.class_12th_percentage || student?.cgpa_percentage) && (
              <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="h-5 w-5 text-[#008260]" />
                    <h2 className="text-lg font-semibold text-slate-900">Academic Performance</h2>
                  </div>
                  <div className="space-y-3">
                    {student?.class_10th_percentage && (
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Class 10th</span>
                        <span className="text-slate-900 font-semibold">{student.class_10th_percentage}%</span>
                      </div>
                    )}
                    {student?.class_12th_percentage && (
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Class 12th</span>
                        <span className="text-slate-900 font-semibold">{student.class_12th_percentage}%</span>
                      </div>
                    )}
                    {student?.cgpa_percentage && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-slate-600">CGPA</span>
                        <span className="text-slate-900 font-semibold">{student.cgpa_percentage}%</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills Card */}
            {student?.skills && Array.isArray(student.skills) && student.skills.length > 0 && (
              <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="h-5 w-5 text-[#008260]" />
                    <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {student.skills.map((skill: string, index: number) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50 px-3 py-1 text-sm font-medium"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Action Buttons Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Link href="/student/profile/edit">
                    <Button className="w-full bg-[#008260] hover:bg-[#006b4f] text-white rounded-lg py-6 font-medium">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                  
                  {student?.resume_url && (
                    <a 
                      href={student.resume_url} 
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

                  {student?.portfolio_url && (
                    <a 
                      href={student.portfolio_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="outline" className="w-full border-[#008260] text-[#008260] hover:bg-[#ECF2FF] rounded-lg py-6 font-medium">
                        <Globe className="h-4 w-4 mr-2" />
                        Portfolio
                      </Button>
                    </a>
                  )}

                  {student?.documents_url && (
                    <a 
                      href={student.documents_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="outline" className="w-full border-[#008260] text-[#008260] hover:bg-[#ECF2FF] rounded-lg py-6 font-medium">
                        <FileText className="h-4 w-4 mr-2" />
                        View Documents (PDF)
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Student Details Card */}
            <Card className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Student Details</h2>
                <div className="space-y-4">
                  {student?.email && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Email</span>
                      <span className="text-slate-900 font-semibold text-sm break-all">
                        {student.email}
                      </span>
                    </div>
                  )}
                  
                  {student?.gender && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Gender</span>
                      <span className="text-slate-900 font-semibold">
                        {student.gender}
                      </span>
                    </div>
                  )}

                  {student?.date_of_birth && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Date of Birth</span>
                      <span className="text-slate-900 font-semibold">
                        {new Date(student.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {student?.availability && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Availability</span>
                      <span className="text-slate-900 font-semibold">
                        {formatAvailability(student.availability)}
                      </span>
                    </div>
                  )}

                  {student?.preferred_engagement && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Preferred Engagement</span>
                      <span className="text-slate-900 font-semibold">
                        {student.preferred_engagement}
                      </span>
                    </div>
                  )}

                  {student?.preferred_work_mode && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600">Work Mode</span>
                      <span className="text-slate-900 font-semibold">
                        {student.preferred_work_mode}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
