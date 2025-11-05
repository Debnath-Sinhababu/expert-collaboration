'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, ArrowLeft, Shield, Zap, CheckCircle, Users, GraduationCap, Menu } from 'lucide-react'
import Logo from '@/components/Logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

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
        } else if (role === 'student') {
          try {
            const s = await api.students.me()
            if (s) {
              router.push('/student/home')
            } else {
              router.push('/student/profile-setup')
            }
          } catch (error) {
            router.push('/student/profile-setup')
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
          {/* Left Side - Branding */}
          <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 py-12">
            <div className="space-y-6 mb-8">
              <h1 className="text-4xl font-bold text-slate-900 leading-tight">
                Welcome Back<br />
                to <span className="text-[#008260]">Calxmap</span>
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Enter your world of collaboration and curated insights.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="border-2 border-[#008260] rounded-2xl p-5 bg-white w-[288px] flex-shrink-0">
                <div className="w-12 h-12 bg-[#008260] rounded-xl flex items-center justify-center mb-3">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Enterprise Security</h3>
                <p className="text-xs text-slate-600">Your data is protected with enterprise-grade security and privacy measures.</p>
              </div>

              <div className="border-2 border-[#008260] rounded-2xl p-5 bg-white w-[288px]">
                <div className="w-12 h-12 bg-[#008260] rounded-xl flex items-center justify-center mb-3">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Instant Access</h3>
                <p className="text-xs text-slate-600">Get immediate access to your dashboard and start collaborating with experts.</p>
              </div>

              <div className="border-2 border-[#008260] rounded-2xl p-5 bg-white w-[288px]">
                <div className="w-12 h-12 bg-[#008260] rounded-xl flex items-center justify-center mb-3">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Global Network</h3>
                <p className="text-xs text-slate-600">Connect with verified experts and institutions worldwide.</p>
              </div>
            </div>
          </div>

          {/* Vertical Border */}
         

          {/* Right Side - Login Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center bg-white">
            <div className="w-full px-4 sm:px-6 lg:px-12">
              <div className="py-12">
                <div className="text-center mb-8">
                  
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in to continue</h2>
                </div>
                <div className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-900">Email Address</Label>
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
                    <Label htmlFor="password" className="text-sm font-medium text-slate-900">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 text-sm border-slate-300 focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] pr-10 rounded-lg"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                    <div className="text-right">
                      <Link href="/auth/forgot-password" className="text-xs text-[#0066FF] hover:text-[#0052CC] font-medium">
                        Forgot your password?
                      </Link>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-11 text-sm font-semibold bg-[#008260] hover:bg-[#006d51] text-white rounded-lg transition-all duration-300" 
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-slate-900 font-medium">New to Calxmap?</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link href="/auth/signup">
                    <Button className="w-full h-11 text-sm font-semibold bg-[#008260] hover:bg-[#006d51] text-white rounded-lg transition-all duration-300">
                      Create Your Account
                    </Button>
                  </Link>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
