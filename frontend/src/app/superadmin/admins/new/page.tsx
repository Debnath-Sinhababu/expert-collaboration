'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import {
  normalizeUiPermissions,
  SUPER_ADMIN_PERMISSIONS,
  SUPER_ADMIN_PERMISSION_DETAILS,
  SUPER_ADMIN_PERMISSION_GROUPS,
} from '@/lib/superadmin/permissions'
import { superAdminApi } from '@/lib/superadmin/api'
import type { SuperAdminPermission } from '@/lib/superadmin/types'

export default function NewSuperAdminAdminPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [permissions, setPermissions] = useState<SuperAdminPermission[]>(['overview:read'])
  const [saving, setSaving] = useState(false)

  function togglePermission(permission: SuperAdminPermission, checked: boolean) {
    const dependents: Partial<Record<SuperAdminPermission, SuperAdminPermission[]>> = {
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
    setPermissions((current) => {
      if (checked) return normalizeUiPermissions([...current, permission])
      const blocked = new Set<SuperAdminPermission>([permission, ...(dependents[permission] || [])])
      return current.filter((item) => !blocked.has(item))
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim().toLowerCase().endsWith('@calxmap.in')) {
      toast.error('Admin email must use @calxmap.in')
      return
    }
    setSaving(true)
    try {
      await superAdminApi.createAdmin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || undefined,
        permissions: normalizeUiPermissions(permissions),
      })
      toast.success('Admin created')
      router.push('/superadmin/admins')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionCard title="New Admin" description="Admins sign in through the same super-admin route and only see assigned tabs.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">CalxMap email</Label>
            <Input id="email" type="email" placeholder="name@calxmap.in" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password">Initial password</Label>
            <Input id="password" type="password" placeholder="Default: ExpertCollaboration@123" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Access" description="Choose exactly what this admin can see and change. Some write permissions automatically include the matching read access.">
        <div className="space-y-5">
          {SUPER_ADMIN_PERMISSION_GROUPS.map((group) => {
            const groupPermissions = SUPER_ADMIN_PERMISSIONS.filter((permission) => SUPER_ADMIN_PERMISSION_DETAILS[permission].group === group)
            if (!groupPermissions.length) return null
            return (
              <div key={group} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{group}</h3>
                    <p className="text-xs text-slate-500">{groupPermissions.filter((permission) => permissions.includes(permission)).length} of {groupPermissions.length} selected</p>
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {groupPermissions.map((permission) => {
                    const detail = SUPER_ADMIN_PERMISSION_DETAILS[permission]
                    return (
                      <label key={permission} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm transition hover:border-[#008260]/40 hover:bg-emerald-50/30">
                        <Checkbox
                          className="mt-1"
                          checked={permissions.includes(permission)}
                          onCheckedChange={(checked) => togglePermission(permission, checked === true)}
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900">{detail.label}</span>
                          <span className="mt-1 block leading-5 text-slate-600">{detail.description}</span>
                          <span className="mt-2 block font-mono text-[11px] text-slate-400">{permission}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" className="bg-[#008260] hover:bg-[#006d51]" disabled={saving}>
          {saving ? 'Creating...' : 'Create admin'}
        </Button>
      </div>
    </form>
  )
}
