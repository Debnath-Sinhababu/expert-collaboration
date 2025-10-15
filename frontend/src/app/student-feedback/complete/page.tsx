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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading completion page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-green-300/10 to-emerald-300/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <Logo size="lg" />
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
          {/* Success Header */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-md">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Feedback
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent"> Complete!</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Thank you for sharing your valuable feedback! Your input helps us create better learning experiences for all students.
            </p>
          </div>

          {/* Success Message */}
          <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm mb-12">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-slate-900 mb-2">All Feedback Submitted Successfully!</CardTitle>
              <CardDescription className="text-slate-600 text-lg">
                Your feedback has been recorded and will help improve future sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <p className="text-slate-700 text-lg">
                  You have already completed the feedback process for your sessions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Student Information */}
          <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <GraduationCap className="h-6 w-6 text-blue-600" />
                <span>Student Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">Student Name</p>
                    <p className="text-slate-900 font-medium text-lg">{studentData.student_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">University</p>
                    <p className="text-slate-900 font-medium text-lg">{universityData.name}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-slate-700 text-sm">
                  <span className="font-medium text-slate-900">Roll Number:</span> {studentData.roll_number}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* What Happens Next */}
          <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="h-6 w-6 text-green-600" />
                <span>What Happens Next?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-slate-700">Your feedback will be analyzed by our team</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-slate-700">Session improvements will be implemented based on student input</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from.green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-slate-700">Future sessions will be enhanced using your valuable suggestions</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-slate-700">You cannot resubmit feedback for the same sessions</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Note */}
          <Card className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl shadow-sm mb-8">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-700 mb-2">Important Note</h3>
                  <p className="text-yellow-700">
                    You have completed all feedback forms for your sessions. 
                    You cannot revisit or resubmit feedback for these sessions. 
                    If you need to provide feedback for new sessions, please contact your administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleLogout}
              className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-lg px-8 py-6 shadow-sm hover:shadow-md transition-all"
            >
              <GraduationCap className="mr-2 h-5 w-5" />
              Submit Another Feedback
            </Button>
            
            <Button
              onClick={handleGoHome}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg px-8 py-6 shadow-sm hover:shadow-md transition-all"
            >
              <Home className="mr-2 h-5 w-5" />
              Go to Homepage
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-slate-600">
            <p className="text-sm">
              Thank you for participating in our feedback program.{' '}
              <span className="text-green-700">Your input helps us create better learning experiences for all students.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
