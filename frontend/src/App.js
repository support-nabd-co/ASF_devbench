import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import './index.css';

/**
 * Main App component that handles routing and authentication state
 * Uses React Router for client-side routing between Login and Dashboard
 */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication tokens on app load
  useEffect(() => {
    const token = localStorage.getItem('devbench_token');
    const adminToken = localStorage.getItem('devbench_admin_token');
    
    if (token) {
      // TODO: Optionally validate token with backend
      setIsAuthenticated(true);
    }
    
    if (adminToken) {
      // TODO: Optionally validate admin token with backend
      setIsAdminAuthenticated(true);
    }
    
    setIsLoading(false);
  }, []);

  // Handle successful login
  const handleLogin = (token) => {
    localStorage.setItem('devbench_token', token);
    setIsAuthenticated(true);
  };

  // Handle user logout
  const handleLogout = () => {
    localStorage.removeItem('devbench_token');
    setIsAuthenticated(false);
  };

  // Handle admin login
  const handleAdminLogin = (token) => {
    localStorage.setItem('devbench_admin_token', token);
    setIsAdminAuthenticated(true);
  };

  // Handle admin logout
  const handleAdminLogout = () => {
    localStorage.removeItem('devbench_admin_token');
    setIsAdminAuthenticated(false);
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* User Login Route */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Login onLogin={handleLogin} />
            } 
          />
          
          {/* User Dashboard Route */}
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? 
                <Dashboard onLogout={handleLogout} /> : 
                <Navigate to="/" replace />
            } 
          />
          
          {/* Admin Login Route */}
          <Route 
            path="/admin" 
            element={
              isAdminAuthenticated ? 
                <Navigate to="/admin/panel" replace /> : 
                <AdminLogin onAdminLogin={handleAdminLogin} />
            } 
          />
          
          {/* Admin Panel Route */}
          <Route 
            path="/admin/panel" 
            element={
              isAdminAuthenticated ? 
                <AdminPanel onLogout={handleAdminLogout} /> : 
                <Navigate to="/admin" replace />
            } 
          />
          
          {/* Catch-all route - redirect to appropriate page */}
          <Route 
            path="*" 
            element={
              <Navigate to={
                isAdminAuthenticated ? "/admin/panel" : 
                isAuthenticated ? "/dashboard" : "/"
              } replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
