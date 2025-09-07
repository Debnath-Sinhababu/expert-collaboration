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
  experts: {
    getAll: async (params?: { 
      page?: number; 
      limit?: number; 
      search?: string; 
      domain_expertise?: string; 
      min_hourly_rate?: number; 
      max_hourly_rate?: number;
      is_verified?: boolean;
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

  institutions: {
    getAll: async (params?: { page?: number; limit?: number }) => {
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
}
