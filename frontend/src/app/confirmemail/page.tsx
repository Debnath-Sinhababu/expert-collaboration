'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GraduationCap, CheckCircle, ArrowRight, Home, User, Check } from 'lucide-react'
import Link from 'next/link'
import Lottie from 'lottie-react'
import animationData from '@/components/successfully-done.json'
import { useRouter } from 'next/navigation'

export default function ConfirmEmailPage() {
  const [countdown, setCountdown] = useState(10);
  const router = useRouter()

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else{
      router.push('/')
    }
  }, [countdown]);

  return (
    <div className="min-h-screen relative bg-[#ECF2FF]">
      <header className="relative bg-[#008260] shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
           
            <Link href="/contact-us">
              <Button variant="ghost" className="font-medium text-white hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 text-sm">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="w-full min-h-screen flex flex-col justify-center items-center">
        {/* Header */}
    

        {/* Main Content */}
        <Card className="shadow-2xl border-0 bg-[#FFFFFF] w-full max-w-[550px] mx-auto">
        
        <CardContent className="pt-12 pb-8 px-6">
          {/* Check Icon Circle */}
          <div className="flex justify-center mb-8">
            <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#ECF2FF] flex items-center justify-center">
  <div className="bg-[#008260] rounded-full p-4">
    <Check className="w-5 h-5 text-white stroke-[3]" />
  </div>
</div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[22px] font-bold text-center text-gray-900 mb-4">
            Email Confirmed Successfully
          </h1>

          {/* Description */}
          <p className="text-center text-base font-medium text-black mb-8 px-4">
            Your account has been verified and activated. Welcome to CalXMap!
          </p>

          {/* Button */}
          <Button 
            className="w-full bg-[#008260] hover:bg-[#008260] text-white font-medium py-6 text-base rounded-lg"
            onClick={() => router.push('/')}
          >
            Redirect to Homepage
          </Button>

          {/* Countdown */}
          <p className="text-center text-black text-[13px] font-normal mt-4">
            Redirecting in {countdown}s
          </p>
        </CardContent>

        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Thank you for choosing Calxmap
          </p>
        </div>
      </div>
    </div>
  )
}
