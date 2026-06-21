import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PharmacistsScreen } from '../../../screens/pharmacists/PharmacistsScreen';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn()
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn()
}));

jest.mock('../../../api/pharmacists', () => ({
  listPharmacists: jest.fn(),
  createPharmacist: jest.fn(),
  updatePharmacist: jest.fn(),
  deletePharmacist: jest.fn()
}));

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPharmacist, updatePharmacist, deletePharmacist } from '../../../api/pharmacists';
import type { IPharmacist } from '../../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockPharmacists: IPharmacist[] = [
  { id: 'ph1', name: 'Ama Obeng', phoneNumber: '+233 24 555 0100' },
  { id: 'ph2', name: 'Kwame Badu', phoneNumber: '+233 24 555 0200' }
];

let mockCache: IPharmacist[] = [...mockPharmacists];

const mockQueryClient = {
  getQueryData: jest.fn(() => mockCache),
  setQueryData: jest.fn((_, updater: IPharmacist[] | ((prev: IPharmacist[]) => IPharmacist[])) => {
    mockCache = typeof updater === 'function' ? updater(mockCache) : updater;
  })
};

function setupQuery(pharmacists = mockPharmacists) {
  mockCache = [...pharmacists];
  (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
  (useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
    if (queryKey[0] === 'me') {
      return { data: { fullName: 'Test User' }, isLoading: false };
    }
    return { data: pharmacists, isLoading: false };
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PharmacistsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCache = [...mockPharmacists];
  });

  it('renders pharmacist names from the query', () => {
    setupQuery();

    render(<PharmacistsScreen />);

    expect(screen.getByText('Ama Obeng')).toBeTruthy();
    expect(screen.getByText('Kwame Badu')).toBeTruthy();
  });

  it('shows empty state when there are no pharmacists', () => {
    setupQuery([]);

    render(<PharmacistsScreen />);

    expect(screen.getByText('No pharmacists yet')).toBeTruthy();
  });

  it('shows the correct team member count in the header', () => {
    setupQuery();

    render(<PharmacistsScreen />);

    expect(screen.getByText('2 team members')).toBeTruthy();
  });

  it('opens add sheet when Add Pharmacist button is pressed', () => {
    setupQuery();

    render(<PharmacistsScreen />);

    // The full-width CTA button has text "Add Pharmacist"
    fireEvent.press(screen.getAllByText('Add Pharmacist')[0]);

    expect(screen.getByText('Save Pharmacist')).toBeTruthy();
  });

  it('calls createPharmacist with name and phone and appends to cache', async () => {
    const newPharmacist: IPharmacist = { id: 'ph3', name: 'Nana Serwaa', phoneNumber: '+233 24 555 0300' };
    (createPharmacist as jest.Mock).mockResolvedValue(newPharmacist);
    setupQuery();

    render(<PharmacistsScreen />);

    fireEvent.press(screen.getAllByText('Add Pharmacist')[0]);
    fireEvent.changeText(screen.getByPlaceholderText('e.g. James Asante'), 'Nana Serwaa');
    fireEvent.changeText(screen.getByPlaceholderText('+233 XX XXX XXXX'), '+233 24 555 0300');
    fireEvent.press(screen.getByText('Save Pharmacist'));

    await waitFor(() => {
      expect(createPharmacist).toHaveBeenCalledWith({
        name: 'Nana Serwaa',
        phoneNumber: '+233 24 555 0300'
      });
    });

    expect(mockQueryClient.setQueryData).toHaveBeenCalled();
    expect(mockCache.find((p) => p.id === 'ph3')).toBeTruthy();
  });

  it('opens edit sheet and calls updatePharmacist, replacing in cache', async () => {
    const updatedPharmacist: IPharmacist = { id: 'ph1', name: 'Ama Obeng-Mensah', phoneNumber: '+233 24 555 0100' };
    (updatePharmacist as jest.Mock).mockResolvedValue(updatedPharmacist);
    setupQuery();

    render(<PharmacistsScreen />);

    // First Edit button (testID edit-ph1) for Ama Obeng
    fireEvent.press(screen.getByTestId('edit-ph1'));

    await waitFor(() => {
      expect(screen.getByText('Edit Pharmacist')).toBeTruthy();
    });

    const nameInput = screen.getByDisplayValue('Ama Obeng');
    fireEvent.changeText(nameInput, 'Ama Obeng-Mensah');
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(updatePharmacist).toHaveBeenCalledWith('ph1', expect.objectContaining({ name: 'Ama Obeng-Mensah' }));
    });

    expect(mockQueryClient.setQueryData).toHaveBeenCalled();
    expect(mockCache.find((p) => p.name === 'Ama Obeng-Mensah')).toBeTruthy();
  });

  it('opens delete sheet and calls deletePharmacist, removing from cache', async () => {
    (deletePharmacist as jest.Mock).mockResolvedValue(undefined);
    setupQuery();

    render(<PharmacistsScreen />);

    // Delete button for ph1 (Ama Obeng)
    fireEvent.press(screen.getByTestId('delete-ph1'));

    await waitFor(() => {
      expect(screen.getByText('Delete Pharmacist?')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Delete'));
    });

    expect(deletePharmacist).toHaveBeenCalledWith('ph1');
    expect(mockCache.find((p) => p.id === 'ph1')).toBeUndefined();
  });
});
