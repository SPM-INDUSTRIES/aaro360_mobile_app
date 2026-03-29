import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Theme } from '../../styles/theme'
import { rf, rs, wp } from '../../utils/responsive'

interface ExtraItem {
    id: number
    name: string
    price: number
}

interface ExtrasScrollSectionProps {
    title?: string
    extras: ExtraItem[]
    selectedIds: number[]
    onSelect: (id: number) => void
}

export default function ExtrasScrollSection({
    title = 'Add Extras',
    extras,
    selectedIds,
    onSelect,
}: ExtrasScrollSectionProps) {
    if (!extras || extras.length === 0) return null

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {extras.map((extra) => {
                    const isSelected = selectedIds.includes(extra.id)
                    return (
                        <TouchableOpacity
                            key={extra.id}
                            style={[
                                styles.card,
                                isSelected && styles.cardSelected,
                            ]}
                            onPress={() => onSelect(extra.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardContent}>
                                <Text 
                                    style={[
                                        styles.extraName,
                                        isSelected && styles.extraNameSelected,
                                    ]}
                                    numberOfLines={2}
                                >
                                    {extra.name}
                                </Text>
                                <Text 
                                    style={[
                                        styles.extraPrice,
                                        isSelected && styles.extraPriceSelected,
                                    ]}
                                >
                                    + රු{Number(extra.price).toFixed(2)}
                                </Text>
                            </View>
                            {isSelected && (
                                <View style={styles.checkmark}>
                                    <Ionicons 
                                        name="checkmark-circle" 
                                        size={24} 
                                        color={Theme.colors.primary}
                                    />
                                </View>
                            )}
                        </TouchableOpacity>
                    )
                })}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        marginTop: Theme.spacing.xxl,
    },
    title: {
        fontSize: rf(Theme.fontSize.xxl),
        fontWeight: '700',
        color: Theme.colors.deepBlue,
        paddingHorizontal: Theme.spacing.sm,
        marginBottom: Theme.spacing.md,
    },
    scrollContent: {
        paddingHorizontal: Theme.spacing.sm,
        paddingBottom: Theme.spacing.md,
        gap: Theme.spacing.md,
    },
    card: {
        width: rs(192),
        padding: Theme.spacing.md,
        backgroundColor: Theme.colors.white,
        borderRadius: Theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardSelected: {
        borderWidth: 2,
        borderColor: Theme.colors.primary,
        backgroundColor: Theme.colors.orangeLight,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    extraName: {
        fontSize: rf(Theme.fontSize.base),
        fontWeight: '700',
        color: Theme.colors.textDark,
        marginBottom: Theme.spacing.sm,
    },
    extraNameSelected: {
        color: Theme.colors.primary,
    },
    extraPrice: {
        fontSize: rf(Theme.fontSize.sm),
        fontWeight: '700',
        color: Theme.colors.primary,
    },
    extraPriceSelected: {
        color: Theme.colors.primary,
    },
    checkmark: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
})