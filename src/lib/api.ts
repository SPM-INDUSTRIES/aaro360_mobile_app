import axios from 'axios'
import { setupRequestInterceptor, setupResponseInterceptor } from './axios-interceptors'

// Use local network IP for mobile devices, localhost for web
// Update this IP to match your computer's local IP address
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Setup interceptors
setupRequestInterceptor(api)
setupResponseInterceptor(api)

// Auth endpoints
export const authApi = {
  googleLogin: (data: { idToken: string }) => api.post('/auth/google-login', data),
  emailLogin: (data: { email: string; password: string }) => api.post('/auth/email-login', data),
  phoneLogin: (data: { idToken: string }) => api.post('/auth/phone-login', data),
  register: (data: { firstName: string; lastName: string; email: string; password: string; otp: string }) => 
    api.post('/auth/register', data),
  phoneRegister: (data: { firstName: string; lastName: string; phoneNumber: string; idToken: string }) =>
    api.post('/auth/phone-register', data),
  sendOtp: (data: { email: string }) => api.post('/auth/send-otp', data),
  verifyOtp: (data: { email: string; otp: string }) => api.post('/auth/verify-otp', data),
  refreshToken: (data: { refreshToken: string }) => api.post('/auth/refresh', data),
  logout: () => api.post('/auth/logout'),
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
