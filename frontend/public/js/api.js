/**
 * Centralized API Client for Om Medical
 * Handles all API communication with automatic token injection and error handling
 */

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost ? 'http://localhost:5000/api' : 'https://pharmaeasy-a9xk.onrender.com/api';

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
 * Also checks if JWT is expired or malformed
 */
function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }
  // Decode JWT payload and check expiry
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      // Token expired — clear it and redirect
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    }
  } catch (e) {
    // Malformed token — clear it and redirect
    localStorage.removeItem('token');
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

// ========== MOBILE SIDEBAR TOGGLE ==========
// Auto-injects hamburger menu button and handles sidebar toggle on mobile
(function initMobileSidebar() {
  document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return; // No sidebar on this page (login, homepage)

    // Inject hamburger button into the header
    const header = document.querySelector('.main-content .header');
    if (header) {
      const hamburger = document.createElement('button');
      hamburger.className = 'mobile-menu-btn';
      hamburger.id = 'mobileMenuBtn';
      hamburger.innerHTML = '☰';
      hamburger.setAttribute('aria-label', 'Toggle menu');
      header.insertBefore(hamburger, header.firstChild);
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    document.body.appendChild(overlay);

    // Toggle sidebar
    function toggleSidebar() {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
      document.body.classList.toggle('sidebar-open');
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
      document.body.classList.remove('sidebar-open');
    }

    // Event listeners
    const menuBtn = document.getElementById('mobileMenuBtn');
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Close sidebar on nav link click (mobile)
    sidebar.querySelectorAll('.nav-item').forEach(function (link) {
      link.addEventListener('click', closeSidebar);
    });

    // Inject mobile CSS styles
    if (!document.getElementById('mobile-responsive-styles')) {
      const style = document.createElement('style');
      style.id = 'mobile-responsive-styles';
      style.textContent = `
        /* Hamburger button - hidden on desktop */
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #2d2d2d;
          padding: 4px 8px;
          border-radius: 6px;
          line-height: 1;
          transition: 0.2s;
          flex-shrink: 0;
        }
        .mobile-menu-btn:hover {
          background: #f0f0f0;
        }

        /* Overlay - hidden by default */
        .sidebar-overlay {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 998;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .sidebar-overlay.active {
          display: block;
          opacity: 1;
        }

        /* ===== TABLET (max-width: 900px) ===== */
        @media (max-width: 900px) {
          .sidebar {
            width: 220px !important;
          }
          .main-content {
            margin-left: 220px !important;
            padding: 20px 24px !important;
          }
          .header {
            padding: 20px 24px !important;
            margin: -20px -24px 20px -24px !important;
          }
          .header h2 {
            font-size: 22px !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .billing-container {
            flex-direction: column !important;
          }
          .quick-actions {
            flex-direction: column !important;
          }
        }

        /* ===== MOBILE (max-width: 768px) ===== */
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }

          .sidebar {
            width: 260px !important;
            position: fixed !important;
            left: -280px !important;
            top: 0 !important;
            height: 100vh !important;
            z-index: 999 !important;
            transition: left 0.3s ease !important;
            box-shadow: none !important;
          }
          .sidebar.open {
            left: 0 !important;
            box-shadow: 4px 0 20px rgba(0,0,0,0.3) !important;
          }

          .main-content {
            margin-left: 0 !important;
            padding: 16px !important;
            width: 100% !important;
          }

          .header {
            padding: 16px !important;
            margin: -16px -16px 16px -16px !important;
            gap: 10px !important;
          }
          .header h2 {
            font-size: 20px !important;
          }

          /* Prevent body scroll when sidebar is open */
          body.sidebar-open {
            overflow: hidden;
          }

          /* Stats grid */
          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .stat-card {
            padding: 14px 16px !important;
          }
          .stat-value {
            font-size: 22px !important;
          }

          /* Search section */
          .search-section {
            padding: 16px !important;
          }
          .search-bar {
            flex-direction: column !important;
          }
          .search-wrapper, .search-input {
            min-width: unset !important;
            width: 100% !important;
          }
          .search-btn {
            width: 100% !important;
            justify-content: center !important;
          }

          /* Quick actions */
          .quick-actions {
            flex-direction: column !important;
          }
          .quick-action-card {
            flex: 1 1 auto !important;
          }

          /* Tables - horizontal scroll */
          .batch-table-container,
          .table-container {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .batch-table, .bills-table, .medicines-table, .bill-table {
            min-width: 600px !important;
          }

          /* Medicine details grid */
          .medicine-details-grid {
            grid-template-columns: 1fr 1fr !important;
            padding: 14px !important;
          }

          /* Billing page */
          .billing-container {
            flex-direction: column !important;
          }
          .add-items-section, .cart-section {
            flex: 1 1 auto !important;
            padding: 20px !important;
          }

          /* Bill success page */
          .success-card {
            padding: 24px 16px !important;
          }
          .success-title {
            font-size: 22px !important;
          }
          .success-icon span {
            font-size: 48px !important;
            width: 80px !important;
            height: 80px !important;
          }
          .bill-details {
            flex-direction: column !important;
            gap: 12px !important;
          }

          /* Alerts page */
          .tabs {
            flex-direction: column !important;
            gap: 8px !important;
            padding: 12px !important;
          }
          .tab-btn {
            padding: 10px 16px !important;
            font-size: 14px !important;
          }
          .alert-card {
            padding: 14px !important;
          }
          .alert-details {
            flex-direction: column !important;
            gap: 6px !important;
          }

          /* Filter bar (medicines) */
          .filter-bar {
            flex-direction: column !important;
            padding: 14px !important;
          }
          .filter-bar input {
            min-width: unset !important;
            width: 100% !important;
          }
          .filter-count {
            margin-left: 0 !important;
          }

          /* Stats row (medicines) */
          .stats-row {
            flex-direction: column !important;
          }

          /* Locations page */
          .header-stats {
            flex-direction: column !important;
          }
          .filter-tabs {
            flex-wrap: wrap !important;
          }
          .filter-btn {
            flex: 1 1 auto !important;
            text-align: center !important;
          }
          .locations-grid {
            grid-template-columns: 1fr !important;
          }

          /* Billing history */
          .search-container {
            margin-left: 0 !important;
            max-width: 100% !important;
            margin-top: 10px !important;
          }

          /* Add medicine form */
          .form-container {
            padding: 20px !important;
          }
          .form-row {
            grid-template-columns: 1fr !important;
          }

          /* Logout button */
          .logout-btn {
            padding: 8px 16px !important;
            font-size: 13px !important;
          }

          /* Section titles */
          .section-title {
            font-size: 20px !important;
          }
        }

        /* ===== SMALL PHONES (max-width: 480px) ===== */
        @media (max-width: 480px) {
          .main-content {
            padding: 10px !important;
          }
          .header {
            padding: 12px !important;
            margin: -10px -10px 12px -10px !important;
          }
          .header h2 {
            font-size: 18px !important;
          }

          .stats-grid {
            grid-template-columns: 1fr !important;
          }

          .medicine-details-grid {
            grid-template-columns: 1fr !important;
          }

          .medicine-header {
            flex-direction: column !important;
            gap: 10px !important;
          }

          .success-card {
            padding: 16px 12px !important;
          }

          .sidebar {
            width: 240px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  });
})();