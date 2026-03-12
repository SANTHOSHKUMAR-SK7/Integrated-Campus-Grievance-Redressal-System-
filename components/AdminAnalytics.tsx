
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { getGrievances } from '../store';
import { Grievance, Severity, Department, Status } from '../types';

const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGrievances().then(res => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => ({
    total: data.length,
    unresolved: data.filter(g => g.status !== Status.RESOLVED && g.status !== Status.CLOSED).length,
  }), [data]);

  const chartData = useMemo(() => Object.values(Department).map(dept => ({
    name: dept.split(' ')[0], // Short name
    count: data.filter(g => g.department === dept).length
  })).filter(d => d.count > 0), [data]);

  const priorityData = useMemo(() => Object.values(Severity).map(sev => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1),
    value: data.filter(g => g.severity === sev).length
  })).filter(d => d.value > 0), [data]);

  const PIE_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#64748b'];

  if (loading) return <div className="p-10 text-center animate-pulse text-indigo-600 font-bold">Generating Analytics Engine...</div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h2>
          <p className="text-slate-500 font-medium">Monitor and resolve institution-wide grievances.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-white border border-slate-200 rounded-xl px-8 py-4 shadow-sm text-center min-w-[140px]">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tickets</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
           </div>
           <div className="bg-white border border-slate-200 rounded-xl px-8 py-4 shadow-sm text-center min-w-[140px]">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unresolved</p>
              <p className="text-2xl font-bold text-orange-600">{stats.unresolved}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
          <h3 className="font-bold text-slate-800 text-lg">Grievances by Department</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} style={{fontSize: '11px', fontWeight: 600, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} style={{fontSize: '11px', fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
          <h3 className="font-bold text-slate-800 text-lg">Severity Distribution</h3>
          <div className="h-[300px] flex items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                  {priorityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-4 absolute right-4 top-1/2 -translate-y-1/2">
              {priorityData.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[i]}}></div>
                  <span className="text-xs font-bold text-slate-600">{p.name} ({p.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg">Recent Grievances</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
               <tr>
                 <th className="px-8 py-4">ID</th>
                 <th className="px-8 py-4">Description</th>
                 <th className="px-8 py-4">Department</th>
                 <th className="px-8 py-4">Severity</th>
                 <th className="px-8 py-4">Status</th>
                 <th className="px-8 py-4">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {data.slice(0, 5).map(g => (
                 <tr key={g.id} className="text-[13px] hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-900">{g.id}</td>
                    <td className="px-8 py-5 text-slate-600 font-medium max-w-xs truncate">{g.title || g.description}</td>
                    <td className="px-8 py-5"><span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md font-bold text-[10px]">{g.department}</span></td>
                    <td className="px-8 py-5"><span className="px-2 py-0.5 border border-orange-200 bg-orange-50 text-orange-700 rounded font-bold uppercase text-[10px]">{g.severity}</span></td>
                    <td className="px-8 py-5"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-bold uppercase text-[10px] tracking-tighter">Submitted</span></td>
                    <td className="px-8 py-5">
                       <button className="text-indigo-600 hover:underline font-bold">View</button>
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
