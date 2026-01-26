import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import * as SecureStore from 'expo-secure-store'
import { authApi } from '../../lib/api'

const REFRESH_TOKEN_KEY = 'aaro360_refresh_token'

export interface User {
  id: number
  email?: string | null
  phoneNumber?: string
  firstName: string
  lastName: string
  role: 'customer' | 'rider' | 'admin'
  profilePicture?: string
  isApproved: boolean
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
}

/**
 * Login with Google ID Token
 */
export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async (idToken: string, { rejectWithValue }) => {
    try {
      const response = await authApi.googleLogin({ idToken })
      const { accessToken, refreshToken, user } = response.data

      // Store refresh token securely
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)

      return { accessToken, user }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to login with Google'
      )
    }
  }
)

/**
 * Login with Email and Password
 */
export const loginWithEmail = createAsyncThunk(
  'auth/loginWithEmail',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.emailLogin(credentials)
      const { accessToken, refreshToken, user } = response.data

      // Store refresh token securely
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)

      return { accessToken, user }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to login'
      )
    }
  }
)

/**
 * Register with Email, Password, and OTP
 */
export const register = createAsyncThunk(
  'auth/register',
  async (data: { firstName: string; lastName: string; email: string; password: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.register(data)
      const { accessToken, refreshToken, user } = response.data

      // Store refresh token securely
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)

      return { accessToken, user }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to register'
      )
    }
  }
)

/**
 * Send OTP to Email
 */
export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await authApi.sendOtp({ email })
      return { message: response.data.message }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to send OTP'
      )
    }
  }
)

/**
 * Verify OTP
 */
export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (data: { email: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.verifyOtp(data)
      return { verified: response.data.verified }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to verify OTP'
      )
    }
  }
)

/**
 * Login with Phone (Firebase ID Token)
 */
export const loginWithPhone = createAsyncThunk(
  'auth/loginWithPhone',
  async (idToken: string, { rejectWithValue }) => {
    try {
      const response = await authApi.phoneLogin({ idToken })
      const { accessToken, refreshToken, user } = response.data

      // Store refresh token securely
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)

      return { accessToken, user }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to login with phone'
      )
    }
  }
)

/**
 * Register with Phone (Firebase ID Token)
 */
export const registerWithPhone = createAsyncThunk(
  'auth/registerWithPhone',
  async (data: { firstName: string; lastName: string; phoneNumber: string; idToken: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.phoneRegister(data)
      const { accessToken, refreshToken, user } = response.data

      // Store refresh token securely
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)

      return { accessToken, user }
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to register with phone'
      )
    }
  }
)

/**
 * Refresh Access Token
 */
export const refreshAccessToken = createAsyncThunk(
  'auth/refreshAccessToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
      if (!refreshToken) {
        throw new Error('No refresh token found')
      }

      const response = await authApi.refreshToken({ refreshToken })
      const { accessToken, refreshToken: newRefreshToken, user } = response.data

      // Update refresh token
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken)

      return { accessToken, user }
    } catch (error: any) {
      // If refresh fails, clear stored token
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
      return rejectWithValue(
        error.response?.data?.message || 'Failed to refresh token'
      )
    }
  }
)

/**
 * Logout User
 */
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      const { accessToken } = state.auth

      // Call logout endpoint if we have a token
      if (accessToken) {
        try {
          await authApi.logout()
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error)
        }
      }

      // Clear refresh token from secure storage
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)

      return null
    } catch (error: any) {
      return rejectWithValue('Failed to logout')
    }
  }
)

/**
 * Initialize Auth State
 * Loads refresh token and attempts to refresh access token
 */
export const initializeAuth = createAsyncThunk(
  'auth/initializeAuth',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
      if (!refreshToken) {
        return null
      }

      // Attempt to refresh access token
      const result = await dispatch(refreshAccessToken())
      if (refreshAccessToken.fulfilled.match(result)) {
        return result.payload
      }
      return null
    } catch (error: any) {
      return rejectWithValue('Failed to initialize auth')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload
      state.isAuthenticated = !!action.payload
    },
  },
  extraReducers: (builder) => {
    // Login with Google
    builder
      .addCase(loginWithGoogle.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.accessToken = action.payload.accessToken
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload as string
        state.isAuthenticated = false
        state.accessToken = null
        state.user = null
      })

    // Login with Email
    builder
      .addCase(loginWithEmail.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginWithEmail.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.accessToken = action.payload.accessToken
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginWithEmail.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload as string
        state.isAuthenticated = false
        state.accessToken = null
        state.user = null
      })

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.accessToken = action.payload.accessToken
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload as string
        state.isAuthenticated = false
        state.accessToken = null
        state.user = null
      })

    // Send OTP
    builder
      .addCase(sendOtp.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.status = 'idle'
        state.error = null
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload as string
      })

    // Verify OTP
    builder
      .addCase(verifyOtp.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(verifyOtp.fulfilled, (state) => {
        state.status = 'idle'
        state.error = null
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload as string
      })

    // Login with Phone
    builder
      .addCase(loginWithPhone.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginWithPhone.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.accessToken = action.payload.accessToken
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginWithPhone.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload as string
        state.isAuthenticated = false
        state.accessToken = null
        state.user = null
      })

    // Register with Phone
    builder
      .addCase(registerWithPhone.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(registerWithPhone.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.accessToken = action.payload.accessToken
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(registerWithPhone.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload as string
        state.isAuthenticated = false
        state.accessToken = null
        state.user = null
      })

    // Refresh Access Token
    builder
      .addCase(refreshAccessToken.pending, (state) => {
        // Don't change status during refresh to avoid UI flicker
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        state.accessToken = null
        state.user = null
        state.isAuthenticated = false
        state.status = 'idle'
      })

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = 'idle'
        state.user = null
        state.accessToken = null
        state.isAuthenticated = false
        state.error = null
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload as string
      })

    // Initialize Auth
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.accessToken = action.payload.accessToken
          state.isAuthenticated = true
        } else {
          state.status = 'idle'
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.status = 'idle'
        state.isAuthenticated = false
      })
  },
})

export const { clearError, setAccessToken } = authSlice.actions
export default authSlice.reducer
