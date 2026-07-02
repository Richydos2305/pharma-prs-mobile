import { useRef, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { House, Pill, Plus, User, Users } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { usePressSpring } from '../../hooks/usePressSpring';
import { useSync } from '../../contexts/SyncContext';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const TAB_CONFIG: Record<string, { Icon: React.ComponentType<{ size: number; color: string }>; label: string }> = {
  Dashboard: { Icon: House, label: 'Dashboard' },
  Patients: { Icon: Users, label: 'Patients' },
  PlusTab: { Icon: Plus, label: 'New' },
  Pharmacists: { Icon: Pill, label: 'Pharmacists' },
  Profile: { Icon: User, label: 'Profile' }
};

const OFFLINE_TAB_ORDER = ['Dashboard', 'PlusTab', 'Patients'];

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
      style={[styles.tabItem, animatedStyle]}
    >
      <Icon size={isFocused ? 19 : 18} color={isFocused ? colors.accent : colors.textLight} />
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function FloatingTabBar({ activeRoute, onTabPress }: FloatingTabBarProps) {
  const { isSyncing, isOnline } = useSync();
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const layoutsRef = useRef<Partial<Record<string, { x: number; width: number }>>>({});
  const initializedRef = useRef(false);

  const visibleTabs = isOnline
    ? Object.entries(TAB_CONFIG)
    : OFFLINE_TAB_ORDER.map((name) => [name, TAB_CONFIG[name]] as [string, (typeof TAB_CONFIG)[string]]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillWidth.value
  }));

  useEffect(() => {
    if (!activeRoute) {
      pillWidth.value = withSpring(0, { damping: 60, stiffness: 460 });
      return;
    }
    const layout = layoutsRef.current[activeRoute];
    if (!layout) return;
    if (!initializedRef.current) {
      pillX.value = layout.x;
      pillWidth.value = layout.width;
      initializedRef.current = true;
      return;
    }
    pillX.value = withSpring(layout.x, { damping: 60, stiffness: 460 });
    pillWidth.value = withSpring(layout.width, { damping: 60, stiffness: 460 });
  }, [activeRoute, pillX, pillWidth]);

  function handleTabTap(routeName: string) {
    const layout = layoutsRef.current[routeName];
    if (layout && initializedRef.current) {
      pillX.value = withSpring(layout.x, { damping: 60, stiffness: 460 });
      pillWidth.value = withSpring(layout.width, { damping: 60, stiffness: 460 });
    }
    onTabPress(routeName);
  }

  return (
    <View>
      <BlurView intensity={60} tint="light" style={styles.blurView}>
        <View style={styles.tabBar}>
          <Animated.View style={[styles.pill, pillStyle]} />
          {visibleTabs.map(([routeName, { Icon, label }]) => (
            <View
              key={routeName}
              style={!isOnline ? styles.tabFlex : undefined}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                const prev = layoutsRef.current[routeName];
                layoutsRef.current[routeName] = { x, width };
                if (routeName !== activeRoute) return;
                if (!initializedRef.current) {
                  pillX.value = x;
                  pillWidth.value = width;
                  initializedRef.current = true;
                } else if (!prev || prev.x !== x || prev.width !== width) {
                  pillX.value = withSpring(x, { damping: 60, stiffness: 460 });
                  pillWidth.value = withSpring(width, { damping: 60, stiffness: 460 });
                }
              }}
            >
              <TabItem Icon={Icon} label={label} isFocused={activeRoute === routeName} onPress={() => handleTabTap(routeName)} />
            </View>
          ))}
        </View>
      </BlurView>
      {isSyncing && <View style={styles.syncDot} pointerEvents="none" />}
    </View>
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
  pill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 0,
    borderRadius: 999,
    backgroundColor: colors.accentPill
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999
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
  },
  tabFlex: {
    flex: 1,
    alignItems: 'center'
  },
  syncDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4A017'
  }
});
