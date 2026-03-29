import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Theme } from '../../styles/theme'
import { rf } from '../../utils/responsive'

interface ProductRatingProps {
    rating: number
    reviewCount?: number
    size?: number
}

export default function ProductRating({ 
    rating, 
    reviewCount,
    size = 20 
}: ProductRatingProps) {
    const displayRating = rating.toFixed(1)

    return (
        <View style={styles.container}>
            <Ionicons 
                name="star" 
                size={size} 
                color={Theme.colors.primary}
                style={styles.starIcon}
            />
            <Text style={styles.ratingText}>{displayRating}</Text>
            {reviewCount && reviewCount > 0 && (
                <Text style={styles.reviewCount}>
                    ({reviewCount}+ Reviews)
                </Text>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    starIcon: {
        marginRight: 2,
    },
    ratingText: {
        fontSize: rf(Theme.fontSize.lg),
        fontWeight: '700',
        color: Theme.colors.primary,
    },
    reviewCount: {
        fontSize: rf(Theme.fontSize.sm),
        fontWeight: '500',
        color: Theme.colors.textGray,
        marginLeft: 4,
    },
})