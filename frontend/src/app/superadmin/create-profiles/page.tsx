'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, GraduationCap, UserPlus } from 'lucide-react'
import ExpertProfileSetup from '@/app/expert/profile-setup/page'
import InstitutionProfileSetup from '@/app/institution/profile-setup/page'
import StudentProfileSetup from '@/app/student/profile-setup/page'
import { ExpertWorkspaceProvider } from '@/contexts/ExpertWorkspaceContext'
import { InstitutionWorkspaceProvider } from '@/contexts/InstitutionWorkspaceContext'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ProfileTab = 'expert' | 'institution' | 'student'

const tabs: Array<{ value: ProfileTab; label: string; description: string; icon: ElementType }> = [
  { value: 'expert', label: 'Expert', description: 'Create trainer and consultant profiles', icon: UserPlus },
  { value: 'institution', label: 'Institution', description: 'Create college, university, and corporate accounts', icon: Building2 },
  { value: 'student', label: 'Student', description: 'Create student talent profiles', icon: GraduationCap },
]

function normalizeTab(value: string | null): ProfileTab {
  if (value === 'institution' || value === 'student') return value
  return 'expert'
}

export default function SuperAdminCreateProfilesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => normalizeTab(searchParams.get('type')))

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get('type')))
  }, [searchParams])

  const active = useMemo(() => tabs.find((tab) => tab.value === activeTab) || tabs[0], [activeTab])
  const ActiveIcon = active.icon

  function changeTab(value: string) {
    const next = normalizeTab(value)
    setActiveTab(next)
    router.replace(`/superadmin/create-profiles?type=${next}`, { scroll: false })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#008260]">Profile creation</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Create Profiles</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Create expert, institution, and student profiles from one workspace.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#008260] text-white">
                <ActiveIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">{active.label}</p>
                <p className="text-xs text-slate-500">{active.description}</p>
              </div>
            </div>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={changeTab} className="mt-5">
          <TabsList className="grid h-auto w-full grid-cols-1 bg-slate-100 p-1 sm:grid-cols-3">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2 py-3">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'expert' ? (
        <ExpertWorkspaceProvider viewer="super_admin">
          <ExpertProfileSetup />
        </ExpertWorkspaceProvider>
      ) : null}
      {activeTab === 'institution' ? (
        <InstitutionWorkspaceProvider viewer="super_admin">
          <InstitutionProfileSetup />
        </InstitutionWorkspaceProvider>
      ) : null}
      {activeTab === 'student' ? <StudentProfileSetup /> : null}
    </div>
  )
}
