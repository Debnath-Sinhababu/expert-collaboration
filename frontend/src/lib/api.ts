const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = {
  experts: {
    getAll: () => fetch(`${API_BASE_URL}/api/experts`).then(res => res.json()),
    getById: (id: string) => fetch(`${API_BASE_URL}/api/experts/${id}`).then(res => res.json()),
    create: (data: any) => fetch(`${API_BASE_URL}/api/experts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    update: (id: string, data: any) => fetch(`${API_BASE_URL}/api/experts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json())
  },

  institutions: {
    getAll: () => fetch(`${API_BASE_URL}/api/institutions`).then(res => res.json()),
    getById: (id: string) => fetch(`${API_BASE_URL}/api/institutions/${id}`).then(res => res.json()),
    create: (data: any) => fetch(`${API_BASE_URL}/api/institutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    update: (id: string, data: any) => fetch(`${API_BASE_URL}/api/institutions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json())
  },

  projects: {
    getAll: () => fetch(`${API_BASE_URL}/api/projects`).then(res => res.json()),
    getById: (id: string) => fetch(`${API_BASE_URL}/api/projects/${id}`).then(res => res.json()),
    create: (data: any) => fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    update: (id: string, data: any) => fetch(`${API_BASE_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json())
  },

  applications: {
    getAll: (params?: { expert_id?: string; project_id?: string }) => {
      const query = new URLSearchParams(params as any).toString()
      return fetch(`${API_BASE_URL}/api/applications${query ? `?${query}` : ''}`).then(res => res.json())
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
