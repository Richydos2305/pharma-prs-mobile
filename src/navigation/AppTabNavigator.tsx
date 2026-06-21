import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { PharmacistsScreen } from '../screens/pharmacists/PharmacistsScreen';
import { PatientsNavigator } from './PatientsNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { FloatingTabBar } from '../components/layout';
import type { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

function EmptyTab() {
  return <View />;
}

// ── Custom tab bar ────────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  // Detect if the Patients stack is currently showing PatientNew
  const patientsRoute = state.routes.find((r) => r.name === 'Patients');
  const nestedRoutes = patientsRoute?.state?.routes;
  const nestedIndex = patientsRoute?.state?.index ?? 0;
  const patientsTabFocused = state.routes[state.index]?.name === 'Patients';
  const isOnPatientNew = patientsTabFocused && nestedRoutes != null && nestedRoutes[nestedIndex]?.name === 'PatientNew';

  // PlusTab is highlighted while on PatientNew; otherwise use the focused route name
  const activeRoute = isOnPatientNew ? 'PlusTab' : state.routes[state.index]?.name;

  function handleTabPress(routeName: string) {
    if (routeName === 'PlusTab') {
      navigation.navigate('Patients', { screen: 'PatientNew' } as never);
      return;
    }
    // Pressing Patients tab while on PatientNew → pop back to PatientList
    if (routeName === 'Patients' && isOnPatientNew) {
      navigation.navigate('Patients', { screen: 'PatientList' } as never);
      return;
    }
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const tabIsFocused = state.routes[state.index]?.name === routeName;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!tabIsFocused && !event.defaultPrevented) {
      navigation.navigate(routeName as never);
    }
  }

  return (
    <View style={styles.tabBarWrapper}>
      <FloatingTabBar activeRoute={activeRoute} onTabPress={handleTabPress} />
    </View>
  );
}

// ── Navigator ─────────────────────────────────────────────────────────────────

export function AppTabNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Patients" component={PatientsNavigator} />
      <Tab.Screen name="PlusTab" component={EmptyTab} />
      <Tab.Screen name="Pharmacists" component={PharmacistsScreen} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
