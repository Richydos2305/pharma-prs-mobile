import { useSharedValue, useAnimatedStyle, withSequence, withTiming, ReduceMotion } from 'react-native-reanimated';

export function useShakeAnimation() {
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  const shake = () => {
    translateX.value = withSequence(
      withTiming(-6, { duration: 60, reduceMotion: ReduceMotion.System }),
      withTiming(5, { duration: 55, reduceMotion: ReduceMotion.System }),
      withTiming(-4, { duration: 50, reduceMotion: ReduceMotion.System }),
      withTiming(3, { duration: 45, reduceMotion: ReduceMotion.System }),
      withTiming(-2, { duration: 40, reduceMotion: ReduceMotion.System }),
      withTiming(0, { duration: 35, reduceMotion: ReduceMotion.System })
    );
  };

  return { animatedStyle, shake };
}
