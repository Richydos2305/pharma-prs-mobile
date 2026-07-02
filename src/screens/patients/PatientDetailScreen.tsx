import { Fragment, useRef } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, FileText } from 'lucide-react-native';
import { getPatient } from '../../api/patients';
import { getSettings } from '../../api/settings';
import { queryKeys } from '../../api/queryKeys';
import { OfflineIcon, ScreenWrapper } from '../../components/layout';
import { AnimatedPressable } from '../../components/ui';
import { DeletePatientSheet } from '../../components/patients/DeletePatientSheet';
import { usePressSpring } from '../../hooks/usePressSpring';
import { useSync } from '../../contexts/SyncContext';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { buildDefaultTemplate } from '../../types/formBuilder';
import type { FieldSchema, FormSchema } from '../../types/formBuilder';
import type { IPatient, PendingFileRef } from '../../types';
import type { PatientsStackParamList } from '../../navigation/types';
import { hydrateRepeatableSectionRows, hydrateStandardSectionValues } from '../../utils/patientFormSerialization';

type Props = NativeStackScreenProps<PatientsStackParamList, 'PatientDetail'>;

function formatRelativeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    if (diffDays < 7) return `Updated ${diffDays} days ago`;
    return `Updated ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
  } catch {
    return '';
  }
}

interface FieldBoxProps {
  label: string;
  value?: string | null;
  multiline?: boolean;
}

function FieldBox({ label, value, multiline }: FieldBoxProps) {
  if (!value) return null;
  return (
    <View style={styles.fieldBox}>
      <Text style={styles.fieldBoxLabel}>{label}</Text>
      <Text style={[styles.fieldBoxValue, multiline && styles.fieldBoxValueMultiline]}>{value}</Text>
    </View>
  );
}

function getRawFileMetadataList(
  patient: IPatient,
  sectionId: string,
  fieldId: string,
  rowIndex = 0
): Array<{ name?: string; url?: string; localPath?: string }> {
  const section = patient.customFields?.sections?.find((s) => s.name === sectionId);
  const row = section?.fields?.[rowIndex];
  if (!row) return [];
  const val = row[fieldId];
  if (val == null) return [];
  if (typeof val === 'string') {
    return val ? [{ name: val.split('/').pop() }] : [];
  }
  if (typeof val !== 'object') return [];
  const items = Array.isArray(val)
    ? (val as Array<{ name?: string; url?: string } | PendingFileRef>)
    : [val as { name?: string; url?: string } | PendingFileRef];
  return items.filter(Boolean).map((item) => {
    if ('pending' in item && item.pending === true) {
      return { name: (item as PendingFileRef).name, localPath: (item as PendingFileRef).localPath };
    }
    return item as { name?: string; url?: string };
  });
}

interface FileFieldBoxProps {
  label: string;
  name: string | null;
  url?: string;
  localPath?: string;
}

function FileFieldBox({ label, name, url, localPath }: FileFieldBoxProps) {
  if (!name && !url && !localPath) return null;
  const displayName = name || 'Attached file';
  const isPending = !url && !!localPath;
  const isInteractive = !!url || isPending;
  return (
    <Pressable
      style={({ pressed }) => [styles.fieldBox, pressed && isInteractive ? { opacity: 0.75 } : null]}
      onPress={() => {
        const target = url ?? localPath;
        if (target) void Linking.openURL(target).catch(() => undefined);
      }}
      disabled={!isInteractive}
    >
      <Text style={styles.fieldBoxLabel}>{label}</Text>
      <View style={styles.fileRow}>
        <FileText size={14} color={isPending ? colors.textMuted : colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldBoxValue, url ? styles.fieldBoxValueLink : null]} numberOfLines={1}>
            {displayName}
          </Text>
          {isPending && <Text style={styles.filePendingLabel}>Upload pending</Text>}
        </View>
      </View>
    </Pressable>
  );
}

export function PatientDetailScreen({ route, navigation }: Props) {
  const { patientId } = route.params;
  const deleteSheetRef = useRef<BottomSheetModal>(null);

  const { isOnline } = useSync();
  const { animatedStyle: backBtnStyle, onPressIn: backPressIn, onPressOut: backPressOut } = usePressSpring(0.96);
  const { animatedStyle: editBtnStyle, onPressIn: editPressIn, onPressOut: editPressOut } = usePressSpring();
  const { animatedStyle: deleteBtnStyle, onPressIn: deletePressIn, onPressOut: deletePressOut } = usePressSpring();

  const { data: patient, isLoading } = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => getPatient(patientId)
  });

  const { data: settings } = useQuery({ queryKey: queryKeys.settings, queryFn: getSettings });

  if (isLoading || !patient) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingPlaceholder} />
      </ScreenWrapper>
    );
  }

  const schema: FormSchema = patient.formSnapshot
    ? (patient.formSnapshot as unknown as FormSchema)
    : (settings?.formConfig?.schema ?? buildDefaultTemplate());
  const updatedMeta = formatRelativeDate(patient.updatedAt);

  function renderField(field: FieldSchema, sectionId: string, hydratedValue: string, rowIndex?: number) {
    if (field.type === 'file') {
      const metas = getRawFileMetadataList(patient!, sectionId, field.id, rowIndex ?? 0);
      if (metas.length === 0) {
        if (!hydratedValue) return null;
        return <FileFieldBox key={field.id} label={field.label} name={hydratedValue} />;
      }
      return (
        <Fragment key={field.id}>
          {metas.map((meta, i) => (
            <FileFieldBox
              key={`${field.id}-${i}`}
              label={i === 0 ? field.label : ''}
              name={meta.name ?? null}
              url={meta.url}
              localPath={meta.localPath}
            />
          ))}
        </Fragment>
      );
    }
    return <FieldBox key={field.id} label={field.label} value={hydratedValue} multiline={field.type === 'textarea'} />;
  }

  return (
    <ScreenWrapper hasTabBar>
      {/* Nav bar — not animated, always visible */}
      <View style={styles.navBar}>
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          onPressIn={backPressIn}
          onPressOut={backPressOut}
          style={[styles.backBtn, backBtnStyle]}
        >
          <ChevronLeft size={16} color={colors.accent} />
          <Text style={styles.backText}>Patients</Text>
        </AnimatedPressable>
        {isOnline ? <Text style={styles.navMeta}>{updatedMeta}</Text> : <OfflineIcon />}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Schema-driven sections */}
        {schema.sections.map((section, index) => {
          const entering = FadeInDown.duration(380)
            .delay(index * 130)
            .reduceMotion(ReduceMotion.System);

          if (section.type === 'repeatable') {
            const rows = hydrateRepeatableSectionRows(section, patient);
            if (rows.length === 0) return null;
            const rowLabel = section.rowLabel ?? 'Item';

            return (
              <Animated.View key={section.id} entering={entering}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.name}</Text>
                  {rows.map((row, rowIndex) => (
                    <View key={rowIndex} style={[styles.repeatableRow, rowIndex > 0 && styles.repeatableRowDivider]}>
                      <Text style={styles.repeatableRowLabel}>
                        {rowLabel} {rowIndex + 1}
                      </Text>
                      {section.fields.map((field) => renderField(field, section.id, row[field.id], rowIndex))}
                    </View>
                  ))}
                </View>
              </Animated.View>
            );
          }

          const fieldValues = hydrateStandardSectionValues(section, patient);

          return (
            <Animated.View key={section.id} entering={entering}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{section.name}</Text>
                {section.fields.map((field) => renderField(field, section.id, fieldValues[field.id]))}
              </View>
            </Animated.View>
          );
        })}

        {/* Actions */}
        <Animated.View entering={FadeInDown.duration(380).delay(460).reduceMotion(ReduceMotion.System)}>
          <View style={styles.actionsSection}>
            <Text style={styles.actionsLabel}>Actions</Text>
            <AnimatedPressable
              onPress={() => navigation.navigate('PatientEdit', { patientId })}
              onPressIn={editPressIn}
              onPressOut={editPressOut}
              style={[styles.editBtn, editBtnStyle]}
            >
              <Text style={styles.editBtnText}>Edit Patient</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => deleteSheetRef.current?.present()}
              onPressIn={deletePressIn}
              onPressOut={deletePressOut}
              style={[styles.deleteBtn, deleteBtnStyle]}
            >
              <Text style={styles.deleteBtnText}>Delete Patient</Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </ScrollView>

      <DeletePatientSheet
        ref={deleteSheetRef}
        patientId={patientId}
        onClose={() => deleteSheetRef.current?.dismiss()}
        onDeleted={() => navigation.goBack()}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingPlaceholder: { flex: 1 },
  // Nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F1E8',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
    borderColor: '#D8D1C1'
  },
  backText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accent
  },
  navMeta: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: 14
  },
  // Section card
  section: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md
  },
  sectionTitle: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 20,
    color: colors.text
  },
  // Repeatable section row group (e.g. "Visit 1")
  repeatableRow: {
    gap: spacing.md
  },
  repeatableRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md
  },
  repeatableRowLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent
  },
  // Field box (input-style)
  fieldBox: {
    backgroundColor: colors.inputFill,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6C7',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4
  },
  fieldBoxLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },
  fieldBoxValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text
  },
  fieldBoxValueMultiline: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 19,
    color: colors.text
  },
  fieldBoxValueLink: {
    color: colors.accent
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  filePendingLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  // Actions section
  actionsSection: {
    gap: 10
  },
  actionsLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },
  editBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4
  },
  editBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.background
  },
  deleteBtn: {
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFF6F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6C8BF'
  },
  deleteBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#B4553D'
  }
});
