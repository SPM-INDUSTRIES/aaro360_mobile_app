import { useEffect } from 'react'
import { useRouter, useRootNavigationState } from 'expo-router'
import { useSelector } from 'react-redux'
import { RootState } from '../src/store/store'
import { View, ActivityIndicator, StyleSheet } from 'react-native'

export default function AuthScreen() {
  const router = useRouter()
  const navigationState = useRootNavigationState()
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    // Wait for navigation state to be ready before attempting to navigate
    if (!navigationState?.key) {
      return
    }

    if (isAuthenticated) {
      router.replace('/(tabs)/')
    } else {
      router.replace('/login')
    }
  }, [isAuthenticated, navigationState?.key])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#f27424" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#124569',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
