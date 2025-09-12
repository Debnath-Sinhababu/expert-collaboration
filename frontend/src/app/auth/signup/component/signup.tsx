'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff, Users, BookOpen, Building, ArrowLeft, Shield, Zap, CheckCircle, Star, Globe, Award } from 'lucide-react'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'

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
  const searchParam = useSearchParams()

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

  useEffect(() => {
    const role = searchParam.get('role') || 'expert'  // fallback to 'expert'
    setActiveTab(role)
  }, [searchParam])
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-gradient-to-bl from-blue-400/5 to-indigo-600/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-gradient-to-tr from-indigo-400/5 to-blue-600/5 rounded-full blur-2xl"></div>
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
             <Logo size="lg"  />
            <div className="space-y-6">
              <h1 className="text-5xl font-bold text-slate-900 leading-tight">
                Join the Future of
                <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent"> Calxmap</span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Transform your expertise into influence and build meaningful connections with leading organizations worldwide.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4 group">
                  <div className="w-12 h-12 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Verified Network</h3>
                    <p className="text-slate-600">Join a trusted community of verified experts and leading institutions.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Instant Opportunities</h3>
                  <p className="text-slate-600">Get immediate access to exciting projects and collaboration opportunities.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 group">
                <div className="w-12 h-12 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Global Reach</h3>
                  <p className="text-slate-600">Connect with organizations and experts from around the world.</p>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-3">Why professionals choose Calxmap</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm text-slate-600">4.9/5 Rating</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">1000+ Projects</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-slate-600">Verified Experts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-slate-600">50+ Universities</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Enhanced Signup Form */}
          <div className="w-full max-w-2xl mx-auto lg:mx-0 relative group">
            {/* Subtle background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-2xl group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-all duration-500"></div>
            <Card className="border-2 border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 relative z-10">
              <CardHeader className="text-center pb-8">
                <div className="flex justify-center mb-6 lg:hidden">
                  <Logo size="lg" />
                </div>
                <CardTitle className="text-3xl font-bold text-slate-900">Create Account</CardTitle>
                <CardDescription className="text-slate-600 text-lg">
                  Choose your role and join our platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                  <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100 p-1">
                    <TabsTrigger value="expert" className="flex items-center space-x-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300 rounded-lg">
                      <Users className="h-4 w-4" />
                      <span>Expert</span>
                    </TabsTrigger>
                    <TabsTrigger value="institution" className="flex items-center space-x-2 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300 rounded-lg">
                      <BookOpen className="h-4 w-4" />
                      <span>University</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="expert" className="mt-4">
                    <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200 shadow-sm transition-all duration-300">
                      <h4 className="font-semibold text-slate-900 mb-2">For Experts</h4>
                      <p className="text-sm text-slate-600">
                        Share your expertise with leading universities and corporations. Build your brand and unlock flexible opportunities.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="institution" className="mt-4">
                    <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200 shadow-sm transition-all duration-300">
                      <h4 className="font-semibold text-slate-900 mb-2">For Universities</h4>
                      <p className="text-sm text-slate-600">
                        Connect with industry experts to enhance academic excellence and bridge the gap with industry.
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
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-12 transition-all duration-300 focus:shadow-lg focus:shadow-blue-500/20"
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : `Create ${activeTab === 'expert' ? 'Expert' : 'University'} Account`}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-500">Already have an account?</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link href="/auth/login">
                    <Button className="w-full h-12 text-base font-medium bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white shadow-sm hover:shadow-md transition-all duration-300">
                      Sign In to Your Account
                    </Button>
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
