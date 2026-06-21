import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useStaggerFadeIn } from '../../hooks/useStaggerFadeIn';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Lock } from 'lucide-react-native';
import { getMe } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';
import { Avatar, AnimatedPressable } from '../../components/ui';
import { ScreenWrapper } from '../../components/layout';
import { useAuth } from '../../hooks/useAuth';
import { usePressSpring } from '../../hooks/usePressSpring';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { AppTabParamList, ProfileStackParamList } from '../../navigation/types';

type ProfileNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, 'ProfileOverview'>,
  BottomTabNavigationProp<AppTabParamList>
>;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavProp>();
  const { logout } = useAuth();
  const [s0, s1, s2, s3, s4] = useStaggerFadeIn(5);

  const { animatedStyle: formBtnStyle, onPressIn: formPressIn, onPressOut: formPressOut } = usePressSpring();
  const { animatedStyle: signOutStyle, onPressIn: signOutPressIn, onPressOut: signOutPressOut } = usePressSpring();

  const { data: user } = useQuery({ queryKey: queryKeys.me, queryFn: getMe });

  function goToFormBuilder() {
    // Navigate up through ProfileNavigator → AppTabNavigator → AppNavigator
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation.getParent()?.getParent() as any)?.navigate('FormBuilder', {
      screen: 'TemplatePicker'
    });
  }

  return (
    <ScreenWrapper hasTabBar>
      {/* Top bar — not animated, always visible */}
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        <Text style={styles.topBarTitle}>Profile</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <Animated.View style={[styles.hero, s0]}>
            <Avatar name={user?.fullName ?? ''} size={80} imageUri={user?.companyLogo} />
            <Text style={styles.heroName}>{user?.fullName ?? ''}</Text>
            {user?.role ? (
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{user.role}</Text>
              </View>
            ) : null}
            {user?.companyName ? <Text style={styles.heroPharmacy}>{user.companyName}</Text> : null}
          </Animated.View>

          {/* Personal Information */}
          <Animated.View style={[styles.card, s1]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Personal Information</Text>
              <Pressable onPress={() => navigation.navigate('ProfileEdit')}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user?.fullName ?? '—'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{user?.email ?? '—'}</Text>
                <Lock size={11} color="#8C8782" />
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user?.phoneNumber ?? '—'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{user?.role ?? '—'}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Pharmacy */}
          <Animated.View style={[styles.card, s2]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Pharmacy</Text>
              <Pressable onPress={() => navigation.navigate('PharmacyEdit')}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </View>
            <View style={styles.divider} />
            <View style={styles.pharmacyRow}>
              {user ? <Avatar name={user.companyName ?? user.fullName} size={48} imageUri={user.companyLogo} /> : null}
              <Text style={styles.pharmacyName}>{user?.companyName ?? '—'}</Text>
            </View>
          </Animated.View>

          {/* Patient Form */}
          <Animated.View style={[styles.card, styles.patientFormCard, s3]}>
            <Text style={styles.cardTitleLg}>Patient Form</Text>
            <Text style={styles.cardHint}>Manage the patient form used when creating or updating patients.</Text>
            <AnimatedPressable
              onPress={goToFormBuilder}
              onPressIn={formPressIn}
              onPressOut={formPressOut}
              style={[styles.formBuilderBtn, formBtnStyle]}
            >
              <ArrowRight size={14} color={colors.accent} />
              <Text style={styles.formBuilderText}>Open Form Builder</Text>
            </AnimatedPressable>
          </Animated.View>

          {/* Session */}
          <Animated.View style={[styles.sessionSection, s4]}>
            <Text style={styles.sessionLabel}>Actions</Text>
            <AnimatedPressable onPress={logout} onPressIn={signOutPressIn} onPressOut={signOutPressOut} style={[styles.signOutBtn, signOutStyle]}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </AnimatedPressable>
          </Animated.View>
        </ScrollView>
        <LinearGradient colors={['rgba(245,242,233,0)', '#F5F2E9']} style={styles.scrollFade} pointerEvents="none" />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm
  },
  topBarSpacer: { width: 36, height: 36 },
  topBarTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg
  },
  // Hero
  hero: { alignItems: 'center', paddingTop: spacing.sm, gap: spacing.sm },
  heroName: { fontFamily: 'FunnelSans-Bold', fontWeight: '700', fontSize: 22, color: colors.text },
  heroPill: {
    backgroundColor: '#F4EEE2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DDD0B8'
  },
  heroPillText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accent },
  heroPharmacy: { fontFamily: fonts.body, fontSize: 13, color: '#8C8782' },
  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md
  },
  patientFormCard: { gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: 'FunnelSans-Bold', fontWeight: '700', fontSize: 16, color: colors.text },
  cardTitleLg: { fontFamily: 'FunnelSans-Bold', fontWeight: '700', fontSize: 20, color: colors.text },
  cardHint: { fontFamily: fonts.body, fontSize: 14, color: '#5F5A53', lineHeight: 19 },
  editLink: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accent },
  divider: { height: 1, backgroundColor: '#E8E3D8' },
  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  infoValue: { fontFamily: fonts.body, fontSize: 13, color: colors.text, flexShrink: 1, textAlign: 'right' },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  rolePill: { backgroundColor: '#F4EEE2', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  rolePillText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accent },
  // Pharmacy row
  pharmacyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pharmacyName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  // Form builder button
  formBuilderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#D8D1C1'
  },
  formBuilderText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.accent },
  // Session
  sessionSection: { gap: spacing.sm },
  sessionLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  signOutBtn: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#FFF6F4',
    borderWidth: 1,
    borderColor: '#E6C8BF'
  },
  signOutText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#B4553D' },
  scrollFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 }
});
