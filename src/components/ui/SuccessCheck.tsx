import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { Easing, useSharedValue, useAnimatedProps, useAnimatedStyle, withTiming, withDelay, ReduceMotion } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~226
const CHECK_LENGTH = 56;

interface SuccessCheckProps {
  visible: boolean;
}

export function SuccessCheck({ visible }: SuccessCheckProps) {
  const circleOffset = useSharedValue(CIRCUMFERENCE);
  const checkOffset = useSharedValue(CHECK_LENGTH);
  const svgScale = useSharedValue(0.7);
  const svgOpacity = useSharedValue(0);

  const circleProps = useAnimatedProps(() => ({ strokeDashoffset: circleOffset.value }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: checkOffset.value }));

  const svgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: svgScale.value }],
    opacity: svgOpacity.value
  }));

  useEffect(() => {
    if (visible) {
      circleOffset.value = CIRCUMFERENCE;
      checkOffset.value = CHECK_LENGTH;
      svgScale.value = 0.7;
      svgOpacity.value = 0;
      svgScale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease), reduceMotion: ReduceMotion.System });
      svgOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease), reduceMotion: ReduceMotion.System });
      circleOffset.value = withDelay(50, withTiming(0, { duration: 350, reduceMotion: ReduceMotion.System }));
      checkOffset.value = withDelay(250, withTiming(0, { duration: 260, reduceMotion: ReduceMotion.System }));
    } else {
      circleOffset.value = CIRCUMFERENCE;
      checkOffset.value = CHECK_LENGTH;
      svgScale.value = 0.7;
      svgOpacity.value = 0;
    }
  }, [visible, circleOffset, checkOffset, svgScale, svgOpacity]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={svgStyle}>
          <Svg width={80} height={80} viewBox="0 0 96 96">
            <AnimatedCircle
              cx={48}
              cy={48}
              r={RADIUS}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={3}
              strokeDasharray={CIRCUMFERENCE}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
              animatedProps={circleProps}
            />
            <AnimatedPath
              d="M30 48 L42 60 L66 36"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={CHECK_LENGTH}
              animatedProps={checkProps}
            />
          </Svg>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
