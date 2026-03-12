
import React from 'react';

export const COLORS = {
  department: {
    Technical: 'bg-indigo-50 text-indigo-700',
    Infrastructure: 'bg-slate-100 text-slate-700',
    Academic: 'bg-purple-50 text-purple-700',
    Administrative: 'bg-blue-50 text-blue-700',
    Mess: 'bg-orange-50 text-orange-700',
    Hostel: 'bg-amber-50 text-amber-700',
    Transport: 'bg-cyan-50 text-cyan-700',
    Other: 'bg-slate-100 text-slate-600',
  },
  severity: {
    low: 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold uppercase',
    medium: 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-bold uppercase',
    high: 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[11px] font-bold uppercase',
    critical: 'text-red-600 bg-red-50 px-2 py-0.5 rounded text-[11px] font-bold uppercase',
  },
  status: {
    pending: 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold uppercase',
    'in-progress': 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-bold uppercase',
    resolved: 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold uppercase',
    closed: 'text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold uppercase',
  }
};

export const ICONS = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
  ),
  Raise: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
  ),
  List: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
  ),
  Chatbot: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
  ),
  Notification: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
  )
};
