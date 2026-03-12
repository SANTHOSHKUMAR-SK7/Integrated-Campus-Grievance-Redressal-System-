
import React, { useState, useMemo, useEffect } from 'react';
// Fix: Import updateGrievance and getCurrentUser instead of non-existent updateGrievanceStatus
import { getGrievances, updateGrievance, getCurrentUser } from '../store';
import { Grievance, Status, Severity, Department } from '../types';
import { COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard: React.FC = () => {
  // Fix: Initialize with empty array and fetch in useEffect since getGrievances is async
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [filterDept, setFilterDept] = useState<string>('All');
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [remarkInput, setRemarkInput] = useState('');
  const [statusInput, setStatusInput] = useState<Status | ''>('');
  // Fix: Get current user to provide userId for history log
  const currentUser = getCurrentUser();

  const refreshData = async () => {
    const data = await getGrievances();
    setGrievances(data);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Fix: Use updateGrievance and correctly build the updated grievance object with history
  const handleUpdate = async () => {
    // Fix: Added check for currentUser to prevent potential null pointer error
    if (selectedGrievance && statusInput && currentUser) {
      const now = Date.now();
      const updated: Grievance = {
        ...selectedGrievance,
        status: statusInput as Status,
        lastStatusChange: now,
        history: [
          ...selectedGrievance.history,
          { status: statusInput as Status, timestamp: now, userId: currentUser.id, remark: remarkInput }
        ],
        remarks: remarkInput ? [...selectedGrievance.remarks, remarkInput] : selectedGrievance.remarks
      };
      
      await updateGrievance(updated);
      setRemarkInput('');
      setStatusInput('');
      setSelectedGrievance(null);
      await refreshData();
    }
  };

  const filtered = useMemo(() => {
    if (filterDept === 'All') return grievances;
    return grievances.filter(g => g.department === filterDept);
  }, [grievances, filterDept]);

  // Analytics Data
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    grievances.forEach(g => {
      counts[g.department] = (counts[g.department] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [grievances]);

  const severityData = useMemo(() => {
    const counts: Record<string, number> = {};
    grievances.forEach(g => {
      counts[g.severity] = (counts[g.severity] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [grievances]);

  const PIE_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#64748b'];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Admin Dashboard</h2>
          <p className="text-slate-500">Monitor and resolve institution-wide grievances.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex-1 md:flex-none min-w-[140px]">
            <p className="text-xs text-slate-500 font-medium">Total Tickets</p>
            <p className="text-2xl font-bold text-indigo-600">{grievances.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex-1 md:flex-none min-w-[140px]">
            <p className="text-xs text-slate-500 font-medium">Unresolved</p>
            <p className="text-2xl font-bold text-orange-600">
              {grievances.filter(g => g.status !== Status.RESOLVED && g.status !== Status.CLOSED).length}
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Grievances by Department</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Severity Distribution</h3>
          <div className="h-64 flex flex-col md:flex-row items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 p-4 text-xs font-medium text-slate-600 w-full md:w-32">
              {severityData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                  <span>{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-800">Recent Grievances</h3>
          <div className="flex gap-2">
            <select 
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="All">All Departments</option>
              {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-mono font-bold text-slate-900">{g.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{g.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${COLORS.department[g.department]}`}>
                      {g.department}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${COLORS.severity[g.severity]}`}>
                      {g.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${COLORS.status[g.status]}`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedGrievance(g)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Process &rarr;
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                    No grievances found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {selectedGrievance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h4 className="font-bold text-slate-900">Handle Grievance: {selectedGrievance.id}</h4>
              <button onClick={() => setSelectedGrievance(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs text-slate-500 font-medium uppercase mb-2">Original Complaint</p>
                <p className="text-sm text-slate-700 leading-relaxed italic">"{selectedGrievance.description}"</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Update Status</label>
                <select 
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as Status)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Status</option>
                  {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Internal Remarks / Resolution Details</label>
                <textarea 
                  rows={4}
                  value={remarkInput}
                  onChange={(e) => setRemarkInput(e.target.value)}
                  placeholder="Explain what steps are being taken or how this was resolved..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setSelectedGrievance(null)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={!statusInput}
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50"
                >
                  Submit Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
