import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export function AuthHeader() {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#897646', '#6F5E36']} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.logoTile}>
        <Text style={styles.logoLetter}>P</Text>
      </LinearGradient>

      <Text style={styles.brand}>PharmaPRS</Text>
      <Text style={styles.tagline}>Patient records, simplified.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm
  },
  logoTile: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    shadowColor: '#6F5E36',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 8
  },
  logoLetter: {
    fontFamily: 'FunnelSans-Bold',
    fontSize: 28,
    color: '#F8F3E8',
    lineHeight: 32
  },
  brand: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 22,
    color: colors.text
  },
  tagline: {
    ...typography.tagline,
    fontSize: 14,
    color: colors.textMuted
  }
});
