import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { BottomSheetWrapper } from '../ui';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const BRANCH_PICKER_SNAP = ['60%'];

interface BranchPickerSheetProps {
  branches: string[];
  selected: string | undefined;
  onSelect: (branch: string | undefined) => void;
  onClose: () => void;
}

function OptionRow({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.optionRow, isSelected && styles.optionRowSelected]} onPress={onPress}>
      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{label}</Text>
      <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>{isSelected ? <View style={styles.radioDot} /> : null}</View>
    </Pressable>
  );
}

export const BranchPickerSheet = forwardRef<BottomSheetModal, BranchPickerSheetProps>(({ branches, selected, onSelect, onClose }, ref) => {
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetWrapper ref={ref} snapPoints={BRANCH_PICKER_SNAP} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Branch</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.optionsList}>
          <OptionRow label="No branch" isSelected={!selected} onPress={() => onSelect(undefined)} />
          {branches.map((branch) => (
            <OptionRow key={branch} label={branch} isSelected={selected === branch} onPress={() => onSelect(branch)} />
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
        <Pressable style={styles.applyBtn} onPress={onClose}>
          <Text style={styles.applyBtnText}>Apply</Text>
        </Pressable>
      </View>
    </BottomSheetWrapper>
  );
});

BranchPickerSheet.displayName = 'BranchPickerSheet';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    gap: spacing.base
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 20,
    color: colors.text
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionsList: { gap: 10 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14
  },
  optionRowSelected: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accentBorder
  },
  optionLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary
  },
  optionLabelSelected: {
    fontFamily: fonts.bodySemiBold,
    color: colors.accent
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#C8C0B2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioOuterSelected: {
    borderColor: colors.accent
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  applyBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center'
  },
  applyBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.background
  }
});
