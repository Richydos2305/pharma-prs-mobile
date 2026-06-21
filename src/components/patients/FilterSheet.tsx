import { forwardRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { listPharmacists } from '../../api/pharmacists';
import { queryKeys } from '../../api/queryKeys';
import { BottomSheetWrapper } from '../ui';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const FILTER_SNAP = ['82%'];

export interface FilterParams {
  ageGroup?: 'under30' | '30-50' | '51-70' | '71plus';
  lastVisit?: 'last30' | 'last90' | 'thisYear';
  pharmacistName?: string;
  sort: 'newest' | 'oldest';
}

interface FilterSheetProps {
  current: FilterParams;
  onApply: (params: FilterParams) => void;
  onClose: () => void;
}

const AGE_OPTIONS: { value: FilterParams['ageGroup']; label: string }[] = [
  { value: undefined, label: 'All ages' },
  { value: 'under30', label: 'Under 30' },
  { value: '30-50', label: '30 – 50' },
  { value: '51-70', label: '51 – 70' },
  { value: '71plus', label: '71 +' }
];

const VISIT_OPTIONS: { value: FilterParams['lastVisit']; label: string }[] = [
  { value: undefined, label: 'Any time' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 3 months' },
  { value: 'thisYear', label: 'This year' }
];

function RadioRow({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <Pressable onPress={onSelect} style={[styles.optionRow, selected && styles.optionRowSelected]}>
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>{selected && <View style={styles.radioDot} />}</View>
    </Pressable>
  );
}

export const FilterSheet = forwardRef<BottomSheetModal, FilterSheetProps>(({ current, onApply, onClose }, ref) => {
  const [ageGroup, setAgeGroup] = useState(current.ageGroup);
  const [lastVisit, setLastVisit] = useState(current.lastVisit);
  const [pharmacistName, setPharmacistName] = useState(current.pharmacistName ?? '');

  const { data: pharmacists } = useQuery({
    queryKey: queryKeys.pharmacists,
    queryFn: listPharmacists
  });

  function handleApply() {
    onApply({
      ageGroup,
      lastVisit,
      pharmacistName: pharmacistName || undefined,
      sort: current.sort
    });
    (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
  }

  function handleReset() {
    setAgeGroup(undefined);
    setLastVisit(undefined);
    setPharmacistName('');
  }

  return (
    <BottomSheetWrapper ref={ref} snapPoints={FILTER_SNAP} onClose={onClose}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter Patients</Text>
            <Text style={styles.subtitle}>Choose the exact patient slice you want before applying it to the full roster.</Text>
          </View>

          {/* Age group */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Age group</Text>
            {AGE_OPTIONS.map((opt) => (
              <RadioRow key={opt.label} label={opt.label} selected={ageGroup === opt.value} onSelect={() => setAgeGroup(opt.value)} />
            ))}
          </View>

          {/* Last appointment */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Last appointment</Text>
            {VISIT_OPTIONS.map((opt) => (
              <RadioRow key={opt.label} label={opt.label} selected={lastVisit === opt.value} onSelect={() => setLastVisit(opt.value)} />
            ))}
          </View>

          {/* Pharmacist */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pharmacist</Text>
            <RadioRow label="All pharmacists" selected={!pharmacistName} onSelect={() => setPharmacistName('')} />
            {(pharmacists ?? []).map((p) => (
              <RadioRow key={p.id} label={p.name} selected={pharmacistName === p.name} onSelect={() => setPharmacistName(p.name)} />
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable onPress={handleReset} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
          <Pressable onPress={handleApply} style={styles.applyBtn}>
            <Text style={styles.applyBtnText}>Apply filters</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheetWrapper>
  );
});

FilterSheet.displayName = 'FilterSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: 6,
    paddingBottom: spacing.md,
    gap: 18
  },
  // Header
  header: {
    gap: 6
  },
  title: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 24,
    color: colors.text
  },
  subtitle: {
    fontFamily: 'Newsreader_400Regular_Italic',
    fontSize: 15,
    lineHeight: 20,
    color: '#5E5851'
  },
  // Section
  section: {
    gap: 8
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },
  // Option row
  optionRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFEF8',
    borderWidth: 1,
    borderColor: '#DDD6C7'
  },
  optionRowSelected: {
    backgroundColor: '#F4EEE2',
    borderColor: '#D8D1C1'
  },
  optionLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#5F5A53'
  },
  optionLabelSelected: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent
  },
  // Radio button
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
  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8D1C1'
  },
  clearBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent
  },
  applyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center'
  },
  applyBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.background
  }
});
