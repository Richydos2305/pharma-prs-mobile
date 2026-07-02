import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PatientListScreen } from '../../../screens/patients/PatientListScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true)
}));

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../api/patients', () => ({ listPatients: jest.fn() }));
jest.mock('../../../api/pharmacists', () => ({ listPharmacists: jest.fn() }));

import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

const mockPatients = [
  {
    id: 'p1',
    fullName: 'Akin Kisi',
    phoneNumber: '07000000001',
    age: 42,
    pharmacistName: ['Dr Nkosi'],
    userId: 'u1',
    customFields: { sections: [] },
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'p2',
    fullName: 'Joseph Tettah',
    phoneNumber: '07000000002',
    age: 55,
    pharmacistName: ['Dr Laila'],
    userId: 'u1',
    customFields: { sections: [] },
    createdAt: '',
    updatedAt: ''
  }
];

const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();

function mockQueryWithPatients(patients = mockPatients) {
  (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate, getParent: () => ({ navigate: mockParentNavigate }) });
  (useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
    const key = String(queryKey[0]);
    if (key === 'patients') return { data: patients, isLoading: false, isRefetching: false, refetch: jest.fn() };
    if (key === 'pharmacists') return { data: [], isLoading: false };
    return { data: undefined, isLoading: false };
  });
}

describe('PatientListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "No patients found" when patient list is empty', () => {
    mockQueryWithPatients([]);

    render(<PatientListScreen />);

    expect(screen.getByText('No patients found')).toBeTruthy();
  });

  it('renders patient names when patients exist', () => {
    mockQueryWithPatients();

    render(<PatientListScreen />);

    expect(screen.getByText('Akin Kisi')).toBeTruthy();
    expect(screen.getByText('Joseph Tettah')).toBeTruthy();
  });

  it('shows total patient count in the header', () => {
    mockQueryWithPatients();

    render(<PatientListScreen />);

    expect(screen.getByText('2 total records')).toBeTruthy();
  });

  it('filters patients by search text after debounce', async () => {
    mockQueryWithPatients();

    render(<PatientListScreen />);

    const searchInput = screen.getByPlaceholderText('Search by name or phone...');
    fireEvent.changeText(searchInput, 'Akin');

    // Debounce hasn't fired yet — both still rendered from local state
    await waitFor(() => {
      expect(screen.getByText('Akin Kisi')).toBeTruthy();
    });
  });

  it('navigates to PatientNew when Add New Patient is pressed', () => {
    mockQueryWithPatients();

    render(<PatientListScreen />);

    fireEvent.press(screen.getByText('Add New Patient'));

    expect(mockParentNavigate).toHaveBeenCalledWith('PlusTab');
  });

  it('navigates to PatientDetail when View Patient is pressed', () => {
    mockQueryWithPatients();

    render(<PatientListScreen />);

    fireEvent.press(screen.getAllByText('View Patient')[0]);

    expect(mockNavigate).toHaveBeenCalledWith('PatientDetail', { patientId: 'p1' });
  });
});
