import { render, screen } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';
import { RootNavigator } from '../../navigation/RootNavigator';

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../navigation/AuthNavigator', () => ({
  AuthNavigator: () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const React = require('react');
    const { View } = require('react-native');
    /* eslint-enable @typescript-eslint/no-require-imports */
    return React.createElement(View, { testID: 'auth-navigator' });
  }
}));

jest.mock('../../navigation/AppNavigator', () => ({
  AppNavigator: () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const React = require('react');
    const { View } = require('react-native');
    /* eslint-enable @typescript-eslint/no-require-imports */
    return React.createElement(View, { testID: 'app-navigator' });
  }
}));

jest.mock('../../screens/OfflineWallScreen', () => ({
  OfflineWallScreen: () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const React = require('react');
    const { View } = require('react-native');
    /* eslint-enable @typescript-eslint/no-require-imports */
    return React.createElement(View, { testID: 'offline-wall' });
  }
}));

import { useAuth } from '../../hooks/useAuth';

function mockAuth(overrides: { isLoading?: boolean; isAuthenticated?: boolean; requiresOnline?: boolean } = {}) {
  (useAuth as jest.Mock).mockReturnValue({
    isLoading: false,
    isAuthenticated: false,
    requiresOnline: false,
    clearOfflineWall: jest.fn(),
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    ...overrides
  });
}

describe('RootNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ActivityIndicator while isLoading is true', () => {
    mockAuth({ isLoading: true });

    render(<RootNavigator />);

    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not render auth or app navigator while loading', () => {
    mockAuth({ isLoading: true });

    render(<RootNavigator />);

    expect(screen.queryByTestId('auth-navigator')).toBeNull();
    expect(screen.queryByTestId('app-navigator')).toBeNull();
  });

  it('renders AuthNavigator when not authenticated and not loading', () => {
    mockAuth({ isLoading: false, isAuthenticated: false });

    render(<RootNavigator />);

    expect(screen.getByTestId('auth-navigator')).toBeTruthy();
    expect(screen.queryByTestId('app-navigator')).toBeNull();
  });

  it('renders AppNavigator when authenticated', () => {
    mockAuth({ isLoading: false, isAuthenticated: true });

    render(<RootNavigator />);

    expect(screen.getByTestId('app-navigator')).toBeTruthy();
    expect(screen.queryByTestId('auth-navigator')).toBeNull();
  });

  it('renders OfflineWallScreen when authenticated but requiresOnline is true', () => {
    mockAuth({ isLoading: false, isAuthenticated: true, requiresOnline: true });

    render(<RootNavigator />);

    expect(screen.getByTestId('offline-wall')).toBeTruthy();
    expect(screen.queryByTestId('app-navigator')).toBeNull();
  });
});
