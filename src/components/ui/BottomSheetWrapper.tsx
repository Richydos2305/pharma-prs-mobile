import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo } from 'react';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { colors } from '../../theme/colors';

interface BottomSheetWrapperProps {
  snapPoints: (string | number)[];
  children: React.ReactNode;
  onClose?: () => void;
  /** Pass false when the sheet contains its own gesture handlers (e.g. draggable lists)
   *  so the sheet's pan handler doesn't compete with them. Defaults to true. */
  enableContentPanningGesture?: boolean;
}

export const BottomSheetWrapper = forwardRef<BottomSheetModal, BottomSheetWrapperProps>(
  ({ snapPoints, children, enableContentPanningGesture = true }, ref) => {
    const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          // No onPress — BottomSheetModal dismisses on backdrop tap natively
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={memoizedSnapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        enableContentPanningGesture={enableContentPanningGesture}
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetStyles.background}
        handleIndicatorStyle={sheetStyles.handle}
        // No onDismiss — avoids the re-entrant dismiss() loop that breaks re-opening
      >
        <BottomSheetView style={sheetStyles.content}>{children}</BottomSheetView>
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
