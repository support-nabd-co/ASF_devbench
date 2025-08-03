import React from 'react';

/**
 * DevbenchCard component that displays individual devbench information
 * Shows name, status, creation time, and details in a responsive card layout
 */
function DevbenchCard({ devbench }) {
  const { name, status, createdAt, details = {} } = devbench;

  // Format creation date
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString();
  };

  // Get status styling
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

  // Get status icon
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

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 truncate" title={name}>
            {name}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Created {formatDate(createdAt)}
          </p>
        </div>
        
        {/* Status Badge */}
        <span className={`${getStatusClass(status)} flex items-center ml-2`}>
          {getStatusIcon(status)}
          <span className="ml-1 capitalize">{status || 'Unknown'}</span>
        </span>
      </div>

      {/* Details Section */}
      <div className="space-y-3">
        {/* IP Address */}
        {details.ip && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
              <span className="text-sm font-medium text-gray-700">IP Address</span>
            </div>
            <code className="text-sm bg-white px-2 py-1 rounded border font-mono">
              {details.ip}
            </code>
          </div>
        )}

        {/* SSH Command */}
        {details.sshCommand && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">SSH Command</span>
            </div>
            <code className="text-xs bg-white px-2 py-1 rounded border font-mono block break-all">
              {details.sshCommand}
            </code>
          </div>
        )}

        {/* Summary/Output */}
        {details.summary && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-700">Status</span>
            </div>
            <p className="text-sm text-blue-600">{details.summary}</p>
          </div>
        )}

        {/* Error Details */}
        {status === 'Error' && details.error && (
          <div className="p-3 bg-error-50 rounded-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-error-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-error-700">Error Details</span>
            </div>
            <p className="text-sm text-error-600">{details.error}</p>
          </div>
        )}

        {/* Creating Status */}
        {status === 'Creating' && (
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-400 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm text-yellow-700">Provisioning virtual machine...</span>
            </div>
          </div>
        )}

        {/* No details available */}
        {status === 'Active' && !details.ip && !details.sshCommand && !details.summary && (
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <span className="text-sm text-gray-500">VM is active but details are not available</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DevbenchCard;
