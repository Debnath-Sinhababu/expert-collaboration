'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, GraduationCap, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback Complete!</h1>
          <p className="text-gray-600">Thank you for your valuable feedback</p>
        </div>

        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-600 mb-2">
              All Feedback Submitted Successfully!
            </CardTitle>
            <CardDescription className="text-lg">
              Your feedback has been recorded and will help improve future sessions
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Student Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Student Information</span>
              </div>
              <p className="text-blue-800">
                <strong>{studentData.student_name}</strong> from <strong>{universityData.name}</strong>
              </p>
              <p className="text-blue-700 text-sm">Roll Number: {studentData.roll_number}</p>
            </div>

            {/* What Happens Next */}
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <h3 className="font-medium text-gray-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Your feedback will be analyzed by our team</li>
                <li>• Session improvements will be implemented based on student input</li>
                <li>• Future sessions will be enhanced using your valuable suggestions</li>
                <li>• You cannot resubmit feedback for the same sessions</li>
              </ul>
            </div>

            {/* Important Note */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> You have completed all feedback forms. 
                You cannot revisit or resubmit feedback for these sessions.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <GraduationCap className="h-4 w-4" />
                <span>Submit Another Feedback</span>
              </Button>
              
              <Button
                onClick={handleGoHome}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Home className="h-4 w-4" />
                <span>Go to Homepage</span>
              </Button>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Thank you for participating in our feedback program. 
                Your input helps us create better learning experiences for all students.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
