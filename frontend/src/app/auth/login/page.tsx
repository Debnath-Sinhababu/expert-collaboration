'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, ArrowLeft, Shield, Zap, CheckCircle, Users, GraduationCap } from 'lucide-react'
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
            const userExpert = await api.experts.getByUserId(data.user.id)
           
            
            if (userExpert) {
              router.push('/expert/home')
            } else {
              router.push('/expert/profile-setup')
            }
          } catch (error) {
            console.error('Error checking expert profile:', error)
            router.push('/expert/profile-setup')
          }
        } else if (role === 'institution') {
          try {
            const userInstitution = await api.institutions.getByUserId(data.user.id)
            
            console.log('userInstitution', userInstitution)
            if (userInstitution) {
              router.push('/institution/home')
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-blue-400/5 to-indigo-600/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-gradient-to-tl from-indigo-400/5 to-blue-600/5 rounded-full blur-2xl"></div>
      </div>
      
      {/* Enhanced Header */}
      <header className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm shadow-lg border-b border-blue-200/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
              
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
              </div>
              <div>
                <span className="text-2xl font-bold text-white group-hover:text-blue-100 transition-all duration-300">
                 Calxmap
                </span>
                <p className="text-xs text-blue-100 font-medium group-hover:text-white transition-colors duration-300">knowledge sharing networking platform</p>
              </div>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="font-medium text-white hover:text-blue-100 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-300">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Subtle bottom glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
      </header>

      <div className="relative flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Enhanced Branding */}
          <div className="hidden lg:block space-y-8">
        
            <div className="space-y-6">
            <Logo size="lg"  />
              <h1 className="text-5xl font-bold text-slate-900 leading-tight">
                Welcome Back to
                <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent ml-2">Calxmap</span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Continue your journey in transforming expertise into influence and connections into opportunities.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4 group">
                  <div className="w-12 h-12 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Enterprise Security</h3>
                    <p className="text-slate-600">Your data is protected with enterprise-grade security and privacy measures.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Instant Access</h3>
                  <p className="text-slate-600">Get immediate access to your dashboard and start collaborating with experts.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Global Network</h3>
                  <p className="text-slate-600">Connect with verified experts and institutions worldwide.</p>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-3">Trusted by leading institutions</p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">100+ Experts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">10+ Universities</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Enhanced Login Form */}
          <div className="w-full max-w-2xl mx-auto lg:mx-0 relative group">
            {/* Subtle background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-2xl group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-all duration-500"></div>
            <Card className="border-2 border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 relative z-10">
              <CardHeader className="text-center pb-8">
                <div className="flex justify-center mb-6 lg:hidden">
                  <Logo size="lg" />
                </div>
                <CardTitle className="text-3xl font-bold text-slate-900">Welcome Back</CardTitle>
                <CardDescription className="text-slate-600 text-lg">
                  Sign in to continue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-12 transition-all duration-300"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-12 px-3 hover:bg-slate-100 transition-colors duration-300"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
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

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300" 
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-500">New to Calxmap?</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link href="/auth/signup">
                    <Button className="w-full h-12 text-base font-medium bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300">
                      Create Your Account
                    </Button>
                  </Link>
                </div>

                <div className="text-center">
                  <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300">
                    Forgot your password?
                  </Link>
                </div>

                {/* Student feedback entry point - clean design */}
                <div className="mt-6">
                  <div className="rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 text-center hover:bg-slate-100 transition-colors duration-300">
                    <Link
                      href="/student-feedback"
                      className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors duration-300"
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
