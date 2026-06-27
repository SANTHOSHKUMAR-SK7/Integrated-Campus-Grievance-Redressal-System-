import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getGrievances, getCurrentUser, subscribeToSession } from '../store';
import { Department, UserRole, Status, Grievance, ChatType } from '../types';
import { COLORS } from '../constants';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState(getCurrentUser());
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'admin' | Department>('all');
  const navigate = useNavigate();

  const refresh = async () => {
    const data = await getGrievances();
    console.log('Dashboard refresh - fetched grievances:', data);
    setGrievances(data);
  };

  useEffect(() => {
    console.log('Dashboard useEffect - current user:', user);
    refresh();
    const cleanup = subscribeToSession(() => {
      setUser(getCurrentUser());
      refresh();
    });
    return cleanup;
  }, []);

  if (!user) return null;

  if (user.role === UserRole.STUDENT) {
    const mine = grievances.filter((g) => g.studentId === user.id);
    console.log('Student grievances (mine):', mine);
    const filteredMine = statusFilter === 'all' ? mine : mine.filter((g) => g.status === statusFilter);
    const stats = {
      total: mine.length,
      pending: mine.filter((g) => g.status === Status.PENDING).length,
      progress: mine.filter((g) => g.status === Status.IN_PROGRESS).length,
      resolved: mine.filter((g) => g.status === Status.RESOLVED).length,
    };

    return (
      <div className="w-full max-w-full xl:max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Filed" value={stats.total} subtext="Institutional record" icon="Filed" variant="primary" />
          <StatCard label="Pending" value={stats.pending} subtext="Awaiting review" icon="Queue" color="text-amber-500" variant="neutral" />
          <StatCard label="In Progress" value={stats.progress} subtext="Staff handling" icon="Active" color="text-indigo-600" variant="neutral" />
          <StatCard label="Resolved" value={stats.resolved} subtext="Verified closed" icon="Done" color="text-emerald-600" variant="success" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActionCard
            title="Lodge New Concern"
            desc="Use our AI-assisted filing system to submit institutional grievances with sentiment tracking."
            btnText="Launch AI Assistant"
            onClick={() => navigate('/chatbot')}
          />
          <ActionCard
            title="Manual Complaint Form"
            desc="Submit a grievance directly with structured details while the system computes priority automatically."
            btnText="Open Manual Form"
            onClick={() => navigate('/manual-complaint')}
          />
          <ActionCard
            title="Case History"
            desc="Track the communication history and resolution progress of your existing reports."
            btnText="Open Tracker"
            onClick={() => navigate('/track')}
          />
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <h3 className="font-black text-slate-900 tracking-tight">Recent Activity</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Showing {filteredMine.length} of {mine.length}
                </span>
              </div>
              <StatusFilter value={statusFilter} onChange={setStatusFilter} />
            </div>
            <Link to="/track" className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline">
              Full Audit &rarr;
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredMine.map((g) => (
              <div
                key={g.id}
                className="px-8 py-6 hover:bg-slate-50 transition-all cursor-pointer"
                onClick={() => navigate('/track', { state: { grievanceId: g.id } })}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-slate-800">{g.title || 'General Grievance'}</h4>
                  <span className={COLORS.status[g.status]}>{g.status}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{g.id}</span>
                  <span>&middot;</span>
                  <span>{new Date(g.timestamp).toLocaleDateString()}</span>
                  <span>&middot;</span>
                  <span className="text-indigo-600">{g.department}</span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    {(g.conversation || []).filter((message) => !message.type || message.type === ChatType.STUDENT_STAFF).length} Messages
                  </span>
                </div>
              </div>
            ))}
            {filteredMine.length === 0 && (
              <div className="p-20 text-center text-slate-400 text-sm font-medium italic">
                No cases found for the selected filter.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const worklist = grievances.filter((g) => {
    if (user.role === UserRole.ADMIN) return true;
    return g.assignedToId === user.id;
  });
  const filteredWorklist = statusFilter === 'all' ? worklist : worklist.filter((g) => g.status === statusFilter);

  const getAssignmentGroup = (g: Grievance): 'admin' | Department => {
    const assignedId = String(g.assignedToId || '').trim().toUpperCase();
    return assignedId.startsWith('ADMIN') ? 'admin' : g.department;
  };

  const assignmentGroups = [
    { label: 'All', value: 'all' as const, count: worklist.length },
    { label: 'Admin Assigned', value: 'admin' as const, count: worklist.filter((g) => getAssignmentGroup(g) === 'admin').length },
    ...Object.values(Department).map((department) => ({
      label: department,
      value: department as Department,
      count: worklist.filter((g) => getAssignmentGroup(g) === department).length,
    })),
  ];

  const filteredAssignmentWorklist = assignmentFilter === 'all'
    ? filteredWorklist
    : filteredWorklist.filter((g) => getAssignmentGroup(g) === assignmentFilter);

  const getAssignmentLabel = (g: Grievance) => (getAssignmentGroup(g) === 'admin' ? 'Admin' : g.department);
  const isAdminView = user.role === UserRole.ADMIN;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Case Manager</h2>
          <p className="text-slate-500 font-medium max-w-2xl">Resolving institutional concerns with AI-driven empathy through a streamlined worklist.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
        <StatCard label="Assigned" value={worklist.length} subtext="Active cases" icon="Case" variant="primary" />
        {isAdminView ? (
          <StatCard label="Admin Assigned" value={assignmentGroups.find((item) => item.value === 'admin')?.count || 0} subtext="Fallback cases" icon="User" color="text-indigo-600" variant="neutral" />
        ) : (
          <StatCard label="Pending" value={worklist.filter((g) => g.status === Status.PENDING).length} subtext="Awaiting action" icon="Queue" color="text-amber-500" variant="neutral" />
        )}
        <StatCard label="Urgent" value={worklist.filter((g) => g.sentiment === 'Angry' || g.sentiment === 'Urgent').length} subtext="Critical sentiment" icon="Alert" color="text-red-600" variant="urgent" />
        <StatCard label="Resolved" value={worklist.filter((g) => g.status === Status.RESOLVED).length} subtext="Case success" icon="Done" color="text-emerald-600" variant="success" />
      </div>

      {isAdminView && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {assignmentGroups
            .filter((group) => group.value !== 'all')
            .slice(0, 6)
            .map((group) => (
              <div key={group.value} className="h-full rounded-[32px] border border-slate-200 bg-slate-50 p-6 shadow-sm transition-all hover:-translate-y-0.5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{group.label}</p>
                <p className="mt-5 text-3xl font-black text-slate-900">{group.count}</p>
                <p className="text-[11px] text-slate-500 mt-3">Assigned cases</p>
              </div>
            ))}
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-100 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Active Worklist</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Showing {filteredAssignmentWorklist.length} of {worklist.length}
              </span>
            </div>
            <div className={`grid gap-3 ${isAdminView ? 'sm:grid-cols-2 md:min-w-[420px]' : 'sm:grid-cols-1 md:min-w-[200px]'}`}>
              <DropdownFilter
                label="Status"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as 'all' | Status)}
                options={FILTER_OPTIONS}
              />
              {isAdminView && (
                <DropdownFilter
                  label="Assignment"
                  value={assignmentFilter}
                  onChange={(value) => setAssignmentFilter(value as 'all' | 'admin' | Department)}
                  options={[
                    { label: 'All Assignments', value: 'all' },
                    { label: 'Admin Assigned', value: 'admin' },
                    ...Object.values(Department).map((department) => ({
                      label: department,
                      value: department,
                    })),
                  ]}
                />
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-10 py-5">Case ID</th>
                <th className="px-10 py-5">Summary</th>
                <th className="px-10 py-5">Filed Date</th>
                <th className="px-10 py-5">Sentiment</th>
                <th className="px-10 py-5">Identity</th>
                <th className="px-10 py-5">Assignment</th>
                <th className="px-10 py-5">Status</th>
                <th className="px-10 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssignmentWorklist.map((g) => (
                <tr
                  key={g.id}
                  className="hover:bg-indigo-50/30 transition-all cursor-pointer group"
                  onClick={() => navigate('/manage', { state: { grievanceId: g.id } })}
                >
                  <td className="px-10 py-6 font-black text-slate-900 text-sm">#{g.id}</td>
                  <td className="px-10 py-6">
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{g.title || g.description}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{g.department}</p>
                  </td>
                  <td className="px-10 py-6"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(g.timestamp).toLocaleDateString()}</span></td>
                  <td className="px-10 py-6">
                    <span
                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        g.sentiment === 'Angry' || g.sentiment === 'Urgent'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
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
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{getAssignmentLabel(g)}</span>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`${COLORS.status[g.status]} scale-90`}>{g.status}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">
                      Open Chat
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAssignmentWorklist.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-10 py-16 text-center text-slate-400 text-sm font-medium italic">
                    No grievances found for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

type StatCardProps = {
  label: string;
  value: number;
  subtext: string;
  icon: string;
  color?: string;
  variant?: 'primary' | 'urgent' | 'success' | 'neutral';
};

const StatCard: React.FC<StatCardProps> = ({ label, value, subtext, icon, color, variant = 'neutral' }) => {
  const baseStyles = 'h-full flex flex-col justify-between rounded-[32px] border p-6 sm:p-8 shadow-sm transition-all hover:-translate-y-0.5';
  const variantStyles = {
    primary: 'bg-sky-50 border-sky-200 shadow-[0_20px_60px_-30px_rgba(14,165,233,0.2)]',
    urgent: 'bg-rose-50 border-rose-200 shadow-[0_20px_60px_-30px_rgba(239,68,68,0.2)]',
    success: 'bg-emerald-50 border-emerald-200 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.18)]',
    neutral: 'bg-white border-slate-200',
  }[variant];
  const labelClass = variant === 'primary' ? 'text-sky-700' : 'text-slate-600';
  const subtextClass = variant === 'primary' ? 'text-sky-600' : 'text-slate-400';
  const iconClass = variant === 'primary' ? 'text-sky-500' : 'text-slate-400';
  const valueColor = color || (variant === 'primary' ? 'text-sky-950' : 'text-slate-900');

  return (
    <div className={`${baseStyles} ${variantStyles}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-semibold tracking-tight ${labelClass}`}>{label}</p>
        <span className={`text-[11px] font-black uppercase tracking-widest ${iconClass}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <div>
        <p className={`text-4xl font-black tracking-tighter ${valueColor}`}>{value}</p>
        <p className={`text-xs font-medium mt-1 ${subtextClass}`}>{subtext}</p>
      </div>
    </div>
  );
};

type ActionCardProps = {
  title: string;
  desc: string;
  btnText: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
};

const ActionCard: React.FC<ActionCardProps> = ({ title, desc, btnText, onClick, variant = 'primary' }) => (
  <div className="h-full flex flex-col justify-between bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm transition-all hover:-translate-y-0.5">
    <div className="space-y-4">
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

type StatusOption = { label: string; value: 'all' | Status };

const FILTER_OPTIONS: StatusOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: Status.PENDING },
  { label: 'In Progress', value: Status.IN_PROGRESS },
  { label: 'Resolved', value: Status.RESOLVED },
  { label: 'Closed', value: Status.CLOSED },
];

const StatusFilter = ({
  value,
  onChange,
}: {
  value: 'all' | Status;
  onChange: (value: 'all' | Status) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {FILTER_OPTIONS.map((option) => {
      const isActive = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            isActive
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const DropdownFilter = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-xs font-black uppercase tracking-widest text-slate-700 outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
      </svg>
    </div>
  </label>
);

export default Dashboard;
