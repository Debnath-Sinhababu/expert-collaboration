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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <Logo size="md" />
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                Join the Future of
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Expert Collaboration</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Transform your expertise into influence and build meaningful connections with leading organizations worldwide.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Verified Network</h3>
                  <p className="text-gray-600">Join a trusted community of verified experts and leading institutions.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Opportunities</h3>
                  <p className="text-gray-600">Get immediate access to exciting projects and collaboration opportunities.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Growth</h3>
                  <p className="text-gray-600">Build your brand and expand your professional network globally.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Signup Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-md">
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
                  <TabsList className="grid w-full grid-cols-3 h-12">
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
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">For Experts</h4>
                      <p className="text-sm text-blue-700">
                        Share your expertise with leading universities and corporations. Build your brand and unlock flexible opportunities.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="institution" className="mt-4">
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-2">For Universities</h4>
                      <p className="text-sm text-purple-700">
                        Connect with industry experts to enhance academic excellence and bridge the gap with industry.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="corporate" className="mt-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">For Corporates</h4>
                      <p className="text-sm text-green-700">
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
                      className="h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
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
                        className="h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-12"
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
                      className="h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
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
                    <Button variant="outline" className="w-full h-12 text-base font-medium border-gray-200 hover:bg-gray-50">
                      Sign In to Your Account
                    </Button>
                  </Link>
                </div>

                {/* Student feedback entry point - minimal link */}
                <div className="mt-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-center">
                    <Link
                      href="/student-feedback"
                      className="text-sm font-medium text-blue-700 hover:underline"
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
