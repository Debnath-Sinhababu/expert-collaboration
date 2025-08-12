'use client'

import { useState, useEffect } from 'react'
import { Bell, X, CheckCircle, AlertCircle, Info, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSocket } from '@/hooks/useSocket'
import { supabase } from '@/lib/supabase'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { isConnected, notifications, connect, disconnect } = useSocket()

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
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 max-w-[calc(100vw-2rem)] max-h-96 p-0" 
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className={`p-4 border-l-4 ${getNotificationColor(notification.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.message}
                      </p>
                      {notification.projectTitle && (
                        <p className="text-xs text-gray-600 mt-1">
                          Project: {notification.projectTitle}
                        </p>
                      )}
                      {notification.expertName && (
                        <p className="text-xs text-gray-600">
                          Expert: {notification.expertName}
                        </p>
                      )}
                      {notification.institutionName && (
                        <p className="text-xs text-gray-600">
                          Institution: {notification.institutionName}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
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
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Socket Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Clear notifications logic would go here
                }}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
