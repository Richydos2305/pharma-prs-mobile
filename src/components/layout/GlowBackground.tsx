import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

export function GlowBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={360} height={280} viewBox="0 0 360 280">
        <Defs>
          <RadialGradient id="pharmaBg" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#DCC68B" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#DCC68B" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={180} cy={140} rx={180} ry={140} fill="url(#pharmaBg)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -60,
    left: 15,
    width: 360,
    height: 280
  }
});
