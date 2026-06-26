import { forwardRef, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut
} from 'react-native-reanimated';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Calendar, Info, Check, CircleCheck } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { listPharmacists } from '../../api/pharmacists';
import { queryKeys } from '../../api/queryKeys';
import { AnimatedPressable, BottomSheetWrapper } from '../ui';
import { usePressSpring } from '../../hooks/usePressSpring';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LastApptPreset = 'last7' | 'last14' | 'last30' | 'last3months';
export type DateRegisteredPreset = 'last7' | 'last14' | 'last30' | 'last3months';
export type SortKey = 'newest' | 'oldest' | 'updated' | 'name-asc' | 'name-desc' | 'age-asc' | 'age-desc';

export interface FilterParams {
  ageGroup?: 'under30' | '30-50' | '51-70' | '71plus';
  lastApptPreset?: LastApptPreset;
  lastApptFrom?: string;
  lastApptTo?: string;
  dateRegisteredPreset?: DateRegisteredPreset;
  dateRegisteredFrom?: string;
  dateRegisteredTo?: string;
  pharmacistNames?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

type TabId = 'age' | 'lastAppt' | 'dateReg' | 'pharmacist';

const TABS: { id: TabId; label: string }[] = [
  { id: 'age', label: 'Age Group' },
  { id: 'lastAppt', label: 'Last Appointment' },
  { id: 'dateReg', label: 'Date Registered' },
  { id: 'pharmacist', label: 'Pharmacist' }
];

const AGE_OPTIONS: { value: FilterParams['ageGroup']; label: string }[] = [
  { value: 'under30', label: 'Under 30' },
  { value: '30-50', label: '30–50' },
  { value: '51-70', label: '51–70' },
  { value: '71plus', label: '71+' }
];

const PRESET_OPTIONS: { value: LastApptPreset | undefined; label: string }[] = [
  { value: undefined, label: 'Any' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last14', label: 'Last 14 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last3months', label: 'Last 3 months' }
];

type DateField = 'lastApptFrom' | 'lastApptTo' | 'dateRegFrom' | 'dateRegTo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatIsoForDisplay(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AgePane({ ageGroup, onSelect }: { ageGroup: FilterParams['ageGroup']; onSelect: (val: FilterParams['ageGroup']) => void }) {
  return (
    <View style={[paneStyles.container, paneStyles.gapLg]}>
      <Text style={paneStyles.sectionLabel}>AGE GROUP</Text>
      <View style={paneStyles.pillRow}>
        {AGE_OPTIONS.map((opt) => {
          const isSelected = ageGroup === opt.value;
          return (
            <Pressable
              key={opt.label}
              style={[paneStyles.pill, isSelected && paneStyles.pillSelected]}
              onPress={() => onSelect(isSelected ? undefined : opt.value)}
            >
              <Text style={[paneStyles.pillText, isSelected && paneStyles.pillTextSelected]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={paneStyles.hintBox}>
        <Info size={13} color={colors.textLight} />
        <Text style={paneStyles.helperText}>Select one age group to narrow results.</Text>
      </View>
    </View>
  );
}

function DateRangePane({
  label,
  subtitle,
  preset,
  fromDate,
  toDate,
  fromField,
  toField,
  kind = 'appt',
  gap = 10,
  onPresetChange,
  onFromChange,
  onToChange,
  onOpenPicker
}: {
  label: string;
  subtitle: string;
  preset: LastApptPreset | undefined;
  fromDate: string;
  toDate: string;
  fromField: DateField;
  toField: DateField;
  kind?: 'appt' | 'reg';
  gap?: number;
  onPresetChange: (val: LastApptPreset | undefined) => void;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onOpenPicker: (field: DateField) => void;
}) {
  const hasCustomRange = !!fromDate || !!toDate;

  function selectPreset(val: LastApptPreset | undefined) {
    onPresetChange(val);
    if (val !== undefined) {
      onFromChange('');
      onToChange('');
    }
  }

  function openFromPicker() {
    onPresetChange(undefined);
    onOpenPicker(fromField);
  }

  function openToPicker() {
    onPresetChange(undefined);
    onOpenPicker(toField);
  }

  const helperText = (() => {
    const verb = kind === 'reg' ? 'registered in' : 'seen in';
    if (preset === 'last7') return `Showing patients ${verb} last 7 days`;
    if (preset === 'last14') return `Showing patients ${verb} last 14 days`;
    if (preset === 'last30') return `Showing patients ${verb} last 30 days`;
    if (preset === 'last3months') return `Showing patients ${verb} last 3 months`;
    if (hasCustomRange) {
      const parts: string[] = [];
      if (fromDate) parts.push(`from ${formatIsoForDisplay(fromDate)}`);
      if (toDate) parts.push(`to ${formatIsoForDisplay(toDate)}`);
      return `Showing patients ${parts.join(' ')}`;
    }
    return null;
  })();

  return (
    <View style={[paneStyles.container, { gap }]}>
      <Text style={paneStyles.sectionLabel}>{label}</Text>
      <Text style={paneStyles.subtitle}>{subtitle}</Text>

      <View style={paneStyles.pillRow}>
        {PRESET_OPTIONS.map((opt) => {
          const isSelected = !hasCustomRange && preset === opt.value;
          return (
            <Pressable key={opt.label} style={[paneStyles.pill, isSelected && paneStyles.pillSelected]} onPress={() => selectPreset(opt.value)}>
              <Text style={[paneStyles.pillText, isSelected && paneStyles.pillTextSelected]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={paneStyles.dividerRow}>
        <View style={paneStyles.dividerLine} />
        <Text style={paneStyles.dividerText}>or custom range</Text>
        <View style={paneStyles.dividerLine} />
      </View>

      <View style={paneStyles.dateRow}>
        <Pressable style={[paneStyles.dateInput, !!fromDate && paneStyles.dateInputFilled]} onPress={openFromPicker}>
          <Calendar size={13} color={colors.textMuted} />
          <Text style={paneStyles.dateInputLabel}>From</Text>
          <View style={paneStyles.dateInputSep} />
          <Text style={[paneStyles.dateInputValue, !fromDate && paneStyles.dateInputEmpty]}>{fromDate ? formatIsoForDisplay(fromDate) : '—'}</Text>
        </Pressable>
        <Pressable style={[paneStyles.dateInput, !!toDate && paneStyles.dateInputFilled]} onPress={openToPicker}>
          <Calendar size={13} color={colors.textMuted} />
          <Text style={paneStyles.dateInputLabel}>To</Text>
          <View style={paneStyles.dateInputSep} />
          <Text style={[paneStyles.dateInputValue, !toDate && paneStyles.dateInputEmpty]}>{toDate ? formatIsoForDisplay(toDate) : '—'}</Text>
        </Pressable>
      </View>

      {helperText ? (
        <View style={paneStyles.activeNote}>
          <CircleCheck size={13} color={colors.accent} />
          <Text style={paneStyles.activeNoteText}>{helperText}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PharmacistPane({
  pharmacistNames,
  allNames,
  onToggle,
  onClearAll
}: {
  pharmacistNames: string[];
  allNames: string[];
  onToggle: (name: string) => void;
  onClearAll: () => void;
}) {
  return (
    <View style={[paneStyles.container, paneStyles.gapXs]}>
      <Text style={paneStyles.sectionLabel}>PHARMACIST</Text>
      <Text style={paneStyles.subtitle}>Select one or more pharmacists to narrow results</Text>
      <View style={paneStyles.pillCenterRow}>
        <Pressable style={[paneStyles.pill, pharmacistNames.length === 0 && paneStyles.pillSelected]} onPress={onClearAll}>
          <Text style={[paneStyles.pillText, pharmacistNames.length === 0 && paneStyles.pillTextSelected]}>All Pharmacists</Text>
        </Pressable>
      </View>
      <View style={paneStyles.pillRow}>
        {allNames.map((name) => {
          const isSelected = pharmacistNames.includes(name);
          return (
            <Pressable key={name} style={[paneStyles.pill, isSelected && paneStyles.pillSelected]} onPress={() => onToggle(name)}>
              <Text style={[paneStyles.pillText, isSelected && paneStyles.pillTextSelected]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TabChip({ tab, isActive, badge, onPress }: { tab: { id: TabId; label: string }; isActive: boolean; badge: number; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring(0.96);
  return (
    <AnimatedPressable
      style={[styles.tabChip, isActive ? styles.tabChipActive : badge > 0 ? styles.tabChipHasFilter : null, animatedStyle]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>{tab.label}</Text>
      {badge > 0 && (
        <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
          <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{badge}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface FilterSheetProps {
  current: FilterParams;
  onApply: (params: FilterParams) => void;
  onClose: () => void;
}

export const FilterSheet = forwardRef<BottomSheetModal, FilterSheetProps>(({ current, onApply, onClose }, ref) => {
  const [activeTab, setActiveTab] = useState<TabId>('age');
  const insets = useSafeAreaInsets();

  const [ageGroup, setAgeGroup] = useState(current.ageGroup);
  const [lastApptPreset, setLastApptPreset] = useState(current.lastApptPreset);
  const [lastApptFrom, setLastApptFrom] = useState(current.lastApptFrom ?? '');
  const [lastApptTo, setLastApptTo] = useState(current.lastApptTo ?? '');
  const [dateRegPreset, setDateRegPreset] = useState(current.dateRegisteredPreset);
  const [dateRegFrom, setDateRegFrom] = useState(current.dateRegisteredFrom ?? '');
  const [dateRegTo, setDateRegTo] = useState(current.dateRegisteredTo ?? '');
  const [pharmacistNames, setPharmacistNames] = useState<string[]>(current.pharmacistNames ?? []);

  const [datePickerCtx, setDatePickerCtx] = useState<{ field: DateField; date: Date } | null>(null);

  const { data: pharmacists } = useQuery({
    queryKey: queryKeys.pharmacists,
    queryFn: listPharmacists
  });

  const allPharmacistNames = (pharmacists ?? []).map((p) => p.name);

  function tabBadgeCount(tab: TabId): number {
    if (tab === 'age') return ageGroup ? 1 : 0;
    if (tab === 'lastAppt') return lastApptPreset || lastApptFrom || lastApptTo ? 1 : 0;
    if (tab === 'dateReg') return dateRegPreset || dateRegFrom || dateRegTo ? 1 : 0;
    return pharmacistNames.length > 0 ? 1 : 0;
  }
  const totalActive = TABS.reduce((n, t) => n + tabBadgeCount(t.id), 0);

  const paneOpacity = useSharedValue(1);
  const paneAnimStyle = useAnimatedStyle(() => ({ opacity: paneOpacity.value }));

  const badgeScale = useSharedValue(1);
  const badgeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));

  useEffect(() => {
    if (totalActive > 0) {
      cancelAnimation(badgeScale);
      badgeScale.value = withSequence(
        withSpring(1.14, { stiffness: 400, damping: 20, reduceMotion: ReduceMotion.System }),
        withSpring(1.0, { stiffness: 300, damping: 22, reduceMotion: ReduceMotion.System })
      );
    }
  }, [totalActive, badgeScale]);

  function switchTab(id: TabId) {
    paneOpacity.value = withTiming(0, { duration: 80, reduceMotion: ReduceMotion.System }, (finished) => {
      if (finished) {
        runOnJS(setActiveTab)(id);
        paneOpacity.value = withTiming(1, { duration: 150, reduceMotion: ReduceMotion.System });
      }
    });
  }

  function handleReset() {
    setAgeGroup(undefined);
    setLastApptPreset(undefined);
    setLastApptFrom('');
    setLastApptTo('');
    setDateRegPreset(undefined);
    setDateRegFrom('');
    setDateRegTo('');
    setPharmacistNames([]);
  }

  function handleApply() {
    onApply({
      ageGroup,
      lastApptPreset,
      lastApptFrom: lastApptFrom || undefined,
      lastApptTo: lastApptTo || undefined,
      dateRegisteredPreset: dateRegPreset,
      dateRegisteredFrom: dateRegFrom || undefined,
      dateRegisteredTo: dateRegTo || undefined,
      pharmacistNames: pharmacistNames.length > 0 ? pharmacistNames : undefined
    });
    (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
  }

  function togglePharmacist(name: string) {
    setPharmacistNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function openDatePicker(field: DateField) {
    const currentVal =
      field === 'lastApptFrom' ? lastApptFrom : field === 'lastApptTo' ? lastApptTo : field === 'dateRegFrom' ? dateRegFrom : dateRegTo;
    const date = currentVal ? new Date(currentVal) : new Date();
    setDatePickerCtx({ field, date });
  }

  function writeDateValue(field: DateField, iso: string) {
    if (field === 'lastApptFrom') {
      setLastApptFrom(iso);
      setLastApptPreset(undefined);
    } else if (field === 'lastApptTo') {
      setLastApptTo(iso);
      setLastApptPreset(undefined);
    } else if (field === 'dateRegFrom') {
      setDateRegFrom(iso);
      setDateRegPreset(undefined);
    } else {
      setDateRegTo(iso);
      setDateRegPreset(undefined);
    }
    setDatePickerCtx(null);
  }

  return (
    <>
      <BottomSheetWrapper ref={ref} enableDynamicSizing onClose={onClose}>
        <View style={styles.container}>
          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerTitle}>Filters</Text>
              {totalActive > 0 && (
                <Animated.View
                  entering={ZoomIn.springify().reduceMotion(ReduceMotion.System)}
                  exiting={ZoomOut.duration(100).reduceMotion(ReduceMotion.System)}
                  style={[styles.headerBadge, badgeAnimStyle]}
                >
                  <Text style={styles.headerBadgeText}>{totalActive} active</Text>
                </Animated.View>
              )}
            </View>
            <View style={styles.headerRight}>
              <Pressable onPress={handleReset} hitSlop={8}>
                <Text style={styles.resetAllText}>Reset All</Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.hDivider} />

          {/* Tab chip section — 2 fixed rows */}
          <View style={styles.tabSection}>
            {[TABS.slice(0, 2), TABS.slice(2, 4)].map((row, rowIdx) => (
              <View key={rowIdx} style={styles.tabRow}>
                {row.map((tab) => (
                  <TabChip key={tab.id} tab={tab} isActive={activeTab === tab.id} badge={tabBadgeCount(tab.id)} onPress={() => switchTab(tab.id)} />
                ))}
              </View>
            ))}
          </View>

          <View style={styles.tabDivider} />

          {/* Tab content */}
          <Animated.View style={[styles.contentArea, paneAnimStyle]}>
            {activeTab === 'age' ? <AgePane ageGroup={ageGroup} onSelect={setAgeGroup} /> : null}

            {activeTab === 'lastAppt' ? (
              <DateRangePane
                label="LAST APPOINTMENT"
                subtitle="Most recent appointment within the selected period"
                preset={lastApptPreset}
                fromDate={lastApptFrom}
                toDate={lastApptTo}
                fromField="lastApptFrom"
                toField="lastApptTo"
                gap={10}
                onPresetChange={setLastApptPreset}
                onFromChange={setLastApptFrom}
                onToChange={setLastApptTo}
                onOpenPicker={openDatePicker}
              />
            ) : null}

            {activeTab === 'dateReg' ? (
              <DateRangePane
                label="DATE REGISTERED"
                subtitle="Filter by when the patient was first added"
                preset={dateRegPreset}
                fromDate={dateRegFrom}
                toDate={dateRegTo}
                fromField="dateRegFrom"
                toField="dateRegTo"
                kind="reg"
                gap={12}
                onPresetChange={setDateRegPreset}
                onFromChange={setDateRegFrom}
                onToChange={setDateRegTo}
                onOpenPicker={openDatePicker}
              />
            ) : null}

            {activeTab === 'pharmacist' ? (
              <PharmacistPane
                pharmacistNames={pharmacistNames}
                allNames={allPharmacistNames}
                onToggle={togglePharmacist}
                onClearAll={() => setPharmacistNames([])}
              />
            ) : null}
          </Animated.View>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>
            <Pressable style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </Pressable>
            <Pressable style={styles.applyBtn} onPress={handleApply}>
              <Check size={14} color={colors.background} />
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheetWrapper>

      {/* Date picker — Android */}
      {datePickerCtx && Platform.OS === 'android' && (
        <DateTimePicker
          value={datePickerCtx.date}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (event.type === 'dismissed') {
              setDatePickerCtx(null);
              return;
            }
            if (date) writeDateValue(datePickerCtx.field, date.toISOString().split('T')[0]);
            setDatePickerCtx(null);
          }}
        />
      )}

      {/* Date picker — iOS */}
      {datePickerCtx && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" onRequestClose={() => setDatePickerCtx(null)}>
          <Pressable style={styles.datePickerBackdrop} onPress={() => setDatePickerCtx(null)} />
          <View style={styles.datePickerSheet}>
            <View style={styles.datePickerHeader}>
              <Pressable onPress={() => setDatePickerCtx(null)}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  writeDateValue(datePickerCtx.field, datePickerCtx.date.toISOString().split('T')[0]);
                }}
              >
                <Text style={styles.datePickerDone}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={datePickerCtx.date}
              mode="date"
              display="spinner"
              onChange={(_, date) => {
                if (date) setDatePickerCtx((prev) => (prev ? { ...prev, date } : null));
              }}
              style={styles.datePickerWheel}
            />
          </View>
        </Modal>
      )}
    </>
  );
});

FilterSheet.displayName = 'FilterSheet';

// ─── Pane styles ──────────────────────────────────────────────────────────────

const paneStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md
  },
  gapXs: { gap: 6 },
  gapSm: { gap: 10 },
  gapMd: { gap: 12 },
  gapLg: { gap: 20 },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.textMuted,
    textAlign: 'center'
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center'
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center'
  },
  pillCenterRow: {
    flexDirection: 'row',
    justifyContent: 'center'
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.border
  },
  pillSelected: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accentBorder
  },
  pillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary
  },
  pillTextSelected: {
    color: colors.accent
  },
  helperText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 18
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  activeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentBg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  activeNoteText: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accent
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border
  },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8
  },
  dateInputFilled: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accentBorder
  },
  dateInputLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted
  },
  dateInputSep: {
    width: 1,
    height: 14,
    backgroundColor: colors.border
  },
  dateInputValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text
  },
  dateInputEmpty: {
    color: colors.textMuted
  }
});

// ─── Sheet styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {},
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  headerTitleGroup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8
  },
  headerTitle: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700' as const,
    fontSize: 18,
    color: colors.text
  },
  headerBadge: {
    borderRadius: 999,
    backgroundColor: colors.accentBg,
    paddingVertical: 2,
    paddingHorizontal: 8
  },
  headerBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent
  },
  resetAllText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accent
  },
  hDivider: {
    height: 1,
    backgroundColor: colors.border
  },
  tabSection: {
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8
  },
  tabDivider: {
    height: 1,
    backgroundColor: '#EDE9E0'
  },
  tabChip: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border
  },
  tabChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text
  },
  tabChipHasFilter: {
    backgroundColor: colors.accentBg,
    borderColor: '#B6994C'
  },
  tabChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary
  },
  tabChipTextActive: {
    color: colors.white
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.22)'
  },
  tabBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.white
  },
  tabBadgeTextActive: {
    color: colors.white
  },
  contentArea: {},
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.base,
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  resetBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  resetBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#5F5A53'
  },
  applyBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  applyBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.background
  },
  // Date picker modal
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  datePickerSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  datePickerCancel: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textSecondary
  },
  datePickerDone: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.accent
  },
  datePickerWheel: {
    height: 200
  }
});
