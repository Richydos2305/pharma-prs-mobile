import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';
import { PatientNewScreen } from '../../../screens/patients/PatientNewScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true)
}));

import { useNavigation } from '@react-navigation/native';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn()
}));

jest.mock('../../../api/patients', () => ({ createPatient: jest.fn() }));
jest.mock('../../../api/pharmacists', () => ({ listPharmacists: jest.fn() }));
jest.mock('../../../api/settings', () => ({ getSettings: jest.fn() }));

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPatient } from '../../../api/patients';

const mockNavigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
const mockQueryClient = { invalidateQueries: jest.fn() };

function setupMocks() {
  (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);

  (useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
    const key = String(queryKey[0]);
    if (key === 'settings') return { data: null, isLoading: false };
    if (key === 'pharmacists') return { data: [{ id: 'ph1', name: 'Dr Nkosi', phoneNumber: '0700' }], isLoading: false };
    return { data: undefined, isLoading: false };
  });
}

describe('PatientNewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Personal Information section', () => {
    setupMocks();

    render(<PatientNewScreen navigation={mockNavigation as never} route={{ params: undefined } as never} />);

    expect(screen.getByText('Personal Info')).toBeTruthy();
  });

  it('shows a validation error when required Full Name is empty on submit', async () => {
    setupMocks();

    render(<PatientNewScreen navigation={mockNavigation as never} route={{ params: undefined } as never} />);

    fireEvent.press(screen.getByText('Save Patient'));

    await waitFor(() => {
      expect(screen.getByText('Full Name is required')).toBeTruthy();
    });
  });

  it('shows a validation error when required Attended To By is empty on submit', async () => {
    setupMocks();

    render(<PatientNewScreen navigation={mockNavigation as never} route={{ params: undefined } as never} />);

    fireEvent.press(screen.getByText('Save Patient'));

    await waitFor(() => {
      expect(screen.getByText('Attended To By is required')).toBeTruthy();
    });
  });

  it('calls createPatient with correct core field values on valid submit', async () => {
    (createPatient as jest.Mock).mockResolvedValue({ id: 'p-new' });
    setupMocks();

    render(<PatientNewScreen navigation={mockNavigation as never} route={{ params: undefined } as never} />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter full name'), 'Akin Kisi');
    fireEvent.changeText(screen.getByPlaceholderText('Enter age'), '42');
    fireEvent.changeText(screen.getByPlaceholderText('Enter phone number'), '07000000001');

    // Select pharmacist via the relation field picker text
    fireEvent.press(screen.getByText('Select pharmacist...'));
    await waitFor(() => {
      fireEvent.press(screen.getByText('Dr Nkosi'));
    });

    fireEvent.press(screen.getByText('Save Patient'));

    await waitFor(() => {
      expect(createPatient).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Akin Kisi',
          age: 42,
          phoneNumber: '07000000001'
        }),
        'test-user-id'
      );
    });

    const payload = (createPatient as jest.Mock).mock.calls[0][0];
    const sections: Array<{ fields: Array<Record<string, unknown>> }> = payload.customFields.sections;
    const attendedByValues = sections.flatMap((s) => s.fields.map((f) => f['core-attended-to-by'])).filter(Boolean);
    expect(attendedByValues).toContain('Dr Nkosi');
  });

  it('shows ActivityIndicator while save is in progress', async () => {
    // createPatient never resolves so saving stays true
    (createPatient as jest.Mock).mockReturnValue(new Promise(() => {}));
    setupMocks();

    render(<PatientNewScreen navigation={mockNavigation as never} route={{ params: undefined } as never} />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter full name'), 'Akin Kisi');
    fireEvent.changeText(screen.getByPlaceholderText('Enter age'), '42');
    fireEvent.changeText(screen.getByPlaceholderText('Enter phone number'), '07000000001');

    fireEvent.press(screen.getByText('Select pharmacist...'));
    await waitFor(() => {
      fireEvent.press(screen.getByText('Dr Nkosi'));
    });

    fireEvent.press(screen.getByText('Save Patient'));

    await waitFor(() => {
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });
});
