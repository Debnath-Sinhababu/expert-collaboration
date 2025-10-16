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
    <div className="min-h-screen bg-[#ECF2FF] relative overflow-hidden">
      <header className="relative bg-[#008260] shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Logo size="header" />
          </Link>
          <Link href="/auth/login">
            <Button variant="ghost" className="font-medium text-white hover:text-white hover:bg-white/10 transition-all duration-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>
      </header>

      <div className="relative flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-xl mx-auto">
          <Card className="border border-[#E0E0E0] rounded-xl bg-white shadow-sm">
            <CardHeader className="text-center pb-6 pt-8">
              <CardTitle className="text-3xl font-bold text-[#000000] mb-2">Reset Password</CardTitle>
              <CardDescription className="text-[#6A6A6A] text-base">Create your new password to continue</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-[#000000]">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6A6A6A]" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter new password (min. 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 text-base pl-10 border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-200"
                      required
                      disabled={!ready}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-[#000000]">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6A6A6A]" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 text-base pl-10 pr-12 border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] transition-all duration-200"
                      required
                      disabled={!ready}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-12 px-3 hover:bg-[#ECF2FF] transition-colors duration-200"
                      onClick={() => setShowConfirm(!showConfirm)}
                      disabled={!ready}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-5 w-5 text-[#6A6A6A]" />
                      ) : (
                        <Eye className="h-5 w-5 text-[#6A6A6A]" />
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
                  className="w-full h-12 text-base font-semibold bg-[#008260] hover:bg-[#006d51] text-white shadow-sm hover:shadow-md transition-all duration-200 rounded-lg mt-6"
                  disabled={loading || !ready}
                >
                  {loading ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


