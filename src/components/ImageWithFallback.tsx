import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { resolveImageUrl } from '../utils/imageUrl'

interface ImageWithFallbackProps {
  source: string | { uri: string } | null | undefined
  style?: ViewStyle | ViewStyle[]
  contentFit?: 'cover' | 'contain' | 'fill' | 'none'
  onError?: () => void
}

/**
 * Image component with fallback for invalid/empty URLs and base64 during migration.
 * Uses expo-image for built-in caching when URL is valid.
 * Resolves localhost URLs to EXPO_PUBLIC_STORAGE_URL when set (for MinIO on different host).
 */
export default function ImageWithFallback({
  source,
  style,
  contentFit = 'cover',
  onError,
}: ImageWithFallbackProps) {
  const rawUri = typeof source === 'string' ? source : source?.uri
  const uri = resolveImageUrl(rawUri) ?? rawUri
  const isValidUrl = uri && (uri.startsWith('http://') || uri.startsWith('https://'))
  const isDataUri = uri && uri.startsWith('data:')

  if (!uri) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="image-outline" size={32} color="#CCC" />
      </View>
    )
  }

  // During migration: base64/data URIs can cause performance issues on mobile
  if (isDataUri) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="image-outline" size={32} color="#CCC" />
      </View>
    )
  }

  if (!isValidUrl) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="image-outline" size={32} color="#CCC" />
      </View>
    )
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      onError={onError}
    />
  )
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
