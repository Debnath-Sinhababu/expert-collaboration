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
    getAll: async (params?: { page?: number; limit?: number }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams(params as any).toString()
      return fetch(`${API_BASE_URL}/api/experts${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    getById: async (id: string) => {
      const headers = await getAuthHeaders()
      return fetch(`${API_BASE_URL}/api/experts/${id}`, { headers }).then(res => res.json())
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
      return fetch(`${API_BASE_URL}/api/experts/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      }).then(res => res.json())
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
    getAll: async (params?: { page?: number; limit?: number }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams({
        ...params as any,
        _t: Date.now().toString() // Cache busting
      }).toString()
      return fetch(`${API_BASE_URL}/api/projects${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
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
    getAll: async (params?: { expert_id?: string; project_id?: string; page?: number; limit?: number }) => {
      const headers = await getAuthHeaders()
      const query = new URLSearchParams(params as any).toString()
      return fetch(`${API_BASE_URL}/api/applications${query ? `?${query}` : ''}`, { headers }).then(res => res.json())
    },
    create: (data: any) => fetch(`${API_BASE_URL}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    update: (id: string, data: any) => fetch(`${API_BASE_URL}/api/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json())
  },

  bookings: {
    getAll: (params?: { expert_id?: string; institution_id?: string }) => {
      const query = new URLSearchParams(params as any).toString()
      return fetch(`${API_BASE_URL}/api/bookings${query ? `?${query}` : ''}`).then(res => res.json())
    },
    create: (data: any) => fetch(`${API_BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json())
  },

  ratings: {
    getAll: (params?: { expert_id?: string; institution_id?: string }) => {
      const query = new URLSearchParams(params as any).toString()
      return fetch(`${API_BASE_URL}/api/ratings${query ? `?${query}` : ''}`).then(res => res.json())
    },
    create: (data: any) => fetch(`${API_BASE_URL}/api/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json())
  }
}
