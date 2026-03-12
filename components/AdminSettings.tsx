
import React, { useState } from 'react';

const AdminSettings: React.FC = () => {
  const [mode, setMode] = useState(localStorage.getItem('DB_MODE') || 'LOCAL');
  const [url, setUrl] = useState(localStorage.getItem('PROD_DB_URL') || '');
  const [key, setKey] = useState(localStorage.getItem('PROD_DB_KEY') || '');
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem('DB_MODE', mode);
    localStorage.setItem('PROD_DB_URL', url);
    localStorage.setItem('PROD_DB_KEY', key);
    setSaved(true);
    setTimeout(() => {
        setSaved(false);
        window.location.reload();
    }, 1500);
  };

  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">System Infrastructure</h2>
        <p className="text-slate-500 font-medium">Configure the connection between your frontend and MongoDB Atlas.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-10 space-y-10 shadow-sm">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Database Provider Mode</label>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setMode('LOCAL')}
              className={`p-6 rounded-2xl border-2 transition-all text-left space-y-2 ${mode === 'LOCAL' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <h4 className="font-bold text-slate-900">Local Sandbox</h4>
              <p className="text-xs text-slate-500">Uses Browser LocalStorage for testing and prototyping.</p>
            </button>
            <button 
              onClick={() => setMode('PRODUCTION')}
              className={`p-6 rounded-2xl border-2 transition-all text-left space-y-2 ${mode === 'PRODUCTION' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <h4 className="font-bold text-slate-900">Production MongoDB</h4>
              <p className="text-xs text-slate-500">Connects to MongoDB Atlas via Secure REST Data API.</p>
            </button>
          </div>
        </div>

        {mode === 'PRODUCTION' && (
          <div className="space-y-6 pt-6 border-t border-slate-100 animate-in fade-in duration-300">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">API Endpoint URL</label>
              <input 
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://data.mongodb-api.com/app/app-id/endpoint/data/v1/action"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Atlas API Key</label>
              <input 
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        <button 
          onClick={save}
          className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg ${saved ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'}`}
        >
          {saved ? 'Settings Synced & Restarting...' : 'Update Infrastructure Configuration'}
        </button>
      </div>

      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
         <div className="flex gap-4">
            <div className="text-amber-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 mb-1">Deployment Tip</p>
              <p className="text-xs text-amber-700 leading-relaxed">For production use, it is highly recommended to use <strong>Environment Variables</strong> for these keys. This UI is intended for rapid testing and configuration before locking the build.</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AdminSettings;
