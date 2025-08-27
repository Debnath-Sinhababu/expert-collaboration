'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, ArrowLeft, Shield, Zap } from 'lucide-react'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        const userMetadata = data.user.user_metadata
        const role = userMetadata?.role
        
        if (role === 'expert') {
          try {
            const experts = await api.experts.getAll()
            const userExpert = experts.find((expert: any) => expert.user_id === data.user.id)
            
            if (userExpert) {
              router.push('/expert/dashboard')
            } else {
              router.push('/expert/profile-setup')
            }
          } catch (error) {
            console.error('Error checking expert profile:', error)
            router.push('/expert/profile-setup')
          }
        } else if (role === 'institution') {
          try {
            const institutions = await api.institutions.getAll()
            const userInstitution = institutions.find((institution: any) => institution.user_id === data.user.id)
            
            if (userInstitution) {
              router.push('/institution/dashboard')
            } else {
              router.push('/institution/profile-setup')
            }
          } catch (error) {
            console.error('Error checking institution profile:', error)
            router.push('/institution/profile-setup')
          }
        } else {
          router.push('/')
        }
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tl from-slate-100 via-indigo-50 to-purple-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-400/20 to-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <header className="relative bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <Logo size="md" />
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-indigo-600 bg-clip-text text-transparent">
                  Expert Collaboration
                </span>
                <p className="text-xs text-gray-500 font-medium">Connecting Excellence</p>
              </div>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="font-medium">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="relative flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                Welcome Back to
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Expert Collaboration</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Continue your journey in transforming expertise into influence and connections into opportunities.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-slate-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Platform</h3>
                  <p className="text-gray-600">Your data is protected with enterprise-grade security and privacy measures.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Access</h3>
                  <p className="text-gray-600">Get immediate access to your dashboard and start collaborating with experts.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-md ring-1 ring-slate-200/50">
              <CardHeader className="text-center pb-8">
                <div className="flex justify-center mb-6 lg:hidden">
                  <Logo size="lg" />
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900">Sign In</CardTitle>
                <CardDescription className="text-gray-600 text-lg">
                  Access your expert collaboration dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 text-base border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 text-base border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 pr-12"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-slate-600 to-indigo-600 hover:from-slate-700 hover:to-indigo-700 text-white shadow-lg transform hover:scale-[1.02] transition-all duration-200" 
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">New to Expert Collaboration?</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link href="/auth/signup">
                    <Button variant="outline" className="w-full h-12 text-base font-medium border-slate-200 hover:bg-slate-50 hover:border-indigo-300 transition-all duration-200">
                      Create Your Account
                    </Button>
                  </Link>
                </div>

                <div className="text-center">
                  <Link href="#forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    Forgot your password?
                  </Link>
                </div>

                {/* Student feedback entry point - minimal link */}
                <div className="mt-4">
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-center">
                    <Link
                      href="/student-feedback"
                      className="text-sm font-medium text-indigo-700 hover:underline"
                    >
                      Student? Open the Feedback Form (ET / Prompt Engineering)
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
