import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Eye, EyeOff } from 'lucide-react-native';
import { resetPassword } from '../../api/auth';
import { AuthHeader } from '../../components/auth/AuthHeader';
import Animated from 'react-native-reanimated';
import { AnimatedPressable } from '../../components/ui';
import { usePressSpring } from '../../hooks/usePressSpring';
import { useShakeAnimation } from '../../hooks/useShakeAnimation';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { token } = route.params;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();
  const { animatedStyle: shakeStyle, shake } = useShakeAnimation();

  async function handleReset() {
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      shake();
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await resetPassword({ token, newPassword });
      navigation.navigate('Login');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      shake();
      setError(msg ?? 'Reset failed. The link may have expired.');
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
          <View style={styles.titleBlock}>
            <Text style={styles.screenTitle}>Reset your password</Text>
            <Text style={styles.screenSubtitle}>Choose a new password for your account.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!isLoading}
              />
              <Pressable onPress={() => setShowNew((v) => !v)} style={styles.eyeBtn}>
                {showNew ? <EyeOff size={18} color={colors.textLight} /> : <Eye size={18} color={colors.textLight} />}
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isLoading}
              />
              <Pressable onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
                {showConfirm ? <EyeOff size={18} color={colors.textLight} /> : <Eye size={18} color={colors.textLight} />}
              </Pressable>
            </View>
          </View>

          <Text style={styles.hint}>Password must be at least 8 characters and include uppercase, lowercase, and a symbol.</Text>

          <Animated.View style={shakeStyle}>
            <AnimatedPressable
              onPress={handleReset}
              disabled={isLoading}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={[styles.primaryBtn, animatedStyle]}
            >
              <Text style={styles.primaryBtnLabel}>{isLoading ? 'Resetting…' : 'Reset Password'}</Text>
            </AnimatedPressable>
          </Animated.View>
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
  screenTitle: { fontFamily: 'FunnelSans-Bold', fontSize: 30, lineHeight: 32, color: colors.text },
  screenSubtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.textSecondary },
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
  eyeBtn: { padding: spacing.xs },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.textLight },
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
  primaryBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.background }
});
