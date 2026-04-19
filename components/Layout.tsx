
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAccessToken, getCurrentUser, logout, subscribeToSession } from '../store';
import { UserRole } from '../types';
import { ICONS } from '../constants';
import NotificationCenter from './NotificationCenter';
import { AnimatePresence } from 'motion/react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setUser] = useState(getCurrentUser());
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch('/api/notifications/unread', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      } else if (response.status === 401) {
        console.warn('Unauthorized unread count fetch - session may have expired');
      } else {
        console.error(`Unread count fetch failed with status: ${response.status}`);
      }
    } catch (error) {
      // Silent fail for network errors during background polling to avoid console spam
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        // This is expected during server restarts or network blips
        return;
      }
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  useEffect(() => {
    const cleanup = subscribeToSession(() => {
      setUser(getCurrentUser());
    });

    if (currentUser) {
      fetchUnreadCount();
    }

    return cleanup;
  }, [currentUser, fetchUnreadCount]);

  useEffect(() => {
    if (!showNotifications) return;
    fetchUnreadCount();
  }, [showNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (!showNotifications) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showNotifications]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/';
  if (!currentUser || isAuthPage) return <>{children}</>;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <ICONS.Dashboard />, roles: [UserRole.STUDENT, UserRole.STAFF, UserRole.ADMIN] },
    { path: '/chatbot', label: 'Filing Assistant', icon: <ICONS.Chatbot />, roles: [UserRole.STUDENT] },
    { path: '/manual-complaint', label: 'Manual Filing', icon: <ICONS.Raise />, roles: [UserRole.STUDENT] },
    { path: '/track', label: 'Case Tracker', icon: <ICONS.List />, roles: [UserRole.STUDENT] },
    { path: '/manage', label: 'Direct Worklist', icon: <ICONS.List />, roles: [UserRole.STAFF, UserRole.ADMIN] },
    { path: '/users', label: 'User Directory', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, roles: [UserRole.ADMIN] },
    { path: '/analytics', label: 'Institutional Metrics', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, roles: [UserRole.ADMIN] },
    { path: '/profile', label: 'Security Settings', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>, roles: [UserRole.STUDENT, UserRole.STAFF, UserRole.ADMIN] },
  ];

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Sidebar */}
      <aside className="w-[300px] bg-white border-r border-slate-200 flex flex-col fixed h-screen z-30 shadow-[10px_0_30px_rgba(0,0,0,0.015)]">
        <div className="p-10 pb-12 flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center p-2.5 shadow-sm border border-indigo-100/50">
            <img src="/dait-logo.png" alt="DAIT" className="h-full w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-900 leading-tight tracking-tighter">DAIT HUB</h1>
            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.2em] mt-0.5">ICGRS Portal</p>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.filter(item => item.roles.includes(currentUser.role)).map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/manage' && location.pathname.startsWith('/manage'));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (item.path === '/chatbot') {
                    window.dispatchEvent(new CustomEvent('reset-grievance-chat'));
                  }
                }}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-bold transition-all group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200/50 translate-x-1' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-8 border-t border-slate-100 bg-slate-50/30">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 text-xs font-black text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all uppercase tracking-widest"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            End Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-[300px] flex flex-col min-h-screen">
        <header className="h-[96px] bg-white/80 backdrop-blur-md border-b border-slate-200 px-12 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Control: {currentUser.name}</h2>
            <div className="h-5 w-[1px] bg-slate-200 mx-2"></div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{currentUser.role} Level Authority</p>
          </div>
          <div className="flex items-center gap-10">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-3 transition-all rounded-2xl border shadow-sm ${
                  showNotifications ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-400 hover:text-indigo-600 bg-slate-50 border-slate-100'
                }`}
              >
                <ICONS.Notification />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white font-black animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <NotificationCenter
                    onClose={() => setShowNotifications(false)}
                    onNotificationsChanged={fetchUnreadCount}
                  />
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-5 pl-10 border-l border-slate-100">
              <div className="text-right">
                <span className="block text-xs font-black text-slate-900 uppercase tracking-tight">{currentUser.name}</span>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{currentUser.department || 'General'}</span>
              </div>
              <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-sm font-black shadow-2xl border-2 border-white">
                {getInitials(currentUser.name)}
              </div>
            </div>
          </div>
        </header>

        <main className="p-12 max-w-[1600px] w-full flex-1 mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
