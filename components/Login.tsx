
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { login } from '../store';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const roleName = location.state?.role || 'Institutional Portal';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(email, password);
      if (success) {
        // We use navigate because store.ts already broadcasted the session update
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
           <img src="https://mental-orange-t56uiavvis-coyn24mp43.edgeone.app/logo_cropped.png" alt="DAIT" className="h-16 w-auto" />
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
                 placeholder="e.g. sk@dait.com"
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
                 placeholder="••••••••"
                 className="w-full bg-[#F9FAFB] border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                 required
               />
             </div>

             <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/50">
               <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Demo Credentials</p>
               <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                 <div>Student: <span className="text-slate-900">sk@dait.com</span></div>
                 <div>Staff: <span className="text-slate-900">tech@dait.com</span></div>
                 <div>Admin: <span className="text-slate-900">admin@dait.com</span></div>
                 <div>Pass: <span className="text-slate-900">password123</span></div>
               </div>
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
        
        <p className="mt-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">© 2025 DAIT Academic Unit</p>
      </div>
    </div>
  );
};

export default Login;
