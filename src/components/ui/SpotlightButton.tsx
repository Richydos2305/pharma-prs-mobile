import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const GLOW_SIZE = 200;

interface SpotlightButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function SpotlightButton({ title, onPress, loading = false, disabled = false }: SpotlightButtonProps) {
  const glowX = useSharedValue(0);
  const glowY = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const isDisabled = disabled || loading;

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    left: glowX.value - GLOW_SIZE / 2,
    top: glowY.value - GLOW_SIZE / 2
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(glowOpacity.value, [0, 1], ['#3D3730', colors.glowColor])
  }));

  return (
    <Animated.View style={[styles.outer, borderStyle, isDisabled && styles.disabled]}>
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        disabled={isDisabled}
        onTouchStart={(e) => {
          glowX.value = e.nativeEvent.locationX;
          glowY.value = e.nativeEvent.locationY;
          glowOpacity.value = withTiming(1, { duration: 150 });
        }}
        onTouchMove={(e) => {
          glowX.value = e.nativeEvent.locationX;
          glowY.value = e.nativeEvent.locationY;
        }}
        onTouchEnd={() => {
          glowOpacity.value = withTiming(0, { duration: 400 });
        }}
        style={styles.pressable}
      >
        <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />
        {loading ? <ActivityIndicator color={colors.accentBg} size="small" /> : <Text style={styles.label}>{title}</Text>}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: colors.glowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 4
  },
  pressable: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: colors.glowColor
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.background
  },
  disabled: {
    opacity: 0.5
  }
});
