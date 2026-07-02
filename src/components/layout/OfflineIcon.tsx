import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { WifiOff } from 'lucide-react-native';
import { useSync } from '../../contexts/SyncContext';
import { registerIconMeasure } from '../../services/offlineIconPosition';

const ICON_SIZE = 32;

export function OfflineIcon() {
  const { isOfflineIconVisible } = useSync();
  const isFocused = useIsFocused();
  const viewRef = useRef<View>(null);
  const opacity = useSharedValue(0);

  // Only the focused screen registers — multiple screens are mounted simultaneously
  // by React Navigation, so without this guard the last-visited screen's icon would
  // own the registration and shrinkToIcon would animate to the wrong position.
  useEffect(() => {
    if (!isFocused) return;
    registerIconMeasure(
      () =>
        new Promise((resolve) => {
          if (!viewRef.current) {
            resolve(null);
            return;
          }
          viewRef.current.measureInWindow((x, y) => {
            resolve(x !== 0 || y !== 0 ? { x, y } : null);
          });
        })
    );
    return () => registerIconMeasure(null);
  }, [isFocused]);

  useEffect(() => {
    opacity.value = withTiming(isOfflineIconVisible ? 1 : 0, { duration: 300 });
  }, [isOfflineIconVisible, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <View ref={viewRef}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <WifiOff size={16} color="#856404" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#D4A017',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
