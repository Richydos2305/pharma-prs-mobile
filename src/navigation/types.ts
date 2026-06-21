import type { NavigatorScreenParams } from '@react-navigation/native';
import type { FormSchema } from '../types/formBuilder';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  CheckEmail: { email: string };
  VerifyEmail: { token?: string };
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type PatientsStackParamList = {
  PatientList: undefined;
  PatientDetail: { patientId: string };
  PatientNew: undefined;
  PatientEdit: { patientId: string };
};

export type ProfileStackParamList = {
  ProfileOverview: undefined;
  ProfileEdit: undefined;
  PharmacyEdit: undefined;
};

export type FormBuilderStackParamList = {
  TemplatePicker: undefined;
  FormBuilderCanvas: { schema: FormSchema; hasExisting: boolean };
};

export type AppTabParamList = {
  Dashboard: undefined;
  Patients: NavigatorScreenParams<PatientsStackParamList>;
  PlusTab: undefined;
  Pharmacists: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type AppStackParamList = {
  Tabs: undefined;
  FormBuilder: NavigatorScreenParams<FormBuilderStackParamList>;
};
