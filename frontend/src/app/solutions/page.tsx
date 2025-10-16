'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NAV_CATALOG, type NavGroup, type NavItem, type Renderer } from '@/lib/navigation.catalog'
import { api } from '@/lib/api'
import Logo from '@/components/Logo'
import { ChevronDown, ChevronRight, GraduationCap, Building2, Users2, UserPlus, Upload, BarChart3, MousePointerClick, Shield, Star, UserCheck, Users, Server, MailPlus, FileText, Briefcase, FileType, Menu, X, TrendingUp, CheckCircle, Search, Calendar, Award, Target, UserCircle, Zap, BookOpen } from 'lucide-react'
import Link from 'next/link'

type Expert = any
type Student = any

export default function SolutionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Selection state derived from query or default to first item
  const initial = useMemo(() => {
    const g = searchParams?.get('g')
    const c = searchParams?.get('c')
    const i = searchParams?.get('i')
    let groupIdx = 0
    let categoryIdx = 0
    let itemIdx = 0
    if (g) {
      const gi = NAV_CATALOG.findIndex(x => x.id === g)
      if (gi >= 0) groupIdx = gi
    }
    const group = NAV_CATALOG[groupIdx]
    if (c && group) {
      const ci = group.categories.findIndex(x => x.id === c)
      if (ci >= 0) categoryIdx = ci
    }
    const category = group?.categories[categoryIdx]
    if (i && category?.items) {
      const ii = category.items.findIndex(x => x.id === i)
      if (ii >= 0) itemIdx = ii
    }
    return { groupIdx, categoryIdx, itemIdx }
  }, [searchParams])

  const [groupIdx, setGroupIdx] = useState(initial.groupIdx)
  const [categoryIdx, setCategoryIdx] = useState(initial.categoryIdx)
  const [itemIdx, setItemIdx] = useState(initial.itemIdx)

  useEffect(() => {
    setGroupIdx(initial.groupIdx)
    setCategoryIdx(initial.categoryIdx)
    setItemIdx(initial.itemIdx)
  }, [initial.groupIdx, initial.categoryIdx, initial.itemIdx])

  const activeGroup: NavGroup | undefined = NAV_CATALOG[groupIdx]
  const activeCategory = activeGroup?.categories[categoryIdx]
  const activeItem: NavItem | undefined = activeCategory?.items?.[itemIdx]
  const renderer: Renderer = activeItem?.renderer || 'experts'

  // Expand/collapse state per category id
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  useEffect(() => {
    const catId = activeCategory?.id
    if (catId) setExpanded(prev => ({ ...prev, [catId]: true }))
  }, [activeCategory?.id])

  // Data states
  const [experts, setExperts] = useState<Expert[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [internships, setInternships] = useState<any[]>([])
  const [freelanceProjects, setFreelanceProjects] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      // Clear previous data when switching renderers or items
      setExperts([])
      setStudents([])
      setInternships([])
      setFreelanceProjects([])
      setPrograms([])
      
      try {
        if (renderer === 'experts') {
          const list = await api.experts.getAll({ page: 1, limit: 12, is_verified: true }).catch(() => [])
          const data = Array.isArray(list) ? list : (list?.data || [])
          // Shuffle data on each menu item change to show freshness
          setExperts(shuffle(data))
        } else if (renderer === 'students') {
          // Check which specific item is selected
          if (activeItem?.id === 'student_fresher') {
            // Fetch internships for Student & Fresher
            const internshipData = await api.internships.getVisible({ page: 1, limit: 5 }).catch(() => ({ data: [] }))
            const internshipArr = Array.isArray(internshipData) ? internshipData : (internshipData?.data || [])
            setInternships(shuffle(internshipArr))
            
            // Also fetch students for the grid
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
            const res = await fetch(`${API_BASE_URL}/api/students/featured?limit=9`).then(r => r.json()).catch(() => [])
            const arr = Array.isArray(res) ? res : (res?.data || [])
            setStudents(shuffle(arr))
          } else if (activeItem?.id === 'freelance') {
            // Fetch freelance projects for Freelance
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
            const freelanceRes = await fetch(`${API_BASE_URL}/api/freelance?page=1&limit=5`).then(r => r.json()).catch(() => ({ data: [] }))
            const freelanceArr = Array.isArray(freelanceRes) ? freelanceRes : (freelanceRes?.data || [])
            setFreelanceProjects(shuffle(freelanceArr))
            
            // Also fetch students for the grid
            const res = await fetch(`${API_BASE_URL}/api/students/featured?limit=9`).then(r => r.json()).catch(() => [])
            const arr = Array.isArray(res) ? res : (res?.data || [])
            setStudents(shuffle(arr))
          } else {
            // Default: just show students
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
            const res = await fetch(`${API_BASE_URL}/api/students/featured?limit=12`).then(r => r.json()).catch(() => [])
            const arr = Array.isArray(res) ? res : (res?.data || [])
            setStudents(shuffle(arr))
          }
        } else if (renderer === 'programs') {
          // Dummy programs for now
          const allPrograms = [
            { id: 'p1', title: "Beginner's Guide to AI", expert: 'Amit Singh', daysLeft: 12, desc: 'Learn how to bring AI into your work to automate daily tasks.' },
            { id: 'p2', title: 'Digital Marketing Workshop', expert: 'Monika Tiwari', daysLeft: 8, desc: 'Automate your marketing workflows and grow faster.' },
            { id: 'p3', title: 'Intermediate AI Techniques', expert: 'Maria Chen', daysLeft: 20, desc: 'Enhance productivity using AI tools with advanced methods.' },
            { id: 'p4', title: 'AI Ethics and Responsibility', expert: 'David Lee', daysLeft: 15, desc: 'Understand ethical implications and responsible usage.' },
            { id: 'p5', title: 'Data Science Fundamentals', expert: 'Rajesh Kumar', daysLeft: 18, desc: 'Master the basics of data science and analytics.' },
            { id: 'p6', title: 'Leadership Development', expert: 'Sarah Johnson', daysLeft: 10, desc: 'Build essential leadership skills for modern workplace.' },
          ]
          // Shuffle and show different programs on each selection
          setPrograms(shuffle(allPrograms).slice(0, 4))
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [renderer, activeItem?.id])

  const selectItem = (gi: number, ci: number, ii: number) => {
    const g = NAV_CATALOG[gi]?.id
    const c = NAV_CATALOG[gi]?.categories[ci]?.id
    const i = NAV_CATALOG[gi]?.categories[ci]?.items?.[ii]?.id
    
    setGroupIdx(gi)
    setCategoryIdx(ci)
    setItemIdx(ii)
    setMobileMenuOpen(false) // Close mobile menu after selection
    
    const sp = new URLSearchParams()
    if (g) sp.set('g', g)
    if (c) sp.set('c', c)
    if (i) sp.set('i', i)
    router.replace(`/solutions?${sp.toString()}`)
  }

  // Sidebar component to reuse in both desktop and mobile
  const SidebarContent = () => (
    <>
      {NAV_CATALOG.map((group, gi) => (
        <div key={group.id} className="mb-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#6A6A6A] mb-3">
            {group.id === 'expert_solutions' && <GraduationCap className="h-4 w-4 text-[#6A6A6A]" />}
            {group.id === 'corporate_solutions' && <Building2 className="h-4 w-4 text-[#6A6A6A]" />}
            {group.id === 'student_marketplace' && <Users2 className="h-4 w-4 text-[#6A6A6A]" />}
            <span>{group.label}</span>
          </div>
          <div className="space-y-2">
            {group.categories.map((cat, ci) => {
              const isExpanded = !!expanded[cat.id]
              const isActiveCategory = activeCategory?.id === cat.id
              const toggle = () => setExpanded(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))
              return (
                <div key={cat.id}>
                  <button onClick={toggle} className={`w-full h-10 px-3 rounded-lg flex items-center justify-between transition-colors ${isActiveCategory ? 'bg-[#008260] text-white' : 'bg-[#F3F5F9] text-[#0F172A] hover:bg-[#E9EEF8]'} `}>
                    <span className="text-sm font-medium">{cat.label}</span>
                    {isExpanded ? (
                      <ChevronDown className={`h-4 w-4 ${isActiveCategory ? 'text-white' : 'text-[#6A6A6A]'}`} />
                    ) : (
                      <ChevronRight className={`h-4 w-4 ${isActiveCategory ? 'text-white' : 'text-[#6A6A6A]'}`} />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="pt-2 pl-2">
                      {cat.items?.map((it, ii) => {
                        const active = gi === groupIdx && ci === categoryIdx && ii === itemIdx
                        return (
                          <button
                            key={it.id}
                            onClick={() => selectItem(gi, ci, ii)}
                            className={`w-full h-9 mb-2 text-left px-3 rounded-md text-sm transition-colors ${active ? 'bg-[#008260] text-white' : 'bg-[#F1F4F9] text-[#0F172A] hover:bg-[#E9EEF8]'} `}
                          >
                            {it.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between lg:justify-between">
          {/* Mobile Menu Button - Left */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-white hover:bg-[#006d51]"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Logo - Center on mobile, left on desktop */}
          <div className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
            <Link href="/"> 
              <Logo size="header" />
            </Link>
          </div>

          {/* Solutions text - Only on desktop */}
          <div className="hidden lg:block text-white font-semibold">Solutions</div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 left-0 h-full w-[280px] bg-white z-50 overflow-y-auto lg:hidden shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-[#008260]">Browse Solutions</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              <SidebarContent />
            </div>
          </div>
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block pr-6 border-r border-[#DCDCDC] sticky top-24 h-max">
          <SidebarContent />
        </aside>

        {/* Right content */}
        <main>
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#000000]">
              {activeCategory?.label}
            </h1>
            <p className="text-[#000000CC]">{activeItem?.label}</p>
          </div>

          {renderer === 'experts' && (
            <ExpertsPanel loading={loading} experts={experts} />
          )}

          {renderer === 'students' && (
            <StudentsPanel 
              loading={loading} 
              students={students} 
              internships={internships}
              freelanceProjects={freelanceProjects}
              itemId={activeItem?.id}
            />
          )}

          {renderer === 'programs' && (
            <ProgramsPanel loading={loading} programs={programs} />
          )}

          {renderer === 'marketplace' && (
            <MarketplacePanel variant={activeItem?.id} />
          )}
        </main>
      </div>
    </div>
  )
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function ExpertsPanel({ loading, experts }: { loading: boolean; experts: any[] }) {
  if (loading) return <div className="text-[#6A6A6A]">Loading experts…</div>
  if (!experts?.length) return <EmptyState text="No experts found" />
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {experts.map((e: any, idx: number) => (
        <Card 
          key={e.id || idx} 
          className="border border-[#DCDCDC] rounded-2xl overflow-hidden bg-white"
          style={{
            boxShadow: '-3px 3px 3px 0px #A0A0A040, 3px 3px 3px 0px #A0A0A040'
          }}
        >
          <CardContent className="p-6 flex flex-col items-center text-center bg-[#F5F5F5]">
            {/* Profile Image */}
            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-gray-200">
              {e.photo_url ? (
                <img src={e.photo_url} alt={e.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#ECF2FF] flex items-center justify-center">
                  <span className="text-[#008260] font-bold text-2xl">{(e.name || 'E')?.charAt(0)}</span>
                </div>
              )}
            </div>

            {/* Name */}
            <h3 className="font-bold text-base text-[#000000] mb-1">{e.name || 'Expert'}</h3>

            {/* Institution in Green */}
            <p className="text-sm text-[#008260] font-medium mb-2 truncate w-full">
              {(e.institution_name || e.company || e.city) ?? 'Verified Expert'}
            </p>

            {/* Rating and Degree */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-[#FFC107] text-[#FFC107]" />
                <span className="text-sm font-semibold text-[#000000]">4.7</span>
              </div>
              <span className="text-sm text-[#6A6A6A]">
                {Array.isArray(e.domain_expertise) && e.domain_expertise.length > 0 
                  ? e.domain_expertise[0] 
                  : (e.specialization || 'B.SC')}
              </span>
            </div>
          </CardContent>

          {/* Bottom section with white background */}
          <div className="bg-white px-6 py-4">
            <div className="w-full flex items-center justify-between">
              <div className="text-left">
                <div className="text-lg font-bold text-[#008260]">
                  ₹{e.hourly_rate || 2000}
                  <span className="text-xs text-[#6A6A6A] font-normal">/hr</span>
                </div>
              </div>
              <Link href="/auth/login">
                <Button className="bg-[#008260] hover:bg-[#006d51] text-white rounded-lg px-6 h-9 text-sm font-medium">
                  Book Now
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function StudentsPanel({ loading, students, internships, freelanceProjects, itemId }: { 
  loading: boolean; 
  students: any[];
  internships: any[];
  freelanceProjects: any[];
  itemId?: string;
}) {
  if (loading) return <div className="text-[#6A6A6A]">Loading…</div>
  
  return (
    <div className="space-y-6">
      {/* Student grid - always show first if we have students */}
      {students.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-[#000000]">Featured Students</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {students.slice(0, 12).map((s: any, idx: number) => (
              <Card key={s.id || idx} className="bg-white border border-[#E0E0E0] rounded-3xl hover:shadow-xl transition-all h-full">
                <CardContent className="p-6">
                  {/* Student Image */}
                  <div className="relative w-full aspect-square overflow-hidden rounded-2xl mb-4">
                    <img
                      src={s.profile_photo_small_url || s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'Student')}&size=400&background=008260&color=fff`}
                      alt={s.name || 'Student'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Student Info */}
                  <div>
                    <h3 className="text-xl font-bold text-[#000000] mb-2">{s.name || 'Student'}</h3>
                    
                    <p className="text-[#6A6A6A] text-sm mb-3 line-clamp-2">
                      {s.degree && s.specialization ? (
                        <>
                          {s.degree === 'B.Tech' && 'A B.Tech '}
                          {s.degree === 'M.Tech' && 'An M.Tech '}
                          {s.degree === 'BCA' && 'A BCA '}
                          {s.degree === 'MCA' && 'An MCA '}
                          {s.degree === 'B.Sc' && 'A B.Sc. '}
                          {s.degree === 'M.Sc' && 'An M.Sc. '}
                          {s.degree === 'MBA' && 'An MBA '}
                          {s.degree === 'BBA' && 'A BBA '}
                          {!['B.Tech', 'M.Tech', 'BCA', 'MCA', 'B.Sc', 'M.Sc', 'MBA', 'BBA'].includes(s.degree) && `A ${s.degree} `}
                          Student {s.specialization && `in ${s.specialization}`}
                        </>
                      ) : s.degree ? (
                        `${s.degree} Student`
                      ) : (
                        'Student'
                      )}
                      {s.skills && Array.isArray(s.skills) && s.skills.length > 0 && (
                        <>, skilled in {s.skills.slice(0, 2).join(', ')}</>
                      )}
                    </p>

                    {s.institution?.name && (
                      <p className="text-[#000000] text-sm font-medium">
                        {s.institution.name}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Student & Fresher - Show internship posts */}
      {itemId === 'student_fresher' && internships.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#000000]">Featured Internship Opportunities</h3>
          {internships.map((item: any) => {
            const createdDate = new Date(item.created_at)
            const formattedDate = createdDate.toLocaleDateString('en-US', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })
            
            return (
              <Card key={item.id} className="bg-white border-2 border-[#D6D6D6] rounded-xl hover:border-[#008260] hover:shadow-md transition-all duration-300 group">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-[#000000] mb-1 group-hover:text-[#008260] transition-colors duration-200 break-words">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#6A6A6A] mb-1">{item.corporate?.name || 'Corporate'}</p>
                    </div>
                    <Badge className="bg-[#FFF1E7] rounded-[18px] text-xs font-semibold text-[#FF6A00] py-1.5 sm:py-2 px-3 sm:px-4 flex-shrink-0 self-start">
                      {formattedDate}
                    </Badge>
                  </div>

                  <p className="text-xs sm:text-sm text-[#6A6A6A] mb-3 sm:mb-4 line-clamp-2">
                    {item.responsibilities}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-3 sm:gap-y-4 mb-4">
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Deadline:</div>
                      <div className="font-semibold text-[#000000] text-xs sm:text-sm truncate">
                        {item.start_date ? new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Duration:</div>
                      <div className="font-semibold text-[#000000] text-xs sm:text-sm truncate">
                        {item.duration_value} {item.duration_unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Stipend:</div>
                      <div className="font-semibold text-[#008260] text-xs sm:text-sm truncate">
                        {item.paid ? `₹${item.stipend_min}${item.stipend_max ? '-₹' + item.stipend_max : ''}/month` : 'Unpaid'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Work Mode:</div>
                      <div className="font-semibold text-[#000000] text-xs sm:text-sm truncate">{item.work_mode}</div>
                    </div>
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Engagement:</div>
                      <div className="font-semibold text-[#000000] text-xs sm:text-sm truncate">{item.engagement}</div>
                    </div>
                    <div>
                      <div className="text-[#717171] text-xs mb-1">Location:</div>
                      <div className="font-semibold text-[#000000] text-xs sm:text-sm truncate">{item.location || 'Remote'}</div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Link href="/auth/login">
                      <Button className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-full px-6 font-medium">
                        Apply Now
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Freelance - Show freelance project posts */}
      {itemId === 'freelance' && freelanceProjects.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#000000]">Featured Freelance Projects</h3>
          {freelanceProjects.map((project: any) => (
            <Card key={project.id} className="bg-white border border-[#DCDCDC] rounded-lg hover:border-[#008260] transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-[#000000]">{project.title}</h3>
                  <Badge className="bg-[#E8F5F1] text-[#008260] hover:bg-[#D5F0E9] border-none font-medium shrink-0">
                    Open
                  </Badge>
                </div>
                
                <p className="text-sm text-[#000000] mb-4 line-clamp-2 leading-relaxed">
                  {project.description || ''}
                </p>

                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <div className="text-xs text-[#C91B1B] font-medium mb-1">Deadline:</div>
                    <div className="text-sm font-semibold text-[#000000]">
                      {project.deadline 
                        ? new Date(project.deadline).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#717171] font-medium mb-1">Budget:</div>
                    <div className="text-sm font-semibold text-[#008260]">
                      {project.budget_min || project.budget_max 
                        ? `₹${project.budget_min || 0}${project.budget_max ? `-₹${project.budget_max}` : ''}`
                        : 'Not specified'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link href="/auth/login">
                    <Button className="bg-[#008260] hover:bg-[#006B4F] text-white rounded-full px-6 font-medium">
                      Apply Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && students.length === 0 && internships.length === 0 && freelanceProjects.length === 0 && (
        <EmptyState text="No data found" />
      )}
    </div>
  )
}

function ProgramsPanel({ loading, programs }: { loading: boolean; programs: any[] }) {
  if (loading) return <div className="text-[#6A6A6A]">Loading programs…</div>
  if (!programs?.length) return <EmptyState text="Programs coming soon" />
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {programs.map(p => (
        <Card key={p.id} className="bg-white border border-[#DCDCDC] rounded-2xl">
          <CardHeader className="pb-2 relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <CardTitle className="text-[#000000]">{p.title}</CardTitle>
                <CardDescription className="text-[#000000] mt-2">{p.desc}</CardDescription>
              </div>
              {/* Program Icon */}
              <div className="flex-shrink-0 w-12 h-12 bg-[#008260] rounded-full flex items-center justify-center">
                <FileType className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-between">
            <div className="text-sm text-[#000000]">Expert: <span className="font-semibold">{p.expert}</span></div>
            <div className="text-sm font-semibold text-[#008260]">{p.daysLeft} days remaining</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function MarketplacePanel({ variant }: { variant?: string }) {
  // Professional workflow steps with brand colors
  const studentWorkflow = [
    { icon: UserCircle, label: 'Create Profile', color: '#008260' },
    { icon: Search, label: 'Browse Opportunities', color: '#008260' },
    { icon: Zap, label: '1-Click Apply', color: '#008260' },
    { icon: CheckCircle, label: 'Get Shortlisted', color: '#008260' },
    { icon: Calendar, label: 'Interview', color: '#008260' },
    { icon: Award, label: 'Get Hired', color: '#008260' },
  ]

  const companyWorkflow = [
    { icon: FileText, label: 'Post Requirements', color: '#008260' },
    { icon: BarChart3, label: 'AI Recommendations', color: '#008260' },
    { icon: Users, label: 'Review Applications', color: '#008260' },
    { icon: Calendar, label: 'Schedule Interviews', color: '#008260' },
    { icon: CheckCircle, label: 'Hire Talent', color: '#008260' },
    { icon: Target, label: 'Track Performance', color: '#008260' },
  ]

  const universityWorkflow = [
    { icon: Building2, label: 'Setup Profile', color: '#008260' },
    { icon: Upload, label: 'Onboard Students', color: '#008260' },
    { icon: MailPlus, label: 'Invite Companies', color: '#008260' },
    { icon: Users, label: 'Hire Faculty', color: '#008260' },
    { icon: BarChart3, label: 'Track Placements', color: '#008260' },
    { icon: Award, label: 'Success Metrics', color: '#008260' },
  ]

  const getWorkflow = () => {
    if (variant === 'for_students') return studentWorkflow
    if (variant === 'for_companies') return companyWorkflow
    return universityWorkflow
  }

  const getCTA = () => {
    if (variant === 'for_students') return { label: 'Get Started', href: '/auth/signup?role=student' }
    return { label: 'Post Requirements', href: '/auth/login' }
  }

  const workflow = getWorkflow()
  const cta = getCTA()

  return (
    <div className="space-y-8 mt-10 mb-16">
      {/* Title Section */}
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#000000] mb-3">
          {variant === 'for_students' && 'How It Works'}
          {variant === 'for_companies' && 'Simple Hiring Process'}
          {variant === 'for_universities' && 'Complete Solution'}
        </h2>
        <p className="text-[#6A6A6A] text-sm sm:text-base max-w-2xl mx-auto">
          {variant === 'for_students' && 'A streamlined process from profile creation to landing your dream job'}
          {variant === 'for_companies' && 'Find and hire top talent efficiently with our AI-powered platform'}
          {variant === 'for_universities' && 'Manage placements and faculty hiring all in one place'}
        </p>
      </div>

      {/* Hexagonal Layout with Connected Icons */}
      <div className="relative w-full max-w-[650px] mx-auto px-4 mb-16" style={{ minHeight: '500px' }}>
        {/* Workflow Nodes arranged in hexagon shape */}
        {workflow.map((step, index) => {
          // Hexagon has 6 points - arrange nodes around hexagon perimeter
          const angle = (index / workflow.length) * 2 * Math.PI - Math.PI / 2
          const radiusX = 42 // horizontal radius percentage
          const radiusY = 45 // vertical radius percentage (slightly taller for hexagon)
          const x = 50 + radiusX * Math.cos(angle)
          const y = 50 + radiusY * Math.sin(angle)
          
          return (
            <div
              key={index}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className="flex flex-col items-center max-w-[110px]">
                {/* Icon only */}
                <div className="mb-3">
                  <step.icon className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: step.color }} strokeWidth={1.8} />
                </div>
                {/* Label */}
                <div className="text-center">
                  <div className="text-xs sm:text-sm font-semibold text-[#000000] leading-tight">{step.label}</div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Connection Lines - Hexagonal shape */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 650 500">
          <defs>
            <marker id={`arrow-${variant}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <polygon points="0 0, 8 4, 0 8" fill="#008260" fillOpacity="0.4" />
            </marker>
          </defs>
          {workflow.map((_, index) => {
            const nextIndex = (index + 1) % workflow.length
            const angle1 = (index / workflow.length) * 2 * Math.PI - Math.PI / 2
            const angle2 = (nextIndex / workflow.length) * 2 * Math.PI - Math.PI / 2
            const radiusX = 273 // SVG units horizontal
            const radiusY = 225 // SVG units vertical
            const x1 = 325 + radiusX * Math.cos(angle1)
            const y1 = 250 + radiusY * Math.sin(angle1)
            const x2 = 325 + radiusX * Math.cos(angle2)
            const y2 = 250 + radiusY * Math.sin(angle2)

            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#008260"
                strokeWidth="2"
                strokeDasharray="6,4"
                opacity="0.3"
                markerEnd={`url(#arrow-${variant})`}
              />
            )
          })}
        </svg>
      </div>

      {/* CTA Button */}
      <div className="text-center mb-12">
        <Link href={cta.href}>
          <Button className="bg-[#008260] hover:bg-[#006d51] text-white rounded-full px-10 sm:px-12 h-12 text-base font-medium mt-2">
            {cta.label}
          </Button>
        </Link>
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 bg-white border border-[#DCDCDC] rounded-xl text-[#6A6A6A]">{text}</div>
  )
}


