'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { GraduationCap, Star, CheckCircle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

const RATING_OPTIONS = [
  { value: 'VERY_GOOD', label: 'Very Good', color: 'text-green-600', icon: Star },
  { value: 'GOOD', label: 'Good', color: 'text-blue-600', icon: CheckCircle },
  { value: 'AVERAGE', label: 'Average', color: 'text-yellow-600', icon: Star },
  { value: 'BAD', label: 'Bad', color: 'text-red-600', icon: XCircle }
]

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

interface Session {
  id: string
  session_type: 'ET' | 'PROMPT_ENGINEERING'
  session_date: string
  expert_name: string
  topic: string
}

export default function FeedbackFormPage() {
  const router = useRouter()
  const [studentData, setStudentData] = useState<Student | null>(null)
  const [universityData, setUniversityData] = useState<University | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0)
  const [feedbackData, setFeedbackData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submittedSessions, setSubmittedSessions] = useState<string[]>([])

  useEffect(() => {
    // Check if student is logged in
    const storedStudentData = localStorage.getItem('studentData')
    const storedUniversityData = localStorage.getItem('universityData')
    
    if (!storedStudentData || !storedUniversityData) {
      router.push('/student-feedback')
      return
    }

    const student = JSON.parse(storedStudentData)
    const university = JSON.parse(storedUniversityData)
    
    setStudentData(student)
    setUniversityData(university)
    
    // Load available sessions and feedback status
    loadSessionsAndCheckStatus(student.id)
  }, [router])

  // Additional protection: check on every render if student has completed all feedback
  useEffect(() => {
    if (studentData && sessions.length > 0 && submittedSessions.length > 0) {
      if (submittedSessions.length >= sessions.length) {
        // All feedback completed, redirect to completion page
        router.push('/student-feedback/complete')
      }
    }
  }, [studentData, sessions, submittedSessions, router])

  const loadSessionsAndCheckStatus = async (studentId: string) => {
    try {
      // Load sessions first
      const sessionsResponse = await fetch('http://localhost:8000/api/student/sessions')
      const sessionsResult = await sessionsResponse.json()
      
      if (sessionsResult.success) {
        setSessions(sessionsResult.sessions)
        
        // Now load feedback status
        const statusResponse = await fetch(`http://localhost:8000/api/student/feedback-status?studentId=${studentId}`)
        const statusResult = await statusResponse.json()
        
        if (statusResult.success) {
          setSubmittedSessions(statusResult.submittedSessions)
          
          // Check if student has already completed all sessions
          if (statusResult.submittedSessions.length >= sessionsResult.sessions.length) {
            // All feedback already submitted, redirect to completion page
            router.push('/student-feedback/complete')
            return
          }
        }
      } else {
        setError('Failed to load sessions')
      }
    } catch (error) {
      setError('Failed to load sessions')
    }
  }



  const handleFeedbackChange = (sessionId: string, field: string, value: string) => {
    setFeedbackData(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        [field]: value
      }
    }))
  }

  const handleSubmitFeedback = async (sessionId: string) => {
    const sessionFeedback = feedbackData[sessionId]
    
    if (!sessionFeedback || !sessionFeedback.rating) {
      setError('Please select a rating for this session')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/student/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentData?.id || '',
          sessionId,
          rating: sessionFeedback.rating,
          pros: sessionFeedback.pros || '',
          cons: sessionFeedback.cons || '',
          additionalComments: sessionFeedback.additionalComments || ''
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Feedback submitted successfully!')
        setSubmittedSessions(prev => [...prev, sessions[currentSessionIndex].session_type])
        
        // Move to next session or show completion
        if (currentSessionIndex < sessions.length - 1) {
          setCurrentSessionIndex(prev => prev + 1)
        } else {
          // All sessions completed
          setTimeout(() => {
            router.push('/student-feedback/complete')
          }, 2000)
        }
        
        // Clear current feedback data
        setFeedbackData(prev => {
          const newData = { ...prev }
          delete newData[sessionId]
          return newData
        })
      } else {
        setError(result.error || 'Failed to submit feedback')
      }
    } catch (error) {
      setError('Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentSession = () => {
    if (sessions.length === 0) return null
    return sessions[currentSessionIndex]
  }

  const isSessionCompleted = (sessionType: string) => {
    return submittedSessions.includes(sessionType)
  }

  const getNextUncompletedSession = () => {
    return sessions.findIndex(session => !isSessionCompleted(session.session_type))
  }

  useEffect(() => {
    if (sessions.length > 0) {
      const nextUncompletedIndex = getNextUncompletedSession()
      if (nextUncompletedIndex !== -1) {
        setCurrentSessionIndex(nextUncompletedIndex)
      }
    }
  }, [sessions, submittedSessions])

  if (!studentData || !universityData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const currentSession = getCurrentSession()
  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Loading sessions...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCurrentSessionCompleted = isSessionCompleted(currentSession.session_type)
  const isLastSession = currentSessionIndex === sessions.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Feedback Form</h1>
          <p className="text-gray-600">
            Welcome, {studentData.student_name} from {universityData.name}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              Session {currentSessionIndex + 1} of {sessions.length}
            </span>
            <span className="text-sm text-gray-500">
              {sessions.filter(s => isSessionCompleted(s.session_type)).length} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSessionIndex + 1) / sessions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Session Cards */}
        <div className="grid gap-6 mb-8">
          {sessions.map((session, index) => (
            <Card 
              key={session.id} 
              className={`transition-all duration-300 ${
                index === currentSessionIndex 
                  ? 'ring-2 ring-blue-500 shadow-lg' 
                  : 'opacity-60'
              } ${
                isSessionCompleted(session.session_type) 
                  ? 'bg-green-50 border-green-200' 
                  : ''
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    <span>{session.session_type === 'ET' ? 'Emerging Technologies' : 'Prompt Engineering'}</span>
                  </span>
                  {isSessionCompleted(session.session_type) && (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  )}
                </CardTitle>
                <CardDescription>
                  {session.topic} - {session.expert_name}
                </CardDescription>
              </CardHeader>
              
              {index === currentSessionIndex && !isSessionCompleted(session.session_type) && (
                <CardContent className="space-y-6">
                  {/* Rating Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">How would you rate this session?</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {RATING_OPTIONS.map((option) => {
                        const Icon = option.icon
                        return (
                          <div key={option.value} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={`${session.id}-${option.value}`}
                              name={`rating-${session.id}`}
                              value={option.value}
                              checked={feedbackData[session.id]?.rating === option.value}
                              onChange={(e) => handleFeedbackChange(session.id, 'rating', e.target.value)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <label 
                              htmlFor={`${session.id}-${option.value}`}
                              className={`flex items-center space-x-2 cursor-pointer ${option.color}`}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{option.label}</span>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Pros */}
                  <div className="space-y-2">
                    <Label htmlFor={`pros-${session.id}`}>What did you like about this session?</Label>
                    <Textarea
                      id={`pros-${session.id}`}
                      placeholder="Share the positive aspects..."
                      value={feedbackData[session.id]?.pros || ''}
                      onChange={(e) => handleFeedbackChange(session.id, 'pros', e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Cons */}
                  <div className="space-y-2">
                    <Label htmlFor={`cons-${session.id}`}>What could be improved?</Label>
                    <Textarea
                      id={`cons-${session.id}`}
                      placeholder="Share areas for improvement..."
                      value={feedbackData[session.id]?.cons || ''}
                      onChange={(e) => handleFeedbackChange(session.id, 'cons', e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Additional Comments */}
                  <div className="space-y-2">
                    <Label htmlFor={`comments-${session.id}`}>Additional Comments (Optional)</Label>
                    <Textarea
                      id={`comments-${session.id}`}
                      placeholder="Any other feedback or suggestions..."
                      value={feedbackData[session.id]?.additionalComments || ''}
                      onChange={(e) => handleFeedbackChange(session.id, 'additionalComments', e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={() => handleSubmitFeedback(session.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading || !feedbackData[session.id]?.rating}
                  >
                    {loading ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </CardContent>
              )}

              {isSessionCompleted(session.session_type) && (
                <CardContent className="text-center py-6">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-green-600 font-medium">Feedback Submitted</p>
                  <p className="text-sm text-gray-500">Thank you for your feedback!</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentSessionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentSessionIndex === 0}
          >
            Previous Session
          </Button>

          <Button
            variant="outline"
            onClick={() => setCurrentSessionIndex(prev => Math.min(sessions.length - 1, prev + 1))}
            disabled={currentSessionIndex === sessions.length - 1}
          >
            Next Session
          </Button>
        </div>
      </div>
    </div>
  )
}
