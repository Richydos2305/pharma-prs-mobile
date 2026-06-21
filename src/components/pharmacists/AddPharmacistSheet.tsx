import { forwardRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { createPharmacist } from '../../api/pharmacists';
import { queryKeys } from '../../api/queryKeys';
import { BottomSheetWrapper, Button } from '../ui';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { IPharmacist } from '../../types';

export const ADD_SNAP = ['90%'];

interface AddPharmacistSheetProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddPharmacistSheet = forwardRef<BottomSheetModal, AddPharmacistSheetProps>(({ onClose, onSuccess }, ref) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setName('');
    setPhoneNumber('');
    setNameError('');
  }

  async function handleSave() {
    if (!name.trim()) {
      setNameError('Full name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createPharmacist({ name: name.trim(), phoneNumber: phoneNumber.trim() || undefined });
      const current = queryClient.getQueryData<IPharmacist[]>(queryKeys.pharmacists) ?? [];
      queryClient.setQueryData(queryKeys.pharmacists, [...current, created]);
      reset();
      onSuccess?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <BottomSheetWrapper ref={ref} snapPoints={ADD_SNAP} onClose={onClose}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <ChevronLeft size={16} color={colors.accent} />
          </Pressable>
          <Text style={styles.topBarTitle}>Add Pharmacist</Text>
          <View style={styles.topBarSpacer} />
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.introEyebrow}>Care team setup</Text>
          <Text style={styles.introBody}>Add the pharmacist's name and phone number so they can be assigned to patient visits.</Text>
        </View>

        {/* Pharmacist Details card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pharmacist Details</Text>
          <View style={styles.fieldWrap}>
            <View style={[styles.fieldBox, nameError ? styles.fieldBoxError : null]}>
              <Text style={styles.fieldBoxLabel}>Full Name</Text>
              <TextInput
                style={styles.fieldBoxInput}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (nameError) setNameError('');
                }}
                placeholder="e.g. James Asante"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          </View>
          <View style={styles.fieldBox}>
            <Text style={styles.fieldBoxLabel}>Phone Number</Text>
            <TextInput
              style={styles.fieldBoxInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+233 XX XXX XXXX"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Assignment Context card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assignment Context</Text>
          <Text style={styles.contextBody}>
            Once saved, this pharmacist becomes available in patient intake and update flows as the locked "Attended To By" option.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Text style={styles.actionsLabel}>Actions</Text>
          <Button title="Save Pharmacist" onPress={handleSave} loading={isSubmitting} disabled={isSubmitting} />
          <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </BottomSheetWrapper>
  );
});

AddPharmacistSheet.displayName = 'AddPharmacistSheet';

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: 16
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
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
  topBarTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text
  },
  topBarSpacer: {
    width: 36,
    height: 36
  },

  // Intro
  intro: { gap: 4 },
  introEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },
  introBody: {
    fontFamily: fonts.bodySerif,
    fontSize: 16,
    lineHeight: 21,
    color: '#5E5851'
  },

  // Section card
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md
  },
  cardTitle: {
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

  // Assignment Context body
  contextBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 19,
    color: '#5F5A53'
  },

  // Actions
  actions: { gap: 10 },
  actionsLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },
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
