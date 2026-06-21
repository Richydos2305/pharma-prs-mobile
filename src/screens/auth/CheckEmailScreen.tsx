import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail } from 'lucide-react-native';
import { resendVerification } from '../../api/auth';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'CheckEmail'>;

export function CheckEmailScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    if (resent || isResending) return;
    setIsResending(true);
    try {
      await resendVerification({ email });
      setResent(true);
    } catch {
      // silently ignore
    }
    setIsResending(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthHeader />

        <View style={styles.panel}>
          {/* Mail icon badge */}
          <View style={styles.badgeWrap}>
            <View style={styles.badge}>
              <Mail size={28} color={colors.accent} />
            </View>
          </View>

          {/* Title block */}
          <View style={styles.titleBlock}>
            <Text style={styles.screenTitle}>Check your email</Text>
            <Text style={styles.screenSubtitle}>
              We&apos;ve sent a verification link to your email address. Tap the link to activate your account.
            </Text>
          </View>

          {resent ? <Text style={styles.successText}>Verification email resent!</Text> : null}

          {/* Back to sign in — secondary style */}
          <Pressable onPress={() => navigation.navigate('Login')} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
            <Text style={styles.secondaryBtnLabel}>Back to sign in</Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Didn&apos;t receive it?</Text>
            <Pressable onPress={handleResend} disabled={isResending || resent}>
              <Text style={[styles.footerLink, (isResending || resent) && styles.footerLinkDisabled]}>
                {isResending ? 'Sending…' : 'Resend email'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    gap: spacing['2xl']
  },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2
  },
  badgeWrap: { alignItems: 'center' },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F2E9D1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleBlock: { gap: 8, alignItems: 'center' },
  screenTitle: { fontFamily: 'FunnelSans-Bold', fontSize: 30, lineHeight: 32, color: colors.text, textAlign: 'center' },
  screenSubtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.textSecondary, textAlign: 'center' },
  successText: { fontFamily: fonts.body, fontSize: 13, color: colors.success, textAlign: 'center' },
  secondaryBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F7F2E6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 2
  },
  btnPressed: { opacity: 0.85 },
  secondaryBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  footerLink: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent },
  footerLinkDisabled: { opacity: 0.5 }
});
