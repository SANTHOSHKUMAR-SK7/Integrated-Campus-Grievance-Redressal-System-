
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-12 py-8 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <img 
            src="https://mental-orange-t56uiavvis-coyn24mp43.edgeone.app/logo_cropped.png" 
            alt="DAIT Institutional Logo" 
            className="h-16 w-auto" 
          />
          <div className="h-10 w-[1px] bg-slate-200"></div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">DAIT Institutional Redressal</h1>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="px-8 py-3 bg-slate-950 text-white font-black text-xs rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
        >
          Secure Portal Access
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-12 lg:p-24 bg-slate-50/50">
        <div className="text-center space-y-8 max-w-4xl mb-20">
          <div className="bg-indigo-50 inline-block px-4 py-1 rounded-full border border-indigo-100 mb-2">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Integrated Campus Grievance Redressal System (ICGRS)</span>
          </div>
          <h2 className="text-7xl font-black text-slate-900 tracking-tighter leading-none">
            Institutional Oversight & Student Transparency Platform
          </h2>
          <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Enhancing excellence at Dhaanish Ahmed Institute of Technology through an AI-integrated portal for comprehensive concern management and automated administrative routing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-7xl">
          {[
            { role: 'Student Login', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', desc: 'Lodge departmental concerns, track resolution status, and provide feedback.', color: 'bg-indigo-50 text-indigo-600' },
            { role: 'Staff Login', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', desc: 'Manage assigned cases, communicate with students, and update operational progress.', color: 'bg-emerald-50 text-emerald-600' },
            { role: 'Executive Authority', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', desc: 'Monitor institutional metrics, review critical escalations, and provide administrative oversight.', color: 'bg-indigo-950 text-white' },
          ].map((card, i) => (
            <div key={i} className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all text-center space-y-10 flex flex-col items-center group">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${card.color} shadow-lg transition-transform group-hover:scale-110`}>
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d={card.icon} /></svg>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{card.role}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{card.desc}</p>
              </div>
              <button 
                onClick={() => navigate('/login', { state: { role: card.role } })}
                className="w-full py-5 bg-slate-50 text-slate-900 font-black rounded-2xl border border-slate-100 hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest text-[10px]"
              >
                Access {card.role} Portal
              </button>
            </div>
          ))}
        </div>
      </main>

      <footer className="bg-slate-950 py-16 px-12 border-t border-slate-900">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-6 grayscale opacity-50">
             <img src="https://mental-orange-t56uiavvis-coyn24mp43.edgeone.app/logo_cropped.png" alt="Logo" className="h-10 w-auto" />
             <p className="text-slate-500 text-sm font-bold tracking-tight">Dhaanish Ahmed Institute of Technology</p>
           </div>
           <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">© 2025 Institutional Operations | DAIT Academic Oversight</p>
         </div>
      </footer>
    </div>
  );
};

export default Landing;