import { forwardRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { deletePharmacist } from '../../api/pharmacists';
import { queryKeys } from '../../api/queryKeys';
import { BottomSheetWrapper } from '../ui';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { IPharmacist } from '../../types';

export const DELETE_SNAP = ['42%'];

interface DeletePharmacistSheetProps {
  pharmacist: IPharmacist | null;
  onClose: () => void;
  onDeleted?: (pharmacist: IPharmacist) => void;
}

export const DeletePharmacistSheet = forwardRef<BottomSheetModal, DeletePharmacistSheetProps>(({ pharmacist, onClose, onDeleted }, ref) => {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!pharmacist) return;
    setIsDeleting(true);
    try {
      await deletePharmacist(pharmacist.id);
      const current = queryClient.getQueryData<IPharmacist[]>(queryKeys.pharmacists) ?? [];
      queryClient.setQueryData(
        queryKeys.pharmacists,
        current.filter((p) => p.id !== pharmacist.id)
      );
      onDeleted?.(pharmacist);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <BottomSheetWrapper ref={ref} snapPoints={DELETE_SNAP} onClose={onClose}>
      <View style={styles.content}>
        {/* Icon circle */}
        <View style={styles.iconWrap}>
          <Trash2 size={24} color="#B4553D" />
        </View>

        {/* Title + body */}
        <View style={styles.textBlock}>
          <Text style={styles.title}>Delete Pharmacist?</Text>
          <Text style={styles.body}>
            {'This will permanently remove '}
            <Text style={styles.bodyName}>{pharmacist?.name ?? ''}</Text>
            {'. This action cannot be undone.'}
          </Text>
        </View>

        {/* Delete CTA */}
        <Pressable
          style={({ pressed }) => [styles.confirmBtn, (pressed || isDeleting) && { opacity: 0.85 }]}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? <ActivityIndicator color="#FFF8F6" size="small" /> : <Text style={styles.confirmBtnText}>Delete</Text>}
        </Pressable>

        {/* Cancel */}
        <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheetWrapper>
  );
});

DeletePharmacistSheet.displayName = 'DeletePharmacistSheet';

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 28,
    gap: 16
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FFF6F4',
    borderWidth: 1,
    borderColor: '#E6C8BF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  textBlock: {
    gap: 8,
    alignItems: 'center'
  },
  title: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 28,
    color: '#7F3322',
    textAlign: 'center'
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: '#7F3322',
    textAlign: 'center'
  },
  bodyName: {
    fontFamily: fonts.bodySemiBold,
    color: '#7F3322'
  },
  confirmBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#B4553D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B4553D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8
  },
  confirmBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#FFF8F6'
  },
  cancelBtn: {
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#D8D1C1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent
  }
});
