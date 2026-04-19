
import React from 'react';
import { GrievanceHistory, Status } from '../types';
import { COLORS } from '../constants';

interface TimelineProps {
  history: GrievanceHistory[];
}

const Timeline: React.FC<TimelineProps> = ({ history }) => {
  const timelineEvents = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const latestEvent = timelineEvents[timelineEvents.length - 1];

  const getStatusMeta = (status: Status) => {
    switch (status) {
      case Status.PENDING:
        return {
          label: 'Submitted',
          icon: (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v8m4-4H8" />
            </svg>
          ),
          dotClass: 'bg-amber-500',
          cardClass: 'border-amber-100 bg-amber-50/50',
        };
      case Status.IN_PROGRESS:
        return {
          label: 'In Progress',
          icon: (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6l4 2" />
            </svg>
          ),
          dotClass: 'bg-indigo-500',
          cardClass: 'border-indigo-100 bg-indigo-50/50',
        };
      case Status.RESOLVED:
        return {
          label: 'Resolved',
          icon: (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ),
          dotClass: 'bg-emerald-500',
          cardClass: 'border-emerald-100 bg-emerald-50/50',
        };
      case Status.CLOSED:
        return {
          label: 'Closed',
          icon: (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          dotClass: 'bg-slate-500',
          cardClass: 'border-slate-200 bg-slate-50/80',
        };
      default:
        return {
          label: 'Updated',
          icon: null,
          dotClass: 'bg-slate-400',
          cardClass: 'border-slate-100 bg-white',
        };
    }
  };

  const getActorLabel = (userId?: string) => {
    if (!userId) return 'System';
    if (userId === 'SYSTEM') return 'System';
    return userId;
  };

  const formatExactTime = (timestamp: number) =>
    new Date(timestamp).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatRelativeTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case Lifecycle Timeline</h4>
          <p className="text-sm text-slate-500">Review the history of this case from submission through the latest action.</p>
        </div>

        {latestEvent && (
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.24em] ${getStatusMeta(latestEvent.status).cardClass.includes('amber') ? 'bg-amber-100 text-amber-700' : getStatusMeta(latestEvent.status).cardClass.includes('indigo') ? 'bg-indigo-100 text-indigo-700' : getStatusMeta(latestEvent.status).cardClass.includes('emerald') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                  {getStatusMeta(latestEvent.status).label}
                </span>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Latest update</p>
                  <p className="text-sm font-bold text-slate-900">{latestEvent.remark || 'Status changed'}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">By</p>
                <p className="text-sm font-bold text-slate-900">{getActorLabel(latestEvent.userId)}</p>
                <p className="text-xs text-slate-500 mt-2">{formatExactTime(latestEvent.timestamp)}</p>
                <p className="text-xs text-slate-400">{formatRelativeTime(latestEvent.timestamp)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-200"></div>

        <div className="space-y-6">
          {timelineEvents.map((item, index) => (
            <div key={`${item.timestamp}-${index}`} className="relative pl-16">
              <div className={`absolute left-0 top-2 w-12 h-12 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${getStatusMeta(item.status).dotClass}`}>
                {getStatusMeta(item.status).icon}
              </div>

              <div className={`rounded-[28px] border p-5 shadow-sm ${getStatusMeta(item.status).cardClass}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${COLORS.status[item.status]}`}> {getStatusMeta(item.status).label} </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Actor: {getActorLabel(item.userId)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{formatExactTime(item.timestamp)}</p>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.24em]">{formatRelativeTime(item.timestamp)}</span>
                </div>

                {item.remark && (
                  <p className="mt-4 text-sm text-slate-700 leading-relaxed">{item.remark}</p>
                )}

                {(item.reassignedFrom || item.reassignedTo) && (
                  <div className="mt-4 rounded-[24px] border border-indigo-100 bg-indigo-50/70 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.32em] text-indigo-600 mb-2">Transfer Details</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600">
                      <span>{item.reassignedFrom || 'Unknown source'}</span>
                      <span className="text-indigo-400">→</span>
                      <span className="text-indigo-700">{item.reassignedTo || 'Unknown target'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
