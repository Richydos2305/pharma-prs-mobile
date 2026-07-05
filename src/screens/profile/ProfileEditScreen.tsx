import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Lock } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { getMe, updateMe } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';
import { Button, Input, SuccessCheck } from '../../components/ui';
import { useShakeAnimation } from '../../hooks/useShakeAnimation';
import { ScreenWrapper } from '../../components/layout';
import { colors } from '../../theme/colors';
import { fonts, typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { IUser } from '../../types';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileEdit'>;

// ── Inner form — mounts only once user is loaded, initialises state lazily ───

interface EditFormProps {
  user: IUser;
  navigation: Props['navigation'];
}

function EditForm({ user, navigation }: EditFormProps) {
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(user.fullName);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? '');
  const [fullNameError, setFullNameError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { animatedStyle: shakeStyle, shake } = useShakeAnimation();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: { fullName: string; phoneNumber?: string }) => updateMe(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.goBack();
      }, 700);
    },
    onError: () => shake()
  });

  async function handleSave() {
    if (!fullName.trim()) {
      shake();
      setFullNameError('Full name is required');
      return;
    }
    await mutateAsync({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim() || undefined
    });
  }

  return (
    <View style={styles.flex}>
      <View style={styles.navBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={16} color={colors.accent} />
        </Pressable>
        <Text style={styles.navTitle}>Edit Profile</Text>
        <Pressable onPress={handleSave} disabled={isPending}>
          <Text style={[styles.saveLink, isPending && styles.saveLinkDisabled]}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="e.g. Richard Osunmu"
            value={fullName}
            onChangeText={(v) => {
              setFullName(v);
              if (fullNameError) setFullNameError('');
            }}
            error={fullNameError}
            autoCapitalize="words"
          />
          <View style={styles.emailField}>
            <Input label="Email" value={user.email} editable={false} rightElement={<Lock size={16} color={colors.textMuted} />} />
            <Text style={styles.emailHint}>Email cannot be changed.</Text>
          </View>
          <Input label="Phone Number" placeholder="+234 800 000 0000" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
        </View>

        <Animated.View style={shakeStyle}>
          <Button title="Save Changes" onPress={handleSave} loading={isPending} disabled={isPending} />
        </Animated.View>
      </KeyboardAwareScrollView>

      <SuccessCheck visible={showSuccess} />
    </View>
  );
}

// ── Outer shell ───────────────────────────────────────────────────────────────

export function ProfileEditScreen({ navigation }: Props) {
  const { data: user } = useQuery({ queryKey: queryKeys.me, queryFn: getMe });

  return <ScreenWrapper>{user ? <EditForm user={user} navigation={navigation} /> : <View style={styles.loadingPlaceholder} />}</ScreenWrapper>;
}

const styles = StyleSheet.create({
  loadingPlaceholder: { flex: 1 },
  flex: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#D8D1C1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  navTitle: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 16,
    color: colors.text
  },
  saveLink: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.accent, fontWeight: '600' },
  saveLinkDisabled: { opacity: 0.5 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    gap: spacing.xl
  },
  form: { gap: spacing.md },
  emailField: { gap: spacing.xs },
  emailHint: { ...typography.caption, color: colors.textMuted }
});
