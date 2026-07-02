import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';

export function OfflineWallScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <WifiOff size={48} color={colors.accent} strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>You're offline</Text>
        <Text style={styles.body}>
          You've been offline for several days. Reconnect to continue using PharmaPRS. Your data is safe and will sync automatically when you're back
          online.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center'
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22
  }
});
