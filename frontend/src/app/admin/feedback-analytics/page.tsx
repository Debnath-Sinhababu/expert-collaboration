'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  PieChart, 
  Users, 
  TrendingUp, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Download,
  RefreshCw
} from 'lucide-react'
import Logo from '@/components/Logo'

interface AnalyticsData {
  totalSubmissions: number
  overallPercentages: Record<string, string>
  ratingCounts: Record<string, number>
  sessionTypeStats: Record<string, any>
  recentFeedback: any[]
}

export default function FeedbackAnalyticsPage() {
  const [email, setEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (email !== 'debnathsinhababu2017@gmail.com') {
      setError('Access denied. Only authorized users can view analytics.')
      return
    }

    setIsAuthenticated(true)
    loadAnalytics()
  }

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/admin/feedback-analytics', {
        headers: {
          'Authorization': `Bearer ${email}` // Using email as token for simplicity
        }
      })

      const result = await response.json()

      if (result.success) {
        setAnalytics(result.analytics)
      } else {
        setError(result.error || 'Failed to load analytics')
      }
    } catch (error) {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'VERY_GOOD': return 'bg-green-100 text-green-800 border-green-200'
      case 'GOOD': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'AVERAGE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'BAD': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'VERY_GOOD': return <Star className="h-4 w-4" />
      case 'GOOD': return <CheckCircle className="h-4 w-4" />
      case 'AVERAGE': return <AlertCircle className="h-4 w-4" />
      case 'BAD': return <XCircle className="h-4 w-4" />
      default: return null
    }
  }

  const exportData = () => {
    if (!analytics) return

    const dataStr = JSON.stringify(analytics, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `feedback-analytics-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Access</h1>
            <p className="text-gray-600">Enter your email to access feedback analytics</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Authentication Required</span>
              </CardTitle>
              <CardDescription>
                Only authorized administrators can view feedback analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuthenticate} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Access Analytics
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Logo size="lg" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feedback Analytics Dashboard</h1>
              <p className="text-gray-600">Comprehensive analysis of student feedback</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button onClick={loadAnalytics} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        )}

        {analytics && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalSubmissions}</div>
                  <p className="text-xs text-muted-foreground">
                    Student feedback responses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Very Good</CardTitle>
                  <Star className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.overallPercentages.VERY_GOOD}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.ratingCounts.VERY_GOOD} responses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Good</CardTitle>
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.overallPercentages.GOOD}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.ratingCounts.GOOD} responses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average & Below</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {((parseFloat(analytics.overallPercentages.AVERAGE) + parseFloat(analytics.overallPercentages.BAD))).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.ratingCounts.AVERAGE + analytics.ratingCounts.BAD} responses
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Rating Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5" />
                    <span>Overall Rating Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.overallPercentages).map(([rating, percentage]) => (
                      <div key={rating} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getRatingIcon(rating)}
                          <span className="capitalize">{rating.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getRatingColor(rating).split(' ')[0]}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Session Type Breakdown</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.sessionTypeStats).map(([sessionType, stats]) => (
                      <div key={sessionType} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {sessionType === 'ET' ? 'Emerging Technologies' : 'Prompt Engineering'}
                          </span>
                          <Badge variant="secondary">{stats.total} responses</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          {Object.entries(stats.ratings).map(([rating, count]) => (
                            <div key={rating} className="text-center">
                              <div className={`p-2 rounded ${getRatingColor(rating)}`}>
                                {count}
                              </div>
                              <div className="text-xs mt-1 capitalize">
                                {rating.replace('_', ' ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Recent Feedback</span>
                </CardTitle>
                <CardDescription>
                  Latest student feedback submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.recentFeedback.map((feedback, index) => (
                    <div key={feedback.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Badge className={getRatingColor(feedback.rating)}>
                            {feedback.rating.replace('_', ' ')}
                          </Badge>
                          <span className="font-medium">
                            {feedback.students?.student_name || 'Unknown Student'}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({feedback.students?.universities?.name || 'Unknown University'})
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(feedback.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        <span className="text-sm font-medium">Session: </span>
                        <span className="text-sm text-gray-600">
                          {feedback.feedback_sessions?.session_type === 'ET' ? 'Emerging Technologies' : 'Prompt Engineering'} - {feedback.feedback_sessions?.topic}
                        </span>
                      </div>

                      {feedback.pros && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-green-700">Pros: </span>
                          <span className="text-sm text-gray-600">{feedback.pros}</span>
                        </div>
                      )}

                      {feedback.cons && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-red-700">Cons: </span>
                          <span className="text-sm text-gray-600">{feedback.cons}</span>
                        </div>
                      )}

                      {feedback.additional_comments && (
                        <div>
                          <span className="text-sm font-medium text-blue-700">Comments: </span>
                          <span className="text-sm text-gray-600">{feedback.additional_comments}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
