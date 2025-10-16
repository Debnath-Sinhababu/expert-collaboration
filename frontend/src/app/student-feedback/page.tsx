'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraduationCap, User, Hash, Building, BookOpen, Star, ArrowRight, Shield, TrendingUp } from 'lucide-react'
import Logo from '@/components/Logo'
import Link from 'next/link'

const UNIVERSITIES = [
 'FOSTIIMA Business School'
]

export default function StudentFeedbackPage() {
  const [formData, setFormData] = useState({
    universityName: '',
    rollNumber: '',
    studentName: '',
    mobile: '',
    batch: '' as '' | 'ET' | 'PROMPT_ENGINEERING',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [studentData, setStudentData] = useState(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Strict 10-digit numeric validation
  const isMobileValid = () => {
    return /^\d{10}$/.test(formData.mobile)
  }

  // Sanitize mobile input to digits only and cap at 10
  const handleMobileChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, mobile: digitsOnly }))
  }

  const isFormValid = () => {
    return (
      !!formData.universityName &&
      !!formData.rollNumber &&
      !!formData.studentName &&
      !!formData.batch &&
      isMobileValid()
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!isFormValid()) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          universityName: formData.universityName,
          rollNumber: formData.rollNumber,
          studentName: formData.studentName,
          batch: formData.batch,
          mobile: formData.mobile,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Store student data in localStorage for session management
        localStorage.setItem('studentData', JSON.stringify(result.student))
        localStorage.setItem('universityData', JSON.stringify(result.university))
        // Store selected batch for session-level enforcement
        localStorage.setItem('studentBatch', formData.batch)
        
        // Check if student has already submitted feedback
        const checkFeedbackStatus = async () => {
          try {
            const sessionsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/sessions`)
            const sessionsResult = await sessionsResponse.json()
            
            if (sessionsResult.success) {
              const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/feedback-status?studentId=${result.student.id}`)
              const statusResult = await statusResponse.json()
              
              // If any submission exists for this roll already, go to completion
              if (statusResult.success && statusResult.submissions && statusResult.submissions.length > 0) {
                window.location.href = '/student-feedback/complete'
                return
              }
              
              // Check if there are sessions available for feedback
              const availableSessions = sessionsResult.sessions.filter((s: any) => 
                s.session_type === formData.batch
              )
              
              if (availableSessions.length === 0) {
                setError('No sessions available for the selected batch. Please contact your administrator.')
                setLoading(false)
                return
              }
              
              // Go to feedback form
              window.location.href = '/student-feedback/form'
            } else {
              setError('Failed to load sessions. Please try again.')
              setLoading(false)
            }
          } catch (error) {
            console.error('Error checking feedback status:', error)
            setError('Failed to check feedback status. Please try again.')
            setLoading(false)
          }
        }
        
        checkFeedbackStatus()
      } else {
        setError(result.message || 'Login failed. Please check your details and try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-[#008260] border-b-2 border-[#006d51] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Logo size="header" />
            <Link href="/" className="text-white hover:text-white/80 transition-colors text-sm sm:text-base">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto py-12 sm:py-20">
          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#008260] rounded-full flex items-center justify-center shadow-lg">
                <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">
              Student
              <span className="text-[#008260]"> Feedback</span>
              <br />
              Portal
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed px-4">
              Share your valuable feedback on expert sessions and help us improve the learning experience. 
              Your voice matters in shaping the future of knowledge sharing.
            </p>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <div className="text-center p-4 sm:p-6 bg-white rounded-lg border-2 border-[#D6D6D6] shadow-sm hover:shadow-md transition-all duration-300 hover:border-[#008260]/30">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#008260] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Secure & Private</h3>
              <p className="text-slate-600 text-xs sm:text-sm">Your feedback is completely anonymous and secure</p>
            </div>
            
            <div className="text-center p-4 sm:p-6 bg-white rounded-lg border-2 border-[#D6D6D6] shadow-sm hover:shadow-md transition-all duration-300 hover:border-[#008260]/30">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#008260] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Star className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Quick & Easy</h3>
              <p className="text-slate-600 text-xs sm:text-sm">Complete feedback in just a few minutes</p>
            </div>
            
            <div className="text-center p-4 sm:p-6 bg-white rounded-lg border-2 border-[#D6D6D6] shadow-sm hover:shadow-md transition-all duration-300 hover:border-[#008260]/30 sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#008260] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Drive Improvement</h3>
              <p className="text-slate-600 text-xs sm:text-sm">Help enhance future learning sessions</p>
            </div>
          </div>

          {/* Login Form */}
          <Card className="bg-white border-2 border-[#D6D6D6] rounded-lg shadow-sm">
            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2">Access Your Feedback Portal</CardTitle>
              <CardDescription className="text-slate-600 text-sm sm:text-base lg:text-lg">
                Enter your details to access the feedback system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 lg:p-8">
              {error && (
                <Alert className="mb-6 border-red-200 bg-red-50 text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="mb-6 border-green-200 bg-green-50 text-green-700">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="universityName" className="text-slate-700 font-medium text-sm sm:text-base">
                      <Building className="inline h-4 w-4 mr-2" />
                      University Name
                    </Label>
                    <Select value={formData.universityName} onValueChange={(value) => handleInputChange('universityName', value)}>
                      <SelectTrigger className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260]">
                        <SelectValue placeholder="Select your university" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#D6D6D6] text-slate-900">
                        {UNIVERSITIES.map((university) => (
                          <SelectItem key={university} value={university} className="hover:bg-[#008260]/10">
                            {university}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rollNumber" className="text-slate-700 font-medium text-sm sm:text-base">
                      <Hash className="inline h-4 w-4 mr-2" />
                      Roll Number
                    </Label>
                    <Input
                      id="rollNumber"
                      type="text"
                      value={formData.rollNumber}
                      onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                      className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260]"
                      placeholder="Enter your roll number"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="studentName" className="text-slate-700 font-medium text-sm sm:text-base">
                      <User className="inline h-4 w-4 mr-2" />
                      Student Name
                    </Label>
                    <Input
                      id="studentName"
                      type="text"
                      value={formData.studentName}
                      onChange={(e) => handleInputChange('studentName', e.target.value)}
                      className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260]"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="text-slate-700 font-medium text-sm sm:text-base">
                      <GraduationCap className="inline h-4 w-4 mr-2" />
                      Mobile Number
                    </Label>
                    <Input
                      id="mobile"
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260]"
                      placeholder="10-digit mobile number"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batch" className="text-slate-700 font-medium text-sm sm:text-base">
                    <BookOpen className="inline h-4 w-4 mr-2" />
                    Session Batch
                  </Label>
                  <Select value={formData.batch} onValueChange={(value) => handleInputChange('batch', value)}>
                    <SelectTrigger className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260]">
                      <SelectValue placeholder="Select your session batch" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#D6D6D6] text-slate-900">
                      <SelectItem value="ET" className="hover:bg-[#008260]/10">Emerging Technologies (ET)</SelectItem>
                      <SelectItem value="PROMPT_ENGINEERING" className="hover:bg-[#008260]/10">Prompt Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={!isFormValid() || loading}
                  className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-medium sm:font-bold text-base sm:text-lg py-5 sm:py-6 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Accessing Portal...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>Access Feedback Portal</span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer Info */}
        
        </div>
      </div>
    </div>
  )
}
