import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Department, Severity, Status } from '../types';
import { getCurrentUser, getResponsibleStaffId, saveGrievance } from '../store';

const computeSeverity = (text: string): Severity => {
  const normalized = text.toLowerCase();
  if (/(emergency|critical|unsafe|injury|fire|shock|violence|threat)/.test(normalized)) return Severity.CRITICAL;
  if (/(urgent|immediately|since yesterday|no water|no power|harassment|broken|leak|stopped)/.test(normalized)) return Severity.HIGH;
  if (/(issue|problem|delay|complaint|not working|slow)/.test(normalized)) return Severity.MEDIUM;
  return Severity.LOW;
};

const ManualGrievanceForm: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<Department | ''>('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [attachment, setAttachment] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image attachments are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Attachment size must be below 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        name: file.name,
        type: file.type,
        data: event.target?.result as string
      });
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!title.trim() || !description.trim() || !department) {
      setError('Title, description, and department are required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const now = Date.now();
      const grievanceId = `DAIT-${now.toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const assignedToId = await getResponsibleStaffId(department);
      const severity = computeSeverity(`${title} ${description}`);

      await saveGrievance({
        id: grievanceId,
        title: title.trim(),
        summary: title.trim(),
        description: description.trim(),
        department,
        severity,
        status: Status.PENDING,
        isAnonymous,
        studentId: currentUser.id,
        assignedToId,
        timestamp: now,
        lastStatusChange: now,
        history: [{ status: Status.PENDING, timestamp: now, userId: currentUser.id, remark: 'Grievance submitted' }],
        attachments: attachment ? [attachment] : [],
        remarks: [],
        notificationsSent: [],
        conversation: [],
      });
      navigate('/track');
    } catch (submitError: any) {
      console.error('Manual grievance submission failed:', submitError);
      setError(submitError?.response?.data?.message || 'Unable to submit grievance right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manual Grievance Filing</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Submit a complaint directly. Priority is assigned automatically by the system.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/chatbot')}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:border-indigo-200 hover:text-indigo-600"
        >
          Use AI Chatbot Instead
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Complaint Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Example: No water supply in hostel bathroom"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select department</option>
                {Object.values(Department).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Attachment (Optional)</label>
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-500 transition-all hover:border-indigo-300 hover:text-indigo-600">
                <span>{attachment ? attachment.name : 'Upload image proof'}</span>
                <input type="file" accept="image/*" onChange={handleAttachment} className="hidden" />
                <span className="text-[10px] font-black uppercase tracking-widest">Choose File</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">Detailed Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, exact location, when it started, and how it affects you."
              className="h-56 w-full resize-none rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={() => setIsAnonymous((value) => !value)}
                className="h-5 w-5 accent-indigo-600"
              />
              File this complaint anonymously
            </label>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Priority is system-assigned</p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-2xl border border-slate-200 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-slate-950 px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">What Happens Next</p>
            <div className="mt-6 space-y-5">
              <Step title="1. Complaint Registered" text="Your complaint is saved directly into the grievance system." />
              <Step title="2. Priority Computed" text="Severity is assigned in code from the complaint details, not by the student." />
              <Step title="3. Staff Assigned" text="The system routes the case to the responsible department automatically." />
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-indigo-950 via-indigo-800 to-indigo-700 p-8 text-white shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200">Best Results</p>
            <ul className="mt-5 space-y-3 text-sm font-medium leading-relaxed text-indigo-50">
              <li>Include the exact location like room number, block, floor, or office.</li>
              <li>Mention when the issue started and whether it is recurring.</li>
              <li>Attach an image if the issue is visible and safe to photograph.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const Step = ({ title, text }: { title: string; text: string }) => (
  <div className="flex gap-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[11px] font-black text-indigo-600">
      {title.split('.')[0]}
    </div>
    <div>
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">{text}</p>
    </div>
  </div>
);

export default ManualGrievanceForm;
