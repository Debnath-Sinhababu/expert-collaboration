'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
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
  Network,
  Menu
} from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import BackgroundBannerCarousel from '@/components/BackgroundBannerCarousel'
import Autoplay from "embla-carousel-autoplay"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Image from 'next/image'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [itemsPerView, setItemsPerView] = useState(3);
  const [scrolled, setScrolled] = useState(false);
  const [featuredUniversities, setFeaturedUniversities] = useState<{ name: string; desc: string; logo: string; color: string }[]>([])
  const [featuredExperts, setFeaturedExperts] = useState<any[]>([])
  const [userRole, setUserRole] = useState<'expert' | 'institution' | null>(null)
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false)
  
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
    const resolveRole = async () => {
      if (!user) { setUserRole(null); return }
      const metaRole = (user as any)?.user_metadata?.role
      if (metaRole === 'expert' || metaRole === 'institution') {
        setUserRole(metaRole)
        return
      }
      try {
        const [expert, institution] = await Promise.all([
          api.experts.getByUserId(user.id).catch(() => null),
          api.institutions.getByUserId(user.id).catch(() => null)
        ])
        if (expert) setUserRole('expert')
        else if (institution) setUserRole('institution')
        else setUserRole(null)
      } catch {
        setUserRole(null)
      }
    }
    resolveRole()
  }, [user])

  useEffect(() => {
    if (!user || !userRole) return
    const key = 'calxmap_welcome_dialog_shown'
    const shown = sessionStorage.getItem(key)
    if (!shown) {
      setShowWelcomeDialog(true)
      sessionStorage.setItem(key, '1')
    }
  }, [user, userRole])

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

  // Load featured universities dynamically (limit 5), reuse existing logo assets
  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const res = await api.institutions.getAll({ limit: 5 })
        const institutions = Array.isArray(res) ? res : (res?.data ?? [])
        const logos = [
          '/images/universitylogo3.jpeg',
          '/images/universityimage5.webp',
          '/images/universityimage6.jpeg',
          '/images/universityimage7.webp',
          '/images/universityimage9.webp',
        ]
        const colors = ['blue', 'purple', 'indigo', 'teal', 'blue']
        const mapped = institutions.slice(0, 5).map((inst: any, idx: number) => ({
          name: inst?.name || 'University',
          desc: inst?.description || 'Leading educational institution collaborating with experts',
          logo: logos[idx % logos.length],
          color: colors[idx % colors.length],
        }))
        setFeaturedUniversities(mapped)
      } catch (e) {
        // Fail silently; the fallback hardcoded list will render
      }
    }
    loadInstitutions()
  }, [])

  // Load featured experts dynamically (limit 5)
  useEffect(() => {
    const loadExperts = async () => {
      try {
        const res = await api.experts.getAll({ limit: 5, min_rating: 4, sort_by: 'rating', sort_order: 'desc' as const })
        const experts = Array.isArray(res) ? res : (res?.data ?? [])
        const colors = ['blue', 'purple', 'green', 'orange', 'cyan']
        const mapped = experts.slice(0, 5).map((e: any, idx: number) => ({
          name: e?.name || 'Expert',
          rating: typeof e?.rating === 'number' ? e.rating.toFixed(1) : (e?.rating ? String(e.rating) : '0.0'),
          expertise: e?.domain_expertise || (Array.isArray(e?.subskills) ? e.subskills.slice(0, 2).join(', ') : 'Expert'),
          experience: e?.experience_years ? `${e.experience_years}+ years` : '0 years',
          color: colors[idx % colors.length],
          photo: e?.photo_url || ''
        }))
        setFeaturedExperts(mapped)
      } catch (e) {
        // silent
      }
    }
    loadExperts()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-x-hidden">
      {/* Clean Modern Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-4 group">
             
              <div className="relative">
                <span className="text-xl sm:text-2xl font-bold text-white group-hover:text-blue-100 transition-all duration-300">
                 Calxmap
                </span>
                <p className="text-xs text-blue-100 font-medium group-hover:text-white transition-colors duration-300 hidden sm:block">knowledge sharing networking platform</p>
              </div>
            </div>
            
            {/* Navigation & CTA - Desktop */}
            <div className="hidden sm:flex items-center justify-end gap-2">
              <Link href="/contact-us">
                <Button variant="ghost" className="font-medium text-white hover:text-blue-100 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-300 px-3 py-2 text-sm sm:text-base">Contact Us</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" className="font-medium text-white hover:text-blue-100 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-300 px-3 py-2 text-sm sm:text-base">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-white hover:bg-blue-50 text-slate-900 hover:text-blue-900 font-medium shadow-sm hover:shadow-md transition-all duration-300 px-4 py-2 text-sm sm:text-base">Sign Up</Button>
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
                <DropdownMenuContent align="end" className="w-48">
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
      
      {/* Foreground Banner Carousel */}
      <div className="container mx-auto px-4 py-4">
        <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm">
          <BackgroundBannerCarousel foreground className="h-full" />
        </div>
      </div>

    

      {user && userRole && (
        <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">Welcome back to Calxmap</DialogTitle>
              <DialogDescription className="text-slate-600">Continue to your {userRole === 'expert' ? 'Expert' : 'Institution'} home page.</DialogDescription>
            </DialogHeader>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href={userRole === 'expert' ? '/expert/home' : '/institution/home'}>
                <Button className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white w-full">Go to {userRole === 'expert' ? 'Expert' : 'Institution'} Home</Button>
              </Link>
              <Button variant="outline" onClick={() => setShowWelcomeDialog(false)} className="w-full">Maybe later</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

     
        <>
          {/* Hero Section */}
          <section className="py-12 lg:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto text-center">
                <div className="flex justify-center mb-8">
                  <Logo size="lg" />
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                  Hire
                  <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent"> Experts.</span>
                  <br />
                  <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">Anytime.</span>
                  <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent"> Anywhere.</span>
                </h1>
                
                <p className="text-lg sm:text-xl lg:text-2xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                  <strong className="text-blue-700">Expert Marketplace</strong>, connecting corporates and universities with verified professionals — from <strong className="text-blue-700">Chartered Accountants and Corporate Lawyers</strong> to <strong className="text-blue-700">Industry Trainers and Technologists</strong>.
                </p>

                {/* Problem Statement */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 mb-12 shadow-sm">
                  <div className="flex items-center justify-center mb-4">
                    <Target className="h-8 w-8 text-red-500 mr-3" />
                    <h3 className="text-xl font-semibold text-slate-900">Why Calxmap?</h3>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                      <span className="text-slate-700 font-medium">For Education</span>
                      <span className="text-sm text-slate-600">Industry guest lectures, training & certification programs</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                      <span className="text-slate-700 font-medium">For Corporates</span>
                      <span className="text-sm text-slate-600">Hire CAs, Lawyers & Consultants on-demand</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                      <span className="text-slate-700 font-medium">For Experts</span>
                      <span className="text-sm text-slate-600">Monetize your skills with hourly & project-based work</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                      <span className="text-slate-700 font-medium">For CSR</span>
                      <span className="text-sm text-slate-600">Partner with us to boost employability & skill development</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/auth/signup?role=expert">
                    <Button size="lg" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-xl px-8 py-6 shadow-sm hover:shadow-md transition-all duration-300">
                      Hire an Expert
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </Button>
                  </Link>
                  <Link href="/auth/signup?role=expert">
                    <Button size="lg" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-xl px-8 py-6 shadow-sm hover:shadow-md transition-all duration-300">
                      Join as Expert
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </Button>
                  </Link>
                  <Link href="/auth/signup?role=institution">
                    <Button size="lg" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-xl px-8 py-6 shadow-sm hover:shadow-md transition-all duration-300">
                      Partner with Us
                      <ArrowRight className="ml-2 h-6 w-6" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Featured Carousel - Now in Foreground */}
           
            </div>
          </section>

          {/* About Calxmap Section */}
          <section className="py-12 lg:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="text-center mb-16">
                  <div className='flex flex-col sm:flex-row gap-x-2 justify-center items-center mb-5'>
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900">About Calxmap</h2>
                  <div className='h-10 w-20'>
                  <Image
    src="/images/calxmaplogo.png"
    alt="Calxmap Logo"
    width={60}
    height={60}
    className="block w-full h-full object-cover transition-all duration-300 rounded-md"
    priority
  />
                  </div>
                  </div>
                  <p className="text-lg sm:text-xl text-slate-600 max-w-4xl mx-auto mb-8">
                    At Calxmap, we believe knowledge creates opportunity. We are an <strong className="text-blue-700">Expert Marketplace</strong> that enables corporates and academic institutions to access verified professionals on-demand.
                </p>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
                    <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">For Businesses</h3>
                      <p className="text-slate-600 text-sm">We provide <strong className="text-blue-700">CAs, Corporate Lawyers, Trainers & Consultants</strong> for flexible hourly or project-based needs.</p>
                  </div>
                    <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-3">For Education</h3>
                      <p className="text-slate-600 text-sm">We bring <strong className="text-blue-700">guest lectures, workshops, and industry-driven training programs</strong> to colleges & universities.</p>
                  </div>
                </div>
                <div className="mt-8 text-center">
                    <p className="text-lg text-slate-600 mb-2"><strong className="text-blue-700">Our Mission:</strong> To bridge the gap between academia and industry by delivering expert-driven insights everywhere.</p>
                    <p className="text-lg text-slate-600"><strong className="text-blue-700">Our Vision:</strong> To become the largest on-demand expert marketplace in India, shaping the future of learning and work.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                  <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Verified Professionals</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                      <p className="text-slate-600 leading-relaxed">
                        Access <strong className="text-blue-700">Chartered Accountants, Corporate Lawyers, Trainers & Consultants</strong> with verified credentials and proven expertise.
                    </p>
                  </CardContent>
                </Card>

                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                  <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Clock className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Flexible Engagement</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                      <p className="text-slate-600 leading-relaxed">
                        Choose from <strong className="text-blue-700">hourly basis, project basis, or advisory sessions</strong> to match your specific business needs and budget.
                    </p>
                  </CardContent>
                </Card>

                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                  <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Industry Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                      <p className="text-slate-600 leading-relaxed">
                        Bridge the gap between <strong className="text-blue-700">academia and industry</strong> with real-world expertise and practical knowledge sharing.
                    </p>
                  </CardContent>
                </Card>
                </div>
              </div>
            </div>
          </section>

          {/* Audience-Specific Sections */}
          <section className="py-12 lg:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 mb-4">Built for Every Stakeholder</h2>
                  <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">
                  Whether you're an expert, university, or corporation, we have tailored solutions for your needs.
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* For Experts */}
                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                      <h3 className="text-3xl font-bold text-slate-900 mb-4">For Experts</h3>
                      <p className="text-slate-600 text-lg mb-6">
                      Turn your expertise into impact. Flexible work: hourly or project-based. Earn while sharing your knowledge with top corporates & universities.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Chartered Accountants</span>
                      </div>
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Corporate Lawyers</span>
                      </div>
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Industry Trainers</span>
                      </div>
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Business Consultants</span>
                      </div>
                    </div>
                    <Link href="/auth/signup?role=expert">
                        <Button className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold py-3 shadow-sm hover:shadow-md transition-all">
                        Join as Expert
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    </CardContent>
                </Card>

                {/* For Universities */}
                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                      <h3 className="text-3xl font-bold text-slate-900 mb-4">For Education</h3>
                      <p className="text-slate-600 text-lg mb-6">
                      Bring real-world knowledge into your classrooms. Connect with verified industry professionals for enhanced learning experiences.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Guest Lectures</span>
                      </div>
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Certification Programs</span>
                      </div>
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Workshops</span>
                      </div>
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Corporate Mentorship</span>
                      </div>
                    </div>
                    <Link href="/auth/signup?role=institution">
                        <Button className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold py-3 shadow-sm hover:shadow-md transition-all">
                        Hire a Trainer
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    </CardContent>
                </Card>

                {/* For Corporates */}
                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Building className="h-8 w-8 text-white" />
                    </div>
                      <h3 className="text-3xl font-bold text-slate-900 mb-4">For Corporates</h3>
                      <p className="text-slate-600 text-lg mb-6">
                      Empower your organization with expert support, when you need it. Access verified professionals for your business needs.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Chartered Accountants</span>
                      </div>
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Corporate Lawyers</span>
                      </div>
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Business Consultants</span>
                      </div>
                        <div className="flex items-center text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm">Industry Trainers</span>
                      </div>
                    </div>
                    <Link href="/coming-soon/corporate">
                        <Button className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold py-3 shadow-sm hover:shadow-md transition-all">
                        Post Your Requirement
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    </CardContent>
                </Card>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" className="mt-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className=" p-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 mb-4">How It Works</h2>
                  <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">
                  Simple, secure, and streamlined process for connecting expertise with opportunities
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-12">
                <div className="text-center group">
                    <div className="w-20 h-20 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Create & Connect</h3>
                    <p className="text-slate-600 leading-relaxed">
                    Experts build comprehensive profiles. Universities and corporations post their requirements with clear specifications.
                  </p>
                </div>

                <div className="text-center group">
                    <div className="w-20 h-20 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Smart Matching</h3>
                    <p className="text-slate-600 leading-relaxed">
                    Our AI-powered algorithm matches requirements with the most suitable experts based on skills, experience, and availability.
                  </p>
                </div>

                <div className="text-center group">
                    <div className="w-20 h-20 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Collaborate & Grow</h3>
                    <p className="text-slate-600 leading-relaxed">
                    Seamless booking, secure communication, and professional feedback system for successful long-term collaborations.
                  </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Statistics Section */}
          <section ref={statsRef} className="mt-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 mb-4">Trusted by Leading Institutions</h2>
                  <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">
                  Join thousands of experts and institutions already transforming collaboration
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-8">
                <div className="text-center group">
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {inView ? (
                      <CountUp 
                        start={0} 
                        end={100} 
                        duration={2.5} 
                        delay={0.2}
                        suffix="+"
                        className="inline-block"
                      />
                    ) : (
                      "0+"
                    )}
                  </div>
                    <div className="text-slate-600 font-medium">Verified Experts</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="text-center group">
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {inView ? (
                      <CountUp 
                        start={0} 
                        end={10} 
                        duration={2.5} 
                        delay={0.4}
                        suffix="+"
                        className="inline-block"
                      />
                    ) : (
                      "0+"
                    )}
                  </div>
                    <div className="text-slate-600 font-medium">Universities</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="text-center group">
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                    {inView ? (
                      <CountUp 
                        start={0} 
                        end={50} 
                        duration={2.5} 
                        delay={0.6}
                        suffix="+"
                        className="inline-block"
                      />
                    ) : (
                      "0+"
                    )}
                  </div>
                    <div className="text-slate-600 font-medium">Successful Projects</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="text-center group">
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
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
                    <div className="text-slate-600 font-medium">Average Rating</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CSR & Initiatives Section */}
          <section className="py-12 lg:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-8">
              <div className="text-center mb-16">
                  <div className="inline-flex items-center space-x-2 bg-blue-50 border-2 border-blue-200 px-6 py-3 rounded-full text-sm font-medium mb-6">
                    <Globe className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-700">CSR & Social Impact</span>
                </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 mb-4">Sikshit – Parshiksit – Viksit Bharat</h2>
                  <p className="text-lg sm:text-xl text-slate-600 max-w-4xl mx-auto mb-8">
                    In collaboration with <strong className="text-blue-700">STPI</strong>, Calxmap is running a <strong className="text-blue-700">CSR initiative</strong> to provide free access to training and expert-driven education for government institutions.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                  <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Empowering Students</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                      <p className="text-slate-600 leading-relaxed">
                      Empowering students with future-ready skills through free access to industry experts and training programs.
                    </p>
                  </CardContent>
                </Card>

                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                  <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Building className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Corporate Partnership</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                      <p className="text-slate-600 leading-relaxed">
                      Partnering with corporates for impactful CSR initiatives that bridge rural and urban skill gaps.
                    </p>
                  </CardContent>
                </Card>

                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                  <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">National Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                      <p className="text-slate-600 leading-relaxed">
                      Building a skilled India by connecting government institutions with industry expertise for sustainable development.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                <Link href="/auth/signup?role=institution">
                    <Button size="lg" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-xl px-8 py-6 shadow-sm hover:shadow-md transition-all duration-300">
                    Partner in CSR
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Universities */}
          <section className="py-12 lg:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 mb-4">Featured Universities</h2>
                  <p className="text-lg sm:text-xl text-slate-600">
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
                className="w-full max-w-6xl mx-auto"
              >
                <CarouselContent>
                  {(featuredUniversities.length > 0
                    ? featuredUniversities
                    : [
                        { name: "Shiv Nadar University", desc: "Leading technical education with industry experts", logo: '/images/universitylogo3.jpeg', color: "blue" },
                        { name: "Indian Statistical Institute Kolkata", desc: "Bridging academia with professional expertise", logo: '/images/universityimage5.webp', color: "purple" },
                        { name: "Tata Institute of Social Sciences", desc: "Excellence in research and liberal education", logo: '/images/universityimage6.jpeg', color: "indigo" },
                        { name: "Ashoka University", desc: "Premier institute for advanced scientific research", logo: '/images/universityimage7.webp', color: "teal" },
                        { name: "SRM Institute of Science and Technology", desc: "Leading technical education with industry experts", logo: '/images/universityimage9.webp', color: "blue" },
                      ]
                  ).map((uni, index) => (
                    <CarouselItem key={index} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                        <Card className="h-full mx-2 transition-all duration-300 border-2 border-slate-200 hover:border-blue-300 hover:shadow-md bg-white group">
                          <CardContent className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4 shadow-sm border-2 border-slate-200 group-hover:border-blue-300 transition-colors duration-300">
                            <img 
                              src={uni.logo} 
                              alt={`${uni.name} Logo`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                            <h3 className="font-bold text-slate-900 mb-2 text-lg">{uni.name}</h3>
                            <p className="text-sm text-slate-600">{uni.desc}</p>
                          
                            <div className={`w-16 h-0.5 bg-gradient-to-r from-${uni.color}-400 to-${uni.color === 'blue' ? 'indigo' : uni.color === 'purple' ? 'pink' : uni.color === 'indigo' ? 'blue' : 'teal'}-400 rounded-full mx-auto mt-4`}></div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
              </Carousel>
              </div>
            </div>
          </section>

          {/* Featured Experts */}
          <section className="py-12 lg:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 mb-4">Featured Experts</h2>
                  <p className="text-lg sm:text-xl text-slate-600">
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
                  {(featuredExperts.length > 0
                    ? featuredExperts
                    : [
                        { name: "Dr. Rajesh Kumar", rating: "5.0", expertise: "AI & Machine Learning", experience: "15+ years", color: "blue", photo: '' },
                        { name: "Prof. Priya Sharma", rating: "4.8", expertise: "Data Science & Analytics", experience: "12+ years", color: "purple", photo: '' },
                        { name: "Mr. Arjun Patel", rating: "4.9", expertise: "Blockchain & Fintech", experience: "10+ years", color: "green", photo: '' },
                        { name: "Dr. Meera Singh", rating: "4.7", expertise: "Digital Marketing", experience: "8+ years", color: "orange", photo: '' },
                        { name: "Mr. Vikram Gupta", rating: "4.9", expertise: "Legal & Compliance", experience: "20+ years", color: "cyan", photo: '' },
                      ]
                  ).map((expert: any, index: number) => (
                    <CarouselItem key={index} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                      <Card className="h-full mx-2 transition-all duration-300 border-2 border-slate-200 hover:border-blue-300 hover:shadow-md bg-white group">
                        <CardContent className="p-6 text-center">
                          {/* Expert photo (logo) or fallback avatar */}
                          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4 shadow-sm border-2 border-slate-200 group-hover:border-blue-300 transition-colors duration-300">
                            {expert.photo ? (
                              <img src={expert.photo} alt={expert.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                                <Users className="h-8 w-8 text-white" />
                              </div>
                            )}
                          </div>
                          
                          <h3 className="font-bold text-slate-900 mb-1 text-lg">{expert.name}</h3>
                          
                          {/* Rating display */}
                          <div className="flex justify-center items-center mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < Math.floor(parseFloat(expert.rating)) ? "text-yellow-500 fill-current" : "text-slate-300"}`} />
                            ))}
                            <span className="text-sm text-slate-600 ml-2 font-medium">{expert.rating}</span>
                          </div>
                          
                          <p className="text-sm text-slate-600 font-medium">{expert.expertise}</p>
                          <p className="text-xs text-slate-500">{expert.experience} experience</p>
                          
                          <div className={`w-16 h-0.5 bg-gradient-to-r from-${expert.color}-400 to-${expert.color === 'blue' ? 'indigo' : expert.color === 'purple' ? 'pink' : expert.color === 'green' ? 'emerald' : expert.color === 'orange' ? 'amber' : 'cyan'}-400 rounded-full mx-auto mt-4`}></div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
              </Carousel>
              </div>
            </div>
          </section>

          {/* Student Feedback & Analytics Section */}
          <section className="py-12 lg:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-4 sm:p-6 lg:p-8">
              <div className="text-center mb-12 sm:mb-16">
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 mb-4">Student Feedback & Analytics</h2>
                  <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">
                  Empowering students to share their voice and administrators to make data-driven decisions
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
                {/* Student Feedback Portal */}
                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                  <CardHeader className="text-center pb-6">
                      <div className="w-20 h-20 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <BookOpen className="h-10 w-10 text-white" />
                    </div>
                      <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">Student Feedback Portal</CardTitle>
                      <CardDescription className="text-slate-600 text-base sm:text-lg">
                      Share your valuable feedback on expert sessions and help improve learning experiences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pb-8">
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-center space-x-3 text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>Anonymous & Secure Feedback</span>
                      </div>
                        <div className="flex items-center justify-center space-x-3 text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>Quick & Easy Submission</span>
                      </div>
                        <div className="flex items-center justify-center space-x-3 text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>Help Drive Improvements</span>
                      </div>
                    </div>
                    <Link href="/student-feedback">
                        <Button size="lg" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 shadow-sm hover:shadow-md transition-all duration-300 w-full sm:w-auto">
                        Access Feedback Portal
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Analytics Dashboard */}
                  <Card className="bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group hover:border-blue-300">
                  <CardHeader className="text-center pb-6">
                      <div className="w-20 h-20 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <BarChart3 className="h-10 w-10 text-white" />
                    </div>
                      <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">Analytics Dashboard</CardTitle>
                      <CardDescription className="text-slate-600 text-base sm:text-lg">
                      Comprehensive insights and analytics for administrators and educators
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pb-8">
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-center space-x-3 text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>Real-time Feedback Analytics</span>
                      </div>
                        <div className="flex items-center justify-center space-x-3 text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>Performance Insights</span>
                      </div>
                        <div className="flex items-center justify-center space-x-3 text-slate-600">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>Data-Driven Decisions</span>
                      </div>
                    </div>
                    <Link href="/admin/feedback-analytics">
                        <Button size="lg" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 shadow-sm hover:shadow-md transition-all duration-300 w-full sm:w-auto">
                        View Analytics
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                </div>
              </div>
            </div>
          </section>

          {/* Call-to-Action Section */}
          <section className="py-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 shadow-sm text-center">
                <h2 className="text-3xl sm:text-4xl lg:text-[40px]  font-bold text-slate-900 mb-6">Ready to hire your next expert?</h2>
                <p className="text-lg sm:text-xl text-slate-600 mb-12 max-w-4xl mx-auto">
                Whether you're a corporate seeking on-demand professionals or a university bridging industry knowledge, 
                  <strong className="text-blue-700"> Calxmap is your partner for expert-driven success.</strong>
              </p>
              <div className="flex flex-col lg:flex-row gap-6 justify-center">
                <Link href="/auth/signup?role=institution">
                    <Button size="lg" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-xl px-12 py-6 shadow-sm hover:shadow-md transition-all duration-300">
                    Hire an Expert
                    <ArrowRight className="ml-3 h-6 w-6 hidden sm:block" />
                  </Button>
                </Link>
                <Link href="/auth/signup?role=expert">
                    <Button size="lg" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-xl px-12 py-6 shadow-sm hover:shadow-md transition-all duration-300">
                    Register as Expert
                    <ArrowRight className="ml-3 h-6 w-6 hidden sm:block" />
                  </Button>
                </Link>
                <Link href="/contact-us">
                    <Button size="lg" className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-bold text-xl px-12 py-6 shadow-sm hover:shadow-md transition-all duration-300">
                    Contact Us
                    <ArrowRight className="ml-3 h-6 w-6 hidden sm:block" />
                  </Button>
                </Link>
                </div>
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
