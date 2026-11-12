import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Theme } from '../styles/theme'
import { Monitoring } from '../services/monitoring.service'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Catches render-time crashes anywhere in the tree, reports them to
 * Monitoring, and shows a recoverable fallback instead of a white screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Monitoring.logError(error, {
      source: 'ErrorBoundary',
      componentStack: info.componentStack ?? '',
    })
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={64} color={Theme.colors.primary} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            An unexpected error occurred. Please try again.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Theme.colors.white,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.deepBlue,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Theme.colors.textGray,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  buttonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
})
