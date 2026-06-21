import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PatientEditScreen } from '../../../screens/patients/PatientEditScreen';
import { buildFollowUpTemplate } from '../../../types/formBuilder';
import type { IPatient } from '../../../types';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn()
}));

jest.mock('../../../api/patients', () => ({
  getPatient: jest.fn(),
  updatePatient: jest.fn(),
  deletePatient: jest.fn()
}));
jest.mock('../../../api/pharmacists', () => ({ listPharmacists: jest.fn() }));
jest.mock('../../../api/settings', () => ({ getSettings: jest.fn() }));

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const mockNavigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
const mockQueryClient = { invalidateQueries: jest.fn() };

const schema = buildFollowUpTemplate();
const personalInfoSection = schema.sections.find((s) => s.id === 'personal-info')!;
const medicalSection = schema.sections.find((s) => s.type === 'repeatable' && s.name === 'Medical Information')!;
const prescriptionsSection = schema.sections.find((s) => s.id === 'core-prescriptions')!;
const attendedByField = medicalSection.fields.find((f) => f.type === 'relation')!;
const apptDateField = medicalSection.fields.find((f) => f.type === 'date')!;
const notesField = medicalSection.fields.find((f) => f.type === 'textarea')!;

const pharmacists = [
  { id: 'ph1', name: 'Dr Nkosi', phoneNumber: '0700' },
  { id: 'ph2', name: 'Dr Laila', phoneNumber: '0701' }
];

function buildMockPatient(attendedByValue: string): IPatient {
  return {
    id: 'p1',
    userId: 'u1',
    pharmacistName: attendedByValue ? [attendedByValue] : [],
    fullName: 'Akin Kisi',
    age: 42,
    phoneNumber: '07000000001',
    customFields: {
      sections: [
        { name: personalInfoSection.id, fields: [{ 'core-address': '12 Lagos Way' }] },
        {
          name: medicalSection.id,
          fields: [
            {
              [attendedByField.id]: attendedByValue,
              [apptDateField.id]: '01/01/2025',
              [notesField.id]: 'First visit'
            }
          ]
        },
        { name: prescriptionsSection.id, fields: [] }
      ]
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };
}

function setupMocks({ mutateAsync = jest.fn(), isPending = false, patient = buildMockPatient('Dr Nkosi') } = {}) {
  (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);

  (useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
    const key = String(queryKey[0]);
    if (key === 'settings') return { data: { formConfig: { schema } }, isLoading: false };
    if (key === 'pharmacists') return { data: pharmacists, isLoading: false };
    if (key === 'patient') return { data: patient, isLoading: false };
    return { data: undefined, isLoading: false };
  });

  (useMutation as jest.Mock).mockReturnValue({ mutateAsync, isPending });
}

const props = {
  navigation: mockNavigation as never,
  route: { params: { patientId: 'p1' } } as never
};

describe('PatientEditScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates standard and repeatable fields from patient.customFields.sections', () => {
    setupMocks();

    render(<PatientEditScreen {...props} />);

    expect(screen.getByDisplayValue('Akin Kisi')).toBeTruthy();
    expect(screen.getByDisplayValue('42')).toBeTruthy();
    expect(screen.getByDisplayValue('07000000001')).toBeTruthy();
    expect(screen.getByDisplayValue('12 Lagos Way')).toBeTruthy();

    expect(screen.getByText('Visit 1')).toBeTruthy();
    // "Dr Nkosi" appears once as the locked existing row value and once in the
    // (always-rendered, mocked) pharmacist picker sheet list.
    expect(screen.getAllByText('Dr Nkosi').length).toBeGreaterThanOrEqual(1);
  });

  it("renders an existing repeatable row's Attended To By as locked, and a newly-added row as an editable picker", () => {
    setupMocks();

    render(<PatientEditScreen {...props} />);

    expect(screen.getByText('Visit 1')).toBeTruthy();
    expect(screen.queryByText('Select pharmacist...')).toBeNull();

    fireEvent.press(screen.getByText('+ Add another visit'));

    expect(screen.getByText('Visit 2')).toBeTruthy();
    expect(screen.getByText('Select pharmacist...')).toBeTruthy();
  });

  it('builds a complete customFields.sections payload and calls updatePatient without legacy fields', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ id: 'p1' });
    setupMocks({ mutateAsync });

    render(<PatientEditScreen {...props} />);

    fireEvent.press(screen.getByText('Update Patient'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled();
    });

    const payload = mutateAsync.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        fullName: 'Akin Kisi',
        age: 42,
        phoneNumber: '07000000001'
      })
    );
    expect(payload.pharmacistName).toBeUndefined();
    expect(payload.address).toBeUndefined();
    expect(payload.notes).toBeUndefined();

    const sections: Array<{ name: string; fields: Array<Record<string, unknown>> }> = payload.customFields.sections;
    expect(sections).toHaveLength(3);

    const personal = sections.find((s) => s.name === personalInfoSection.id)!;
    expect(personal.fields[0]['core-address']).toBe('12 Lagos Way');

    const medical = sections.find((s) => s.name === medicalSection.id)!;
    expect(medical.fields[0][attendedByField.id]).toBe('Dr Nkosi');
    expect(medical.fields[0][notesField.id]).toBe('First visit');

    const prescriptions = sections.find((s) => s.name === prescriptionsSection.id)!;
    expect(prescriptions.fields).toEqual([]);
  });

  it('shows the "Missing field" alert when no Attended To By value exists anywhere', async () => {
    const mutateAsync = jest.fn();
    setupMocks({ mutateAsync, patient: buildMockPatient('') });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<PatientEditScreen {...props} />);

    fireEvent.press(screen.getByText('Update Patient'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Missing field', expect.stringContaining('Attended by'));
    });

    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
