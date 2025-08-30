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

    const student = JSON.parse(storedStudentData) as any
    const university = JSON.parse(storedUniversityData)
    
    setStudentData(student)
    setUniversityData(university)

    // Load available sessions and feedback status
    loadSessionsAndCheckStatus(student.id, student.batch || null)
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

  const loadSessionsAndCheckStatus = async (studentId: string, batch: 'ET' | 'PROMPT_ENGINEERING' | null) => {
    try {
      // Load sessions first
      const sessionsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/sessions`)
      const sessionsResult = await sessionsResponse.json()
      
      if (sessionsResult.success) {
        const allSessions: Session[] = sessionsResult.sessions
        const filtered = batch ? allSessions.filter((s: Session) => s.session_type === batch) : allSessions
        setSessions(filtered)
        
        // Now load feedback status
        const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/feedback-status?studentId=${studentId}`)
        const statusResult = await statusResponse.json()
        
        if (statusResult.success) {
          setSubmittedSessions(statusResult.submittedSessions)
          
          // If any submission exists, redirect to completion (single submission total)
          if (Array.isArray(statusResult.submittedSessions) && statusResult.submittedSessions.length > 0) {
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

    // Prevent submission if student's batch does not match this session's type
    const current = sessions.find(s => s.id === sessionId)
    const studentBatch = (studentData as any)?.batch as 'ET' | 'PROMPT_ENGINEERING' | undefined
    if (current && studentBatch && current.session_type !== studentBatch) {
      router.push('/student-feedback/complete')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/feedback`, {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading your feedback sessions...</p>
        </div>
      </div>
    )
  }

  const currentSession = getCurrentSession()
  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 bg-white/10 backdrop-blur-xl shadow-2xl border border-white/20">
          <CardContent className="p-6 text-center">
            <p className="text-slate-300">Loading sessions...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCurrentSessionCompleted = isSessionCompleted(currentSession.session_type)
  const isLastSession = currentSessionIndex === sessions.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden p-4">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Session Feedback Form</h1>
          <p className="text-slate-300">
            Welcome, {studentData.student_name} from {universityData.name}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-300">
              Session {currentSessionIndex + 1} of {sessions.length}
            </span>
            <span className="text-sm text-slate-400">
              {sessions.filter(s => isSessionCompleted(s.session_type)).length} completed
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSessionIndex + 1) / sessions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Session Cards */}
        <div className="grid gap-6 mb-8">
          {sessions.map((session, index) => (
            <Card 
              key={session.id} 
              className={`transition-all duration-300 border-0 ${
                index === currentSessionIndex 
                  ? 'ring-2 ring-blue-500 shadow-2xl bg-white/15 backdrop-blur-xl' 
                  : 'opacity-60 bg-white/10 backdrop-blur-sm'
              } ${
                isSessionCompleted(session.session_type) 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'border-white/20'
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5 text-blue-400" />
                    <span>{session.session_type === 'ET' ? 'Emerging Technologies' : 'Prompt Engineering'}</span>
                  </span>
                  {isSessionCompleted(session.session_type) && (
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  )}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  {session.topic} - {session.expert_name}
                </CardDescription>
              </CardHeader>
               
              {index === currentSessionIndex && !isSessionCompleted(session.session_type) && (
                <CardContent className="space-y-6">
                  {/* Rating Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium text-white">How would you rate this session?</Label>
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
                              className="h-4 w-4 text-blue-500 border-slate-400 focus:ring-blue-500 bg-slate-700"
                            />
                            <label 
                              htmlFor={`${session.id}-${option.value}`}
                              className={`flex items-center space-x-2 cursor-pointer ${option.color}`}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="text-white">{option.label}</span>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Pros */}
                  <div className="space-y-2">
                    <Label htmlFor={`pros-${session.id}`} className="text-white">What did you like about this session?</Label>
                    <Textarea
                      id={`pros-${session.id}`}
                      placeholder="Share the positive aspects..."
                      value={feedbackData[session.id]?.pros || ''}
                      onChange={(e) => handleFeedbackChange(session.id, 'pros', e.target.value)}
                      rows={3}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Cons */}
                  <div className="space-y-2">
                    <Label htmlFor={`cons-${session.id}`} className="text-white">What could be improved?</Label>
                    <Textarea
                      id={`cons-${session.id}`}
                      placeholder="Share areas for improvement..."
                      value={feedbackData[session.id]?.cons || ''}
                      onChange={(e) => handleFeedbackChange(session.id, 'cons', e.target.value)}
                      rows={3}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Additional Comments */}
                  <div className="space-y-2">
                    <Label htmlFor={`comments-${session.id}`} className="text-white">Additional Comments (Optional)</Label>
                    <Textarea
                      id={`comments-${session.id}`}
                      placeholder="Any other feedback or suggestions..."
                      value={feedbackData[session.id]?.additionalComments || ''}
                      onChange={(e) => handleFeedbackChange(session.id, 'additionalComments', e.target.value)}
                      rows={2}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={() => handleSubmitFeedback(session.id)}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-6 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-2 border-blue-400/20 hover:shadow-blue-500/25 hover:-translate-y-1"
                    disabled={loading || !feedbackData[session.id]?.rating}
                  >
                    {loading ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </CardContent>
              )}

              {isSessionCompleted(session.session_type) && (
                <CardContent className="text-center py-6">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">Feedback Submitted</p>
                  <p className="text-sm text-slate-400">Thank you for your feedback!</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <Alert className="mb-4 border-red-500/20 bg-red-500/10 text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-500/20 bg-green-500/10 text-green-200">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
