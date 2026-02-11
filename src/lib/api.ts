import axios from 'axios'

// Use local network IP for mobile devices, localhost for web
// Update this IP to match your computer's local IP address
// For production, set EXPO_PUBLIC_API_URL environment variable to your production API URL
export const API_URL = process.env.EXPO_PUBLIC_API_URL

// Log API URL in development for debugging (remove sensitive info in production)
if (__DEV__) {
  console.log('API Base URL:', API_URL)
}

// Base axios instance for simple requests without interceptors (like auth)
const baseApi = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Initialize interceptors - call this after store is created to avoid circular dependency
// Using dynamic import to break the circular dependency cycle
let interceptorsInitialized = false
export const initializeInterceptors = async () => {
  if (!interceptorsInitialized) {
    // Dynamic import to avoid circular dependency at module load time
    const { setupRequestInterceptor, setupResponseInterceptor } = await import('./axios-interceptors')
    setupRequestInterceptor(api)
    setupResponseInterceptor(api)
    interceptorsInitialized = true
  }
}

// Auth endpoints - use baseApi to avoid interceptor side effects during login/refresh
export const authApi = {
  googleLogin: (data: { idToken: string }) => baseApi.post('/auth/google-login', data),
  emailLogin: (data: { email: string; password: string }) => baseApi.post('/auth/email-login', data),
  phoneLogin: (data: { idToken: string }) => baseApi.post('/auth/phone-login', data),
  register: (data: { firstName: string; lastName: string; email: string; password: string; otp: string }) =>
    baseApi.post('/auth/register', data),
  phoneRegister: (data: { firstName: string; lastName: string; phoneNumber: string; idToken: string }) =>
    baseApi.post('/auth/phone-register', data),
  sendOtp: (data: { email: string }) => baseApi.post('/auth/send-otp', data),
  verifyOtp: (data: { email: string; otp: string }) => baseApi.post('/auth/verify-otp', data),
  forgotPassword: (email: string) => baseApi.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) => baseApi.post('/auth/reset-password', data),
  refreshToken: (data: { refreshToken: string }) => baseApi.post('/auth/refresh', data),
  logout: () => api.post('/auth/logout'), // Logout still uses interceptors for the access token
}

// User endpoints
export const userApi = {
  getProfile: (id: number) => api.get(`/users/${id}`),
  updateProfile: (id: number, data: any) => api.patch(`/users/${id}`, data),
}

// Order endpoints
export const orderApi = {
  create: (data: any) => api.post('/orders', data),
  getById: (id: number) => api.get(`/orders/${id}`),
  getByCustomer: (customerId: number) => api.get(`/orders/customer/${customerId}`),
  updateStatus: (id: number, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
}

// Search endpoints (to be implemented in backend)
export const searchApi = {
  search: (query: string) => api.get(`/search?q=${query}`),
  getCategories: () => api.get('/categories'),
  getRestaurants: (filters?: any) => api.get('/restaurants', { params: filters }),
}

export default api
