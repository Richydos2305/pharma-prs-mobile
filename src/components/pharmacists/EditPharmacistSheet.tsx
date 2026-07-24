import { forwardRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react-native';
import { updatePharmacist } from '../../api/pharmacists';
import { getMe } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';
import { getApiErrorMessage } from '../../utils/apiError';
import { BottomSheetWrapper, Button } from '../ui';
import { BranchPickerSheet } from './BranchPickerSheet';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { IPharmacist } from '../../types';

export const EDIT_SNAP = ['58%'];

interface EditPharmacistSheetProps {
  pharmacist: IPharmacist | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditPharmacistSheet = forwardRef<BottomSheetModal, EditPharmacistSheetProps>(({ pharmacist, onClose, onSuccess }, ref) => {
  const queryClient = useQueryClient();
  const branchPickerRef = useRef<BottomSheetModal>(null);
  // State is initialised from pharmacist on mount. Use key={pharmacist.id} on
  // the parent instance to remount whenever a different pharmacist is selected.
  const [name, setName] = useState(pharmacist?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(pharmacist?.phoneNumber ?? '');
  const [branch, setBranch] = useState<string | undefined>(pharmacist?.branch);
  const [nameError, setNameError] = useState('');
  const [branchError, setBranchError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: user } = useQuery({ queryKey: queryKeys.me, queryFn: getMe });
  const branches = user?.branches ?? [];

  async function handleSave() {
    if (!pharmacist) return;
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setIsSubmitting(true);
    setBranchError('');
    try {
      const updated = await updatePharmacist(pharmacist.id, {
        name: name.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        branch
      });
      const current = queryClient.getQueryData<IPharmacist[]>(queryKeys.pharmacists) ?? [];
      queryClient.setQueryData(
        queryKeys.pharmacists,
        current.map((p) => (p.id === updated.id ? updated : p))
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      setBranchError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <BottomSheetWrapper ref={ref} snapPoints={EDIT_SNAP} onClose={onClose}>
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>Edit Pharmacist</Text>

          {/* Name field */}
          <View style={styles.fieldWrap}>
            <View style={[styles.fieldBox, nameError ? styles.fieldBoxError : null]}>
              <Text style={styles.fieldBoxLabel}>Name</Text>
              <TextInput
                style={styles.fieldBoxInput}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (nameError) setNameError('');
                }}
                placeholder="e.g. Dr. Sarah Ade"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>

          {/* Phone Number field */}
          <View style={styles.fieldBox}>
            <Text style={styles.fieldBoxLabel}>Phone Number</Text>
            <TextInput
              style={styles.fieldBoxInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+234 800 000 0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Branch field */}
          <View style={styles.fieldWrap}>
            <Pressable
              style={[styles.fieldBox, styles.branchField, branchError ? styles.fieldBoxError : null]}
              onPress={() => branchPickerRef.current?.present()}
            >
              <View>
                <Text style={styles.fieldBoxLabel}>Branch</Text>
                <Text style={styles.fieldBoxInput}>{branch ?? 'No branch selected'}</Text>
              </View>
              <ChevronDown size={16} color={colors.textMuted} />
            </Pressable>
            {branchError ? <Text style={styles.errorText}>{branchError}</Text> : null}
          </View>

          {/* Actions */}
          <Button title="Save Changes" onPress={handleSave} loading={isSubmitting} disabled={isSubmitting} />
          <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </BottomSheetWrapper>
      <BranchPickerSheet
        ref={branchPickerRef}
        branches={branches}
        selected={branch}
        onSelect={setBranch}
        onClose={() => branchPickerRef.current?.dismiss()}
      />
    </>
  );
});

EditPharmacistSheet.displayName = 'EditPharmacistSheet';

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 28,
    gap: 20
  },
  title: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 20,
    color: colors.text
  },

  // Field box (label inside)
  fieldWrap: { gap: 4 },
  fieldBox: {
    backgroundColor: colors.inputFill,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6C7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4
  },
  fieldBoxError: { borderColor: colors.error },
  branchField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  fieldBoxLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },
  fieldBoxInput: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
    padding: 0
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error
  },

  // Cancel
  cancelBtn: {
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#D8D1C1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent
  }
});
