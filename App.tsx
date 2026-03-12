
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import GrievanceChatbot from './components/GrievanceChatbot';
import GrievanceTracker from './components/GrievanceTracker';
import Dashboard from './components/Dashboard';
import ManagementConsole from './components/ManagementConsole';
import UserManagement from './components/UserManagement';
import AdminSettings from './components/AdminSettings';
import AdminAnalytics from './components/AdminAnalytics';
import ProfileSettings from './components/ProfileSettings';
import Login from './components/Login';
import Landing from './components/Landing';
import { isAuthenticated, getCurrentUser } from './store';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const user = getCurrentUser();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/chatbot" element={
            <ProtectedRoute roles={[UserRole.STUDENT]}>
              <GrievanceChatbot />
            </ProtectedRoute>
          } />
          
          <Route path="/track" element={
            <ProtectedRoute roles={[UserRole.STUDENT]}>
              <GrievanceTracker />
            </ProtectedRoute>
          } />

          <Route path="/manage" element={
            <ProtectedRoute roles={[UserRole.STAFF, UserRole.ADMIN]}>
              <ManagementConsole />
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <UserManagement />
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <AdminAnalytics />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute roles={[UserRole.ADMIN]}>
              <AdminSettings />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
