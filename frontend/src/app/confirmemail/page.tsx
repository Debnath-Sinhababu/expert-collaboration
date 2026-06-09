'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/lib/api'

function ConfirmEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setError('Invalid confirmation link. Request a new signup email.')
        setLoading(false)
        return
      }

      try {
        await api.auth.confirmEmail(token)
        setSuccess(true)
      } catch (err: any) {
        setError(err?.message || 'Failed to confirm email')
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [token])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => {
      router.push('/auth/login?message=' + encodeURIComponent('Email verified. You can now sign in.'))
    }, 3000)
    return () => clearTimeout(timer)
  }, [router, success])

  return (
    <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <Card className="border border-[#E0E0E0] bg-white shadow-sm">
          <CardContent className="pt-8 pb-8 px-6">
            <div className="mb-4">
              <Link href="/auth/login" className="inline-flex items-center text-sm text-[#008260] hover:underline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to login
              </Link>
            </div>

            <div className="flex justify-center mb-6">
              {loading ? (
                <div className="w-20 h-20 rounded-full bg-[#ECF2FF] flex items-center justify-center">
                  <Loader2 className="h-9 w-9 animate-spin text-[#008260]" />
                </div>
              ) : success ? (
                <div className="w-20 h-20 rounded-full bg-[#ECF2FF] flex items-center justify-center">
                  <div className="bg-[#008260] rounded-full p-4">
                    <Check className="h-5 w-5 text-white stroke-[3]" />
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                  <ShieldAlert className="h-9 w-9 text-red-600" />
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold text-center text-black mb-3">
              {loading ? 'Verifying email' : success ? 'Email verified' : 'Verification failed'}
            </h1>

            <p className="text-center text-sm text-slate-600 mb-6">
              {loading
                ? 'Please wait while we verify your account.'
                : success
                  ? 'Your account is verified. You can now sign in.'
                  : error}
            </p>

            {error && !success && (
              <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-3">
              <Button
                className="w-full bg-[#008260] hover:bg-[#006d51] text-white"
                onClick={() => router.push('/auth/login')}
                disabled={loading && !success}
              >
                Go to login
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">Return to homepage</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#008260]" />
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  )
}
