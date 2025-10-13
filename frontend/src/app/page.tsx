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
  Menu,
  Verified
} from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import BackgroundBannerCarousel from '@/components/BackgroundBannerCarousel'
import Autoplay from "embla-carousel-autoplay"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuGroup } from '@/components/ui/dropdown-menu'
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent } from '@/components/ui/navigation-menu'
import { NAVIGATION } from '@/lib/servicelist'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [itemsPerView, setItemsPerView] = useState(3);
  const [scrolled, setScrolled] = useState(false);
  const [featuredUniversities, setFeaturedUniversities] = useState<{ name: string; desc: string; logo: string; color: string }[]>([])
  const [featuredExperts, setFeaturedExperts] = useState<any[]>([])
  const [userRole, setUserRole] = useState<'expert' | 'institution' | null>(null)
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false)
  const [exploreActiveIdx, setExploreActiveIdx] = useState(0)
  const [studentActiveIdx, setStudentActiveIdx] = useState(0)

  const exploreNav: any = (NAVIGATION as any[]).find((s: any) => s.label === 'Explore Experts')
  const studentNav: any = (NAVIGATION as any[]).find((s: any) => s.label === 'Student Marketplace')
  
  // Intersection observer for statistics animation
  const { ref: statsRef, inView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
    rootMargin: '-50px 0px'
  });

  const testimonials = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
      text: "CalXMap is one of the best services which doesn't only helps but make sure it works. I've been using CalXMap for years and they never disappoint. They also helps experts in a way like never before.",
      author: "Finance Expert"
    },
    {
      id: 2,
      image: "/images/universitylogo3.jpeg",
      text: "CalXMap is one of the best services which doesn't only helps but make sure it works. I've been using CalXMap for years and they never disappoint. They also helps experts in a way like never before.",
      author: "IMS Noida"
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
      text: "CalXMap is one of the best services which doesn't only helps but make sure it works. I've been using CalXMap for years and they never disappoint. They also helps experts in a way like never before.",
      author: "Students"
    }
  ];
  

  // Framer Motion variants
  const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }
  const slideLeft = { hidden: { opacity: 0, x: -24 }, visible: { opacity: 1, x: 0 } }
  const slideRight = { hidden: { opacity: 0, x: 24 }, visible: { opacity: 1, x: 0 } }
  const transition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  const zoomIn = { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 } }
  const rotateIn = { hidden: { opacity: 0, rotate: -2, y: 16 }, visible: { opacity: 1, rotate: 0, y: 0 } }
  const springTransition = { type: 'spring', stiffness: 180, damping: 18 }
  const popIn = { hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1 } }

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
          city: inst?.city || '',
          state: inst?.state || '',
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
    <div className="min-h-screen overflow-x-hidden">
      {/* Clean Modern Header */}
      <header className="bg-landing-header sticky top-0 z-50">
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
              {/* Explore Experts - Mega Menu */}
              <NavigationMenu className='lg:[&_div.absolute]:-left-[26rem] lg:[&_div.absolute]:top-12'>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="font-medium text-white/90 hover:text-white hover:bg-white/10 border border-transparent transition-all duration-300 px-3 py-2 text-sm sm:text-base bg-transparent">
                      Explore Experts
                    </NavigationMenuTrigger>
                    <NavigationMenuContent
  
                    >
                      <div className="rounded-lg border bg-white text-slate-900 shadow-md p-6 w-[calc(100vw-2rem)] max-w-[1050px] max-h-[75vh]">
                        <div className="flex">
                          {/* Left category rail */}
                          <div className="hidden md:block w-64 border-r p-3">
                            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold px-2 mb-2">Categories</div>
                            <ul className="space-y-1">
                              {exploreNav?.categories?.map((cat: any, idx: number) => (
                                <li key={idx}>
                                  <button onMouseEnter={() => setExploreActiveIdx(idx)} onFocus={() => setExploreActiveIdx(idx)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${exploreActiveIdx === idx ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                                    {cat.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {/* Right grid for active category */}
                          <div className="flex-1 p-5 overflow-y-auto">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(exploreNav?.categories?.[exploreActiveIdx]?.subcategories || exploreNav?.categories?.[exploreActiveIdx]?.items || []).map((sub: any, i: number) => (
                                <div key={i} className="border rounded-lg p-4 hover:shadow-sm transition bg-white">
                                  <div className="text-slate-900 font-semibold text-sm mb-2 break-all">{sub.label || sub}</div>
                                  {Array.isArray(sub.items) && sub.items.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {sub.items.map((item: string, ii: number) => (
                                        <a key={ii} href="#" className="text-xs text-slate-600 hover:text-slate-900 hover:underline">{item}</a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>

              {/* Student Marketplace - Mega Menu */}
              <NavigationMenu className='lg:[&_div.absolute]:-left-[30rem] lg:[&_div.absolute]:top-12'>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="font-medium text-white hover:text-blue-100 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-300 px-3 py-2 text-sm sm:text-base bg-transparent">
                      Student Marketplace
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="rounded-lg border bg-white text-slate-900 shadow-md p-6 w-[calc(100vw-2rem)] max-w-[1050px] max-h-[75vh]">
                        <div className="flex">
                          <div className="hidden md:block w-64 border-r p-3">
                            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold px-2 mb-2">Categories</div>
                            <ul className="space-y-1">
                              {studentNav?.categories?.map((cat: any, idx: number) => (
                                <li key={idx}>
                                  <button onMouseEnter={() => setStudentActiveIdx(idx)} onFocus={() => setStudentActiveIdx(idx)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${studentActiveIdx === idx ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                                    {cat.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex-1 p-5 overflow-y-auto max-h-[65vh]">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(studentNav?.categories?.[studentActiveIdx]?.subcategories || studentNav?.categories?.[studentActiveIdx]?.items || []).map((sub: any, i: number) => (
                                <div key={i} className="border rounded-lg p-4 hover:shadow-sm transition bg-white">
                                  <div className="text-slate-900 font-semibold text-sm mb-2 break-all">{sub.label || sub}</div>
                                  {Array.isArray(sub.items) && sub.items.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {sub.items.map((item: string, ii: number) => (
                                        <a key={ii} href="#" className="text-xs text-slate-600 hover:text-slate-900 hover:underline">{item}</a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
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
                  {/* Explore Experts nested mobile menu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">Explore Experts</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-80 max-h-[70vh] overflow-y-auto">
                      {exploreNav?.categories?.map((cat: any, cIdx: number) => (
                        <DropdownMenuSub key={cIdx}>
                          <DropdownMenuSubTrigger className="cursor-pointer">{cat.label}</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-72 max-h-[70vh] overflow-y-auto">
                            {Array.isArray(cat.subcategories) ? (
                              <div className="p-1">
                                {cat.subcategories.map((sub: any, subIdx: number) => (
                                  <div key={subIdx} className="px-2 py-1.5">
                                    <div className="text-sm font-medium text-slate-800">{sub.label}</div>
                                    {Array.isArray(sub.items) && sub.items.length > 0 && (
                                      <div className="mt-1 grid grid-cols-1 gap-1">
                                        {sub.items.map((item: string, iIdx: number) => (
                                          <a key={iIdx} href="#" className="text-sm text-slate-600 hover:text-slate-900">{item}</a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : Array.isArray(cat.items) && cat.items.length > 0 ? (
                              <div className="p-1">
                                {cat.items.map((item: string, iIdx: number) => (
                                  <DropdownMenuItem key={iIdx} className="cursor-pointer">{item}</DropdownMenuItem>
                                ))}
                              </div>
                            ) : null}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Student Marketplace nested mobile menu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">Student Marketplace</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-80 max-h-[70vh] overflow-y-auto">
                      {studentNav?.categories?.map((cat: any, cIdx: number) => (
                            <DropdownMenuSub key={cIdx}>
                              <DropdownMenuSubTrigger className="cursor-pointer">{cat.label}</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-72 max-h-[70vh] overflow-y-auto">
                                {Array.isArray(cat.subcategories) ? (
                                  <div className="p-1">
                                    {cat.subcategories.map((sub: any, subIdx: number) => (
                                      <div key={subIdx} className="px-2 py-1.5">
                                        <div className="text-sm font-medium text-slate-800">{sub.label}</div>
                                        {Array.isArray(sub.items) && sub.items.length > 0 && (
                                          <div className="mt-1 grid grid-cols-1 gap-1">
                                            {sub.items.map((item: string, iIdx: number) => (
                                              <a key={iIdx} href="#" className="text-sm text-slate-600 hover:text-slate-900">{item}</a>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : Array.isArray(cat.items) && cat.items.length > 0 ? (
                                  <div className="p-1">
                                    {cat.items.map((item: string, iIdx: number) => (
                                      <DropdownMenuItem key={iIdx} className="cursor-pointer">{item}</DropdownMenuItem>
                                    ))}
                                  </div>
                                ) : null}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
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
      
      {/* Hero image strip - full width cover */}
      <div className="bg-landing-hero">
        <div className="relative w-full h-[260px] sm:h-[320px] md:h-[380px] lg:h-[440px] overflow-hidden">
          <BackgroundBannerCarousel foreground className="h-full w-full" />
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
          {/* Hero Section (tag + headline) */}
          <section className="py-10 pb-20 bg-landing-hero">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-center">
                <div className="px-4 py-2 rounded-full border border-[#BACEFF] flex items-center bg-[#D5E1FF33] shadow-sm text-[#008260] text-sm font-medium gap-1">
                  <Shield className="h-4 w-4 text-[#008260]" />
                  Verified Professionals
                  </div>
              </div>
              <div
  className="mt-6 text-center text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.01em] leading-[1.1] text-transparent bg-clip-text"
  style={{
    backgroundImage: 'linear-gradient(90deg, #000000 0%, #008260 76.19%)',
  }}
>
  Your Trusted Gateway <br /> to India's Top Experts
</div>

            </div>
          </section>

          {/* Description + CTA + Stats */}
          <section className="py-12 lg:py-16 bg-landing-trusted">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              {/* Description paragraph */}
              <motion.p
                className="text-center text-base sm:text-lg text-slate-800 max-w-4xl mx-auto mb-8 leading-relaxed"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={transition}
              >
                Calxmap bridges organizations with India's most trusted professionals. Whether you need expert <strong>consultation</strong>, <strong>specialized training</strong>, or <strong>industry insights</strong> – our <strong>verified marketplace</strong> connects you with the right expertise, exactly when you need it.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={transition}
              >
                <Link href="/auth/signup?role=expert">
                  <Button size="lg" className="bg-[#008260] text-white font-semibold text-[16px] px-10 py-5 rounded-full shadow-none hover:opacity-95 transition-all duration-300">
                    Hire Expert
                  </Button>
                </Link>
                <Link href="/auth/signup?role=expert">
                  <Button size="lg" variant="outline" className="border-[#008260] text-[#008260] font-semibold text-[16px] px-10 py-5 rounded-full hover:bg-[#F0FFF8] transition-all duration-300">
                    Join as Expert
                  </Button>
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={transition}
              >
                {/* Stat 1 */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#DBE5FF] flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-[#008260]" />
                  </div>
                  <div className="text-4xl font-bold text-slate-900 mb-1">10,000+</div>
                  <div className="text-slate-600 font-medium">Verified Experts</div>
                </div>

                {/* Stat 2 */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#E3FFE5] flex items-center justify-center mb-4">
                    <Shield className="h-8 w-8 text-[#008260]" />
                  </div>
                  <div className="text-4xl font-bold text-slate-900 mb-1">100%</div>
                  <div className="text-slate-600 font-medium">Verified Professional</div>
                </div>

                {/* Stat 3 */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#FFFAD5] flex items-center justify-center mb-4">
                    <Star className="h-8 w-8 text-[#FFA800]" />
                  </div>
                  <div className="text-4xl font-bold text-slate-900 mb-1">4.9/5</div>
                  <div className="text-slate-600 font-medium">Client Satisfaction</div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Why choose CalxMap? */}
          <section className="py-12 lg:py-16 bg-ecf2ff">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-8">
              <motion.div
                className="text-center mb-16"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={transition}
              >
                  <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Why choose CalxMap?</h2>
                  <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto">
                  Here is the description for this section – need a change for sure so just ignore it, though this even consider a read, never mind.
                </p>
              </motion.div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Card 1 - Black */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={slideLeft}
                  transition={transition}
                >
                  <Card className="card-black rounded-md shadow-sm transition-all duration-300 h-full">
                    <CardContent className="p-8">
                      <TrendingUp className="h-10 w-10 text-white mb-6" />
                      <h3 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-4">Impactful Partnerships<br/>for Growth</h3>
                      <p className="text-slate-300 leading-relaxed text-base">
                        Empower your organization or institution to drive growth, upskill teams, and create tangible social impact. Partner with Calxmap for scalable solutions in knowledge sharing.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Card 2 - Green */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={zoomIn}
                  transition={transition}
                >
                  <Card className="card-green rounded-md shadow-sm transition-all duration-300 h-full">
                    <CardContent className="p-8">
                      <Shield className="h-10 w-10 text-white mb-6" />
                      <h3 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-4">Verified Experts, On<br/>Demand</h3>
                      <p className="text-white/90 leading-relaxed text-base">
                        Access a curated network of Chartered Accountants, Corporate Lawyers, Trainers, and Consultants with proven credentials—ready when you need them for projects.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Card 3 - Black */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={slideRight}
                  transition={transition}
                >
                  <Card className="card-black rounded-md shadow-sm transition-all duration-300 h-full">
                    <CardContent className="p-8">
                      <Zap className="h-10 w-10 text-white mb-6" />
                      <h3 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-4">Seamless Industry–<br/>Academia Collaboration</h3>
                      <p className="text-slate-300 leading-relaxed text-base">
                        Bridge the gap between academic learning and industry experience through tailored guest lectures, certification programs, and real-world mentorships powered by Calxmap.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
              </div>
            </div>
          </section>

          {/* Built for Everyone */}
          <section className="py-14 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={transition}
              >
                {/* Tag pill */}
                <div className="flex justify-center mb-6">
                  <div className="px-4 py-2 rounded-full bg-[#DBE5FF] text-[#008260] text-sm font-medium inline-flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    For Everyone
                  </div>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                  <span className="text-slate-900">Built for </span>
                  <span className="text-[#008260]">Everyone</span>
                </h2>
                <p className="text-base text-slate-600 max-w-2xl mx-auto">
                  Tailored solutions for experts, universities, and corporations
                </p>
              </motion.div>

              <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {/* For Experts */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={slideLeft}
                  transition={transition}
                >
                  <Card className="bg-[#F0F7FF] border-2 border-[#008260] rounded-lg shadow-none transition-all duration-300 h-full">
                    <CardContent className="p-8">
                      <div className="w-14 h-14 bg-[#008260] rounded-xl flex items-center justify-center mb-6">
                        <Users className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">For Experts</h3>
                      <p className="text-[#008260] font-semibold text-base mb-4">Monetize Expertise</p>
                      <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        Transform your knowledge into premium income opportunities
                      </p>
                      
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Flexible hourly & project work</span>
                        </li>
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Premium earning potential</span>
                        </li>
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Global client network</span>
                        </li>
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Professional growth</span>
                        </li>
                      </ul>

                      <Link href="/auth/signup?role=expert">
                        <Button className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-semibold py-5 rounded-lg transition-all text-sm">
                          Join as Expert →
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* For Education */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={zoomIn}
                  transition={transition}
                >
                  <Card className="bg-[#F0F7FF] border-2 border-[#008260] rounded-lg shadow-none transition-all duration-300 h-full">
                    <CardContent className="p-8">
                      <div className="w-14 h-14 bg-[#008260] rounded-xl flex items-center justify-center mb-6">
                        <GraduationCap className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">For Education</h3>
                      <p className="text-[#008260] font-semibold text-base mb-4">Enhance Learning</p>
                      <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        Connect students with transformative real-world knowledge
                      </p>
                      
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Expert guest lectures</span>
                        </li>
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Industry workshops</span>
                        </li>
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Certification programs</span>
                        </li>
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Mentorship opportunities</span>
                        </li>
                      </ul>

                      <Link href="/auth/signup?role=institution">
                        <Button className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-semibold py-5 rounded-lg transition-all text-sm">
                          Partner with Us →
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* For Corporates */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={slideRight}
                  transition={transition}
                >
                  <Card className="bg-[#F0F7FF] border-2 border-[#008260] rounded-lg shadow-none transition-all duration-300 h-full">
                    <CardContent className="p-8">
                      <div className="w-14 h-14 bg-[#008260] rounded-xl shadow-[-4px_4px_4px_0px_#E2E8F8] flex items-center justify-center mb-6">
                        <Building className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">For Corporates</h3>
                      <p className="text-[#008260] font-semibold text-base mb-4">On-Demand Services</p>
                      <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        Access verified experts for instant business acceleration
                      </p>
                      
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Chartered Accountants</span>
                        </li>
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Corporate Lawyers</span>
                        </li>
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>Business Consultants</span>
                        </li>
                        <li className="flex items-start text-slate-900 text-sm">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 mr-3 flex-shrink-0"></span>
                          <span className='font-medium'>24/7 availability</span>
                        </li>
                      </ul>

                      <Link href="/coming-soon/corporate">
                        <Button className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-semibold py-5 rounded-lg transition-all text-sm">
                          Hire Expert →
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" className="py-12 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={transition}
              >
                {/* Tag pill */}
                <div className="flex justify-center mb-6">
                  <div className="px-4 py-2 rounded-full bg-[#DBE5FF] shadow-[-4px_4px_4px_0px_#E2E8F8] text-[#008260] text-sm font-medium inline-flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Simple Process
                  </div>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                  <span className="text-slate-900">How it </span>
                  <span className="text-[#008260]">Works</span>
                </h2>
                <p className="text-base text-slate-600 max-w-2xl mx-auto">
                  Simple process connecting expertise with unlimited opportunities
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {/* Discover */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={slideLeft}
                  transition={transition}
                >
                  <Card className="bg-white border-2 border-slate-200 rounded-lg shadow-none transition-all duration-300 h-full overflow-hidden">
                    <CardContent className="p-0 h-full flex flex-col">
                      {/* Green background section with image */}
                      <div className="bg-[#008260] h-64 flex flex-col relative overflow-hidden">
                        {/* Title at top */}
                        <div className="pt-6 px-6">
                          <h3 className="text-2xl font-bold text-white">Discover</h3>
                        </div>
                        
                        {/* Image centered */}
                        <div className="flex-1 flex items-center justify-center">
                          <img 
                            src="/images/work1.jpg" 
                            alt="Discover" 
                            className="w-48 h-48 rounded-full object-cover"
                          />
                        </div>
                        
                        {/* Decorative white bars */}
                      
                      </div>
                      
                      {/* Content section */}
                      <div className="p-6 bg-[#F0F7FF] flex-1">
                        <p className="text-slate-600 text-base leading-relaxed font-medium">
                          Experts create verified profiles. Institutions post specific requirements with clear budgets and timelines.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Intelligent Matching */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={zoomIn}
                  transition={transition}
                >
                  <Card className="bg-white border-2 border-slate-200 rounded-lg shadow-none transition-all duration-300 h-full overflow-hidden">
                    <CardContent className="p-0 h-full flex flex-col">
                      {/* Green background section with image */}
                      <div className="bg-[#008260] h-64 flex flex-col relative overflow-hidden">
                        {/* Title at top */}
                        <div className="pt-6 px-6">
                          <h3 className="text-2xl font-bold text-white">Intelligent Matching</h3>
                        </div>
                        
                        {/* Image centered */}
                        <div className="flex-1 flex items-center justify-center">
                          <img 
                            src="/images/work2.png" 
                            alt="Intelligent Matching" 
                            className="w-56 h-auto object-contain"
                          />
                        </div>
                        
                        {/* Decorative white bars at bottom left */}
                     
                      </div>
                      
                      {/* Content section */}
                      <div className="p-6 bg-[#F0F7FF] flex-1">
                        <p className="text-slate-600 text-base leading-relaxed font-medium">
                          Our AI system finds perfect matches in under 5 minutes based on expertise and availability.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Engage & Excel */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={slideRight}
                  transition={transition}
                >
                  <Card className="bg-white border-2 border-slate-200 rounded-lg shadow-none transition-all duration-300 h-full overflow-hidden">
                    <CardContent className="p-0 h-full flex flex-col">
                      {/* Green background section with bars */}
                      <div className="bg-[#008260] h-64 flex flex-col relative overflow-hidden">
                        {/* Title at top */}
                        <div className="pt-6 px-6">
                          <h3 className="text-2xl font-bold text-white">Engage & Excel</h3>
                        </div>
                        
                        {/* Bar chart centered */}
                        <div className="flex-1 flex items-center justify-center">
                          <div className="flex items-end gap-4 h-32">
                            <div className="w-2 bg-white rounded-t-md" style={{ height: '100%' }}></div>
                            <div className="w-2 bg-white rounded-t-md" style={{ height: '75%' }}></div>
                            <div className="w-2 bg-white rounded-t-md" style={{ height: '55%' }}></div>
                            <div className="w-2 bg-white rounded-t-md" style={{ height: '40%' }}></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Content section */}
                      <div className="p-6 bg-[#F0F7FF] flex-1">
                        <p className="text-slate-600 text-base leading-relaxed font-medium">
                          Instant booking, secure payments, and outcome tracking ensure successful long-term partnerships.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Statistics Section */}
          {/* <section ref={statsRef} className="mt-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-8">
              <div className="text-center mb-16">
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 mb-4">Trusted by Leading Institutions</h2>
                  <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">
                  Join thousands of experts and institutions already transforming collaboration
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-8">
                <motion.div
                  className="text-center group"
                  initial="hidden"
                  animate={inView ? 'visible' : 'hidden'}
                  variants={popIn}
                  transition={springTransition}
                >
                    <motion.div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent group-hover:scale-110 transition-transform" initial={{ scale: 0.9, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}} transition={springTransition}>
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
                  </motion.div>
                    <div className="text-slate-600 font-medium">Verified Experts</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </motion.div>
                <motion.div
                  className="text-center group"
                  initial="hidden"
                  animate={inView ? 'visible' : 'hidden'}
                  variants={popIn}
                  transition={springTransition}
                >
                    <motion.div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent group-hover:scale-110 transition-transform" initial={{ scale: 0.9, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}} transition={springTransition}>
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
                  </motion.div>
                    <div className="text-slate-600 font-medium">Universities</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </motion.div>
                <motion.div
                  className="text-center group"
                  initial="hidden"
                  animate={inView ? 'visible' : 'hidden'}
                  variants={popIn}
                  transition={springTransition}
                >
                    <motion.div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent group-hover:scale-110 transition-transform" initial={{ scale: 0.9, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}} transition={springTransition}>
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
                  </motion.div>
                    <div className="text-slate-600 font-medium">Successful Projects</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </motion.div>
                <motion.div
                  className="text-center group"
                  initial="hidden"
                  animate={inView ? 'visible' : 'hidden'}
                  variants={popIn}
                  transition={springTransition}
                >
                    <motion.div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent group-hover:scale-110 transition-transform" initial={{ scale: 0.9, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}} transition={springTransition}>
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
                  </motion.div>
                    <div className="text-slate-600 font-medium">Average Rating</div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </motion.div>
                </div>
              </div>
            </div>
          </section> */}

          {/* CSR & Initiatives Section */}
       

          {/* Featured Universities */}
          <section className="py-10 pb-14 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={transition}
              >
                {/* Tag pill */}
                <div className="flex justify-center mb-6">
                  <div className="px-4 py-2 rounded-full bg-[#DBE5FF] text-[#008260] shadow-[-4px_4px_4px_0px_#E2E8F8] text-sm font-medium inline-flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Trusted Partners
                  </div>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                  <span className="text-slate-900">Trusted by </span>
                  <span className="text-[#008260]">Leading Institutions</span>
                </h2>
                <p className="text-base text-slate-600 max-w-2xl mx-auto">
                  Join thousands of universities transforming education through expert collaboration
                </p>
              </motion.div>

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
                        { name: "Shiv Nadar University", desc: "Leading technical education with industry experts", logo: '/images/universitylogo3.jpeg', type: "University", location: "Greater Noida, Uttar Pradesh, India" },
                        { name: "Indian Statistical Institute Kolkata", desc: "Bridging academia with professional expertise", logo: '/images/universityimage5.webp', type: "University", location: "Kolkata, West Bengal, India" },
                        { name: "Tata Institute of Social Sciences", desc: "Excellence in research and liberal education", logo: '/images/universityimage6.jpeg', type: "Educational Institute", location: "Mumbai, Maharashtra, India" },
                        { name: "Ashoka University", desc: "Premier institute for advanced scientific research", logo: '/images/universityimage7.webp', type: "University", location: "Sonipat, Haryana, India" },
                        { name: "SRM Institute of Science and Technology", desc: "Leading technical education with industry experts", logo: '/images/universityimage9.webp', type: "University", location: "Chennai, Tamil Nadu, India" },
                      ]
                  ).map((uni, index) => (
                    <CarouselItem key={index} className="basis-full sm:basis-1/2 lg:basis-1/2">
                      <Card className="h-80 overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group mx-2">
                        <CardContent className="p-0 h-full relative">
                          {/* Background Image with Overlay */}
                          <div className="absolute inset-0">
                            <img 
                              src={uni.logo} 
                              alt={uni.name}
                              className="w-full h-full object-cover"
                            />
                            {/* Dark gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
                          </div>
                          
                          {/* Content Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                            <h3 className="text-2xl font-bold mb-2">{uni.name}</h3>
                            <p className="text-sm text-white/80">
  {uni.city && uni.state ? `${uni.city}, ${uni.state}` : uni.desc}
</p>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
              </Carousel>
            </div>
          </section>

          {/* Featured Experts */}
          <section className="py-10 bg-[#F0F7FF]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-12"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={transition}
              >
                {/* Tag pill */}
                <div className="flex justify-center mb-5">
                  <div className="px-4 py-2 rounded-full bg-[#DBE5FF] text-[#008260] shadow-[-4px_4px_4px_0px_#E2E8F8] text-sm font-medium inline-flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Top Experts
                  </div>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-3">
                  <span className="text-slate-900">Featured </span>
                  <span className="text-[#008260]">Experts</span>
                </h2>
                <p className="text-base text-[#000000CC] max-w-2xl mx-auto">
                  Meet our top-rated professionals ready to drive your success forward
                </p>
              </motion.div>

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
                <CarouselContent className="pb-2">
                  {(featuredExperts.length > 0
                    ? featuredExperts
                    : [
                        { name: "Dr. Rajesh Kumar", rating: "5.0", expertise: "Chartered Accountant", experience: "15+ years", hourly_rate: "2500", photo: '' },
                        { name: "Prof. Priya Sharma", rating: "4.8", expertise: "Corporate Lawyer", experience: "12+ years", hourly_rate: "3000", photo: '' },
                        { name: "Mr. Arjun Patel", rating: "4.9", expertise: "Industry Trainer", experience: "10+ years", hourly_rate: "2000", photo: '' },
                        { name: "Dr. Meera Singh", rating: "4.7", expertise: "Business Consultant", experience: "8+ years", hourly_rate: "2800", photo: '' },
                        { name: "Mr. Vikram Gupta", rating: "4.9", expertise: "Chartered Accountant", experience: "20+ years", hourly_rate: "3500", photo: '' },
                      ]
                  ).map((expert: any, index: number) => (
                    <CarouselItem key={index} className="basis-full sm:basis-1/2 md:basis-1/3 pt-2 pb-4">
                      <Card className="h-full mx-2 transition-all duration-300 shadow-[-4px_4px_4px_0px_#A0A0A040,_4px_4px_4px_0px_#A0A0A040] bg-[#ECF2FF] border-0 rounded-2xl group">
                        <CardContent className="p-6 flex flex-col items-center">
                          {/* Expert photo */}
                          <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 shadow-md">
                            {expert.photo ? (
                              <img src={expert.photo} alt={expert.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <Users className="h-12 w-12 text-white" />
                              </div>
                            )}
                          </div>
                          
                          <h3 className="font-bold text-slate-900 mb-2 text-xl text-center">{expert.name}</h3>
                          
                          {/* Expertise badge */}
                          <div className="px-4 py-1.5 rounded-full bg-[#C8E6F5] text-[#008260] text-sm font-medium mb-3">
                            {expert.expertise}
                          </div>

                          {/* Experience with clock icon */}
                          <div className="flex items-center gap-2 text-slate-600 text-sm mb-3">
                            <Clock className="h-4 w-4" />
                            <span>{expert.experience}</span>
                          </div>
                          
                          {/* Rating display */}
                          <div className="flex items-center gap-1 mb-4">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < Math.floor(parseFloat(expert.rating)) ? "text-yellow-500 fill-yellow-500" : "text-slate-300"}`} />
                            ))}
                            <span className="text-sm text-slate-900 ml-1 font-bold">{expert.rating}</span>
                          </div>

                          {/* Specialty/Domain */}
                          <p className="text-sm text-slate-900 font-medium text-center mb-3">
                            {expert.domain || "Corporate Tax & Compliance"}
                          </p>
                          
                          {/* Hourly rate */}
                          <p className="text-2xl font-bold text-[#008260] mb-4">
                            ₹{expert.hourly_rate || "2,500"}/hr
                          </p>

                          {/* View Profile button */}
                          <Button className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-semibold py-2 rounded-lg transition-all">
                            View Profile
                          </Button>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
              </Carousel>
            </div>
          </section>

          {/* Student Feedback & Analytics Section */}
          <section className="py-10">
          <div className="flex justify-center">
                  <div className="px-4 py-2 rounded-full shadow-[-4px_4px_4px_0px_#E2E8F8] bg-[#DBE5FF] text-[#008260] text-sm font-medium inline-flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Features
                  </div>
                </div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="p-4 sm:p-6 lg:p-8">
              <motion.div
                className="text-center mb-12 sm:mb-16"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                transition={transition}
              >
                  <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold  mb-4 flex flex-col justify-center items-center">
                    <span className="text-[#000000]">Student 
                    </span>
                   <span className='text-[#008260]'> Feedback & Analytics </span>
                    </h2>
                  <p className="text-lg sm:text-xl text-[#000000CC] max-w-3xl mx-auto font-medium">
                  Empowering students to share their voice and administrators to make data-driven decisions
                </p>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
                {/* Student Feedback Portal */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={slideLeft}
                    transition={transition}
                  >
                  <Card className="bg-white rounded-[18px] transition-all duration-300">
                  <CardHeader className="text-center pb-6">
                      <div className="w-14 h-14 bg-[#008260] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <Star className="h-6 w-6 text-white" />
                    </div>
                      <CardTitle className="text-[22px] font-bold text-[#000000] mb-4">Student Feedback Portal</CardTitle>
                      <CardDescription className="text-[#555555] text-base sm:text-lg">
                      Share your valuable feedback on expert sessions and help improve learning experiences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pb-8">
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-center space-x-3 text-[#555555] text-base font-medium">
                          <CheckCircle className="h-5 w-5 text-[#008260]" />
                        <span>Anonymous & Secure Feedback</span>
                      </div>
                        <div className="flex items-center justify-center space-x-3 text-[#555555] text-base font-medium">
                          <CheckCircle className="h-5 w-5 text-[#008260]" />
                        <span>Quick & Easy Submission</span>
                      </div>
                        <div className="flex items-center justify-center space-x-3 text-[#555555] text-base font-medium">
                          <CheckCircle className="h-5 w-5 text-[#008260]" />
                        <span>Help Drive Improvements</span>
                      </div>
                    </div>
                    <Link href="/student-feedback">
                        <Button size="lg" className="bg-[#008260] hover:bg-[#008260] text-white font-semibold text-[15px] px-6 sm:px-8 py-4 sm:py-6  w-full sm:w-auto rounded-[18px]">
                        Access Feedback Portal
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                  </motion.div>

                {/* Analytics Dashboard */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={slideRight}
                    transition={transition}
                  >
                  <Card className="bg-white rounded-[18px] transition-all duration-300">
                  <CardHeader className="text-center pb-6">
                      <div className="w-14 h-14 bg-[#008260] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                      <CardTitle className="text-[22px] font-bold text-[#000000] mb-4">Analytics Dashboard</CardTitle>
                      <CardDescription className="text-[#555555] text-base sm:text-lg">
                      Comprehensive insights and analytics for administrators and educators
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pb-8">
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-center space-x-3 text-[#555555] text-base font-medium">
                          <CheckCircle className="h-5 w-5 text-[#008260]" />
                        <span>Real-time Feedback Analytics</span>
                      </div>
                        <div className="flex items-center justify-center space-x-3 text-[#555555] text-base font-medium">
                          <CheckCircle className="h-5 w-5 text-[#008260]" />
                        <span>Performance Insights</span>
                      </div>
                        <div className="flex items-center justify-center space-x-3 text-[#555555] text-base font-medium">
                          <CheckCircle className="h-5 w-5 text-[#008260]" />
                        <span>Data-Driven Decisions</span>
                      </div>
                    </div>
                    <Link href="/admin/feedback-analytics">
                        <Button size="lg" className="bg-[#008260] hover:bg-[#008260] text-white font-semibold text-[15px] px-6 sm:px-8 py-4 sm:py-6  w-full sm:w-auto rounded-[18px]">
                        View Analytics
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                  </motion.div>
                </div>
              </div>
            </div>
          </section>

          <section className=''>
           <div className='flex justify-center flex-col bg-white items-center'>
            <p className='text-[#000000] text-[42px] font-bold text-center'>What Our Clients Say</p>
            <div className="grid md:grid-cols-3 gap-8 p-10">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-[#ECF2FF] rounded-3xl p-8 flex flex-col max-w-[400px]"
            >
              {/* Avatar */}
              <div className="mb-6">
                <img
                  src={testimonial.image}
                  alt={testimonial.author}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                />
              </div>

              {/* Testimonial Text */}
              <div className="flex-grow mb-6">
                <p className="text-slate-900 text-lg leading-relaxed">
                  {testimonial.text}
                </p>
              </div>

              {/* Author */}
              <div className="mt-auto">
                <p className="text-slate-900 font-semibold text-lg">
                  - {testimonial.author}
                </p>
              </div>
            </div>
          ))}
        </div>
           </div>
          </section>

          <div className="w-full px-4 py-16">
      <div className="container mx-auto max-w-7xl">
        <div className="bg-[#008260] rounded-3xl px-8 py-16 shadow-lg">
          <div className="text-center">
            {/* Heading */}
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>

            {/* Subtitle */}
            <p className="text-white text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Join thousands transforming collaboration through our platform
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Start Hiring Button */}
              <button className="bg-white text-[#008260] px-8 py-3 rounded-full font-semibold text-lg hover:bg-slate-50 transition-all duration-300 shadow-md hover:shadow-lg flex items-center space-x-2 min-w-[200px] justify-center">
                <span>Start Hiring</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              {/* Become an Expert Button */}
              <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-semibold text-lg transition-all duration-300 min-w-[200px]">
                Become an Expert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

          {/* Call-to-Action Section */}
       
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
