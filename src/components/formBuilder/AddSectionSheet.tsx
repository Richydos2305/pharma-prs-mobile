import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Repeat2 } from 'lucide-react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { BottomSheetWrapper, Button, Input } from '../ui';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { uniqueSlugId } from '../../utils/slugify';
import type { SectionSchema, SectionType } from '../../types/formBuilder';

export const ADD_SECTION_SNAP = ['60%', '75%'];

interface AddSectionSheetProps {
  existingIds: string[];
  onAdd: (section: SectionSchema) => void;
  onClose: () => void;
}

export const AddSectionSheet = forwardRef<BottomSheetModal, AddSectionSheetProps>(({ existingIds, onAdd, onClose }, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal);

  const [name, setName] = useState('');
  const [type, setType] = useState<SectionType>('standard');

  function handleTypeChange(newType: SectionType) {
    setType(newType);
    requestAnimationFrame(() => {
      sheetRef.current?.snapToIndex(newType === 'repeatable' ? 1 : 0);
    });
  }
  const [rowLabel, setRowLabel] = useState('');
  const [addButtonLabel, setAddButtonLabel] = useState('');
  const [nameError, setNameError] = useState('');

  function reset() {
    setName('');
    setType('standard');
    setRowLabel('');
    setAddButtonLabel('');
    setNameError('');
  }

  function handleAdd() {
    if (!name.trim()) {
      setNameError('Section name is required');
      return;
    }
    const trimmedName = name.trim();
    const section: SectionSchema = {
      id: uniqueSlugId(trimmedName, existingIds),
      name: trimmedName,
      type,
      fields: [],
      ...(type === 'repeatable' && {
        rowLabel: rowLabel.trim() || 'Item',
        addButtonLabel: addButtonLabel.trim() || 'Add another'
      })
    };
    onAdd(section);
    reset();
    onClose();
  }

  return (
    <BottomSheetWrapper ref={sheetRef} snapPoints={ADD_SECTION_SNAP} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>New Section</Text>

        <Input
          label="Section Name"
          placeholder="e.g. Consultation Notes"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (nameError) setNameError('');
          }}
          error={nameError}
          bottomSheet
        />

        <View style={styles.typeRow}>
          <Text style={styles.typeLabel}>Section Type</Text>
          <View style={styles.typeTabs}>
            {(['standard', 'repeatable'] as SectionType[]).map((t) => (
              <Pressable key={t} onPress={() => handleTypeChange(t)} style={[styles.typeTab, type === t && styles.typeTabActive]}>
                <Text style={[styles.typeTabText, type === t && styles.typeTabTextActive]}>{t === 'standard' ? 'Standard' : 'Repeatable'}</Text>
                <Text style={[styles.typeTabHint, type === t && styles.typeTabHintActive]}>
                  {t === 'standard' ? 'single record' : 'multiple rows'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {type === 'repeatable' && (
          <View style={styles.repeatableSettings}>
            <View style={styles.settingsHeader}>
              <Repeat2 size={13} color={colors.accent} />
              <Text style={styles.settingsLabel}>Repeatable settings</Text>
            </View>
            <View style={styles.compactInputGroup}>
              <Text style={styles.compactInputLabel}>Row Label</Text>
              <BottomSheetTextInput
                style={styles.compactInput}
                placeholder="e.g. Prescription"
                placeholderTextColor={colors.textMuted}
                value={rowLabel}
                onChangeText={setRowLabel}
              />
            </View>
            <View style={styles.compactInputGroup}>
              <Text style={styles.compactInputLabel}>Add Button Label</Text>
              <BottomSheetTextInput
                style={styles.compactInput}
                placeholder="e.g. Add Prescription"
                placeholderTextColor={colors.textMuted}
                value={addButtonLabel}
                onChangeText={setAddButtonLabel}
              />
            </View>
          </View>
        )}

        <Button title="Add Section" onPress={handleAdd} />
        <Pressable onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheetWrapper>
  );
});

AddSectionSheet.displayName = 'AddSectionSheet';

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 28,
    gap: 20
  },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 20, lineHeight: 24, color: colors.text },
  typeRow: { gap: spacing.xs },
  typeLabel: { ...typography.label, color: colors.textSecondary },
  typeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.accentPill,
    borderRadius: 12,
    padding: 3,
    gap: 3
  },
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.secondaryBg,
    borderWidth: 1,
    borderColor: colors.border
  },
  typeTabActive: { backgroundColor: colors.text, borderColor: 'transparent' },
  typeTabText: { ...typography.label, color: colors.textLight },
  typeTabTextActive: { color: colors.card },
  typeTabHint: { fontFamily: fonts.body, fontSize: 9, color: colors.textLight },
  typeTabHintActive: { color: colors.glowColor },
  repeatableSettings: {
    backgroundColor: colors.secondaryBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10
  },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingsLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.accent },
  compactInputGroup: { gap: 6 },
  compactInputLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  compactInput: {
    height: 52,
    backgroundColor: colors.inputFill,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text
  },
  cancelBtn: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textSecondary }
});
