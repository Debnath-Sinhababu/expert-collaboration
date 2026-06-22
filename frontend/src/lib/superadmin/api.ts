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

async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: formData,
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
  requirements: (params?: { page?: number; limit?: number; type?: string; status?: string; search?: string; institution_id?: string }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/requirements?${query({ ...(params || {}), _t: Date.now() })}`),
  requirementDetail: (type: string, id: string) =>
    request<any>(`/api/superadmin/requirements/${encodeURIComponent(type)}/${encodeURIComponent(id)}?${query({ _t: Date.now() })}`),
  createRequirement: (body: Record<string, unknown> | FormData) =>
    body instanceof FormData
      ? requestForm<any>('/api/superadmin/requirements', body)
      : request<any>('/api/superadmin/requirements', { method: 'POST', body: JSON.stringify(body) }),
  addRequirementExpert: (id: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/requirements/${id}/experts`, { method: 'POST', body: JSON.stringify(body) }),
  updateRequirementExpert: (id: string, candidateId: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/requirements/${id}/experts/${candidateId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  runRequirementExpertAction: (id: string, candidateId: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/requirements/${id}/experts/${candidateId}/action`, { method: 'POST', body: JSON.stringify(body) }),
  updateNativeRequirementApplication: (type: string, id: string, applicationId: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/requirements/${encodeURIComponent(type)}/${encodeURIComponent(id)}/applications/${encodeURIComponent(applicationId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  updateRequirementBooking: (type: string, id: string, bookingId: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/requirements/${encodeURIComponent(type)}/${encodeURIComponent(id)}/bookings/${encodeURIComponent(bookingId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
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
  financeSummary: () =>
    request<any>(`/api/superadmin/finance/summary?${query({ _t: Date.now() })}`),
  financePayments: (params: { party_type: 'expert' | 'institution'; status?: string; page?: number; limit?: number; search?: string }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/finance/payments?${query({ ...params, _t: Date.now() })}`),
  financePayment: (id: string) =>
    request<any>(`/api/superadmin/finance/payments/${encodeURIComponent(id)}?${query({ _t: Date.now() })}`),
  sendFinanceInvoice: (id: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/finance/payments/${encodeURIComponent(id)}/invoice`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  markFinancePaymentPaid: (id: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/finance/payments/${encodeURIComponent(id)}/mark-paid`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  financeInvoices: (params?: { page?: number; limit?: number; recipient_type?: string; search?: string }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/finance/invoices?${query({ ...(params || {}), _t: Date.now() })}`),
}
