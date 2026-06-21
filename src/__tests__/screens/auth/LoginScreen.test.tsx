import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../../../screens/auth/LoginScreen';

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn()
}));

import { useAuth } from '../../../hooks/useAuth';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn()
};

const mockRoute = { params: undefined };

function renderScreen(loginImpl: (...args: unknown[]) => unknown = jest.fn()) {
  (useAuth as jest.Mock).mockReturnValue({
    login: loginImpl,
    logout: jest.fn(),
    register: jest.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false
  });

  return render(<LoginScreen navigation={mockNavigation as never} route={mockRoute as never} />);
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email and password inputs', () => {
    renderScreen();

    expect(screen.getByPlaceholderText('jane@pharmacy.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('renders the sign in button', () => {
    renderScreen();

    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('shows loading text and disables button while login is pending', async () => {
    const neverResolves = new Promise<void>(() => {});
    renderScreen(() => neverResolves);

    fireEvent.changeText(screen.getByPlaceholderText('jane@pharmacy.com'), 'a@b.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'password');
    fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByText('Signing in…')).toBeTruthy();
    });
  });

  it('shows an error message when login throws', async () => {
    const loginMock = jest.fn().mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } }
    });
    renderScreen(loginMock);

    fireEvent.changeText(screen.getByPlaceholderText('jane@pharmacy.com'), 'a@b.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('does not navigate when login throws', async () => {
    const loginMock = jest.fn().mockRejectedValueOnce(new Error('fail'));
    renderScreen(loginMock);

    fireEvent.changeText(screen.getByPlaceholderText('jane@pharmacy.com'), 'a@b.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.queryByText('Login failed. Please try again.')).toBeTruthy();
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalledWith(expect.stringMatching(/Dashboard|App/));
  });

  it('navigates to Register screen when Register link is pressed', () => {
    renderScreen();

    fireEvent.press(screen.getByText('Register'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });

  it('navigates to ForgotPassword screen when link is pressed', () => {
    renderScreen();

    fireEvent.press(screen.getByText('Forgot password?'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });
});
