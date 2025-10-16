'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Rocket, Bell, ArrowLeft } from 'lucide-react'

export default function CorporateComingSoon() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-36 -right-36 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-36 -left-36 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center group">
            <Logo size="lg" />
          </Link>
          <Link href="/">
            <Button variant="ghost" className="border border-transparent hover:border-slate-200">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto">
          <Card className="border-2 border-slate-200 bg-white shadow-sm">
            <CardContent className="p-10">
              <div className="text-center">
                <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center shadow-sm">
                  <Rocket className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Coming Soon</h1>
                <p className="text-slate-600 text-lg mb-6">Corporate requirement posting is on its final lap. We are crafting a seamless, professional experience aligned with our platform.</p>

                {/* Animated dots */}
                <div className="flex items-center justify-center gap-2 mb-8">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce" />
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700 animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>

                <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                  <Link href="/auth/signup?role=institution">
                    <Button className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 hover:from-slate-800 hover:via-blue-800 hover:to-indigo-800 text-white">Explore as University</Button>
                  </Link>
                  <Link href="/auth/signup?role=expert">
                    <Button variant="outline" className="w-full">Join as Expert</Button>
                  </Link>
                </div>

                <div className="mt-8 text-sm text-slate-500 flex items-center justify-center gap-2">
                  <Bell className="h-4 w-4" />
                  Be the first to know. This feature goes live very soon.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


