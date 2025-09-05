'use client'

import { useRouter } from 'next/navigation'
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

interface ProfileDropdownProps {
  user: any,
  expert?: any,
  institution?: any,
  userType: 'expert' | 'institution'
}

export default function ProfileDropdown({ user, expert,institution, userType }: ProfileDropdownProps) {
  const router = useRouter()

 console.log(expert,'expert')

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const getProfileUrl = () => {
    return userType === 'expert' ? '/expert/profile' : '/institution/profile'
  }

  const getDashboardUrl = () => {
    return userType === 'expert' ? '/expert/dashboard' : '/institution/dashboard'
  }

  const getUserInitials = () => {
    if (expert?.name) {
      return expert?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    }
    if (institution?.name) {
      return institution?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()
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
          className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 hover:bg-slate-800/50 transition-all duration-300 group"
        >
          <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-slate-600 group-hover:border-blue-400 transition-all duration-300">
            <AvatarImage src={expert?.photo_url} alt={expert?.name || 'Profile'} />
            <AvatarFallback className="text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="text-slate-300 group-hover:text-white transition-colors duration-300 hidden lg:block">
            {expert?.name || institution?.name}
          </span>
          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 transition-transform duration-300" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        className="w-56 sm:w-64 lg:w-72 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/20"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-700/50">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-slate-600 flex-shrink-0">
              <AvatarImage src={expert?.photo_url} alt={expert?.name || 'Profile'} />
              <AvatarFallback className="text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base text-white font-medium truncate">{expert?.name || institution?.name}</p>
              <p className="text-xs sm:text-sm text-slate-400 break-words leading-relaxed">{user?.email}</p>
              <p className="text-blue-400 text-xs font-medium capitalize mt-1">{userType}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-1 sm:py-2">
          <DropdownMenuItem asChild className="focus:bg-slate-700/80 focus:text-white data-[highlighted]:bg-slate-700/80 data-[highlighted]:text-white">
            <Link href={getProfileUrl()} className="w-full">
              <div className="w-full justify-start px-3 sm:px-4 py-2.5 sm:py-3 text-slate-300 flex items-center">
                <User className="h-4 w-4 mr-2 sm:mr-3 text-blue-400" />
                <span className="text-sm sm:text-base">View Profile</span>
              </div>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="focus:bg-slate-700/80 focus:text-white data-[highlighted]:bg-slate-700/80 data-[highlighted]:text-white">
            <Link href={getDashboardUrl()} className="w-full">
              <div className="w-full justify-start px-3 sm:px-4 py-2.5 sm:py-3 text-slate-300 flex items-center">
                <Settings className="h-4 w-4 mr-2 sm:mr-3 text-indigo-400" />
                <span className="text-sm sm:text-base">Go to Dashboard</span>
              </div>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="border-slate-700/50 my-1 sm:my-2" />

          <DropdownMenuItem 
            className="w-full justify-start px-3 sm:px-4 py-2.5 sm:py-3 text-red-400 focus:bg-red-500/20 focus:text-red-300 data-[highlighted]:bg-red-500/20 data-[highlighted]:text-red-300"
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
