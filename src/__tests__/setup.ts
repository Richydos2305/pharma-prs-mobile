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
