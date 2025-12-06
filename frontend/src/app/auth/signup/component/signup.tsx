'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, EyeOff, Users, BookOpen, Building, ArrowLeft, Shield, Zap, CheckCircle, Star, Globe, Award, MapPin, Clock, IndianRupee, ArrowRight, Menu } from 'lucide-react'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export const dynamic = 'force-dynamic'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedRole, setSelectedRole] = useState<'student' | 'expert' | 'institution'>('expert')
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
            role: selectedRole,
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
    const roleParam = (searchParam.get('role') || 'expert').toLowerCase()
    if (roleParam === 'student' || roleParam === 'expert' || roleParam === 'institution') {
      setSelectedRole(roleParam as any)
    }
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
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Header */}
      <header className="bg-landing-header sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex flex-col space-y-1 group">
              <Link href="/">
                <Logo size="header" />
              </Link>
              <p className="text-xs text-blue-100 font-medium group-hover:text-white transition-colors duration-300 hidden sm:block">knowledge sharing networking platform</p>
            </div>
            
            {/* Navigation & CTA - Desktop */}
            <div className="hidden sm:flex items-center justify-end gap-2">
              <Link href="/requirements">
                <Button variant="ghost" className="font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 px-3 py-2 text-sm">Requirements</Button>
              </Link>
              <Link href="/solutions">
                <Button variant="ghost" className="font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 px-3 py-2 text-sm">Services</Button>
              </Link>
              <Link href="/contact-us">
                <Button variant="ghost" className="font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 px-3 py-2 text-sm">Contact Us</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" className="font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all duration-300 px-3 py-2 text-sm">Sign in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-white text-[#008260] font-semibold px-4 py-2 text-sm rounded-full shadow-none hover:bg-white/90">Get Started</Button>
              </Link>
            </div>

            {/* Navigation - Mobile Menu */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="font-medium text-white hover:text-blue-100 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-300 px-3 py-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <Link href="/requirements">
                    <DropdownMenuItem className="cursor-pointer">Requirements</DropdownMenuItem>
                  </Link>
                  <Link href="/solutions">
                    <DropdownMenuItem className="cursor-pointer">Services</DropdownMenuItem>
                  </Link>
                  <Link href="/contact-us">
                    <DropdownMenuItem className="cursor-pointer">Contact Us</DropdownMenuItem>
                  </Link>
                  <Link href="/auth/login">
                    <DropdownMenuItem className="cursor-pointer">Sign In</DropdownMenuItem>
                  </Link>
                  <Link href="/auth/signup">
                    <DropdownMenuItem className="cursor-pointer">Sign Up</DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="relative flex items-center justify-center min-h-[calc(100vh-80px)] bg-[#ECF2FF]">
        <div className="w-full h-full flex">
          {/* Left Side - Branding + Top Requirements */}
          <div className="hidden lg:flex lg:w-1/2 flex-col justify-start px-12 py-12">
            <div className="space-y-6 mb-8">
              <h1 className="text-4xl font-bold text-slate-900 leading-tight">
                Join the Future of<br />
                <span className="text-[#008260]">Calxmap</span>
              </h1>
            </div>

          


           
            <div className="flex flex-wrap gap-4">
              <div className="border-2 border-[#008260] rounded-2xl p-5 bg-white w-[288px] flex-shrink-0">
                <div className="w-12 h-12 bg-[#008260] rounded-xl flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Enterprise Security</h3>
                <p className="text-xs text-slate-600">Your data is protected with enterprise-grade security and privacy measures.</p>
              </div>

              <div className="border-2 border-[#008260] rounded-2xl p-5 bg-white w-[288px]">
                <div className="w-12 h-12 bg-[#008260] rounded-xl flex items-center justify-center mb-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Instant Access</h3>
                <p className="text-xs text-slate-600">Get immediate access to your dashboard and start collaborating with experts.</p>
              </div>

              <div className="border-2 border-[#008260] rounded-2xl p-5 bg-white w-[288px]">
                <div className="w-12 h-12 bg-[#008260] rounded-xl flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Global Network</h3>
                <p className="text-xs text-slate-600">Connect with verified experts and institutions worldwide.</p>
              </div>
            </div>
          
          
          </div>

          {/* Right Side - Signup Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center bg-white">
            <div className="w-full px-4 sm:px-6 lg:px-12">
              <div className="py-12">
                <div className="text-center mb-8">
                
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h2>
                  <p className="text-sm text-slate-600">Choose your role and join our platform</p>
                </div>
                <div className="space-y-6">
                {/* Top Requirements - Mobile */}
              
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Select Role</Label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                    <SelectTrigger className="h-12 border-slate-200">
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                      <SelectItem value="institution">Institution</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200 shadow-sm transition-all duration-300 mt-2">
                    {selectedRole === 'expert' && (
                      <>
                        <h4 className="font-semibold text-slate-900 mb-2">For Experts</h4>
                        <p className="text-sm text-slate-600">Share your expertise with leading universities and corporations. Build your brand and unlock flexible opportunities.</p>
                      </>
                    )}
                    {selectedRole === 'institution' && (
                      <>
                        <h4 className="font-semibold text-slate-900 mb-2">For Institutions</h4>
                        <p className="text-sm text-slate-600">Connect with industry experts to enhance academic excellence and bridge the gap with industry.</p>
                      </>
                    )}
                    {selectedRole === 'student' && (
                      <>
                        <h4 className="font-semibold text-slate-900 mb-2">For Students</h4>
                        <p className="text-sm text-slate-600">Discover internships, connect with corporates and experts, and build your career profile.</p>
                      </>
                    )}
                  </div>
                </div>

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
                      className="h-11 text-sm border-slate-300 focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] rounded-lg"
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
                        className="h-11 text-sm border-slate-300 focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] pr-10 rounded-lg"
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
                      className="h-11 text-sm border-slate-300 focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] rounded-lg"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold bg-[#008260] hover:bg-[#006d51] text-white rounded-lg transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : `Create ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Account`}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-black font-medium">Already have an account?</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link href="/auth/login">
                    <Button className="w-full h-11 text-base font-medium bg-[#008260] hover:bg-[#008260] text-white shadow-sm  transition-all duration-300">
                      Sign In to Your Account
                    </Button>
                  </Link>
                </div>

                {/* Student feedback entry point - clean design */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
