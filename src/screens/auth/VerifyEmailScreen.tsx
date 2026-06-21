import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BadgeCheck, XCircle } from 'lucide-react-native';
import { verifyEmail } from '../../api/auth';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;
type VerifyState = 'loading' | 'success' | 'error';

export function VerifyEmailScreen({ navigation, route }: Props) {
  const token = route.params?.token;
  const [state, setState] = useState<VerifyState>(token ? 'loading' : 'error');

  useEffect(() => {
    if (!token) return;
    async function verify() {
      try {
        await verifyEmail({ token: token! });
        setState('success');
      } catch {
        setState('error');
      }
    }
    verify();
  }, [token]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthHeader />

        <View style={styles.panel}>
          {state === 'loading' && (
            <>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.screenTitle}>Verifying…</Text>
              <Text style={styles.screenSubtitle}>Please wait a moment.</Text>
            </>
          )}

          {state === 'success' && (
            <>
              <View style={styles.badgeWrap}>
                <View style={[styles.badge, { backgroundColor: colors.successBg }]}>
                  <BadgeCheck size={30} color={colors.successText} />
                </View>
              </View>
              <View style={styles.titleBlock}>
                <Text style={styles.screenTitle}>Email verified</Text>
                <Text style={styles.screenSubtitle}>Your account is now active. You can sign in and start managing your patient records.</Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('Login')}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              >
                <Text style={styles.primaryBtnLabel}>Sign In</Text>
              </Pressable>
            </>
          )}

          {state === 'error' && (
            <>
              <View style={styles.badgeWrap}>
                <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                  <XCircle size={30} color={colors.error} />
                </View>
              </View>
              <View style={styles.titleBlock}>
                <Text style={styles.screenTitle}>Verification failed</Text>
                <Text style={styles.screenSubtitle}>The link may have expired or is invalid. Request a new one from the login screen.</Text>
              </View>
              <Pressable onPress={() => navigation.navigate('Login')} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
                <Text style={styles.secondaryBtnLabel}>Back to sign in</Text>
              </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleBlock: { gap: 10, alignItems: 'center' },
  screenTitle: { fontFamily: 'FunnelSans-Bold', fontSize: 30, lineHeight: 32, color: colors.text, textAlign: 'center' },
  screenSubtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.textSecondary, textAlign: 'center' },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4
  },
  primaryBtnPressed: { opacity: 0.85 },
  primaryBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.background },
  secondaryBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F7F2E6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%'
  },
  btnPressed: { opacity: 0.85 },
  secondaryBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text }
});
