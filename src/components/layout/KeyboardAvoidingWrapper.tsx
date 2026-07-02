import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
}

export function KeyboardAvoidingWrapper({ children }: KeyboardAvoidingWrapperProps) {
  // On Android, the OS handles keyboard avoidance natively via windowSoftInputMode=adjustResize.
  // KeyboardAvoidingView with behavior="height" fights that and causes scroll layout issues.
  if (Platform.OS === 'android') {
    return <View style={styles.flex}>{children}</View>;
  }
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }
});
