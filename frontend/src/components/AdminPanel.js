import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Notification from './Notification';

/**
 * AdminPanel component for user management
 * Allows admins to create, view, update, and delete users
 */
function AdminPanel({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    is_admin: false
  });

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users', {
        withCredentials: true  // Include session cookies
      });
      
      setUsers(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        onLogout();
      } else {
        showNotification('Failed to load users', 'error');
        setIsLoading(false);
      }
    }
  };

  // Create new user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!newUser.username.trim() || !newUser.password) {
      showNotification('Username and password are required', 'error');
      return;
    }

    try {
      const response = await axios.post('/api/admin/users', 
        {
          username: newUser.username,
          password: newUser.password,
          is_admin: newUser.is_admin || false
        },
        {
          withCredentials: true  // Include session cookies
        }
      );

      setUsers([response.data, ...users]);
      setNewUser({ username: '', password: '', is_admin: false });
      setShowCreateForm(false);
      showNotification('User created successfully!', 'success');
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create user';
      showNotification(errorMessage, 'error');
    }
  };

  // Toggle user admin status
  const toggleAdminStatus = async (userId, currentStatus) => {
    try {
      const response = await axios.put(
        `/api/admin/users/${userId}`, 
        { is_admin: !currentStatus },
        { withCredentials: true }
      );

      setUsers(users.map(user => 
        user.id === userId ? response.data : user
      ));
      
      showNotification(`User admin status updated!`, 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('Failed to update user status', 'error');
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!window.confirm(`Are you sure you want to delete this user? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/api/admin/users/${userId}`, {
        withCredentials: true
      });

      setUsers(users.filter(user => user.id !== userId));
      showNotification('User deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('Failed to delete user', 'error');
    }
  };

  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600">User Management</p>
            </div>
            <button
              onClick={onLogout}
              className="btn-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create User Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Users ({users.length})</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-primary"
            >
              {showCreateForm ? 'Cancel' : 'Add New User'}
            </button>
          </div>

          {/* Create User Form */}
          {showCreateForm && (
            <div className="card mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      placeholder="Enter username"
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      placeholder="Enter password"
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="is_admin" className="block text-sm font-medium text-gray-700 mb-1">
                      Admin
                    </label>
                    <input
                      id="is_admin"
                      type="checkbox"
                      checked={newUser.is_admin}
                      onChange={(e) => setNewUser({...newUser, is_admin: e.target.checked})}
                      className="input-checkbox"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn-primary">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_admin 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_admin ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                        className={`${
                          user.is_admin ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found. Create the first user to get started.</p>
              </div>
            )}
          </div>
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

export default AdminPanel;
