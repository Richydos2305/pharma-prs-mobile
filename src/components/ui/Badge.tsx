import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'accent';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <View style={[styles.badge, (styles as Record<string, object>)[variant]]}>
      <Text style={[styles.text, (styles as Record<string, object>)[`${variant}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  text: {
    ...typography.caption,
    fontWeight: '600'
  },
  default: { backgroundColor: '#EFEFEF' },
  defaultText: { color: colors.textSecondary },
  success: { backgroundColor: '#DCFCE7' },
  successText: { color: colors.success },
  warning: { backgroundColor: colors.warningBg },
  warningText: { color: colors.warningText },
  error: { backgroundColor: '#FEE2E2' },
  errorText: { color: colors.error },
  accent: { backgroundColor: colors.activeNavBg },
  accentText: { color: colors.accent }
});
