"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

export interface Notification {
  id: number;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

let notificationId = 0;

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string, type?: Notification['type']) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (message: string, type: Notification['type'] = 'info') => {
    const id = ++notificationId;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  };

  return (
    <NotificationContext.Provider value={{ notifications, showNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used inside NotificationProvider');
  }
  return context;
}

export function NotificationContainer({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`px-5 py-3 rounded-lg shadow-lg text-white font-medium text-sm
            transform transition-all duration-300 ease-in-out
            animate-in fade-in slide-in-from-top-2
            ${n.type === 'success'
              ? 'bg-green-600 border-l-4 border-green-800'
              : n.type === 'error'
              ? 'bg-red-600 border-l-4 border-red-800'
              : n.type === 'warning'
              ? 'bg-yellow-600 border-l-4 border-yellow-800 text-black'
              : 'bg-blue-600 border-l-4 border-blue-800'
            }`}
        >
          {n.message}
        </div>
      ))}
    </div>
  );
}