import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { colors } from '../../theme/colors';
import { fonts, typography } from '../../theme/typography';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
  containerStyle?: object;
  /** Pass true when this Input is inside a BottomSheetModal to avoid the
   *  first-keystroke doubling caused by competing gesture handlers. */
  bottomSheet?: boolean;
}

export function Input({ label, error, rightElement, containerStyle, bottomSheet, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const isDisabled = props.editable === false;

  const NativeInput = bottomSheet ? BottomSheetTextInput : TextInput;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          isDisabled && styles.inputWrapperDisabled,
          focused && !isDisabled && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null
        ]}
      >
        <NativeInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted
  },
  inputWrapper: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14
  },
  inputWrapperDisabled: {
    backgroundColor: '#F5F2ED'
  },
  inputWrapperFocused: {
    borderColor: colors.accent
  },
  inputWrapperError: {
    borderColor: colors.error
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0
  },
  rightElement: {
    marginLeft: 8
  },
  error: {
    ...typography.caption,
    color: colors.error
  }
});
