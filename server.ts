
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
const JWT_SECRET = process.env.JWT_SECRET || 'DAIT-secret-key-2025';

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection Check Middleware
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1 && req.path.startsWith('/api')) {
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
    name: String,
    type: String,
    data: String
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
      query = { $or: [{ assignedToId: req.user.id }, { department: req.user.department }] };
    }
    const grievances = await Grievance.find(query).sort({ timestamp: -1 });
    res.json(grievances);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/grievances', authenticate, async (req: any, res) => {
  try {
    console.log('--- Grievance Submission Start ---');
    console.log('User:', JSON.stringify(req.user));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Normalize fields to match enums
    const status = (req.body.status || 'pending').toLowerCase();
    const severity = (req.body.severity || 'Low').charAt(0).toUpperCase() + (req.body.severity || 'Low').slice(1).toLowerCase();
    
    const grievanceData = {
      ...req.body,
      status: ['pending', 'in-progress', 'resolved', 'closed'].includes(status) ? status : 'pending',
      severity: ['Low', 'Medium', 'High', 'Critical'].includes(severity) ? severity : 'Low',
      studentId: req.user.id,
      timestamp: Date.now(),
      lastStatusChange: Date.now(),
      history: [{
        status: ['pending', 'in-progress', 'resolved', 'closed'].includes(status) ? status : 'pending',
        timestamp: Date.now(),
        userId: req.user.id,
        remark: 'Grievance submitted'
      }]
    };

    console.log('Normalized Grievance Data:', JSON.stringify(grievanceData, null, 2));
    
    const grievance = new Grievance(grievanceData);
    
    await grievance.save();
    console.log('Grievance saved successfully:', grievance.id);

    // Notify Admin/Staff
    try {
      const staff = await User.findOne({ role: 'Staff', department: grievance.department });
      if (staff) {
        createNotification(staff.id, 'New Grievance Filed', `A new grievance #${grievance.id} has been filed in your department: ${grievance.title}`, 'system', `/grievances/${grievance.id}`);
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

    // Update logic
    Object.assign(grievance, req.body);
    await grievance.save();

    // If status changed to resolved, notify student
    if (req.body.status === 'resolved') {
        const student = await User.findOne({ id: grievance.studentId });
        if (student) {
            createNotification(student.id, 'Grievance Resolved', `Your grievance #${grievance.id} has been marked as resolved.`, 'status_change', `/grievances/${grievance.id}`);
        }
    } else if (req.body.status) {
        const student = await User.findOne({ id: grievance.studentId });
        if (student) {
            createNotification(student.id, 'Grievance Status Updated', `The status of your grievance #${grievance.id} has been changed to ${req.body.status}.`, 'status_change', `/grievances/${grievance.id}`);
        }
    }

    res.json(grievance);
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

        const newMessage = {
            id: 'MSG-' + Math.random().toString(36).substr(2, 9),
            senderId: user.id,
            senderRole: user.role,
            senderName: user.name,
            content: req.body.content,
            timestamp: Date.now(),
            type: req.body.type || 'student-staff',
            recipientId: req.body.recipientId,
            recipientName: req.body.recipientName
        };

        grievance.conversation.push(newMessage);
        await grievance.save();

        // Notify recipient if specified
        if (req.body.recipientId) {
            createNotification(req.body.recipientId, 'New Message Received', `You have a new message from ${user.name} regarding grievance #${grievance.id}`, 'message', `/grievances/${grievance.id}`);
        }

        res.json(grievance);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.patch('/api/grievances/:id/status', authenticate, async (req: any, res: any) => {
  try {
    const { status, remark } = req.body;
    const grievance = await Grievance.findOne({ id: req.params.id });
    if (!grievance) return res.status(404).json({ message: 'Grievance not found' });

    grievance.status = status;
    grievance.lastStatusChange = Date.now();
    grievance.history.push({
      status,
      timestamp: Date.now(),
      userId: req.user.id,
      remark: remark || `Status updated to ${status}`
    });

    await grievance.save();

    // Notify student
    const student = await User.findOne({ id: grievance.studentId });
    if (student) {
      createNotification(
        student.id, 
        'Grievance Status Updated', 
        `Your grievance #${grievance.id} status is now: ${status}`, 
        'status_change', 
        `/grievances/${grievance.id}`
      );
    }

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
    const { id, name, email, password, role, department } = req.body;
    
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
      department
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
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
    const defaultPassword = await bcrypt.hash('password123', salt);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const userData of users) {
      try {
        const { id, name, email, role, department } = userData;
        
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
          department
        });

        await newUser.save();
        results.success++;
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

    // If password is provided, hash it
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }

    Object.assign(user, req.body);
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/users/:id', authenticate, async (req: any, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    const result = await User.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'User not found' });
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

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users/staff', authenticate, async (req, res) => {
  try {
    const staff = await User.find({ role: 'Staff' }).select('-password');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/users/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.params.id }).select('-password');
        res.json(user);
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
        id: 'ADM-PRIN', 
        name: 'Principal (DAIT)', 
        role: 'Admin', 
        email: adminEmail, 
        password: hashedPassword, 
        department: 'Administrative' 
      }).save();
      console.log('Admin user seeded successfully');
    } else {
      // Ensure password is 'password' for the demo
      adminUser.password = hashedPassword;
      await adminUser.save();
      console.log('Admin password reset to "password" for email:', adminEmail);
    }

    const count = await User.countDocuments();
    if (count <= 1) {
      console.log('Seeding other initial users...');
      const initialUsers = [
        { id: 'STU-01', name: 'Kj', role: 'Student', email: 'sk@dait.com', password: hashedPassword },
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
