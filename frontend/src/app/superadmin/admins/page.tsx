'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Edit, Plus, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { superAdminApi } from '@/lib/superadmin/api'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PermissionGate } from '@/components/superadmin/common/PermissionGate'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'
import { normalizeUiPermissions, SUPER_ADMIN_PERMISSIONS } from '@/lib/superadmin/permissions'
import type { SuperAdminPermission } from '@/lib/superadmin/types'

const PAGE_SIZE = 20
const DEPENDENTS: Partial<Record<SuperAdminPermission, SuperAdminPermission[]>> = {
  'admins:read': ['admins:write'],
  'activity:read': ['admins:read'],
  'profiles:read': ['profiles:write', 'bulk_import:write', 'calxbook_verification:write'],
  'requirements:read': ['requirements:write', 'requirements:candidates', 'assignments:read', 'daily_reports:read'],
  'assignments:read': ['assignments:write', 'daily_reports:write'],
  'daily_reports:read': ['daily_reports:write'],
  'freelance:read': ['freelance:write'],
  'internships:read': ['internships:write'],
  'finance:read': ['finance:write', 'finance:confirm'],
}

export default function SuperAdminAdminsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null)
  const [editPermissions, setEditPermissions] = useState<SuperAdminPermission[]>([])
  const [editStatus, setEditStatus] = useState<'active' | 'disabled'>('active')
  const [disabledMessage, setDisabledMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const loadAdmins = useCallback(() => {
    setLoading(true)
    setError('')
    superAdminApi.admins({ page, limit: PAGE_SIZE })
      .then((res) => {
        const nextRows = res.data || []
        if (nextRows.length === 0 && page > 1 && (res.total || 0) > 0) {
          setPage((current) => Math.max(1, current - 1))
          return
        }
        setRows(nextRows)
        setTotal(res.total || 0)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load admins'))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    loadAdmins()
  }, [loadAdmins])

  function openManageDialog(row: any) {
    setSelectedAdmin(row)
    setEditStatus(row.status === 'disabled' ? 'disabled' : 'active')
    setDisabledMessage(row.disabled_message || '')
    setEditPermissions(normalizeUiPermissions(Array.isArray(row.permissions) ? row.permissions : []))
  }

  function togglePermission(permission: SuperAdminPermission, checked: boolean) {
    setEditPermissions((current) => {
      if (checked) return normalizeUiPermissions([...current, permission])
      const blocked = new Set<SuperAdminPermission>([permission, ...(DEPENDENTS[permission] || [])])
      return current.filter((item) => !blocked.has(item))
    })
  }

  async function saveAdminAccess() {
    if (!selectedAdmin) return
    setSaving(true)
    try {
      await superAdminApi.updateAdmin(selectedAdmin.id, {
        status: editStatus,
        disabled_message: editStatus === 'disabled' ? disabledMessage.trim() : '',
        permissions: normalizeUiPermissions(editPermissions),
      })
      toast.success('Admin access updated')
      setSelectedAdmin(null)
      loadAdmins()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update admin')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SectionCard
        title="Admins"
        description="Create and review limited-access admins for the super-admin portal."
        action={
          <PermissionGate permission="admins:write">
            <Button asChild className="bg-[#008260] hover:bg-[#006d51]">
              <Link href="/superadmin/admins/new">
                <Plus className="mr-2 h-4 w-4" />
                New admin
              </Link>
            </Button>
          </PermissionGate>
        }
      >
        {loading ? <p className="text-sm text-slate-600">Loading admins...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!loading && !error ? (
          <>
            <DataTable
              rows={rows}
              columns={[
                { key: 'name', header: 'Name', render: (row) => <Link href={`/superadmin/admins/${row.id}`} className="font-medium text-[#008260] hover:underline">{row.name}</Link> },
                { key: 'email', header: 'Email', render: (row) => row.email },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => (
                    <span className={row.status === 'disabled' ? 'font-medium text-red-600' : 'font-medium text-[#008260]'}>
                      {row.status === 'disabled' ? 'Blocked' : 'Active'}
                    </span>
                  ),
                },
                { key: 'permissions', header: 'Permissions', render: (row) => Array.isArray(row.permissions) ? row.permissions.length : 0 },
                { key: 'created', header: 'Created', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-' },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <PermissionGate permission="admins:write">
                      <Button type="button" variant="outline" size="sm" onClick={() => openManageDialog(row)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Manage
                      </Button>
                    </PermissionGate>
                  ),
                },
              ]}
              emptyText="No created admins yet."
            />
            <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
          </>
        ) : null}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <Shield className="h-4 w-4 text-[#008260]" />
          Root super admins are not required to exist in this table and keep full access.
        </div>
      </SectionCard>

      <Dialog open={Boolean(selectedAdmin)} onOpenChange={(open) => !open && setSelectedAdmin(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Admin Access</DialogTitle>
            <DialogDescription>
              Update permissions and block status for {selectedAdmin?.email || 'this admin'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700">
                <Checkbox checked={editStatus === 'active'} onCheckedChange={() => setEditStatus('active')} />
                Active
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700">
                <Checkbox checked={editStatus === 'disabled'} onCheckedChange={() => setEditStatus('disabled')} />
                Blocked
              </label>
            </div>

            {editStatus === 'disabled' ? (
              <div className="space-y-2">
                <Label htmlFor="disabled-message">Block message</Label>
                <Textarea
                  id="disabled-message"
                  rows={3}
                  value={disabledMessage}
                  onChange={(e) => setDisabledMessage(e.target.value)}
                  placeholder="Explain why this admin is blocked."
                />
              </div>
            ) : null}

            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {SUPER_ADMIN_PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">
                    <Checkbox
                      checked={editPermissions.includes(permission)}
                      onCheckedChange={(checked) => togglePermission(permission, checked === true)}
                    />
                    <span>{permission}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedAdmin(null)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#008260] hover:bg-[#006d51]" onClick={saveAdminAccess} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
