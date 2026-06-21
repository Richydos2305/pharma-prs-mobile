import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TemplatePickerScreen } from '../screens/formBuilder/TemplatePickerScreen';
import { FormBuilderScreen } from '../screens/formBuilder/FormBuilderScreen';
import type { FormBuilderStackParamList } from './types';

const Stack = createNativeStackNavigator<FormBuilderStackParamList>();

export function FormBuilderNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TemplatePicker" component={TemplatePickerScreen} />
      <Stack.Screen name="FormBuilderCanvas" component={FormBuilderScreen} />
    </Stack.Navigator>
  );
}
