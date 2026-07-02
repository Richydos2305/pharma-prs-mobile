import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react-native';
import { deletePatient } from '../../api/patients';
import { queryKeys } from '../../api/queryKeys';
import { BottomSheetWrapper } from '../ui';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const DELETE_SNAP = ['44%'];

interface DeletePatientSheetProps {
  patientId: string;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeletePatientSheet = forwardRef<BottomSheetModal, DeletePatientSheetProps>(({ patientId, onClose, onDeleted }, ref) => {
  const queryClient = useQueryClient();

  async function handleDelete() {
    await deletePatient(patientId);
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    onClose();
    onDeleted();
  }

  return (
    <BottomSheetWrapper ref={ref} snapPoints={DELETE_SNAP} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Delete confirmation</Text>
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={16} color="#B4553D" />
            <Text style={styles.warningTitle}>Delete this patient?</Text>
          </View>
          <Text style={styles.warningBody}>
            This will remove the patient profile, notes, prescriptions, and any uploaded files tied to this record.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85 }]} onPress={handleDelete}>
            <Text style={styles.confirmBtnText}>Yes, Delete Patient</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheetWrapper>
  );
});

DeletePatientSheet.displayName = 'DeletePatientSheet';

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: 10
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },
  warningCard: {
    backgroundColor: '#FFF6F4',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6C8BF',
    padding: 16,
    gap: 8
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  warningTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#7F3322'
  },
  warningBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#7F3322',
    lineHeight: 18
  },
  actions: { gap: 10 },
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
  }
});
