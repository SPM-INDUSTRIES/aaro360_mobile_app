import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Theme } from '../../styles/theme'

export type BadgeType = 'bestseller' | 'featured' | 'discount' | 'new'

interface ProductBadgeProps {
    type: BadgeType
    discountPercent?: number
}

const BADGE_CONFIG: Record<BadgeType, { label: string; bgColor: string; textColor: string }> = {
    bestseller: {
        label: 'Bestseller',
        bgColor: Theme.colors.primary,
        textColor: '#FFF',
    },
    featured: {
        label: 'Featured',
        bgColor: Theme.colors.primary,
        textColor: '#FFF',
    },
    discount: {
        label: 'Sale',
        bgColor: '#E53E3E',
        textColor: '#FFF',
    },
    new: {
        label: 'New',
        bgColor: Theme.colors.greenText,
        textColor: '#FFF',
    },
}

export default function ProductBadge({ type, discountPercent }: ProductBadgeProps) {
    const config = BADGE_CONFIG[type]
    const displayLabel = type === 'discount' && discountPercent 
        ? `${discountPercent}% OFF` 
        : config.label

    return (
        <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
            <Text style={[styles.badgeText, { color: config.textColor }]}>
                {displayLabel}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: Theme.borderRadius.full,
        marginBottom: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
})