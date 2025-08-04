import React from 'react';

/**
 * DevbenchCard component that displays individual devbench information
 * Shows name, status, creation time, and details in a responsive card layout
 */
function DevbenchCard({ devbench, onActivate, onCheckStatus, isActivating, isCheckingStatus, onViewLogs, formatDate }) {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'creating':
      case 'provisioning':
      case 'activating':
        return 'bg-blue-100 text-blue-800';
      case 'error':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'stopped':
      case 'deleted':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'creating':
        return 'status-creating';
      case 'active':
        return 'status-active';
      case 'error':
        return 'status-error';
      default:
        return 'status-creating';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'creating':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'active':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Format creation date
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString();
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {devbench.name}
          </h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(devbench.status)}`}>
            {devbench.status || 'Unknown'}
          </span>
        </div>
        
        <div className="mt-2 text-sm text-gray-500">
          <p>Created: {formatDate(devbench.createdAt)}</p>
        </div>

        {devbench.details && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">{devbench.details}</p>
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-5 py-3 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => onActivate(devbench.id, devbench.name)}
            disabled={isActivating === devbench.id || devbench.status === 'Running'}
            className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white ${
              devbench.status === 'Running' || isActivating === devbench.id
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isActivating === devbench.id ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Activating...
              </>
            ) : (
              'Activate'
            )}
          </button>

          <button
            onClick={() => onCheckStatus(devbench.id)}
            disabled={isCheckingStatus === devbench.id}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            {isCheckingStatus === devbench.id ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking...
              </>
            ) : (
              'Check Status'
            )}
          </button>
        </div>

        {devbench.has_logs && (
          <button
            onClick={() => onViewLogs(devbench.id)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Logs
          </button>
        )}
      </div>
    </div>
  );
}

export default DevbenchCard;
