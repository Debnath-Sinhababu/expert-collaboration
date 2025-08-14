'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { usePagination } from '@/hooks/usePagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Users, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  Star
} from 'lucide-react'

interface ProjectApplicationsProps {
  projectId: string
  projectTitle: string
  onClose: () => void
  pageSize?: number
  institutionId: string
}

export default function ProjectApplications({ projectId, projectTitle, onClose, pageSize = 20, institutionId }: ProjectApplicationsProps) {
  const [applications, setApplications] = useState<any[]>([])
  const [expertDetails, setExpertDetails] = useState<Record<string, any>>({})
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loadingExperts, setLoadingExperts] = useState<Record<string, boolean>>({})
  const [processingApplications, setProcessingApplications] = useState<Record<string, boolean>>({})

  const fetchApplications = useCallback(async (page: number) => {
    try {
      const response = await api.applications.getAll({ 
        project_id: projectId, 
        status: 'pending',
        page,
        limit: pageSize
      })
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error('Error fetching applications:', error)
      return []
    }
  }, [projectId, pageSize])

  const {
    data: applicationsData,
    loading: applicationsLoading,
    hasMore: hasMoreApplications,
    loadMore: loadMoreApplications,
    refresh: refreshApplications
  } = usePagination(fetchApplications, [projectId])

  const fetchExpertDetails = useCallback(async (expertId: string) => {
    if (expertDetails[expertId]) return // Already fetched
    
    setLoadingExperts(prev => ({ ...prev, [expertId]: true }))
    try {
      const expertData = await api.experts.getById(expertId)
      setExpertDetails(prev => ({ ...prev, [expertId]: expertData }))
    } catch (error) {
      console.error('Error fetching expert details:', error)
    } finally {
      setLoadingExperts(prev => ({ ...prev, [expertId]: false }))
    }
  }, [expertDetails])

  useEffect(() => {
    if (applicationsData && Array.isArray(applicationsData)) {
      setApplications(applicationsData)
      // Fetch expert details for each application
      applicationsData.forEach((application: any) => {
        if (application.expert_id && !expertDetails[application.expert_id]) {
          fetchExpertDetails(application.expert_id)
        }
      })
    }
  }, [applicationsData, expertDetails, fetchExpertDetails])

  useEffect(() => {
    refreshApplications()
  }, [projectId, refreshApplications])

  const getExpertAggregate = (expertId: string) => {
    const expert = expertDetails[expertId]
    if (!expert) return { rating: 0, completedProjects: 0 }
    
    return { 
      rating: expert.rating || 0, 
      completedProjects: expert.completed_projects || 0 
    }
  }

  const handleApplicationAction = async (applicationId: string, action: 'accept' | 'reject') => {
    try {
      // Set loading state for this application
      setProcessingApplications(prev => ({ ...prev, [applicationId]: true }))
      
      // Update application status
      await api.applications.update(applicationId, { 
        status: action === 'accept' ? 'accepted' : 'rejected',
        reviewed_at: new Date().toISOString()
      })
      
      // If accepting, create a booking
      if (action === 'accept') {
        const application = applications.find(app => app.id === applicationId)
        if (application) {
          const bookingData = {
            expert_id: application.expert_id,
            institution_id: institutionId,
            project_id: application.project_id,
            application_id: applicationId,
            amount: application.proposed_rate || 1000,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
            hours_booked: 1,
            status: 'in_progress',
            payment_status: 'pending'
          }
          
          await api.bookings.create(bookingData)
        }
      }
      
      // Refresh applications after action
      refreshApplications()
      setError('')
      setSuccessMessage(`Application ${action === 'accept' ? 'accepted' : 'rejected'} successfully!`)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error(`Error ${action}ing application:`, error)
      setError(`Failed to ${action} application`)
    } finally {
      // Clear loading state
      setProcessingApplications(prev => ({ ...prev, [applicationId]: false }))
    }
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => setError('')}>Dismiss</Button>
      </div>
    )
  }



  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
            {successMessage}
          </div>
        )}
        
        <div className="space-y-4">
          {applicationsLoading && applications.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No applications found for this project</p>
            </div>
          ) : (
            applications.map((application) => {
              const expert = application.experts
              const project = application.projects
              const expertDetail = expertDetails[application.expert_id]
              const expertAggregate = getExpertAggregate(application.expert_id)

              return (
                <Card key={application.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {expert?.photo_url ? (
                            <img 
                              src={expert.photo_url} 
                              alt={expert.name} 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{expert?.name || 'Unknown Expert'}</h3>
                          <p className="text-sm text-gray-600">${expert?.hourly_rate || 0}/hr</p>
                        </div>
                      </div>
                      <Badge 
                        variant={application.status === 'pending' ? 'secondary' : 'default'}
                        className="capitalize"
                      >
                        {application.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">{expert?.bio || 'No bio available'}</p>
                      </div>
                      
                      {/* Expert Details Grid */}
                      {expertDetail && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Domain Expertise:</span>
                            <p className="font-medium">{expertDetail.domain_expertise || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Hourly Rate:</span>
                            <p className="font-medium">${expert?.hourly_rate || 0}/hr</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Experience:</span>
                            <p className="font-medium">{expertDetail.experience_years || 0} years</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Verification:</span>
                            <Badge variant={expertDetail.is_verified ? "default" : "secondary"} className="ml-1">
                              {expertDetail.is_verified ? 'Verified' : 'Pending'}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-gray-500">Rating:</span>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="font-medium">{expertAggregate.rating}/5</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {expertDetail?.qualifications && (
                        <div>
                          <span className="text-sm text-gray-500">Qualifications:</span>
                          <p className="text-sm mt-1">{expertDetail.qualifications}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Applied {new Date(application.applied_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{expertAggregate.completedProjects} projects completed</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center space-x-1"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View Profile</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{expert?.name || 'Expert Profile'}</DialogTitle>
                                <DialogDescription>Expert Profile Details</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Professional Bio</h4>
                                  <p className="text-sm text-gray-600">{expert?.bio || 'No bio available'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium mb-1">Domain Expertise</h4>
                                    <p className="text-sm">{expertDetail?.domain_expertise || 'Not specified'}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Hourly Rate</h4>
                                    <p className="text-sm">₹{expert?.hourly_rate || 0}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Experience</h4>
                                    <p className="text-sm">{expertDetail?.experience_years || 0} years</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Verification</h4>
                                    <Badge variant={expertDetail?.is_verified ? "default" : "secondary"}>
                                      {expertDetail?.is_verified ? 'Verified' : 'Pending'}
                                    </Badge>
                                  </div>
                                </div>
                                {expertDetail?.qualifications && (
                                  <div>
                                    <h4 className="font-medium mb-1">Qualifications</h4>
                                    <p className="text-sm">{expertDetail.qualifications}</p>
                                  </div>
                                )}
                                <div className="flex items-center space-x-2">
                                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                                  <span className="font-medium">{expertAggregate.rating}/5 rating</span>
                                  <span className="text-gray-500">({expertAggregate.completedProjects} projects completed)</span>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplicationAction(application.id, 'reject')}
                            disabled={processingApplications[application.id]}
                            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {processingApplications[application.id] ? 'Processing...' : 'Reject'}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApplicationAction(application.id, 'accept')}
                            disabled={processingApplications[application.id]}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {processingApplications[application.id] ? 'Processing...' : 'Accept'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {hasMoreApplications && (
          <div className="text-center py-4">
            <Button 
              onClick={loadMoreApplications}
              disabled={applicationsLoading}
              variant="outline"
            >
              {applicationsLoading ? 'Loading...' : 'Load More Applications'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
