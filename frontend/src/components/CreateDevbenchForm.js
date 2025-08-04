import React, { useState } from 'react';

/**
 * CreateDevbenchForm component for creating new devbenches
 * Features client-side validation and loading states
 * Displays feedback without using alert()
 */
function CreateDevbenchForm({ onCreate, onCancel }) {
  const [devbenchName, setDevbenchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    
    // Client-side validation
    if (!devbenchName.trim()) {
      setError('Please enter a devbench name');
      return;
    }

    // Basic name validation
    const trimmedName = devbenchName.trim();
    if (trimmedName.length < 3) {
      setError('Devbench name must be at least 3 characters long');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Devbench name must be less than 50 characters');
      return;
    }

    // Check for valid characters (alphanumeric, hyphens, underscores)
    const validNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validNameRegex.test(trimmedName)) {
      setError('Devbench name can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    setIsCreating(true);

    try {
      await onCreate(trimmedName);
      
      // Clear form on success
      setDevbenchName('');
      
    } catch (error) {
      // Error is handled by parent component
      console.error('Form submission error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Create New Devbench</h2>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-500"
          disabled={isCreating}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="devbenchName" className="block text-sm font-medium text-gray-700 mb-2">
            Devbench Name
          </label>
          <input
            id="devbenchName"
            type="text"
            value={devbenchName}
            onChange={(e) => {
              console.log('Input changed:', e.target.value);
              setDevbenchName(e.target.value);
            }}
            placeholder="e.g., my-development-vm"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            disabled={isCreating}
            autoComplete="off"
          />
          <p className="mt-1 text-sm text-gray-500">
            Use letters, numbers, hyphens, and underscores only (3-50 characters)
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {isCreating ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating devbench...
              </div>
            ) : (
              'VM will be provisioned on remote server'
            )}
          </div>
          
          <div className="space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !devbenchName.trim()}
              className={`btn-primary ${(isCreating || !devbenchName.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isCreating ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </div>
              ) : (
                'Create Devbench'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Information Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>Your devbench will be created on the remote server (asf-tb.duckdns.org)</li>
              <li>The provisioning process typically takes 2-5 minutes</li>
              <li>You'll see real-time status updates as the VM is being created</li>
              <li>Once ready, you'll receive SSH connection details</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateDevbenchForm;
