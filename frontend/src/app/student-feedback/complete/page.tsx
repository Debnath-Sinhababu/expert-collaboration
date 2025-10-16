'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, GraduationCap, Home, Star, Award, Shield, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import Link from 'next/link'

interface Student {
  id: string
  student_name: string
  roll_number: string
  email?: string
}

interface University {
  id: string
  name: string
  code: string
}

export default function FeedbackCompletePage() {
  const router = useRouter()
  const [studentData, setStudentData] = useState<Student | null>(null)
  const [universityData, setUniversityData] = useState<University | null>(null)

  useEffect(() => {
    // Get student data from localStorage
    const storedStudentData = localStorage.getItem('studentData')
    const storedUniversityData = localStorage.getItem('universityData')
    
    if (storedStudentData && storedUniversityData) {
      setStudentData(JSON.parse(storedStudentData))
      setUniversityData(JSON.parse(storedUniversityData))
    } else {
      // Redirect if no student data
      router.push('/student-feedback')
    }
  }, [router])

  const handleLogout = () => {
    // Clear student data
    localStorage.removeItem('studentData')
    localStorage.removeItem('universityData')
    
    // Redirect to student login (this will allow them to login with different credentials)
    router.push('/student-feedback')
  }

  const handleGoHome = () => {
    // Clear student data and go to main page
    localStorage.removeItem('studentData')
    localStorage.removeItem('universityData')
    router.push('/')
  }

  if (!studentData || !universityData) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#008260]/30 border-t-[#008260] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading completion page...</p>
        </div>
      </div>
    )
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
          {/* Success Header */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#008260] rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight px-4">
              Feedback
              <span className="text-[#008260]"> Complete!</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed px-4">
              Thank you for sharing your valuable feedback! Your input helps us create better learning experiences for all students.
            </p>
          </div>

          {/* Success Message */}
          <Card className="bg-white border-2 border-[#D6D6D6] rounded-lg shadow-sm mb-8 sm:mb-12">
            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2">All Feedback Submitted Successfully!</CardTitle>
              <CardDescription className="text-slate-600 text-sm sm:text-base lg:text-lg">
                Your feedback has been recorded and will help improve future sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#008260] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </div>
                <p className="text-slate-700 text-base sm:text-lg">
                  You have already completed the feedback process for your sessions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Student Information */}
          <Card className="bg-white border-2 border-[#D6D6D6] rounded-lg shadow-sm mb-6 sm:mb-8">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-[#008260] flex-shrink-0" />
                <span>Student Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#008260] rounded-lg flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-600 text-xs sm:text-sm">Student Name</p>
                    <p className="text-slate-900 font-medium text-sm sm:text-base lg:text-lg truncate">{studentData.student_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#008260] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-600 text-xs sm:text-sm">University</p>
                    <p className="text-slate-900 font-medium text-sm sm:text-base lg:text-lg truncate">{universityData.name}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 sm:p-4 bg-[#008260]/10 rounded-lg border border-[#008260]/20">
                <p className="text-slate-700 text-xs sm:text-sm">
                  <span className="font-medium text-slate-900">Roll Number:</span> {studentData.roll_number}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* What Happens Next */}
          <Card className="bg-white border-2 border-[#D6D6D6] rounded-lg shadow-sm mb-6 sm:mb-8">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-[#008260] flex-shrink-0" />
                <span>What Happens Next?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#008260] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-slate-700 text-sm sm:text-base">Your feedback will be analyzed by our team</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#008260] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-slate-700 text-sm sm:text-base">Session improvements will be implemented based on student input</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#008260] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-slate-700 text-sm sm:text-base">Future sessions will be enhanced using your valuable suggestions</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#008260] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-slate-700 text-sm sm:text-base">You cannot resubmit feedback for the same sessions</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Note */}
          <Card className="bg-yellow-50 border-2 border-yellow-200 rounded-lg shadow-sm mb-6 sm:mb-8">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-yellow-700 mb-2">Important Note</h3>
                  <p className="text-yellow-700 text-xs sm:text-sm">
                    You have completed all feedback forms for your sessions. 
                    You cannot revisit or resubmit feedback for these sessions. 
                    If you need to provide feedback for new sessions, please contact your administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button
              onClick={handleLogout}
              className="bg-[#008260] hover:bg-[#006d51] text-white font-medium sm:font-bold text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <GraduationCap className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Submit Another Feedback
            </Button>
            
            <Button
              onClick={handleGoHome}
              className="bg-[#008260] hover:bg-[#006d51] text-white font-medium sm:font-bold text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Home className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Go to Homepage
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 sm:mt-12 text-slate-600 px-4">
            <p className="text-xs sm:text-sm">
              Thank you for participating in our feedback program.{' '}
              <span className="text-[#008260] font-medium">Your input helps us create better learning experiences for all students.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
