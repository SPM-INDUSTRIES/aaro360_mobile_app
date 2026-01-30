import React, { useRef, useMemo } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAppSelector } from '../store/store'
import { Theme } from '../styles/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const BUTTON_SIZE = 60
const MARGIN = 20

export default function FloatingCartButton() {
    const router = useRouter()
    const cartItems = useAppSelector((state) => state.cart.items)
    const totalCount = useMemo(() =>
        cartItems.reduce((sum, item) => sum + item.quantity, 0),
        [cartItems]
    )

    // Position state for dragging - use useRef to avoid re-renders
    const pan = useRef(new Animated.ValueXY({
        x: SCREEN_WIDTH - BUTTON_SIZE - MARGIN,
        y: SCREEN_HEIGHT - BUTTON_SIZE - 200,
    })).current

    const panResponder = useMemo(() =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value,
                })
                pan.setValue({ x: 0, y: 0 })
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset()
                const currentX = (pan.x as any)._value
                const currentY = (pan.y as any)._value

                const snapToLeft = currentX < SCREEN_WIDTH / 2
                const targetX = snapToLeft ? MARGIN : SCREEN_WIDTH - BUTTON_SIZE - MARGIN

                const minY = 100
                const maxY = SCREEN_HEIGHT - BUTTON_SIZE - 200
                const targetY = Math.max(minY, Math.min(maxY, currentY))

                Animated.spring(pan, {
                    toValue: { x: targetX, y: targetY },
                    useNativeDriver: false,
                    friction: 5,
                }).start()
            },
        }),
        [pan]
    )

    // Don't render if cart is empty
    if (totalCount === 0) {
        return null
    }

    const handlePress = () => {
        router.push('/(tabs)/cart')
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateX: pan.x }, { translateY: pan.y }],
                },
            ]}
            {...panResponder.panHandlers}
        >
            <TouchableOpacity
                style={styles.button}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <Ionicons name="cart" size={28} color="#FFF" />
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {totalCount > 99 ? '99+' : totalCount}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 9999,
        elevation: 9999,
    },
    button: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        backgroundColor: Theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#FF3B30',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
})
