import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_PREFIX = 'aaro_cache_'

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

export async function getCached<T>(key: string, ttl: number = DEFAULT_TTL): Promise<T | null> {
  try {
    const cacheKey = CACHE_PREFIX + key
    const cached = await AsyncStorage.getItem(cacheKey)
    
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const isExpired = Date.now() - timestamp > ttl
    
    if (isExpired) {
      await AsyncStorage.removeItem(cacheKey)
      return null
    }
    
    return data as T
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const cacheKey = CACHE_PREFIX + key
    const value = JSON.stringify({
      data,
      timestamp: Date.now(),
    })
    await AsyncStorage.setItem(cacheKey, value)
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export async function clearCache(key?: string): Promise<void> {
  try {
    if (key) {
      await AsyncStorage.removeItem(CACHE_PREFIX + key)
    } else {
      const keys = await AsyncStorage.getAllKeys()
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX))
      await AsyncStorage.multiRemove(cacheKeys)
    }
  } catch (error) {
    console.error('Cache clear error:', error)
  }
}
