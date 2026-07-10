'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Hash, Mail, Phone, BookOpen, GitBranch, Star, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Logo from '@/components/Logo'
import Link from 'next/link'

// This program is a one-time course feedback (no batches, no per-session flow).
// It reuses the existing student feedback tables: all submissions attach to a
// single "institution" row and a single feedback_sessions row of this type.
const PROGRAM_UNIVERSITY_NAME = 'Salesforce Training Program'
const PROGRAM_SESSION_TYPE = 'SALESFORCE'

const RATING_OPTIONS = [
  { value: 'VERY_GOOD', label: 'Very Good', color: 'text-green-600', icon: Star },
  { value: 'GOOD', label: 'Good', color: 'text-blue-600', icon: CheckCircle },
  { value: 'AVERAGE', label: 'Average', color: 'text-yellow-600', icon: AlertCircle },
  { value: 'BAD', label: 'Bad', color: 'text-red-600', icon: XCircle },
]

export default function CourseFeedbackPage() {
  const [formData, setFormData] = useState({
    studentName: '',
    mobile: '',
    email: '',
    rollNumber: '',
    course: '',
    branch: '',
    rating: '',
    pros: '',
    cons: '',
    additionalComments: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [courseSession, setCourseSession] = useState<any | null>(null)

  // Load the single course session up front so we can show the trainer name.
  useEffect(() => {
    const loadCourseSession = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/sessions`)
        const result = await res.json()
        if (result.success) {
          const session = (result.sessions || []).find(
            (s: any) => s.session_type === PROGRAM_SESSION_TYPE
          )
          if (session) setCourseSession(session)
        }
      } catch (err) {
        console.error('Failed to load course session:', err)
      }
    }
    loadCourseSession()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleMobileChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 10)
    setFormData(prev => ({ ...prev, mobile: digitsOnly }))
  }

  const isMobileValid = () => /^\d{10}$/.test(formData.mobile)
  const isEmailValid = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())

  const isFormValid = () => {
    return (
      !!formData.studentName.trim() &&
      isMobileValid() &&
      isEmailValid() &&
      !!formData.rollNumber.trim() &&
      !!formData.course.trim() &&
      !!formData.branch.trim() &&
      !!formData.rating
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isFormValid()) {
      setError('Please fill in all required fields with valid details.')
      return
    }

    setLoading(true)

    try {
      // 1) Register/identify the student (reuses the existing login endpoint).
      const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityName: PROGRAM_UNIVERSITY_NAME,
          rollNumber: formData.rollNumber.trim(),
          studentName: formData.studentName.trim(),
          email: formData.email.trim(),
          mobile: formData.mobile,
          course: formData.course.trim(),
          branch: formData.branch.trim(),
        }),
      })
      const loginResult = await loginResponse.json()

      if (!loginResult.success || !loginResult.student?.id) {
        setError(loginResult.error || 'Could not submit your details. Please try again.')
        setLoading(false)
        return
      }

      // 2) Resolve the single course session for this program (use the one
      //    preloaded on mount; fall back to fetching if it isn't ready yet).
      let session = courseSession
      if (!session) {
        const sessionsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/sessions`)
        const sessionsResult = await sessionsResponse.json()

        if (!sessionsResult.success) {
          setError('Unable to load the feedback form right now. Please try again later.')
          setLoading(false)
          return
        }

        session = (sessionsResult.sessions || []).find(
          (s: any) => s.session_type === PROGRAM_SESSION_TYPE
        )
      }

      if (!session) {
        setError('This feedback form is not available yet. Please contact your administrator.')
        setLoading(false)
        return
      }

      // 3) Submit the one-time course feedback.
      const feedbackResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: loginResult.student.id,
          sessionId: session.id,
          rating: formData.rating,
          pros: formData.pros.trim(),
          cons: formData.cons.trim(),
          additionalComments: formData.additionalComments.trim(),
        }),
      })
      const feedbackResult = await feedbackResponse.json()

      if (feedbackResult.success) {
        setSubmitted(true)
      } else if (
        typeof feedbackResult.error === 'string' &&
        feedbackResult.error.toLowerCase().includes('already submitted')
      ) {
        // Treat a repeat submission for the same roll number as done.
        setSubmitted(true)
      } else {
        setError(feedbackResult.error || 'Failed to submit feedback. Please try again.')
      }
    } catch (err) {
      console.error('Course feedback submit error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#ECF2FF]">
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

        <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
          <Card className="bg-white border-2 border-[#D6D6D6] rounded-lg shadow-sm text-center">
            <CardContent className="p-8 sm:p-12">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">Thank You!</h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto">
                Your feedback for the Salesforce Training Program has been submitted successfully.
                We truly appreciate you taking the time to help us improve.
              </p>
              <div className="mt-8">
                <Link href="/">
                  <Button className="bg-[#008260] hover:bg-[#006d51] text-white font-medium px-8 py-6 rounded-lg">
                    Go to Homepage
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
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

      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto py-10 sm:py-16">
          {/* Hero */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#008260] rounded-full flex items-center justify-center shadow-lg">
                <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3 sm:mb-4 leading-tight">
              Salesforce Training
              <span className="text-[#008260]"> Feedback</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Now that the course is complete, share your experience with us. Your feedback helps us
              improve future training programs.
            </p>
            {courseSession?.expert_name && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#008260]/10 px-4 py-2 text-sm sm:text-base font-medium text-[#008260]">
                <User className="h-4 w-4" />
                <span>Trainer: {courseSession.expert_name}</span>
              </div>
            )}
          </div>

          <Card className="bg-white border-2 border-[#D6D6D6] rounded-lg shadow-sm">
            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Course Feedback Form</CardTitle>
              <CardDescription className="text-slate-600 text-sm sm:text-base">
                Please fill in your details and rate the course
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 lg:p-8">
              {error && (
                <Alert className="mb-6 border-red-200 bg-red-50 text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Student details */}
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
                      <Phone className="inline h-4 w-4 mr-2" />
                      Phone Number
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

                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 font-medium text-sm sm:text-base">
                      <Mail className="inline h-4 w-4 mr-2" />
                      Email ID
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260]"
                      placeholder="you@example.com"
                    />
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
                    <Label htmlFor="course" className="text-slate-700 font-medium text-sm sm:text-base">
                      <BookOpen className="inline h-4 w-4 mr-2" />
                      Course
                    </Label>
                    <Input
                      id="course"
                      type="text"
                      value={formData.course}
                      onChange={(e) => handleInputChange('course', e.target.value)}
                      className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260]"
                      placeholder="e.g. B.Tech"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branch" className="text-slate-700 font-medium text-sm sm:text-base">
                      <GitBranch className="inline h-4 w-4 mr-2" />
                      Branch
                    </Label>
                    <Input
                      id="branch"
                      type="text"
                      value={formData.branch}
                      onChange={(e) => handleInputChange('branch', e.target.value)}
                      className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260]"
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
                  {/* Rating */}
                  <div className="space-y-3">
                    <Label className="text-sm sm:text-base font-medium text-slate-900">
                      How would you rate this course?
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {RATING_OPTIONS.map((option) => {
                        const Icon = option.icon
                        return (
                          <div key={option.value} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={`rating-${option.value}`}
                              name="course-rating"
                              value={option.value}
                              checked={formData.rating === option.value}
                              onChange={(e) => handleInputChange('rating', e.target.value)}
                              className="h-4 w-4 text-[#008260] border-[#D6D6D6] focus:ring-[#008260] bg-white"
                            />
                            <label
                              htmlFor={`rating-${option.value}`}
                              className={`flex items-center space-x-2 cursor-pointer ${option.color} text-sm sm:text-base`}
                            >
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              <span className="text-slate-900">{option.label}</span>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Pros */}
                  <div className="space-y-2">
                    <Label htmlFor="pros" className="text-sm sm:text-base text-slate-900">
                      What did you like about this course?
                    </Label>
                    <Textarea
                      id="pros"
                      placeholder="Share the positive aspects..."
                      value={formData.pros}
                      onChange={(e) => handleInputChange('pros', e.target.value)}
                      rows={3}
                      className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260] text-sm sm:text-base"
                    />
                  </div>

                  {/* Cons */}
                  <div className="space-y-2">
                    <Label htmlFor="cons" className="text-sm sm:text-base text-slate-900">
                      What could be improved?
                    </Label>
                    <Textarea
                      id="cons"
                      placeholder="Share areas for improvement..."
                      value={formData.cons}
                      onChange={(e) => handleInputChange('cons', e.target.value)}
                      rows={3}
                      className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260] text-sm sm:text-base"
                    />
                  </div>

                  {/* Additional comments */}
                  <div className="space-y-2">
                    <Label htmlFor="additionalComments" className="text-sm sm:text-base text-slate-900">
                      Additional Comments (Optional)
                    </Label>
                    <Textarea
                      id="additionalComments"
                      placeholder="Any other feedback or suggestions..."
                      value={formData.additionalComments}
                      onChange={(e) => handleInputChange('additionalComments', e.target.value)}
                      rows={2}
                      className="bg-white border-[#D6D6D6] text-slate-900 placeholder:text-slate-400 focus:ring-[#008260] focus:border-[#008260] text-sm sm:text-base"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!isFormValid() || loading}
                  className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-medium sm:font-bold text-base sm:text-lg py-5 sm:py-6 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    <span>Submit Feedback</span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
