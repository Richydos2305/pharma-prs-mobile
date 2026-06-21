import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { House, Pill, Plus, User, Users } from 'lucide-react-native';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { usePressSpring } from '../../hooks/usePressSpring';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const TAB_CONFIG: Record<string, { Icon: React.ComponentType<{ size: number; color: string }>; label: string }> = {
  Dashboard: { Icon: House, label: 'Dashboard' },
  Patients: { Icon: Users, label: 'Patients' },
  PlusTab: { Icon: Plus, label: 'New' },
  Pharmacists: { Icon: Pill, label: 'Pharmacists' },
  Profile: { Icon: User, label: 'Profile' }
};

interface FloatingTabBarProps {
  activeRoute?: string;
  onTabPress: (routeName: string) => void;
}

function TabItem({
  Icon,
  label,
  isFocused,
  onPress
}: {
  Icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  isFocused: boolean;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      style={[styles.tabItem, isFocused && styles.tabItemActive, animatedStyle]}
    >
      <Icon size={isFocused ? 19 : 18} color={isFocused ? colors.accent : colors.textLight} />
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function FloatingTabBar({ activeRoute, onTabPress }: FloatingTabBarProps) {
  return (
    <BlurView intensity={60} tint="light" style={styles.blurView}>
      <View style={styles.tabBar}>
        {Object.entries(TAB_CONFIG).map(([routeName, { Icon, label }]) => (
          <TabItem key={routeName} Icon={Icon} label={label} isFocused={activeRoute === routeName} onPress={() => onTabPress(routeName)} />
        ))}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blurView: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: colors.tabBarBg
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999
  },
  tabItemActive: {
    backgroundColor: colors.accentPill,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textLight,
    fontWeight: '500'
  },
  tabLabelActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
    fontWeight: '600'
  }
});
