import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../styles/theme';

interface SkeletonContextValue {
  opacity: Animated.Value;
}

const SkeletonContext = createContext<SkeletonContextValue | null>(null);

export const SkeletonProvider = ({ children }: { children: ReactNode }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <SkeletonContext.Provider value={{ opacity }}>
      {children}
    </SkeletonContext.Provider>
  );
};

export const useSkeletonAnimation = () => {
  const context = useContext(SkeletonContext);
  return context?.opacity ?? null;
};

interface SkeletonProps {
  width?: any;
  height?: any;
  borderRadius?: number;
  style?: any;
}

export const Skeleton = ({ width, height, borderRadius, style }: SkeletonProps) => {
  const contextOpacity = useSkeletonAnimation();
  const localOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (contextOpacity) return;
    
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(localOpacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(localOpacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [contextOpacity, localOpacity]);

  const opacity = contextOpacity || localOpacity;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width || '100%',
          height: height || 20,
          borderRadius: borderRadius || Theme.borderRadius.md,
          opacity: opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
});