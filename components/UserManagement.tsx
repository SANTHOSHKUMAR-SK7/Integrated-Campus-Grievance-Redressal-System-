
import React, { useState, useEffect } from 'react';
import { User, UserRole, Department } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [newUser, setNewUser] = useState({
    id: '',
    name: '',
    email: '',
    password: 'password123', // Default dummy password
    role: UserRole.STUDENT,
    department: '' as Department | ''
  });

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const usersToUpload = lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split(',').map(v => v.trim());
        const user: any = {};
        headers.forEach((header, index) => {
          if (header === 'id') user.id = values[index];
          if (header === 'name') user.name = values[index];
          if (header === 'email') user.email = values[index];
          if (header === 'role') {
            const r = values[index];
            // Normalize role
            if (r.toLowerCase() === 'student') user.role = UserRole.STUDENT;
            else if (r.toLowerCase() === 'staff') user.role = UserRole.STAFF;
            else if (r.toLowerCase() === 'admin') user.role = UserRole.ADMIN;
            else user.role = r;
          }
          if (header === 'department') user.department = values[index];
        });
        return user;
      });

      try {
        const response = await fetch('/api/users/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(usersToUpload)
        });
        const result = await response.json();
        alert(result.message);
        if (result.results?.errors?.length > 0) {
          console.error('Bulk upload errors:', result.results.errors);
        }
        fetchUsers();
      } catch (error) {
        console.error('Bulk upload failed:', error);
        alert('Bulk upload failed. Check console for details.');
      } finally {
        setIsBulkUploading(false);
        // Reset input
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateUser = async (userId: string, data: Partial<User>) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setEditingUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleAddUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(newUser)
      });
      if (response.ok) {
        setIsAddingUser(false);
        setNewUser({
          id: '',
          name: '',
          email: '',
          password: 'password123',
          role: UserRole.STUDENT,
          department: ''
        });
        fetchUsers();
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to add user');
      }
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (isLoading) return <div className="p-10 animate-pulse text-indigo-600 font-black">Connecting to User Cluster...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">User Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Assign staff roles and departments across the institution.</p>
        </div>
        <div className="flex gap-3">
          <label className={`cursor-pointer bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center gap-2 ${isBulkUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            {isBulkUploading ? 'Uploading...' : 'Bulk CSV Upload'}
            <input type="file" accept=".csv" className="hidden" onChange={handleBulkUpload} disabled={isBulkUploading} />
          </label>
          <button 
            onClick={() => setIsAddingUser(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Add New User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">User</th>
              <th className="px-8 py-5">Role</th>
              <th className="px-8 py-5">Department</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-all group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                      {u.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{u.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{u.email} • {u.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                     u.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700' :
                     u.role === UserRole.STAFF ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                   }`}>
                     {u.role}
                   </span>
                </td>
                <td className="px-8 py-5 text-sm font-bold text-slate-500">
                   {u.department || 'N/A'}
                </td>
                <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                   <button 
                     onClick={() => setEditingUser(u)}
                     className="text-xs font-black text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all"
                   >
                     EDIT
                   </button>
                   <button 
                     onClick={() => handleDeleteUser(u.id)}
                     className="text-xs font-black text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-lg transition-all"
                   >
                     DELETE
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Create New Institutional User</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                <input 
                  type="text" 
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Institutional Email</label>
                <input 
                  type="email" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. john@DAIT.edu.in"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">User ID / Roll No</label>
                <input 
                  type="text" 
                  value={newUser.id}
                  onChange={(e) => setNewUser({...newUser, id: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. STU-101 or STAFF-01"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Initial Password</label>
                <input 
                  type="text" 
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Role</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Dept</label>
                  <select 
                    value={newUser.department}
                    onChange={(e) => setNewUser({...newUser, department: e.target.value as Department})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">None</option>
                    {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsAddingUser(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddUser}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg"
                >
                  Create User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Edit User: {editingUser.name}</h3>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                    <input 
                      type="text" 
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Select Role</label>
                      <select 
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Department</label>
                      <select 
                        value={editingUser.department || ''}
                        onChange={(e) => setEditingUser({...editingUser, department: e.target.value as Department})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">None</option>
                        {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                   </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Reset Password (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Leave blank to keep current"
                      onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setEditingUser(null)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleUpdateUser(editingUser.id, { 
                        name: editingUser.name, 
                        role: editingUser.role, 
                        department: editingUser.department,
                        password: editingUser.password
                      })}
                      className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg"
                    >
                      Save Changes
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
