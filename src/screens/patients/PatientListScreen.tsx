import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useStaggerFadeIn } from '../../hooks/useStaggerFadeIn';
import { useQuery } from '@tanstack/react-query';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Filter, Plus, Search } from 'lucide-react-native';
import { listPatients } from '../../api/patients';
import { getMe } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';
import { Avatar, AnimatedPressable } from '../../components/ui';
import { ScreenWrapper } from '../../components/layout';
import { FilterSheet } from '../../components/patients/FilterSheet';
import { usePressSpring } from '../../hooks/usePressSpring';
import type { FilterParams } from '../../components/patients/FilterSheet';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { PatientsStackParamList } from '../../navigation/types';
import type { IPatient } from '../../types';

type NavProp = NativeStackNavigationProp<PatientsStackParamList, 'PatientList'>;

const DEFAULT_FILTER: FilterParams = { sort: 'newest' };

function formatChipDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

function PatientCardItem({ item, index, onPress }: { item: IPatient; index: number; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();
  const chipDate = formatChipDate(item.updatedAt);
  const pharmacistName = item.pharmacistName[item.pharmacistName.length - 1];

  const entering =
    index < 5
      ? FadeInDown.duration(380)
          .delay(index * 100)
          .reduceMotion(ReduceMotion.System)
      : undefined;

  return (
    <Animated.View entering={entering}>
      <AnimatedPressable style={[styles.patientCard, animatedStyle]} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.cardTop}>
          <View style={styles.cardIdentity}>
            <Avatar name={item.fullName} size={44} />
            <View style={styles.cardNames}>
              <Text style={styles.patientName}>{item.fullName}</Text>
              <Text style={styles.patientAge}>Age {item.age}</Text>
            </View>
          </View>
          {chipDate ? (
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>{chipDate}</Text>
            </View>
          ) : null}
        </View>

        {pharmacistName ? (
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaText}>Attended by {pharmacistName}</Text>
          </View>
        ) : null}

        <View style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>View Patient</Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function PatientListScreen() {
  const navigation = useNavigation<NavProp>();
  const filterSheetRef = useRef<BottomSheetModal>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterParams, setFilterParams] = useState<FilterParams>(DEFAULT_FILTER);
  const [s0, s1, s2, s3, s4, s5] = useStaggerFadeIn(6);

  const { animatedStyle: addBtnStyle, onPressIn: addBtnPressIn, onPressOut: addBtnPressOut } = usePressSpring();
  const { animatedStyle: filterBtnStyle, onPressIn: filterPressIn, onPressOut: filterPressOut } = usePressSpring();
  const { animatedStyle: sortBtnStyle, onPressIn: sortPressIn, onPressOut: sortPressOut } = usePressSpring();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: user } = useQuery({ queryKey: queryKeys.me, queryFn: getMe });

  const {
    data: patients,
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: queryKeys.patients.all,
    queryFn: () => listPatients()
  });

  const filtered = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const thisYear = new Date(now).getFullYear();
    return (patients ?? [])
      .filter((p) => {
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          const matchesName = p.fullName.toLowerCase().includes(q);
          const matchesPhone = p.phoneNumber?.toLowerCase().includes(q);
          if (!matchesName && !matchesPhone) return false;
        }
        if (filterParams.pharmacistName && !p.pharmacistName.includes(filterParams.pharmacistName)) return false;
        if (filterParams.ageGroup) {
          if (filterParams.ageGroup === 'under30' && p.age >= 30) return false;
          if (filterParams.ageGroup === '30-50' && (p.age < 30 || p.age > 50)) return false;
          if (filterParams.ageGroup === '51-70' && (p.age < 51 || p.age > 70)) return false;
          if (filterParams.ageGroup === '71plus' && p.age < 71) return false;
        }
        if (filterParams.lastVisit) {
          const ms = new Date(p.updatedAt).getTime();
          if (filterParams.lastVisit === 'last30' && ms < now - 30 * 86400_000) return false;
          if (filterParams.lastVisit === 'last90' && ms < now - 90 * 86400_000) return false;
          if (filterParams.lastVisit === 'thisYear' && new Date(ms).getFullYear() < thisYear) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return filterParams.sort === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [patients, debouncedSearch, filterParams]);

  const hasActiveFilter = !!filterParams.pharmacistName || !!filterParams.ageGroup || !!filterParams.lastVisit;

  function toggleSort() {
    setFilterParams((p) => ({ ...p, sort: p.sort === 'newest' ? 'oldest' : 'newest' }));
  }

  function renderPatient({ item, index }: { item: IPatient; index: number }) {
    return <PatientCardItem item={item} index={index} onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })} />;
  }

  const userInitials = user
    ? user.fullName
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '';

  return (
    <>
      <ScreenWrapper hasTabBar>
        {/* Top bar */}
        <Animated.View style={[styles.topBar, s0]}>
          <Text style={styles.appName}>{user?.companyName ?? 'PharmaPRS'}</Text>
          {user ? (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{userInitials}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Hero */}
        <Animated.View style={[styles.header, s1]}>
          <Text style={styles.count}>{filtered.length} total records</Text>
          <Text style={styles.title}>Patients</Text>
        </Animated.View>

        {/* Search */}
        <Animated.View style={[styles.searchWrap, s2]}>
          <View style={styles.searchBox}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        </Animated.View>

        {/* Filter + Sort row */}
        <Animated.View style={[styles.filterRow, s3]}>
          <AnimatedPressable
            style={[styles.filterBtn, hasActiveFilter && styles.filterBtnActive, filterBtnStyle]}
            onPress={() => filterSheetRef.current?.present()}
            onPressIn={filterPressIn}
            onPressOut={filterPressOut}
          >
            <Text style={[styles.filterBtnText, hasActiveFilter && styles.filterBtnTextActive]}>Filter</Text>
          </AnimatedPressable>
          <AnimatedPressable style={[styles.sortBtn, sortBtnStyle]} onPress={toggleSort} onPressIn={sortPressIn} onPressOut={sortPressOut}>
            <Text style={styles.sortBtnText}>Sort: {filterParams.sort === 'newest' ? 'Recent' : 'Oldest'}</Text>
          </AnimatedPressable>
        </Animated.View>

        {/* Quick action + Add button */}
        <Animated.View style={[styles.quickActionWrap, s4]}>
          <Text style={styles.quickActionLabel}>Quick action</Text>
          <AnimatedPressable
            style={[styles.addBtn, addBtnStyle]}
            onPress={() => navigation.navigate('PatientNew')}
            onPressIn={addBtnPressIn}
            onPressOut={addBtnPressOut}
          >
            <Plus size={18} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add New Patient</Text>
          </AnimatedPressable>
        </Animated.View>

        <Animated.View style={[{ flex: 1 }, s5]}>
          <FlatList
            style={styles.list}
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderPatient}
            contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.listEmpty]}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              filtered.length > 0 ? (
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderTitle}>Recently updated</Text>
                  <View style={styles.sortBadge}>
                    <Text style={styles.sortBadgeText}>{filterParams.sort === 'newest' ? 'Sorted by recent' : 'Sorted by oldest'}</Text>
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              isLoading ? null : (
                <View style={styles.emptyState}>
                  <Filter size={28} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No patients found</Text>
                  {search || hasActiveFilter ? (
                    <Text style={styles.emptySubtitle}>Try adjusting your search or filters.</Text>
                  ) : (
                    <Text style={styles.emptySubtitle}>Add your first patient to get started.</Text>
                  )}
                </View>
              )
            }
          />
          <LinearGradient colors={['rgba(245,242,233,0)', '#F5F2E9']} style={styles.listFade} pointerEvents="none" />
        </Animated.View>
      </ScreenWrapper>

      <FilterSheet ref={filterSheetRef} current={filterParams} onApply={setFilterParams} onClose={() => filterSheetRef.current?.dismiss()} />
    </>
  );
}

const styles = StyleSheet.create({
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md
  },
  appName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitials: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: '#F8F3E8' },
  // Hero
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.xs, gap: 4 },
  count: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  title: { fontFamily: 'FunnelSans-Bold', fontWeight: '700', fontSize: 30, lineHeight: 32, color: colors.text },
  // Search
  searchWrap: { paddingHorizontal: spacing.base, paddingTop: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text, padding: 0 },
  // Filter + Sort row
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md
  },
  filterBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8D1C1'
  },
  filterBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent },
  filterBtnTextActive: { color: colors.white },
  sortBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  sortBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#5F5A53' },
  // Quick action
  quickActionWrap: { paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.sm },
  quickActionLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    borderRadius: 16,
    height: 52,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4
  },
  addBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.background },
  // List
  listWrapper: { flex: 1 },
  listFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 48 },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md
  },
  listEmpty: { flex: 1 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  listHeaderTitle: { fontFamily: 'FunnelSans-Bold', fontWeight: '700', fontSize: 20, color: colors.text },
  sortBadge: { backgroundColor: '#F4EEE2', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  sortBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.accent },
  // Patient card
  patientCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.base,
    gap: spacing.md
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardNames: { gap: 2 },
  patientName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  patientAge: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  datePill: { backgroundColor: '#F4EEE2', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  datePillText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.accent },
  cardMeta: { gap: 6 },
  cardMetaText: { fontFamily: fonts.body, fontSize: 13, color: '#5F5A53' },
  viewBtn: {
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8D1C1'
  },
  viewBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.accent },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.sm
  },
  emptyTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: 'center' }
});
