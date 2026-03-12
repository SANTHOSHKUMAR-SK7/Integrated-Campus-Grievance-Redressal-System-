
import React from 'react';
import { GrievanceHistory, Status } from '../types';
import { COLORS } from '../constants';

interface TimelineProps {
  history: GrievanceHistory[];
}

const Timeline: React.FC<TimelineProps> = ({ history }) => {
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-6">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Case Lifecycle Timeline</h4>
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100"></div>

        <div className="space-y-8">
          {sortedHistory.map((item, index) => (
            <div key={index} className="relative pl-10">
              {/* Dot */}
              <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${
                item.status === Status.RESOLVED ? 'bg-emerald-500' : 
                item.status === Status.IN_PROGRESS ? 'bg-indigo-500' : 'bg-slate-300'
              }`}>
                {item.status === Status.RESOLVED && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-indigo-100 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className={`${COLORS.status[item.status]} px-2 py-0.5 rounded text-[9px] font-bold uppercase`}>
                    {item.status}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {new Date(item.timestamp).toLocaleString([], { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                
                {item.remark && (
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                    {item.remark}
                  </p>
                )}

                {(item.reassignedFrom || item.reassignedTo) && (
                  <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-300 uppercase">Transfer</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500">{item.reassignedFrom}</span>
                      <svg className="w-2.5 h-2.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      <span className="text-[10px] font-bold text-indigo-600">{item.reassignedTo}</span>
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
