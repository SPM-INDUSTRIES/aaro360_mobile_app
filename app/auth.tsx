import { useEffect } from 'react'
import { useRouter, useRootNavigationState, useSegments } from 'expo-router'
import { useSelector } from 'react-redux'
import { RootState } from '../src/store/store'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { Theme } from '../src/styles/theme'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/vendor', '/food-item', '/category']

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}

export default function AuthScreen() {
  const router = useRouter()
  const navigationState = useRootNavigationState()
  const segments = useSegments()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (!navigationState?.key) {
      return
    }

    const currentPath = '/' + segments.join('/')
    const isPublic = isPublicRoute(currentPath)

    if (isAuthenticated) {
      if (currentPath === '/login' || currentPath === '/') {
        router.replace('/(tabs)/')
      }
    } else {
      if (!isPublic && currentPath !== '/login') {
        router.replace('/login')
      }
    }
  }, [isAuthenticated, navigationState?.key, segments])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Theme.colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 200,
    height: 70,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Theme.colors.deepBlue,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Theme.colors.textGray,
    textAlign: 'center',
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 20,
  },
})
