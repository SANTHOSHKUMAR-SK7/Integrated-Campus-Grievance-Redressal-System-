
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGrievances, getCurrentUser, sendMessage } from '../store';
import { Grievance, Status, Department, ChatType } from '../types';
import { ICONS, COLORS } from '../constants';
import Timeline from './Timeline';

const GrievanceTracker: React.FC = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshData = async () => {
    const all = await getGrievances();
    setGrievances(all);
    if (selectedGrievance) {
      const updated = all.find(g => g.id === selectedGrievance.id);
      if (updated) setSelectedGrievance(updated);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [selectedGrievance?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedGrievance?.conversation]);

  const complaints = useMemo(() => {
    if (!user) return [];
    return grievances.filter(g => g.studentId === user.id).filter(g => {
      const matchSearch = g.id.toLowerCase().includes(search.toLowerCase()) || (g.title || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || g.status === filterStatus;
      const matchCategory = filterCategory === 'all' || g.department === filterCategory;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [user, grievances, search, filterStatus, filterCategory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedGrievance) return;
    const res = await sendMessage(selectedGrievance.id, chatInput);
    if (res) {
      setChatInput('');
      setSelectedGrievance(res);
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Institutional Record</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Audit and interact with your personal grievance pipeline.</p>
          </div>
          <button onClick={() => navigate('/chatbot')} className="flex items-center gap-3 bg-indigo-600 text-white px-7 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
            <ICONS.Raise />
            New Filing
          </button>
        </div>

        {/* Table & Filters (Simplified for space) */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                <tr>
                  <th className="px-10 py-5">Case Reference</th>
                  <th className="px-10 py-5">Summary</th>
                  <th className="px-10 py-5">Status</th>
                  <th className="px-10 py-5">Category</th>
                  <th className="px-10 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-all cursor-pointer group" onClick={() => setSelectedGrievance(g)}>
                    <td className="px-10 py-6 font-black text-slate-900 text-sm">#{g.id}</td>
                    <td className="px-10 py-6 text-sm font-bold text-slate-700">{g.summary || 'Awaiting Analysis'}</td>
                    <td className="px-10 py-6"><span className={COLORS.status[g.status]}>{g.status}</span></td>
                    <td className="px-10 py-6"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{g.department}</span></td>
                    <td className="px-10 py-6 text-right">
                      <button className="bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all">Interact</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RESOLUTION HUB MODAL (Direct Chat) */}
      {selectedGrievance && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl sm:rounded-[40px] w-full max-w-4xl h-[95vh] sm:h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 mt-4 sm:mt-0">
            {/* Header */}
            <div className="px-5 py-4 sm:px-10 sm:py-6 border-b flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xs sm:text-base">Ref</div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Case #{selectedGrievance.id}</h3>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Direct Messaging Channel</p>
                </div>
              </div>
              <button onClick={() => setSelectedGrievance(null)} className="p-2 sm:p-3 bg-slate-50 sm:bg-transparent text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Chat Flow */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-10 space-y-6 sm:space-y-8 bg-slate-50/10 custom-scrollbar">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  <div className="bg-indigo-50/50 border border-indigo-100/50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl mb-8 sm:mb-10">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Original Institutional Complaint</p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 italic leading-relaxed">"{selectedGrievance.description}"</p>
                  </div>

                  <div className="space-y-6 sm:space-y-8">
                    {(selectedGrievance.conversation || []).filter(m => m.type === ChatType.STUDENT_STAFF).map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[90%] sm:max-w-[85%]">
                          <p className={`text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 ${msg.senderId === user.id ? 'text-right' : 'text-left'}`}>
                            {msg.senderId === user.id ? 'You' : 'DAIT Staff Authority'}
                          </p>
                          <div className={`px-5 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-3xl text-sm font-medium shadow-sm border ${msg.senderId === user.id ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' : 'bg-white text-slate-700 border-slate-200 rounded-tl-none'
                            }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef}></div>
                  </div>
                </div>

                <div className="lg:w-80 shrink-0">
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 sticky top-0">
                    <Timeline history={selectedGrievance.history || []} />
                  </div>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="p-4 sm:p-8 bg-white border-t shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-3 sm:gap-4">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Draft your message back to the staff member..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-5 py-4 sm:px-7 sm:py-5 text-sm font-semibold focus:ring-2 focus:ring-indigo-600 outline-none w-full min-w-0"
                />
                <button type="submit" disabled={!chatInput.trim()} className="bg-slate-900 text-white px-6 py-4 sm:px-10 sm:py-5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-30 transition-all shrink-0">Send</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GrievanceTracker;
