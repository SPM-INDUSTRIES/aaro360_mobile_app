import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Dimensions } from 'react-native'
import { useRouter, Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Theme } from '../../src/styles/theme'
import { ProductCategory } from '../../src/types/product'
import { Skeleton } from '../../src/components/SkeletonLoader'

const { width: screenWidth } = Dimensions.get('window')

interface FoodCategory {
  id: number
  name: string
  type: string
  description?: string
  imageUrl?: string
  isActive: boolean
}

export default function FoodCategoriesScreen() {
  const router = useRouter()
  const { category: selectedCategory } = useLocalSearchParams<{ category: string }>()
  const [categories, setCategories] = useState<FoodCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      // Default to 'food' if no category provided, or map correctly
      const type = selectedCategory === ProductCategory.GROCERY ? 'grocery' : 'food'
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/food-categories?type=${type}`)
      const data = await response.json()
      setCategories(Array.isArray(data) ? data.filter((cat: FoodCategory) => cat.isActive) : [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    if (selectedCategory === ProductCategory.GROCERY) return 'Grocery Categories'
    return 'Food Categories'
  }

  const renderSkeleton = () => {
    return (
      <View style={styles.grid}>
        {[1, 2, 4, 5, 6].map((i) => (
          <View key={i} style={styles.categoryCard}>
            <Skeleton height={120} borderRadius={0} />
            <View style={styles.categoryInfo}>
              <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
              <Skeleton width="90%" height={12} style={{ marginBottom: 4 }} />
              <Skeleton width="80%" height={12} />
            </View>
          </View>
        ))}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? renderSkeleton() : (
          <>
            <View style={styles.grid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() => router.push(`/food-category/${category.id}`)}
                >
                  <View style={styles.categoryImageContainer}>
                    {category.imageUrl ? (
                      <Image
                        source={{ uri: category.imageUrl }}
                        style={styles.categoryImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.categoryImage, styles.placeholderImage]}>
                        <Text style={styles.placeholderEmoji}>🍽️</Text>
                      </View>
                    )}
                    {/* Subtle Gradient Overlay */}
                    <View style={styles.imageOverlay} />
                  </View>

                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
                    {category.description && (
                      <Text style={styles.categoryDescription} numberOfLines={2}>
                        {category.description}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {categories.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={64} color={Theme.colors.textGray} />
                <Text style={styles.emptyText}>No categories available</Text>
                <Text style={styles.emptySubtext}>Please check back later</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 10,
    backgroundColor: Theme.colors.white,
    ...Theme.shadows.small,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.deepBlue,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  categoryCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    ...Theme.shadows.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  categoryImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: Theme.colors.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  categoryInfo: {
    padding: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.deepBlue,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    color: Theme.colors.textGray,
    lineHeight: 16,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.deepBlue,
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: Theme.colors.textGray,
    marginTop: 5,
    fontWeight: '500',
  },
})
