import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { store, RootState } from '../src/store/store'
import { initializeAuth } from '../src/store/slices/authSlice'
// Import api to initialize interceptors
import '../src/lib/api'

function AppContent() {
  const dispatch = useDispatch()
  const router = useRouter()
  const segments = useSegments()
  const { isAuthenticated, status } = useSelector((state: RootState) => state.auth)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize auth state on app start
    const init = async () => {
      await dispatch(initializeAuth())
      setIsInitialized(true)
    }
    init()
  }, [dispatch])

  useEffect(() => {
    // Wait for auth initialization to complete
    if (!isInitialized || status === 'loading') {
      return
    }

    const currentSegment = segments[0]
    const isAuthRoute = currentSegment === 'login' || currentSegment === 'register' || currentSegment === 'auth'
    const isProtectedRoute = currentSegment === '(tabs)' || currentSegment === 'checkout' || currentSegment === 'order-tracking' || currentSegment === 'cart'
    
    if (!isAuthenticated) {
      // Not authenticated - redirect to login if on protected routes
      if (isProtectedRoute) {
        router.replace('/login')
      } else if (!isAuthRoute && currentSegment) {
        // If on any other route and not authenticated, go to login
        router.replace('/login')
      }
    } else {
      // Authenticated - redirect to home if on auth pages
      if (isAuthRoute) {
        router.replace('/(tabs)/')
      }
    }
  }, [isAuthenticated, segments, status, isInitialized])

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#1E3A8A', // Dark blue from logo
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#1E3A8A',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="cart" options={{ headerShown: false }} />
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
      <Stack.Screen name="order-tracking" options={{ headerShown: false }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  )
}
