import { saveSettings, getSettings } from '../../services/settingsLocalRepository';
import type { SettingsData } from '../../api/settings';

let settingsRow: string | null = null;

const mockDb = {
  runAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn().mockResolvedValue([]),
  execAsync: jest.fn().mockResolvedValue(undefined),
  withTransactionAsync: jest.fn().mockImplementation((fn: () => Promise<void>) => fn())
};

jest.mock('../../services/db', () => ({
  getDb: jest.fn(() => mockDb)
}));

jest.mock('../../services/userSession', () => ({
  getCurrentUserId: () => 'test-user-id'
}));

describe('settingsLocalRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    settingsRow = null;

    mockDb.runAsync.mockImplementation(async (_sql: string, params: unknown[]) => {
      settingsRow = params[1] as string;
      return { lastInsertRowId: 0, changes: 1 };
    });

    mockDb.getFirstAsync.mockImplementation(async () => {
      return settingsRow ? { data: settingsRow } : null;
    });
  });

  it('getSettings returns null when no settings row exists', async () => {
    const result = await getSettings();

    expect(result).toBeNull();
  });

  it('saveSettings persists data that getSettings returns', async () => {
    const data: SettingsData = {
      onboarding: {
        allComplete: true,
        steps: { profileComplete: true, firstPharmacistAdded: true, formBuilt: true, firstPatientAdded: true }
      }
    };

    await saveSettings(data);
    const result = await getSettings();

    expect(result).toEqual(data);
  });
});
