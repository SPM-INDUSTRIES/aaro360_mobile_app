import { useRef } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAppSelector } from '../store/store'
import { Theme } from '../styles/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const BUTTON_SIZE = 60
const MARGIN = 20

export default function FloatingCartButton() {
    const router = useRouter()
    const segments = useSegments()
    const { items } = useAppSelector((state) => state.cart)
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

    // Check if we're on the cart screen
    const isOnCartScreen = segments.includes('cart' as never)

    // Position for dragging
    const pan = useRef(new Animated.ValueXY({
        x: SCREEN_WIDTH - BUTTON_SIZE - MARGIN,
        y: SCREEN_HEIGHT - 200,
    })).current

    const panResponder = useRef(
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
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset()

                // Snap to edge
                const currentX = (pan.x as any)._value
                const currentY = (pan.y as any)._value

                // Determine which side to snap to
                const snapToRight = currentX > SCREEN_WIDTH / 2 - BUTTON_SIZE / 2

                // Constrain Y within screen bounds
                let finalY = currentY
                if (finalY < MARGIN + 50) finalY = MARGIN + 50
                if (finalY > SCREEN_HEIGHT - BUTTON_SIZE - 150) finalY = SCREEN_HEIGHT - BUTTON_SIZE - 150

                Animated.spring(pan, {
                    toValue: {
                        x: snapToRight ? SCREEN_WIDTH - BUTTON_SIZE - MARGIN : MARGIN,
                        y: finalY,
                    },
                    useNativeDriver: false,
                    friction: 7,
                }).start()
            },
        })
    ).current

    // Don't render if cart is empty or on cart screen
    if (totalItems === 0 || isOnCartScreen) {
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
                activeOpacity={0.9}
            >
                <Ionicons name="cart" size={28} color="#FFF" />
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 1000,
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
        backgroundColor: Theme.colors.deepBlue,
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
