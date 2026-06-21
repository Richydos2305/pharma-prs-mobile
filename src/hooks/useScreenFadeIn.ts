import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSharedValue, useAnimatedStyle, withTiming, ReduceMotion } from 'react-native-reanimated';

export function useScreenFadeIn({ duration = 450, dy = 12 }: { duration?: number; dy?: number } = {}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(dy);

  useFocusEffect(
    useCallback(() => {
      opacity.value = 0;
      translateY.value = dy;
      opacity.value = withTiming(1, { duration, reduceMotion: ReduceMotion.System });
      translateY.value = withTiming(0, { duration, reduceMotion: ReduceMotion.System });
    }, [opacity, translateY, duration, dy])
  );

  return useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));
}
