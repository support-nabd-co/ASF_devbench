import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import './index.css';

/**
 * Main App component that handles routing and authentication state
 * Updated to work with Flask session-based authentication
 */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Check for existing authentication session on app load
  useEffect(() => {
    const validateSession = async () => {
      try {
        // Check if we have user info in localStorage
        const storedUser = localStorage.getItem('devbench_user');
        
        if (storedUser) {
          // Validate session with backend
          const response = await fetch('/api/validate-token', {
            method: 'GET',
            credentials: 'include', // Include session cookies
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setCurrentUser(data.user);
            setIsAuthenticated(true);
            
            // Check if user is admin
            if (data.user.is_admin) {
              setIsAdminAuthenticated(true);
            }
          } else {
            // Session is invalid, clear stored data
            localStorage.removeItem('devbench_user');
            setIsAuthenticated(false);
            setIsAdminAuthenticated(false);
            setCurrentUser(null);
          }
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        // Clear stored data on error
        localStorage.removeItem('devbench_user');
        setIsAuthenticated(false);
        setIsAdminAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  // Handle successful login
  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    
    if (user.is_admin) {
      setIsAdminAuthenticated(true);
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call result
      localStorage.removeItem('devbench_user');
      setIsAuthenticated(false);
      setIsAdminAuthenticated(false);
      setCurrentUser(null);
    }
  };

  // Handle admin login
  const handleAdminLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsAdminAuthenticated(true);
  };

  // Handle admin logout
  const handleAdminLogout = async () => {
    await handleLogout(); // Use the same logout logic
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
                <Dashboard onLogout={handleLogout} currentUser={currentUser} /> : 
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
                <AdminPanel onLogout={handleAdminLogout} currentUser={currentUser} /> : 
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
