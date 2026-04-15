'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ShieldCheck, UserPlus } from 'lucide-react'
import Logo from '@/components/Logo'

const ADMIN_AUTH_EMAIL = 'debnathsinhababu2017@gmail.com'
const HARD_CODED_EMAILS = [
  'debnathsinhababu2017@gmail.com',
  'superadmin1@calxmap.in',
  'superadmin2@calxmap.in'
]

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function AdminSuperAdminsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [superAdmins, setSuperAdmins] = useState<Array<{ id: string; email: string; role?: string; created_at?: string }>>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    const storedAuth = localStorage.getItem('admin_auth')
    if (storedAuth === ADMIN_AUTH_EMAIL) {
      setIsAuthenticated(true)
      setAuthEmail(storedAuth)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadSuperAdmins()
    }
  }, [isAuthenticated])

  const loadSuperAdmins = async () => {
    setLoading(true)
    setError('')
    try {
      const authToken = `Bearer ${authEmail || ADMIN_AUTH_EMAIL}`
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/super-admins`, {
        headers: {
          Authorization: authToken
        }
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Unable to load super admin list')
      }

      const data = await response.json()
      setSuperAdmins(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Unable to fetch super admin list')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = () => {
    if (authEmail.trim().toLowerCase() === ADMIN_AUTH_EMAIL) {
      localStorage.setItem('admin_auth', ADMIN_AUTH_EMAIL)
      setIsAuthenticated(true)
      setError('')
      loadSuperAdmins()
      return
    }
    setError('Unauthorized admin email')
  }

  const getAdminHeaders = () => ({
    Authorization: `Bearer ${authEmail || ADMIN_AUTH_EMAIL}`
  })

  const handleCreateSuperAdmin = async () => {
    setError('')
    setSuccess('')

    if (!createEmail.trim() || !createPassword.trim()) {
      setError('Both email and password are required to create a new super admin.')
      return
    }
    if (!isValidEmail(createEmail.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    setConfirmLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/super-admins/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminHeaders()
        },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword.trim()
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create super admin')
      }

      await loadSuperAdmins()
      setCreateDialogOpen(false)
      setCreateEmail('')
      setCreatePassword('')
      setSuccess('Super admin successfully created or updated.')
      toast.success('Super admin created or updated successfully.')
    } catch (err: any) {
      setError(err.message || 'Failed to create super admin')
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleConfirmRoleChange = async () => {
    if (!selectedEmail) {
      setError('Please choose a valid email.')
      return
    }
    setConfirmLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/super-admins/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminHeaders()
        },
        body: JSON.stringify({
          email: selectedEmail.trim()
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update role')
      }

      await loadSuperAdmins()
      setConfirmDialogOpen(false)
      setSelectedEmail('')
      setSuccess('Role updated to super admin successfully.')
      toast.success('Role updated successfully.')
    } catch (err: any) {
      setError(err.message || 'Failed to update role')
    } finally {
      setConfirmLoading(false)
    }
  }

  const openConfirmDialog = (email: string) => {
    setSelectedEmail(email)
    setConfirmDialogOpen(true)
  }

  const isAlreadySuperAdmin = (email: string) =>
    superAdmins.some((admin) => admin.email?.toLowerCase() === email.toLowerCase())

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ECF2FF] px-4">
        <Card className="w-full max-w-md border border-[#E0E0E0]">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-[#008260] p-3 rounded-full">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Super Admin Access</CardTitle>
            <CardDescription>Enter the authorized admin email to manage super admins.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@calxmap.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                className="border-[#DCDCDC]"
              />
            </div>
            <Button onClick={handleAuth} className="w-full bg-[#008260] hover:bg-[#006d51]">
              Access Super Admin Panel
            </Button>
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => router.push('/')}
                className="text-sm text-gray-600"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] border-b border-slate-200/20 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <Logo size="header" />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/admin/profiles">
                <Button variant="ghost" className="text-white hover:bg-white/10 px-4 py-2 text-sm">
                  Profiles
                </Button>
              </Link>
              <Link href="/admin/bulk-import">
                <Button variant="ghost" className="text-white hover:bg-white/10 px-4 py-2 text-sm">
                  Bulk Import
                </Button>
              </Link>
              <Link href="/admin/super-admins">
                <Button variant="outline" className="text-black border-white/30 hover:bg-white/10 px-4 py-2 text-sm">
                  Super Admins
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Super Admin Management</h1>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
              Create or promote registered emails to the super admin role and review current super admin accounts.
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create Super Admin
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 mb-4">
            {success}
          </div>
        )}

        <section className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Pre-approved registered emails</h2>
              <p className="text-sm text-slate-500">These emails are pre-authorized to be promoted to super admin.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HARD_CODED_EMAILS.map((email) => {
              const already = isAlreadySuperAdmin(email)
              return (
                <Card key={email} className="border-slate-200 bg-white p-2">
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Registered email</p>
                        <p className="font-medium text-slate-900 break-all">{email}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${already ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                        {already ? 'Super Admin' : 'Available'}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Button
                        disabled={already}
                        onClick={() => openConfirmDialog(email)}
                        className="w-full"
                      >
                        {already ? 'Already Super Admin' : 'Promote'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Current Super Admins</h2>
              <p className="text-sm text-slate-500">A list of users with the super admin role.</p>
            </div>
            <div className="text-sm text-slate-500">
              {loading ? 'Refreshing...' : `${superAdmins.length} accounts found`}
            </div>
          </div>

          {superAdmins.length === 0 ? (
            <Card className="border-dashed border border-slate-300 bg-white/80 p-8 text-center text-slate-500">
              No super admins found yet.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {superAdmins.map((admin) => (
                <Card key={admin.id} className="border-slate-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-base">{admin.email}</CardTitle>
                    <CardDescription>{admin.role || 'super_admin'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-600">
                      Created at: {admin.created_at ? new Date(admin.created_at).toLocaleString() : 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Super Admin</DialogTitle>
            <DialogDescription>Provide an email and password for the new super admin account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="superadmin-email">Email</Label>
              <Input
                id="superadmin-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="new-superadmin@calxmap.in"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="superadmin-password">Password</Label>
              <Input
                id="superadmin-password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Strong password"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSuperAdmin} disabled={confirmLoading}>
                {confirmLoading ? 'Saving…' : 'Save Super Admin'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Promote to Super Admin</DialogTitle>
            <DialogDescription>Confirm that this registered user should be assigned the super admin role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Email: <span className="font-medium">{selectedEmail}</span>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmRoleChange} disabled={confirmLoading}>
                {confirmLoading ? 'Saving…' : 'Make Super Admin'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
