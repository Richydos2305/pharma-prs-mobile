import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSync } from '../../contexts/SyncContext';

export function TransitionOverlay() {
  const { isOnline } = useSync();
  const prevIsOnlineRef = useRef(isOnline);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (prevIsOnlineRef.current === isOnline) return;
    prevIsOnlineRef.current = isOnline;
    overlayOpacity.value = withSequence(withTiming(0.35, { duration: 350 }), withTiming(0, { duration: 450 }));
  }, [isOnline, overlayOpacity]);

  const style = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value
  }));

  return <Animated.View style={[styles.overlay, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFF3CD',
    zIndex: 100,
    elevation: 5
  }
});
