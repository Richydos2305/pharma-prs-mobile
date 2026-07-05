jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('expo-font', () => ({
  useFonts: jest.fn().mockReturnValue([true, null])
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  MediaTypeOptions: { Images: 'Images' }
}));

jest.mock('react-native-draggable-flatlist', () => {
  const { FlatList } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      data,
      keyExtractor,
      renderItem,
      ListEmptyComponent,
      ...rest
    }: {
      data: unknown[];
      keyExtractor: (item: unknown, index: number) => string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderItem: (params: any) => React.ReactElement;
      ListEmptyComponent?: React.ReactElement;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    }) =>
      jest.requireActual('react').createElement(FlatList, {
        ...rest,
        data,
        keyExtractor,
        ListEmptyComponent,
        renderItem: ({ item, index }: { item: unknown; index: number }) =>
          renderItem({ item, index, getIndex: () => index, drag: () => {}, isActive: false })
      })
  };
});

jest.mock('@gorhom/bottom-sheet', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
  BottomSheetBackdrop: () => null,
  BottomSheetView: ({ children }: { children: React.ReactNode }) => children,
  BottomSheetScrollView: jest.requireActual('react-native').ScrollView,
  BottomSheetTextInput: jest.requireActual('react-native').TextInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BottomSheetModal: jest.fn(({ children }: { children: React.ReactNode }) => children) as any
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: jest.fn(() => true)
}));

jest.mock('../contexts/SyncContext', () => ({
  useSync: jest.fn(() => ({ isOnline: true, isSyncing: false, isOfflineIconVisible: false, pendingCount: 0, lastSyncedAt: null })),
  SyncProvider: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock('../contexts/ToastContext', () => ({
  useToast: jest.fn(() => ({ showToast: jest.fn() })),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user-id', fullName: 'Test User', email: 'test@test.com' },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn()
  }))
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 0, changes: 1 }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    withTransactionAsync: jest.fn().mockImplementation((fn: () => Promise<void>) => fn())
  })
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addNetworkStateListener: jest.fn().mockReturnValue({ remove: jest.fn() })
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock-dir/',
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('react-native-keyboard-controller', () => jest.requireActual('react-native-keyboard-controller/jest'));
