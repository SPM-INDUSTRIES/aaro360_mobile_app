import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Theme } from '../src/styles/theme'
import { offerApi, Offer } from '../src/lib/offerApi'
import { ProductCategory } from '../src/types/product'

const { width: screenWidth } = Dimensions.get('window')

export default function SpecialOffersScreen() {
    const router = useRouter()
    const { category } = useLocalSearchParams<{ category: string }>()
    const [offers, setOffers] = useState<Offer[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchOffers()
    }, [])

    const fetchOffers = async () => {
        try {
            setLoading(true)
            const data = await offerApi.getActive()

            // Filter by category if provided
            if (category) {
                const filtered = data.filter((offer) => {
                    if (category === ProductCategory.FOOD) {
                        return offer.linkType === 'food_restaurant' || offer.linkType === 'food_item'
                    } else if (category === ProductCategory.GROCERY) {
                        // Allow general offers and grocery specific ones in Grocery
                        return !offer.linkType || offer.linkType === 'grocery_product'
                    } else if (category === ProductCategory.MEDICINE) {
                        return offer.linkType === 'medicine_product'
                    }
                    return false
                })
                setOffers(filtered)
            } else {
                setOffers(data)
            }
        } catch (error) {
            console.error('Failed to fetch special offers:', error)
        } finally {
            setLoading(false)
        }
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
                <Text style={styles.headerTitle}>Special Offers</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={Theme.colors.primary} style={styles.loader} />
                ) : offers.length > 0 ? (
                    offers.map((offer) => (
                        <TouchableOpacity
                            key={offer.id}
                            style={styles.offerCard}
                            onPress={() => {
                                if (offer.linkUrl) {
                                    console.log('Offer clicked:', offer.linkUrl)
                                }
                            }}
                        >
                            <LinearGradient
                                colors={[Theme.colors.deepBlue, Theme.colors.blueText]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            {offer.imageUrl ? (
                                <Image
                                    source={{ uri: offer.imageUrl }}
                                    style={styles.offerImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.offerImage, styles.placeholderImage]}>
                                    <Text style={styles.placeholderEmoji}>🎁</Text>
                                </View>
                            )}
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.8)']}
                                style={styles.offerGradientOverlay}
                            />
                            <View style={styles.offerOverlay}>
                                {offer.title && (
                                    <Text style={styles.offerTitle}>{offer.title}</Text>
                                )}
                                {offer.description && (
                                    <Text style={styles.offerDescription} numberOfLines={2}>
                                        {offer.description}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="gift-outline" size={64} color={Theme.colors.textGray} />
                        <Text style={styles.emptyText}>No special offers available at the moment.</Text>
                    </View>
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
        gap: 16,
    },
    offerCard: {
        width: '100%',
        height: 180,
        borderRadius: Theme.borderRadius.xl,
        overflow: 'hidden',
        position: 'relative',
        ...Theme.shadows.medium,
    },
    offerImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.deepBlue,
    },
    placeholderEmoji: {
        fontSize: 40,
    },
    offerGradientOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    offerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: Theme.spacing.md,
    },
    offerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: Theme.colors.white,
        marginBottom: 4,
    },
    offerDescription: {
        fontSize: 13,
        color: '#E0E7FF',
        fontWeight: '500',
        marginBottom: 12,
    },
    offerBadgeContainer: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    offerBadge: {
        backgroundColor: Theme.colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Theme.borderRadius.sm,
    },
    offerBadgeText: {
        color: Theme.colors.white,
        fontSize: 10,
        fontWeight: '900',
    },
    claimButton: {
        backgroundColor: Theme.colors.white,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: Theme.borderRadius.md,
        alignSelf: 'flex-start',
    },
    claimButtonText: {
        color: Theme.colors.deepBlue,
        fontWeight: '800',
        fontSize: 14,
    },
    loader: {
        marginTop: 50,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: Theme.colors.textGray,
        textAlign: 'center',
    },
})
