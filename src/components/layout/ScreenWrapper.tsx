import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

// Height of the custom floating tab bar + its bottom padding
const TAB_BAR_HEIGHT = 64 + 12 + 12; // bar height + wrapper paddingBottom + extra

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  edges?: Edge[];
  contentStyle?: object;
  /** Set true for screens inside the tab navigator (adds bottom padding for floating tab bar) */
  hasTabBar?: boolean;
}

export function ScreenWrapper({ children, scrollable = false, edges = ['top'], contentStyle, hasTabBar = false }: ScreenWrapperProps) {
  const bottomPad = hasTabBar ? TAB_BAR_HEIGHT : 0;

  if (scrollable) {
    return (
      <SafeAreaView style={styles.flex} edges={edges}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + bottomPad }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, styles.safeArea, { paddingBottom: bottomPad }, contentStyle]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background
  },
  safeArea: {
    backgroundColor: colors.background
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20
  }
});
