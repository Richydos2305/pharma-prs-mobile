import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { PharmacistsScreen } from '../screens/pharmacists/PharmacistsScreen';
import { PatientNewScreen } from '../screens/patients/PatientNewScreen';
import { PatientsNavigator } from './PatientsNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { FloatingTabBar, OfflineIndicator, TransitionOverlay } from '../components/layout';
import { useSync } from '../contexts/SyncContext';
import type { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

// ── Custom tab bar ────────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { isOnline } = useSync();
  const prevIsOnlineRef = useRef(isOnline);

  // Redirect away from hidden tabs when going offline
  useEffect(() => {
    if (!isOnline && prevIsOnlineRef.current) {
      const currentRoute = state.routes[state.index]?.name;
      if (currentRoute === 'Pharmacists' || currentRoute === 'Profile') {
        navigation.navigate('Dashboard' as never);
      }
    }
    prevIsOnlineRef.current = isOnline;
  }, [isOnline, navigation, state.index, state.routes]);

  // Detect whether a Patients subscreen (Detail/Edit) is active — those highlight nothing
  const patientsRoute = state.routes.find((r) => r.name === 'Patients');
  const nestedRoutes = patientsRoute?.state?.routes;
  const nestedIndex = patientsRoute?.state?.index ?? 0;
  const patientsTabFocused = state.routes[state.index]?.name === 'Patients';
  const nestedScreen = patientsTabFocused && nestedRoutes != null ? nestedRoutes[nestedIndex]?.name : null;
  const isOnPatientSubscreen = nestedScreen === 'PatientDetail' || nestedScreen === 'PatientEdit';

  const activeRoute: string | undefined = isOnPatientSubscreen ? undefined : state.routes[state.index]?.name;

  function handleTabPress(routeName: string) {
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const tabIsFocused = state.routes[state.index]?.name === routeName;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!tabIsFocused && !event.defaultPrevented) {
      navigation.navigate(routeName as never);
    }
  }

  return (
    <View style={styles.tabBarWrapper} pointerEvents="box-none">
      <FloatingTabBar activeRoute={activeRoute} onTabPress={handleTabPress} />
    </View>
  );
}

// ── Navigator ─────────────────────────────────────────────────────────────────

export function AppTabNavigator() {
  return (
    <View style={styles.container}>
      <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Patients" component={PatientsNavigator} />
        <Tab.Screen name="PlusTab" component={PatientNewScreen} />
        <Tab.Screen name="Pharmacists" component={PharmacistsScreen} />
        <Tab.Screen name="Profile" component={ProfileNavigator} />
      </Tab.Navigator>
      <TransitionOverlay />
      <OfflineIndicator />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'transparent'
  }
});
