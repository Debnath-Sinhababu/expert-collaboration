'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { 
  Mail, 
  Clock,
  Globe,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { toast } from 'sonner'

const FAQ_DATA = [
  {
    question: "How experts can help us? What are the criteria to create an account?",
    answer: [
      "Experts on CalXMap can provide guidance through guest lectures, workshops, mentorship sessions, curriculum development, and research collaborations.",
      "To create an expert account, you need:",
      "A minimum of 5 years of professional experience in your domain",
      "Verified credentials from recognized institutions or organizations",
      "A complete professional profile with your expertise areas",
      "Valid identity proof and professional documentation",
      "Once registered, our team reviews your profile within 24-48 hours and grants access upon verification."
    ]
  },
  {
    question: "What benefits do we gain from expert advice? How can we verify their credentials?",
    answer: [
      "Expert advice on CalXMap provides:",
      "Industry-relevant insights and practical knowledge",
      "Real-world problem-solving approaches",
      "Networking opportunities with professionals",
      "Career guidance and mentorship",
      "Access to latest trends and technologies in your field",
      "To verify credentials, all experts undergo our multi-step verification process including: background checks, credential verification from issuing authorities, reference checks, and professional portfolio review.",
      "Each expert profile displays their verified badges, qualifications, experience timeline, and past engagement ratings."
    ]
  },
  {
    question: "What are the common pitfalls when seeking expert guidance? How to avoid them?",
    answer: [
      "Common pitfalls include:",
      "Not clearly defining your requirements before reaching out",
      "Choosing experts based solely on experience without considering domain relevance",
      "Not preparing adequate questions for the session",
      "Expecting immediate solutions to complex problems",
      "Not following up on expert advice or recommendations",
      "To avoid these: clearly outline your objectives, review expert profiles thoroughly, prepare a structured agenda, set realistic expectations, maintain regular communication, and implement the guidance systematically.",
      "Our platform provides detailed expert profiles and ratings to help you make informed decisions."
    ]
  },
  {
    question: "What resources are available to connect with experts? What are the costs involved?",
    answer: [
      "CalXMap offers multiple ways to connect:",
      "Direct project postings for specific requirements",
      "Browse expert directory with advanced filters",
      "Get AI-powered expert recommendations based on your needs",
      "Attend expert-led webinars and workshops",
      "Costs vary based on: engagement type (lecture/workshop/mentorship), expert experience level, session duration, and project complexity.",
      "Typical ranges: Guest lectures ₹5,000-₹25,000, Workshops ₹10,000-₹50,000, Consulting projects ₹25,000-₹200,000.",
      "Detailed pricing is displayed on each expert's profile. Institutions can also opt for annual subscriptions for unlimited access to a pool of experts."
    ]
  }
]

export default function ContactUs() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Message sent successfully! We\'ll get back to you soon.')
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          message: ''
        })
      } else {
        toast.error(result.error || 'Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Contact form error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index)
  }

  const currentMessageLength = formData.message.length

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      {/* Header */}
      <header className="bg-[#008260] text-white py-4 px-6 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Logo size="header" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm hover:text-white/80 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-white text-[#008260] hover:bg-white/90 rounded-md px-4 py-2 text-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Left Column - Contact Info */}
          <div>
            <h1 className="text-4xl font-bold text-[#000000] mb-2">
              Contact <span className="text-[#008260]">Us</span>
            </h1>
            <p className="text-[#6A6A6A] text-lg mb-8">
              Ready to connect with India's leading expert marketplace? We're here to help you find the perfect solution for your needs.
            </p>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#008260] rounded-full flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#000000]">info@calxmap.in</h3>
              </div>
            </div>

            <div className="space-y-6">
              {/* Our Services */}
              <h2 className="text-2xl font-bold text-[#000000] mb-4">Our Services</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-[#008260] rounded-2xl bg-white hover:shadow-md transition-all">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-[#008260] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-[#000000] mb-2">Response Time</h3>
                    <p className="text-sm text-[#6A6A6A] mb-2">
                      We typically respond to all inquiries within 24 hours during business days.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-[#008260] rounded-2xl bg-white hover:shadow-md transition-all">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-[#008260] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Globe className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-[#000000] mb-2">Global Reach</h3>
                    <p className="text-sm text-[#6A6A6A] mb-2">
                      Serving clients across India with our network of verified experts and institutions.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <div>
            <Card className="border border-[#E0E0E0] rounded-xl shadow-sm bg-white">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-[#000000] mb-2">Get in Touch</h2>
                <p className="text-[#6A6A6A] text-sm mb-6">You can reach us anytime.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        name="firstName"
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                      />
                    </div>
                    <div>
                      <Input
                        name="lastName"
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      name="email"
                      type="email"
                      placeholder="Your Email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value="+91"
                      disabled
                      className="w-16 border-[#DCDCDC]"
                    />
                    <Input
                      name="phone"
                      type="tel"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="flex-1 border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260]"
                    />
                  </div>

                  <div className="relative">
                    <Textarea
                      name="message"
                      placeholder="How can we help?"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      maxLength={250}
                      rows={4}
                      className="border-[#DCDCDC] focus-visible:ring-[#008260] focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-[#008260] resize-none"
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-[#6A6A6A]">
                      {currentMessageLength}/250
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#008260] hover:bg-[#006B4F] text-white rounded-md py-6 text-base font-semibold"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </Button>

                  <p className="text-xs text-center text-[#6A6A6A] mt-4">
                    By continuing us, you agree to our{' '}
                    <Link href="#" className="text-[#000000] underline">Terms of Services</Link>
                    {' '}and{' '}
                    <Link href="#" className="text-[#000000] underline">Privacy Policy</Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Frequently Asked <span className="text-[#008260]">Questions</span>
          </h2>
          
          <div className="space-y-0">
            {FAQ_DATA.map((faq, index) => (
              <div
                key={index}
                className="border-b border-[#E5E5E5] last:border-b-0"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-0 py-6 flex items-start justify-between text-left hover:opacity-70 transition-opacity group"
                >
                  <span className="text-[#000000] font-normal text-base pr-6 flex-1 leading-relaxed">{faq.question}</span>
                  <div className="flex-shrink-0 mt-0.5">
                    {expandedFAQ === index ? (
                      <div className="w-5 h-5 flex items-center justify-center">
                        <div className="w-3.5 h-0.5 bg-[#000000]"></div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 flex items-center justify-center relative">
                        <div className="w-3.5 h-0.5 bg-[#000000]"></div>
                        <div className="w-0.5 h-3.5 bg-[#000000] absolute"></div>
                      </div>
                    )}
                  </div>
                </button>
                {expandedFAQ === index && (
                  <div className="px-0 pb-6 pt-0 text-[#6A6A6A] text-sm leading-relaxed">
                    <ol className="list-decimal list-inside space-y-2">
                      {faq.answer.map((line, lineIndex) => (
                        <li key={lineIndex} className="leading-relaxed">
                          {line}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
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
              <button className="bg-white text-[#008260] px-8 py-3 rounded-full font-semibold text-lg hover:bg-slate-50 transition-all duration-300 shadow-md hover:shadow-lg flex items-center space-x-2 min-w-[200px] justify-center"
              onClick={() => router.push(`/auth/signup?role=institution`)}
              >
                <span>Start Hiring</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              {/* Become an Expert Button */}
              <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-semibold text-lg transition-all duration-300 min-w-[200px]"
              onClick={() => router.push(`/auth/signup?role=expert`)}
              >
                Become an Expert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#008260] text-white py-16 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Logo size="sm" />
                <span className="text-2xl font-bold">Cal<span className="text-[#FFD700]">X</span>Map</span>
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
                <li><Link href="#blog" className="text-white/90 hover:text-white transition-colors text-sm">Blog</Link></li>
                <li><Link href="#careers" className="text-white/90 hover:text-white transition-colors text-sm">Careers</Link></li>
                <li><Link href="#press" className="text-white/90 hover:text-white transition-colors text-sm">Press</Link></li>
                <li><Link href="#about" className="text-white/90 hover:text-white transition-colors text-sm">About Us</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-8">
            <Link href="https://www.instagram.com/calxmap" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg border-2 border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </Link>
            <Link href="https://www.linkedin.com/company/calxmap" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg border-2 border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </Link>
            <Link href="https://twitter.com/calxmap" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg border-2 border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </Link>
            <Link href="https://www.facebook.com/calxmap" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg border-2 border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
