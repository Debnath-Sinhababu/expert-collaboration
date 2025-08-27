'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Carousel } from '@/components/ui/carousel'
import { 
  Users, 
  BookOpen, 
  Star, 
  ArrowRight, 
  CheckCircle, 
  TrendingUp,
  Globe,
  Shield,
  Zap,
  Award,
  Building,
  GraduationCap,
  Briefcase
} from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Logo size="md" />
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Expert Collaboration
                </span>
                <p className="text-xs text-gray-500 font-medium">Connecting Excellence</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#home" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Home</Link>
              <Link href="#about" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">About</Link>
              <Link href="#how-it-works" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">How it Works</Link>
              <Link href="#contact" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">Contact</Link>
            </nav>
            
            <div className="flex items-center space-x-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="font-medium">Login</Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {user && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 py-12 text-center">
            <h1 className="text-4xl font-bold mb-4">Welcome back to Expert Collaboration</h1>
            <p className="text-xl text-blue-100 mb-8">Continue your journey in connecting education with expertise</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/expert/dashboard">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-medium">
                  Expert Dashboard
                </Button>
              </Link>
              <Link href="/institution/dashboard">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                  Institution Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {!user && (
        <>
          {/* Hero Section with Multiple Banners */}
          <section id="home" className="container mx-auto px-4 py-20">
            <div className="text-center mb-16">
              <div className="flex justify-center mb-8">
                <Logo size="lg" />
              </div>
              <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Transform Expertise into
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Influence</span>
              </h1>
              <p className="text-xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                The world's first Knowledge Networking Platform where experts become brands, 
                universities bridge with industry, and organizations find the right talent and ideas.
              </p>
            </div>

            {/* Audience-Specific Banners */}
            <div className="grid lg:grid-cols-3 gap-8 mb-16">
              {/* Expert Banner */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">For Experts</CardTitle>
                  <CardDescription className="text-gray-600">
                    Build your brand, showcase expertise, and unlock flexible opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3" />
                      Create comprehensive professional profile
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3" />
                      Set availability and preferred rates
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3" />
                      Apply to exciting projects
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3" />
                      Get verified and recognized
                    </li>
                  </ul>
                  <Link href="/auth/signup?role=expert">
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium">
                      Join as Expert
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* University Banner */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <GraduationCap className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">For Universities</CardTitle>
                  <CardDescription className="text-gray-600">
                    Connect with industry experts and enhance academic excellence
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-3" />
                      Post academic requirements
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-3" />
                      Review expert applications
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-3" />
                      Book qualified experts
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-3" />
                      Bridge industry gap
                    </li>
                  </ul>
                  <Link href="/auth/signup?role=institution">
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium">
                      Join as University
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Corporate Banner */}
              <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Building className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">For Corporates</CardTitle>
                  <CardDescription className="text-gray-600">
                    Find specialized talent and build strategic partnerships
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      Access specialized professionals
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      Hire CAs and lawyers
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      Build brand partnerships
                    </li>
                    <li className="flex items-center text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      Scale your expertise
                    </li>
                  </ul>
                  <Link href="/auth/signup?role=corporate">
                    <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium">
                      Join as Corporate
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" className="bg-white py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Simple, secure, and streamlined process for connecting expertise with opportunities
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-12">
                <div className="text-center group">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Connect</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Experts create profiles showcasing their expertise. Universities and corporates post their requirements.
                  </p>
                </div>

                <div className="text-center group">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Shield className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Verify</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Our KYC verification ensures all experts are qualified and trustworthy for academic and corporate engagements.
                  </p>
                </div>

                <div className="text-center group">
                  <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Collaborate</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Seamless booking, secure messaging, and professional feedback system for successful collaborations.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Universities Section */}
          <section className="bg-gradient-to-r from-gray-50 to-blue-50 py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Trusted Universities</h2>
                <p className="text-xl text-gray-600">
                  Leading educational institutions already transforming collaboration
                </p>
              </div>

              <Carousel itemsPerView={3} autoPlay={true} className="mb-12">
                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <GraduationCap className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">IIT Delhi</h3>
                    <p className="text-sm text-gray-600">Leading technical education with industry experts</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Delhi University</h3>
                    <p className="text-sm text-gray-600">Bridging academia with professional expertise</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">AIIMS</h3>
                    <p className="text-sm text-gray-600">Medical excellence through expert collaboration</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <GraduationCap className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">JNU</h3>
                    <p className="text-sm text-gray-600">Excellence in research and liberal education</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-teal-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">IISc Bangalore</h3>
                    <p className="text-sm text-gray-600">Premier institute for advanced scientific research</p>
                  </CardContent>
                </Card>
              </Carousel>
            </div>
          </section>

          {/* Expert Profiles Section */}
          <section className="bg-white py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Experts</h2>
                <p className="text-xl text-gray-600">
                  Meet our top-rated professionals ready to share their expertise
                </p>
              </div>

              <Carousel itemsPerView={3} autoPlay={true} className="mb-12">
                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                      <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-gray-600" />
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Dr. Rajesh Kumar</h3>
                    <div className="flex justify-center items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < 5 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                      <span className="text-sm text-gray-600 ml-2">5.0</span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">AI & Machine Learning</p>
                    <p className="text-xs text-gray-500">15+ years experience</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                      <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-gray-600" />
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Prof. Priya Sharma</h3>
                    <div className="flex justify-center items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                      <span className="text-sm text-gray-600 ml-2">4.8</span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Data Science & Analytics</p>
                    <p className="text-xs text-gray-500">12+ years experience</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                      <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-gray-600" />
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Mr. Arjun Patel</h3>
                    <div className="flex justify-center items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < 5 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                      <span className="text-sm text-gray-600 ml-2">4.9</span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Blockchain & Fintech</p>
                    <p className="text-xs text-gray-500">10+ years experience</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                      <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-gray-600" />
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Dr. Meera Singh</h3>
                    <div className="flex justify-center items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < 5 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                      <span className="text-sm text-gray-600 ml-2">4.7</span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Digital Marketing</p>
                    <p className="text-xs text-gray-500">8+ years experience</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                      <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-gray-600" />
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Mr. Vikram Gupta</h3>
                    <div className="flex justify-center items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < 5 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                      <span className="text-sm text-gray-600 ml-2">4.9</span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Legal & Compliance</p>
                    <p className="text-xs text-gray-500">20+ years experience</p>
                  </CardContent>
                </Card>
              </Carousel>
            </div>
          </section>

          {/* Corporate Partners Section */}
          <section className="bg-gradient-to-r from-purple-50 to-pink-50 py-20">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Corporate Partners</h2>
                <p className="text-xl text-gray-600">
                  Leading organizations building strategic partnerships with experts
                </p>
              </div>

              <Carousel itemsPerView={3} autoPlay={true} className="mb-12">
                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="h-8 w-8 text-orange-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Infosys</h3>
                    <p className="text-sm text-gray-600">Technology leadership through expert networks</p>
                    <p className="text-xs text-gray-500 mt-2">IT Services & Consulting</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">TCS</h3>
                    <p className="text-sm text-gray-600">Innovation through strategic expert partnerships</p>
                    <p className="text-xs text-gray-500 mt-2">Technology Solutions</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Globe className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Wipro</h3>
                    <p className="text-sm text-gray-600">Global expertise for digital transformation</p>
                    <p className="text-xs text-gray-500 mt-2">Digital Services</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building className="h-8 w-8 text-cyan-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Accenture</h3>
                    <p className="text-sm text-gray-600">Professional services and technology solutions</p>
                    <p className="text-xs text-gray-500 mt-2">Management Consulting</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-8 w-8 text-pink-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Deloitte</h3>
                    <p className="text-sm text-gray-600">Audit, consulting, and advisory services</p>
                    <p className="text-xs text-gray-500 mt-2">Professional Services</p>
                  </CardContent>
                </Card>

                <Card className="mx-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="h-8 w-8 text-yellow-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">KPMG</h3>
                    <p className="text-sm text-gray-600">Audit, tax and advisory services</p>
                    <p className="text-xs text-gray-500 mt-2">Big Four Accounting</p>
                  </CardContent>
                </Card>
              </Carousel>
            </div>
          </section>

          {/* Call-to-Action Section */}
          <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white py-20">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-5xl font-bold mb-6">Ready to Transform Your Future?</h2>
              <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
                Join the revolution where expertise meets opportunity. Whether you're an expert, university, or corporate organization, 
                your journey to meaningful collaboration starts here.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/auth/signup">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-bold text-lg px-8 py-4">
                    Get Started Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 font-bold text-lg px-8 py-4">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Professional Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <Logo size="sm" />
                <span className="text-xl font-bold">Expert Collaboration</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Transforming expertise into influence and connections into opportunities. 
                The world's first Knowledge Networking Platform.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="#about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#careers" className="text-gray-400 hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#press" className="text-gray-400 hover:text-white transition-colors">Press</Link></li>
                <li><Link href="#blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><Link href="#experts" className="text-gray-400 hover:text-white transition-colors">For Experts</Link></li>
                <li><Link href="#universities" className="text-gray-400 hover:text-white transition-colors">For Universities</Link></li>
                <li><Link href="#corporates" className="text-gray-400 hover:text-white transition-colors">For Corporates</Link></li>
                <li><Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link href="#help" className="text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="#privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">
              © 2025 Expert Collaboration. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="#twitter" className="text-gray-400 hover:text-white transition-colors">Twitter</Link>
              <Link href="#linkedin" className="text-gray-400 hover:text-white transition-colors">LinkedIn</Link>
              <Link href="#facebook" className="text-gray-400 hover:text-white transition-colors">Facebook</Link>
              <Link href="#instagram" className="text-gray-400 hover:text-white transition-colors">Instagram</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
