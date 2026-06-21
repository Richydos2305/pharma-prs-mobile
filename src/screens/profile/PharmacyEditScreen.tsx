import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Building2, ChevronLeft, Upload } from 'lucide-react-native';
import { getMe, updateMe, uploadLogo } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';
import { Button, Input } from '../../components/ui';
import { KeyboardAvoidingWrapper, ScreenWrapper } from '../../components/layout';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { IUser } from '../../types';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PharmacyEdit'>;

// ── Inner form ────────────────────────────────────────────────────────────────

interface PharmacyFormProps {
  user: IUser;
  navigation: Props['navigation'];
}

function PharmacyForm({ user, navigation }: PharmacyFormProps) {
  const queryClient = useQueryClient();

  const [companyName, setCompanyName] = useState(user.companyName ?? '');
  const [logoUri, setLogoUri] = useState<string | null>(user.companyLogo ?? null);
  const [isUploading, setIsUploading] = useState(false);

  const { mutateAsync: saveCompanyName, isPending } = useMutation({
    mutationFn: (payload: { companyName: string }) => updateMe(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated);
      navigation.goBack();
    }
  });

  async function handleLogoUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (result.canceled || !result.assets[0]) return;

    setIsUploading(true);
    try {
      const updated = await uploadLogo(result.assets[0]);
      queryClient.setQueryData(queryKeys.me, updated);
      setLogoUri(updated.companyLogo ?? null);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    await saveCompanyName({ companyName: companyName.trim() });
  }

  return (
    <KeyboardAvoidingWrapper>
      <View style={styles.navBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={16} color={colors.accent} />
        </Pressable>
        <Text style={styles.navTitle}>Pharmacy Settings</Text>
        <Pressable onPress={handleSave} disabled={isPending}>
          <Text style={[styles.saveLink, isPending && styles.saveLinkDisabled]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo upload */}
        <View style={styles.logoSection}>
          <Pressable onPress={handleLogoUpload} style={styles.logoWrap} disabled={isUploading}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Building2 size={32} color={colors.accent} />
              </View>
            )}
          </Pressable>
          <Pressable onPress={handleLogoUpload} style={styles.uploadBtn} disabled={isUploading}>
            <Upload size={14} color={colors.accent} />
            <Text style={styles.uploadText}>{isUploading ? 'Uploading…' : 'Upload Logo'}</Text>
          </Pressable>
          <Text style={styles.uploadHint}>Tap to upload a new logo</Text>
        </View>

        {/* Company name */}
        <Input label="Company Name" placeholder="e.g. MedPlus Pharmacy" value={companyName} onChangeText={setCompanyName} autoCapitalize="words" />

        <Button title="Save Changes" onPress={handleSave} loading={isPending} disabled={isPending || isUploading} />
      </ScrollView>
    </KeyboardAvoidingWrapper>
  );
}

// ── Outer shell ───────────────────────────────────────────────────────────────

export function PharmacyEditScreen({ navigation }: Props) {
  const { data: user } = useQuery({ queryKey: queryKeys.me, queryFn: getMe });

  return <ScreenWrapper>{user ? <PharmacyForm user={user} navigation={navigation} /> : <View style={styles.loadingPlaceholder} />}</ScreenWrapper>;
}

const styles = StyleSheet.create({
  loadingPlaceholder: { flex: 1 },
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
  logoSection: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#DCC68B'
  },
  logoImage: { width: 80, height: 80 },
  logoPlaceholder: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  uploadText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.accent, fontWeight: '600' },
  uploadHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.textMuted }
});
