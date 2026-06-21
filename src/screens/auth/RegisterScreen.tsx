import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { AuthHeader } from '../../components/auth/AuthHeader';
import Animated from 'react-native-reanimated';
import { AnimatedPressable } from '../../components/ui';
import { usePressSpring } from '../../hooks/usePressSpring';
import { useShakeAnimation } from '../../hooks/useShakeAnimation';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();
  const { animatedStyle: shakeStyle, shake } = useShakeAnimation();

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      shake();
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password });
      navigation.navigate('CheckEmail', { email: email.trim() });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      shake();
      setError(msg ?? 'Registration failed. Please try again.');
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
            <Text style={styles.screenTitle}>Create your account</Text>
            <Text style={styles.screenSubtitle}>Sign up to manage your patient records.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="Jane Smith"
                placeholderTextColor={colors.textLight}
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="jane@pharmacyco.com"
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={18} color={colors.textLight} /> : <Eye size={18} color={colors.textLight} />}
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

          <Animated.View style={shakeStyle}>
            <AnimatedPressable
              onPress={handleRegister}
              disabled={isLoading}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={[styles.primaryBtn, animatedStyle]}
            >
              <Text style={styles.primaryBtnLabel}>{isLoading ? 'Creating account…' : 'Create Account'}</Text>
            </AnimatedPressable>
          </Animated.View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.credentialNote}>Password must be at least 8 characters and include uppercase, lowercase, and a symbol.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
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
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  footerText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  footerLink: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent },
  credentialNote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.textLight, textAlign: 'center' }
});
