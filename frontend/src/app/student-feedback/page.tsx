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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-300/10 to-indigo-300/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <Logo size="sm" />
              <span className="text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                Calxmap
              </span>
            </Link>
            <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto py-20">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-2xl">
                <BookOpen className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Student
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent"> Feedback</span>
              <br />
              Portal
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Share your valuable feedback on expert sessions and help us improve the learning experience. 
              Your voice matters in shaping the future of knowledge sharing.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="text-center p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Secure & Private</h3>
              <p className="text-slate-600 text-sm">Your feedback is completely anonymous and secure</p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Quick & Easy</h3>
              <p className="text-slate-600 text-sm">Complete feedback in just a few minutes</p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Drive Improvement</h3>
              <p className="text-slate-600 text-sm">Help enhance future learning sessions</p>
            </div>
          </div>

          {/* Login Form */}
          <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:shadow-md">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-slate-900 mb-2">Access Your Feedback Portal</CardTitle>
              <CardDescription className="text-slate-600 text-lg">
                Enter your details to access the feedback system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
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

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="universityName" className="text-slate-700 font-medium">
                      <Building className="inline h-4 w-4 mr-2" />
                      University Name
                    </Label>
                    <Select value={formData.universityName} onValueChange={(value) => handleInputChange('universityName', value)}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500">
                        <SelectValue placeholder="Select your university" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900">
                        {UNIVERSITIES.map((university) => (
                          <SelectItem key={university} value={university} className="hover:bg-blue-50">
                            {university}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rollNumber" className="text-slate-700 font-medium">
                      <Hash className="inline h-4 w-4 mr-2" />
                      Roll Number
                    </Label>
                    <Input
                      id="rollNumber"
                      type="text"
                      value={formData.rollNumber}
                      onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your roll number"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="studentName" className="text-slate-700 font-medium">
                      <User className="inline h-4 w-4 mr-2" />
                      Student Name
                    </Label>
                    <Input
                      id="studentName"
                      type="text"
                      value={formData.studentName}
                      onChange={(e) => handleInputChange('studentName', e.target.value)}
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="text-slate-700 font-medium">
                      <GraduationCap className="inline h-4 w-4 mr-2" />
                      Mobile Number
                    </Label>
                    <Input
                      id="mobile"
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10-digit mobile number"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batch" className="text-slate-700 font-medium">
                    <BookOpen className="inline h-4 w-4 mr-2" />
                    Session Batch
                  </Label>
                  <Select value={formData.batch} onValueChange={(value) => handleInputChange('batch', value)}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500">
                      <SelectValue placeholder="Select your session batch" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      <SelectItem value="ET" className="hover:bg-blue-50">Emerging Technologies (ET)</SelectItem>
                      <SelectItem value="PROMPT_ENGINEERING" className="hover:bg-blue-50">Prompt Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={!isFormValid() || loading}
                  className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-lg py-6 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Accessing Portal...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
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
