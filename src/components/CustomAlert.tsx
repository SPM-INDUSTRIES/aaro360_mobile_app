import React from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Pressable,
} from 'react-native';
import { Theme } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'error' | 'success';
}

const { width } = Dimensions.get('window');

export const CustomAlert = ({
    visible,
    title,
    message,
    onClose,
    onConfirm,
    confirmText = 'OK',
    cancelText = 'Cancel',
    type = 'info'
}: CustomAlertProps) => {
    const [animation] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
        if (visible) {
            Animated.spring(animation, {
                toValue: 1,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }).start();
        } else {
            Animated.timing(animation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const scale = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1],
    });

    const opacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const getIcon = () => {
        switch (type) {
            case 'warning': return { name: 'warning-outline', color: '#f27424' };
            case 'error': return { name: 'alert-circle-outline', color: '#EF4444' };
            case 'success': return { name: 'checkmark-circle-outline', color: '#10B981' };
            default: return { name: 'information-circle-outline', color: Theme.colors.deepBlue };
        }
    };

    const icon = getIcon();

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View
                    style={[
                        styles.alertContainer,
                        {
                            opacity,
                            transform: [{ scale }]
                        }
                    ]}
                >
                    <Pressable style={styles.content}>
                        <View style={styles.header}>
                            <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
                                <Ionicons name={icon.name as any} size={32} color={icon.color} />
                            </View>
                            <Text style={styles.title}>{title}</Text>
                        </View>

                        <Text style={styles.message}>{message}</Text>

                        <View style={styles.buttonContainer}>
                            {onConfirm && (
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={onClose}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[
                                    styles.confirmButton,
                                    !onConfirm && { width: '100%' },
                                    { backgroundColor: type === 'error' ? '#EF4444' : Theme.colors.primary }
                                ]}
                                onPress={onConfirm || onClose}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.confirmButtonText}>{confirmText}</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertContainer: {
        width: width * 0.85,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        ...Theme.shadows.medium,
    },
    content: {
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: Theme.colors.textDark,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4B5563',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
