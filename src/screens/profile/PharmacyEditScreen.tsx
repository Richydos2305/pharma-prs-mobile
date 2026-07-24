import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Building2, ChevronLeft, Trash2, TriangleAlert, Upload } from 'lucide-react-native';
import { getMe, updateMe, uploadLogo } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';
import { getApiErrorMessage } from '../../utils/apiError';
import { Button, Input } from '../../components/ui';
import { ScreenWrapper } from '../../components/layout';
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
  const [branches, setBranches] = useState<string[]>(user.branches ?? []);
  const [newBranch, setNewBranch] = useState('');
  const [blockedError, setBlockedError] = useState('');

  const { mutateAsync: saveCompanyName, isPending } = useMutation({
    mutationFn: (payload: { companyName: string; branches: string[] }) => updateMe(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated);
      navigation.goBack();
    },
    onError: (err: unknown) => {
      setBlockedError(getApiErrorMessage(err));
    }
  });

  function addBranch() {
    const trimmed = newBranch.trim();
    if (!trimmed || branches.includes(trimmed)) return;
    setBranches((prev) => [...prev, trimmed]);
    setNewBranch('');
  }

  function removeBranch(branch: string) {
    setBranches((prev) => prev.filter((b) => b !== branch));
  }

  function goToPharmacists() {
    setBlockedError('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation.getParent() as any)?.navigate('Pharmacists');
  }

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
    try {
      await saveCompanyName({ companyName: companyName.trim(), branches });
    } catch {
      // surfaced via onError -> blockedError
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.navBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={16} color={colors.accent} />
        </Pressable>
        <Text style={styles.navTitle}>Pharmacy Settings</Text>
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

        {/* Branches */}
        <View style={styles.branchesSection}>
          <Text style={styles.branchesLabel}>Branches</Text>
          {branches.length > 0 ? (
            <View style={styles.branchList}>
              {branches.map((branch) => (
                <View key={branch} style={styles.branchRow}>
                  <Text style={styles.branchRowName}>{branch}</Text>
                  <Pressable onPress={() => removeBranch(branch)} hitSlop={8}>
                    <Trash2 size={16} color={colors.textLight} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.addBranchRow}>
            <View style={styles.addBranchInput}>
              <TextInput
                style={styles.addBranchInputText}
                value={newBranch}
                onChangeText={setNewBranch}
                placeholder="e.g. North Wing"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                onSubmitEditing={addBranch}
              />
            </View>
            <Pressable onPress={addBranch} style={styles.addBranchBtn}>
              <Text style={styles.addBranchBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>

        <Button title="Save Changes" onPress={handleSave} loading={isPending} disabled={isPending || isUploading} />
      </KeyboardAwareScrollView>

      <Modal transparent visible={!!blockedError} animationType="fade" onRequestClose={() => setBlockedError('')}>
        <View style={styles.blockedOverlay}>
          <View style={styles.blockedCard}>
            <View style={styles.blockedIconWrap}>
              <TriangleAlert size={22} color={colors.destructive} />
            </View>
            <View style={styles.blockedTextWrap}>
              <Text style={styles.blockedTitle}>Can&apos;t Remove This Branch</Text>
              <Text style={styles.blockedMessage}>{blockedError}</Text>
            </View>
            <View style={styles.blockedFooter}>
              <Pressable onPress={goToPharmacists} style={styles.blockedReassignBtn}>
                <Text style={styles.blockedReassignBtnText}>Reassign Pharmacists</Text>
              </Pressable>
              <Pressable onPress={() => setBlockedError('')} style={styles.blockedCancelBtn}>
                <Text style={styles.blockedCancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Outer shell ───────────────────────────────────────────────────────────────

export function PharmacyEditScreen({ navigation }: Props) {
  const { data: user } = useQuery({ queryKey: queryKeys.me, queryFn: getMe });

  return <ScreenWrapper>{user ? <PharmacyForm user={user} navigation={navigation} /> : <View style={styles.loadingPlaceholder} />}</ScreenWrapper>;
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
  uploadHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  // Branches
  branchesSection: { gap: spacing.sm },
  branchesLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  branchList: { gap: spacing.sm },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: '#DDD6C7',
    paddingHorizontal: 14
  },
  branchRowName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  addBranchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addBranchInput: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 14
  },
  addBranchInputText: { fontFamily: fonts.body, fontSize: 13, color: colors.text, padding: 0 },
  addBranchBtn: {
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  addBranchBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.background },
  // Blocked-removal modal
  blockedOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg
  },
  blockedCard: {
    width: 320,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: 14,
    alignItems: 'center'
  },
  blockedIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF6F4',
    alignItems: 'center',
    justifyContent: 'center'
  },
  blockedTextWrap: { gap: 6, alignItems: 'center' },
  blockedTitle: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 17,
    color: colors.text,
    textAlign: 'center'
  },
  blockedMessage: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: '#5F5A53',
    textAlign: 'center'
  },
  blockedFooter: { width: '100%', gap: spacing.sm, paddingTop: 6 },
  blockedReassignBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center'
  },
  blockedReassignBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.background },
  blockedCancelBtn: {
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#D8D1C1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  blockedCancelBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.accent }
});
