import React from 'react'
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native'
import ImageWithFallback from '../ImageWithFallback'
import { Theme } from '../../styles/theme'
import { hp, wp } from '../../utils/responsive'
import ProductBadge, { BadgeType } from './ProductBadge'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IS_TABLET = SCREEN_WIDTH >= 768

interface ProductHeroImageProps {
    imageUrl?: string
    badge?: BadgeType
    isOutOfStock?: boolean
    discountPercent?: number
}

export default function ProductHeroImage({
    imageUrl,
    badge,
    isOutOfStock,
    discountPercent,
}: ProductHeroImageProps) {
    const aspectRatio = IS_TABLET ? 16 / 7 : 4 / 3
    const imageHeight = SCREEN_WIDTH / aspectRatio

    return (
        <View style={[
            styles.container,
            IS_TABLET && styles.containerTablet
        ]}>
            <ImageWithFallback
                source={imageUrl}
                style={[
                    styles.image,
                    { height: imageHeight }
                ]}
                contentFit="cover"
            />
            <View style={styles.gradientOverlay} />
            {isOutOfStock && (
                <View style={styles.outOfStockOverlay}>
                    <Text style={styles.outOfStockText}>Out of Stock</Text>
                </View>
            )}
            {badge && !isOutOfStock && (
                <View style={styles.badgeContainer}>
                    <ProductBadge type={badge} discountPercent={discountPercent} />
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        position: 'relative',
        backgroundColor: Theme.colors.backgroundLight,
    },
    containerTablet: {
        marginTop: Theme.spacing.xl,
        marginHorizontal: Theme.spacing.xl,
        borderRadius: Theme.borderRadius.lg,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    outOfStockOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    outOfStockText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '700',
        backgroundColor: '#E53E3E',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    badgeContainer: {
        position: 'absolute',
        bottom: 24,
        left: IS_TABLET ? 40 : 24,
    },
})