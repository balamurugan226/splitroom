import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '/api';
  }
  // Deployed production fallback
  return 'https://splitmate-0dr2.onrender.com/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30s to handle Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('splitroom_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('splitroom_token');
      // Only redirect if not already on login/register pages
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ---------- Auth ----------
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ---------- House ----------
export const houseAPI = {
  getMyHouse: () => api.get('/houses/my-house'),
  createHouse: (data) => api.post('/houses/create', data),
  joinHouse: (code) => api.post('/houses/join', { invite_code: code }),
  getHouse: (id) => api.get(`/houses/${id}`),
  updateHouse: (id, data) => api.put(`/houses/${id}`, data),
  leaveHouse: (id) => api.delete(`/houses/${id}/leave`),
  getMembers: (id) => api.get(`/houses/${id}/members`),
  removeMember: (houseId, memberId) =>
    api.delete(`/houses/${houseId}/members/${memberId}`),
  updateMemberRole: (houseId, memberId, role) =>
    api.put(`/houses/${houseId}/members/${memberId}/role`, { role }),
  regenerateInvite: (id) => api.post(`/houses/${id}/regenerate-invite`),
};

// ---------- Expense ----------
export const expenseAPI = {
  getExpenses: (params) => api.get('/expenses', { params }),
  addExpense: (data) => api.post('/expenses', data),
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  getSummary: () => api.get('/expenses/summary'),
};

// ---------- Payment ----------
export const paymentAPI = {
  getPayments: (params) => api.get('/payments', { params }),
  createPayment: (data) => api.post('/payments', data),
  markPaid: (id) => api.put(`/payments/${id}/mark-paid`),
  getBalances: () => api.get('/payments/balances'),
  getRentRecords: (params) => api.get('/payments/rent', { params }),
  createRentRecord: (data) => api.post('/payments/rent', data),
  updateRentStatus: (id, status) =>
    api.put(`/payments/rent/${id}`, { status }),
  getSettlements: () => api.get('/payments/settlements'),
  createSettlement: (data) => api.post('/payments/settlements', data),
};
