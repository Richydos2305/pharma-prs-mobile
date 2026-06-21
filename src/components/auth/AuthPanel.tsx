/**
 * Shared wrapper for auth screen cards — cream card with exact design specs:
 * padding [20,18], gap 18, cornerRadius 22, border, double shadow.
 */
import { StyleSheet, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { colors } from '../../theme/colors';

interface AuthPanelProps extends ViewProps {
  children: React.ReactNode;
}

export function AuthPanel({ children, style, ...props }: AuthPanelProps) {
  return (
    <View style={[styles.panel, style]} {...props}>
      {children}
    </View>
  );
}

export const authFieldStyles = StyleSheet.create({
  inputBox: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputFill,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14
  },
  primaryBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accentBorder
  }
});

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2
  }
});
