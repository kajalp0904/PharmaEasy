/**
 * Centralized API Client for PharmaEasy
 * Handles all API communication with automatic token injection and error handling
 */

const API_BASE = 'https://pharmaeasy-backend-5ht5.onrender.com/api';

/**
 * Display notification to user
 * @param {string} message - Message to display
 * @param {string} type - Notification type: 'success', 'error', 'info', 'warning'
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

/**
 * Main API call wrapper with automatic token injection and error handling
 * @param {string} endpoint - API endpoint (e.g., '/medicines', '/login')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<object>} - Response data
 */
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
      return;
    }
    
    if (!response.ok) {
      const errorMessage = data.message || data.error || 'An error occurred';
      showNotification(errorMessage, 'error');
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    if (error.name === 'TypeError') {
      showNotification('Network error. Please check your connection.', 'error');
    }
    
    throw error;
  }
}

/**
 * Logout user - clear token and redirect to login
 */
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
}

/**
 * Check if user is authenticated - redirect to login if not
 * Call this function on page load for protected pages
 */
function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
  }
}

/**
 * Get current authentication token
 * @returns {string|null} - JWT token or null if not authenticated
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * Set authentication token
 * @param {string} token - JWT token to store
 */
function setToken(token) {
  localStorage.setItem('token', token);
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if token exists
 */
function isAuthenticated() {
  return !!localStorage.getItem('token');
}