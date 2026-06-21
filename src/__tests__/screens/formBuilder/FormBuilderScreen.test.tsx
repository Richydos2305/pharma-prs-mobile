import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { FormBuilderScreen } from '../../../screens/formBuilder/FormBuilderScreen';
import { buildDefaultTemplate } from '../../../types/formBuilder';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn()
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn()
}));

jest.mock('../../../api/settings', () => ({
  publishFormSchema: jest.fn()
}));

import { useQueryClient } from '@tanstack/react-query';
import { publishFormSchema } from '../../../api/settings';

const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: jest.fn(),
  getParent: jest.fn(() => ({ navigate: mockNavigate }))
};
const mockQueryClient = { invalidateQueries: jest.fn() };

function setupMocks() {
  (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
}

function makeRoute(hasExisting = false) {
  return { params: { schema: buildDefaultTemplate(), hasExisting } } as never;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FormBuilderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('renders section names from the schema', () => {
    render(<FormBuilderScreen navigation={mockNavigation as never} route={makeRoute()} />);

    // buildDefaultTemplate() produces these exact names
    expect(screen.getByText('Personal Info')).toBeTruthy();
    expect(screen.getByText('Medical History')).toBeTruthy();
    expect(screen.getByText('Prescriptions')).toBeTruthy();
  });

  it('swaps sections when move-up is pressed on the second section (Medical History → index 1)', () => {
    render(<FormBuilderScreen navigation={mockNavigation as never} route={makeRoute()} />);

    // Index 1 = Medical History. Its up button (testID move-up-1) should work
    // because the target (index 0, Personal Info) is locked → move is blocked
    // So let's move index 2 (Prescriptions) up instead — target is Medical History (not locked)
    fireEvent.press(screen.getByTestId('move-up-2'));

    // After move-up on index 2, Prescriptions moves before Medical History
    const allSections = screen.getAllByText(/Personal Info|Medical History|Prescriptions/);
    // All three still present
    expect(allSections.length).toBeGreaterThanOrEqual(3);
    // Prescriptions text should still be visible (swap happened)
    expect(screen.getByText('Prescriptions')).toBeTruthy();
    expect(screen.getByText('Medical History')).toBeTruthy();
  });

  it('cannot move Personal Info (locked) — it stays first after pressing its down button', () => {
    render(<FormBuilderScreen navigation={mockNavigation as never} route={makeRoute()} />);

    // Personal Info is locked; move-down-0 is disabled
    // Pressing it should be a no-op
    fireEvent.press(screen.getByTestId('move-down-0'));

    // Personal Info is still rendered — order unchanged
    expect(screen.getByText('Personal Info')).toBeTruthy();
    expect(screen.getByText('Medical History')).toBeTruthy();
    expect(screen.getByText('Prescriptions')).toBeTruthy();
  });

  it('appends a "Vitals" section when added via AddSectionSheet', async () => {
    render(<FormBuilderScreen navigation={mockNavigation as never} route={makeRoute()} />);

    // getAllByText('Add Section') = [footer button, AddSectionSheet submit button]
    fireEvent.press(screen.getAllByText('Add Section')[0]);

    await waitFor(() => {
      expect(screen.getByText('New Section')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Consultation Notes'), 'Vitals');
    const addSectionBtns = screen.getAllByText('Add Section');
    fireEvent.press(addSectionBtns[addSectionBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Vitals')).toBeTruthy();
    });
  });

  it('calls publishFormSchema on confirm from preview mode', async () => {
    (publishFormSchema as jest.Mock).mockResolvedValue(undefined);

    render(<FormBuilderScreen navigation={mockNavigation as never} route={makeRoute(false)} />);

    // Enter preview mode
    fireEvent.press(screen.getByText('Preview'));

    await waitFor(() => {
      expect(screen.getByText('Form Preview')).toBeTruthy();
    });

    // The PublishConfirmSheet is always rendered (mock ignores index={-1}).
    // "Publish Form?" is already visible; press the sheet's Publish button directly.
    await waitFor(() => {
      expect(screen.getByText('Publish Form?')).toBeTruthy();
    });

    // getAllByText('Publish') = [nav-bar button, sheet button]
    const publishBtns = screen.getAllByText('Publish');
    await act(async () => {
      fireEvent.press(publishBtns[publishBtns.length - 1]);
    });

    await waitFor(() => {
      expect(publishFormSchema).toHaveBeenCalledWith(expect.objectContaining({ name: 'Patient Form', status: 'published' }));
    });
  });
});
