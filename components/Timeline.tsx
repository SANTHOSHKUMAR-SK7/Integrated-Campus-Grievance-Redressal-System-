
import React from 'react';
import { GrievanceHistory, Status } from '../types';
import { COLORS } from '../constants';

interface TimelineProps {
  history: GrievanceHistory[];
}

const Timeline: React.FC<TimelineProps> = ({ history }) => {
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
  const latestEvent = sortedHistory[0];

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
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case Lifecycle Timeline</h4>
        {latestEvent && (
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Latest Activity</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className={`${COLORS.status[latestEvent.status]} px-3 py-1 rounded-lg text-[10px] font-bold uppercase`}>
                    {getStatusMeta(latestEvent.status).label}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    by {getActorLabel(latestEvent.userId)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">{formatRelativeTime(latestEvent.timestamp)}</p>
                <p className="text-[10px] font-medium text-slate-300 mt-1">{formatExactTime(latestEvent.timestamp)}</p>
              </div>
            </div>
            {latestEvent.remark && (
              <p className="mt-4 text-sm font-semibold text-slate-700 leading-relaxed">
                {latestEvent.remark}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-100 via-slate-100 to-slate-100"></div>

        <div className="space-y-5">
          {sortedHistory.map((item, index) => (
            <div key={index} className="relative pl-12">
              <div className={`absolute left-0 top-2 w-8 h-8 rounded-2xl border-4 border-white shadow-sm flex items-center justify-center z-10 ${getStatusMeta(item.status).dotClass}`}>
                {getStatusMeta(item.status).icon}
              </div>

              <div className={`rounded-3xl border p-4 shadow-sm transition-colors ${index === 0 ? 'shadow-md' : ''} ${getStatusMeta(item.status).cardClass}`}>
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`${COLORS.status[item.status]} px-2 py-0.5 rounded text-[9px] font-bold uppercase`}>
                        {getStatusMeta(item.status).label}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Actor: {getActorLabel(item.userId)}
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-400">
                      {formatExactTime(item.timestamp)}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>

                {item.remark && (
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                    {item.remark}
                  </p>
                )}

                {(item.reassignedFrom || item.reassignedTo) && (
                  <div className="mt-3 rounded-2xl border border-indigo-100 bg-white/80 px-3 py-3">
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Transfer Details</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500">{item.reassignedFrom || 'Unknown source'}</span>
                      <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="text-[10px] font-bold text-indigo-600">{item.reassignedTo || 'Unknown target'}</span>
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
