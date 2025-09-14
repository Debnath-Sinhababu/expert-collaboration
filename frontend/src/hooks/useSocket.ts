import { useEffect, useRef, useState, useCallback } from 'react';

interface Notification {
  type: string;
  message: string;
  projectTitle?: string;
  expertName?: string;
  institutionName?: string;
  status?: string;
  projectId?: string;
  timestamp: Date;
}

interface UseSocketReturn {
  socket: any;
  isConnected: boolean;
  notifications: Notification[];
  sendNotification: (event: string, data: any) => void;
  clearNotifications: () => void;
  connect: (userId: string, userType: 'expert' | 'institution') => void;
  disconnect: () => void;
}

export const useSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const socketRef = useRef<any>(null);

  const connect = useCallback(async (userId: string, userType: 'expert' | 'institution') => {
    if (socketRef.current?.connected) {
      console.log('Socket already connected');
      return;
    }

    if (typeof window === 'undefined') {
      console.log('Socket.IO connection skipped - server-side rendering');
      return;
    }

    try {
      console.log('Attempting to create Socket.IO connection...');
      
      const { default: io } = await import('socket.io-client');
      
      const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000', {
        transports: ['websocket'],
        autoConnect: true,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected successfully:', newSocket.id);
        setIsConnected(true);
        
        newSocket.emit('authenticate', { userId, userType });
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('authenticated', (data: any) => {
        console.log('Socket authenticated successfully:', data);
      });

      newSocket.on('connect_error', (error: any) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      newSocket.on('new_application', (data: any) => {
        console.log('New application notification:', data);
        addNotification({
          type: 'new_application',
          message: data.message,
          projectTitle: data.projectTitle,
          expertName: data.expertName,
          timestamp: new Date(),
        });
      });

      newSocket.on('application_status_changed', (data: any) => {
        console.log('Application status changed notification:', data);
        addNotification({
          type: 'application_status_changed',
          message: data.message,
          projectTitle: data.projectTitle,
          projectId: data.projectId,
          status: data.status,
          timestamp: new Date(),
        });
      });

      newSocket.on('booking_created', (data: any) => {
        console.log('Booking created notification:', data);
        addNotification({
          type: 'booking_created',
          message: data.message,
          projectTitle: data.projectTitle,
          institutionName: data.institutionName,
          projectId: data.projectId,
          timestamp: new Date(),
        });
      });

      newSocket.on('booking_updated', (data: any) => {
        console.log('Booking updated notification:', data);
        addNotification({
          type: 'booking_updated',
          message: data.message,
          projectTitle: data.projectTitle,
          timestamp: new Date(),
        });
      });

      newSocket.on('new_project_available', (data: any) => {
        console.log('New project available notification:', data);
        addNotification({
          type: 'new_project_available',
          message: data.message,
          projectTitle: data.projectTitle,
          institutionName: data.institutionName,
          timestamp: new Date(),
        });
      });

      newSocket.on('expert_selected_with_booking', (data: any) => {
        console.log('Expert selected with booking notification:', data);
        addNotification({
          type: 'expert_selected_with_booking',
          message: data.message,
          projectTitle: data.projectTitle,
          projectId: data.projectId,
          timestamp: new Date(),
        });
      });

      newSocket.on('expert_interest_shown', (data: any) => {
        console.log('Expert interest shown notification:', data);
        addNotification({
          type: 'expert_interest_shown',
          message: data.message,
          projectTitle: data.projectTitle,
          projectId: data.projectId,
          timestamp: new Date(),
        });
      });

      newSocket.on('moved_to_interview', (data: any) => {
        console.log('Moved to interview notification:', data);
        addNotification({
          type: 'moved_to_interview',
          message: data.message,
          projectTitle: data.projectTitle,
          projectId: data.projectId,
          timestamp: new Date(),
        });
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
      
    } catch (error) {
      console.error('Failed to create Socket.IO connection:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  const sendNotification = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    socket,
    isConnected,
    notifications,
    sendNotification,
    clearNotifications,
    connect,
    disconnect,
  };
};
