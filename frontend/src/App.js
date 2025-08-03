import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './index.css';

/**
 * Main App component that handles routing and authentication state
 * Uses React Router for client-side routing between Login and Dashboard
 */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication token on app load
  useEffect(() => {
    const token = localStorage.getItem('devbench_token');
    if (token) {
      // TODO: Optionally validate token with backend
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Handle successful login
  const handleLogin = (token) => {
    localStorage.setItem('devbench_token', token);
    setIsAuthenticated(true);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('devbench_token');
    setIsAuthenticated(false);
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
          {/* Login Route */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Login onLogin={handleLogin} />
            } 
          />
          
          {/* Dashboard Route */}
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? 
                <Dashboard onLogout={handleLogout} /> : 
                <Navigate to="/" replace />
            } 
          />
          
          {/* Catch-all route - redirect to appropriate page */}
          <Route 
            path="*" 
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
