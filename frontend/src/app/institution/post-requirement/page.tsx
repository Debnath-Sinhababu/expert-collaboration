'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import Logo from '@/components/Logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ContractForm from './sections/ContractForm'
import InternshipForm from './sections/InternshipForm'
import FreelanceForm from './sections/FreelanceForm'

function PostRequirementContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Initialize activeTab from URL query parameter or default to 'contract'
  const tabFromUrl = searchParams.get('tab') as 'contract' | 'internship' | 'freelance' | null
  const [activeTab, setActiveTab] = useState<'contract' | 'internship' | 'freelance'>(
    tabFromUrl && ['contract', 'internship', 'freelance'].includes(tabFromUrl) 
      ? tabFromUrl 
      : 'contract'
  )

  const isCorporate = institution?.type?.toLowerCase() === 'corporate'

  // Sync tab with URL on mount or when institution type changes (runs first)
  useEffect(() => {
    if (!loading && institution && !isInitialized) {
      const tabFromUrl = searchParams.get('tab') as 'contract' | 'internship' | 'freelance' | null
      if (tabFromUrl && ['contract', 'internship', 'freelance'].includes(tabFromUrl)) {
        if (isCorporate) {
          setActiveTab(tabFromUrl)
        } else {
          // Non-corporate can only have contract tab
          setActiveTab('contract')
          const params = new URLSearchParams(searchParams.toString())
          params.set('tab', 'contract')
          router.replace(`?${params.toString()}`, { scroll: false })
        }
      } else if (!tabFromUrl) {
        // No tab in URL, set default and update URL
        setActiveTab('contract')
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', 'contract')
        router.replace(`?${params.toString()}`, { scroll: false })
      }
      setIsInitialized(true)
    }
  }, [loading, institution, isCorporate, searchParams, router, isInitialized])

  // Update URL query parameter when tab changes via user interaction (only after initialization)
  useEffect(() => {
    if (isInitialized && !loading && institution) {
      // Only update URL if it's different from current tab (avoid infinite loop)
      const currentTabFromUrl = searchParams.get('tab')
      if (currentTabFromUrl !== activeTab) {
        if (isCorporate && activeTab) {
          const params = new URLSearchParams(searchParams.toString())
          params.set('tab', activeTab)
          router.replace(`?${params.toString()}`, { scroll: false })
        } else if (!isCorporate && activeTab !== 'contract') {
          // For non-corporate, ensure tab is contract and update URL
          setActiveTab('contract')
          const params = new URLSearchParams(searchParams.toString())
          params.set('tab', 'contract')
          router.replace(`?${params.toString()}`, { scroll: false })
        }
      }
    }
  }, [activeTab, isCorporate, router, searchParams, isInitialized, loading, institution])

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        setUser(user)
        
        const inst = await api.institutions.getByUserId(user.id)
        if (!inst) { router.push('/institution/profile-setup'); return }
        setInstitution(inst)
      } catch (e: any) {
        setError(e.message || 'Failed to initialize')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

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
      <header className="bg-[#008260] backdrop-blur-sm sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-xl font-bold">Post Requirement</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileDropdown user={user} institution={institution} userType="institution" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>
        )}

        {!isCorporate ? (
          // Non-corporate: Show only Contract form
          <div className="mb-6">
            <ContractForm />
          </div>
        ) : (
          // Corporate: Show all tabs
          <div className="mb-6">
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v as 'contract' | 'internship' | 'freelance')
            }} className="space-y-6">
              <div className="w-full overflow-x-auto md:overflow-x-visible scrollbar-hide">
                <TabsList className="flex md:grid w-max md:w-full md:grid-cols-3 gap-2 bg-white border-b border-slate-200 h-12 px-4 md:px-0">
                  <TabsTrigger value="contract" className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max">Contract</TabsTrigger>
                  <TabsTrigger value="internship" className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max">Internship</TabsTrigger>
                  <TabsTrigger value="freelance" className="data-[state=active]:bg-[#E8F5F1] data-[state=active]:text-[#008260] data-[state=active]:border-b-2 data-[state=active]:border-[#008260] hover:bg-[#E8F5F1]/50 transition-all duration-200 font-medium text-slate-700 flex items-center justify-center h-full px-4 rounded-none shrink-0 whitespace-nowrap min-w-max">Freelance</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="contract">
                <ContractForm />
              </TabsContent>
              <TabsContent value="internship">
                <InternshipForm />
              </TabsContent>
              <TabsContent value="freelance">
                <FreelanceForm />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  )
}

export default function PostRequirementUnified() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4"></div>
          <p className="text-[#6A6A6A]">Loading...</p>
        </div>
      </div>
    }>
      <PostRequirementContent />
    </Suspense>
  )
}

