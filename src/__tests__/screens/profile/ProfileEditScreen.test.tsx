import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileEditScreen } from '../../../screens/profile/ProfileEditScreen';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn()
}));

jest.mock('../../../api/users', () => ({
  getMe: jest.fn(),
  updateMe: jest.fn()
}));

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const mockUser = {
  _id: 'u1',
  email: 'ama@northridgepharmacy.com',
  fullName: 'Ama K. Obeng',
  role: 'Owner',
  phoneNumber: '+233 24 555 0101'
};

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const mockQueryClient = { setQueryData: jest.fn() };

function setupMocks({ mutateAsync = jest.fn(), isPending = false } = {}) {
  (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
  (useQuery as jest.Mock).mockReturnValue({ data: mockUser, isLoading: false });
  (useMutation as jest.Mock).mockReturnValue({ mutateAsync, isPending });
}

describe('ProfileEditScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pre-populates fullName from the user query', () => {
    setupMocks();

    render(<ProfileEditScreen navigation={mockNavigation as never} route={{} as never} />);

    expect(screen.getByDisplayValue('Ama K. Obeng')).toBeTruthy();
  });

  it('pre-populates phoneNumber from the user query', () => {
    setupMocks();

    render(<ProfileEditScreen navigation={mockNavigation as never} route={{} as never} />);

    expect(screen.getByDisplayValue('+233 24 555 0101')).toBeTruthy();
  });

  it('shows a validation error when fullName is cleared and Save is pressed', async () => {
    setupMocks();

    render(<ProfileEditScreen navigation={mockNavigation as never} route={{} as never} />);

    fireEvent.changeText(screen.getByDisplayValue('Ama K. Obeng'), '');
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeTruthy();
    });
  });

  it('calls updateMe with { fullName, phoneNumber } on valid save', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ ...mockUser, fullName: 'Ama Obeng' });
    setupMocks({ mutateAsync });

    render(<ProfileEditScreen navigation={mockNavigation as never} route={{} as never} />);

    fireEvent.changeText(screen.getByDisplayValue('Ama K. Obeng'), 'Ama Obeng');
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        fullName: 'Ama Obeng',
        phoneNumber: '+233 24 555 0101'
      });
    });
  });

  it('calls navigation.goBack on successful save', async () => {
    const updated = { ...mockUser, fullName: 'Ama Obeng' };
    const mutateAsync = jest.fn().mockResolvedValue(updated);
    setupMocks({ mutateAsync });

    // Simulate onSuccess being triggered
    (useMutation as jest.Mock).mockImplementation(({ onSuccess }) => ({
      mutateAsync: jest.fn().mockImplementation(async (payload) => {
        const result = await mutateAsync(payload);
        onSuccess(result);
        return result;
      }),
      isPending: false
    }));

    render(<ProfileEditScreen navigation={mockNavigation as never} route={{} as never} />);

    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('renders email as read-only', () => {
    setupMocks();

    render(<ProfileEditScreen navigation={mockNavigation as never} route={{} as never} />);

    expect(screen.getByDisplayValue('ama@northridgepharmacy.com')).toBeTruthy();
    expect(screen.getByText('Email cannot be changed.')).toBeTruthy();
  });
});
