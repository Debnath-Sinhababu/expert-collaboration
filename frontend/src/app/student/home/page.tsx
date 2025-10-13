'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { usePagination } from '@/hooks/usePagination'
import { Search, MapPin, IndianRupee, Briefcase, Star, Calendar, Clock } from 'lucide-react'

export default function StudentHome() {
  const [user, setUser] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Carousels
  const [experts, setExperts] = useState<any[]>([])
  const [universities, setUniversities] = useState<any[]>([])
  const [corporates, setCorporates] = useState<any[]>([])
  const [expertsLoading, setExpertsLoading] = useState(true)
  const [universitiesLoading, setUniversitiesLoading] = useState(true)
  const [corporatesLoading, setCorporatesLoading] = useState(true)

  // Filters for internships list
  const [search, setSearch] = useState('')
  const [workMode, setWorkMode] = useState<string>('all')
  const [engagement, setEngagement] = useState<string>('all')
  const [paid, setPaid] = useState<string>('all')
  const [minStipend, setMinStipend] = useState('')
  const [maxStipend, setMaxStipend] = useState('')
  const [skills, setSkills] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        try {
          const s = await api.students.me()
          setStudent(s)
        } catch (e: any) {
          // If missing profile, send to setup
          router.push('/student/profile-setup')
          return
        }
        // Load carousels
        loadExperts()
        loadUniversities()
        loadCorporates()
      } catch (e: any) {
        setError(e.message || 'Failed to load student home')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const loadExperts = async () => {
    try {
      setExpertsLoading(true)
      const expertsList = await api.experts.getAll({ page: 1, limit: 12, is_verified: true })
      setExperts(Array.isArray(expertsList) ? expertsList : (expertsList?.data || []))
    } catch (e) {
      console.error('Error loading experts:', e)
    } finally {
      setExpertsLoading(false)
    }
  }

  const loadUniversities = async () => {
    try {
      setUniversitiesLoading(true)
      const universityList = await api.institutions.getAll({ page: 1, limit: 12, exclude_type: 'Corporate' })
      const univArr = Array.isArray(universityList) ? universityList : (universityList?.data || [])
      setUniversities(univArr)
    } catch (e) {
      console.error('Error loading universities:', e)
    } finally {
      setUniversitiesLoading(false)
    }
  }

  const loadCorporates = async () => {
    try {
      setCorporatesLoading(true)
      const corporateList = await api.institutions.getAll({ page: 1, limit: 12, type: 'Corporate' })
      const corpArr = Array.isArray(corporateList) ? corporateList : (corporateList?.data || [])
      setCorporates(corpArr)
    } catch (e) {
      console.error('Error loading corporates:', e)
    } finally {
      setCorporatesLoading(false)
    }
  }

  const { data: internships, loading: listLoading, hasMore, loadMore } = usePagination(
    async (page: number) => {
      const params: any = { page, limit: 10, exclude_applied: 'true' }
      if (search) params.search = search
      if (workMode !== 'all') params.work_mode = workMode
      if (engagement !== 'all') params.engagement = engagement
      if (paid !== 'all') params.paid = paid
      if (minStipend) params.min_stipend = minStipend
      if (maxStipend) params.max_stipend = maxStipend
      if (skills) params.skills = skills
      if (location) params.location = location
      const data = await api.internships.getVisible(params)
      return Array.isArray(data) ? data : (data?.data || [])
    },
    [search, workMode, engagement, paid, minStipend, maxStipend, skills, location]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-[#008260] sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/student/home" className="flex items-center space-x-2 group">
              <span className="text-xl font-bold text-white group-hover:text-white/90 transition-all duration-300">CalXMap</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/student/home" className="text-white font-medium transition-colors duration-200 relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
              <Link href="/student/dashboard" className="text-white/80 hover:text-white font-medium transition-colors duration-200 relative group">
                Dashboard
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
              </Link>
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <Link href="/student/freelance" className="hidden md:inline-flex">
                <p className="text-white text-[15px] font-medium hover:text-white/80 transition-colors duration-200">Browse Freelance</p>
              </Link>
              <div className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200">
                <NotificationBell />
              </div>
              <ProfileDropdown user={user} student={student} userType="student" />
            </div>
          </div>
        </div>
      </header>

      {/* Partnered Universities Section */}
      {universities.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-[28px] font-semibold text-[#000000] mb-1">
                Partnered Universities
              </h2>
              <p className="text-[#000000CC] text-base font-normal">
                Trusted by leading educational institutions across India
              </p>
            </div>

            {universitiesLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260]"></div>
              </div>
            ) : (
              <Carousel
                opts={{
                  align: "start",
                  containScroll: "trimSnaps"
                }}
                plugins={[
                  Autoplay({
                    delay: 4000,
                  }),
                ]}
                className="w-full max-w-7xl mx-auto"
              >
                <CarouselContent className="-ml-2">
                  {universities.map((university, index) => {
                    const universityImages = [
                      '/images/universitylogo1.jpeg',
                      '/images/universitylogo2.jpeg', 
                      '/images/universitylogo3.jpeg',
                      '/images/universitylogo1.jpeg',
                      '/images/universitylogo2.jpeg'
                    ]
                    
                    return (
                      <CarouselItem key={university.id} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/2">
                        <div className="relative h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
                          {/* Background Image */}
                          <div 
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                              backgroundImage: `url('${universityImages[index % universityImages.length]}')`
                            }}
                          >
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                          </div>
                          
                          {/* University Name */}
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <h3 className="text-white font-bold text-xl mb-2 group-hover:text-blue-200 transition-colors duration-300">
                              {university.name}
                            </h3>
                            <p className="text-white/90 text-base mb-1">
                              {university.type || 'Educational Institute'}
                            </p>
                            <p className="text-white/80 text-sm">
                              {[university.city, university.state, university.country].filter(Boolean).join(', ') || 'India'}
                            </p>
                          </div>

                          {/* Hover Effect */}
                          <div className="absolute inset-0 bg-[#008260]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      </CarouselItem>
                    )
                  })}
                </CarouselContent>
                <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
              </Carousel>
            )}
          </div>
        </div>
      )}

      {/* Partnered Corporates Section */}
      {corporates.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-[28px] font-semibold text-[#000000] mb-1">
                Partnered Corporates
              </h2>
              <p className="text-[#000000CC] text-base font-normal">
                Explore opportunities with leading corporate partners
              </p>
            </div>

            {corporatesLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260]"></div>
              </div>
            ) : (
              <Carousel
                opts={{
                  align: "start",
                  containScroll: "trimSnaps"
                }}
                plugins={[
                  Autoplay({
                    delay: 3500,
                  }),
                ]}
                className="w-full max-w-7xl mx-auto"
              >
                <CarouselContent className="-ml-2">
                  {corporates.map((corporate, index) => {
                    const corporateImages = [
                      '/images/universityimage5.webp',
                      '/images/universityimage6.jpeg', 
                      '/images/universityimage7.webp',
                      '/images/universityimage9.webp',
                      '/images/universityimage5.webp'
                    ]
                    
                    return (
                      <CarouselItem key={corporate.id} className="pl-2 basis-full sm:basis-1/2 lg:basis-1/2">
                        <div className="relative h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group">
                          {/* Background Image */}
                          <div 
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                              backgroundImage: `url('${corporateImages[index % corporateImages.length]}')`
                            }}
                          >
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                          </div>
                          
                          {/* Corporate Name */}
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <h3 className="text-white font-bold text-xl mb-2 group-hover:text-blue-200 transition-colors duration-300">
                              {corporate.name}
                            </h3>
                            <p className="text-white/90 text-base mb-1">
                              {corporate.type || 'Corporate Partner'}
                            </p>
                            <p className="text-white/80 text-sm">
                              {[corporate.city, corporate.state, corporate.country].filter(Boolean).join(', ') || 'India'}
                            </p>
                          </div>

                          {/* Hover Effect */}
                          <div className="absolute inset-0 bg-[#008260]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      </CarouselItem>
                    )
                  })}
                </CarouselContent>
                <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
              </Carousel>
            )}
          </div>
        </div>
      )}

      {/* Partnered Experts Section */}
      {experts.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-[28px] font-semibold text-[#000000] mb-1">
                Partnered Experts
              </h2>
              <p className="text-[#000000CC] text-base font-normal">
                Connect with verified professionals in your field
              </p>
            </div>

            {expertsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260]"></div>
              </div>
            ) : (
              <Carousel
                opts={{
                  align: "start",
                  containScroll: "trimSnaps"
                }}
                plugins={[
                  Autoplay({
                    delay: 3000,
                  }),
                ]}
                className="w-full max-w-7xl mx-auto"
              >
                <CarouselContent className="-ml-2 pb-2">
                  {experts.map((expert, index) => (
                    <CarouselItem key={expert.id} className="pl-2 pt-2 pb-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                      <Card className="h-full mx-2 transition-all duration-300 bg-[#ECF2FF] shadow-[-4px_4px_4px_0px_#A0A0A040,_4px_4px_4px_0px_#A0A0A040] relative group border-2 border-[#D6D6D6]">
                        <div className="absolute inset-0 rounded-lg bg-[#008260] opacity-0 group-hover:opacity-5 transition-opacity duration-300 -z-10"></div>
                        <CardContent className="p-6 text-center relative group">
                          {/* Expert Avatar */}
                          <div className="relative mb-4">
                            {expert.photo_url ? (
                              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto shadow-lg border-2 border-[#008260] relative z-10 transition-colors duration-300">
                                <img 
                                  src={expert.photo_url} 
                                  alt={expert.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-[#008260] flex items-center justify-center mx-auto shadow-lg border-2 border-[#008260] relative z-10 overflow-hidden transition-colors duration-300">
                                <span className="text-white text-2xl font-bold">{expert.name?.charAt(0) || 'E'}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Expert Name */}
                          <h3 className="font-bold text-slate-900 mb-1 text-lg relative z-10 transition-colors duration-300">
                            {expert.name}
                          </h3>
                          
                          {/* Rating Display */}
                          <div className="flex justify-center items-center mb-2 relative z-10">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < Math.floor(expert.rating || 4.5) ? "text-yellow-400 fill-current" : "text-slate-300"}`} />
                            ))}
                            <span className="text-sm text-slate-600 ml-2 font-medium">
                              {expert.rating || '4.5'}
                            </span>
                          </div>
                          
                          {/* Expertise */}
                          <p className="text-sm text-slate-600 font-medium relative z-10 mb-1">
                            {expert.domain_expertise?.join(', ') || 'Professional Expert'}
                          </p>
                          
                          {/* Experience & Rate */}
                          <p className="text-xs text-slate-500 relative z-10 mb-2">
                            {expert.experience_years ? `${expert.experience_years}+ years` : 'Experienced'} • ₹{expert.hourly_rate || '1500'}/hr
                          </p>
                          
                          {/* Bottom accent line */}
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-[#008260] rounded-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="text-slate-600 hover:text-slate-900 hidden sm:block" />
                <CarouselNext className="text-slate-600 hover:text-slate-900 hidden sm:block" />
              </Carousel>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {error && (
          <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-black mb-2 leading-tight">
            Welcome back, <span className='text-[#008260]'>{student?.name || 'Student'}!</span>
          </h1>
          <p className="text-lg text-[#000000CC] font-medium leading-relaxed">
            Connect with top experts and create impactful learning experiences
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-[#D6D6D6] p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Search</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6A6A6A] h-4 w-4" />
                <Input 
                  className="pl-10 focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]" 
                  placeholder="Titles, responsibilities" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Work Mode</div>
              <Select value={workMode} onValueChange={setWorkMode}>
                <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="In office">In office</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Engagement</div>
              <Select value={engagement} onValueChange={setEngagement}>
                <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Paid</div>
              <Select value={paid} onValueChange={setPaid}>
                <SelectTrigger className="focus:ring-[#008260] focus:ring-1 focus:ring-offset-0 focus:border-[#008260]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Paid</SelectItem>
                  <SelectItem value="false">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Minimum Stipend (₹)</div>
              <Input 
                type="number" 
                className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                value={minStipend} 
                onChange={(e) => setMinStipend(e.target.value)} 
                placeholder="e.g. 5000" 
              />
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Maximum Stipend (₹)</div>
              <Input 
                type="number" 
                className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                value={maxStipend} 
                onChange={(e) => setMaxStipend(e.target.value)} 
                placeholder="e.g. 20000" 
              />
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Skills (comma-separated)</div>
              <Input 
                className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                value={skills} 
                onChange={(e) => setSkills(e.target.value)} 
                placeholder="e.g. Java, React" 
              />
            </div>
            <div>
              <div className="text-sm font-medium text-[#000000] mb-2">Location</div>
              <Input 
                className="focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="City" 
              />
            </div>
          </div>
        </div>

        {/* Internship Opportunities Section */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#000000] mb-1">Internship Opportunities</h2>
            <p className="text-[#6A6A6A] text-base font-normal">Browse internships from corporates</p>
          </div>

          {listLoading && internships.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008260]"></div>
            </div>
          ) : internships.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-[#D6D6D6]">
              <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">No internships found</p>
              <p className="text-sm text-slate-500">Try adjusting filters or check back later</p>
            </div>
          ) : (
            <div className="space-y-4">
              {internships.map((item: any) => {
                const createdDate = new Date(item.created_at)
                const formattedDate = createdDate.toLocaleDateString('en-US', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })
                
                return (
                  <Card key={item.id} className="bg-white border-2 border-[#D6D6D6] rounded-xl hover:border-[#008260] hover:shadow-md transition-all duration-300 group">
                    <CardContent className="p-6">
                      {/* Header with title and date */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-[#000000] mb-1 group-hover:text-[#008260] transition-colors duration-200">
                            {item.title}
                          </h3>
                          <p className="text-sm text-[#6A6A6A] mb-1">{item.corporate?.name || 'Corporate'}</p>
                        </div>
                        <Badge className="bg-[#FFF1E7] rounded-[18px] text-xs font-semibold text-[#FF6A00] py-2 px-4 flex-shrink-0 ml-3">
                          {formattedDate}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-[#6A6A6A] mb-4 line-clamp-2">
                        {item.responsibilities}
                      </p>

                      {/* Grid Layout for Details */}
                      <div className="grid grid-cols-3 gap-x-8 gap-y-4 mb-4">
                        <div>
                          <div className="text-[#717171] text-xs mb-1">Deadline:</div>
                          <div className="font-semibold text-[#000000] text-sm">
                            {item.start_date ? new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#717171] text-xs mb-1">Duration:</div>
                          <div className="font-semibold text-[#000000] text-sm">
                            {item.duration_value} {item.duration_unit}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#717171] text-xs mb-1">Stipend:</div>
                          <div className="font-semibold text-[#008260] text-sm">
                            {item.paid ? `₹${item.stipend_min}${item.stipend_max ? '-₹' + item.stipend_max : ''}/month` : 'Unpaid'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#717171] text-xs mb-1">Work Mode:</div>
                          <div className="font-semibold text-[#000000] text-sm">{item.work_mode}</div>
                        </div>
                        <div>
                          <div className="text-[#717171] text-xs mb-1">Engagement:</div>
                          <div className="font-semibold text-[#000000] text-sm">{item.engagement}</div>
                        </div>
                        <div>
                          <div className="text-[#717171] text-xs mb-1">Posted on:</div>
                          <div className="font-semibold text-[#000000] text-sm">
                            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {/* View Button */}
                      <div className="flex justify-end">
                        <Button 
                          className="bg-[#008260] hover:bg-[#006B4F] text-white font-medium rounded-full px-6"
                          onClick={() => router.push(`/student/internships/${item.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Infinite Scroll Loading */}
              {hasMore && !listLoading && (
                <div
                  ref={(el) => {
                    if (!el) return
                    const obs = new IntersectionObserver(([entry]) => {
                      if (entry.isIntersecting) loadMore()
                    }, { threshold: 0.2 })
                    obs.observe(el)
                    return () => obs.disconnect()
                  }}
                  className="flex justify-center py-6"
                >
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#008260]"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}


