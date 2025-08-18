import React from 'react';
import { CalendarIcon, ClockIcon, TerminalIcon, DesktopComputerIcon, ClipboardCopyIcon } from '@heroicons/react/solid';

/**
 * DevbenchCard component that displays individual devbench information
 * Shows name, status, creation time, and details in a responsive card layout
 */
function DevbenchCard({ devbench, onActivate, onCheckStatus, isActivating, isCheckingStatus, onViewLogs, formatDate, showNotification }) {
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

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {devbench.name}
            {devbench.ip_address && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {devbench.ip_address}
              </span>
            )}
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(devbench.status)}`}>
            {devbench.status}
          </span>
        </div>
        
        <div className="mt-2 text-sm text-gray-500 space-y-1">
          <div className="flex items-center">
            <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span>Created: {formatDate(devbench.created_at)}</span>
          </div>
          {devbench.updated_at && (
            <div className="flex items-center">
              <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
              <span>Updated: {formatDate(devbench.updated_at)}</span>
            </div>
          )}
          
          {/* SSH Connection Info */}
          {devbench.ssh_info && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-start">
                <TerminalIcon className="flex-shrink-0 h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-1.5">
                  <span className="text-xs font-medium text-gray-500">SSH:</span>
                  <div className="flex items-center mt-0.5">
                    <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {devbench.ssh_info}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(devbench.ssh_info);
                        showNotification('SSH command copied to clipboard!', 'success');
                      }}
                      className="ml-2 text-gray-400 hover:text-gray-500"
                      title="Copy to clipboard"
                    >
                      <ClipboardCopyIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* VNC Connection Info */}
          {devbench.vnc_info && (
            <div className="mt-1">
              <div className="flex items-start">
                <DesktopComputerIcon className="flex-shrink-0 h-4 w-4 text-gray-400 mt-0.5" />
                <div className="ml-1.5">
                  <span className="text-xs font-medium text-gray-500">VNC:</span>
                  <div className="flex items-center mt-0.5">
                    <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {devbench.vnc_info}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(devbench.vnc_info);
                        showNotification('VNC info copied to clipboard!', 'success');
                      }}
                      className="ml-2 text-gray-400 hover:text-gray-500"
                      title="Copy to clipboard"
                    >
                      <ClipboardCopyIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {devbench.details && (
          <div className="mt-4">
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
              {devbench.details}
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => onViewLogs(devbench.id)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View Logs
          </button>
          
          <button
            onClick={() => onCheckStatus(devbench.id)}
            disabled={isCheckingStatus === devbench.id}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isCheckingStatus === devbench.id ? 'Checking...' : 'Check Status'}
          </button>
        </div>
        
        <div>
          <button
            onClick={() => onActivate(devbench.id, devbench.name)}
            disabled={isActivating === devbench.id || devbench.status === 'Running'}
            className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white ${
              devbench.status === 'Running' || isActivating === devbench.id
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {isActivating === devbench.id ? 'Activating...' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DevbenchCard;
