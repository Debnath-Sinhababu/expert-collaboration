'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  ArrowLeft,
  CheckCircle,
  Clock,
  Users,
  Building,
  MessageSquare,
  Globe,
  Star
} from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function ContactUs() {
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText('info@calxmap.in')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="relative z-50 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 backdrop-blur-sm border-b border-blue-200/20 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500"></div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white group-hover:text-blue-100 transition-colors duration-300">Calxmap</h1>
                <p className="text-xs text-blue-100 font-medium group-hover:text-white transition-colors duration-300">knowledge sharing networking platform</p>
              </div>
            </Link>
            
            <Link href="/">
              <Button variant="ghost" className="font-medium text-white hover:text-blue-100 hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-300 px-4 py-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10">
        {/* Hero Section */}
        <div className="text-center mb-16">
        <Logo size="lg" />
          <div className="inline-flex items-center space-x-2 bg-slate-100 backdrop-blur-sm px-6 py-3 rounded-full text-sm font-medium mb-6 border-2 border-slate-200">
            <MessageSquare className="h-5 w-5 text-slate-600" />
            <span className="text-slate-700">Get in Touch</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Let's Build Something
            <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent"> Amazing Together</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Ready to connect with India's leading expert marketplace? We're here to help you find the perfect solution for your needs.
          </p>
        </div>

        {/* Contact Information Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-2 border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">Email Us</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 leading-relaxed mb-4">
                Drop us a line with your requirements and we'll get back to you within 24 hours.
              </p>
              <Button 
                onClick={copyEmail}
                className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white font-semibold px-6 py-3 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Copy Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">Response Time</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 leading-relaxed mb-4">
                We typically respond to all inquiries within 24 hours during business days.
              </p>
              <div className="text-3xl font-bold text-slate-900 mb-2">24 Hours</div>
              <p className="text-sm text-slate-500">Average Response Time</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">Global Reach</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 leading-relaxed mb-4">
                Serving clients across India with our network of verified experts and institutions.
              </p>
              <div className="text-3xl font-bold text-slate-900 mb-2">Pan India</div>
              <p className="text-sm text-slate-500">Service Coverage</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Contact Request */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Mail className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-4xl font-bold text-slate-900 mb-4">Ready to Get Started?</CardTitle>
              <CardDescription className="text-xl text-slate-600 max-w-3xl mx-auto">
                We'd love to hear about your project and how we can help you connect with the right experts.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="bg-slate-50 rounded-2xl p-8 border-2 border-slate-200">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">How to Reach Us</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Please send us an email with your detailed requirements and any relevant attachments to:
                  </p>
                </div>
                
                <div className="text-center mb-8">
                  <div className="flex flex-col sm:flex-row items-center justify-center space-x-4 bg-slate-100 backdrop-blur-sm px-8 py-4 rounded-2xl border-2 border-slate-200">
                    <Mail className="h-6 w-6 text-slate-600" />
                    <span className="text-2xl font-bold text-slate-900">info@calxmap.in</span>
                    <Button 
                      onClick={copyEmail}
                      size="sm"
                      className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white"
                    >
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <Users className="h-5 w-5 text-slate-600 mr-2" />
                      For Experts
                    </h4>
                    <ul className="space-y-2 text-slate-600">
                      <li>• Your professional background and expertise</li>
                      <li>• Areas of specialization</li>
                      <li>• Availability and preferred engagement model</li>
                      <li>• Resume/CV attachment</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <Building className="h-5 w-5 text-slate-600 mr-2" />
                      For Organizations
                    </h4>
                    <ul className="space-y-2 text-slate-600">
                      <li>• Organization details and requirements</li>
                      <li>• Type of expertise needed</li>
                      <li>• Project timeline and budget</li>
                      <li>• Any specific documentation needed</li>
                    </ul>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-slate-500 text-sm">
                    We'll review your requirements and connect you with the most suitable experts from our verified network.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-8">Why Choose Calxmap?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Verified Experts</h4>
              <p className="text-slate-600">All our experts undergo rigorous verification and background checks</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Quick Matching</h4>
              <p className="text-slate-600">Get matched with the right expert within 24 hours</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Dedicated Support</h4>
              <p className="text-slate-600">Our team provides ongoing support throughout your collaboration</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 border-t border-blue-200/20 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <p className="text-blue-100 text-sm">
              © 2024 Calxmap. All rights reserved. | India's Leading Expert Marketplace
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
