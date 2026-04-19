
import { Grievance, User, UserRole, Department, Status, Message, ChatType } from './types';
import { endpoints } from './services/api';

let currentUser: User | null = null;
const SESSION_CHANGE_EVENT = 'DAIT_session_change';
const ACCESS_TOKEN_KEY = 'access_token';
const USER_PROFILE_KEY = 'user_profile';

export const getAccessToken = (): string | null => sessionStorage.getItem(ACCESS_TOKEN_KEY);

export const setSession = (user: User, token: string) => {
  currentUser = user;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  sessionStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
};

export const getCurrentUser = (): User | null => {
  if (currentUser) return currentUser;
  const saved = sessionStorage.getItem(USER_PROFILE_KEY);
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
  return !!getAccessToken();
};

export const clearSession = () => {
  currentUser = null;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(USER_PROFILE_KEY);
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
  return () => {
    window.removeEventListener(SESSION_CHANGE_EVENT, callback);
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

export const getGrievanceById = async (id: string): Promise<Grievance | null> => {
  try {
    const response = await endpoints.grievances.getById(id);
    return response.data || null;
  } catch (error) {
    console.error('Failed to fetch grievance:', error);
    return null;
  }
};

export const saveGrievance = async (grievance: Partial<Grievance>) => {
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
    const response = await endpoints.grievances.updateStatus(
      grievance.id,
      grievance.status,
      grievance.history[grievance.history.length - 1]?.remark || '',
      grievance.remarks || []
    );
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
    if (!user) {
      throw new Error('You must be signed in to send a message.');
    }

    let recipientName = undefined;
    if (recipientId) {
      const recipient = await getUserById(recipientId);
      recipientName = recipient?.name;
    }

    const response = await fetch(`/api/grievances/${grievanceId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ content, type, recipientId, recipientName })
    });
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to send message');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};

export const transferGrievance = async (grievanceId: string, toDept: Department, toStaffId: string, reason: string) => {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('You must be signed in to transfer a grievance.');
    }

    const g = await getGrievanceById(grievanceId);
    if (!g) {
      throw new Error('Grievance not found.');
    }

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
            'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ 
            department: toDept, 
            assignedToId: toStaffId, 
            lastStatusChange: now,
            history: updatedHistory
        })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to transfer grievance');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to transfer grievance:', error);
    throw error;
  }
};

export const getAllStaff = async (): Promise<User[]> => {
  try {
    const response = await fetch('/api/users/staff', {
        headers: {
            'Authorization': `Bearer ${getAccessToken()}`
        }
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch staff:', error);
    return [];
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  try {
    const response = await fetch(`/api/users/${id}`, {
        headers: {
            'Authorization': `Bearer ${getAccessToken()}`
        }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}
