'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface AnalyticsData {
  totalSubmissions: number
  overallPercentages: Record<string, string>
  ratingCounts: Record<string, number>
  sessionTypeStats: Record<string, any>
  recentFeedback: any[]
  pagination: PaginationInfo
}

export default function FeedbackAnalyticsPage() {
  const [email, setEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [allFeedback, setAllFeedback] = useState<any[]>([])
  const [showScrollTop, setShowScrollTop] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const lastItemObserverRef = useRef<IntersectionObserver | null>(null)

  // IntersectionObserver for scroll-to-top visibility
  useEffect(() => {
    if (!topSentinelRef.current) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        setShowScrollTop(!entry.isIntersecting)
      })
    }, { threshold: 0 })
    observer.observe(topSentinelRef.current)
    return () => observer.disconnect()
  }, [])

  // Observe the last rendered feedback item instead of a fixed sentinel
  const setLastItemRef = useCallback((node: HTMLDivElement | null) => {
    if (lastItemObserverRef.current) {
      lastItemObserverRef.current.disconnect()
    }
    if (!node || !analytics?.pagination.hasNextPage) return
    lastItemObserverRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !loading && !loadingMore) {
          // Disconnect to avoid rapid multi-trigger; will reattach to new last item after render
          lastItemObserverRef.current?.disconnect()
          loadAnalytics(currentPage + 1, true)
        }
      },
      {
        // Start preloading shortly before the actual last item reaches the viewport
        rootMargin: '0px 0px 300px 0px',
        threshold: 0.01
      }
    )
    lastItemObserverRef.current.observe(node)
  }, [analytics?.pagination.hasNextPage, currentPage, loading, loadingMore])

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      lastItemObserverRef.current?.disconnect()
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (email !== 'debnathsinhababu2017@gmail.com') {
      setError('Access denied. Only authorized users can view analytics.')
      return
    }

    setIsAuthenticated(true)
    loadAnalytics()
  }

  const loadAnalytics = async (page = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setCurrentPage(1)
      setAllFeedback([])
    }
    
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/feedback-analytics?page=${page}&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${email}` // Using email as token for simplicity
        }
      })

      const result = await response.json()

      if (result.success) {
        if (append) {
          // Append new feedback to existing list
          setAllFeedback(prev => [...prev, ...result.analytics.recentFeedback])
          setAnalytics(prev => prev ? {
            ...prev,
            recentFeedback: [...prev.recentFeedback, ...result.analytics.recentFeedback],
            pagination: result.analytics.pagination
          } : result.analytics)
        } else {
          // Set initial data
          setAnalytics(result.analytics)
          setAllFeedback(result.analytics.recentFeedback)
        }
        setCurrentPage(page)
      } else {
        setError(result.error || 'Failed to load analytics')
      }
    } catch (error) {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'VERY_GOOD': return 'bg-green-500/20 text-black border-green-500/30'
      case 'GOOD': return 'bg-blue-500/20 text-black border-blue-500/30'
      case 'AVERAGE': return 'bg-yellow-500/20 text-black border-yellow-500/30'
      case 'BAD': return 'bg-red-500/20 text-black border-red-500/30'
      default: return 'bg-slate-500/20 text-black border-slate-500/30'
    }
  }

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'VERY_GOOD': return <Star className="h-4 w-4" />
      case 'GOOD': return <CheckCircle className="h-4 w-4" />
      case 'AVERAGE': return <AlertCircle className="h-4 w-4" />
      case 'BAD': return <XCircle className="h-4 w-4" />
      default: return <></>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden flex items-center justify-center p-4">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-300/10 to-indigo-300/10 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-md px-4 relative z-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Admin Access</h1>
            <p className="text-sm sm:text-base text-slate-600">Enter your email to access feedback analytics</p>
          </div>

          <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-slate-900">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Authentication Required</span>
              </CardTitle>
              <CardDescription className="text-slate-600">
                Only authorized administrators can view feedback analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuthenticate} className="space-y-4">
                {error && (
                  <Alert className="border-red-200 bg-red-50 text-red-700">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold py-6 shadow-sm hover:shadow-md transition-all">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden p-3 sm:p-4">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-300/10 to-indigo-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div ref={topSentinelRef} className="h-px" />
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Logo size="lg" />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">Feedback Analytics Dashboard</h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1">Comprehensive analysis of student feedback</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button onClick={() => loadAnalytics(1, false)} variant="outline" disabled={loading} className="w-full sm:w-auto border-slate-300 bg-white text-slate-700 hover:bg-blue-50 hover:text-slate-900">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">🔄</span>
            </Button>
            <Button onClick={exportData} variant="outline" className="w-full sm:w-auto border-slate-300 bg-white text-slate-700 hover:bg-blue-50 hover:text-slate-900">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export Data</span>
              <span className="sm:hidden">📥</span>
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-500/20 bg-red-500/10 text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500/30 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading analytics...</p>
          </div>
        )}

        {analytics && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-slate-900">Total Submissions</CardTitle>
                  <Users className="h-4 w-4 text-slate-600 flex-shrink-0" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">{analytics.totalSubmissions}</div>
                  <p className="text-xs text-slate-600 mt-1">
                    Student feedback responses
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-slate-900">Very Good</CardTitle>
                  <Star className="h-4 w-4 text-green-600 flex-shrink-0" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {analytics.overallPercentages.VERY_GOOD}%
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {analytics.ratingCounts.VERY_GOOD} responses
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-slate-900">Good</CardTitle>
                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {analytics.overallPercentages.GOOD}%
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {analytics.ratingCounts.GOOD} responses
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-slate-900">Average & Below</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                    {((parseFloat(analytics.overallPercentages.AVERAGE) + parseFloat(analytics.overallPercentages.BAD))).toFixed(1)}%
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {analytics.ratingCounts.AVERAGE + analytics.ratingCounts.BAD} responses
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Rating Distribution */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-900">
                    <PieChart className="h-5 w-5 text-slate-700" />
                    <span>Overall Rating Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.overallPercentages).map(([rating, percentage]) => (
                      <div key={rating} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getRatingIcon(rating)}
                          <span className="capitalize text-slate-900">{rating.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-16 sm:w-24 bg-slate-200 rounded-full h-2 flex-shrink-0">
                            <div 
                              className={`h-2 rounded-full ${getRatingColor(rating).split(' ')[0] || 'bg-slate-500/20'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-8 sm:w-12 text-right flex-shrink-0 text-slate-900">{percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-900">
                    <BarChart3 className="h-5 w-5 text-slate-700" />
                    <span>Session Type Breakdown</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.sessionTypeStats).map(([sessionType, stats]) => (
                      <div key={sessionType} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">
                            {sessionType === 'ET' ? 'Emerging Technologies' : 'Prompt Engineering'}
                          </span>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">{stats.total} responses</Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {Object.entries(stats.ratings).map(([rating, count]) => (
                            <div key={rating} className="text-center">
                              <div className={`p-1 sm:p-2 rounded text-xs sm:text-sm ${getRatingColor(rating)}`}>
                                {String(count)}
                              </div>
                              <div className="text-xs mt-1 capitalize truncate text-slate-600">
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
            <Card className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-900">
                  <TrendingUp className="h-5 w-5 text-slate-700" />
                  <span>Recent Feedback</span>
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Latest student feedback submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {allFeedback.length === 0 && !loading ? (
                    <div className="text-center py-8 text-slate-600">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                      <p>No feedback submissions yet</p>
                      <p className="text-sm">Feedback will appear here once students start submitting</p>
                    </div>
                  ) : (
                    allFeedback.map((feedback, index) => (
                    <div
                      key={feedback.id}
                      className="border-2 border-slate-200 rounded-lg p-3 sm:p-4 bg-white"
                      ref={index === allFeedback.length - 1 ? setLastItemRef : undefined as any}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                          <Badge className={getRatingColor(feedback.rating)}>
                            {feedback.rating.replace('_', ' ')}
                          </Badge>
                          <div className="min-w-0">
                            <span className="font-medium block truncate text-slate-900">
                              {feedback.students?.student_name || 'Unknown Student'}
                            </span>
                            <span className="text-sm text-slate-600 block truncate">
                              ({feedback.students?.universities?.name || 'Unknown University'})
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-slate-600 flex-shrink-0">
                          {new Date(feedback.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="mb-2">
                        <span className="text-sm font-medium text-slate-900">Session: </span>
                        <span className="text-sm text-slate-600 break-words">
                          {feedback.feedback_sessions?.session_type === 'ET' ? 'Emerging Technologies' : 'Prompt Engineering'} - {feedback.feedback_sessions?.topic}
                        </span>
                      </div>

                      {feedback.pros && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-green-700">Pros: </span>
                          <span className="text-sm text-slate-700 break-words">{feedback.pros}</span>
                        </div>
                      )}

                      {feedback.cons && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-red-700">Cons: </span>
                          <span className="text-sm text-slate-700 break-words">{feedback.cons}</span>
                        </div>
                      )}

                      {feedback.additional_comments && (
                        <div>
                          <span className="text-sm font-medium text-blue-700">Comments: </span>
                          <span className="text-sm text-slate-700 break-words">{feedback.additional_comments}</span>
                        </div>
                      )}
                    </div>
                  ))
                  )}
                  

                  
                  {/* Loading More Indicator */}
                  {loadingMore && (
                    <div className="text-center pt-4">
                      <div className="flex items-center justify-center space-x-2 text-slate-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Loading more feedback...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* No More Feedback Message */}
                  {!analytics?.pagination.hasNextPage && allFeedback.length > 0 && (
                    <div className="text-center pt-4">
                      <div className="text-slate-400 text-sm">
                        🎉 All feedback has been loaded!
                      </div>
                    </div>
                  )}
                  
                  {/* Pagination Info */}
                  {analytics?.pagination && (
                    <div className="text-center pt-4 border-t border-slate-200">
                      <p className="text-sm text-slate-700">
                        Showing {allFeedback.length} of {analytics.pagination.totalItems} feedback submissions
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Page {analytics.pagination.currentPage} of {analytics.pagination.totalPages}
                      </p>
                    </div>
                  )}
                  
                  {/* Intersection Observer Sentinel */}
                  <div ref={sentinelRef} className="h-4 w-full flex items-center justify-center">
                    {analytics?.pagination.hasNextPage && !loadingMore && (
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin opacity-50" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
        
        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white p-3 rounded-full shadow-sm hover:shadow-md transition-all z-50"
            aria-label="Scroll to top"
          >
            <TrendingUp className="h-5 w-5 rotate-180" />
          </button>
        )}
      </div>
    </div>
  )
}
