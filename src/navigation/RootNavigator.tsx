import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { OfflineWallScreen } from '../screens/OfflineWallScreen';
import { colors } from '../theme/colors';

export function RootNavigator() {
  const { isAuthenticated, isLoading, requiresOnline } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isAuthenticated && requiresOnline) {
    return <OfflineWallScreen />;
  }

  return isAuthenticated ? (
    <Animated.View entering={FadeIn.duration(400)} style={styles.fill}>
      <AppNavigator />
    </Animated.View>
  ) : (
    <Animated.View entering={FadeIn.duration(400)} style={styles.fill}>
      <AuthNavigator />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background
  },
  fill: { flex: 1 }
});
