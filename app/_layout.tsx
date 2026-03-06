import { useEffect, useState } from 'react'
import { Theme } from '../src/styles/theme'

import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { Provider } from 'react-redux'
import { store, useAppDispatch, useAppSelector } from '../src/store/store'
import { initializeAuth } from '../src/store/slices/authSlice'
import { initializeInterceptors } from '../src/lib/api'
import { fetchCart } from '../src/store/slices/cartSlice'

function AppContent() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const segments = useSegments()
  const navigationState = useRootNavigationState()
  const { isAuthenticated } = useAppSelector((state) => state.auth)
  const [isReady, setIsReady] = useState(false)

  // Initialize interceptors and auth once
  useEffect(() => {
    initializeInterceptors()
    dispatch(initializeAuth()).finally(() => setIsReady(true))
  }, [])

  // Navigation guard
  useEffect(() => {
    if (!isReady || !navigationState?.key) return

    const segment = segments[0]
    const isAuthScreen = segment === 'login' || segment === 'register' || segment === 'auth'

    if (__DEV__) {
      console.log('Navigation Guard:', {
        segment,
        isAuthenticated,
        isReady,
        path: segments.join('/')
      })
    }

    // Redirect unauthenticated users to login (except on auth screens)
    if (!isAuthenticated && !isAuthScreen) {
      console.log('User unauthenticated, redirecting to login...')
      router.replace('/login')
    }
    // Redirect authenticated users away from auth screens
    else if (isAuthenticated && isAuthScreen) {
      console.log('User authenticated, redirecting to home...')
      router.replace('/(tabs)/')
    }
  }, [isReady, isAuthenticated, segments, navigationState?.key])

  // Fetch cart when authenticated
  useEffect(() => {
    if (isAuthenticated && isReady) {
      dispatch(fetchCart())
    }
  }, [isAuthenticated, isReady, dispatch])

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        initialRouteName="login"
        screenOptions={{
          headerStyle: { backgroundColor: Theme.colors.white },
          headerTintColor: Theme.colors.deepBlue,
          headerTitleStyle: { fontWeight: 'bold', color: Theme.colors.deepBlue },
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
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="addresses" options={{ headerShown: false }} />
        <Stack.Screen name="payment-methods" options={{ headerShown: false }} />
        <Stack.Screen name="help-support" options={{ headerShown: false }} />
      </Stack>
    </View>
  )
}

import { AlertProvider } from '../src/context/AlertContext'

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AlertProvider>
        <AppContent />
      </AlertProvider>
    </Provider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
  },
})
