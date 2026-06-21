import { useSharedValue, useAnimatedStyle, withSpring, ReduceMotion } from 'react-native-reanimated';

export function usePressSpring(targetScale = 0.97) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const onPressIn = () => {
    scale.value = withSpring(targetScale, {
      stiffness: 400,
      damping: 30,
      mass: 1,
      overshootClamping: true,
      reduceMotion: ReduceMotion.System
    });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, {
      stiffness: 300,
      damping: 22,
      mass: 1,
      reduceMotion: ReduceMotion.System
    });
  };

  return { animatedStyle, onPressIn, onPressOut };
}
