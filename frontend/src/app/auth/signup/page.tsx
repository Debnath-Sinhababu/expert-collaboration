'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff, Users, BookOpen, Building, ArrowLeft, Shield, Zap, CheckCircle } from 'lucide-react'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('expert')
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: activeTab,
          },
          emailRedirectTo:`${process.env.NEXT_PUBLIC_FRONTEND_URL}/confirmemail`
        },
      })

      if (error) throw error

      if (data.user) {
        setSuccess('Account created successfully! Please check your email to verify your account.')
        
        setTimeout(() => {
          if (activeTab === 'expert') {
            router.push('/expert/profile-setup')
          } else {
            router.push('/institution/profile-setup')
          }
        }, 2000)
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-bl from-indigo-500/40 to-purple-600/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-500/40 to-pink-600/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-gradient-to-r from-pink-500/30 to-indigo-500/30 rounded-full blur-3xl"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-gradient-to-bl from-purple-400/20 to-pink-600/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-gradient-to-tr from-indigo-400/20 to-purple-600/20 rounded-full blur-2xl"></div>
      </div>
      {/* Header */}
      <header className="relative bg-white/95 backdrop-blur-md shadow-lg border-b border-purple-300/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <Logo size="md" />
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
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
              <h1 className="text-5xl font-bold text-white leading-tight">
                Join the Future of
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Expert Collaboration</span>
              </h1>
              <p className="text-xl text-gray-200 leading-relaxed">
                Transform your expertise into influence and build meaningful connections with leading organizations worldwide.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Verified Network</h3>
                  <p className="text-gray-200">Join a trusted community of verified experts and leading institutions.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Instant Opportunities</h3>
                  <p className="text-gray-200">Get immediate access to exciting projects and collaboration opportunities.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Professional Growth</h3>
                  <p className="text-gray-200">Build your brand and expand your professional network globally.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Signup Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md ring-1 ring-white/20">
              <CardHeader className="text-center pb-8">
                <div className="flex justify-center mb-6 lg:hidden">
                  <Logo size="lg" />
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900">Create Account</CardTitle>
                <CardDescription className="text-gray-600 text-lg">
                  Choose your role and join our platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                  <TabsList className="grid w-full grid-cols-3 h-12 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <TabsTrigger value="expert" className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>Expert</span>
                    </TabsTrigger>
                    <TabsTrigger value="institution" className="flex items-center space-x-2 text-sm">
                      <BookOpen className="h-4 w-4" />
                      <span>University</span>
                    </TabsTrigger>
                    <TabsTrigger value="corporate" className="flex items-center space-x-2 text-sm">
                      <Building className="h-4 w-4" />
                      <span>Corporate</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="expert" className="mt-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200 shadow-sm">
                      <h4 className="font-semibold text-indigo-900 mb-2">For Experts</h4>
                      <p className="text-sm text-indigo-700">
                        Share your expertise with leading universities and corporations. Build your brand and unlock flexible opportunities.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="institution" className="mt-4">
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200 shadow-sm">
                      <h4 className="font-semibold text-purple-900 mb-2">For Universities</h4>
                      <p className="text-sm text-purple-700">
                        Connect with industry experts to enhance academic excellence and bridge the gap with industry.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="corporate" className="mt-4">
                    <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-200 shadow-sm">
                      <h4 className="font-semibold text-pink-900 mb-2">For Corporates</h4>
                      <p className="text-sm text-pink-700">
                        Find specialized talent including CAs, lawyers, and build strategic partnerships with experts.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <form onSubmit={handleSignup} className="space-y-6">
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

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 text-base border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 text-base border-purple-200 focus:border-purple-500 focus:ring-purple-500 pr-12"
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 text-base border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white shadow-lg transform hover:scale-[1.02] transition-all duration-200"
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : `Create ${activeTab === 'expert' ? 'Expert' : activeTab === 'institution' ? 'University' : 'Corporate'} Account`}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Already have an account?</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link href="/auth/login">
                    <Button variant="outline" className="w-full h-12 text-base font-medium border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200">
                      Sign In to Your Account
                    </Button>
                  </Link>
                </div>

                {/* Student feedback entry point - minimal link */}
                <div className="mt-4">
                  <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-center">
                    <Link
                      href="/student-feedback"
                      className="text-sm font-medium text-purple-700 hover:underline"
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
