
import { Grievance, User, UserRole, Department, Status, Message, ChatType } from './types';
import { endpoints } from './services/api';

let currentUser: User | null = null;
const SESSION_CHANGE_EVENT = 'DAIT_session_change';

export const setSession = (user: User, token: string) => {
  currentUser = user;
  localStorage.setItem('access_token', token);
  localStorage.setItem('user_profile', JSON.stringify(user));
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
};

export const getCurrentUser = (): User | null => {
  if (currentUser) return currentUser;
  const saved = localStorage.getItem('user_profile');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      return currentUser;
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

export const clearSession = () => {
  currentUser = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_profile');
};

export const login = async (email: string, password: string): Promise<User | null> => {
  try {
    const response = await endpoints.auth.login({ email, password });
    if (response.data.token) {
      setSession(response.data.user, response.data.token);
      return response.data.user;
    }
    return null;
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
};

export const logout = () => {
  clearSession();
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  window.location.href = '/#/login';
};

export const subscribeToSession = (callback: () => void) => {
  window.addEventListener(SESSION_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(SESSION_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
};

export const getGrievances = async (): Promise<Grievance[]> => {
  try {
    const response = await endpoints.grievances.getAll();
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch grievances:', error);
    return [];
  }
};

export const saveGrievance = async (grievance: Grievance) => {
  try {
    const response = await endpoints.grievances.submit(grievance);
    return response.data;
  } catch (error) {
    console.error('Failed to save grievance:', error);
    throw error;
  }
};

export const updateGrievance = async (grievance: Grievance) => {
  try {
    const response = await endpoints.grievances.updateStatus(grievance.id, grievance.status, grievance.history[grievance.history.length - 1]?.remark || '');
    // In a real app, we might want a more generic update endpoint, 
    // but for now we'll use what we have or just patch the whole object if we had that endpoint.
    // Let's assume updateStatus is enough for status changes, but for transfers we might need more.
    return response.data;
  } catch (error) {
    console.error('Failed to update grievance:', error);
    throw error;
  }
};

export const sendMessage = async (grievanceId: string, content: string, type: ChatType = ChatType.STUDENT_STAFF, recipientId?: string) => {
  try {
    const user = getCurrentUser();
    if (!user) return;

    let recipientName = undefined;
    if (recipientId) {
      const recipient = await getUserById(recipientId);
      recipientName = recipient?.name;
    }

    const response = await fetch(`/api/grievances/${grievanceId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ content, type, recipientId, recipientName })
    });
    
    if (!response.ok) throw new Error('Failed to send message');
    return await response.json();
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};

export const transferGrievance = async (grievanceId: string, toDept: Department, toStaffId: string, reason: string) => {
  try {
    const user = getCurrentUser();
    if (!user) return;

    const grievances = await getGrievances();
    const g = grievances.find(x => x.id === grievanceId);
    if (!g) return;

    const now = Date.now();
    const updatedHistory = [
      ...(g.history || []),
      { 
        status: g.status, 
        timestamp: now, 
        userId: user.id, 
        remark: `Transferred from ${g.department} to ${toDept}. Reason: ${reason}`,
        reassignedFrom: g.department,
        reassignedTo: toDept
      }
    ];

    const response = await fetch(`/api/grievances/${grievanceId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ 
            department: toDept, 
            assignedToId: toStaffId, 
            lastStatusChange: now,
            history: updatedHistory
        })
    });

    if (!response.ok) throw new Error('Failed to transfer grievance');
    return await response.json();
  } catch (error) {
    console.error('Failed to transfer grievance:', error);
  }
};

export const getAllStaff = async (): Promise<User[]> => {
  try {
    const response = await fetch('/api/users/staff', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch staff:', error);
    return [];
  }
};

export const getResponsibleStaffId = async (department: Department): Promise<string> => {
  const staff = await getAllStaff();
  const deptStaff = staff.filter(s => s.department === department);
  return deptStaff.length > 0 ? deptStaff[0].id : 'ADM-PRIN';
};

export const getUserById = async (id: string): Promise<User | null> => {
  try {
    const response = await fetch(`/api/users/${id}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}
