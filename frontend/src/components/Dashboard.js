import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import DevbenchCard from './DevbenchCard';
import CreateDevbenchForm from './CreateDevbenchForm';
import Notification from './Notification';

/**
 * Dashboard component that displays user's devbenches and allows creating new ones
 * Features real-time updates via Firestore onSnapshot
 * Includes authentication guard and user management
 */
function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [devbenches, setDevbenches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [creatingDevbench, setCreatingDevbench] = useState(false);
  const [activatingDevbench, setActivatingDevbench] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(null);

  // Extract username from JWT token
  useEffect(() => {
    const token = localStorage.getItem('devbench_token');
    if (token) {
      try {
        // Decode JWT payload (simple base64 decode for demo purposes)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ username: payload.username });
      } catch (error) {
        console.error('Error decoding token:', error);
        onLogout();
      }
    } else {
      onLogout();
    }
  }, [onLogout]);

  // Fetch devbenches function (moved to component level)
  const fetchDevbenches = async () => {
    try {
      const token = localStorage.getItem('devbench_token');
      const response = await axios.get('/api/devbenches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setDevbenches(response.data);
      setIsLoading(false);

      // Set up Firestore real-time listener if Firebase is configured
      setupRealtimeListener();

    } catch (error) {
      console.error('Error fetching devbenches:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        onLogout();
      } else {
        setError('Failed to load devbenches. Please refresh the page.');
        setIsLoading(false);
      }
    }
  };

  // Fetch initial devbenches and set up real-time listener
  useEffect(() => {
    if (!user?.username) return;

    fetchDevbenches();
  }, [user, onLogout]);

  // Set up Firestore real-time listener
  const setupRealtimeListener = () => {
    try {
      // Check if Firebase configuration is available
      if (typeof window !== 'undefined' && window.__firebase_config && window.__app_id) {
        const app = initializeApp(window.__firebase_config);
        const db = getFirestore(app);
        
        const devbenchesRef = collection(
          db, 
          'artifacts', 
          window.__app_id, 
          'users', 
          user.username, 
          'devbenches'
        );
        
        const q = query(devbenchesRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const updatedDevbenches = [];
          snapshot.forEach((doc) => {
            updatedDevbenches.push({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.() || new Date()
            });
          });
          
          setDevbenches(updatedDevbenches);
          console.log('✅ Real-time update: Devbenches refreshed');
        }, (error) => {
          console.error('❌ Firestore listener error:', error);
          // Fall back to polling if real-time fails
          setupPolling();
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
      } else {
        // Fall back to polling if Firebase not configured
        setupPolling();
      }
    } catch (error) {
      console.error('❌ Error setting up real-time listener:', error);
      setupPolling();
    }
  };

  // Fallback polling mechanism
  const setupPolling = () => {
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('devbench_token');
        const response = await axios.get('/api/devbenches', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setDevbenches(response.data);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  };

  // Handle devbench creation
  const handleCreateDevbench = async (devbenchName) => {
    try {
      const token = localStorage.getItem('devbench_token');
      const response = await axios.post('/api/devbenches/create', 
        { devbenchName },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Show success notification
      showNotification('Devbench creation started successfully!', 'success');
      
      // The new devbench will appear automatically via real-time updates
      return response.data;

    } catch (error) {
      console.error('Error creating devbench:', error);
      
      let errorMessage = 'Failed to create devbench. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        onLogout();
        return;
      }
      
      showNotification(errorMessage, 'error');
      throw error;
    }
  };

  // Handle devbench activation
  const handleActivateDevbench = async (devbenchId, devbenchName) => {
    setActivatingDevbench(devbenchId);
    setError('');
    setNotification(null);

    try {
      const token = localStorage.getItem('devbench_token');
      const response = await axios.post('/api/devbenches/activate', 
        { devbenchId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        showNotification(`Devbench "${devbenchName}" activated successfully!`, 'success');
        // Refresh the list to show updated status
        fetchDevbenches();
      } else {
        setError(response.data.error || 'Failed to activate devbench');
      }
    } catch (error) {
      console.error('Error activating devbench:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setActivatingDevbench(null);
    }
  };

  // Handle devbench status check
  const handleCheckStatus = async (devbenchId, devbenchName) => {
    setCheckingStatus(devbenchId);

    try {
      const token = localStorage.getItem('devbench_token');
      const response = await axios.get(`/api/devbenches/status/${devbenchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        showNotification(`Status check completed for "${devbenchName}": ${response.data.status}`, 'success');
        // Refresh the list to show updated status
        fetchDevbenches();
      } else {
        setError(response.data.error || 'Failed to check devbench status');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setCheckingStatus(null);
    }
  };

  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handle logout
  const handleLogout = () => {
    onLogout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your devbenches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {/* NABD Solutions Logo */}
              <img 
                src="/logo-nabd.png" 
                alt="NABD Solutions" 
                className="h-10 w-auto"
                onError={(e) => {
                  // Fallback if logo doesn't exist
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'inline-block';
                }}
              />
              <div 
                className="hidden bg-blue-600 text-white px-3 py-1 rounded font-bold text-sm"
                style={{ display: 'none' }}
              >
                NABD
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Devbench Manager</h1>
                <p className="text-sm text-gray-600">Welcome back, {user?.username}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Create New Devbench Section */}
        <div className="mb-8">
          <CreateDevbenchForm onCreateDevbench={handleCreateDevbench} />
        </div>

        {/* Active Devbenches Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Devbenches ({devbenches.length})
            </h2>
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Real-time updates
            </div>
          </div>

          {devbenches.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No devbenches yet</h3>
              <p className="text-gray-600 mb-4">Create your first devbench to get started with virtual machine management.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devbenches.map((devbench) => (
                <div key={devbench.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">{devbench.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${devbench.status === 'Active' ? 'bg-green-100 text-green-800' : devbench.status === 'Inactive' ? 'bg-gray-100 text-gray-800' : devbench.status === 'Provisioning' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                          {devbench.status || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Created:</span> {devbench.createdAt}</p>
                        {devbench.updatedAt && (
                          <p><span className="font-medium">Updated:</span> {devbench.updatedAt}</p>
                        )}
                        {devbench.combinedName && (
                          <p><span className="font-medium">Full Name:</span> {devbench.combinedName}</p>
                        )}
                        {devbench.details?.ip && (
                          <p><span className="font-medium">IP Address:</span> {devbench.details.ip}</p>
                        )}
                        {devbench.details?.sshCommand && (
                          <p><span className="font-medium">SSH Command:</span> 
                            <code className="ml-1 px-2 py-1 bg-gray-100 rounded text-xs">{devbench.details.sshCommand}</code>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {/* Check Status Button */}
                      <button
                        onClick={() => handleCheckStatus(devbench.id, devbench.name)}
                        disabled={checkingStatus === devbench.id}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {checkingStatus === devbench.id ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Checking...
                          </div>
                        ) : (
                          'Check Status'
                        )}
                      </button>

                      {/* Activate Button */}
                      <button
                        onClick={() => handleActivateDevbench(devbench.id, devbench.name)}
                        disabled={activatingDevbench === devbench.id || devbench.status === 'Active'}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {activatingDevbench === devbench.id ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Activating...
                          </div>
                        ) : devbench.status === 'Active' ? (
                          'Active'
                        ) : (
                          'Activate'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error Details */}
                  {devbench.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        <span className="font-medium">Error:</span> {devbench.error}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
