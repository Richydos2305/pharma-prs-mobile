import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppTabNavigator } from './AppTabNavigator';
import { FormBuilderNavigator } from './FormBuilderNavigator';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppTabNavigator} />
      <Stack.Screen name="FormBuilder" component={FormBuilderNavigator} options={{ animation: 'fade_from_bottom' }} />
    </Stack.Navigator>
  );
}
