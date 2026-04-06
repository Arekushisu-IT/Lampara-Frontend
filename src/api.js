// ============================================================
// API - Network Layer & Auth Token Management
// ============================================================

let authToken = null;

/**
 * Make authenticated API request with JWT token
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

/**
 * Set auth token
 */
function setAuthToken(token) {
  authToken = token;
  localStorage.setItem('authToken', token);
}

/**
 * Clear auth token
 */
function clearAuth() {
  authToken = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
}
