import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
    Dimensions,
} from 'react-native'
import { rs, rf, wp, hp } from '../utils/responsive'
import { Ionicons } from '@expo/vector-icons'
import { Theme } from '../styles/theme'
import { resolveImageUrl } from '../utils/imageUrl'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

interface FoodItemVariant {
    id: number
    name: string
    price: number
    quantity: number
    isActive: boolean
}

interface FoodAddon {
    id: number
    name: string
    price: number
}

interface AddToCartModalProps {
    visible: boolean
    onClose: () => void
    item: {
        id: number
        name: string
        price: number
        imageUrl?: string
        description?: string
        variants?: FoodItemVariant[]
        addons?: FoodAddon[]
    } | null
    onAddToCart: (quantity: number, selectedVariant?: FoodItemVariant, selectedAddons?: number[]) => void
}

export default function AddToCartModal({
    visible,
    onClose,
    item,
    onAddToCart,
}: AddToCartModalProps) {
    const [quantity, setQuantity] = useState(1)
    const [selectedVariant, setSelectedVariant] = useState<FoodItemVariant | null>(null)
    const [selectedAddons, setSelectedAddons] = useState<number[]>([])

    useEffect(() => {
        if (visible && item) {
            setQuantity(1)
            setSelectedVariant(item.variants?.[0] || null)
            setSelectedAddons([])
        }
    }, [visible, item])

    if (!item) return null

    const handleIncrement = () => {
        setQuantity(prev => prev + 1)
    }

    const handleDecrement = () => {
        if (quantity > 1) {
            setQuantity(prev => prev - 1)
        }
    }

    const toggleAddon = (addonId: number) => {
        setSelectedAddons(prev =>
            prev.includes(addonId)
                ? prev.filter(id => id !== addonId)
                : [...prev, addonId]
        )
    }

    const calculateTotal = () => {
        const basePrice = Number(selectedVariant?.price || item.price || 0)
        const addonsTotal = selectedAddons.reduce((sum, addonId) => {
            const addon = item.addons?.find(a => a.id === addonId)
            return sum + Number(addon?.price || 0)
        }, 0)
        return (basePrice + addonsTotal) * quantity
    }

    const handleAddToCart = () => {
        onAddToCart(quantity, selectedVariant || undefined, selectedAddons.length > 0 ? selectedAddons : undefined)
        onClose()
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.dragIndicator} />
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Item Image */}
                        {item.imageUrl && (
                            <Image
                                source={{ uri: resolveImageUrl(item.imageUrl) ?? item.imageUrl }}
                                style={styles.itemImage}
                                resizeMode="cover"
                            />
                        )}

                        {/* Item Info */}
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            {item.description && (
                                <Text style={styles.itemDescription}>{item.description}</Text>
                            )}
                            <Text style={styles.basePrice}>රු {Number(selectedVariant?.price || item.price || 0).toFixed(2)}</Text>
                        </View>

                        {/* Variants Selection */}
                        {item.variants && item.variants.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Select Size</Text>
                                {item.variants.map((variant) => (
                                    <TouchableOpacity
                                        key={variant.id}
                                        style={[
                                            styles.variantOption,
                                            selectedVariant?.id === variant.id && styles.variantOptionSelected,
                                            !variant.isActive && styles.variantOptionDisabled,
                                        ]}
                                        onPress={() => variant.isActive && setSelectedVariant(variant)}
                                        disabled={!variant.isActive}
                                    >
                                        <View style={styles.variantInfo}>
                                            <Text style={[
                                                styles.variantName,
                                                selectedVariant?.id === variant.id && styles.variantNameSelected,
                                                !variant.isActive && styles.variantNameDisabled,
                                            ]}>
                                                {variant.name}
                                            </Text>
                                            {!variant.isActive && (
                                                <Text style={styles.unavailableText}>(Unavailable)</Text>
                                            )}
                                        </View>
                                        <Text style={[
                                            styles.variantPrice,
                                            selectedVariant?.id === variant.id && styles.variantPriceSelected,
                                        ]}>
                                            රු {Number(variant.price || 0).toFixed(2)}
                                        </Text>
                                        {selectedVariant?.id === variant.id && (
                                            <Ionicons name="checkmark-circle" size={24} color={Theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Addons Selection */}
                        {item.addons && item.addons.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Add-ons (Optional)</Text>
                                {item.addons.map((addon) => (
                                    <TouchableOpacity
                                        key={addon.id}
                                        style={[
                                            styles.addonOption,
                                            selectedAddons.includes(addon.id) && styles.addonOptionSelected,
                                        ]}
                                        onPress={() => toggleAddon(addon.id)}
                                    >
                                        <View style={styles.addonInfo}>
                                            <Text style={[
                                                styles.addonName,
                                                selectedAddons.includes(addon.id) && styles.addonNameSelected,
                                            ]}>
                                                {addon.name}
                                            </Text>
                                            <Text style={styles.addonPrice}>+රු {Number(addon.price || 0).toFixed(2)}</Text>
                                        </View>
                                        <View style={[
                                            styles.checkbox,
                                            selectedAddons.includes(addon.id) && styles.checkboxSelected,
                                        ]}>
                                            {selectedAddons.includes(addon.id) && (
                                                <Ionicons name="checkmark" size={16} color="#FFF" />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Quantity Selector */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Quantity</Text>
                            <View style={styles.quantityContainer}>
                                <TouchableOpacity
                                    style={[styles.quantityButton, quantity === 1 && styles.quantityButtonDisabled]}
                                    onPress={handleDecrement}
                                    disabled={quantity === 1}
                                >
                                    <Ionicons name="remove" size={24} color={quantity === 1 ? '#CCC' : Theme.colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.quantityText}>{quantity}</Text>
                                <TouchableOpacity
                                    style={styles.quantityButton}
                                    onPress={handleIncrement}
                                >
                                    <Ionicons name="add" size={24} color={Theme.colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <View style={styles.totalContainer}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalPrice}>රු {calculateTotal().toFixed(2)}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleAddToCart}
                        >
                            <Ionicons name="cart" size={20} color="#FFF" style={styles.cartIcon} />
                            <Text style={styles.addButtonText}>Add to Cart</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: SCREEN_HEIGHT * 0.85,
        paddingBottom: 20,
    },
    header: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
        position: 'relative',
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#DDD',
        borderRadius: 2,
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        top: 12,
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    itemImage: {
        width: '100%',
        height: hp(25),
        borderRadius: 16,
        marginBottom: 16,
    },
    itemInfo: {
        marginBottom: 20,
    },
    itemName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    itemDescription: {
        fontSize: rf(Theme.fontSize.md),
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    basePrice: {
        fontSize: rf(Theme.fontSize.xl),
        fontWeight: '700',
        color: Theme.colors.primary,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: rf(Theme.fontSize.lg),
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    variantOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        marginBottom: 12,
    },
    variantOptionSelected: {
        borderColor: Theme.colors.primary,
        backgroundColor: Theme.colors.orangeLight,
    },
    variantOptionDisabled: {
        opacity: 0.5,
    },
    variantInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    variantName: {
        fontSize: rf(Theme.fontSize.base),
        fontWeight: '500',
        color: '#1A1A1A',
    },
    variantNameSelected: {
        color: Theme.colors.primary,
        fontWeight: '600',
    },
    variantNameDisabled: {
        color: '#999',
    },
    unavailableText: {
        fontSize: rf(Theme.fontSize.sm),
        color: '#999',
        fontStyle: 'italic',
    },
    variantPrice: {
        fontSize: rf(Theme.fontSize.base),
        fontWeight: '600',
        color: '#666',
        marginRight: 8,
    },
    variantPriceSelected: {
        color: Theme.colors.primary,
    },
    addonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 10,
    },
    addonOptionSelected: {
        borderColor: Theme.colors.primary,
        backgroundColor: Theme.colors.orangeLight,
    },
    addonInfo: {
        flex: 1,
    },
    addonName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    addonNameSelected: {
        color: Theme.colors.primary,
    },
    addonPrice: {
        fontSize: 13,
        color: '#666',
    },
    checkbox: {
        width: rs(24),
        height: rs(24),
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#DDD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: Theme.colors.primary,
        borderColor: Theme.colors.primary,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    quantityButton: {
        width: Theme.touchTarget.medium,
        height: Theme.touchTarget.medium,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: Theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityButtonDisabled: {
        borderColor: '#DDD',
    },
    quantityText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        minWidth: 40,
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    totalLabel: {
        fontSize: rf(Theme.fontSize.lg),
        fontWeight: '600',
        color: '#666',
    },
    totalPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Theme.colors.primary,
    },
    addButton: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartIcon: {
        marginRight: 8,
    },
    addButtonText: {
        color: '#FFF',
        fontSize: rf(Theme.fontSize.lg),
        fontWeight: 'bold',
    },
})
