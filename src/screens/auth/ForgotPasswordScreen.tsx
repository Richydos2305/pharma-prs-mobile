import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail } from 'lucide-react-native';
import { forgotPassword } from '../../api/auth';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { AnimatedPressable } from '../../components/ui';
import { usePressSpring } from '../../hooks/usePressSpring';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();

  async function handleSubmit() {
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader />

        <View style={styles.panel}>
          {sent ? (
            <>
              <View style={styles.mailBadge}>
                <Mail size={28} color="#A08840" />
              </View>

              <View style={[styles.titleBlock, styles.titleBlockCenter]}>
                <Text style={[styles.screenTitle, { textAlign: 'center' }]}>Check your email</Text>
                <Text style={[styles.screenSubtitle, { textAlign: 'center' }]}>
                  If an account exists for your email address, we&apos;ve sent a password reset link. Check your inbox.
                </Text>
              </View>

              <AnimatedPressable
                onPress={() => navigation.navigate('Login')}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={[styles.primaryBtn, animatedStyle]}
              >
                <Text style={styles.primaryBtnLabel}>Back to sign in</Text>
              </AnimatedPressable>
            </>
          ) : (
            <>
              <View style={styles.titleBlock}>
                <Text style={styles.screenTitle}>Forgot password?</Text>
                <Text style={styles.screenSubtitle}>Enter your email and we&apos;ll send you a reset link.</Text>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="jane@pharmacy.com"
                    placeholderTextColor={colors.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <AnimatedPressable
                onPress={handleSubmit}
                disabled={isLoading}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={[styles.primaryBtn, animatedStyle]}
              >
                <Text style={styles.primaryBtnLabel}>{isLoading ? 'Sending…' : 'Send Reset Link'}</Text>
              </AnimatedPressable>

              <View style={styles.footerRow}>
                <Pressable onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.footerLink}>Back to sign in</Text>
                </Pressable>
              </View>
            </>
          )}
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
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2
  },
  titleBlock: { gap: 8 },
  screenTitle: { fontFamily: 'FunnelSans-Bold', fontWeight: '700', fontSize: 30, lineHeight: 32, color: colors.text },
  titleBlockCenter: { alignItems: 'center' },
  screenSubtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.textSecondary },
  mailBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F2E9D1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center'
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 10
  },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  inputBox: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputFill,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text, padding: 0 },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4
  },
  primaryBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.background },
  footerRow: { alignItems: 'center' },
  footerLink: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent }
});
