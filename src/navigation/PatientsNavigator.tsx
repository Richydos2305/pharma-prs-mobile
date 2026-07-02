import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PatientListScreen } from '../screens/patients/PatientListScreen';
import { PatientDetailScreen } from '../screens/patients/PatientDetailScreen';
import { PatientEditScreen } from '../screens/patients/PatientEditScreen';
import type { PatientsStackParamList } from './types';

const Stack = createNativeStackNavigator<PatientsStackParamList>();

export function PatientsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PatientList" component={PatientListScreen} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
      <Stack.Screen name="PatientEdit" component={PatientEditScreen} />
    </Stack.Navigator>
  );
}
