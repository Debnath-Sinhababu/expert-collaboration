'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  RefreshCw,
  MessageSquare,
  Trash2
} from 'lucide-react'
import Logo from '@/components/Logo'
import { toast } from 'sonner'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  statusCounts: Record<string, number>
  statusPercentages: Record<string, string>
  submissionsByDate: Record<string, number>
  recentSubmissions: any[]
  pagination: PaginationInfo
}

export default function ContactAnalyticsPage() {
  const [email, setEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [allSubmissions, setAllSubmissions] = useState<any[]>([])
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({})
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const lastItemObserverRef = useRef<IntersectionObserver | null>(null)

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

  const setLastItemRef = useCallback((node: HTMLDivElement | null) => {
    if (lastItemObserverRef.current) {
      lastItemObserverRef.current.disconnect()
    }
    if (!node || !analytics?.pagination.hasNextPage) return
    lastItemObserverRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !loading && !loadingMore) {
          lastItemObserverRef.current?.disconnect()
          loadAnalytics(currentPage + 1, true)
        }
      },
      {
        rootMargin: '0px 0px 300px 0px',
        threshold: 0.01
      }
    )
    lastItemObserverRef.current.observe(node)
  }, [analytics?.pagination.hasNextPage, currentPage, loading, loadingMore])

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
      setAllSubmissions([])
    }
    
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/contact-analytics?page=${page}&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${email}`
        }
      })

      const result = await response.json()

      if (result.success) {
        if (append) {
          setAllSubmissions(prev => [...prev, ...result.analytics.recentSubmissions])
          setAnalytics(prev => prev ? {
            ...prev,
            recentSubmissions: [...prev.recentSubmissions, ...result.analytics.recentSubmissions],
            pagination: result.analytics.pagination
          } : result.analytics)
        } else {
          setAnalytics(result.analytics)
          setAllSubmissions(result.analytics.recentSubmissions)
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

  const handleStatusUpdate = async (submissionId: string, newStatus: string) => {
    setUpdatingStatus(prev => ({ ...prev, [submissionId]: true }))
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/contact-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${email}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Status updated successfully')
        // Update local state
        setAllSubmissions(prev => prev.map(sub => 
          sub.id === submissionId ? { ...sub, status: newStatus } : sub
        ))
        // Reload analytics to update counts
        loadAnalytics(1, false)
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [submissionId]: false }))
    }
  }

  const handleDelete = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/contact-submissions/${submissionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${email}`
        }
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Submission deleted successfully')
        setAllSubmissions(prev => prev.filter(sub => sub.id !== submissionId))
        loadAnalytics(1, false)
      } else {
        toast.error(result.error || 'Failed to delete submission')
      }
    } catch (error) {
      toast.error('Failed to delete submission')
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-black border-blue-500/30'
      case 'in_progress': return 'bg-yellow-500/20 text-black border-yellow-500/30'
      case 'resolved': return 'bg-green-500/20 text-black border-green-500/30'
      case 'spam': return 'bg-red-500/20 text-black border-red-500/30'
      default: return 'bg-slate-500/20 text-black border-slate-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Mail className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'resolved': return <CheckCircle className="h-4 w-4" />
      case 'spam': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const exportData = () => {
    if (!analytics) return

    const dataStr = JSON.stringify(analytics, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contact-analytics-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center p-4">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="text-3xl font-bold text-[#000000] mb-2">Admin Access</h1>
            <p className="text-[#6A6A6A]">Enter your email to access contact analytics</p>
          </div>

          <Card className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-[#000000]">
                <BarChart3 className="h-5 w-5 text-[#008260]" />
                <span>Authentication Required</span>
              </CardTitle>
              <CardDescription className="text-[#6A6A6A]">
                Only authorized administrators can view contact analytics
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
                  <Label htmlFor="email" className="text-[#000000]">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                  />
                </div>

                <Button type="submit" className="w-full bg-[#008260] hover:bg-[#006B4F] text-white font-bold py-6">
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
    <div className="min-h-screen bg-[#ECF2FF] p-4">
      <div className="max-w-7xl mx-auto">
        <div ref={topSentinelRef} className="h-px" />
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Logo size="lg" />
            <div>
              <h1 className="text-3xl font-bold text-[#000000]">Contact Analytics Dashboard</h1>
              <p className="text-[#6A6A6A] mt-1">Comprehensive analysis of contact form submissions</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={() => loadAnalytics(1, false)} variant="outline" disabled={loading} className="border-[#DCDCDC] bg-white text-[#000000] hover:bg-[#E8F5F1]">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportData} variant="outline" className="border-[#DCDCDC] bg-white text-[#000000] hover:bg-[#E8F5F1]">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-500/20 bg-red-500/10">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && !loadingMore && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
            <p className="text-[#6A6A6A]">Loading analytics...</p>
          </div>
        )}

        {analytics && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#000000]">Total Submissions</CardTitle>
                  <Users className="h-4 w-4 text-[#6A6A6A]" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-2xl font-bold text-[#000000]">{analytics.totalSubmissions}</div>
                  <p className="text-xs text-[#6A6A6A] mt-1">
                    Contact form responses
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#000000]">New</CardTitle>
                  <Mail className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.statusPercentages.new}%
                  </div>
                  <p className="text-xs text-[#6A6A6A] mt-1">
                    {analytics.statusCounts.new} submissions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#000000]">In Progress</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analytics.statusPercentages.in_progress}%
                  </div>
                  <p className="text-xs text-[#6A6A6A] mt-1">
                    {analytics.statusCounts.in_progress} submissions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#000000]">Resolved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.statusPercentages.resolved}%
                  </div>
                  <p className="text-xs text-[#6A6A6A] mt-1">
                    {analytics.statusCounts.resolved} submissions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Submissions */}
            <Card className="bg-white border border-[#E0E0E0] rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-[#000000]">
                  <TrendingUp className="h-5 w-5 text-[#008260]" />
                  <span>Recent Submissions</span>
                </CardTitle>
                <CardDescription className="text-[#6A6A6A]">
                  Latest contact form submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allSubmissions.length === 0 && !loading ? (
                    <div className="text-center py-8 text-[#6A6A6A]">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 text-[#DCDCDC]" />
                      <p>No submissions yet</p>
                    </div>
                  ) : (
                    allSubmissions.map((submission, index) => (
                    <div
                      key={submission.id}
                      className="border border-[#E0E0E0] rounded-xl p-4 bg-white hover:shadow-md transition-all"
                      ref={index === allSubmissions.length - 1 ? setLastItemRef : undefined as any}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(submission.status)}>
                            {getStatusIcon(submission.status)}
                            <span className="ml-1">{submission.status.replace('_', ' ').toUpperCase()}</span>
                          </Badge>
                          <div>
                            <span className="font-medium text-[#000000]">
                              {submission.first_name} {submission.last_name}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-[#6A6A6A]">
                          {new Date(submission.submitted_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-[#6A6A6A]" />
                          <span className="text-[#000000]">{submission.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-[#6A6A6A]" />
                          <span className="text-[#000000]">+91 {submission.phone}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <span className="text-sm font-medium text-[#000000]">Message: </span>
                        <span className="text-sm text-[#6A6A6A]">{submission.message}</span>
                      </div>

                      {submission.notes && (
                        <div className="mb-3 p-2 bg-[#F5F5F5] rounded">
                          <span className="text-sm font-medium text-[#000000]">Notes: </span>
                          <span className="text-sm text-[#6A6A6A]">{submission.notes}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select
                          value={submission.status}
                          onValueChange={(value) => handleStatusUpdate(submission.id, value)}
                          disabled={updatingStatus[submission.id]}
                        >
                          <SelectTrigger className="w-full sm:w-48 border-[#DCDCDC]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="spam">Spam</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(submission.id)}
                          className="border-[#9B0000] text-[#9B0000] hover:bg-[#9B0000] hover:text-white"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                  )}
                  
                  {loadingMore && (
                    <div className="text-center pt-4">
                      <div className="flex items-center justify-center space-x-2 text-[#6A6A6A]">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Loading more...</span>
                      </div>
                    </div>
                  )}
                  
                  {!analytics?.pagination.hasNextPage && allSubmissions.length > 0 && (
                    <div className="text-center pt-4">
                      <div className="text-[#6A6A6A] text-sm">
                        All submissions loaded!
                      </div>
                    </div>
                  )}
                  
                  {analytics?.pagination && (
                    <div className="text-center pt-4 border-t border-[#DCDCDC]">
                      <p className="text-sm text-[#000000]">
                        Showing {allSubmissions.length} of {analytics.pagination.totalItems} submissions
                      </p>
                      <p className="text-xs text-[#6A6A6A] mt-1">
                        Page {analytics.pagination.currentPage} of {analytics.pagination.totalPages}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
        
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 bg-[#008260] hover:bg-[#006B4F] text-white p-3 rounded-full shadow-md transition-all z-50"
            aria-label="Scroll to top"
          >
            <TrendingUp className="h-5 w-5 rotate-180" />
          </button>
        )}
      </div>
    </div>
  )
}

