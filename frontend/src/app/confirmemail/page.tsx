'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GraduationCap, CheckCircle, ArrowRight, Home, User } from 'lucide-react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import animationData from '@/components/successfully-done.json'

export default function ConfirmEmailPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Add a small delay for the animation to start
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Expert Collaboration</span>
          </Link>
        </div>

        {/* Main Content */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            {/* Success Animation */}
            <div className="flex justify-center mb-6">
              <div className={`relative transition-all duration-1000 ease-out ${
                isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              }`}>
                <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48">
                  <Lottie 
                    animationData={animationData} 
                    loop={true}
                    className="w-full h-full"
                  />
                </div>
                {/* Success Icon Overlay */}
               
              </div>
            </div>

            <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Email Confirmed Successfully! 🎉
            </CardTitle>
            
            <CardDescription className="text-base sm:text-lg text-gray-600 max-w-md mx-auto">
              Your account has been verified and activated. Welcome to Expert Collaboration!
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Success Message */}
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Account Verified</span>
                </div>
                <p className="text-sm sm:text-base text-green-700">
                  Your email address has been successfully confirmed. You can now access all features of the platform.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                <h3 className="font-semibold text-blue-800 mb-2">What&apos;s Next?</h3>
                <ul className="text-sm sm:text-base text-blue-700 space-y-1 text-left max-w-md mx-auto">
                  <li className="flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                    <span>Complete your profile setup</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                    <span>Start exploring projects or experts</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4 flex-shrink-0" />
                    <span>Connect with the community</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/login">
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3">
                  <User className="h-4 w-4 mr-2" />
                  Sign In to Your Account
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto px-6 py-3">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Homepage
                </Button>
              </Link>
            </div>

            {/* Additional Info */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">
                You can now close this tab and return to the main application.
              </p>
              <p className="text-xs text-gray-400">
                If you have any questions, please contact our support team.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Thank you for choosing Expert Collaboration
          </p>
        </div>
      </div>
    </div>
  )
}
