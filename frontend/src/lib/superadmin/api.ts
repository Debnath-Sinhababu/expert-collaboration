import { supabase } from '@/lib/supabase'
import type { PaginatedResponse, SuperAdminMe, SuperAdminPermission } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function headers() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(await headers()),
      ...(init?.headers || {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message || json?.error || 'Request failed')
  return json as T
}

function query(params: Record<string, string | number | boolean | undefined | null>) {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value))
  }
  return q.toString()
}

export const superAdminApi = {
  me: () => request<SuperAdminMe>('/api/superadmin/me'),
  overviewStats: () => request<Record<string, number>>('/api/superadmin/overview/stats'),
  admins: (params?: { page?: number; limit?: number }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/admins?${query({ ...(params || {}), _t: Date.now() })}`),
  createAdmin: (body: { name: string; email: string; password?: string; permissions: SuperAdminPermission[] }) =>
    request<any>('/api/superadmin/admins', { method: 'POST', body: JSON.stringify(body) }),
  updateAdmin: (id: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/admins/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  profiles: (params: { type: 'experts' | 'institutions' | 'students'; page?: number; limit?: number; search?: string; interested?: boolean }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/profiles?${query({ ...params, _t: Date.now() })}`),
  bulkImportExperts: (body: Record<string, unknown>) =>
    request<any>('/api/superadmin/bulk-import/experts', { method: 'POST', body: JSON.stringify(body) }),
  bulkImportStudents: (body: Record<string, unknown>) =>
    request<any>('/api/superadmin/bulk-import/students', { method: 'POST', body: JSON.stringify(body) }),
  setCalxbookVerification: (id: string, calxbook_verified: boolean) =>
    request<any>(`/api/superadmin/experts/${id}/calxbook-verification`, {
      method: 'PATCH',
      body: JSON.stringify({ calxbook_verified }),
    }),
  requirements: (params?: { page?: number; limit?: number; type?: string; status?: string; search?: string }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/requirements?${query({ ...(params || {}), _t: Date.now() })}`),
  createRequirement: (body: Record<string, unknown>) =>
    request<any>('/api/superadmin/requirements', { method: 'POST', body: JSON.stringify(body) }),
  addRequirementExpert: (id: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/requirements/${id}/experts`, { method: 'POST', body: JSON.stringify(body) }),
  updateRequirementExpert: (id: string, candidateId: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/requirements/${id}/experts/${candidateId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  freelance: (params?: { page?: number; limit?: number; search?: string }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/freelance?${query({ ...(params || {}), _t: Date.now() })}`),
  internships: (params?: { page?: number; limit?: number; search?: string }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/internships?${query({ ...(params || {}), _t: Date.now() })}`),
  financeTrainings: (params?: { page?: number; limit?: number }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/finance/trainings?${query({ ...(params || {}), _t: Date.now() })}`),
  confirmFinanceTraining: (bookingId: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/finance/trainings/${bookingId}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
}
