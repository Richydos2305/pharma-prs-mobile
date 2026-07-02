import { render, screen, fireEvent } from '@testing-library/react-native';
import { DashboardScreen } from '../../../screens/dashboard/DashboardScreen';
import type { OnboardingSteps } from '../../../types';

// ── Navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getParent: () => ({ navigate: mockNavigate }) }),
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true)
}));

// ── React Query ──────────────────────────────────────────────────────────────
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn()
}));

// ── API ──────────────────────────────────────────────────────────────────────
jest.mock('../../../api/settings', () => ({ getSettings: jest.fn() }));
jest.mock('../../../api/patients', () => ({ listPatients: jest.fn() }));
jest.mock('../../../api/users', () => ({ getMe: jest.fn() }));

import { useQuery } from '@tanstack/react-query';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockUser = { id: 'u1', email: 'a@b.com', fullName: 'Anna Blake', role: 'Owner', companyName: 'Test Pharmacy' };

const allDoneSteps: OnboardingSteps = {
  profileComplete: true,
  firstPharmacistAdded: true,
  formBuilt: true,
  firstPatientAdded: true
};

const noSteps: OnboardingSteps = {
  profileComplete: false,
  firstPharmacistAdded: false,
  formBuilt: false,
  firstPatientAdded: false
};

const mockPatients = [
  {
    id: 'p1',
    fullName: 'Akin Kisi',
    phoneNumber: '07000000001',
    age: 42,
    pharmacistName: ['NJ'],
    userId: 'u1',
    customFields: { sections: [] },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'p2',
    fullName: 'Joseph Tettah',
    phoneNumber: '07000000002',
    age: 55,
    pharmacistName: ['LV'],
    userId: 'u1',
    customFields: { sections: [] },
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z'
  }
];

function mockQueries({ loading = false, patients = [] as typeof mockPatients, onboardingComplete = false, steps = noSteps } = {}) {
  (useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
    const key = queryKey[0];
    if (key === 'me') return { data: mockUser, isLoading: loading };
    if (key === 'patients') return { data: patients, isLoading: loading };
    if (key === 'settings') {
      return {
        data: { onboarding: { allComplete: onboardingComplete, steps } },
        isLoading: loading
      };
    }
    return { data: undefined, isLoading: false };
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton blocks while any query is loading', () => {
    mockQueries({ loading: true });

    render(<DashboardScreen />);

    // When loading, the page title should not appear
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('shows the Getting Started checklist when onboarding is not complete', () => {
    mockQueries({ onboardingComplete: false, steps: noSteps });

    render(<DashboardScreen />);

    expect(screen.getByText('Getting Started')).toBeTruthy();
    expect(screen.getByText('Complete your profile')).toBeTruthy();
    expect(screen.getByText('Add a pharmacist')).toBeTruthy();
    expect(screen.getByText('Build your intake form')).toBeTruthy();
    expect(screen.getByText('Add your first patient')).toBeTruthy();
  });

  it('does not show the checklist when onboarding is complete', () => {
    mockQueries({ onboardingComplete: true, steps: allDoneSteps });

    render(<DashboardScreen />);

    expect(screen.queryByText('Getting Started')).toBeNull();
  });

  it('shows total and recent patient counts in the stats row', () => {
    mockQueries({ onboardingComplete: true, steps: allDoneSteps, patients: mockPatients });

    render(<DashboardScreen />);

    expect(screen.getByText('Total Patients')).toBeTruthy();
    // "Recent Patients" appears in both the stat box and the section header
    expect(screen.getAllByText('Recent Patients').length).toBeGreaterThanOrEqual(1);
    // both stat counts rendered (2 patients → value "2" appears twice)
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  it('renders recent patient names when patients exist', () => {
    mockQueries({ onboardingComplete: true, steps: allDoneSteps, patients: mockPatients });

    render(<DashboardScreen />);

    expect(screen.getByText('Akin Kisi')).toBeTruthy();
    expect(screen.getByText('Joseph Tettah')).toBeTruthy();
  });

  it('shows empty state when there are no patients', () => {
    mockQueries({ onboardingComplete: true, steps: allDoneSteps, patients: [] });

    render(<DashboardScreen />);

    expect(screen.getByText('No patients yet')).toBeTruthy();
  });

  it('greets with Good morning between midnight and noon', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);

    mockQueries({ onboardingComplete: true, steps: allDoneSteps });

    render(<DashboardScreen />);

    expect(screen.getByText(/Good morning/)).toBeTruthy();

    jest.restoreAllMocks();
  });

  it('greets with Good afternoon between noon and 6pm', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);

    mockQueries({ onboardingComplete: true, steps: allDoneSteps });

    render(<DashboardScreen />);

    expect(screen.getByText(/Good afternoon/)).toBeTruthy();

    jest.restoreAllMocks();
  });

  it('greets with Good evening from 6pm onwards', () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);

    mockQueries({ onboardingComplete: true, steps: allDoneSteps });

    render(<DashboardScreen />);

    expect(screen.getByText(/Good evening/)).toBeTruthy();

    jest.restoreAllMocks();
  });

  it('navigates to PatientNew when the Add First Patient step is tapped', () => {
    mockQueries({ onboardingComplete: false, steps: noSteps });

    render(<DashboardScreen />);

    fireEvent.press(screen.getByText('Add your first patient'));

    expect(mockNavigate).toHaveBeenCalledWith('PlusTab');
  });

  it('navigates to Pharmacists when the Add a pharmacist step is tapped', () => {
    mockQueries({ onboardingComplete: false, steps: noSteps });

    render(<DashboardScreen />);

    fireEvent.press(screen.getByText('Add a pharmacist'));

    expect(mockNavigate).toHaveBeenCalledWith('Pharmacists');
  });

  it('navigates to TemplatePicker when the Build your intake form step is tapped', () => {
    mockQueries({ onboardingComplete: false, steps: noSteps });

    render(<DashboardScreen />);

    fireEvent.press(screen.getByText('Build your intake form'));

    expect(mockNavigate).toHaveBeenCalledWith('FormBuilder', { screen: 'TemplatePicker' });
  });

  it('navigates to PatientDetail when View Patient is pressed on a recent patient', () => {
    mockQueries({ onboardingComplete: true, steps: allDoneSteps, patients: mockPatients });

    render(<DashboardScreen />);

    // Patient names are visible
    expect(screen.getByText('Akin Kisi')).toBeTruthy();

    // sort by updatedAt DESC → p2 (Jun 2024) is first, p1 (Jan 2024) is second
    fireEvent.press(screen.getAllByText('View Patient')[0]);

    expect(mockNavigate).toHaveBeenCalledWith('Patients', {
      screen: 'PatientDetail',
      params: { patientId: 'p2' }
    });
  });
});
