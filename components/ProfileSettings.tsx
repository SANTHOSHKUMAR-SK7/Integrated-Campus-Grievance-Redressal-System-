
import React, { useState } from 'react';
import { getCurrentUser } from '../store';

const ProfileSettings: React.FC = () => {
  const user = getCurrentUser();
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new
        })
      });

      const data = await response.json();
      if (response.ok) {
        setStatus({ type: 'success', message: 'Password updated successfully' });
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        setStatus({ type: 'error', message: data.message || 'Failed to update password' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Account Security</h2>
        <p className="text-slate-500 font-medium">Manage your institutional credentials and profile settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center">
            <div className="w-20 h-20 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-xl shadow-indigo-100">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <h3 className="font-black text-slate-900">{user.name}</h3>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{user.role}</p>
            <div className="mt-6 pt-6 border-t border-slate-100 text-left space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block">Institutional ID</label>
                <p className="text-sm font-bold text-slate-700">{user.id}</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block">Department</label>
                <p className="text-sm font-bold text-slate-700">{user.department || 'General'}</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block">Email Address</label>
                <p className="text-sm font-bold text-slate-700">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 p-10 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Change Password
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-6">
              {status && (
                <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                  {status.type === 'success' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                  {status.message}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Current Password</label>
                <input 
                  type="password"
                  required
                  value={passwords.current}
                  onChange={e => setPasswords({...passwords, current: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">New Password</label>
                  <input 
                    type="password"
                    required
                    value={passwords.new}
                    onChange={e => setPasswords({...passwords, new: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    value={passwords.confirm}
                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating Security...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
