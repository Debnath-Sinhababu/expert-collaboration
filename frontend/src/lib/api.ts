import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  return headers
}

export const api = {
  auth: {
    forgotPassword: async (email: string) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email })
      }).then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || 'Failed to send reset email')
        return json
      })
    }
  },
  internshipApplications: {
    create: async (data: any) => {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE_URL}/api/internship-applications`, { method: 'POST', headers, body: JSON.stringify(data) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to apply')
      return json
    },
    status: async (internshipId: string) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ internship_id: internshipId, _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/internship-applications/status?${query}`, { headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch application status')
      return json as { applied: boolean; status: string | null }
    },
    list: async (params?: { page?: number; limit?: number; stage?: string }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ ...(params as any), _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/internship-applications${query ? `?${query}` : ''}`, { headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch applications')
      return json
    }
  },
  experts: {
    getAll: async (params?: { 
      page?: number; 
      limit?: number; 
      search?: string; 
      domain_expertise?: string; 
      min_hourly_rate?: number; 
      max_hourly_rate?: number;
      is_verified?: boolean;
      min_rating?: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({
        ...params as any,
        _t: Date.now().toString()
      }).toString()
      return fetch(`${API_BASE_URL}/api/experts${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    getById: async (id: string) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/experts/${id}`, { headers }).then(res => res.json())
    },
    getByUserId: async (userId: string) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/experts/user/${userId}?${query}`, { headers })
      if (res.status === 404) {
        return null
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || `Failed to fetch expert for user ${userId}`)
      }
      return json
    },
    getRecommended: async (projectId: string) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/experts/recommended/${projectId}`, { headers }).then(res => res.json())
    },
    create: async (data: any) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/experts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json())
    },
    update: async (id: string, data: any) => {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/api/experts/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }
      
      const responseText = await response.text()
      if (!responseText) {
        return { success: true }
      }
      
      try {
        return JSON.parse(responseText)
      } catch (parseError) {
        return { success: true }
      }
    }
  },

  internships: {
    create: async (data: any) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/internships`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      }).then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || 'Failed to create internship')
        return json
      })
    },
    getAll: async (params?: { page?: number; limit?: number }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ ...(params as any), _t: Date.now().toString() }).toString()
      return fetch(`${API_BASE_URL}/api/internships${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    getVisible: async (params?: { page?: number; limit?: number; search?: string; work_mode?: string; engagement?: string; paid?: boolean | string; min_stipend?: number | string; max_stipend?: number | string; skills?: string; location?: string }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ ...(params as any), _t: Date.now().toString() }).toString()
      return fetch(`${API_BASE_URL}/api/internships/visible${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    getById: async (id: string) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ _t: Date.now().toString() }).toString()
      return fetch(`${API_BASE_URL}/api/internships/${id}?${query}`, { headers }).then(res => res.json())
    },
    getApplications: async (id: string, params?: { page?: number; limit?: number; stage?: 'pending' | 'interview' | 'selected' | 'rejected' }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ ...(params as any), _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/internships/${id}/applications${query ? `?${query}` : ''}`, { headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch applications')
      return json
    },
    updateApplicationStatus: async (applicationId: string, status: string, extras?: { interview_scheduled_at?: string }) => {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE_URL}/api/internship-applications/${applicationId}/status`, { method: 'PUT', headers, body: JSON.stringify({ status, ...(extras || {}) }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to update status')
      return json
    }
  },
  internshipApplicationsInstitution: {
    list: async (id: string, params?: { page?: number; limit?: number; stage?: 'pending' | 'approved' | 'rejected' }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ ...(params as any), _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/internships/${id}/applications/institution${query ? `?${query}` : ''}`, { headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch applications')
      return json
    },
    updateStatus: async (applicationId: string, status: 'approved_institution' | 'rejected_institution') => {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE_URL}/api/internship-applications/${applicationId}/institution-status`, { method: 'PUT', headers, body: JSON.stringify({ status }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to update status')
      return json
    }
  },

  // Freelancing
  freelance: {
    createProject: async (formData: FormData) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_BASE_URL}/api/freelance/projects`, { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}` }, body: formData })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to create project')
      return json
    },
    getCorporateProjects: async (params?: { page?: number; limit?: number }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ ...(params as any), _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/freelance/projects${query ? `?${query}` : ''}`, { headers })
      const json = await res.json().catch(() => ([]))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch projects')
      return json
    },
    getVisibleProjects: async () => {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE_URL}/api/freelance/projects/visible`, { headers })
      const json = await res.json().catch(() => ([]))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch projects')
      return json
    },
    getProjectById: async (id: string) => {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE_URL}/api/freelance/projects/${id}`, { headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch project')
      return json
    },
    apply: async (project_id: string, cover_letter?: string) => {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE_URL}/api/freelance/applications`, { method: 'POST', headers, body: JSON.stringify({ project_id, cover_letter }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to apply')
      return json
    },
    applicationStatus: async (project_id: string) => {
      const headers = await getAuthHeaders()
      const q = new URLSearchParams({ project_id, _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/freelance/applications/status?${q}`, { headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed')
      return json as { applied: boolean; status: string | null; application_id?: string | null }
    },
    listMyApplications: async (params?: { page?: number; limit?: number; status?: 'pending' | 'shortlisted' | 'rejected' }) => {
      const headers = await getAuthHeaders()
      const q = new URLSearchParams({ ...(params as any), _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/freelance/my-applications${q ? `?${q}` : ''}`, { headers })
      const json = await res.json().catch(() => ([]))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch applications')
      return json
    },
    listMySubmissions: async (params?: { page?: number; limit?: number }) => {
      const headers = await getAuthHeaders()
      const q = new URLSearchParams({ ...(params as any), _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/freelance/my-submissions${q ? `?${q}` : ''}`, { headers })
      const json = await res.json().catch(() => ([]))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch submissions')
      return json
    },
    listApplications: async (id: string, params?: { page?: number; limit?: number; status?: 'pending' | 'shortlisted' | 'rejected' }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ ...(params as any), _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/freelance/projects/${id}/applications${query ? `?${query}` : ''}`, { headers })
      const json = await res.json().catch(() => ([]))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch applications')
      return json
    },
    updateApplicationStatus: async (appId: string, status: 'shortlisted' | 'rejected') => {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE_URL}/api/freelance/applications/${appId}/status`, { method: 'PUT', headers, body: JSON.stringify({ status }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to update status')
      return json
    },
    submitWork: async (project_id: string, application_id: string, formData: FormData) => {
      const { data: { session } } = await supabase.auth.getSession()
      formData.append('project_id', project_id)
      formData.append('application_id', application_id)
      const res = await fetch(`${API_BASE_URL}/api/freelance/submissions`, { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}` }, body: formData })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to submit')
      return json
    },
    listSubmissions: async (id: string, params?: { page?: number; limit?: number }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ ...(params as any), _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/freelance/projects/${id}/submissions${query ? `?${query}` : ''}`, { headers })
      const json = await res.json().catch(() => ([]))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch submissions')
      return json
    }
  },

  institutions: {
    getAll: async (params?: { page?: number; limit?: number; search?: string; type?: string; exclude_type?: string }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({
        ...params as any,
        _t: Date.now().toString() // Cache busting
      }).toString()
      return fetch(`${API_BASE_URL}/api/institutions${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    getById: async (id: string) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ _t: Date.now().toString() }).toString()
      return fetch(`${API_BASE_URL}/api/institutions/${id}?${query}`, { headers }).then(res => res.json())
    },
    getByUserId: async (userId: string) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/institutions/user/${userId}?${query}`, { headers })
      // Normalize 404 to null so callers can do a simple truthy check
      if (res.status === 404) {
        return null
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || `Failed to fetch institution for user ${userId}`)
      }
      return json
    },
    create: async (data: any) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/institutions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json())
    },
    update: async (id: string, data: any) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/institutions/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json())
    }
  },


  projects: {
    getAll: async (params?: { 
      page?: number; 
      limit?: number; 
      search?: string; 
      type?: string; 
      min_hourly_rate?: number; 
      max_hourly_rate?: number;
      status?: string;
      institution_id?: string;
      expert_id?: string; // Add expert_id to filter out projects they've already applied to
      domain_expertise?: string; // For similar projects
      required_expertise?: string; // For similar projects (comma-separated)
    }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({
        ...params as any,
        _t: Date.now().toString()
      }).toString()
      return fetch(`${API_BASE_URL}/api/projects${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    getRecommended: async (expertId: string) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/projects/recommended/${expertId}`, { headers }).then(res => res.json())
    },
    getById: async (id: string) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ _t: Date.now().toString() }).toString()
      return fetch(`${API_BASE_URL}/api/projects/${id}?${query}`, { headers }).then(res => res.json())
    },
    create: async (data: any) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json())
    },
    update: async (id: string, data: any) => {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }
      
      const responseText = await response.text()
      if (!responseText) {
        return { success: true }
      }
      
      try {
        return JSON.parse(responseText)
      } catch (parseError) {
        return { success: true }
      }
    }
  },

  applications: {
    getAll: async (params?: { expert_id?: string; project_id?: string; institution_id?: string; page?: number; limit?: number; status?: string }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({
        ...params as any,
        _t: Date.now().toString()
      }).toString()
      return fetch(`${API_BASE_URL}/api/applications${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    getCounts: async (params?: { expert_id?: string; project_id?: string; institution_id?: string; status?: string }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({
        ...params as any,
        _t: Date.now().toString()
      }).toString()
      return fetch(`${API_BASE_URL}/api/applications/counts${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    create: async (data: any) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/applications`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json())
    },
    update: async (id: string, data: any) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/applications/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json())
    },
    checkStatus: async (projectId: string, expertIds: string[]) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/applications/check-status`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId, expertIds })
      }).then(res => res.json())
    }
  },

  bookings: {
    getAll: async (params?: { expert_id?: string; institution_id?: string; project_id?: string; page?: number; limit?: number }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams(params as any).toString()
      return fetch(`${API_BASE_URL}/api/bookings${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    getCounts: async (params?: { expert_id?: string; institution_id?: string; project_id?: string }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams(params as any).toString()
      return fetch(`${API_BASE_URL}/api/bookings/counts${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    create: async (data: any) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json())
    },
    update: async (id: string, data: any) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/bookings/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json())
    },
    delete: async (id: string) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/bookings/${id}`, {
        method: 'DELETE',
        headers
      }).then(res => res.json())
    }
  },
  ratings: {
    getAll: async (params?: { expert_id?: string; institution_id?: string; booking_id?: string }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams(params as any).toString()
      return fetch(`${API_BASE_URL}/api/ratings${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    create: async (data: any) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/ratings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json())
    }
  }
  ,
  studentFeedback: {
    getByExpertName: async (expertName: string, limit = 20) => {
      const headers = await getAuthHeaders()
      const q = new URLSearchParams({ expertName, limit: String(limit), _t: Date.now().toString() }).toString()
      return fetch(`${API_BASE_URL}/api/student/feedback/by-expert?${q}`, { headers }).then(res => res.json())
    }
  }
  ,
  students: {
    me: async () => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({ _t: Date.now().toString() }).toString()
      const res = await fetch(`${API_BASE_URL}/api/students/me?${query}`, { headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch student profile')
      return json
    },
    create: async (data: any) => {
      // This method is not used for multipart (handled inline via fetch in the page)
      // Keep JSON variant for potential headless usage
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE_URL}/api/students`, { method: 'POST', headers, body: JSON.stringify(data) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to create student profile')
      return json
    },
    update: async (id: string, data: any) => {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE_URL}/api/students/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to update student profile')
      return json
    }
  }
}
