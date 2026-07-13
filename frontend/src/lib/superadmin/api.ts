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

async function requestBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: await headers(),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.message || json?.error || 'Download failed')
  }
  return res.blob()
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
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
  overviewStats: () => request<any>('/api/superadmin/overview/stats'),
  overviewCategory: (category: 'projects' | 'internships' | 'freelance', params?: { period?: string }) =>
    request<any>(`/api/superadmin/overview/${category}?${query({ ...(params || {}), _t: Date.now() })}`),
  exportOverview: async (params?: { date_from?: string; date_to?: string; month?: string; year?: string }) => {
    const blob = await requestBlob(`/api/superadmin/overview/export?${query({ ...(params || {}), _t: Date.now() })}`)
    downloadBlob(blob, 'calxmap-business-overview.xlsx')
  },
  admins: (params?: { page?: number; limit?: number }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/admins?${query({ ...(params || {}), _t: Date.now() })}`),
  adminDetail: (id: string) =>
    request<any>(`/api/superadmin/admins/${encodeURIComponent(id)}?${query({ _t: Date.now() })}`),
  adminActivity: (id: string, params?: { page?: number; limit?: number; action?: string; requirement_type?: string; requirement_id?: string; date_from?: string; date_to?: string }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/admins/${encodeURIComponent(id)}/activity?${query({ ...(params || {}), _t: Date.now() })}`),
  exportAdminActivity: async (id: string, params?: { action?: string; requirement_type?: string; requirement_id?: string; date_from?: string; date_to?: string }) => {
    const blob = await requestBlob(`/api/superadmin/admins/${encodeURIComponent(id)}/activity/export?${query({ ...(params || {}), _t: Date.now() })}`)
    downloadBlob(blob, `admin-activity-${id}.xlsx`)
  },
  createAdmin: (body: { name: string; email: string; password?: string; permissions: SuperAdminPermission[] }) =>
    request<any>('/api/superadmin/admins', { method: 'POST', body: JSON.stringify(body) }),
  updateAdmin: (id: string, body: Record<string, unknown>) =>
    request<any>(`/api/superadmin/admins/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  profiles: (params: {
    type: 'experts' | 'institutions' | 'students'
    page?: number
    limit?: number
    search?: string
    domain_expertise?: string
    skill?: string
    expert_type?: string
    expert_service?: string
    designation?: string
    experience_min?: string | number
    experience_max?: string | number
    hourly_rate_min?: string | number
    hourly_rate_max?: string | number
    city?: string
    state?: string
    is_verified?: string | boolean
    kyc_status?: string
    calxbook_verified?: string | boolean
    interested?: string | boolean
    institution_id?: string
    degree?: string
    specialization?: string
    year?: string
    availability?: string
    preferred_engagement?: string
    preferred_work_mode?: string
    currently_studying?: string | boolean
    student_count_min?: string | number
    student_count_max?: string | number
    established_year_min?: string | number
    established_year_max?: string | number
    institution_type?: string
  }) =>
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
  requirements: (params?: { page?: number; limit?: number; type?: string; status?: string; derived_status?: string; search?: string; institution_id?: string; assigned_admin_id?: string }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/requirements?${query({ ...(params || {}), _t: Date.now() })}`),
  assignedRequirements: () =>
    request<PaginatedResponse<any>>(`/api/superadmin/requirements/assigned?${query({ _t: Date.now() })}`),
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
  updateRequirementDates: (type: string, id: string, body: { start_date: string; end_date: string }) =>
    request<any>(`/api/superadmin/requirements/${encodeURIComponent(type)}/${encodeURIComponent(id)}/dates`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  assignRequirement: (type: string, id: string, body: { admin_id: string; notes?: string }) =>
    request<any>(`/api/superadmin/requirements/${encodeURIComponent(type)}/${encodeURIComponent(id)}/assignment`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  unassignRequirement: (type: string, id: string) =>
    request<any>(`/api/superadmin/requirements/${encodeURIComponent(type)}/${encodeURIComponent(id)}/assignment`, { method: 'DELETE' }),
  requirementReports: (type: string, id: string, params?: { page?: number; limit?: number }) =>
    request<PaginatedResponse<any>>(`/api/superadmin/requirements/${encodeURIComponent(type)}/${encodeURIComponent(id)}/reports?${query({ ...(params || {}), _t: Date.now() })}`),
  uploadRequirementReport: (type: string, id: string, formData: FormData) =>
    requestForm<any>(`/api/superadmin/requirements/${encodeURIComponent(type)}/${encodeURIComponent(id)}/reports`, formData),
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
