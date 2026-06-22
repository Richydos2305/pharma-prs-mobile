import { useMemo, useEffect } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RNAnimated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useStaggerFadeIn } from '../../hooks/useStaggerFadeIn';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react-native';
import { getSettings } from '../../api/settings';
import { listPatients } from '../../api/patients';
import { getMe } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';
import { Avatar, AnimatedPressable } from '../../components/ui';
import { ScreenWrapper } from '../../components/layout';
import { usePressSpring } from '../../hooks/usePressSpring';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { IPatient } from '../../types';
import type { AppTabParamList, AppStackParamList } from '../../navigation/types';

function formatChipDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

type DashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<AppStackParamList>
>;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function RecentPatientCard({ patient, onPress }: { patient: IPatient; onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();
  const chipDate = formatChipDate(patient.updatedAt);
  const pharmacistName = patient.pharmacistName[patient.pharmacistName.length - 1];

  return (
    <View style={styles.patientCard}>
      <View style={styles.patientCardTop}>
        <View style={styles.patientPerson}>
          <Avatar name={patient.fullName} size={38} />
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{patient.fullName}</Text>
            <Text style={styles.patientMeta}>Age {patient.age}</Text>
          </View>
        </View>
        {chipDate ? (
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{chipDate}</Text>
          </View>
        ) : null}
      </View>
      {pharmacistName ? (
        <View style={styles.patientMetaRow}>
          <Text style={styles.patientPharmacistText}>Attended by {pharmacistName}</Text>
        </View>
      ) : null}
      <AnimatedPressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={[styles.viewPatientBtn, animatedStyle]}>
        <Text style={styles.viewPatientBtnLabel}>View Patient</Text>
      </AnimatedPressable>
    </View>
  );
}

export function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();

  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: queryKeys.settings, queryFn: getSettings });
  const { data: patients, isLoading: patientsLoading } = useQuery({ queryKey: queryKeys.patients.all, queryFn: () => listPatients() });
  const { data: user, isLoading: meLoading } = useQuery({ queryKey: queryKeys.me, queryFn: getMe });

  const isLoading = settingsLoading || patientsLoading || meLoading;

  const [s0, s1, s2, s3, s4] = useStaggerFadeIn(5, !isLoading);

  const shimmer = useMemo(() => new Animated.Value(0.3), []);
  const { animatedStyle: primaryBtnStyle, onPressIn: primaryPressIn, onPressOut: primaryPressOut } = usePressSpring();
  const { animatedStyle: secondaryBtnStyle, onPressIn: secondaryPressIn, onPressOut: secondaryPressOut } = usePressSpring();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  if (isLoading) {
    return (
      <ScreenWrapper hasTabBar>
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonHeaderRow}>
            <Animated.View style={[styles.skeletonBlock, styles.skeletonName, { opacity: shimmer }]} />
            <Animated.View style={[styles.skeletonCircle, { opacity: shimmer }]} />
          </View>
          <Animated.View style={[styles.skeletonBlock, styles.skeletonGreeting, { opacity: shimmer }]} />
          <Animated.View style={[styles.skeletonBlock, styles.skeletonHeading, { opacity: shimmer }]} />
          <Animated.View style={[styles.skeletonBlock, styles.skeletonCard, { opacity: shimmer }]} />
          <View style={styles.skeletonStatsRow}>
            <Animated.View style={[styles.skeletonBlock, styles.skeletonStat, { opacity: shimmer }]} />
            <Animated.View style={[styles.skeletonBlock, styles.skeletonStat, { opacity: shimmer }]} />
          </View>
          <Animated.View style={[styles.skeletonBlock, styles.skeletonButton, { opacity: shimmer }]} />
        </View>
      </ScreenWrapper>
    );
  }

  const allPatients = patients ?? [];
  const recentPatients = allPatients.slice(-3).reverse();
  const onboardingComplete = settings?.onboarding?.allComplete ?? false;
  const steps = settings?.onboarding?.steps;
  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const companyName = user?.companyName ?? 'Your Pharmacy';

  const onboardingSteps = [
    {
      key: 'profileComplete',
      label: 'Complete your profile',
      desc: 'Company name and phone number added',
      done: steps?.profileComplete ?? false,
      cta: 'Open',
      onPress: () => navigation.navigate('Profile', { screen: 'ProfileEdit' })
    },
    {
      key: 'firstPharmacistAdded',
      label: 'Add a pharmacist',
      desc: 'Your first team member is ready',
      done: steps?.firstPharmacistAdded ?? false,
      cta: 'Open',
      onPress: () => navigation.navigate('Pharmacists')
    },
    {
      key: 'formBuilt',
      label: 'Build your intake form',
      desc: 'Publish your custom patient form',
      done: steps?.formBuilt ?? false,
      cta: 'Open',
      onPress: () => navigation.navigate('FormBuilder', { screen: 'TemplatePicker' })
    },
    {
      key: 'firstPatientAdded',
      label: 'Add your first patient',
      desc: 'Create your first patient record',
      done: steps?.firstPatientAdded ?? false,
      cta: 'Add',
      onPress: () => navigation.navigate('Patients', { screen: 'PatientNew' })
    }
  ];

  const doneCount = onboardingSteps.filter((s) => s.done).length;
  const progressPct = Math.round((doneCount / onboardingSteps.length) * 100);
  const progressWidth = `${progressPct}%` as const;

  return (
    <ScreenWrapper hasTabBar>
      <View style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top bar — not animated, always visible */}
          <View style={styles.topBar}>
            <Text style={styles.companyName}>{companyName}</Text>
            {user ? <Avatar name={user.fullName} size={34} imageUri={user.companyLogo} /> : null}
          </View>

          {/* Hero */}
          <RNAnimated.View style={[styles.hero, s0]}>
            <Text style={styles.greeting}>
              {getGreeting()}
              {firstName ? `, ${firstName}` : ''}
            </Text>
            <Text style={styles.pageTitle}>Dashboard</Text>
          </RNAnimated.View>

          {/* Onboarding card */}
          {!onboardingComplete && (
            <RNAnimated.View style={s1}>
              <View style={styles.card}>
                <View style={styles.onboardingHeader}>
                  <View>
                    <Text style={styles.onboardingTitle}>Getting Started</Text>
                    <Text style={styles.onboardingProgress}>
                      {doneCount} of {onboardingSteps.length} steps complete
                    </Text>
                  </View>
                  <View style={styles.progressChip}>
                    <Text style={styles.progressChipText}>{progressPct}%</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: progressWidth }]} />
                </View>

                {onboardingSteps.map((step) => (
                  <Pressable key={step.key} onPress={step.onPress} style={styles.stepRow}>
                    <View style={[styles.stepBadge, step.done ? styles.stepBadgeDone : styles.stepBadgePending]}>
                      {step.done ? <Text style={styles.stepCheckmark}>✓</Text> : <View style={styles.stepDot} />}
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>{step.label}</Text>
                      <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                    {!step.done && (
                      <View style={styles.stepCta}>
                        <Text style={styles.stepCtaText}>{step.cta}</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </RNAnimated.View>
          )}

          {/* Stats row */}
          <RNAnimated.View style={[styles.statsRow, s2]}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Patients</Text>
              <Text style={styles.statValue}>{allPatients.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Recent Patients</Text>
              <Text style={styles.statValue}>{recentPatients.length}</Text>
            </View>
          </RNAnimated.View>

          {/* Quick Actions */}
          <RNAnimated.View style={[styles.quickActions, s3]}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <AnimatedPressable
              onPress={() => navigation.navigate('Patients', { screen: 'PatientNew' })}
              onPressIn={primaryPressIn}
              onPressOut={primaryPressOut}
              style={[styles.primaryBtn, primaryBtnStyle]}
            >
              <Text style={styles.primaryBtnLabel}>{onboardingComplete ? 'Add New Patient' : 'Add First Patient'}</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() =>
                onboardingComplete
                  ? navigation.navigate('Patients', { screen: 'PatientList' })
                  : navigation.navigate('FormBuilder', { screen: 'TemplatePicker' })
              }
              onPressIn={secondaryPressIn}
              onPressOut={secondaryPressOut}
              style={[styles.secondaryBtn, secondaryBtnStyle]}
            >
              <Text style={styles.secondaryBtnLabel}>{onboardingComplete ? 'View All Patients' : 'Open Form Builder'}</Text>
            </AnimatedPressable>
          </RNAnimated.View>

          {/* Recent Patients */}
          <RNAnimated.View style={[styles.recentSection, s4]}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent Patients</Text>
              <Pressable onPress={() => navigation.navigate('Patients', { screen: 'PatientList' })}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>

            {recentPatients.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Users size={22} color={colors.accent} />
                </View>
                <Text style={styles.emptyTitle}>No patients yet</Text>
                <Text style={styles.emptyDesc}>Add your first patient to begin tracking appointments, notes, and assigned pharmacists.</Text>
              </View>
            ) : (
              recentPatients.map((patient) => (
                <RecentPatientCard
                  key={patient.id}
                  patient={patient}
                  onPress={() =>
                    navigation.navigate('Patients', {
                      screen: 'PatientDetail',
                      params: { patientId: patient.id }
                    })
                  }
                />
              ))
            )}
          </RNAnimated.View>
        </ScrollView>
        <LinearGradient colors={['rgba(245,242,233,0)', '#F5F2E9']} style={styles.scrollFade} pointerEvents="none" />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Skeleton
  skeletonContainer: { flex: 1, padding: spacing.base, gap: spacing.md },
  skeletonHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skeletonBlock: { backgroundColor: colors.border, borderRadius: 10 },
  skeletonName: { height: 18, width: '55%' },
  skeletonCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.border },
  skeletonGreeting: { height: 14, width: '40%' },
  skeletonHeading: { height: 36, width: '50%' },
  skeletonCard: { height: 180, width: '100%' },
  skeletonStatsRow: { flexDirection: 'row', gap: spacing.md },
  skeletonStat: { height: 80, flex: 1 },
  skeletonButton: { height: 52, width: '100%' },
  // Main scroll
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.base, gap: 18, paddingBottom: spacing['2xl'] },
  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  companyName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  // Hero
  hero: { gap: 4 },
  greeting: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  pageTitle: { fontFamily: 'FunnelSans-Bold', fontWeight: '700', fontSize: 30, lineHeight: 32, color: colors.text },
  // Card base
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2
  },
  // Onboarding
  onboardingHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  onboardingTitle: { fontFamily: 'FunnelSans-Bold', fontSize: 20, color: colors.text },
  onboardingProgress: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  progressChip: {
    backgroundColor: colors.accentBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  progressChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accent },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#ECE7DB',
    overflow: 'hidden'
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.accent },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepBadgeDone: { backgroundColor: colors.successBg },
  stepBadgePending: { backgroundColor: colors.accentBg },
  stepCheckmark: { color: colors.successText, fontSize: 12, fontWeight: '700' },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  stepContent: { flex: 1, gap: 3 },
  stepLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  stepLabelDone: { color: colors.textMuted },
  stepDesc: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.textMuted },
  stepCta: {
    backgroundColor: '#F5F1E8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.accentBorder
  },
  stepCtaText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.accent },
  // Stats — LABEL TOP, VALUE BOTTOM
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8
  },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  statValue: { fontFamily: 'FunnelSans-Bold', fontWeight: '700', fontSize: 28, color: colors.text, lineHeight: 32 },
  // Quick actions
  quickActions: { gap: 10 },
  quickActionsTitle: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4
  },
  primaryBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.background },
  secondaryBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentBorder
  },
  secondaryBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.accent },
  // Recent patients
  recentSection: { gap: 12 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recentTitle: { fontFamily: 'FunnelSans-Bold', fontWeight: '700', fontSize: 20, color: colors.text },
  viewAll: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accent },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: 'center',
    gap: 10
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyTitle: { fontFamily: 'FunnelSans-Bold', fontSize: 18, color: colors.text },
  emptyDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center'
  },
  patientCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12
  },
  patientCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  patientPerson: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  patientInfo: { gap: 2 },
  patientName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  patientMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  datePill: {
    backgroundColor: '#F2E8D2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  datePillText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.accent },
  patientMetaRow: { gap: 6 },
  patientPharmacistText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.text },
  viewPatientBtn: {
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8D1C1'
  },
  viewPatientBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.accent },
  scrollFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 }
});
