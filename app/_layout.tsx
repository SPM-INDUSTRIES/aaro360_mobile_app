import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { Provider } from 'react-redux'
import { store, useAppDispatch, useAppSelector } from '../src/store/store'
import { initializeAuth } from '../src/store/slices/authSlice'
// Initialize interceptors after store is created to avoid circular dependency
import { initializeInterceptors } from '../src/lib/api'
import FloatingCartButton from '../src/components/FloatingCartButton'

function AppContent() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const segments = useSegments()
  const navigationState = useRootNavigationState()
  const { isAuthenticated, status } = useAppSelector((state) => state.auth)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize interceptors once when component mounts (after store is available)
  useEffect(() => {
    initializeInterceptors()
  }, [])

  useEffect(() => {
    // Initialize auth state on app start
    let isMounted = true
    const init = async () => {
      try {
        await dispatch(initializeAuth())
        if (isMounted) setIsInitialized(true)
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Still set initialized to true to prevent infinite loading
        if (isMounted) setIsInitialized(true)
      }
    }
    init()

    // Fallback: If auth initialization takes too long, proceed anyway
    const timeout = setTimeout(() => {
      if (isMounted) {
        setIsInitialized(true)
      }
    }, 5000)

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [dispatch])

  useEffect(() => {
    // Wait for auth initialization AND navigation state to be ready
    // Navigation state indicates the Stack has mounted
    if (!isInitialized || !navigationState?.key) {
      return
    }

    const currentSegment = segments[0]
    const isAuthRoute = currentSegment === 'login' || currentSegment === 'register' || currentSegment === 'auth'
    const isProtectedRoute = currentSegment === '(tabs)' || currentSegment === 'checkout' || currentSegment === 'order-tracking' || currentSegment === 'cart'

    // If authenticated and on login/register, redirect to home
    if (isAuthenticated && isAuthRoute) {
      router.replace('/(tabs)/')
      return
    }

    // If not authenticated and on protected routes, redirect to login
    if (!isAuthenticated && isProtectedRoute) {
      router.replace('/login')
      return
    }

    // If not authenticated and on other routes (not login/register), redirect to login
    if (!isAuthenticated && !isAuthRoute && currentSegment) {
      router.replace('/login')
      return
    }
  }, [isAuthenticated, segments, status, isInitialized, navigationState?.key, router])

  // Show loading screen ONLY while initializing auth
  // Stack must render first before we can navigate
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        initialRouteName="login"
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
        <Stack.Screen name="special-offers" options={{ headerShown: false }} />
      </Stack>
      {isAuthenticated && <FloatingCartButton />}
    </View>
  )
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
})
