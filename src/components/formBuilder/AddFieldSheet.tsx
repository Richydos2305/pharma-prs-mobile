import { forwardRef, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { BottomSheetWrapper, Button, Input } from '../ui';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { uniqueSlugId } from '../../utils/slugify';
import type { FieldSchema, FieldType } from '../../types/formBuilder';

export const ADD_FIELD_SNAP = ['70%'];

const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: 'short_text', label: 'Short Text' },
  { type: 'number', label: 'Number' },
  { type: 'date', label: 'Date' },
  { type: 'textarea', label: 'Long Text' },
  { type: 'dropdown', label: 'Dropdown' },
  { type: 'file', label: 'File Upload' },
  { type: 'relation', label: 'Relation' }
];

interface AddFieldSheetProps {
  existingIds: string[];
  onAdd: (field: FieldSchema) => void;
  onClose: () => void;
}

export const AddFieldSheet = forwardRef<BottomSheetModal, AddFieldSheetProps>(({ existingIds, onAdd, onClose }, ref) => {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('short_text');
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');
  const [labelError, setLabelError] = useState('');
  const thumbAnim = useRef(new Animated.Value(required ? 1 : 0)).current;

  function toggleRequired(val: boolean) {
    setRequired(val);
    Animated.timing(thumbAnim, {
      toValue: val ? 1 : 0,
      duration: 200,
      useNativeDriver: true
    }).start();
  }

  function reset() {
    setLabel('');
    setType('short_text');
    setRequired(false);
    setPlaceholder('');
    setOptions([]);
    setNewOption('');
    setLabelError('');
  }

  function handleAdd() {
    if (!label.trim()) {
      setLabelError('Field label is required');
      return;
    }
    const trimmedLabel = label.trim();
    const field: FieldSchema = {
      id: uniqueSlugId(trimmedLabel, existingIds),
      label: trimmedLabel,
      type,
      required,
      placeholder: placeholder.trim() || undefined,
      ...(type === 'dropdown' && { options })
    };
    onAdd(field);
    reset();
    onClose();
  }

  return (
    <BottomSheetWrapper ref={ref} snapPoints={ADD_FIELD_SNAP} onClose={onClose}>
      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>New Field</Text>

        <Input
          label="Field Label"
          placeholder="e.g. Blood Type"
          value={label}
          onChangeText={(v) => {
            setLabel(v);
            if (labelError) setLabelError('');
          }}
          error={labelError}
        />

        <View style={styles.typeSection}>
          <Text style={styles.sectionLabel}>Field Type</Text>
          <View style={styles.typeChips}>
            {FIELD_TYPES.map((ft) => (
              <Pressable key={ft.type} onPress={() => setType(ft.type)} style={[styles.typeChip, type === ft.type && styles.typeChipActive]}>
                <Text style={[styles.typeChipText, type === ft.type && styles.typeChipTextActive]}>{ft.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.requiredRow}>
          <View style={styles.requiredInfo}>
            <Text style={styles.requiredLabel}>Required</Text>
            <Text style={styles.requiredHint}>Field must be filled before submission</Text>
          </View>
          <Pressable onPress={() => toggleRequired(!required)} style={[styles.track, required && styles.trackOn]}>
            <Animated.View
              style={[
                styles.thumb,
                {
                  transform: [
                    {
                      translateX: thumbAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 18]
                      })
                    }
                  ]
                }
              ]}
            />
          </Pressable>
        </View>

        <View style={styles.placeholderGroup}>
          <View style={styles.placeholderLabelRow}>
            <Text style={styles.sectionLabel}>Placeholder</Text>
            <Text style={styles.optionalTag}>Optional</Text>
          </View>
          <Input placeholder="e.g. Enter blood type" value={placeholder} onChangeText={setPlaceholder} />
        </View>

        {type === 'dropdown' && (
          <View style={styles.optionsSection}>
            <Text style={styles.sectionLabel}>Options</Text>
            {options.map((opt, i) => (
              <View key={i} style={styles.optionRow}>
                <Text style={styles.optionText}>{opt}</Text>
                <Pressable onPress={() => setOptions(options.filter((_, j) => j !== i))}>
                  <X size={14} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addOptionRow}>
              <View style={styles.addOptionInput}>
                <Input placeholder="Add option…" value={newOption} onChangeText={setNewOption} />
              </View>
              <Pressable
                onPress={() => {
                  if (newOption.trim()) {
                    setOptions([...options, newOption.trim()]);
                    setNewOption('');
                  }
                }}
                style={styles.addOptionBtn}
              >
                <Text style={styles.addOptionBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Button title="Add Field" onPress={handleAdd} />
        <Pressable onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetWrapper>
  );
});

AddFieldSheet.displayName = 'AddFieldSheet';

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: 20
  },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 20, lineHeight: 24, color: colors.text },
  typeSection: { gap: spacing.xs },
  sectionLabel: { ...typography.label, color: colors.textSecondary },
  typeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondaryBg
  },
  typeChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  typeChipText: { ...typography.label, color: colors.textSecondary },
  typeChipTextActive: { color: colors.card },
  requiredLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 20, color: colors.text },
  requiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  requiredInfo: { flex: 1, gap: 2 },
  requiredHint: { ...typography.caption, color: colors.textMuted },
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    padding: 3
  },
  trackOn: { backgroundColor: colors.text },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white
  },
  placeholderGroup: { gap: 6 },
  placeholderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionalTag: { fontFamily: fonts.body, fontSize: 11, color: colors.textLight },
  optionsSection: { gap: spacing.sm },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.activeNavBg,
    borderRadius: 8
  },
  optionText: { ...typography.body, color: colors.text },
  addOptionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addOptionInput: { flex: 1 },
  addOptionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.accent
  },
  addOptionBtnText: { ...typography.label, color: colors.white },
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
