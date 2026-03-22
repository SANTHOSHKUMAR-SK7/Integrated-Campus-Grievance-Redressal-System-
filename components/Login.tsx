import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { clearSession, login } from '../store';
import { UserRole } from '../types';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const roleName = location.state?.role || 'Institutional Portal';

  const getExpectedRole = (): UserRole | null => {
    switch (roleName) {
      case 'Student Login':
        return UserRole.STUDENT;
      case 'Staff Login':
        return UserRole.STAFF;
      case 'Executive Authority':
        return UserRole.ADMIN;
      default:
        return null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await login(email, password);
      const expectedRole = getExpectedRole();

      if (user && expectedRole && user.role !== expectedRole) {
        clearSession();
        setError(`This portal is for ${expectedRole.toLowerCase()} accounts only.`);
        return;
      }

      if (user) {
        navigate('/dashboard');
      } else {
        setError('Verification Failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Connection Error: Institutional gateway unreachable.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10 space-y-4">
          <img src="/dait-logo.png" alt="DAIT" className="h-16 w-auto" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Portal</h1>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">DAIT Grievance management</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-200 p-8 space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Sign In</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Accessing: {roleName}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                required
              />
            </div>

            {error && <div className="text-red-500 text-xs font-bold bg-red-50 py-3 rounded-xl border border-red-100 text-center animate-in shake duration-300">{error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-xs tracking-widest uppercase transition-all shadow-lg shadow-slate-200 ${
                isLoading ? 'bg-indigo-400' : 'bg-slate-950 text-white hover:bg-slate-800 active:scale-[0.98]'
              }`}
            >
              {isLoading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          <div className="pt-4 flex justify-center border-t border-slate-50">
            <Link to="/" className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em]">Institutional Home</Link>
          </div>
        </div>

        <p className="mt-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Copyright 2026 DAIT Academic Unit</p>
      </div>
    </div>
  );
};

export default Login;
