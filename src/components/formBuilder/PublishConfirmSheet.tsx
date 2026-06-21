import { forwardRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck } from 'lucide-react-native';
import { publishFormSchema } from '../../api/settings';
import type { SettingsData } from '../../api/settings';
import { queryKeys } from '../../api/queryKeys';
import { BottomSheetWrapper, Button } from '../ui';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { FormSchema } from '../../types/formBuilder';

export const PUBLISH_CONFIRM_SNAP = ['40%'];

interface PublishConfirmSheetProps {
  schema: FormSchema;
  hasExisting: boolean;
  onPublished: () => void;
  onClose: () => void;
}

export const PublishConfirmSheet = forwardRef<BottomSheetModal, PublishConfirmSheetProps>(({ schema, hasExisting, onPublished, onClose }, ref) => {
  const queryClient = useQueryClient();
  const [isPublishing, setIsPublishing] = useState(false);

  async function handlePublish() {
    setIsPublishing(true);
    try {
      const published: FormSchema = { ...schema, status: 'published' };
      await publishFormSchema(published);
      // Write the published schema straight into the cache so PatientNewScreen
      // sees it immediately on mount — don't rely on an async refetch that
      // could lose the race against navigation.
      queryClient.setQueryData<SettingsData | null>(queryKeys.settings, (old) => ({ ...old, formConfig: { schema: published } }));
      onPublished();
      onClose();
    } catch {
      Alert.alert('Publish failed', 'Your form could not be saved. Please check your connection and try again.');
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <BottomSheetWrapper ref={ref} snapPoints={PUBLISH_CONFIRM_SNAP} onClose={onClose}>
      {/* Body — centred icon + text */}
      <View style={styles.body}>
        <View style={styles.iconBadge}>
          <CircleCheck size={28} color={colors.success} />
        </View>
        <Text style={styles.title}>Publish Form?</Text>
        <Text style={styles.bodyText}>This will make your form live for patient intake. You can update it at any time.</Text>
        {hasExisting && <Text style={styles.warning}>This will replace your previously published form.</Text>}
      </View>

      {/* Buttons — full-width, no alignItems: center */}
      <View style={styles.buttonsArea}>
        <Button title="Publish" onPress={handlePublish} loading={isPublishing} disabled={isPublishing} />
        <Pressable onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheetWrapper>
  );
});

PublishConfirmSheet.displayName = 'PublishConfirmSheet';

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 4,
    gap: 12
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs
  },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 22, color: colors.text, textAlign: 'center' },
  bodyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  warning: { ...typography.caption, color: colors.textLight, textAlign: 'center' },
  buttonsArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10
  },
  cancelBtn: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textSecondary }
});
