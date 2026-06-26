import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo } from 'react';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { View } from 'react-native';
import { colors } from '../../theme/colors';

interface BottomSheetWrapperProps {
  snapPoints?: (string | number)[];
  enableDynamicSizing?: boolean;
  bottomInset?: number;
  children: React.ReactNode;
  onClose?: () => void;
  enableContentPanningGesture?: boolean;
}

export const BottomSheetWrapper = forwardRef<BottomSheetModal, BottomSheetWrapperProps>(
  ({ snapPoints, enableDynamicSizing = false, bottomInset, children, enableContentPanningGesture = true }, ref) => {
    const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={memoizedSnapPoints}
        enableDynamicSizing={enableDynamicSizing}
        bottomInset={bottomInset}
        enablePanDownToClose
        enableContentPanningGesture={enableContentPanningGesture}
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetStyles.background}
        handleIndicatorStyle={sheetStyles.handle}
      >
        {enableDynamicSizing ? <BottomSheetView>{children}</BottomSheetView> : <View style={sheetStyles.content}>{children}</View>}
      </BottomSheetModal>
    );
  }
);

BottomSheetWrapper.displayName = 'BottomSheetWrapper';

const sheetStyles = {
  background: { backgroundColor: colors.card },
  handle: { backgroundColor: colors.border },
  content: { flex: 1 as const }
};
