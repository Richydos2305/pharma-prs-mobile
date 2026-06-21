import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, withDelay, ReduceMotion } from 'react-native-reanimated';

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

  const circleProps = useAnimatedProps(() => ({ strokeDashoffset: circleOffset.value }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: checkOffset.value }));

  useEffect(() => {
    if (visible) {
      circleOffset.value = CIRCUMFERENCE;
      checkOffset.value = CHECK_LENGTH;
      circleOffset.value = withTiming(0, { duration: 350, reduceMotion: ReduceMotion.System });
      checkOffset.value = withDelay(200, withTiming(0, { duration: 260, reduceMotion: ReduceMotion.System }));
    } else {
      circleOffset.value = CIRCUMFERENCE;
      checkOffset.value = CHECK_LENGTH;
    }
  }, [visible, circleOffset, checkOffset]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Svg width={96} height={96} viewBox="0 0 96 96">
            <Circle cx={48} cy={48} r={RADIUS} fill="#EDFAF2" />
            <AnimatedCircle
              cx={48}
              cy={48}
              r={RADIUS}
              fill="none"
              stroke="#22A348"
              strokeWidth={3}
              strokeDasharray={CIRCUMFERENCE}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
              animatedProps={circleProps}
            />
            <AnimatedPath
              d="M30 48 L42 60 L66 36"
              fill="none"
              stroke="#22A348"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={CHECK_LENGTH}
              animatedProps={checkProps}
            />
          </Svg>
        </View>
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
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8
  }
});
