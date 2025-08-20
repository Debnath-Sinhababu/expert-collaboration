'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraduationCap, User, Hash, Building } from 'lucide-react'
import Logo from '@/components/Logo'

const UNIVERSITIES = [
  'Delhi University',
  'Jawaharlal Nehru University',
  'Ambedkar University Delhi',
  'Delhi Technological University',
  'Netaji Subhas University of Technology',
  'Guru Gobind Singh Indraprastha University',
  'Delhi Skill and Entrepreneurship University',
  'Other'
]

export default function StudentFeedbackPage() {
  const [formData, setFormData] = useState({
    universityName: '',
    rollNumber: '',
    studentName: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [studentData, setStudentData] = useState(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!formData.universityName || !formData.rollNumber || !formData.studentName) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch('http://localhost:8000/api/student/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        // Store student data in localStorage for session management
        localStorage.setItem('studentData', JSON.stringify(result.student))
        localStorage.setItem('universityData', JSON.stringify(result.university))
        
        // Check if student has already submitted feedback
        const checkFeedbackStatus = async () => {
          try {
            const sessionsResponse = await fetch('http://localhost:8000/api/student/sessions')
            const sessionsResult = await sessionsResponse.json()
            
            if (sessionsResult.success) {
              const statusResponse = await fetch(`http://localhost:8000/api/student/feedback-status?studentId=${result.student.id}`)
              const statusResult = await statusResponse.json()
              
              if (statusResult.success && statusResult.submittedSessions.length >= sessionsResult.sessions.length) {
                // All feedback already submitted, redirect to completion page
                setSuccess('Login successful! Redirecting to completion page...')
                setTimeout(() => {
                  window.location.href = '/student-feedback/complete'
                }, 1500)
              } else {
                // Not all feedback submitted, redirect to form
                setSuccess('Login successful! Redirecting to feedback form...')
                setTimeout(() => {
                  window.location.href = '/student-feedback/form'
                }, 1500)
              }
            } else {
              // Fallback to form if sessions can't be loaded
              setSuccess('Login successful! Redirecting to feedback form...')
              setTimeout(() => {
                window.location.href = '/student-feedback/form'
              }, 1500)
            }
          } catch (error) {
            // Fallback to form if there's an error
            setSuccess('Login successful! Redirecting to feedback form...')
            setTimeout(() => {
              window.location.href = '/student-feedback/form'
            }, 1500)
          }
        }
        
        checkFeedbackStatus()
        setStudentData(result.student)
        setIsLoggedIn(true)
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-green-600 font-medium">Redirecting to feedback form...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Feedback Portal</h1>
          <p className="text-gray-600">Provide feedback for ET and Prompt Engineering sessions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <span>Student Login</span>
            </CardTitle>
            <CardDescription>
              Enter your details to access the feedback forms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="universityName" className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>University Name *</span>
                </Label>
                <Select 
                  value={formData.universityName} 
                  onValueChange={(value) => handleInputChange('universityName', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your university" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIVERSITIES.map((university) => (
                      <SelectItem key={university} value={university}>
                        {university}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollNumber" className="flex items-center space-x-2">
                  <Hash className="h-4 w-4" />
                  <span>Roll Number *</span>
                </Label>
                <Input
                  id="rollNumber"
                  placeholder="Enter your roll number"
                  value={formData.rollNumber}
                  onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentName" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Student Name *</span>
                </Label>
                <Input
                  id="studentName"
                  placeholder="Enter your full name"
                  value={formData.studentName}
                  onChange={(e) => handleInputChange('studentName', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login & Access Feedback'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                This portal is for students to provide feedback on ET and Prompt Engineering sessions.
                <br />
                <span className="font-medium">You will be redirected to the feedback form after login.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
