'use client'

import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, LogOut, Settings, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import Logo from '@/components/Logo'

interface ProfileDropdownProps {
  user: any,
  expert?: any,
  institution?: any,
  student?: any,
  userType: 'expert' | 'institution' | 'student',
  extraItems?: { label: string, href: string }[]
}

export default function ProfileDropdown({ user, expert, institution, student, userType, extraItems }: ProfileDropdownProps) {
  const router = useRouter()
  const pathname = usePathname()



  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const getProfileUrl = () => {
    if (userType === 'expert') return '/expert/profile'
    if (userType === 'institution') return '/institution/profile'
    return '/student/profile'
  }

  const isInternshipContext = pathname?.startsWith('/institution/internships') ?? false

  const getDashboardUrl = () => {
    if (userType === 'expert') return '/expert/dashboard'
    if (userType === 'student') return '/student/dashboard'
    // For institutions, always route primary to expert dashboard
    return '/institution/dashboard'
  }

  const getHomeUrl = () => {
    if (userType === 'expert') return '/expert/home'
    if (userType === 'institution') return '/institution/home'
    return '/student/home'
  }

  // Determine current location to toggle label and destination dynamically
  const dashboardPrefix = userType === 'expert' 
    ? '/expert/dashboard' 
    : (userType === 'institution' 
        ? '/institution/dashboard'
        : '/student/dashboard'
      )
  const homePath = getHomeUrl()
  const isOnDashboard = pathname?.startsWith(dashboardPrefix) ?? false
  const isOnHome = pathname === homePath
  const primaryNavHref = isOnDashboard ? getHomeUrl() : getDashboardUrl()
  const primaryNavLabel = isOnDashboard ? 'Go to Home' : 'Go to Dashboard'

  const getUserInitials = () => {
    if (expert?.name) {
      return expert?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    }
    if (institution?.name) {
      return institution?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    }
    if (student?.name) {
      return student?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 bg-blue-50 transition-all duration-300 group max-w-48"
        >
          <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-slate-300 group-hover:border-blue-500 transition-all duration-300">
            <AvatarImage src={expert?.photo_url || student?.photo_url} alt={(expert?.name || institution?.name || student?.name || 'Profile')} />
            <AvatarFallback className="text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="text-slate-700 group-hover:text-blue-700 transition-colors duration-300 hidden lg:block truncate">
            {expert?.name || institution?.name || student?.name}
          </span>
          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 group-hover:text-blue-600 transition-all duration-300" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        className="w-56 sm:w-64 lg:w-72 bg-white border border-slate-200 shadow-lg"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200">
         
          <div className="flex items-start space-x-2 sm:space-x-3">
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-slate-300 flex-shrink-0">
              <AvatarImage src={(expert?.photo_url || student?.photo_url) as string} alt={(expert?.name || institution?.name || student?.name || 'Profile')} />
              <AvatarFallback className="text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base text-slate-900 font-medium truncate">{expert?.name || institution?.name || student?.name}</p>
              <p className="text-xs sm:text-sm text-slate-600 break-words leading-relaxed">{user?.email}</p>
              <p className="text-blue-600 text-xs font-medium capitalize mt-1">{userType}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-1 sm:py-2">
          <DropdownMenuItem asChild className="focus:bg-blue-50 focus:text-blue-700 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700">
            <Link href={getProfileUrl()} className="w-full">
              <div className="w-full justify-start px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 flex items-center">
                <User className="h-4 w-4 mr-2 sm:mr-3 text-blue-600" />
                <span className="text-sm sm:text-base">View Profile</span>
              </div>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="focus:bg-blue-50 focus:text-blue-700 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700">
            <Link href={primaryNavHref} className="w-full">
              <div className="w-full justify-start px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 flex items-center">
                <Settings className="h-4 w-4 mr-2 sm:mr-3 text-blue-600" />
                <span className="text-sm sm:text-base">{primaryNavLabel}</span>
              </div>
            </Link>
          </DropdownMenuItem>

          {(userType === 'institution' && (institution?.type || '').toLowerCase() === 'corporate' && !isInternshipContext) && (
            <DropdownMenuItem asChild className="focus:bg-blue-50 focus:text-blue-700 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700">
              <Link href="/institution/internships/dashboard" className="w-full">
                <div className="w-full justify-start px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 flex items-center">
                  <Settings className="h-4 w-4 mr-2 sm:mr-3 text-blue-600" />
                  <span className="text-sm sm:text-base">Internship Dashboard</span>
                </div>
              </Link>
            </DropdownMenuItem>
          )}

          {extraItems && extraItems.length > 0 && (
            <>
              {extraItems.map((item, idx) => (
                <DropdownMenuItem asChild key={`${item.href}-${idx}`} className="focus:bg-blue-50 focus:text-blue-700 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700">
                  <Link href={item.href} className="w-full">
                    <div className="w-full justify-start px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 flex items-center">
                      <span className="text-sm sm:text-base">{item.label}</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="border-slate-200 my-1 sm:my-2" />
            </>
          )}

          <DropdownMenuSeparator className="border-slate-200 my-1 sm:my-2" />

          <DropdownMenuItem 
            className="w-full justify-start px-3 sm:px-4 py-2.5 sm:py-3 text-red-600 focus:bg-red-50 focus:text-red-700 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2 sm:mr-3" />
            <span className="text-sm sm:text-base">Sign Out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
