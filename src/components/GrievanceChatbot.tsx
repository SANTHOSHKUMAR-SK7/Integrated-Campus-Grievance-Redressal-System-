import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeGrievanceState } from '../services/geminiService';
import { ChatMessage, Grievance, Status, Department, Severity } from '../types';
import { saveGrievance, getCurrentUser } from '../store';
import FeedbackToast from './FeedbackToast';

type ChatState = 'IDLE' | 'COLLECTING' | 'CONFIRM_DEPARTMENT' | 'REVIEW' | 'DONE';

type GrievanceAnalysis = {
  isDetailedEnough: boolean;
  followUpQuestion?: string;
  summary?: string;
  department?: string;
  severity?: string;
  sentiment?: string;
  initialStatus?: string;
  fingerprint?: string;
};

const DEPARTMENT_OPTIONS: Array<{ value: Department; label: string; aliases: string[] }> = [
  { value: Department.ACADEMIC, label: 'Academic', aliases: ['3', 'academic', 'academics'] },
  { value: Department.MESS, label: 'Mess', aliases: ['2', 'mess', 'food', 'canteen'] },
  { value: Department.HOSTEL, label: 'Hostel', aliases: ['1', 'hostel'] },
  { value: Department.TECHNICAL, label: 'Technical', aliases: ['4', 'technical', 'tech', 'it', 'wifi', 'portal'] },
  { value: Department.INFRASTRUCTURE, label: 'Infrastructure', aliases: ['5', 'infrastructure', 'building', 'electrical'] },
  { value: Department.ADMINISTRATIVE, label: 'Administrative', aliases: ['6', 'administrative', 'administration', 'office'] },
  { value: Department.TRANSPORT, label: 'Transport', aliases: ['7', 'transport', 'bus'] },
  { value: Department.OTHER, label: 'Other', aliases: ['8', 'other'] },
];

const DEPARTMENT_OPTIONS_TEXT = DEPARTMENT_OPTIONS.map((option, index) => `${index + 1}. ${option.label}`).join('\n');

const GrievanceChatbot: React.FC = () => {
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const [state, setState] = useState<ChatState>('IDLE');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Identity verified. Greetings, ${currentUser?.name}. I am the AI Redressal Assistant. Briefly state the institutional concern you wish to report.` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [analysis, setAnalysis] = useState<GrievanceAnalysis | null>(null);
  const [confirmedDepartment, setConfirmedDepartment] = useState<Department | null>(null);
  const [complaintInputs, setComplaintInputs] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<any>(null);
  const [submittedGrievance, setSubmittedGrievance] = useState<{ id: string; department: Department; status: Status } | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, isTyping]);

  useEffect(() => {
    const handleReset = () => {
      setState('IDLE');
      setIsAnonymous(false);
      setMessages([
        { role: 'assistant', content: `Identity verified. Greetings, ${currentUser?.name}. I am the AI Redressal Assistant. Briefly state the institutional concern you wish to report.` }
      ]);
      setInput('');
      setAnalysis(null);
      setConfirmedDepartment(null);
      setComplaintInputs([]);
      setAttachment(null);
      setSubmittedGrievance(null);
    };

    window.addEventListener('reset-grievance-chat', handleReset);
    return () => window.removeEventListener('reset-grievance-chat', handleReset);
  }, [currentUser]);

  const addBotMessage = (content: string) => {
    setMessages((prev) => [...prev, { role: 'assistant', content }]);
  };

  const resetConversation = () => {
    setState('IDLE');
    setAnalysis(null);
    setConfirmedDepartment(null);
    setComplaintInputs([]);
    setAttachment(null);
    setSubmittedGrievance(null);
    setMessages([
      { role: 'assistant', content: `Identity verified. Greetings, ${currentUser?.name}. I am the AI Redressal Assistant. Briefly state the institutional concern you wish to report.` }
    ]);
  };

  const normalizeDepartment = (value?: string): Department => {
    const normalized = (value || '').trim().toLowerCase();
    const departmentMap: Record<string, Department> = {
      technical: Department.TECHNICAL,
      infrastructure: Department.INFRASTRUCTURE,
      academic: Department.ACADEMIC,
      administrative: Department.ADMINISTRATIVE,
      mess: Department.MESS,
      hostel: Department.HOSTEL,
      transport: Department.TRANSPORT,
      other: Department.OTHER,
    };
    return departmentMap[normalized] || Department.OTHER;
  };

  const normalizeSeverity = (value?: string): Severity => {
    const normalized = (value || '').trim().toLowerCase();
    const severityMap: Record<string, Severity> = {
      low: Severity.LOW,
      medium: Severity.MEDIUM,
      high: Severity.HIGH,
      critical: Severity.CRITICAL,
    };
    return severityMap[normalized] || Severity.MEDIUM;
  };

  const normalizeStatus = (value?: string): Status => {
    const normalized = (value || '').trim().toLowerCase();
    const statusMap: Record<string, Status> = {
      pending: Status.PENDING,
      'in-progress': Status.IN_PROGRESS,
      resolved: Status.RESOLVED,
      closed: Status.CLOSED,
    };
    return statusMap[normalized] || Status.PENDING;
  };

  const normalizeSentiment = (value?: string): Grievance['sentiment'] => {
    const normalized = (value || '').trim().toLowerCase();
    const sentimentMap: Record<string, NonNullable<Grievance['sentiment']>> = {
      positive: 'Positive',
      neutral: 'Neutral',
      frustrated: 'Frustrated',
      angry: 'Angry',
      urgent: 'Urgent',
    };
    return sentimentMap[normalized] || 'Neutral';
  };

  const isDepartmentUnclear = (result: GrievanceAnalysis | null) => {
    if (!result) return true;
    const normalizedDepartment = normalizeDepartment(result.department);
    return normalizedDepartment === Department.OTHER || /related department|which department/i.test(result.followUpQuestion || '');
  };

  const buildDepartmentConfirmationMessage = (result: GrievanceAnalysis, department: Department) => {
    return (
      `Data extraction complete.\n\n` +
      `Detected tone: ${result.sentiment}\n` +
      `Summary: ${result.summary}\n` +
      `Detected department: ${department}\n` +
      `Impact: ${String(result.severity || '').toUpperCase()}\n` +
      `Proposed status: ${result.initialStatus}\n\n` +
      `Please review the department below.\n` +
      `Use the department chips to change it if needed.\n` +
      `Then click Confirm Filing.`
    );
  };

  const buildMissingDepartmentMessage = () => {
    return (
      `Department is not clearly mentioned in the complaint. Please confirm the department.\n\n` +
      `Choose the correct department from the options below.`
    );
  };

  const buildPostDepartmentPrompt = (department: Department) => {
    return (
      `Department confirmed as ${department}.\n\n` +
      `Please add a little more detail about the issue, such as when it started, where it happened, or how it is affecting you.`
    );
  };

  const buildDetailOnlyFollowUp = (followUpQuestion?: string) => {
    const cleanedMessage = String(followUpQuestion || '')
      .replace(/Which department is related\?[\s\S]*$/i, '')
      .replace(/Please provide the related department\.?/gi, '')
      .replace(/related department/gi, 'issue details')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleanedMessage || 'Please add a little more detail about the issue, such as when it started, where it happened, or how it is affecting you.';
  };

  const handleDepartmentSelection = async (selectedDepartment: Department, chatHistory: ChatMessage[]) => {
    setConfirmedDepartment(selectedDepartment);

    if (analysis?.isDetailedEnough) {
      setState('REVIEW');
      addBotMessage(buildDepartmentConfirmationMessage(analysis, selectedDepartment));
      return;
    }

    setState('COLLECTING');
    addBotMessage(buildPostDepartmentPrompt(selectedDepartment));
  };

  const handleSubmission = async (userMessage: string, chatHistory: ChatMessage[]) => {
    setIsTyping(true);
    try {
      if (state === 'IDLE' || state === 'COLLECTING') {
        const result = await analyzeGrievanceState(userMessage, chatHistory);
        setAnalysis(result);

        if (!result.isDetailedEnough) {
          if (!confirmedDepartment && isDepartmentUnclear(result)) {
            setState('CONFIRM_DEPARTMENT');
            addBotMessage(buildMissingDepartmentMessage());
          } else {
            setState('COLLECTING');
            addBotMessage(
              confirmedDepartment
                ? buildDetailOnlyFollowUp(result.followUpQuestion)
                : (result.followUpQuestion || 'Institutional protocols require more specific details. Please describe the issue clearly and include any relevant department or context.')
            );
          }
        } else {
          const departmentForReview = confirmedDepartment || normalizeDepartment(result.department);
          setState('REVIEW');
          addBotMessage(buildDepartmentConfirmationMessage(result, departmentForReview));
        }
      } else if (state === 'REVIEW') {
        const lowerMessage = userMessage.toLowerCase().trim();

        if (/confirm|confirmed|yes|correct|ok|submit|proceed|continue|finalize|done/i.test(lowerMessage)) {
          await finalizeGrievance();
        } else if (/cancel|stop|abort|quit|nevermind/i.test(lowerMessage)) {
          setState('IDLE');
          setAnalysis(null);
          setConfirmedDepartment(null);
          addBotMessage('Conversation cancelled. You can start a new grievance anytime.');
        } else if (/edit|change|modify|back/i.test(lowerMessage)) {
          setState('COLLECTING');
          addBotMessage('Let\'s revise your grievance. Please provide more details or clarify your concern.');
        } else if (/restart|start over|new/i.test(lowerMessage)) {
          resetConversation();
        } else {
          addBotMessage('Use the department chips or the Confirm Filing button below. If you want to change the complaint details, type Edit.');
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '';
      console.error('Chatbot error:', e);
      if (/AI service is not configured|Gemini API key/i.test(errorMessage)) {
        addBotMessage('AI analysis is temporarily unavailable. You can still submit your grievance manually through the form, or try again later.');
      } else if (/Request failed with status code|Failed to save grievance|Network Error/i.test(errorMessage)) {
        addBotMessage('Connection issue. Please check your internet and try again. Your grievance details are saved locally.');
      } else if (/timeout|timed out/i.test(errorMessage)) {
        addBotMessage('Request timed out. Please try submitting again or use the manual form.');
      } else {
        addBotMessage('Something went wrong. Please try again or contact support. You can also submit manually.');
      }
      setTimeout(() => {
        addBotMessage('Type "restart" to start over, or "manual" to use the form instead.');
      }, 2000);
    } finally {
      setIsTyping(false);
    }
  };

  const finalizeGrievance = async () => {
    const now = Date.now();
    const dept = confirmedDepartment || normalizeDepartment(analysis?.department);
    const initialStatus = normalizeStatus(analysis?.initialStatus);

    const newGrievance: Partial<Grievance> = {
      title: analysis?.summary || 'General Concern',
      timestamp: now,
      description: complaintInputs.join('\n').trim(),
      department: dept,
      severity: normalizeSeverity(analysis?.severity),
      status: initialStatus,
      isAnonymous: isAnonymous,
      studentId: currentUser?.id || 'ANON',
      assignedToId: '',
      lastStatusChange: now,
      history: [{ status: initialStatus, timestamp: now, userId: 'SYSTEM', remark: `Case registered with initial status: ${initialStatus}` }],
      remarks: [],
      attachments: attachment ? [attachment] : [],
      notificationsSent: [{ type: 'EMAIL', timestamp: now, message: 'Filing Confirmation Sent' }],
      conversation: [],
      sentiment: normalizeSentiment(analysis?.sentiment),
      summary: analysis?.summary
    };

    const saved = await saveGrievance(newGrievance);
    const grievanceId = saved?.id || 'unknown';
    setSubmittedGrievance({
      id: grievanceId,
      department: dept,
      status: initialStatus
    });
    addBotMessage(
      `Complaint submitted successfully.\n\n` +
      `Complaint ID: #${grievanceId}\n` +
      `Confirmed department: ${dept}\n` +
      `Current status: ${initialStatus}\n` +
      `Assignment status: Routed to the ${dept} team.\n\n` +
      `${isAnonymous ? 'Filing is anonymous.' : 'Filing linked to profile.'}`
    );
    setState('DONE');
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setToastMessage('Only images are allowed as extra proof.');
        setToastType('warning');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setToastMessage('File size should be less than 5MB.');
        setToastType('warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachment({
          name: file.name,
          type: file.type,
          data: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const msg = input.trim();
    const lowerMsg = msg.toLowerCase();

    if (lowerMsg === 'restart' || lowerMsg === 'start over') {
      resetConversation();
      setInput('');
      return;
    }

    if (lowerMsg === 'manual' || lowerMsg === 'form') {
      setMessages((prev) => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: 'Switching to manual form. Please use the "Raise Grievance" section instead.' }]);
      setInput('');
      return;
    }

    const isReviewCommand = /confirm|confirmed|yes|correct|ok|submit|proceed|continue|finalize|done|cancel|stop|abort|quit|nevermind|edit|change|modify|back|restart|start over|new/i.test(lowerMsg);
    const shouldStoreAsComplaintInput =
      state === 'IDLE' ||
      state === 'COLLECTING' ||
      (state === 'REVIEW' && !isReviewCommand);

    if (shouldStoreAsComplaintInput) {
      setComplaintInputs((prev) => [...prev, msg]);
    }

    const nextMessages = [...messages, { role: 'user' as const, content: msg }];
    setMessages(nextMessages);
    setInput('');
    void handleSubmission(msg, nextMessages);
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-10rem)] bg-white rounded-[32px] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="bg-indigo-900 px-6 py-5 text-white flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center font-black border border-white/20">AI</div>
          <div>
            <h3 className="font-black text-lg tracking-tight leading-none mb-1">DAIT ICGRS Assistant</h3>
            <p className="text-[10px] opacity-60 font-black uppercase tracking-[0.2em]">Institutional Redressal Pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer group">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Anonymous Filing</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={() => setIsAnonymous(!isAnonymous)}
                className="w-5 h-5 accent-indigo-400 cursor-pointer"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-slate-50/20 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-5 py-3 rounded-[24px] text-sm font-semibold shadow-sm border ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none'
                : 'bg-white text-slate-700 border-slate-200 rounded-tl-none'
            } whitespace-pre-line leading-6`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2 p-2">
            <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
          </div>
        )}
        <div ref={scrollRef}></div>
      </div>

      <div className="p-5 bg-white border-t border-slate-100">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {attachment && (
            <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-xl self-start">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200">
                <img src={attachment.data} alt="attachment" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold text-indigo-900">{attachment.name}</span>
              <button type="button" onClick={() => setAttachment(null)} className="text-indigo-400 hover:text-indigo-600 transition-colors ml-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          )}
          <div className="flex gap-4 items-center">
            {complaintInputs.length > 0 && state !== 'DONE' && (
              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-500 p-3 rounded-xl transition-all">
                <input type="file" accept="image/*" onChange={handleAttachment} className="hidden" />
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
              </label>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                state === 'DONE'
                  ? 'Filing session complete.'
                  : state === 'CONFIRM_DEPARTMENT'
                    ? 'Choose a department from the chips below...'
                    : state === 'REVIEW'
                      ? 'Type Edit, Cancel, or Restart if needed...'
                      : 'Describe the institutional concern...'
              }
              disabled={state === 'DONE' || isTyping || state === 'CONFIRM_DEPARTMENT'}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping || state === 'DONE' || state === 'CONFIRM_DEPARTMENT'}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200 disabled:opacity-30"
            >
              Submit
            </button>
          </div>
          {state === 'CONFIRM_DEPARTMENT' && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Select Department</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DEPARTMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const nextMessages = [...messages];
                      void handleDepartmentSelection(option.value, nextMessages);
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                      confirmedDepartment === option.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {state === 'REVIEW' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Change Department</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DEPARTMENT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setConfirmedDepartment(option.value)}
                      className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                        (confirmedDepartment || normalizeDepartment(analysis?.department)) === option.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-indigo-100 hover:text-indigo-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void finalizeGrievance()}
                  className="rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-indigo-700"
                >
                  Confirm Filing
                </button>
                <button
                  type="button"
                  onClick={() => setState('COLLECTING')}
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
                >
                  Edit Details
                </button>
              </div>
            </div>
          )}
          {state === 'DONE' && submittedGrievance && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Complaint Filed</p>
                <p className="text-sm font-semibold text-slate-700">Complaint ID: #{submittedGrievance.id}</p>
                <p className="text-sm font-semibold text-slate-700">Department: {submittedGrievance.department}</p>
                <p className="text-sm font-semibold text-slate-700">Status: {submittedGrievance.status}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/track', { state: { grievanceId: submittedGrievance.id } })}
                  className="rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800"
                >
                  Open Tracker
                </button>
                <button
                  type="button"
                  onClick={resetConversation}
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50"
                >
                  Raise Another Complaint
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
      <FeedbackToast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage('')}
      />
    </div>
  );
};

export default GrievanceChatbot;
