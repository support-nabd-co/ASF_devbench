import React, { useEffect } from 'react';

/**
 * Notification component for displaying toast-style messages
 * Replaces alert() with a custom UI element
 * Supports success, error, warning, and info message types
 */
function Notification({ message, type = 'info', onClose, duration = 5000 }) {
  // Auto-close notification after specified duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  // Get styling based on notification type
  const getNotificationStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-success-50 border-success-200 text-success-800',
          icon: 'text-success-400',
          iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        };
      case 'error':
        return {
          container: 'bg-error-50 border-error-200 text-error-800',
          icon: 'text-error-400',
          iconPath: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: 'text-yellow-400',
          iconPath: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
        };
      case 'info':
      default:
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'text-blue-400',
          iconPath: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
        };
    }
  };

  const styles = getNotificationStyles(type);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top duration-300">
      <div className={`border rounded-lg p-4 shadow-lg ${styles.container}`}>
        <div className="flex items-start">
          {/* Icon */}
          <div className="flex-shrink-0">
            <svg className={`w-5 h-5 ${styles.icon}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d={styles.iconPath} clipRule="evenodd" />
            </svg>
          </div>
          
          {/* Message */}
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
          
          {/* Close Button */}
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                type === 'success' ? 'text-success-500 hover:bg-success-100 focus:ring-success-600' :
                type === 'error' ? 'text-error-500 hover:bg-error-100 focus:ring-error-600' :
                type === 'warning' ? 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600' :
                'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
              }`}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notification;
