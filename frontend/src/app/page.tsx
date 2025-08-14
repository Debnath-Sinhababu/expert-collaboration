'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Users, BookOpen, Star } from 'lucide-react'
import Link from 'next/link'

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // if (user) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  //       <div className="container mx-auto px-4 py-8">
  //         <div className="text-center mb-8">
  //           <h1 className="text-4xl font-bold text-gray-900 mb-4">
  //             Welcome back to Expert Collaboration
  //           </h1>
  //           <p className="text-xl text-gray-600">
  //             Continue your journey in connecting education with expertise
  //           </p>
  //         </div>
          
  //         <div className="flex justify-center space-x-4">
  //           <Link href="/expert/dashboard">
  //             <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
  //               Expert Dashboard
  //             </Button>
  //           </Link>
  //           <Link href="/institution/dashboard">
  //             <Button size="lg" variant="outline">
  //               Institution Dashboard
  //             </Button>
  //           </Link>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Expert Collaboration</span>
          </div>
          <div className="space-x-4">
            <Link href="/auth/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-blue-600 hover:bg-blue-700">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Connect Universities with
          <span className="text-blue-600"> Expert Professionals</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          A trusted online marketplace that helps Indian universities find and hire qualified experts 
          for academic and research work, while empowering professionals with flexible, part-time opportunities.
        </p>
        <div className="space-x-4">
          <Link href="/auth/signup?role=expert">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Join as Expert
            </Button>
          </Link>
          <Link href="/auth/signup?role=institution">
            <Button size="lg" variant="outline">
              Join as Institution
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>For Experts</CardTitle>
              <CardDescription>
                Create your profile, showcase expertise, and find flexible academic opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
              <li>• Build a comprehensive professional profile</li>
<li>• Set your availability and preferred rates</li>
<li>• Apply to relevant and exciting projects</li>
<li>• Get verified, rated, and recognized</li>

              </ul>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>For Institutions</CardTitle>
              <CardDescription>
                Post projects, find qualified experts, and streamline academic collaborations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2 ">
              <li>• Post your academic or project requirements</li>
<li>• Review and shortlist expert applications</li>
<li>• Book the right experts for your needs</li>
<li>• Rate and share constructive feedback</li>

              </ul>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Star className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Trusted Platform</CardTitle>
              <CardDescription>
                Secure, verified, and streamlined process for all academic engagements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• KYC verification for experts</li>
                <li>• Secure messaging system</li>
                <li>• Rating & feedback system</li>
                <li>• Professional support</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Academic Collaboration?
          </h2>
          <p className="text-xl mb-8">
            Join thousands of experts and institutions already using our platform
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <GraduationCap className="h-6 w-6" />
            <span className="text-xl font-bold">Expert Collaboration</span>
          </div>
          <p className="text-gray-400">
            Connecting Indian universities with verified experts for academic excellence
          </p>
        </div>
      </footer>
    </div>
  )
}
