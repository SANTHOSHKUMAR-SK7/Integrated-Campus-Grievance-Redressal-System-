export enum Department {
  TECHNICAL = 'Technical',
  INFRASTRUCTURE = 'Infrastructure',
  ACADEMIC = 'Academic',
  ADMINISTRATIVE = 'Administrative',
  MESS = 'Mess',
  HOSTEL = 'Hostel',
  TRANSPORT = 'Transport',
  OTHER = 'Other'
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum Status {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum UserRole {
  STUDENT = 'Student',
  STAFF = 'Staff',
  ADMIN = 'Admin'
}

export interface Attachment {
  name: string;
  type: string;
  data: string; // base64
}

export enum ChatType {
  STUDENT_STAFF = 'student-staff',
  STAFF_STAFF = 'staff-staff'
}

export interface Message {
  id: string;
  senderId: string;
  senderRole: UserRole;
  senderName?: string;
  recipientId?: string;
  recipientName?: string;
  content: string;
  timestamp: number;
  type: ChatType;
}

export interface GrievanceHistory {
  status: Status;
  timestamp: number;
  userId: string;
  remark?: string;
  reassignedFrom?: Department;
  reassignedTo?: Department;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department?: Department;
  email: string;
  password?: string;
}

export interface Grievance {
  id: string;
  title: string;
  timestamp: number;
  description: string;
  department: Department;
  severity: Severity;
  status: Status;
  isAnonymous: boolean;
  studentId: string;
  assignedToId: string;
  lastStatusChange: number;
  history: GrievanceHistory[];
  remarks: string[];
  attachments?: Attachment[];
  notificationsSent: { type: string; timestamp: number; message: string }[];
  // AI Enhanced fields
  sentiment?: 'Positive' | 'Neutral' | 'Frustrated' | 'Angry' | 'Urgent';
  summary?: string;
  conversation: Message[];
  fingerprint?: string; 
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}