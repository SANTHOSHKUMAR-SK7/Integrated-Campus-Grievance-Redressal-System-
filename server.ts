
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'DAIT-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection Check Middleware
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1 && req.path.startsWith('/api') && req.path !== '/api/health') {
    return res.status(503).json({ 
      message: 'Database connection not established. Please ensure 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access.' 
    });
  }
  next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/DAIT_grievance';

// --- Schemas & Models ---

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Student', 'Staff', 'Admin'], required: true },
  department: { type: String }
});

const User = mongoose.model('User', UserSchema);

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Number, default: Date.now },
  isRead: { type: Boolean, default: false },
  type: { type: String, enum: ['system', 'message', 'status_change'], default: 'system' },
  link: { type: String }
});

const Notification = mongoose.model('Notification', NotificationSchema);

async function cleanupOldNotifications(days: number = 30) {
  try {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const result = await Notification.deleteMany({ timestamp: { $lt: cutoff } });
    console.log(`Notification cleanup completed. Removed ${result.deletedCount ?? 0} old notifications.`);
  } catch (error) {
    console.error('Notification cleanup failure:', error);
  }
}

const AttachmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  grievanceId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  attachmentType: { type: String, required: true },
  attachmentData: { type: String, required: true },
  size: { type: Number, required: true },
  timestamp: { type: Number, default: Date.now }
});

const AttachmentRecord = mongoose.model('AttachmentRecord', AttachmentSchema);

const GrievanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  timestamp: { type: Number, default: Date.now },
  description: { type: String, required: true },
  department: { type: String, required: true },
  severity: { type: String, required: true },
  status: { type: String, enum: ['pending', 'in-progress', 'resolved', 'closed'], default: 'pending' },
  isAnonymous: { type: Boolean, default: false },
  studentId: { type: String, required: true },
  assignedToId: { type: String },
  lastStatusChange: { type: Number, default: Date.now },
  history: [{
    status: String,
    timestamp: Number,
    userId: String,
    remark: String,
    reassignedFrom: String,
    reassignedTo: String
  }],
  remarks: [String],
  attachments: [{
    id: { type: String },
    name: { type: String },
    attachmentType: { type: String },
    size: { type: Number }
  }],
  notificationsSent: [{
    type: { type: String },
    timestamp: Number,
    message: String
  }],
  sentiment: String,
  summary: String,
  conversation: [{
    id: String,
    senderId: String,
    senderRole: String,
    senderName: String,
    recipientId: String,
    recipientName: String,
    content: String,
    timestamp: Number,
    type: { type: String, enum: ['student-staff', 'staff-staff'] }
  }],
  fingerprint: String
});

const Grievance = mongoose.model('Grievance', GrievanceSchema);

// --- Email Helper ---

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendNotificationEmail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_USER) {
    console.log('Email skip (no SMTP config):', { to, subject });
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"DAIT Grievance" <noreply@dait.com>',
      to,
      subject,
      text,
    });
    console.log('Email sent to:', to);
  } catch (error) {
    console.error('Email error:', error);
  }
}

async function createNotification(userId: string, title: string, message: string, type: string = 'system', link?: string) {
  try {
    const notification = new Notification({
      id: 'NOTIF-' + Math.random().toString(36).substr(2, 9),
      userId,
      title,
      message,
      type,
      link,
      timestamp: Date.now()
    });
    await notification.save();

    // Also try to send email if user exists
    const user = await User.findOne({ id: userId });
    if (user && user.email) {
      sendNotificationEmail(user.email, title, message);
    }
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

async function buildGrievanceLinkForUser(userId: string, grievanceId: string) {
  const user = await User.findOne({ id: userId }).select('role');
  if (!user) return undefined;
  const basePath = user.role === 'Student' ? '/track' : '/manage';
  return `${basePath}?grievanceId=${encodeURIComponent(grievanceId)}`;
}

async function getFallbackAdminId() {
  const adminUser = await User.findOne({ role: 'Admin' }).sort({ _id: 1 }).select('id');
  return adminUser?.id || '';
}

async function getAdminIds() {
  const admins = await User.find({ role: 'Admin' }).select('id');
  return admins.map((admin) => admin.id);
}

async function getDepartmentStaffIds(department?: string) {
  const normalizedDepartment = normalizeDepartment(department);
  const staffMembers = await User.find({ role: 'Staff', department: normalizedDepartment }).select('id');
  return staffMembers.map((staffMember) => staffMember.id);
}

async function notifyManyUsers(
  userIds: Array<string | undefined>,
  title: string,
  message: string,
  type: string = 'system',
  grievanceId?: string,
  excludeUserIds: string[] = []
) {
  const uniqueUserIds = [...new Set(
    userIds
      .filter((userId): userId is string => Boolean(userId))
      .filter((userId) => !excludeUserIds.includes(userId))
  )];

  for (const userId of uniqueUserIds) {
    const link = grievanceId ? await buildGrievanceLinkForUser(userId, grievanceId) : undefined;
    await createNotification(userId, title, message, type, link);
  }
}

async function autoAssignExistingGrievancesToStaff(staffUser: { id: string; name: string; department?: string }) {
  const rawDepartment = String(staffUser.department || '').trim();
  if (!rawDepartment) {
    return { reassignedCount: 0, department: '' };
  }

  const department = normalizeDepartment(rawDepartment);
  if (!department) {
    return { reassignedCount: 0, department };
  }

  const fallbackAdminId = await getFallbackAdminId();
  const eligibleAssignmentIds = [fallbackAdminId].filter(Boolean);
  const grievances = await Grievance.find({
    department,
    $or: [
      { assignedToId: { $exists: false } },
      { assignedToId: null },
      { assignedToId: '' },
      ...(eligibleAssignmentIds.length > 0 ? [{ assignedToId: { $in: eligibleAssignmentIds } }] : [])
    ]
  });

  if (grievances.length === 0) {
    return { reassignedCount: 0, department };
  }

  const now = Date.now();
  const grievanceIds: string[] = [];

  for (const grievance of grievances) {
    const previousAssignee = grievance.assignedToId || fallbackAdminId || 'unassigned';
    grievance.assignedToId = staffUser.id;
    grievance.history.push({
      status: grievance.status,
      timestamp: now,
      userId: 'SYSTEM',
      remark: `Automatically assigned to ${staffUser.name} after staff availability was added for ${department}.`,
      reassignedFrom: previousAssignee,
      reassignedTo: staffUser.id
    });
    await grievance.save();
    grievanceIds.push(grievance.id);

    const adminIds = await getAdminIds();
    await notifyManyUsers(
      [staffUser.id],
      'Grievance Auto-Assigned',
      `Grievance #${grievance.id} has been automatically assigned to you for the ${department} department.`,
      'system',
      grievance.id
    );
    await notifyManyUsers(
      [grievance.studentId],
      'Grievance Handler Assigned',
      `Your grievance #${grievance.id} is now assigned to ${staffUser.name} from the ${department} team.`,
      'status_change',
      grievance.id
    );
    await notifyManyUsers(
      adminIds,
      'Backlog Grievance Assigned',
      `Grievance #${grievance.id} has been auto-assigned to ${staffUser.name} in ${department}.`,
      'system',
      grievance.id
    );
  }

  return { reassignedCount: grievanceIds.length, department, grievanceIds };
}

async function syncDepartmentBacklogForStaffById(userId: string) {
  const staffUser = await User.findOne({ id: userId, role: 'Staff' }).select('id name department');
  if (!staffUser) {
    return { reassignedCount: 0, department: '' };
  }

  return autoAssignExistingGrievancesToStaff({
    id: staffUser.id,
    name: staffUser.name,
    department: staffUser.department ?? undefined
  });
}

// --- Auth Middleware ---

const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const canManageGrievance = (user: any, grievance: any) => {
  if (!user || !grievance) return false;
  if (user.role === 'Admin') return true;
  if (user.role === 'Staff') {
    return grievance.assignedToId === user.id || grievance.department === user.department;
  }
  return false;
};

const canMessageOnGrievance = (user: any, grievance: any) => {
  if (!user || !grievance) return false;
  if (user.role === 'Student') {
    return grievance.studentId === user.id;
  }
  return canManageGrievance(user, grievance);
};

const canReceiveInternalGrievanceMessage = (recipient: any, grievance: any) => {
  if (!recipient || !grievance) return false;
  if (recipient.role === 'Admin') return true;
  if (recipient.role !== 'Staff') return false;
  return recipient.id === grievance.assignedToId || recipient.department === grievance.department;
};

const VALID_DEPARTMENTS = ['Technical', 'Infrastructure', 'Academic', 'Administrative', 'Mess', 'Hostel', 'Transport', 'Other'];
const VALID_STATUSES = ['pending', 'in-progress', 'resolved', 'closed'];

const normalizeDepartment = (department?: string) => {
  const normalized = String(department || '').trim().toLowerCase();
  const match = VALID_DEPARTMENTS.find((item) => item.toLowerCase() === normalized);
  return match || 'Other';
};

const computeSeverity = (text: string) => {
  const normalized = text.toLowerCase();
  if (/(emergency|critical|unsafe|injury|fire|shock|violence|threat)/.test(normalized)) return 'critical';
  if (/(urgent|immediately|since yesterday|no water|no power|harassment|broken|leak|stopped)/.test(normalized)) return 'high';
  if (/(issue|problem|delay|complaint|not working|slow)/.test(normalized)) return 'medium';
  return 'low';
};

const computeSentiment = (text: string) => {
  const normalized = text.toLowerCase();
  if (/(urgent|critical|emergency)/.test(normalized)) return 'Urgent';
  if (/(angry|worst|unacceptable|frustrating)/.test(normalized)) return 'Angry';
  if (/(issue|problem|complaint|not working|no water|delay)/.test(normalized)) return 'Frustrated';
  return 'Neutral';
};

const createGrievanceId = () => `DAIT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
const PASSWORD_POLICY_MESSAGE = 'Password must be at least 8 characters and include uppercase, lowercase, and a number.';
const isStrongPassword = (password: string) => {
  const value = String(password || '');
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
};

const createAttachmentId = () => `ATT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

const getGrievanceListProjection = () => ({
  id: 1,
  title: 1,
  timestamp: 1,
  department: 1,
  severity: 1,
  status: 1,
  isAnonymous: 1,
  studentId: 1,
  assignedToId: 1,
  lastStatusChange: 1,
  summary: 1,
  sentiment: 1,
  attachments: 1,
  conversation: { $slice: -10 },
  history: { $slice: -10 },
});

// --- API Routes ---

// Auth
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log(`Login attempt for: ${email}`);
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login failed: User not found - ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Login debug: email=${email}, foundUser=${!!user}, role=${user?.role}, id=${user?.id}`);
    console.log(`Password comparison: isMatch=${isMatch}, dbPasswordLength=${user?.password?.length}`);
    
    if (!isMatch) {
      console.log(`Login failed: Password mismatch for - ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'Staff') {
      await syncDepartmentBacklogForStaffById(user.id);
    }

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    console.log(`Login successful: ${email} (${user.role})`);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email, department: user.department } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/auth/me', authenticate, async (req: any, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user.id, name: user.name, role: user.role, email: user.email, department: user.department });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Grievances
app.get('/api/grievances', authenticate, async (req: any, res) => {
  try {
    let query = {};
    if (req.user.role === 'Student') {
      query = { studentId: req.user.id };
    } else if (req.user.role === 'Staff') {
      await syncDepartmentBacklogForStaffById(req.user.id);
      query = { $or: [{ assignedToId: req.user.id }, { department: req.user.department }] };
    }
    const grievances = await Grievance.find(query, getGrievanceListProjection()).sort({ timestamp: -1 });
    res.json(grievances);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/grievances/:id', authenticate, async (req: any, res) => {
  try {
    if (req.user.role === 'Staff') {
      await syncDepartmentBacklogForStaffById(req.user.id);
    }

    const grievance = await Grievance.findOne({ id: req.params.id });
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

    if (req.user.role === 'Student' && grievance.studentId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    } else if (req.user.role === 'Staff' && grievance.assignedToId !== req.user.id && grievance.department !== req.user.department) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(grievance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/grievances', authenticate, async (req: any, res) => {
  try {
    console.log('--- Grievance Submission Start ---');
    console.log('User:', JSON.stringify(req.user));
    console.log('Received attachments:', Array.isArray(req.body.attachments) ? `${req.body.attachments.length} file(s)` : 'none');
    
    const title = String(req.body.title || '').trim() || 'General Concern';
    const description = String(req.body.description || '').trim();
    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }
    const grievanceId = String(req.body.id || '').trim() || createGrievanceId();

    // Validate and process attachments
    let attachmentMetadata = [];
    if (Array.isArray(req.body.attachments)) {
      for (let i = 0; i < req.body.attachments.length; i++) {
        const att = req.body.attachments[i];
        if (att.data && typeof att.data === 'string' && att.data.length > 0) {
          // Check if attachment data is too large (limit to 5MB base64)
          if (att.data.length > 5 * 1024 * 1024) {
            console.warn(`Attachment ${i} exceeds size limit: ${att.data.length} bytes`);
            continue;
          }
          const attachmentId = createAttachmentId();
          const size = Math.round((att.data.length * 3) / 4);
          await new AttachmentRecord({
            id: attachmentId,
            grievanceId,
            name: String(att.name || `attachment-${i}`),
            attachmentType: String(att.type || 'application/octet-stream'),
            attachmentData: att.data,
            size,
            timestamp: Date.now()
          }).save();

          attachmentMetadata.push({
            id: attachmentId,
            name: String(att.name || `attachment-${i}`),
            attachmentType: String(att.type || 'application/octet-stream'),
            size
          });
        }
      }
    }

    const department = normalizeDepartment(req.body.department);
    const severity = computeSeverity(`${title} ${description}`);
    const sentiment = req.body.sentiment || computeSentiment(description);
    const status = VALID_STATUSES.includes(String(req.body.status || '').toLowerCase())
      ? String(req.body.status).toLowerCase()
      : 'pending';
    const assignedStaff = await User.findOne({ role: 'Staff', department }).select('id');
    const fallbackAdminId = await getFallbackAdminId();
    
    const grievanceData = {
      id: grievanceId,
      title,
      description,
      department,
      severity,
      sentiment,
      status,
      isAnonymous: Boolean(req.body.isAnonymous),
      studentId: req.user.id,
      assignedToId: req.body.assignedToId || assignedStaff?.id || fallbackAdminId,
      timestamp: Date.now(),
      lastStatusChange: Date.now(),
      attachments: attachmentMetadata,
      remarks: [],
      notificationsSent: [],
      conversation: [],
      history: [{
        status,
        timestamp: Date.now(),
        userId: req.user.id,
        remark: 'Grievance submitted'
      }]
    };

    console.log('Normalized Grievance Data (with attachment metadata):', JSON.stringify(grievanceData, null, 2));
    
    const grievance = new Grievance(grievanceData);
    
    await grievance.save();
    console.log('Grievance saved successfully:', grievance.id);

    const adminIds = await getAdminIds();
    const departmentStaffIds = await getDepartmentStaffIds(grievance.department);
    const assignedHandler = grievance.assignedToId || fallbackAdminId;

    await notifyManyUsers(
      [grievance.studentId],
      'Grievance Submitted Successfully',
      `Your grievance #${grievance.id} has been submitted under ${grievance.department}.`,
      'system',
      grievance.id
    );

    try {
      await notifyManyUsers(
        [...departmentStaffIds, ...adminIds],
        'New Grievance Filed',
        `A new grievance #${grievance.id} has been filed in ${grievance.department}: ${grievance.title}`,
        'system',
        grievance.id,
        [grievance.studentId]
      );

      if (assignedHandler) {
        const assignedUser = await User.findOne({ id: assignedHandler }).select('name role');
        if (assignedUser) {
          await notifyManyUsers(
            [grievance.studentId],
            'Grievance Routed',
            `Your grievance #${grievance.id} has been routed to ${assignedUser.name}.`,
            'status_change',
            grievance.id
          );
        }
      }
    } catch (notifErr) {
      console.error('Failed to send notification for new grievance:', notifErr);
      // Don't fail the whole request if notification fails
    }

    res.status(201).json(grievance);
  } catch (err: any) {
    console.error('Grievance submission error:', err);
    res.status(500).json({ message: 'Server error', details: err.message, stack: err.stack });
  }
});

app.patch('/api/grievances/:id', authenticate, async (req: any, res) => {
  try {
    const grievance = await Grievance.findOne({ id: req.params.id });
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });
    const previousDepartment = grievance.department;
    const previousAssignedToId = grievance.assignedToId;

    if (!canManageGrievance(req.user, grievance)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // This endpoint is reserved for reassignment/ownership updates.
    const allowedUpdates = ['department', 'assignedToId', 'lastStatusChange', 'history'] as const;
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedUpdates.includes(key as (typeof allowedUpdates)[number]))
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid grievance fields to update' });
    }

    Object.assign(grievance, updates);
    await grievance.save();

    const adminIds = await getAdminIds();
    const previousDepartmentStaffIds = await getDepartmentStaffIds(previousDepartment);
    const currentDepartmentStaffIds = await getDepartmentStaffIds(grievance.department);
    const previousHandler = previousAssignedToId ? await User.findOne({ id: previousAssignedToId }).select('name') : null;
    const currentHandler = grievance.assignedToId ? await User.findOne({ id: grievance.assignedToId }).select('name') : null;
    const assignmentChanged = previousAssignedToId !== grievance.assignedToId;
    const departmentChanged = previousDepartment !== grievance.department;
    const actorName = req.user.name || req.user.id || 'System';

    if (assignmentChanged || departmentChanged) {
      const updateMessage = `Grievance #${grievance.id} was reassigned by ${actorName}${departmentChanged ? ` from ${previousDepartment} to ${grievance.department}` : ''}${currentHandler ? ` and is now handled by ${currentHandler.name}` : ''}.`;

      await notifyManyUsers(
        [
          grievance.studentId,
          previousAssignedToId,
          grievance.assignedToId,
          ...previousDepartmentStaffIds,
          ...currentDepartmentStaffIds,
          ...adminIds
        ].filter((id): id is string => Boolean(id)),
        'Grievance Reassigned',
        updateMessage,
        'system',
        grievance.id,
        [req.user.id]
      );
    }

    res.json(grievance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/grievances/:id/attachments/:attachmentId', authenticate, async (req: any, res) => {
  try {
    const grievance = await Grievance.findOne({ id: req.params.id });
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

    if (req.user.role === 'Student' && grievance.studentId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    } else if (req.user.role === 'Staff' && grievance.assignedToId !== req.user.id && grievance.department !== req.user.department) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const attachment = await AttachmentRecord.findOne({
      grievanceId: req.params.id,
      id: req.params.attachmentId
    }).select('id grievanceId name attachmentType attachmentData size');

    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });
    res.json(attachment);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/grievances/:id/messages', authenticate, async (req: any, res) => {
    try {
        const grievance = await Grievance.findOne({ id: req.params.id });
        if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!canMessageOnGrievance(req.user, grievance)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const content = String(req.body.content || '').trim();
        if (!content) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        const messageType = req.body.type || 'student-staff';
        if (!['student-staff', 'staff-staff'].includes(messageType)) {
            return res.status(400).json({ message: 'Invalid message type' });
        }

        if (messageType === 'staff-staff' && !['Staff', 'Admin'].includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        let recipientId = req.body.recipientId;
        let recipientName = req.body.recipientName;

        if (recipientId) {
            const recipient = await User.findOne({ id: recipientId }).select('-password');
            if (!recipient) {
                return res.status(404).json({ message: 'Recipient not found' });
            }

            if (messageType === 'staff-staff') {
                if (!canReceiveInternalGrievanceMessage(recipient, grievance)) {
                    return res.status(400).json({ message: 'Recipient must be an admin or a staff member relevant to this grievance' });
                }
            } else {
                const isStudentOwner = recipient.id === grievance.studentId;
                const isCurrentHandler = recipient.id === grievance.assignedToId;
                if (!isStudentOwner && !isCurrentHandler && recipient.role !== 'Admin') {
                    return res.status(400).json({ message: 'Recipient is not part of this grievance' });
                }
            }

            recipientId = recipient.id;
            recipientName = recipient.name;
        }

        const newMessage = {
            id: 'MSG-' + Math.random().toString(36).substr(2, 9),
            senderId: user.id,
            senderRole: user.role,
            senderName: user.name,
            content,
            timestamp: Date.now(),
            type: messageType,
            recipientId,
            recipientName
        };

        grievance.conversation.push(newMessage);
        await grievance.save();

        const adminIds = await getAdminIds();
        const departmentStaffIds = await getDepartmentStaffIds(grievance.department);

        if (recipientId) {
            await notifyManyUsers(
                [recipientId],
                'New Message Received',
                `You have a new message from ${user.name} regarding grievance #${grievance.id}.`,
                'message',
                grievance.id,
                [user.id]
            );
        }

        if (messageType === 'student-staff') {
            await notifyManyUsers(
                [
                  grievance.studentId,
                  grievance.assignedToId,
                  ...departmentStaffIds,
                  ...adminIds
                ].filter((id): id is string => Boolean(id)),
                'Grievance Conversation Updated',
                `${user.name} added a new message on grievance #${grievance.id}.`,
                'message',
                grievance.id,
                [user.id, recipientId].filter(Boolean) as string[]
            );
        } else {
            await notifyManyUsers(
                [
                  grievance.assignedToId,
                  ...departmentStaffIds,
                  ...adminIds
                ].filter((id): id is string => Boolean(id)),
                'Internal Grievance Note Added',
                `${user.name} added an internal note on grievance #${grievance.id}.`,
                'system',
                grievance.id,
                [user.id, recipientId].filter(Boolean) as string[]
            );
        }

        res.json(grievance);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.patch('/api/grievances/:id/status', authenticate, async (req: any, res: any) => {
  try {
    const { status, remark, remarks } = req.body;
    const grievance = await Grievance.findOne({ id: req.params.id });
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

    if (!canManageGrievance(req.user, grievance)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const allowedStatuses = ['pending', 'in-progress', 'resolved', 'closed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid grievance status' });
    }

    grievance.status = status;
    grievance.lastStatusChange = Date.now();
    grievance.history.push({
      status,
      timestamp: Date.now(),
      userId: req.user.id,
      remark: remark || `Status updated to ${status}`
    });

    if (Array.isArray(remarks)) {
      grievance.remarks = remarks.filter((entry: unknown) => typeof entry === 'string');
    }

    await grievance.save();

    const adminIds = await getAdminIds();
    const departmentStaffIds = await getDepartmentStaffIds(grievance.department);
    await notifyManyUsers(
      [
        grievance.studentId,
        grievance.assignedToId,
        ...departmentStaffIds,
        ...adminIds
      ].filter((id): id is string => Boolean(id)),
      'Grievance Status Updated',
      `Grievance #${grievance.id} status is now ${status}${remark ? `: ${remark}` : ''}.`,
      'status_change',
      grievance.id,
      [req.user.id]
    );

    res.json(grievance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Notifications
app.get('/api/notifications', authenticate, async (req: any, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ timestamp: -1 }).limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/notifications/unread', authenticate, async (req: any, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    res.json({ count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.get('/api/admin/runtime-config', authenticate, async (req: any, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });

    res.json({
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        source: process.env.MONGODB_URI ? 'environment' : 'default-local',
      },
      authentication: {
        jwtConfigured: Boolean(process.env.JWT_SECRET),
      },
      email: {
        configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      },
      ai: {
        configured: Boolean(process.env.GEMINI_API_KEY),
      },
      notes: [
        'Runtime infrastructure is controlled by server environment variables.',
        'Browser settings do not change the deployed backend configuration.'
      ]
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/notifications/:id/read', authenticate, async (req: any, res) => {
  try {
    await Notification.updateOne({ id: req.params.id, userId: req.user.id }, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/notifications/read-all', authenticate, async (req: any, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Gemini AI Integration - DEPRECATED ON BACKEND (Moved to Frontend)
app.post('/api/grievances/:id/ai-summary', authenticate, async (req: any, res: any) => {
  res.status(410).json({ message: 'Endpoint moved to frontend' });
});

app.post('/api/ai/analyze', authenticate, async (req: any, res: any) => {
  res.status(410).json({ message: 'Endpoint moved to frontend' });
});

app.post('/api/ai/staff-assist', authenticate, async (req: any, res: any) => {
  res.status(410).json({ message: 'Endpoint moved to frontend' });
});

// Users
app.get('/api/users', authenticate, async (req: any, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users', authenticate, async (req: any, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    const { id, name, email, password, role } = req.body;
    const normalizedDepartment = req.body.department ? normalizeDepartment(req.body.department) : undefined;

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }
    
    const existingUser = await User.findOne({ $or: [{ id }, { email }] });
    if (existingUser) return res.status(400).json({ message: 'User ID or Email already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      id,
      name,
      email,
      password: hashedPassword,
      role,
      department: normalizedDepartment
    });

    await newUser.save();
    let reassignmentSummary = null;
    if (role === 'Staff') {
      reassignmentSummary = await autoAssignExistingGrievancesToStaff({
        id: newUser.id,
        name: newUser.name,
        department: newUser.department ?? undefined
      });
    }

    await notifyManyUsers(
      [newUser.id],
      'Account Created',
      `Your ${role} account has been created successfully${newUser.department ? ` for ${newUser.department}` : ''}.`,
      'system'
    );

    res.status(201).json({
      message: 'User created successfully',
      reassignmentSummary
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users/bulk', authenticate, async (req: any, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    const users = req.body; // Array of user objects
    
    if (!Array.isArray(users)) return res.status(400).json({ message: 'Invalid data format' });

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('Dait2026', salt);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      reassigned: [] as Array<{ staffId: string; staffName: string; department: string; grievanceIds: string[] }>
    };

    for (const userData of users) {
      try {
        const { id, name, email, role } = userData;
        const normalizedDepartment = userData.department ? normalizeDepartment(userData.department) : undefined;
        
        if (!id || !name || !email || !role) {
          results.failed++;
          results.errors.push(`Missing required fields for ${email || 'unknown'}`);
          continue;
        }

        const existingUser = await User.findOne({ $or: [{ id }, { email }] });
        if (existingUser) {
          results.failed++;
          results.errors.push(`User ${id} or ${email} already exists`);
          continue;
        }

        const newUser = new User({
          id,
          name,
          email,
          password: defaultPassword,
          role,
          department: normalizedDepartment
        });

        await newUser.save();
        results.success++;

        if (role === 'Staff') {
          const reassignmentSummary = await autoAssignExistingGrievancesToStaff({
            id: newUser.id,
            name: newUser.name,
            department: newUser.department ?? undefined
          });
          if (reassignmentSummary.reassignedCount > 0) {
            results.reassigned.push({
              staffId: newUser.id,
              staffName: newUser.name,
              department: reassignmentSummary.department || '',
              grievanceIds: reassignmentSummary.grievanceIds || []
            });
          }
        }

        await notifyManyUsers(
          [newUser.id],
          'Account Created',
          `Your ${role} account has been created successfully${newUser.department ? ` for ${newUser.department}` : ''}.`,
          'system'
        );
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Error creating ${userData.email}: ${err.message}`);
      }
    }

    res.json({ 
      message: `Bulk import completed: ${results.success} succeeded, ${results.failed} failed`,
      results 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/users/:id', authenticate, async (req: any, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    const user = await User.findOne({ id: req.params.id });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const previousRole = user.role;
    const previousDepartment = user.department;

    if (req.user.id === req.params.id && req.body.role && req.body.role !== 'Admin') {
      return res.status(400).json({ message: 'You cannot change the currently signed-in admin account to a non-admin role' });
    }

    const allowedFields = ['name', 'role', 'department', 'password'] as const;
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key, value]) => {
        if (!allowedFields.includes(key as (typeof allowedFields)[number])) return false;
        if (key === 'password') return Boolean(String(value || '').trim());
        return true;
      })
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid user fields to update' });
    }

    // If password is provided, hash it
    if (updates.password) {
      if (!isStrongPassword(String(updates.password))) {
        return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
      }
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(String(updates.password), salt);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'department')) {
      updates.department = updates.department ? normalizeDepartment(String(updates.department)) : undefined;
    }

    Object.assign(user, updates);
    await user.save();

    let reassignmentSummary = null;
    const becameStaff = user.role === 'Staff' && previousRole !== 'Staff';
    const movedToNewDepartmentAsStaff = user.role === 'Staff' && previousDepartment !== user.department;
    if (becameStaff || movedToNewDepartmentAsStaff) {
      reassignmentSummary = await autoAssignExistingGrievancesToStaff({
        id: user.id,
        name: user.name,
        department: user.department ?? undefined
      });
    }

    await notifyManyUsers(
      [user.id],
      'Account Updated',
      `Your account details were updated${user.department ? ` for ${user.department}` : ''}.`,
      'system'
    );

    res.json({
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      department: user.department ?? undefined,
      reassignmentSummary
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/users/:id', authenticate, async (req: any, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete the currently signed-in admin account' });
    }

    const linkedGrievance = await Grievance.findOne({
      $or: [
        { studentId: req.params.id },
        { assignedToId: req.params.id },
        { 'conversation.senderId': req.params.id },
        { 'conversation.recipientId': req.params.id },
        { 'history.userId': req.params.id }
      ]
    }).select('id');

    if (linkedGrievance) {
      return res.status(400).json({
        message: `Cannot delete this user because they are linked to grievance #${linkedGrievance.id}`
      });
    }

    const result = await User.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'User not found' });

    const adminIds = await getAdminIds();
    await notifyManyUsers(
      adminIds,
      'User Deleted',
      `User ${req.params.id} has been deleted from the system.`,
      'system'
    );
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/change-password', authenticate, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await notifyManyUsers(
      [user.id],
      'Password Changed',
      'Your account password was changed successfully.',
      'system'
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users/staff', authenticate, async (req, res) => {
  try {
    if (!['Staff', 'Admin'].includes((req as any).user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const staff = await User.find({ role: 'Staff' }).select('id name role department');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users/:id', authenticate, async (req: any, res) => {
    try {
        const user = await User.findOne({ id: req.params.id }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (req.user.role === 'Admin') {
          return res.json(user);
        }

        if (req.user.id === req.params.id) {
          return res.json(user);
        }

        if (req.user.role === 'Staff') {
          const grievance = await Grievance.findOne({
            studentId: user.id,
            $or: [{ assignedToId: req.user.id }, { department: req.user.department }]
          }).select('id');

          if (grievance) {
            return res.json({
              id: user.id,
              name: user.name,
              role: user.role,
              email: user.email,
              department: user.department
            });
          }

          if (user.role === 'Staff' || user.role === 'Admin') {
            return res.json({
              id: user.id,
              name: user.name,
              role: user.role,
              department: user.department
            });
          }
        }

        if (req.user.role === 'Student' && (user.role === 'Staff' || user.role === 'Admin')) {
          const grievance = await Grievance.findOne({
            studentId: req.user.id,
            assignedToId: user.id
          }).select('id');

          if (grievance || user.role === 'Admin') {
            return res.json({
              id: user.id,
              name: user.name,
              role: user.role,
              department: user.department
            });
          }
        }

        return res.status(403).json({ message: 'Forbidden' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Seed Initial Data if empty ---
async function seed() {
  console.log('--- Database Seeding Started ---');
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);
    console.log('Default hashed password generated');
    
    const adminEmail = 'admin@dait.com';
    const adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log('Seeding admin user...');
      await new User({ 
        id: 'ADMIN-01', 
        name: 'Admin (DAIT)', 
        role: 'Admin', 
        email: adminEmail, 
        password: hashedPassword, 
        department: 'Administrative' 
      }).save();
      console.log('Admin user seeded successfully');
    } else {
      console.log('Admin user already exists. Keeping existing password.');
    }

    const count = await User.countDocuments();
    if (count <= 1) {
      console.log('Seeding other initial users...');
      const initialUsers = [
        { id: 'STU-01', name: 'SK', role: 'Student', email: 'sk@dait.com', password: hashedPassword },
        { id: 'STAFF-TECH', name: 'Mr. Technical', role: 'Staff', email: 'tech@dait.com', password: hashedPassword, department: 'Technical' },
        { id: 'STAFF-ACAD', name: 'Dr. Academic', role: 'Staff', email: 'acad@dait.com', password: hashedPassword, department: 'Academic' },
      ];
      await User.insertMany(initialUsers);
      console.log('Database seeded with initial users');
    } else {
      console.log(`Database already has ${count} users. Skipping seed.`);
    }
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

// --- Vite Integration ---

async function startServer() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    await seed();
    await cleanupOldNotifications(30);
    setInterval(() => cleanupOldNotifications(30), 24 * 60 * 60 * 1000);
  } catch (error) {
    console.error('Failed to connect to MongoDB during startup:', error);
  }

  // Always set up Vite or static serving so the frontend is accessible
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ WARNING: Server started without a database connection.');
    }
  });
}

startServer();
