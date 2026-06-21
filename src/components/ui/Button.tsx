import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { usePressSpring } from '../../hooks/usePressSpring';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false }: ButtonProps) {
  const isDisabled = disabled || loading;
  const { animatedStyle, onPressIn, onPressOut } = usePressSpring();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      style={[styles.base, styles[variant], isDisabled && styles.disabled, animatedStyle]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'destructive' ? colors.white : colors.accent} size="small" />
      ) : (
        <Text style={[styles.text, (styles as Record<string, object>)[`${variant}Text`]]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 20
  },
  primary: {
    height: 52,
    backgroundColor: colors.text
  },
  secondary: {
    height: 48,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#D8D1C1'
  },
  destructive: {
    height: 52,
    backgroundColor: colors.destructive,
    shadowColor: colors.destructive,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 4
  },
  disabled: {
    opacity: 0.5
  },
  text: {
    ...typography.button
  },
  primaryText: {
    color: colors.background
  },
  secondaryText: {
    color: colors.accent
  },
  destructiveText: {
    color: colors.white
  }
});
