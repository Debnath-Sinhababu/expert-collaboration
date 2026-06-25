'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { normalizeUiPermissions, SUPER_ADMIN_PERMISSIONS } from '@/lib/superadmin/permissions'
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
      'profiles:read': ['profiles:write', 'bulk_import:write', 'calxbook_verification:write'],
      'requirements:read': ['requirements:write', 'requirements:candidates'],
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

      <SectionCard title="Access" description="Backend APIs enforce these permissions; hidden tabs are UI only.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUPER_ADMIN_PERMISSIONS.map((permission) => (
            <label key={permission} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">
              <Checkbox
                checked={permissions.includes(permission)}
                onCheckedChange={(checked) => togglePermission(permission, checked === true)}
              />
              <span>{permission}</span>
            </label>
          ))}
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
