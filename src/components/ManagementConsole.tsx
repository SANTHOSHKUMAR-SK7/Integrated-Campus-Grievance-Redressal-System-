
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getGrievances, getGrievanceById, updateGrievance, getCurrentUser, sendMessage, getUserById, getAllStaff, transferGrievance } from '../store';
import { Grievance, Status, UserRole, Department, User, ChatType } from '../types';
import { COLORS } from '../constants';
import { getGrievanceSummary } from '../services/geminiService';
import { generateGrievanceReport } from '../services/reportService';
import Timeline from './Timeline';
import AttachmentViewer from './AttachmentViewer';
import { Download, Sparkles } from 'lucide-react';
import { getEscalationState } from '../utils/escalationUtils';

const ManagementConsole: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [availableGrievances, setAvailableGrievances] = useState<Grievance[]>([]);
  const [student, setStudent] = useState<User | null>(null);
  const [assignedStaff, setAssignedStaff] = useState<User | null>(null);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [aiSummary, setAiSummary] = useState<{ summary: string, actionPoints: string[], toneRecommendation: string } | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferDept, setTransferDept] = useState<Department | ''>('');
  const [transferStaffId, setTransferStaffId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferError, setTransferError] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [showSolveModal, setShowSolveModal] = useState(false);
  const [solveDescription, setSolveDescription] = useState('');
  const [activeChatTab, setActiveChatTab] = useState<ChatType>(ChatType.STUDENT_STAFF);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshGrievance = async () => {
    const id = location.state?.grievanceId || new URLSearchParams(location.search).get('grievanceId');
    const all = await getGrievances();
    setAvailableGrievances(all);

    if (!id) {
      setGrievance(null);
      setStudent(null);
      setAssignedStaff(null);
      return;
    }

    const g = await getGrievanceById(id);
    if (!g) {
      setGrievance(null);
      setStudent(null);
      setAssignedStaff(null);
      return;
    }

    setGrievance(g);
    if (!g.isAnonymous) {
      const u = await getUserById(g.studentId);
      setStudent(u);
    } else {
      setStudent(null);
    }
    if (g.assignedToId) {
      const s = await getUserById(g.assignedToId);
      setAssignedStaff(s);
    } else {
      setAssignedStaff(null);
    }
  };

  useEffect(() => {
    refreshGrievance();
    getAllStaff().then(setStaffList);
  }, [location.pathname, location.search, location.state]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [grievance?.conversation]);

  useEffect(() => {
    setAiSummary(null);
    setIsSummaryLoading(false);
    setSummaryError('');
  }, [grievance?.id]);

  const handleFetchSummary = async () => {
    if (!grievance) return;
    setIsSummaryLoading(true);
    setSummaryError('');
    try {
      const summary = await getGrievanceSummary(grievance.id, grievance);
      if (!summary) {
        setSummaryError('Unable to generate AI summary for this grievance right now.');
        return;
      }
      setAiSummary(summary);
    } catch (error) {
      setSummaryError('Unable to generate AI summary for this grievance right now.');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!grievance) return;
    generateGrievanceReport(grievance, student, assignedStaff);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !grievance) return;
    try {
      const res = await sendMessage(grievance.id, chatInput, activeChatTab, activeChatTab === ChatType.STAFF_STAFF ? selectedRecipientId : undefined);
      setGrievance(res);
      setChatInput('');
      setChatError('');
    } catch (error: any) {
      setChatError(error?.message || 'Unable to send the message right now.');
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
    try {
      await updateGrievance(updated);
      setGrievance(updated);
      setStatusError('');
    } catch (error: any) {
      setStatusError(error?.message || 'Unable to update case status right now.');
    }
  };

  const handleResolve = async () => {
    if (!grievance || !currentUser || !solveDescription.trim()) return;
    if (grievance.status === Status.RESOLVED || grievance.status === Status.CLOSED) return;
    const now = Date.now();
    const updated = {
      ...grievance,
      status: Status.RESOLVED,
      lastStatusChange: now,
      history: [...grievance.history, { status: Status.RESOLVED, timestamp: now, userId: currentUser.id, remark: `Resolved: ${solveDescription}` }],
      remarks: [...(grievance.remarks || []), solveDescription]
    };
    try {
      await updateGrievance(updated);
      setGrievance(updated);
      setShowSolveModal(false);
      setSolveDescription('');
      setStatusError('');
    } catch (error: any) {
      setStatusError(error?.message || 'Unable to resolve this case right now.');
    }
  };

  const handleTransfer = async () => {
    if (!grievance) return;

    if (!transferDept) {
      setTransferError('Please choose the target department.');
      return;
    }

    if (!transferStaffId) {
      setTransferError('Please choose the staff member who should receive this grievance.');
      return;
    }

    if (!transferReason.trim()) {
      setTransferError('Please enter the reason for this transfer.');
      return;
    }

    if (transferStaffId === grievance.assignedToId) {
      setTransferError('This grievance is already assigned to the selected staff member.');
      return;
    }

    try {
      setIsTransferring(true);
      const res = await transferGrievance(grievance.id, transferDept as Department, transferStaffId, transferReason);
      setGrievance(res);
      setTransferError('');
      setShowTransfer(false);
      setTransferDept('');
      setTransferStaffId('');
      setTransferReason('');
      if (currentUser?.role === UserRole.STAFF && res.assignedToId !== currentUser.id) {
        navigate('/dashboard');
      }
    } catch (error: any) {
      setTransferError(error?.message || 'Unable to transfer grievance right now.');
    } finally {
      setIsTransferring(false);
    }
  };

  if (!currentUser) return null;

  if (!grievance) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Direct Worklist</h2>
          <p className="text-slate-500 font-medium">Choose a grievance from your accessible staff worklist.</p>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900 tracking-tight">Available Cases</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {availableGrievances.length} visible
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {availableGrievances.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/manage?grievanceId=${encodeURIComponent(item.id)}`)}
                className="w-full px-8 py-6 text-left hover:bg-slate-50 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">#{item.id}</p>
                    <p className="text-sm font-bold text-slate-700 mt-1 line-clamp-1">{item.title || item.description}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                      {item.department} • Assigned to you
                    </p>
                  </div>
                  <span className={COLORS.status[item.status]}>{item.status}</span>
                </div>
              </button>
            ))}
            {availableGrievances.length === 0 && (
              <div className="p-16 text-center text-slate-400 text-sm font-medium italic">
                No accessible grievances found right now.
              </div>
            )}
          </div>
        </div>
      </div>

    );
  }

  const internalRecipients = staffList.filter((staffMember) => {
    if (staffMember.id === currentUser.id) return false;
    return staffMember.id === grievance.assignedToId;
  });

  const transferCandidates = staffList.filter((staffMember) => {
    if (!transferDept) return false;
    if (staffMember.department !== transferDept) return false;
    return staffMember.id !== grievance.assignedToId;
  });
  const escalationState = getEscalationState(grievance);
  const escalationTone = escalationState.stage === 'escalation-due'
    ? 'border-red-100 bg-red-50 text-red-700'
    : 'border-amber-100 bg-amber-50 text-amber-700';

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-160px)] animate-in fade-in duration-500 overflow-hidden">
      {/* SIDEBAR: Case Context */}
      <div className="xl:w-[380px] flex flex-col gap-5 overflow-y-auto custom-scrollbar pr-1">

        {/* Core Case Card */}
        <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-900 text-lg tracking-tight">#{grievance.id}</h3>
            <div className="flex flex-wrap justify-end gap-2">
              {escalationState.isOverdue && (
                <span className={`rounded-lg border px-3 py-1 text-[10px] font-bold uppercase ${escalationTone}`}>
                  {escalationState.stage === 'escalation-due' ? 'Escalated' : 'Reminder Due'}
                </span>
              )}
              <span className={`${COLORS.status[grievance.status]} px-3 py-1 rounded-lg text-[10px] font-bold uppercase`}>{grievance.status}</span>
            </div>
          </div>

          {escalationState.isOverdue && (
            <div className={`mb-6 rounded-2xl border p-4 ${escalationTone}`}>
              <p className="text-[10px] font-black uppercase tracking-widest">
                {escalationState.stage === 'escalation-due' ? 'Admin Escalation Active' : 'Staff Reminder Active'}
              </p>
              <p className="mt-2 text-xs font-bold leading-relaxed">
                No staff action has been recorded for {escalationState.inactiveHours} hours. Update, resolve, or transfer this case to clear the delay window.
              </p>
            </div>
          )}

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
              {grievance.status === Status.RESOLVED ? (
                <button
                  onClick={() => handleUpdateStatus(Status.CLOSED)}
                  className="py-3.5 bg-slate-900 text-white font-bold text-[11px] rounded-2xl uppercase hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                  Close Case
                </button>
              ) : (
                <button
                  onClick={() => setShowSolveModal(true)}
                  disabled={grievance.status === Status.CLOSED}
                  className={`py-3.5 font-bold text-[11px] rounded-2xl uppercase transition-all shadow-lg active:scale-95 ${
                    grievance.status === Status.CLOSED
                      ? 'bg-slate-100 text-slate-400 opacity-70 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  Resolve
                </button>
              )}
            </div>
            {statusError && (
              <p className="text-xs font-bold text-red-600">{statusError}</p>
            )}
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
        <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm relative shrink-0 min-h-[240px]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Case Summary</h4>
              <p className="mt-2 text-[11px] font-medium text-slate-500">
                Generate a quick case summary, action points, and tone guidance for this grievance.
              </p>
            </div>
            <button
              type="button"
              onClick={handleFetchSummary}
              disabled={isSummaryLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 transition-all hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {isSummaryLoading ? 'Generating...' : aiSummary ? 'Refresh' : 'Generate'}
            </button>
          </div>

          {isSummaryLoading ? (
            <div className="space-y-3 animate-pulse min-h-[140px]">
              <div className="h-4 bg-slate-100 rounded w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded w-full"></div>
              <div className="h-4 bg-slate-100 rounded w-5/6"></div>
            </div>
          ) : summaryError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-xs font-bold text-red-600">{summaryError}</p>
            </div>
          ) : aiSummary ? (
            <div className="space-y-4 min-h-[140px]">
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
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-center min-h-[140px] flex flex-col items-center justify-center">
              <p className="text-[11px] font-bold text-slate-500">No AI summary generated yet.</p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                Click the Generate button to see the result here.
              </p>
            </div>
          )}
        </div>

        {/* Attachments Viewer */}
        <AttachmentViewer attachments={grievance.attachments as any} grievanceId={grievance.id} />

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

        {/* Timeline Visualization */}
        <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case Lifecycle Timeline</h4>
              <p className="text-[11px] text-slate-500 mt-2">Tap the button to open the timeline in a focused popup.</p>
            </div>
            <button
              onClick={() => setShowTimelineModal(true)}
              className="w-full rounded-3xl bg-indigo-600 px-5 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white transition hover:bg-indigo-700"
            >
              Open Timeline
            </button>
          </div>
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
                {internalRecipients.map(s => (
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
              onChange={e => {
                setChatInput(e.target.value);
                if (chatError) setChatError('');
              }}
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
          {chatError && (
            <p className="mt-3 text-xs font-bold text-red-600">{chatError}</p>
          )}
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
                  <select
                    value={transferDept}
                    onChange={e => {
                      setTransferDept(e.target.value as Department);
                      setTransferStaffId('');
                      if (transferError) setTransferError('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold"
                  >
                    <option value="">Select Domain</option>
                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Staff Member</label>
                  <select
                    value={transferStaffId}
                    onChange={e => { setTransferStaffId(e.target.value); if (transferError) setTransferError(''); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold"
                    disabled={!transferDept || transferCandidates.length === 0}
                  >
                    <option value="">Select Individual</option>
                    {transferCandidates.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {transferDept && transferCandidates.length === 0 && (
                    <p className="text-[11px] font-bold text-amber-600">
                      No other staff member is available in this department.
                    </p>
                  )}
                </div>
              </div>
              <textarea value={transferReason} onChange={e => { setTransferReason(e.target.value); if (transferError) setTransferError(''); }} placeholder="Reason for transfer..." className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-semibold h-32 resize-none outline-none focus:ring-2 focus:ring-indigo-500" />
              {transferError && (
                <p className="text-xs font-bold text-red-600">{transferError}</p>
              )}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransfer(false);
                    setTransferError('');
                    setTransferDept('');
                    setTransferStaffId('');
                    setTransferReason('');
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl text-xs uppercase hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransfer}
                  disabled={isTransferring}
                  className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl text-xs uppercase hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTransferring ? 'Transferring...' : 'Transfer Now'}
                </button>
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

      {grievance && showTimelineModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-indigo-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-xl max-h-[calc(100vh-180px)] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-10 py-8 border-b border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.32em] text-indigo-600">Case Lifecycle Timeline</p>
                  <h2 id="timeline-modal-title" className="mt-2 text-2xl font-black text-slate-900">Detailed Timeline</h2>
                  <p className="mt-2 text-sm text-slate-500">Track the full case history with actions, transfers, and status updates.</p>
                </div>
                <button
                  onClick={() => setShowTimelineModal(false)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close timeline"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-10">
              <Timeline history={grievance.history || []} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementConsole;
