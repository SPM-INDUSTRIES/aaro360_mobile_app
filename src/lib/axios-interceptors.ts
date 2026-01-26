import { InternalAxiosRequestConfig, AxiosError, AxiosInstance } from 'axios'
import { store } from '../store/store'
import { refreshAccessToken, logoutUser } from '../store/slices/authSlice'

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

/**
 * Request Interceptor
 * Adds access token to all requests
 */
export const setupRequestInterceptor = (apiInstance: AxiosInstance) => {
  apiInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const state = store.getState()
      const accessToken = state.auth.accessToken

      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }

      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )
}

/**
 * Response Interceptor
 * Handles 401 errors by refreshing token and retrying request
 */
export const setupResponseInterceptor = (apiInstance: AxiosInstance) => {
  apiInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean
      }

      // If error is 401 and we haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`
              }
              return apiInstance(originalRequest)
            })
            .catch((err) => {
              return Promise.reject(err)
            })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          // Attempt to refresh token
          const result = await store.dispatch(refreshAccessToken())

          if (refreshAccessToken.fulfilled.match(result)) {
            const newToken = result.payload.accessToken

            // Process queued requests
            processQueue(null, newToken)

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            return apiInstance(originalRequest)
          } else {
            // Refresh failed, logout user
            processQueue(new Error('Token refresh failed'), null)
            await store.dispatch(logoutUser())
            return Promise.reject(error)
          }
        } catch (refreshError) {
          processQueue(refreshError, null)
          await store.dispatch(logoutUser())
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      return Promise.reject(error)
    }
  )
}
