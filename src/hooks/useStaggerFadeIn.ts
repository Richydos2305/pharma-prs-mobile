import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSharedValue, useAnimatedStyle, withTiming, withDelay, ReduceMotion } from 'react-native-reanimated';

const DY = 10;
const DURATION = 180;
const STAGGER = 45;

// Fixed-count shared values — hooks rules forbid calling useSharedValue in a loop,
// so we pre-declare 6 slots and expose only the first `count`.
//
// `ready` defaults to true. Pass `!isLoading` on screens that show a loading
// skeleton before their content mounts, so the animation waits for real content.
export function useStaggerFadeIn(count: number, ready: boolean = true) {
  const o0 = useSharedValue(0);
  const y0 = useSharedValue(DY);
  const o1 = useSharedValue(0);
  const y1 = useSharedValue(DY);
  const o2 = useSharedValue(0);
  const y2 = useSharedValue(DY);
  const o3 = useSharedValue(0);
  const y3 = useSharedValue(DY);
  const o4 = useSharedValue(0);
  const y4 = useSharedValue(DY);
  const o5 = useSharedValue(0);
  const y5 = useSharedValue(DY);

  const a0 = useAnimatedStyle(() => ({ opacity: o0.value, transform: [{ translateY: y0.value }] }));
  const a1 = useAnimatedStyle(() => ({ opacity: o1.value, transform: [{ translateY: y1.value }] }));
  const a2 = useAnimatedStyle(() => ({ opacity: o2.value, transform: [{ translateY: y2.value }] }));
  const a3 = useAnimatedStyle(() => ({ opacity: o3.value, transform: [{ translateY: y3.value }] }));
  const a4 = useAnimatedStyle(() => ({ opacity: o4.value, transform: [{ translateY: y4.value }] }));
  const a5 = useAnimatedStyle(() => ({ opacity: o5.value, transform: [{ translateY: y5.value }] }));

  const isFocusedRef = useRef(false);
  const prevReadyRef = useRef(ready);

  const animate = useCallback(() => {
    const pairs: [typeof o0, typeof y0][] = [
      [o0, y0],
      [o1, y1],
      [o2, y2],
      [o3, y3],
      [o4, y4],
      [o5, y5]
    ];
    pairs.slice(0, count).forEach(([o, y], i) => {
      o.value = 0;
      y.value = DY;
      o.value = withDelay(i * STAGGER, withTiming(1, { duration: DURATION, reduceMotion: ReduceMotion.System }));
      y.value = withDelay(i * STAGGER, withTiming(0, { duration: DURATION, reduceMotion: ReduceMotion.System }));
    });
  }, [count, o0, y0, o1, y1, o2, y2, o3, y3, o4, y4, o5, y5]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      if (ready) animate();
      return () => {
        isFocusedRef.current = false;
      };
    }, [ready, animate])
  );

  // Fire animation when ready transitions false → true while the screen is
  // already focused (e.g. dashboard data loads after the screen came into view).
  useEffect(() => {
    const wasNotReady = !prevReadyRef.current;
    prevReadyRef.current = ready;
    if (ready && wasNotReady && isFocusedRef.current) animate();
  }, [ready, animate]);

  return [a0, a1, a2, a3, a4, a5].slice(0, count);
}
