'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, EyeOff, Users, BookOpen, Building, ArrowLeft, Shield, Zap, CheckCircle, Star, Globe, Award, MapPin, Clock, IndianRupee, ArrowRight } from 'lucide-react'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'

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
  const [topProjects, setTopProjects] = useState<any[]>([])
  const [loadingTop, setLoadingTop] = useState<boolean>(false)
  const desktopScrollRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)
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
       toast.success('Account created successfully! Please check your email to verify your account.')
        
       router.push('/auth/login')
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const role = searchParam.get('role') || 'expert'  // fallback to 'expert'
    setActiveTab(role)
  }, [searchParam])
  
  // Load latest open projects (Top Requirements)
  useEffect(() => {
    const loadTop = async () => {
      try {
        setLoadingTop(true)
        const data = await api.projects.getAll({ status: 'open', limit: 7 })
        const list = Array.isArray(data) ? data : (data?.data || [])
        setTopProjects(list)
      } catch (e) {
        console.error('Failed to load top requirements', e)
      } finally {
        setLoadingTop(false)
      }
    }
    loadTop()
  }, [])

  const formatTimeAgo = (isoDate?: string) => {
    if (!isoDate) return ''
    const now = new Date()
    const then = new Date(isoDate)
    const diff = Math.max(0, now.getTime() - then.getTime())
    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    return `${weeks}w ago`
  }

  // Auto-scroll vertical lists; pause on hover/touch
  useEffect(() => {
    const startAutoScroll = (ref: React.RefObject<HTMLDivElement>, speed: number) => {
      if (!ref.current) return () => {}
      let rafId: number | null = null
      let paused = false
      let last = 0
      const el = ref.current

      const step = (t: number) => {
        if (!el) return
        if (!last) last = t
        const dt = t - last
        last = t
        if (!paused) {
          const increment = (dt * 0.05) * speed // ~50px/sec at speed 1
          el.scrollTop += increment
          const max = el.scrollHeight - el.clientHeight - 1
          if (el.scrollTop >= max) {
            el.scrollTop = 0
          }
        }
        rafId = requestAnimationFrame(step)
      }

      const onEnter = () => { paused = true }
      const onLeave = () => { paused = false }
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)
      el.addEventListener('touchstart', onEnter)
      el.addEventListener('touchend', onLeave)
      rafId = requestAnimationFrame(step)

      return () => {
        if (rafId) cancelAnimationFrame(rafId)
        el.removeEventListener('mouseenter', onEnter)
        el.removeEventListener('mouseleave', onLeave)
        el.removeEventListener('touchstart', onEnter)
        el.removeEventListener('touchend', onLeave)
      }
    }

    const cleanups: Array<() => void> = []
    if (desktopScrollRef.current && topProjects.length > 0) {
      cleanups.push(startAutoScroll(desktopScrollRef, 1))
    }
    if (mobileScrollRef.current && topProjects.length > 0) {
      cleanups.push(startAutoScroll(mobileScrollRef, 0.8))
    }
    return () => { cleanups.forEach(fn => fn()) }
  }, [topProjects])
  

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
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12">
          {/* Left Side - Enhanced Branding + Top Requirements */}
          <div className="hidden lg:block space-y-8">
             <Logo size="lg"  />
            <div className="space-y-6">
              <h1 className="text-5xl font-bold text-slate-900 leading-tight">
                Join the Future of
                <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent"> Calxmap</span>
              </h1>
           
            </div>

          


            {/* Top Requirements - Desktop */}
            {topProjects.length > 0 ? (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Current Requirements</h3>
                <div ref={desktopScrollRef} className="space-y-3 max-h-[360px] overflow-y-auto pr-1 rounded-lg scrollbar-hide">
                  {topProjects.slice(0,5).map((p) => (
                    <div key={p.id}>
                      <div className="group rounded-lg border-2 border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer"
                        onClick={() => toast.warning('Pls create your account or login to view the project')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900 truncate group-hover:text-blue-700">{p.title}</h4>
                              <span className="text-xs text-slate-500">{formatTimeAgo(p.created_at)}</span>
                            </div>
                            <div className="flex items-center text-slate-600 text-xs gap-3">
                              {p.hourly_rate && (
                                <span className="flex items-center"><IndianRupee className="h-3 w-3 mr-1" />{p.hourly_rate}/hr</span>
                              )}
                              {p.institutions?.city && (
                                <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" />{p.institutions.city}{p.institutions?.state ? `, ${p.institutions.state}` : ''}</span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0 cursor-pointer"
                            onClick={() => toast.warning('Pls create your account or login to view the project')}
                           
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ):
            <div className="space-y-6">
                <p className="text-xl text-slate-600 leading-relaxed">
                Continue your journey in transforming expertise into influence and connections into opportunities.
              </p>
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
          
          }
             <div className="pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-3">Why professionals choose Calxmap</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm text-slate-600">4.9/5 Rating</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-slate-600">50+ Projects</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-slate-600">Verified Experts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-slate-600">10+ Universities</span>
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
                {/* Top Requirements - Mobile */}
                {topProjects.length > 0 && (
                  <div className="lg:hidden -mt-4 mb-2">
                    <h3 className="text-base font-semibold text-slate-900 mb-2">Current Requirements</h3>
                    <div ref={mobileScrollRef} className="space-y-2 max-h-72 overflow-y-auto -mr-1 pr-1 rounded-lg scrollbar-hide">
                      {topProjects.slice(0,5).map((p) => (
                        <div key={p.id} >
                          <div className="rounded-lg border-2 border-slate-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm transition-all duration-300 cursor-pointer"
                            onClick={() => toast.warning('Pls create your account or login to view the project')}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-medium text-slate-900 truncate">{p.title}</h4>
                                <div className="flex items-center text-slate-600 text-xs gap-2 mt-1">
                                  {p.hourly_rate && (
                                    <span className="flex items-center"><IndianRupee className="h-3 w-3 mr-1" />{p.hourly_rate}/hr</span>
                                  )}
                                  <span className="flex items-center"><Clock className="h-3 w-3 mr-1" />{formatTimeAgo(p.created_at)}</span>
                                </div>
                              </div>
                              <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0 cursor-pointer" 
                             
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
