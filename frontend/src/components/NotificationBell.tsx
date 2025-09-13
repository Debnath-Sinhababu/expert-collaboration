'use client'

import { useState, useEffect } from 'react'
import { Bell, X, CheckCircle, AlertCircle, Info, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSocket } from '@/hooks/useSocket'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const { isConnected, notifications, connect, disconnect, clearNotifications } = useSocket()
  const router = useRouter()

  useEffect(() => {
    let isMounted = true;
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && isMounted) {
          const userType = user.user_metadata?.role || 'expert'
          console.log('Attempting to connect Socket.IO for user:', user.id, userType);
          connect(user.id, userType)
        }
      } catch (error) {
        console.error('Error getting user in NotificationBell:', error)
      }
    }

    getUser()

    return () => {
      isMounted = false;
      disconnect();
    };
  }, [connect, disconnect])

  const handleClearAll = async () => {
    if (notifications.length > 0) {
      setIsClearing(true);
      try {
        clearNotifications();
        setShowClearConfirm(false);
        // Optionally close the dropdown after clearing
        setIsOpen(false);
      } catch (error) {
        console.error('Error clearing notifications:', error);
      } finally {
        setIsClearing(false);
      }
    }
  }

  const handleClearClick = () => {
    if (notifications.length > 0) {
      setShowClearConfirm(true);
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_application':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'application_status_changed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'booking_created':
      case 'booking_updated':
        return <Clock className="h-4 w-4 text-purple-500" />
      case 'new_project_available':
        return <Info className="h-4 w-4 text-orange-500" />
      case 'expert_selected_with_booking':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'expert_interest_shown':
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_application':
        return 'bg-blue-50 border-blue-200'
      case 'application_status_changed':
        return 'bg-green-50 border-green-200'
      case 'booking_created':
      case 'booking_updated':
        return 'bg-purple-50 border-purple-200'
      case 'new_project_available':
        return 'bg-orange-50 border-orange-200'
      case 'expert_selected_with_booking':
        return 'bg-green-100 border-green-300'
      case 'expert_interest_shown':
        return 'bg-blue-100 border-blue-300'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const unreadCount = notifications.length

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white hover:text-white hover:bg-transparent w-9 h-9 sm:w-10 sm:h-10"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-96 p-0 bg-white/95 backdrop-blur-sm border-0 shadow-2xl" 
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Notifications</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-300 w-8 h-8 sm:w-9 sm:h-9"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-3 sm:p-4 text-center text-slate-500">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm sm:text-base">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className={`p-3 sm:p-4 border-l-4 ${getNotificationColor(notification.type)} cursor-pointer`}
                  onClick={() => {
                    if (notification.projectId) {
                      router.push(`/expert/project/${notification.projectId}`)
                      setIsOpen(false)
                    }
                  }}
                >
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-900">
                        {notification.message}
                      </p>
                      {notification.projectTitle && (
                        <p className="text-xs text-slate-600 mt-1">
                          Project: {notification.projectTitle}
                        </p>
                      )}
                      {notification.expertName && (
                        <p className="text-xs text-slate-600">
                          Expert: {notification.expertName}
                        </p>
                      )}
                      {notification.institutionName && (
                        <p className="text-xs text-slate-600">
                          Institution: {notification.institutionName}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-2 sm:p-3 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Socket Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
              {showClearConfirm ? (
                <div className="flex items-center space-x-2">
                  <span className="text-red-600">Clear all?</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-xs bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors px-2 py-1"
                    disabled={isClearing}
                  >
                    {isClearing ? 'Clearing...' : 'Yes'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowClearConfirm(false)}
                    className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-300 px-2 py-1"
                    disabled={isClearing}
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearClick}
                  className="text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-300 px-2 py-1"
                  disabled={notifications.length === 0 || isClearing}
                >
                  Clear All ({notifications.length})
                </Button>
              )}
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
