import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useStaggerFadeIn } from '../../hooks/useStaggerFadeIn';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Plus, Trash2, Users } from 'lucide-react-native';
import { getMe } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';
import { usePharmacists } from '../../hooks/usePharmacists';
import { Avatar, AnimatedPressable, SuccessCheck } from '../../components/ui';
import { ScreenWrapper } from '../../components/layout';
import { AddPharmacistSheet } from '../../components/pharmacists/AddPharmacistSheet';
import { EditPharmacistSheet } from '../../components/pharmacists/EditPharmacistSheet';
import { DeletePharmacistSheet } from '../../components/pharmacists/DeletePharmacistSheet';
import { usePressSpring } from '../../hooks/usePressSpring';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { IPharmacist } from '../../types';

interface PharmacistCardItemProps {
  item: IPharmacist;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  isExiting: boolean;
}

function PharmacistCardItem({ item, index, onEdit, onDelete, isExiting }: PharmacistCardItemProps) {
  const { animatedStyle: editStyle, onPressIn: editPressIn, onPressOut: editPressOut } = usePressSpring();
  const { animatedStyle: deleteStyle, onPressIn: deletePressIn, onPressOut: deletePressOut } = usePressSpring();

  const exitOpacity = useSharedValue(1);
  const exitTranslateY = useSharedValue(0);
  const exitScale = useSharedValue(1);

  const exitStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
    transform: [{ translateY: exitTranslateY.value }, { scale: exitScale.value }]
  }));

  useEffect(() => {
    if (!isExiting) return;
    exitOpacity.value = withTiming(0, { duration: 380, reduceMotion: ReduceMotion.System });
    exitTranslateY.value = withTiming(28, { duration: 380, reduceMotion: ReduceMotion.System });
    exitScale.value = withTiming(0.92, { duration: 380, reduceMotion: ReduceMotion.System });
  }, [isExiting, exitOpacity, exitTranslateY, exitScale]);

  const entering =
    index < 5
      ? FadeInDown.duration(380)
          .delay(index * 100)
          .reduceMotion(ReduceMotion.System)
      : undefined;

  return (
    <Animated.View entering={entering} style={exitStyle}>
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardIdentity}>
            <Avatar name={item.name} size={44} />
            <View style={styles.cardNames}>
              <Text style={styles.pharmacistName}>{item.name}</Text>
              <Text style={styles.pharmacistRole}>Pharmacist</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          <AnimatedPressable
            onPress={onEdit}
            onPressIn={editPressIn}
            onPressOut={editPressOut}
            style={[styles.editBtn, editStyle]}
            testID={`edit-${item.id}`}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={onDelete}
            onPressIn={deletePressIn}
            onPressOut={deletePressOut}
            style={[styles.deleteBtn, deleteStyle]}
            testID={`delete-${item.id}`}
          >
            <Trash2 size={15} color="#B4553D" />
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
}

export function PharmacistsScreen() {
  const addSheetRef = useRef<BottomSheetModal>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const deleteSheetRef = useRef<BottomSheetModal>(null);

  const [selectedPharmacist, setSelectedPharmacist] = useState<IPharmacist | null>(null);
  const [exitingItems, setExitingItems] = useState<IPharmacist[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [s0, s1, s2, s3] = useStaggerFadeIn(4);

  function handleSuccess() {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 700);
  }

  const { animatedStyle: addBtnStyle, onPressIn: addBtnPressIn, onPressOut: addBtnPressOut } = usePressSpring();

  const { data: user } = useQuery({ queryKey: queryKeys.me, queryFn: getMe });

  const { data: pharmacists, isLoading, isError, refetch } = usePharmacists();

  const list = useMemo(() => pharmacists ?? [], [pharmacists]);

  const displayList = useMemo(() => {
    const serverIds = new Set(list.map((p) => p.id));
    const ghosts = exitingItems.filter((p) => !serverIds.has(p.id));
    return [...list, ...ghosts];
  }, [list, exitingItems]);

  function handleDeleted(pharmacist: IPharmacist) {
    setExitingItems((prev) => [...prev, pharmacist]);
    setTimeout(() => {
      setExitingItems((prev) => prev.filter((p) => p.id !== pharmacist.id));
    }, 430);
  }

  function openEdit(pharmacist: IPharmacist) {
    setSelectedPharmacist(pharmacist);
    editSheetRef.current?.present();
  }

  function openDelete(pharmacist: IPharmacist) {
    setSelectedPharmacist(pharmacist);
    deleteSheetRef.current?.present();
  }

  function renderPharmacist({ item, index }: { item: IPharmacist; index: number }) {
    return (
      <PharmacistCardItem
        item={item}
        index={index}
        onEdit={() => openEdit(item)}
        onDelete={() => openDelete(item)}
        isExiting={exitingItems.some((p) => p.id === item.id)}
      />
    );
  }

  return (
    <ScreenWrapper hasTabBar>
      {/* Top bar */}
      <Animated.View style={[styles.topBar, s0]}>
        <Text style={styles.topBarTitle}>Pharmacists</Text>
        {user ? <Avatar name={user.fullName} size={34} imageUri={user.companyLogo} /> : null}
      </Animated.View>

      {/* Hero */}
      <Animated.View style={[styles.header, s1]}>
        <Text style={styles.headerMeta}>
          {list.length} team member{list.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.title}>Care Team</Text>
      </Animated.View>

      {/* Quick action + Add button */}
      <Animated.View style={[styles.quickActionWrap, s2]}>
        <Text style={styles.quickActionLabel}>Quick action</Text>
        <AnimatedPressable
          style={[styles.addBtn, addBtnStyle]}
          onPress={() => addSheetRef.current?.present()}
          onPressIn={addBtnPressIn}
          onPressOut={addBtnPressOut}
          accessibilityLabel="Add pharmacist"
        >
          <Plus size={18} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Add Pharmacist</Text>
        </AnimatedPressable>
      </Animated.View>

      <Animated.View style={[{ flex: 1 }, s3]}>
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          renderItem={renderPharmacist}
          contentContainerStyle={[styles.list, list.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            list.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderTitle}>Team members</Text>
                <Text style={styles.listHeaderHint}>Tap to manage</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isLoading ? null : isError ? (
              <View style={styles.emptyState}>
                <Users size={32} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Failed to load</Text>
                <Text style={styles.emptySubtitle}>Something went wrong fetching your team.</Text>
                <AnimatedPressable onPress={() => refetch()} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Tap to retry</Text>
                </AnimatedPressable>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Users size={32} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No pharmacists yet</Text>
                <Text style={styles.emptySubtitle}>Add your first pharmacist to start assigning them to patient visits.</Text>
              </View>
            )
          }
        />
        <LinearGradient colors={['rgba(245,242,233,0)', '#F5F2E9']} style={styles.listFade} pointerEvents="none" />
      </Animated.View>

      <AddPharmacistSheet ref={addSheetRef} onClose={() => addSheetRef.current?.dismiss()} onSuccess={handleSuccess} />
      <EditPharmacistSheet
        key={selectedPharmacist?.id ?? 'none'}
        ref={editSheetRef}
        pharmacist={selectedPharmacist}
        onClose={() => editSheetRef.current?.dismiss()}
        onSuccess={handleSuccess}
      />
      <DeletePharmacistSheet
        ref={deleteSheetRef}
        pharmacist={selectedPharmacist}
        onClose={() => deleteSheetRef.current?.dismiss()}
        onDeleted={handleDeleted}
      />

      <SuccessCheck visible={showSuccess} />
    </ScreenWrapper>
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
  topBarTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  // Hero
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.xs, gap: 4 },
  headerMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  title: { fontFamily: 'FunnelSans-Bold', fontSize: 30, lineHeight: 32, color: colors.text },
  // Quick action
  quickActionWrap: { paddingHorizontal: spacing.base, paddingTop: spacing.base, gap: spacing.sm },
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
  list: {
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
  listHeaderTitle: { fontFamily: 'FunnelSans-Bold', fontSize: 20, color: colors.text },
  listHeaderHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  // Pharmacist card
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: spacing.base,
    gap: spacing.md
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardNames: { gap: 3 },
  pharmacistName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  pharmacistRole: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  editBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8D1C1'
  },
  editBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.accent },
  deleteBtn: {
    width: 56,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF6F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6C8BF'
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.sm
  },
  emptyTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.base,
    borderRadius: 12,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#D8D1C1'
  },
  retryBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent }
});
