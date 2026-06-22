import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';

type ToastType = 'success' | 'error';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType }>({ message: '', type: 'success' });
  const opacity = useMemo(() => new Animated.Value(0), []);
  const translateY = useMemo(() => new Animated.Value(16), []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ message, type });
      opacity.setValue(0);
      translateY.setValue(10);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true })
      ]).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }, 1800);
    },
    [opacity, translateY]
  );

  const isSuccess = toast.type === 'success';
  const bgColor = isSuccess ? colors.successBg : '#FEE2DE';
  const textColor = isSuccess ? colors.successText : colors.destructive;
  const borderColor = isSuccess ? '#C3DFB8' : '#EFBCB3';

  return (
    <ToastContext value={{ showToast }}>
      <View style={styles.container}>
        {children}
        <Animated.View pointerEvents="none" style={[styles.banner, { opacity, transform: [{ translateY }], backgroundColor: bgColor, borderColor }]}>
          <Text style={[styles.text, { color: textColor }]}>{toast.message}</Text>
        </Animated.View>
      </View>
    </ToastContext>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  banner: {
    position: 'absolute',
    bottom: 40,
    left: spacing.base,
    right: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4
  },
  text: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14
  }
});
