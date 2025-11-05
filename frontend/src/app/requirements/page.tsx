'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { MapPin, IndianRupee, Calendar, Briefcase, Building2, Clock, Menu } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export default function RequirementsPage() {
  const router = useRouter()
  const [expertsProjects, setExpertsProjects] = useState<any[]>([])
  const [internships, setInternships] = useState<any[]>([])
  const [freelanceProjects, setFreelanceProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const reviews = [
    {
      id: 1,
      name: "Finance Expert",
      company: "Finance Expert",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
      text: "CalXMap is one of the best services which doesn't only helps but make sure it works. I've been using CalXMap for years and they never disappoint. They also helps experts in a way like never before."
    },
    {
      id: 2,
      name: "IMS Noida",
      company: "Eco City Corp",
      image: "/images/universitylogo3.jpeg",
      text: "CalXMap is one of the best services which doesn't only helps but make sure it works. I've been using CalXMap for years and they never disappoint. They also helps experts in a way like never before."
    },
    {
      id: 3,
      name: "Students",
      company: "Creative Minds Agency",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
      text: "CalXMap is one of the best services which doesn't only helps but make sure it works. I've been using CalXMap for years and they never disappoint. They also helps experts in a way like never before."
    },
    {
      id: 4,
      name: "TechSafe Solutions",
      company: "TechSafe Solutions",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
      text: "SecureNet provides top-notch cybersecurity solutions that have significantly improved our data protection. Their expertise is unmatched, and I feel like I'm in safe online operations."
    },
    {
      id: 5,
      name: "MedCare Group",
      company: "MedCare Group",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
      text: "HealthPlus innovations has revolutionized our healthcare service with cutting-edge telemedicine solutions. Their user-friendly platform has enhanced patient engagement and satisfaction dramatically."
    },
    {
      id: 6,
      name: "FutureLearn Institute",
      company: "FutureLearn Institute",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
      text: "EduSmart Systems is a game-changer in the educational technology world. Their tools enhance both teaching and learning experiences. Their support is highly effective, helping educators and students alike."
    }
  ]

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        // Fetch latest 7 projects for experts (contracts)
        const projectsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/projects?limit=7&status=open`)
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json()
          setExpertsProjects(Array.isArray(projectsData) ? projectsData : [])
        }

        // Fetch latest 7 internships for students  
        const internshipsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/internships/visible?limit=7`)
        if (internshipsRes.ok) {
          const internshipsData = await internshipsRes.json()
          setInternships(Array.isArray(internshipsData) ? internshipsData : [])
        }

        // Fetch latest 7 freelance projects
        const freelanceRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/freelance/projects/visible?limit=7`)
        if (freelanceRes.ok) {
          const freelanceData = await freelanceRes.json()
          setFreelanceProjects(Array.isArray(freelanceData) ? freelanceData : [])
        }
      } catch (error) {
        console.error('Error fetching requirements:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRequirements()
  }, [])

  const getProjectTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      guest_lecture: 'Guest Lecture',
      workshop: 'Workshop',
      consulting: 'Consulting',
      training: 'Training',
      mentorship: 'Mentorship',
      fdp: 'FDP',
      curriculum_dev: 'Curriculum Development',
      research_collaboration: 'Research Collaboration',
      training_program: 'Training Program',
      consultation: 'Consultation',
       other:'Other'
    
     
    }
    return labels[type] || type
  }

  const getProjectTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      guest_lecture: 'bg-blue-100 text-blue-800 border-blue-200',
      workshop: 'bg-purple-100 text-purple-800 border-purple-200',
      consulting: 'bg-green-100 text-green-800 border-green-200',
      training: 'bg-orange-100 text-orange-800 border-orange-200',
      mentorship: 'bg-pink-100 text-pink-800 border-pink-200',
      fdp: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      curriculum_dev: 'bg-teal-100 text-teal-800 border-teal-200'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
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

      {/* Hero Section */}
      <section className="py-16 bg-[#ECF2FF]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 max-w-2xl">
              <h1 className="text-5xl font-bold text-[#000000] mb-4">
                Current <span className="text-[#008260]">Requirements</span>
              </h1>
              <p className="text-[#6A6A6A] text-lg mb-8">
                Connect with leading organizations looking for expert knowledge. These are live opportunities.updated daily.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <Button className="bg-[#008260] hover:bg-[#006d51] text-white px-8 py-6 text-base font-semibold rounded-3xl w-full sm:w-auto">
                    Find Requirements
                  </Button>
                </Link>
                <Link href="/auth/signup?role=institution" className="w-full sm:w-auto">
                  <Button variant="outline" className="border-[#008260] text-[#008260] bg-[] px-8 py-6 text-base font-semibold rounded-3xl w-full sm:w-auto">
                    + Post a Requirement
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 flex justify-end items-center">
              <img 
                src="/images/image.png" 
                alt="Professional Expert" 
                className="w-full max-w-[500px] h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* For Experts Section */}
      <section className="py-16 bg-[#ECF2FF]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[#000000] mb-2">For Experts</h2>
              <p className="text-[#6A6A6A]">Find jobs that fit your career aspirations.</p>
            </div>
            <Link href="/auth/login">
              <Button variant="ghost" className="text-[#008260] hover:text-[#006d51] font-semibold">
                View All →
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260]"></div>
            </div>
          ) : expertsProjects.length === 0 ? (
            <div className="text-center py-12 text-[#6A6A6A]">
              No requirements available at the moment.
            </div>
          ) : (
            <Carousel
              opts={{ align: "start", loop: true }}
              plugins={[Autoplay({ delay: 4000 })]}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {expertsProjects.map((project) => (
                  <CarouselItem key={project.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="bg-white border border-[#E0E0E0] rounded-2xl hover:shadow-lg transition-all h-full">
                      <CardContent className="p-6 pb-3">
                        <div className="flex justify-between items-start mb-6">
                          <h3 className="text-lg font-bold text-[#000000] truncate flex-1 pr-2">
                            {project.title}
                          </h3>
                          <Badge variant="outline" className="bg-[#FFF4E6] text-[#FF9800] border-[#FFE0B2] text-xs px-2 py-1 rounded-md flex-shrink-0">
                            {getProjectTypeLabel(project.type)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          <div className="flex items-start">
                            <Clock className="h-5 w-5 text-[#008260] mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-[#6A6A6A] mb-1">Rate</p>
                              <p className="text-base font-semibold text-[#008260]">₹ {project.hourly_rate}/hrs</p>
                            </div>
                          </div>

                          {project.institutions?.city && (
                            <div className="flex items-start">
                              <MapPin className="h-5 w-5 text-[#008260] mr-3 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-[#6A6A6A] mb-1">Location</p>
                                <p className="text-base font-medium text-[#000000]">{project.institutions.city}, {project.institutions.state || 'India'}</p>
                              </div>
                            </div>
                          )}
                           <Button size="lg" className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-medium rounded-lg"
                           onClick={() => {
                            router.push(`/auth/login`)
                          }}
                           >
                          Apply Now
                        </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          )}
        </div>
      </section>

      {/* For Students Section */}
      <section className="py-16 bg-[#ECF2FF]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[#000000] mb-2">For Students</h2>
              <p className="text-[#6A6A6A]">Find jobs that fit your career aspirations.</p>
            </div>
            <Link href="/auth/login">
              <Button variant="ghost" className="text-[#008260] hover:text-[#006d51] font-semibold">
                View All →
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260]"></div>
            </div>
          ) : internships.length === 0 ? (
            <div className="text-center py-12 text-[#6A6A6A]">
              No internships available at the moment.
            </div>
          ) : (
            <Carousel
              opts={{ align: "start", loop: true }}
              plugins={[Autoplay({ delay: 4500 })]}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {internships.map((internship) => (
                  <CarouselItem key={internship.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="bg-white border border-[#E0E0E0] rounded-2xl hover:shadow-lg transition-all h-full">
                      <CardContent className="p-6 pb-3">
                        <div className="flex justify-between items-start mb-6">
                          <h3 className="text-lg font-bold text-[#000000] truncate flex-1 pr-2">
                            {internship.title}
                          </h3>
                          <Badge variant="outline" className="bg-[#FFF4E6] text-[#FF9800] border-[#FFE0B2] text-xs px-2 py-1 rounded-md flex-shrink-0">
                            Internship
                          </Badge>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          {internship.paid && internship.stipend_min && (
                            <div className="flex items-start">
                              <Clock className="h-5 w-5 text-[#008260] mr-3 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-[#6A6A6A] mb-1">Stipend</p>
                                <p className="text-base font-semibold text-[#008260]">
                                  ₹ {internship.stipend_min}
                                  {internship.stipend_max && internship.stipend_max !== internship.stipend_min && (
                                    <>-{internship.stipend_max}</>
                                  )}/month
                                </p>
                              </div>
                            </div>
                          )}

                          {internship.work_mode && (
                            <div className="flex items-start">
                              <MapPin className="h-5 w-5 text-[#008260] mr-3 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-[#6A6A6A] mb-1">Location</p>
                                <p className="text-base font-medium text-[#000000]">{internship.work_mode}</p>
                              </div>
                            </div>
                          )}
                           <Button size="lg" className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-medium rounded-lg"
                           onClick={() => {
                            router.push(`/auth/login`)
                          }}
                           >
                          Apply Now
                        </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          )}
        </div>
      </section>

      {/* For Freelancer Section */}
      <section className="py-16 bg-[#ECF2FF]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[#000000] mb-2">For Freelancer</h2>
              <p className="text-[#6A6A6A]">Find skills-first fit your career aspirations.</p>
            </div>
            <Link href="/auth/login">
              <Button variant="ghost" className="text-[#008260] hover:text-[#006d51] font-semibold">
                View All →
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260]"></div>
            </div>
          ) : freelanceProjects.length === 0 ? (
            <div className="text-center py-12 text-[#6A6A6A]">
              No freelance projects available at the moment.
            </div>
          ) : (
            <Carousel
              opts={{ align: "start", loop: true }}
              plugins={[Autoplay({ delay: 5000 })]}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {freelanceProjects.map((project) => (
                  <CarouselItem key={project.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="bg-white border border-[#E0E0E0] rounded-2xl hover:shadow-lg transition-all h-full">
                      <CardContent className="p-6 pb-3">
                        <div className="flex justify-between items-start mb-6">
                          <h3 className="text-lg font-bold text-[#000000] line-clamp-2 flex-1 pr-2 truncate">
                            {project.title}
                          </h3>
                          <Badge variant="outline" className="bg-[#FFF4E6] text-[#FF9800] border-[#FFE0B2] text-xs px-2 py-1 rounded-md flex-shrink-0">
                            Freelance
                          </Badge>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          {project.budget_min && (
                            <div className="flex items-start">
                              <IndianRupee className="h-5 w-5 text-[#008260] mr-3 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-[#6A6A6A] mb-1">Budget</p>
                                <p className="text-base font-semibold text-[#008260]">
                                   {project.budget_min}
                                  {project.budget_max && project.budget_max !== project.budget_min && (
                                    <>-{project.budget_max}</>
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {project.deadline && (
                            <div className="flex items-start">
                              <Calendar className="h-5 w-5 text-[#008260] mr-3 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-[#6A6A6A] mb-1">Deadline</p>
                                <p className="text-base font-medium text-[#000000]">
                                  {new Date(project.deadline).toLocaleDateString('en-US', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </p>
                              </div>
                            </div>
                          )}
                             <Button size="lg" className="w-full bg-[#008260] hover:bg-[#006d51] text-white font-medium rounded-lg"
                           onClick={() => {
                            router.push(`/auth/login`)
                          }}
                           >
                          Apply Now
                        </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          )}
        </div>
      </section>

      {/* Reviews Section */}
   

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-[#008260] rounded-3xl px-8 py-16 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-white text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Join thousands transforming collaboration through our platform
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup?role=institution">
                <Button className="bg-white text-[#008260] hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-full min-w-[200px]">
                  Start Hiring
                </Button>
              </Link>
              <Link href="/auth/signup?role=expert">
                <Button variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-full min-w-[200px]">
                  Become an Expert
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#008260] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="mb-4">
                <Logo size="md" />
              </div>
              <p className="text-white/90 leading-relaxed text-sm mb-6">
                We're on a mission to make mentorship accessible to everyone!
              </p>
              <p className="text-white/70 text-xs">
                © Copyright 2025 - Calxmap
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">PLATFORM</h3>
              <ul className="space-y-3">
                <li><Link href="#experts" className="text-white/90 hover:text-white transition-colors text-sm">For Experts</Link></li>
                <li><Link href="#universities" className="text-white/90 hover:text-white transition-colors text-sm">For Universities</Link></li>
                <li><Link href="#corporates" className="text-white/90 hover:text-white transition-colors text-sm">For Corporates</Link></li>
                <li><Link href="#pricing" className="text-white/90 hover:text-white transition-colors text-sm">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">SUPPORT</h3>
              <ul className="space-y-3">
                <li><Link href="/contact-us" className="text-white/90 hover:text-white transition-colors text-sm">Help Center</Link></li>
                <li><Link href="/contact-us" className="text-white/90 hover:text-white transition-colors text-sm">Contact Us</Link></li>
                <li><Link href="#privacy" className="text-white/90 hover:text-white transition-colors text-sm">Privacy Policy</Link></li>
                <li><Link href="#terms" className="text-white/90 hover:text-white transition-colors text-sm">Terms of Service</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">COMPANY</h3>
              <ul className="space-y-3">
                <li><Link href="#about" className="text-white/90 hover:text-white transition-colors text-sm">About Us</Link></li>
                <li><Link href="#blog" className="text-white/90 hover:text-white transition-colors text-sm">Blog</Link></li>
                <li><Link href="#careers" className="text-white/90 hover:text-white transition-colors text-sm">Careers</Link></li>
                <li><Link href="#contact" className="text-white/90 hover:text-white transition-colors text-sm">About Us</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/70 text-sm"></p>
            <div className="flex gap-4">
              {/* Instagram */}
              <a href="#" className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="#" className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              {/* Twitter */}
              <a href="#" className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              {/* Facebook */}
              <a href="#" className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

