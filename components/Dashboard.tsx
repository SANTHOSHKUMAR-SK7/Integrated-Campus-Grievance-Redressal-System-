
import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getGrievances, getCurrentUser, subscribeToSession } from '../store';
import { UserRole, Status, Grievance } from '../types';
import { COLORS } from '../constants';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState(getCurrentUser());
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const navigate = useNavigate();
  
  const refresh = async () => {
    const data = await getGrievances();
    setGrievances(data);
  };

  useEffect(() => {
    refresh();
    const cleanup = subscribeToSession(() => {
      setUser(getCurrentUser());
      refresh();
    });
    return cleanup;
  }, []);

  if (!user) return null;

  if (user.role === UserRole.STUDENT) {
    const mine = grievances.filter(g => g.studentId === user.id);
    const stats = {
      total: mine.length,
      pending: mine.filter(g => g.status === Status.PENDING).length,
      progress: mine.filter(g => g.status === Status.IN_PROGRESS).length,
      resolved: mine.filter(g => g.status === Status.RESOLVED).length,
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="Total Filed" value={stats.total} subtext="Institutional record" icon="📄" />
          <StatCard label="Pending" value={stats.pending} subtext="Awaiting review" icon="🕒" color="text-amber-500" />
          <StatCard label="In Progress" value={stats.progress} subtext="Staff handling" icon="📈" color="text-indigo-600" />
          <StatCard label="Resolved" value={stats.resolved} subtext="Verified closed" icon="✅" color="text-emerald-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionCard 
            title="Lodge New Concern" 
            desc="Use our AI-assisted filing system to submit institutional grievances with sentiment tracking."
            btnText="Launch AI Assistant"
            onClick={() => navigate('/chatbot')}
          />
          <ActionCard 
            title="Case History" 
            desc="Track the communication history and resolution progress of your existing reports."
            btnText="Open Tracker"
            variant="outline"
            onClick={() => navigate('/track')}
          />
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-900 tracking-tight">Recent Activity</h3>
            <Link to="/track" className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline">Full Audit &rarr;</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {mine.slice(0, 3).map(g => (
              <div key={g.id} className="px-8 py-6 hover:bg-slate-50 transition-all cursor-pointer" onClick={() => navigate('/manage', { state: { grievanceId: g.id } })}>
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-slate-800">{g.title || 'General Grievance'}</h4>
                  <span className={COLORS.status[g.status]}>{g.status}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                   <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{g.id}</span>
                   <span>•</span>
                   <span className="text-indigo-600">{g.department}</span>
                   <span>•</span>
                   <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                      {(g.conversation || []).length} Messages
                   </span>
                </div>
              </div>
            ))}
            {mine.length === 0 && (
              <div className="p-20 text-center text-slate-400 text-sm font-medium italic">No active cases found.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const worklist = grievances.filter(g => g.assignedToId === user.id || user.role === UserRole.ADMIN);
  
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
         <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Case Manager</h2>
            <p className="text-slate-500 font-medium">Resolving institutional concerns with AI-driven empathy.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Assigned" value={worklist.length} subtext="Active cases" icon="📂" />
        <StatCard label="Unread" value={worklist.filter(g => g.conversation && g.conversation.length > 0 && g.conversation[g.conversation.length - 1].senderRole === UserRole.STUDENT).length} subtext="Student messages" icon="💬" color="text-indigo-600" />
        <StatCard label="Urgent" value={worklist.filter(g => g.sentiment === 'Angry' || g.sentiment === 'Urgent').length} subtext="Critical sentiment" icon="🔥" color="text-red-600" />
        <StatCard label="Resolved" value={worklist.filter(g => g.status === Status.RESOLVED).length} subtext="Case success" icon="✅" color="text-emerald-600" />
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-100">
          <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Active Worklist</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-10 py-5">Case ID</th>
                <th className="px-10 py-5">Summary</th>
                <th className="px-10 py-5">Sentiment</th>
                <th className="px-10 py-5">Identity</th>
                <th className="px-10 py-5">Status</th>
                <th className="px-10 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {worklist.map(g => (
                <tr key={g.id} className="hover:bg-indigo-50/30 transition-all cursor-pointer group" onClick={() => navigate('/manage', { state: { grievanceId: g.id } })}>
                  <td className="px-10 py-6 font-black text-slate-900 text-sm">#{g.id}</td>
                  <td className="px-10 py-6">
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{g.title || g.description}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{g.department}</p>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      g.sentiment === 'Angry' || g.sentiment === 'Urgent' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {g.sentiment || 'Neutral'}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    {g.isAnonymous ? (
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Anonymous</span>
                    ) : (
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">STU-{g.studentId.split('-').pop()}</span>
                    )}
                  </td>
                  <td className="px-10 py-6">
                    <span className={`${COLORS.status[g.status]} scale-90`}>{g.status}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">Open Chat</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subtext, icon, color = 'text-slate-900' }) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
    <div className="flex justify-between items-start">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label} {icon}</p>
    </div>
    <div>
      <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{subtext}</p>
    </div>
  </div>
);

const ActionCard = ({ title, desc, btnText, onClick, variant = 'primary' }) => (
  <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
    <div className="space-y-3">
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
    <button 
      onClick={onClick}
      className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
        variant === 'primary' 
        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200' 
        : 'bg-slate-50 border border-slate-200 text-slate-900 hover:bg-white'
      }`}
    >
      {btnText}
    </button>
  </div>
);

export default Dashboard;
