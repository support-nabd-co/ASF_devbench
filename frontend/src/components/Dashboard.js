import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DevbenchCard from './DevbenchCard';
import CreateDevbenchForm from './CreateDevbenchForm';
import Notification from './Notification';

/**
 * Dashboard component that displays user's devbenches and allows creating new ones
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
  const [creationLogs, setCreationLogs] = useState({}); // Track logs for each devbench
  const [activeLogs, setActiveLogs] = useState(null); // Currently viewed logs

  // Fetch current user and their devbenches
  useEffect(() => {
    const fetchUserAndDevbenches = async () => {
      try {
        // Fetch current user using validate-token endpoint
        const userResponse = await axios.get('/api/validate-token', { withCredentials: true });
        setUser(userResponse.data.user);
        
        // Fetch user's devbenches
        const devbenchesResponse = await axios.get('/api/devbenches', { withCredentials: true });
        setDevbenches(devbenchesResponse.data);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error.response?.status === 401) {
          onLogout();
        } else {
          setError('Failed to load dashboard data. Please refresh the page.');
          setIsLoading(false);
        }
      }
    };

    fetchUserAndDevbenches();
    
    // Set up polling for devbenches updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get('/api/devbenches', { withCredentials: true });
        setDevbenches(response.data);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [onLogout]);

  // Handle devbench creation
  const handleCreateDevbench = async (devbenchName) => {
    try {
      const response = await axios.post(
        '/api/devbenches/create',
        { devbenchName: devbenchName },
        { withCredentials: true }
      );

      // Initialize logs for this devbench
      const newDevbench = response.data;
      setCreationLogs(prev => ({
        ...prev,
        [newDevbench.id]: [`[${new Date().toISOString()}] Creation started...`]
      }));
      setActiveLogs(newDevbench.id);

      // Start polling for logs
      const logInterval = setInterval(async () => {
        try {
          const logResponse = await axios.get(`/api/devbenches/${newDevbench.id}/logs`, { 
            withCredentials: true 
          });
          
          if (logResponse.data && logResponse.data.logs) {
            setCreationLogs(prev => ({
              ...prev,
              [newDevbench.id]: logResponse.data.logs
            }));
          }
        } catch (error) {
          console.error('Error fetching logs:', error);
        }
      }, 2000); // Poll every 2 seconds

      // Clean up interval when component unmounts or devbench is created
      setTimeout(() => clearInterval(logInterval), 600000); // Stop after 10 minutes

      showNotification('Devbench creation started successfully!', 'success');
      return response.data;

    } catch (error) {
      console.error('Error creating devbench:', error);
      
      let errorMessage = 'Failed to create devbench. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 401) {
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
      const response = await axios.post(
        '/api/devbenches/activate',
        { devbenchId },
        { withCredentials: true }
      );

      if (response.status === 200) {
        showNotification(`Devbench "${devbenchName}" activated successfully!`, 'success');
        // Refresh the list to show updated status
        const updatedResponse = await axios.get('/api/devbenches', { withCredentials: true });
        setDevbenches(updatedResponse.data);
      }
    } catch (error) {
      console.error('Error activating devbench:', error);
      let errorMessage = 'Failed to activate devbench. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 401) {
        onLogout();
        return;
      }
      showNotification(errorMessage, 'error');
    } finally {
      setActivatingDevbench(null);
    }
  };

  // Handle devbench status check
  const handleCheckStatus = async (devbenchId) => {
    setCheckingStatus(devbenchId);
    try {
      const response = await axios.get(`/api/devbenches/${devbenchId}/status`, { withCredentials: true });
      
      // Update the specific devbench status
      setDevbenches(prevDevbenches => 
        prevDevbenches.map(db => 
          db.id === devbenchId ? { ...db, status: response.data.status } : db
        )
      );
      
      showNotification(`Devbench status: ${response.data.status}`, 'info');
    } catch (error) {
      console.error('Error checking status:', error);
      showNotification('Failed to check devbench status', 'error');
    } finally {
      setCheckingStatus(null);
    }
  };

  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Refresh Page
          </button>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Devbenches</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.username || 'User'}!
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setCreatingDevbench(true)}
                className="btn-primary"
              >
                New Devbench
              </button>
              <button
                onClick={onLogout}
                className="btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification */}
        {notification && (
          <div className={`mb-6 ${notification.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {notification.message}
          </div>
        )}

        {/* Devbenches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devbenches.map((devbench) => (
            <DevbenchCard
              key={devbench.id}
              devbench={devbench}
              onActivate={handleActivateDevbench}
              onCheckStatus={handleCheckStatus}
              isActivating={activatingDevbench === devbench.id}
              isCheckingStatus={checkingStatus === devbench.id}
              formatDate={formatDate}
            />
          ))}

          {devbenches.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">No devbenches yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new devbench.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setCreatingDevbench(true)}
                  className="btn-primary"
                >
                  New Devbench
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Log Viewer Modal */}
      {activeLogs !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Devbench Creation Logs</h3>
              <button
                onClick={() => setActiveLogs(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-auto flex-1">
              {creationLogs[activeLogs]?.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">{log}</div>
              ))}
              {!creationLogs[activeLogs]?.length && (
                <div>No logs available yet. Please wait...</div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setActiveLogs(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Devbench Modal */}
      {creatingDevbench && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Create New Devbench</h3>
              <button
                onClick={() => setCreatingDevbench(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CreateDevbenchForm
              onCreate={handleCreateDevbench}
              onCancel={() => setCreatingDevbench(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
