import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { AnimatedPressable, BottomSheetWrapper } from '../ui';
import { usePressSpring } from '../../hooks/usePressSpring';
import type { SortKey } from './FilterSheet';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const SORT_SNAP = ['62%'];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'updated', label: 'Recently updated' },
  { key: 'name-asc', label: 'Name A–Z' },
  { key: 'name-desc', label: 'Name Z–A' },
  { key: 'age-asc', label: 'Age (youngest first)' },
  { key: 'age-desc', label: 'Age (oldest first)' }
];

function SortRow({ opt, isSelected, onSelect }: { opt: { key: SortKey; label: string }; isSelected: boolean; onSelect: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring(0.97);
  return (
    <AnimatedPressable
      style={[styles.optionRow, isSelected && styles.optionRowSelected, animatedStyle]}
      onPress={onSelect}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{opt.label}</Text>
      <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
        {isSelected && <Animated.View entering={ZoomIn.duration(120).reduceMotion(ReduceMotion.System)} style={styles.radioDot} />}
      </View>
    </AnimatedPressable>
  );
}

interface SortSheetProps {
  current: SortKey;
  onApply: (key: SortKey) => void;
  onClose: () => void;
}

export const SortSheet = forwardRef<BottomSheetModal, SortSheetProps>(({ current, onApply, onClose }, ref) => {
  const [selected, setSelected] = useState<SortKey>(current);
  const insets = useSafeAreaInsets();

  function handleApply() {
    onApply(selected);
    (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
  }

  return (
    <BottomSheetWrapper ref={ref} snapPoints={SORT_SNAP} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sort by</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.optionsList}>
          {SORT_OPTIONS.map((opt) => (
            <SortRow key={opt.key} opt={opt} isSelected={selected === opt.key} onSelect={() => setSelected(opt.key)} />
          ))}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
        <Pressable style={styles.applyBtn} onPress={handleApply}>
          <Text style={styles.applyBtnText}>Apply Sort</Text>
        </Pressable>
      </View>
    </BottomSheetWrapper>
  );
});

SortSheet.displayName = 'SortSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.base,
    gap: spacing.base
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md
  },
  title: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 20,
    color: colors.text
  },
  optionsList: {
    gap: spacing.sm
  },
  optionRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.border
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
    fontSize: 14,
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
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center'
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
