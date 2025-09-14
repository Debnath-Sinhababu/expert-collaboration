'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [ready, setReady] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    // Supabase will set a session via the magic link; we just allow form once client is ready.
    const init = async () => {
      try {
        // Trigger a session check; not strictly necessary but ensures client is initialized
        await supabase.auth.getSession()
      } finally {
        setReady(true)
      }
    }
    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess('Password updated successfully. Redirecting to login...')
      setTimeout(() => router.push('/auth/login'), 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      <header className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm shadow-lg border-b border-blue-200/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <span className="text-2xl font-bold text-white group-hover:text-blue-100 transition-all duration-300">Calxmap</span>
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost" className="font-medium text-white hover:text-blue-100 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>
      </header>

      <div className="relative flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-md mx-auto relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-2xl group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-all duration-500"></div>
          <Card className="border-2 border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 relative z-10">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <Logo size="lg" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">Reset Password</CardTitle>
              <CardDescription className="text-slate-600">Create your new password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 text-base pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                      required
                      disabled={!ready}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 text-base pl-10 pr-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                      required
                      disabled={!ready}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-12 px-3 hover:bg-slate-100 transition-colors duration-300"
                      onClick={() => setShowConfirm(!showConfirm)}
                      disabled={!ready}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-5 w-5 text-slate-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-700">{success}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300"
                  disabled={loading || !ready}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


