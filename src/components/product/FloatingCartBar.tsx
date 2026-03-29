import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Theme } from '../../styles/theme'
import { rf, rs } from '../../utils/responsive'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface FloatingCartBarProps {
    quantity: number
    totalPrice: number
    onIncrement: () => void
    onDecrement: () => void
    onAddToCart: () => void
    isDisabled?: boolean
    disabledText?: string
}

export default function FloatingCartBar({
    quantity,
    totalPrice,
    onIncrement,
    onDecrement,
    onAddToCart,
    isDisabled = false,
    disabledText = 'Sold Out',
}: FloatingCartBarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.bar}>
                <View style={styles.quantityWrapper}>
                    <TouchableOpacity
                        style={[
                            styles.quantityBtn,
                            quantity <= 1 && styles.quantityBtnDisabled,
                        ]}
                        onPress={onDecrement}
                        disabled={quantity <= 1}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name="remove" 
                            size={20} 
                            color={quantity <= 1 ? 'rgba(255,255,255,0.3)' : '#FFF'}
                        />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity
                        style={styles.quantityBtn}
                        onPress={onIncrement}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={[
                        styles.cartBtn,
                        isDisabled && styles.cartBtnDisabled,
                    ]}
                    onPress={onAddToCart}
                    disabled={isDisabled}
                    activeOpacity={0.8}
                >
                    <Ionicons 
                        name="cart" 
                        size={20} 
                        color={isDisabled ? Theme.colors.textGray : Theme.colors.primary}
                        style={styles.cartIcon}
                    />
                    <Text style={[
                        styles.cartBtnText,
                        isDisabled && styles.cartBtnTextDisabled,
                    ]}>
                        {isDisabled ? disabledText : 'Add to Cart'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        paddingHorizontal: Theme.spacing.xl,
        alignItems: 'center',
    },
    bar: {
        maxWidth: 420,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.sm,
        backgroundColor: Theme.colors.primary,
        padding: 8,
        borderRadius: Theme.borderRadius.full,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    quantityWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Theme.spacing.md,
        paddingHorizontal: 6,
        paddingVertical: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: Theme.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    quantityBtn: {
        width: rs(40),
        height: rs(40),
        borderRadius: rs(20),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityBtnDisabled: {
        opacity: 0.5,
    },
    quantityText: {
        fontSize: rf(Theme.fontSize.lg),
        fontWeight: '700',
        color: '#FFF',
        minWidth: 24,
        textAlign: 'center',
    },
    cartBtn: {
        flex: 1,
        height: 56,
        backgroundColor: '#FFF',
        borderRadius: Theme.borderRadius.full,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Theme.spacing.sm,
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
    cartBtnDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    cartIcon: {
        marginRight: 4,
    },
    cartBtnText: {
        fontSize: rf(Theme.fontSize.base),
        fontWeight: '700',
        color: Theme.colors.primary,
    },
    cartBtnTextDisabled: {
        color: Theme.colors.textGray,
    },
})