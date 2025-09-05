'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Carousel, CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious, } from '@/components/ui/carousel'
import CountUp from 'react-countup'
import { useInView } from 'react-intersection-observer'
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
  Briefcase,
  Lightbulb,
  Target,
  Clock,
  Users2,
  BarChart3,
  ArrowUpRight,
  Play,
  MessageSquare,
  DollarSign,
  Network
} from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import BackgroundBannerCarousel from '@/components/BackgroundBannerCarousel'
import Autoplay from "embla-carousel-autoplay"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [itemsPerView, setItemsPerView] = useState(3);
  const [scrolled, setScrolled] = useState(false);
  
  // Intersection observer for statistics animation
  const { ref: statsRef, inView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
    rootMargin: '-50px 0px'
  });

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

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setItemsPerView(1); // Mobile
      } else if (width < 1024) {
        setItemsPerView(2); // Tablet
      } else {
        setItemsPerView(3); // Desktop
      }
    };

    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 overflow-x-hidden">
      {/* Enhanced Modern Header */}
      <header className={`${scrolled ? 'bg-slate-900/98 shadow-2xl border-slate-600/60' : 'bg-slate-900/95 shadow-lg border-slate-700/50'} backdrop-blur-xl border-b sticky top-0 left-0 z-50 w-full transition-all duration-500`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center gap-2">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-4 group">
              <div className="relative">
                <Logo size="md" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500"></div>
              </div>
              <div className="relative">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-indigo-300 transition-all duration-300">
                 Calxmap
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-500"></div>
                <p className="text-xs text-slate-400 font-medium group-hover:text-slate-300 transition-colors duration-300">knowledge sharing networking platform</p>
              </div>
            </div>
            
            {/* Navigation & CTA */}
            <div className="flex items-center flex-wrap gap-2">
              <Link href="/contact-us">
                <Button variant="ghost" className="font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-slate-600 transition-all duration-300 px-4 py-2">
                  Contact Us
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" className="font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-slate-600 transition-all duration-300 px-4 py-2">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 px-4 py-2 border border-blue-400/20 hover:border-blue-400/40">
                 Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Dynamic bottom glow */}
        <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent transition-all duration-500 ${scrolled ? 'via-blue-400/50' : 'via-blue-500/30'}`}></div>
        
        {/* Additional subtle glow layers */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      </header>
      
    

      {user && (
        <div className="relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container mx-auto px-4 py-16 text-center relative z-10">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Welcome back to Calxmap
              </h1>
              <p className="text-xl lg:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Continue your journey in connecting education with expertise. Your dashboard awaits with new opportunities and insights.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/expert/dashboard">
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-lg px-8 py-6 shadow-2xl hover:shadow-3xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 hover:-translate-y-1 border-2 border-blue-400/20 hover:border-blue-400/40 group">
                    <Users className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                    Expert Dashboard
                    <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </Link>
                                  <Link href="/institution/dashboard">
                    <Button size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-lg px-8 py-6 shadow-2xl hover:shadow-3xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 hover:-translate-y-1 border-2 border-blue-400/20 hover:border-blue-400/40 group">
                      <Building className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                      Institution Dashboard
                      <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </Link>
              </div>
              
              {/* Trust indicators */}
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Active Projects</h3>
                  <p className="text-slate-400">Track your ongoing collaborations</p>
                </div>
                <div className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users2 className="h-8 w-8 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Network Growth</h3>
                  <p className="text-slate-400">Expand your professional connections</p>
                </div>
                <div className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Performance Insights</h3>
                  <p className="text-slate-400">Monitor your impact metrics</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

     
        <>
          {/* Hero Section */}
          <section className="relative py-20 lg:py-32 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
              
              {/* Background Banner Carousel */}
              <BackgroundBannerCarousel />
            </div>
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-6xl mx-auto text-center">
                <div className="flex justify-center mb-8">
                  <Logo size="lg" />
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                  Hire
                  <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent"> Experts.</span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Anytime.</span>
                  <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent"> Anywhere.</span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed">
                  Calxmap is India's leading <strong className="text-blue-400">Expert Marketplace</strong>, connecting corporates and universities with verified professionals — from <strong className="text-blue-400">Chartered Accountants and Corporate Lawyers</strong> to <strong className="text-blue-400">Industry Trainers and Technologists</strong>.
                </p>

                {/* Problem Statement */}
                <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 mb-12 shadow-2xl border border-slate-600">
                  <div className="flex items-center justify-center mb-4">
                    <Target className="h-8 w-8 text-red-400 mr-3" />
                    <h3 className="text-xl font-semibold text-white">Why Calxmap?</h3>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-6 w-6 text-green-400 mb-2" />
                      <span className="text-slate-300 font-medium">For Education</span>
                      <span className="text-sm text-slate-400">Industry guest lectures, training & certification programs</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-6 w-6 text-green-400 mb-2" />
                      <span className="text-slate-300 font-medium">For Corporates</span>
                      <span className="text-sm text-slate-400">Hire CAs, Lawyers & Consultants on-demand</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-6 w-6 text-green-400 mb-2" />
                      <span className="text-slate-300 font-medium">For Experts</span>
                      <span className="text-sm text-slate-400">Monetize your skills with hourly & project-based work</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-6 w-6 text-green-400 mb-2" />
                      <span className="text-slate-300 font-medium">For CSR</span>
                      <span className="text-sm text-slate-400">Partner with us to boost employability & skill development</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth/signup?role=expert">
                    <Button size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xl px-8 py-6 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-2 border-blue-400/20 hover:shadow-blue-500/25 hover:-translate-y-1">
                      Hire an Expert
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </Button>
                  </Link>
                  <Link href="/auth/signup?role=expert">
                    <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-xl px-8 py-6 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-2 border-green-400/20 hover:shadow-green-500/25 hover:-translate-y-1">
                      Join as Expert
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </Button>
                  </Link>
                  <Link href="/auth/signup?role=institution">
                    <Button size="lg" className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xl px-8 py-6 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-2 border-purple-400/20 hover:shadow-purple-500/25 hover:-translate-y-1">
                      Partner with Us
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Value Proposition Section */}
          <section className="py-20 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-10 right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
              
              {/* Academic Institution Banners */}
              <div className="absolute top-20 left-16 w-28 h-6 bg-gradient-to-r from-blue-500/25 to-indigo-500/25 rounded-lg blur-sm transform rotate-12 animate-pulse delay-500"></div>
              <div className="absolute top-32 right-24 w-32 h-5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg blur-sm transform -rotate-12 animate-pulse delay-1000"></div>
              <div className="absolute top-16 left-1/4 w-24 h-7 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-lg blur-sm transform rotate-6 animate-pulse delay-300"></div>
              
              <div className="absolute bottom-20 right-16 w-20 h-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg blur-sm transform -rotate-6 animate-pulse delay-1500"></div>
              <div className="absolute bottom-32 left-24 w-36 h-5 bg-gradient-to-r from-indigo-500/25 to-blue-500/25 rounded-lg blur-sm transform rotate-12 animate-pulse delay-2000"></div>
              <div className="absolute bottom-16 right-1/3 w-26 h-6 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg blur-sm transform -rotate-12 animate-pulse delay-800"></div>
              
              {/* Research Institute Elements */}
              <div className="absolute top-1/3 left-1/8 w-18 h-18 bg-gradient-to-r from-blue-500/12 to-indigo-500/12 rounded-full blur-xl animate-pulse delay-600"></div>
              <div className="absolute top-2/5 right-1/6 w-22 h-22 bg-gradient-to-r from-indigo-500/8 to-purple-500/8 rounded-full blur-xl animate-pulse delay-1200"></div>
              <div className="absolute bottom-1/3 left-1/6 w-16 h-16 bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-full blur-xl animate-pulse delay-900"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">About Calxmap</h2>
                <p className="text-xl text-slate-300 max-w-4xl mx-auto mb-8">
                  At Calxmap, we believe knowledge creates opportunity. We are an <strong className="text-blue-400">Expert Marketplace</strong> that enables corporates and academic institutions to access verified professionals on-demand.
                </p>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                    <h3 className="text-lg font-semibold text-white mb-3">For Businesses</h3>
                    <p className="text-slate-300 text-sm">We provide <strong className="text-blue-400">CAs, Corporate Lawyers, Trainers & Consultants</strong> for flexible hourly or project-based needs.</p>
                  </div>
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                    <h3 className="text-lg font-semibold text-white mb-3">For Education</h3>
                    <p className="text-slate-300 text-sm">We bring <strong className="text-blue-400">guest lectures, workshops, and industry-driven training programs</strong> to colleges & universities.</p>
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <p className="text-lg text-slate-300 mb-2"><strong className="text-blue-400">Our Mission:</strong> To bridge the gap between academia and industry by delivering expert-driven insights everywhere.</p>
                  <p className="text-lg text-slate-300"><strong className="text-blue-400">Our Vision:</strong> To become the largest on-demand expert marketplace in India, shaping the future of learning and work.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="border-0 bg-white/95 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-500 group hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15)'}}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Verified Professionals</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-slate-700 leading-relaxed">
                      Access <strong className="text-blue-600">Chartered Accountants, Corporate Lawyers, Trainers & Consultants</strong> with verified credentials and proven expertise.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-white/95 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-500 group hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.15)'}}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Clock className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Flexible Engagement</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-slate-700 leading-relaxed">
                      Choose from <strong className="text-indigo-600">hourly basis, project basis, or advisory sessions</strong> to match your specific business needs and budget.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-white/95 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-500 group hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(147, 51, 234, 0.25), 0 0 0 1px rgba(147, 51, 234, 0.15)'}}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Industry Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-lg text-slate-700 leading-relaxed">
                      Bridge the gap between <strong className="text-purple-600">academia and industry</strong> with real-world expertise and practical knowledge sharing.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Audience-Specific Sections */}
          <section className="py-20 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">Built for Every Stakeholder</h2>
                <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                  Whether you're an expert, university, or corporation, we have tailored solutions for your needs.
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* For Experts */}
                <Card className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 group overflow-hidden hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.2)'}}>
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold mb-4">For Experts</h3>
                    <p className="text-blue-100 text-lg mb-6">
                      Turn your expertise into impact. Flexible work: hourly or project-based. Earn while sharing your knowledge with top corporates & universities.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="flex items-center text-blue-100">
                        <CheckCircle className="h-5 w-5 text-blue-200 mr-2" />
                        <span className="text-sm">Chartered Accountants</span>
                      </div>
                      <div className="flex items-center text-blue-100">
                        <CheckCircle className="h-5 w-5 text-blue-200 mr-2" />
                        <span className="text-sm">Corporate Lawyers</span>
                      </div>
                      <div className="flex items-center text-blue-100">
                        <CheckCircle className="h-5 w-5 text-blue-200 mr-2" />
                        <span className="text-sm">Industry Trainers</span>
                      </div>
                      <div className="flex items-center text-blue-100">
                        <CheckCircle className="h-5 w-5 text-blue-200 mr-2" />
                        <span className="text-sm">Business Consultants</span>
                      </div>
                    </div>
                    <Link href="/auth/signup?role=expert">
                      <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 shadow-lg hover:shadow-xl transition-all">
                        Join as Expert
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>

                {/* For Universities */}
                <Card className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 group overflow-hidden hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.2)'}}>
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold mb-4">For Education</h3>
                    <p className="text-indigo-100 text-lg mb-6">
                      Bring real-world knowledge into your classrooms. Connect with verified industry professionals for enhanced learning experiences.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="flex items-center text-indigo-100">
                        <CheckCircle className="h-5 w-5 text-indigo-200 mr-2" />
                        <span className="text-sm">Guest Lectures</span>
                      </div>
                      <div className="flex items-center text-indigo-100">
                        <CheckCircle className="h-5 w-5 text-indigo-200 mr-2" />
                        <span className="text-sm">Certification Programs</span>
                      </div>
                      <div className="flex items-center text-indigo-100">
                        <CheckCircle className="h-5 w-5 text-indigo-200 mr-2" />
                        <span className="text-sm">Workshops</span>
                      </div>
                      <div className="flex items-center text-indigo-100">
                        <CheckCircle className="h-5 w-5 text-indigo-200 mr-2" />
                        <span className="text-sm">Corporate Mentorship</span>
                      </div>
                    </div>
                    <Link href="/auth/signup?role=institution">
                      <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-3 shadow-lg hover:shadow-xl transition-all">
                        Hire a Trainer
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>

                {/* For Corporates */}
                <Card className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 group overflow-hidden hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(16, 185, 129, 0.2)'}}>
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Building className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold mb-4">For Corporates</h3>
                    <p className="text-emerald-100 text-lg mb-6">
                      Empower your organization with expert support, when you need it. Access verified professionals for your business needs.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="flex items-center text-emerald-100">
                        <CheckCircle className="h-5 w-5 text-emerald-200 mr-2" />
                        <span className="text-sm">Chartered Accountants</span>
                      </div>
                      <div className="flex items-center text-emerald-100">
                        <CheckCircle className="h-5 w-5 text-emerald-200 mr-2" />
                        <span className="text-sm">Corporate Lawyers</span>
                      </div>
                      <div className="flex items-center text-emerald-100">
                        <CheckCircle className="h-5 w-5 text-emerald-200 mr-2" />
                        <span className="text-sm">Business Consultants</span>
                      </div>
                      <div className="flex items-center text-emerald-100">
                        <CheckCircle className="h-5 w-5 text-emerald-200 mr-2" />
                        <span className="text-sm">Industry Trainers</span>
                      </div>
                    </div>
                    <Link href="/auth/signup?role=expert">
                      <Button className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-bold py-3 shadow-lg hover:shadow-xl transition-all">
                        Post Your Requirement
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" className="py-20 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-10 left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
                <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                  Simple, secure, and streamlined process for connecting expertise with opportunities
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-12">
                <div className="text-center group">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-2xl hover:shadow-blue-500/40" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.25)'}}>
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Create & Connect</h3>
                  <p className="text-slate-200 leading-relaxed">
                    Experts build comprehensive profiles. Universities and corporations post their requirements with clear specifications.
                  </p>
                </div>

                <div className="text-center group">
                  <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-2xl hover:shadow-indigo-500/40" style={{boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.25)'}}>
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Smart Matching</h3>
                  <p className="text-slate-200 leading-relaxed">
                    Our AI-powered algorithm matches requirements with the most suitable experts based on skills, experience, and availability.
                  </p>
                </div>

                <div className="text-center group">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-2xl hover:shadow-purple-500/40" style={{boxShadow: '0 25px 50px -12px rgba(147, 51, 234, 0.4), 0 0 0 1px rgba(147, 51, 234, 0.25)'}}>
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Collaborate & Grow</h3>
                  <p className="text-slate-200 leading-relaxed">
                    Seamless booking, secure communication, and professional feedback system for successful long-term collaborations.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Statistics Section */}
          <section ref={statsRef} className="py-20 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-10 left-10 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl"></div>
              
              {/* University Achievement Banners */}
              <div className="absolute top-24 left-20 w-32 h-6 bg-gradient-to-r from-blue-500/25 to-indigo-500/25 rounded-lg blur-sm transform rotate-12 animate-pulse delay-300"></div>
              <div className="absolute top-36 right-28 w-28 h-5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg blur-sm transform -rotate-12 animate-pulse delay-800"></div>
              <div className="absolute top-20 left-1/3 w-24 h-7 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-lg blur-sm transform rotate-6 animate-pulse delay-500"></div>
              
              <div className="absolute bottom-24 right-20 w-20 h-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg blur-sm transform -rotate-6 animate-pulse delay-1200"></div>
              <div className="absolute bottom-36 left-28 w-36 h-5 bg-gradient-to-r from-indigo-500/25 to-blue-500/25 rounded-lg blur-sm transform rotate-12 animate-pulse delay-1500"></div>
              <div className="absolute bottom-20 right-1/3 w-26 h-6 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg blur-sm transform -rotate-12 animate-pulse delay-1000"></div>
              
              {/* Academic Excellence Elements */}
              <div className="absolute top-1/4 left-1/8 w-20 h-20 bg-gradient-to-r from-blue-500/12 to-indigo-500/12 rounded-full blur-xl animate-pulse delay-600"></div>
              <div className="absolute top-2/5 right-1/6 w-24 h-24 bg-gradient-to-r from-indigo-500/8 to-purple-500/8 rounded-full blur-xl animate-pulse delay-1000"></div>
              <div className="absolute bottom-1/3 left-1/6 w-18 h-18 bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-full blur-xl animate-pulse delay-700"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">Trusted by Leading Institutions</h2>
                <p className="text-xl text-slate-200 max-w-3xl mx-auto">
                  Join thousands of experts and institutions already transforming collaboration
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-8">
                <div className="text-center group">
                  <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {inView ? (
                      <CountUp 
                        start={0} 
                        end={500} 
                        duration={2.5} 
                        delay={0.2}
                        suffix="+"
                        className="inline-block"
                      />
                    ) : (
                      "0+"
                    )}
                  </div>
                  <div className="text-slate-200 font-medium">Verified Experts</div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="text-center group">
                  <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {inView ? (
                      <CountUp 
                        start={0} 
                        end={50} 
                        duration={2.5} 
                        delay={0.4}
                        suffix="+"
                        className="inline-block"
                      />
                    ) : (
                      "0+"
                    )}
                  </div>
                  <div className="text-slate-200 font-medium">Universities</div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="text-center group">
                  <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {inView ? (
                      <CountUp 
                        start={0} 
                        end={1000} 
                        duration={2.5} 
                        delay={0.6}
                        suffix="+"
                        className="inline-block"
                      />
                    ) : (
                      "0+"
                    )}
                  </div>
                  <div className="text-slate-200 font-medium">Successful Projects</div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="text-center group">
                  <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {inView ? (
                      <CountUp 
                        start={0} 
                        end={4.9} 
                        duration={2.5} 
                        delay={0.8}
                        decimals={1}
                        className="inline-block"
                      />
                    ) : (
                      "0.0"
                    )}
                    <span className="text-3xl">/5</span>
                  </div>
                  <div className="text-slate-200 font-medium">Average Rating</div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
            </div>
          </section>

          {/* CSR & Initiatives Section */}
          <section className="py-20 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-10 right-10 w-80 h-80 bg-green-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <div className="inline-flex items-center space-x-2 bg-green-500/20 backdrop-blur-sm px-6 py-3 rounded-full text-sm font-medium mb-6">
                  <Globe className="h-5 w-5 text-green-400" />
                  <span className="text-green-300">CSR & Social Impact</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">Sikshit – Parshiksit – Viksit Bharat</h2>
                <p className="text-xl text-slate-300 max-w-4xl mx-auto mb-8">
                  In collaboration with <strong className="text-green-400">STPI</strong>, Calxmap is running a <strong className="text-green-400">₹1000 Cr CSR initiative</strong> to provide free access to training and expert-driven education for government institutions.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <Card className="border-0 bg-white/95 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-500 group hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(34, 197, 94, 0.25), 0 0 0 1px rgba(34, 197, 94, 0.15)'}}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Empowering Students</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-slate-700 leading-relaxed">
                      Empowering students with future-ready skills through free access to industry experts and training programs.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-white/95 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-500 group hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.15)'}}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Building className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Corporate Partnership</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-slate-700 leading-relaxed">
                      Partnering with corporates for impactful CSR initiatives that bridge rural and urban skill gaps.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-white/95 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-500 group hover:scale-105 hover:-translate-y-2" style={{boxShadow: '0 25px 50px -12px rgba(6, 182, 212, 0.25), 0 0 0 1px rgba(6, 182, 212, 0.15)'}}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">National Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-slate-700 leading-relaxed">
                      Building a skilled India by connecting government institutions with industry expertise for sustainable development.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                <Link href="/auth/signup?role=institution">
                  <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-xl px-8 py-6 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-2 border-green-400/20 hover:shadow-green-500/25 hover:-translate-y-1">
                    Partner in CSR
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Featured Universities */}
          <section className="py-20 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-20 right-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">Featured Universities</h2>
                <p className="text-xl text-slate-300">
                  Leading educational institutions already transforming collaboration
                </p>
              </div>

              <Carousel
                opts={{
                  align: "start",
                }}
                plugins={[
                  Autoplay({
                    delay: 3000,
                  }),
                ]}
                className="w-full max-w-5xl mx-auto"
              >
                <CarouselContent>
                                     {[
                     { name: "IIT Delhi", desc: "Leading technical education with industry experts", logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop&crop=center', color: "blue" },
                     { name: "Delhi University", desc: "Bridging academia with professional expertise", logo: '/images/universitylogo1.jpeg', color: "purple" },
                     { name: "JNU", desc: "Excellence in research and liberal education", logo: '/images/universitylogo2.jpeg', color: "indigo" },
                     { name: "IISc Bangalore", desc: "Premier institute for advanced scientific research", logo: '/images/universitylogo3.jpeg', color: "teal" },
                   ].map((uni, index) => (
                    <CarouselItem key={index} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                      <Card className="h-full mx-2 transition-all duration-500 border-0 hover:scale-105 hover:-translate-y-2 bg-gradient-to-br from-slate-800/80 via-slate-700/80 to-slate-800/80 backdrop-blur-xl border border-slate-600/30 shadow-2xl hover:shadow-blue-500/25" style={{boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15)'}}>
                        <CardContent className="p-6 text-center relative overflow-hidden">
                          {/* Glowing background effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-lg"></div>
<div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4 shadow-lg border-2 border-white/20 relative z-10">
                            <img 
                              src={uni.logo} 
                              alt={`${uni.name} Logo`}
                              className="w-full h-full object-cover"
                             
                            />
                            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{display: 'none'}}>
                              {uni.name.split(' ')[1] || uni.name.split(' ')[0].substring(0, 2)}
                            </div>
                          </div>
                          
                          {/* Content with enhanced typography */}
                          <h3 className="font-bold text-white mb-2 text-lg relative z-10 drop-shadow-sm">{uni.name}</h3>
                          <p className="text-sm text-slate-300 relative z-10">{uni.desc}</p>
                          
                          {/* Bottom accent line */}
                          <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-${uni.color}-400 to-${uni.color === 'blue' ? 'indigo' : uni.color === 'purple' ? 'pink' : uni.color === 'indigo' ? 'blue' : 'teal'}-400 rounded-full mt-4`}></div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          </section>

          {/* Featured Experts */}
          <section className="py-20 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
              <div className="absolute top-10 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"></div>
            </div>
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">Featured Experts</h2>
                <p className="text-xl text-slate-300">
                  Meet our top-rated professionals ready to share their expertise
                </p>
              </div>

              <Carousel
                opts={{
                  align: "start"
                }}
                plugins={[
                  Autoplay({
                    delay: 3000,
                  }),
                ]}
                className="w-full max-w-6xl mx-auto"
              >
                <CarouselContent>
                  {[
                    { name: "Dr. Rajesh Kumar", rating: "5.0", expertise: "AI & Machine Learning", experience: "15+ years", color: "blue" },
                    { name: "Prof. Priya Sharma", rating: "4.8", expertise: "Data Science & Analytics", experience: "12+ years", color: "purple" },
                    { name: "Mr. Arjun Patel", rating: "4.9", expertise: "Blockchain & Fintech", experience: "10+ years", color: "green" },
                    { name: "Dr. Meera Singh", rating: "4.7", expertise: "Digital Marketing", experience: "8+ years", color: "orange" },
                    { name: "Mr. Vikram Gupta", rating: "4.9", expertise: "Legal & Compliance", experience: "20+ years", color: "cyan" },
                  ].map((expert, index) => (
                    <CarouselItem key={index} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                      <Card className="h-full mx-2 transition-all duration-500 border-0 hover:scale-105 hover:-translate-y-2 bg-gradient-to-br from-slate-800/80 via-slate-700/80 to-slate-800/80 backdrop-blur-xl border border-slate-600/30 shadow-2xl hover:shadow-purple-500/25" style={{boxShadow: '0 25px 50px -12px rgba(147, 51, 234, 0.25), 0 0 0 1px rgba(147, 51, 234, 0.15)'}}>
                        <CardContent className="p-6 text-center relative overflow-hidden">
                          {/* Glowing background effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-rose-500/5 rounded-lg"></div>
                          
                          {/* Enhanced avatar with gradient */}
                          <div className={`w-16 h-16 bg-gradient-to-r from-${expert.color}-500 to-${expert.color === 'blue' ? 'indigo' : expert.color === 'purple' ? 'pink' : expert.color === 'green' ? 'emerald' : expert.color === 'orange' ? 'amber' : 'cyan'}-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-${expert.color}-400/30 relative z-10 overflow-hidden`}>
                            <Users className="h-8 w-8 text-white drop-shadow-lg" />
                            {/* Subtle glow effect */}
                            <div className={`absolute inset-0 bg-${expert.color}-500/20 rounded-full blur-xl`}></div>
                          </div>
                          
                          {/* Content with enhanced typography */}
                          <h3 className="font-bold text-white mb-1 text-lg relative z-10 drop-shadow-sm">{expert.name}</h3>
                          
                          {/* Enhanced rating display */}
                          <div className="flex justify-center items-center mb-2 relative z-10">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < Math.floor(parseFloat(expert.rating)) ? "text-yellow-400 fill-current drop-shadow-sm" : "text-slate-500"}`} />
                            ))}
                            <span className="text-sm text-slate-200 ml-2 font-medium">{expert.rating}</span>
                          </div>
                          
                          <p className="text-sm text-slate-200 font-medium relative z-10">{expert.expertise}</p>
                          <p className="text-xs text-slate-400 relative z-10">{expert.experience} experience</p>
                          
                          {/* Bottom accent line */}
                          <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-${expert.color}-400 to-${expert.color === 'blue' ? 'indigo' : expert.color === 'purple' ? 'pink' : expert.color === 'green' ? 'emerald' : expert.color === 'orange' ? 'amber' : 'cyan'}-400 rounded-full mt-4`}></div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          </section>

          {/* Student Feedback & Analytics Section */}
          <section className="py-20 relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-10 left-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl"></div>
            </div>
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white mb-4">Student Feedback & Analytics</h2>
                <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                  Empowering students to share their voice and administrators to make data-driven decisions
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {/* Student Feedback Portal */}
                <Card className="border-0 bg-white/10 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-purple-500/25 transition-all duration-500 group hover:scale-105 hover:-translate-y-2">
                  <CardHeader className="text-center pb-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-2xl">
                      <BookOpen className="h-10 w-10 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-white mb-4">Student Feedback Portal</CardTitle>
                    <CardDescription className="text-slate-300 text-lg">
                      Share your valuable feedback on expert sessions and help improve learning experiences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pb-8">
                    <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-center space-x-3 text-slate-300">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span>Anonymous & Secure Feedback</span>
                      </div>
                      <div className="flex items-center justify-center space-x-3 text-slate-300">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span>Quick & Easy Submission</span>
                      </div>
                      <div className="flex items-center justify-center space-x-3 text-slate-300">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span>Help Drive Improvements</span>
                      </div>
                    </div>
                    <Link href="/student-feedback">
                      <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg px-8 py-6 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-2 border-purple-400/20 hover:shadow-purple-500/30 hover:-translate-y-1">
                        Access Feedback Portal
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Analytics Dashboard */}
                <Card className="border-0 bg-white/10 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-blue-500/25 transition-all duration-500 group hover:scale-105 hover:-translate-y-2">
                  <CardHeader className="text-center pb-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-2xl">
                      <BarChart3 className="h-10 w-10 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-white mb-4">Analytics Dashboard</CardTitle>
                    <CardDescription className="text-slate-300 text-lg">
                      Comprehensive insights and analytics for administrators and educators
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pb-8">
                    <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-center space-x-3 text-slate-300">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span>Real-time Feedback Analytics</span>
                      </div>
                      <div className="flex items-center justify-center space-x-3 text-slate-300">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span>Performance Insights</span>
                      </div>
                      <div className="flex items-center justify-center space-x-3 text-slate-300">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span>Data-Driven Decisions</span>
                      </div>
                    </div>
                    <Link href="/admin/feedback-analytics">
                      <Button size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-lg px-8 py-6 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-2 border-blue-400/20 hover:shadow-blue-500/30 hover:-translate-y-1">
                        View Analytics
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Call-to-Action Section */}
          <section className="py-20 relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
            </div>
            
            <div className="container mx-auto px-4 text-center relative z-10">
              <h2 className="text-5xl font-bold text-white mb-6">Ready to hire your next expert?</h2>
              <p className="text-xl text-slate-200 mb-12 max-w-4xl mx-auto">
                Whether you're a corporate seeking on-demand professionals or a university bridging industry knowledge, 
                <strong className="text-blue-400"> Calxmap is your partner for expert-driven success.</strong>
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/auth/signup?role=expert">
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xl px-12 py-6 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-2 border-blue-400/20 hover:shadow-blue-500/30 hover:-translate-y-1">
                    Hire an Expert
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Button>
                </Link>
                <Link href="/auth/signup?role=expert">
                  <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-xl px-12 py-6 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-2 border-green-400/20 hover:shadow-green-500/30 hover:-translate-y-1">
                    Register as Expert
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Button>
                </Link>
                <Link href="/contact-us">
                  <Button size="lg" className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xl px-12 py-6 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 border-2 border-purple-400/20 hover:shadow-purple-500/30 hover:-translate-y-1">
                    Contact Us
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </>
      
      {/* Professional Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <Logo size="sm" />
                <span className="text-xl font-bold">Calxmap</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Transforming expertise into influence and connections into opportunities. 
                The world's first knowledge sharing networking platform.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="#about" className="text-slate-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#careers" className="text-slate-400 hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#press" className="text-slate-400 hover:text-white transition-colors">Press</Link></li>
                <li><Link href="#blog" className="text-slate-400 hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><Link href="#experts" className="text-slate-400 hover:text-white transition-colors">For Experts</Link></li>
                <li><Link href="#universities" className="text-slate-400 hover:text-white transition-colors">For Universities</Link></li>
                <li><Link href="#corporates" className="text-slate-400 hover:text-white transition-colors">For Corporates</Link></li>
                <li><Link href="#pricing" className="text-slate-400 hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link href="#help" className="text-slate-400 hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#contact" className="text-slate-400 hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="#privacy" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#terms" className="text-slate-400 hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400">
              © 2025 Calxmap. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="#twitter" className="text-slate-400 hover:text-white transition-colors">Twitter</Link>
              <Link href="#linkedin" className="text-slate-400 hover:text-white transition-colors">LinkedIn</Link>
              <Link href="#facebook" className="text-slate-400 hover:text-white transition-colors">Facebook</Link>
              <Link href="#instagram" className="text-slate-400 hover:text-white transition-colors">Instagram</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
