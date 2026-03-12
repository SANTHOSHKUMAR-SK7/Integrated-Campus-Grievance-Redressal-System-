
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getGrievances, updateGrievance, getCurrentUser, sendMessage, getUserById, getAllStaff, transferGrievance } from '../store';
import { Grievance, Status, UserRole, Department, User, ChatType } from '../types';
import { COLORS } from '../constants';
import { getStaffAssistance, getGrievanceSummary } from '../services/geminiService';
import { generateGrievanceReport } from '../services/reportService';
import Timeline from './Timeline';
import { FileText, Download, Sparkles } from 'lucide-react';

const ManagementConsole: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [student, setStudent] = useState<User | null>(null);
  const [assignedStaff, setAssignedStaff] = useState<User | null>(null);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ summary: string, actionPoints: string[], toneRecommendation: string } | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferDept, setTransferDept] = useState<Department | ''>('');
  const [transferStaffId, setTransferStaffId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [showSolveModal, setShowSolveModal] = useState(false);
  const [solveDescription, setSolveDescription] = useState('');
  const [activeChatTab, setActiveChatTab] = useState<ChatType>(ChatType.STUDENT_STAFF);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshGrievance = async () => {
    const id = location.state?.grievanceId;
    if (id) {
      const all = await getGrievances();
      const g = all.find(x => x.id === id);
      if (g) {
        setGrievance(g);
        if (!g.isAnonymous) {
          const u = await getUserById(g.studentId);
          setStudent(u);
        }
        if (g.assignedToId) {
          const s = await getUserById(g.assignedToId);
          setAssignedStaff(s);
        }
      }
    }
  };

  useEffect(() => {
    refreshGrievance();
    getAllStaff().then(setStaffList);
    const interval = setInterval(refreshGrievance, 5000);
    return () => clearInterval(interval);
  }, [location.state]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [grievance?.conversation]);

  const handleFetchSummary = async () => {
    if (!grievance) return;
    setIsSummaryLoading(true);
    const summary = await getGrievanceSummary(grievance.id, grievance);
    setAiSummary(summary);
    setIsSummaryLoading(false);
  };

  const handleDownloadReport = () => {
    if (!grievance) return;
    generateGrievanceReport(grievance, student, assignedStaff);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !grievance) return;
    const res = await sendMessage(grievance.id, chatInput, activeChatTab, activeChatTab === ChatType.STAFF_STAFF ? selectedRecipientId : undefined);
    if (res) {
      setGrievance(res);
      setChatInput('');
    }
  };

  const handleUpdateStatus = async (status: Status) => {
    if (!grievance || !currentUser) return;
    const now = Date.now();
    const updated = {
      ...grievance,
      status,
      lastStatusChange: now,
      history: [...grievance.history, { status, timestamp: now, userId: currentUser.id, remark: `Status updated to ${status}` }]
    };
    await updateGrievance(updated);
    setGrievance(updated);
  };

  const handleResolve = async () => {
    if (!grievance || !currentUser || !solveDescription.trim()) return;
    const now = Date.now();
    const updated = {
      ...grievance,
      status: Status.RESOLVED,
      lastStatusChange: now,
      history: [...grievance.history, { status: Status.RESOLVED, timestamp: now, userId: currentUser.id, remark: `Resolved: ${solveDescription}` }],
      remarks: [...(grievance.remarks || []), solveDescription]
    };
    await updateGrievance(updated);
    setGrievance(updated);
    setShowSolveModal(false);
    setSolveDescription('');
  };

  const handleTransfer = async () => {
    if (!grievance || !transferDept || !transferStaffId || !transferReason) return;
    const res = await transferGrievance(grievance.id, transferDept as Department, transferStaffId, transferReason);
    if (res) {
      setGrievance(res);
      setShowTransfer(false);
      if (currentUser?.role === UserRole.STAFF && res.assignedToId !== currentUser.id) {
        navigate('/dashboard');
      }
    }
  };

  if (!grievance || !currentUser) return <div className="p-20 text-center text-slate-400 font-bold">Please select a case from your dashboard.</div>;

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-160px)] animate-in fade-in duration-500 overflow-hidden">
      {/* SIDEBAR: Case Context */}
      <div className="xl:w-[380px] flex flex-col gap-5 overflow-y-auto custom-scrollbar pr-1">

        {/* Core Case Card */}
        <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-900 text-lg tracking-tight">#{grievance.id}</h3>
            <span className={`${COLORS.status[grievance.status]} px-3 py-1 rounded-lg text-[10px] font-bold uppercase`}>{grievance.status}</span>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sentiment</span>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${grievance.sentiment === 'Angry' || grievance.sentiment === 'Urgent' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`}></div>
                <span className="text-xs font-bold text-slate-700">{grievance.sentiment || 'Evaluating'}</span>
              </div>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Domain</span>
              <span className="text-xs font-bold text-slate-700">{grievance.department}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleUpdateStatus(Status.IN_PROGRESS)}
                disabled={grievance.status !== Status.PENDING}
                className={`py-3.5 font-bold text-[11px] rounded-2xl uppercase transition-all ${grievance.status === Status.PENDING ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-95' : 'bg-slate-100 text-slate-400 opacity-70 cursor-not-allowed'}`}
              >
                {grievance.status !== Status.PENDING ? 'Accepted Case' : 'Accept Case'}
              </button>
              <button onClick={() => setShowSolveModal(true)} className="py-3.5 bg-emerald-600 text-white font-bold text-[11px] rounded-2xl uppercase hover:bg-emerald-700 transition-all shadow-lg active:scale-95">Resolve</button>
            </div>
            {grievance.status === Status.RESOLVED && (
              <button
                onClick={handleDownloadReport}
                className="w-full py-3.5 bg-slate-900 text-white font-bold text-[11px] rounded-2xl uppercase hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
            )}
            <button onClick={() => setShowTransfer(true)} className="w-full py-3.5 bg-slate-100 text-slate-600 font-bold text-[11px] rounded-2xl uppercase hover:bg-slate-200 transition-all active:scale-95">Transfer Assignment</button>
          </div>
        </div>

        {/* AI Summary Card */}
        <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Case Summary</h4>
            {!aiSummary && !isSummaryLoading && (
              <button onClick={handleFetchSummary} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </button>
            )}
          </div>

          {isSummaryLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded w-full"></div>
              <div className="h-4 bg-slate-100 rounded w-5/6"></div>
            </div>
          ) : aiSummary ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{aiSummary.summary}</p>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Action Points</p>
                <ul className="space-y-1">
                  {aiSummary.actionPoints.map((point, i) => (
                    <li key={i} className="text-[10px] text-slate-500 flex gap-2">
                      <span className="text-indigo-400">•</span> {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Tone Advice</p>
                <p className="text-[10px] text-indigo-700 font-bold italic">{aiSummary.toneRecommendation}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-[10px] font-bold text-slate-300">Generate AI summary for better insights</p>
            </div>
          )}
        </div>

        {/* Identity & Verification */}
        <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Handler</h4>
          {assignedStaff ? (
            <div className="flex items-center gap-4 p-2 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
              <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm">
                {assignedStaff.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{assignedStaff.name}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{assignedStaff.department}</p>
              </div>
              {assignedStaff.id === currentUser.id && (
                <span className="bg-emerald-100 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">You</span>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-xs font-bold text-slate-300 bg-slate-50 rounded-2xl border border-dashed border-slate-200 mb-6">Unassigned</div>
          )}

          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Student Reporter</h4>
          {grievance.isAnonymous ? (
            <div className="flex items-center gap-4 p-2 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
              <div className="w-14 h-14 bg-white border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-300 shadow-sm">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 mb-0.5">Anonymous Reporter</p>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Identity Protected</p>
              </div>
            </div>
          ) : student ? (
            <div className="flex items-center gap-4 p-2">
              <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xl shadow-indigo-100">
                {student.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate leading-none mb-1">{student.name}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tight">{student.email}</p>
                <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-widest">Verified Profile</p>
              </div>
            </div>
          ) : <div className="p-4 text-center text-xs font-bold text-slate-300 animate-pulse">Loading identity...</div>}
        </div>

        {/* AI MEDIATOR TOOL: Staff Support */}
        <div className="bg-indigo-900 rounded-[32px] p-7 text-white shadow-xl shadow-indigo-900/10 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center font-black text-[10px]">AI</div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em]">Mediator Advice</p>
            </div>
            {isAiLoading && <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>}
          </div>

          <div className="min-h-[80px]">
            <p className="text-[12px] leading-relaxed text-indigo-100/80 font-medium italic">
              {aiResponse || 'Consult the mediator for resolution strategies and student communication drafts.'}
            </p>
          </div>

          <button
            onClick={async () => {
              if (!grievance) return;
              setIsAiLoading(true);
              try {
                const res = await getStaffAssistance(grievance);
                setAiResponse(res || 'Mediator busy. Try again.');
              } catch (e) {
                setAiResponse('AI Gateway Timeout.');
              } finally {
                setIsAiLoading(false);
              }
            }}
            disabled={isAiLoading}
            className="w-full py-3.5 bg-white text-indigo-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-indigo-950/20"
          >
            Get Expert Support
          </button>
        </div>

        {/* Timeline Visualization */}
        <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
          <Timeline history={grievance.history || []} />
        </div>
      </div>

      {/* CHAT HUB: Direct Communication */}
      <div className="flex-1 flex flex-col bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-0">
        <div className="px-8 py-5 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setActiveChatTab(ChatType.STUDENT_STAFF)}
              className={`relative py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeChatTab === ChatType.STUDENT_STAFF ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Student Channel
              {activeChatTab === ChatType.STUDENT_STAFF && <div className="absolute -bottom-5 left-0 right-0 h-1 bg-indigo-600 rounded-full"></div>}
            </button>
            <button
              onClick={() => setActiveChatTab(ChatType.STAFF_STAFF)}
              className={`relative py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeChatTab === ChatType.STAFF_STAFF ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Internal Staff Chat
              {activeChatTab === ChatType.STAFF_STAFF && <div className="absolute -bottom-5 left-0 right-0 h-1 bg-indigo-600 rounded-full"></div>}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${activeChatTab === ChatType.STUDENT_STAFF ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {activeChatTab === ChatType.STUDENT_STAFF ? 'External' : 'Internal'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/5 custom-scrollbar">
          {/* Recipient Selector for Internal Chat */}
          {activeChatTab === ChatType.STAFF_STAFF && (
            <div className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 mb-6">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">To:</span>
              <select
                value={selectedRecipientId}
                onChange={e => setSelectedRecipientId(e.target.value)}
                className="flex-1 bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Staff (Public Note)</option>
                {staffList.filter(s => s.id !== currentUser.id).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.department})</option>
                ))}
              </select>
            </div>
          )}

          {/* Main Concern Anchor */}
          <div className="flex justify-center mb-10">
            <div className="max-w-[85%] bg-white border border-slate-100 p-8 rounded-[32px] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Institutional Complaint Anchor</p>
              <p className="text-[15px] font-semibold text-slate-800 leading-relaxed italic">"{grievance.description}"</p>
            </div>
          </div>

          {(grievance.conversation || []).filter(m => {
            if (m.type !== activeChatTab) return false;
            if (activeChatTab === ChatType.STAFF_STAFF && m.recipientId) {
              // Show if sender, recipient, or Admin
              return m.senderId === currentUser.id || m.recipientId === currentUser.id || currentUser.role === UserRole.ADMIN;
            }
            return true;
          }).map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%] space-y-1.5">
                <div className={`flex items-center gap-2 px-1 ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {msg.senderId === currentUser.id
                      ? 'You'
                      : (activeChatTab === ChatType.STUDENT_STAFF
                        ? (grievance.isAnonymous ? 'Anonymous Student' : (msg.senderName || 'Student'))
                        : (msg.senderName || 'Staff Member'))}
                  </span>
                </div>
                <div className={`px-6 py-4 rounded-3xl text-[14px] font-medium shadow-sm border ${msg.senderId === currentUser.id
                    ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none'
                    : 'bg-white text-slate-700 border-slate-200 rounded-tl-none'
                  }`}>
                  {activeChatTab === ChatType.STAFF_STAFF && msg.recipientId && (
                    <div className="mb-2 pb-2 border-b border-white/10 flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase opacity-60">To:</span>
                      <span className="text-[10px] font-black uppercase tracking-tight">{msg.recipientName || 'Staff'}</span>
                    </div>
                  )}
                  {msg.content}
                  <div className={`text-[10px] mt-2 opacity-40 ${msg.senderId === currentUser.id ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div className="p-7 bg-white border-t">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={activeChatTab === ChatType.STUDENT_STAFF ? "Draft message to student..." : "Internal note for other staff..."}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-7 py-5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-bold text-xs uppercase hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
            >
              {activeChatTab === ChatType.STUDENT_STAFF ? 'Dispatch' : 'Post Note'}
            </button>
          </form>
        </div>
      </div>

      {/* TRANSFER MODAL */}
      {showTransfer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-indigo-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-xl p-12 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Reassign Grievance</h3>
            <p className="text-sm font-medium text-slate-500 mb-10">Shift ownership to a specialized institutional division.</p>

            <div className="space-y-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Department</label>
                  <select value={transferDept} onChange={e => setTransferDept(e.target.value as Department)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold">
                    <option value="">Select Domain</option>
                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Staff Member</label>
                  <select value={transferStaffId} onChange={e => setTransferStaffId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold">
                    <option value="">Select Individual</option>
                    {staffList.filter(s => !transferDept || s.department === transferDept).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea value={transferReason} onChange={e => setTransferReason(e.target.value)} placeholder="Reason for transfer..." className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-semibold h-32 resize-none outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="flex gap-4">
                <button onClick={() => setShowTransfer(false)} className="flex-1 py-4.5 bg-slate-50 text-slate-500 font-bold rounded-2xl text-[11px] uppercase">Cancel</button>
                <button onClick={handleTransfer} disabled={!transferDept || !transferStaffId || !transferReason} className="flex-1 py-4.5 bg-indigo-600 text-white font-bold rounded-2xl text-[11px] uppercase">Transfer Now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOLVE MODAL */}
      {showSolveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Resolve Grievance</h3>
            <p className="text-xs font-medium text-slate-500 mb-6">Please provide a brief description of how this case was solved.</p>
            <textarea
              value={solveDescription}
              onChange={e => setSolveDescription(e.target.value)}
              placeholder="Case resolution details..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold h-32 resize-none outline-none focus:ring-2 focus:ring-emerald-500 mb-6 custom-scrollbar"
            />
            <div className="flex gap-4">
              <button onClick={() => { setShowSolveModal(false); setSolveDescription(''); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs uppercase hover:bg-slate-200 transition-all">Cancel</button>
              <button
                onClick={handleResolve}
                disabled={!solveDescription.trim()}
                className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                Submit Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementConsole;
