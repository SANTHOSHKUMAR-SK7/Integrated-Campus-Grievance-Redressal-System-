
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, MessageSquare, AlertCircle, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getAccessToken, getCurrentUser } from '../store';
import { UserRole } from '../types';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  type: 'system' | 'message' | 'status_change';
  link?: string;
}

const NotificationCenter: React.FC<{ onClose: () => void; onNotificationsChanged?: () => void }> = ({
  onClose,
  onNotificationsChanged,
}) => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getActivityRoute = () => {
    if (currentUser?.role === UserRole.STUDENT) return '/track';
    if (currentUser?.role === UserRole.ADMIN) return '/manage';
    return '/manage';
  };

  const getFallbackRoute = (notification: Notification) => {
    if (notification.type === 'message' || notification.type === 'status_change') {
      if (currentUser?.role === UserRole.STUDENT) return '/track';
      if (currentUser?.role === UserRole.ADMIN) return '/manage';
      return '/manage';
    }
    return '/dashboard';
  };

  const fetchNotifications = async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });
      setNotifications((current) => current.map(n => n.id === id ? { ...n, isRead: true } : n));
      onNotificationsChanged?.();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });
      setNotifications((current) => current.map(n => ({ ...n, isRead: true })));
      onNotificationsChanged?.();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const goTo = (target: string) => {
    onClose();
    requestAnimationFrame(() => {
      navigate(target);
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'status_change': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'message': return <MessageSquare className="w-5 h-5 text-indigo-500" />;
      default: return <AlertCircle className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute right-0 mt-2 w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50"
    >
      <div className="p-4 border-bottom border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-900 text-lg">Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Mark all read
          </button>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-slate-500 font-medium">No notifications yet</p>
            <p className="text-slate-400 text-xs mt-1">We'll notify you when something happens</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 transition-colors cursor-pointer relative group border-l-4 ${
                  notification.isRead
                    ? 'border-transparent bg-white hover:bg-slate-50/80'
                    : 'border-indigo-500 bg-indigo-50/60 hover:bg-indigo-50'
                }`}
                onClick={() => {
                  if (!notification.isRead) {
                    void markAsRead(notification.id);
                  }
                  goTo(notification.link || getFallbackRoute(notification));
                }}
              >
                <div className="flex gap-3">
                  <div className="mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={`text-sm font-bold truncate ${notification.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                          {notification.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                            notification.isRead
                              ? 'bg-slate-100 text-slate-400'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {notification.isRead ? 'Read' : 'Unread'}
                        </span>
                      </div>
                      <span className={`text-[10px] whitespace-nowrap ${notification.isRead ? 'text-slate-300' : 'text-slate-500'}`}>
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${notification.isRead ? 'text-slate-400' : 'text-slate-600'}`}>
                      {notification.message}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 shrink-0" />
                  )}
                  {notification.isRead && (
                    <div className="mt-1 shrink-0">
                      <Check className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-50 text-center border-top border-slate-100">
        <button
          onClick={() => {
            goTo(getActivityRoute());
          }}
          className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
        >
          View all activity
        </button>
      </div>
    </motion.div>
  );
};

export default NotificationCenter;
