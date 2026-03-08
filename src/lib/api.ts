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

// Auth types
export interface ResetPasswordPayload {
  email: string
  otp: string
  newPassword: string
}

export interface ResetPasswordResponse {
  message: string
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
  resetPassword: (data: ResetPasswordPayload) => baseApi.post<ResetPasswordResponse>('/auth/reset-password', data),
  refreshToken: (data: { refreshToken: string }) => baseApi.post('/auth/refresh', data),
  logout: () => api.post('/auth/logout'), // Logout still uses interceptors for the access token
}

// User endpoints
export const userApi = {
  getProfile: (id: number) => api.get(`/users/${id}`),
  updateProfile: (id: number, data: any) => api.patch(`/users/${id}`, data),
  uploadProfilePicture: async (fileUri: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any)
    const res = await api.post('/upload?folder=profiles', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.url
  },
}

// Order endpoints
export const orderApi = {
  create: (data: any) => api.post('/orders', data),
  getById: (id: number) => api.get(`/orders/${id}`),
  getByCustomer: (customerId: number) => api.get(`/orders/customer/${customerId}`),
  updateStatus: (id: number, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
}

// Search endpoints
export const searchApi = {
  search: (query: string, type?: 'product' | 'food' | 'vendor' | 'all') =>
    api.get('/search', { params: { q: query, type: type || 'all' } }),
  getCategories: () => api.get('/food-categories'),
  getRestaurants: (filters?: { type?: string }) => api.get('/vendors', { params: filters }),
}

// Vendor endpoints (use baseApi for public data - no auth required)
export const vendorApi = {
  getAll: (filters?: { type?: string; page?: number; limit?: number }) => baseApi.get('/vendors', { params: filters }),
  getById: (id: string) => baseApi.get(`/vendors/${id}`),
}

// Food item endpoints
export const foodItemApi = {
  getAll: (filters?: { page?: number; limit?: number }) => baseApi.get('/food-items', { params: filters }),
  getById: (id: number) => baseApi.get(`/food-items/${id}`),
  getByRestaurant: (restaurantId: string) => baseApi.get(`/food-items/restaurant/${restaurantId}`),
  getByCategory: (categoryId: number) => baseApi.get(`/food-items/category/${categoryId}`),
}

// Food category endpoints
export const foodCategoryApi = {
  getAll: (filters?: { type?: string }) => baseApi.get('/food-categories', { params: filters }),
  getById: (id: number) => baseApi.get(`/food-categories/${id}`),
  getActive: () => baseApi.get('/food-categories/active'),
}

export default api
