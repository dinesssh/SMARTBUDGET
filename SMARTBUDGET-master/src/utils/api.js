const API_BASE_URL = '/api';

// Get auth token from localStorage
const getAuthToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem('sb_user'));
    return user?.token;
  } catch {
    return null;
  }
};

// Create headers with auth token
const createHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: createHeaders(options.auth !== false),
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    let data;
    if (isJson) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  signup: (userData) => apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData),
    auth: false,
  }),

  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
    auth: false,
  }),

  updateProfile: (data) => apiRequest('/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  changePassword: (data) => apiRequest('/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Transaction API calls
export const transactionAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/transactions${queryString ? `?${queryString}` : ''}`);
  },

  create: (transactionData) => apiRequest('/transactions', {
    method: 'POST',
    body: JSON.stringify(transactionData),
  }),

  delete: (id) => apiRequest(`/transactions/${id}`, {
    method: 'DELETE',
  }),

  deleteAll: () => apiRequest('/transactions', {
    method: 'DELETE',
  }),

  bulk: (rows = []) => apiRequest('/transactions/bulk', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  }),

  uploadFile: async (file) => {
    const token = (()=>{ try { return JSON.parse(localStorage.getItem('sb_user'))?.token; } catch { return null; } })();
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/transactions/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) {
      let msg = 'Upload failed';
      try { const t = await res.text(); if (t) msg = t; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  suggestions: (field, params = {}) => {
    const qs = new URLSearchParams({ field, ...params }).toString();
    return apiRequest(`/transactions/suggestions${qs ? `?${qs}` : ''}`);
  },
};

// Settings API calls
export const settingsAPI = {
  get: () => apiRequest('/settings'),
  
  update: (settingsData) => apiRequest('/settings', {
    method: 'POST',
    body: JSON.stringify(settingsData),
  }),
};

// Analytics API calls
export const analyticsAPI = {
  getSummary: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/analytics/summary${queryString ? `?${queryString}` : ''}`);
  },
};

// Budget API calls
export const budgetAPI = {
  get: () => apiRequest('/budget'),
  save: (categories) => apiRequest('/budget', {
    method: 'POST',
    body: JSON.stringify({ categories }),
  }),
  summary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/budget/summary${qs ? `?${qs}` : ''}`);
  },
};

export default {
  auth: authAPI,
  transactions: transactionAPI,
  settings: settingsAPI,
  analytics: analyticsAPI,
  budget: budgetAPI,
};
