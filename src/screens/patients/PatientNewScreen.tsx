import { useCallback, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { TextInputProps } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { CalendarDays, Check, ChevronDown, ChevronLeft, Upload, X } from 'lucide-react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { createPatient, updatePatient, uploadPatientDocument } from '../../api/patients';
import { getApiErrorMessage } from '../../utils/apiError';
import { getSettings } from '../../api/settings';
import { queryKeys } from '../../api/queryKeys';
import { usePharmacists } from '../../hooks/usePharmacists';
import Animated from 'react-native-reanimated';
import { BottomSheetWrapper, Button, SuccessCheck } from '../../components/ui';
import { useShakeAnimation } from '../../hooks/useShakeAnimation';
import { useStaggerFadeIn } from '../../hooks/useStaggerFadeIn';
import { KeyboardAvoidingWrapper, OfflineIcon, ScreenWrapper } from '../../components/layout';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../contexts/SyncContext';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { buildDefaultTemplate } from '../../types/formBuilder';
import type { FormSchema, FieldSchema, SectionSchema } from '../../types/formBuilder';
import * as FileSystem from 'expo-file-system/legacy';
import * as syncQueue from '../../services/syncQueue';
import { generateLocalId } from '../../services/localId';
import type { CreatePatientPayload, IPatient, PendingFileRef } from '../../types';
import type { AppTabParamList } from '../../navigation/types';
import { buildCustomFieldsSections, hasAttendedByValue } from '../../utils/patientFormSerialization';
import { formatDateForDisplay } from '../../utils/getLastAppointmentDate';
import type { MobileFileFieldState, MobilePendingFile } from '../../utils/patientFormSerialization';

type Props = BottomTabScreenProps<AppTabParamList, 'PlusTab'>;

const PHARMACIST_SNAP = ['65%'];
const DROPDOWN_SNAP = ['60%'];

// ── NewFieldBox — label + TextInput inside a single box ───────────────────────

interface NewFieldBoxProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  error?: string;
  placeholder?: string;
}

function NewFieldBox({ label, value, onChangeText, multiline, keyboardType, error, placeholder }: NewFieldBoxProps) {
  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.fieldBox, multiline && styles.fieldBoxMulti, error ? styles.fieldBoxError : null]}>
        <Text style={styles.fieldBoxLabel}>{label}</Text>
        <TextInput
          style={[styles.fieldBoxInput, multiline && styles.fieldBoxInputMulti]}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          textAlignVertical={multiline ? 'top' : 'auto'}
          scrollEnabled={false}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ── PatientNewScreen ──────────────────────────────────────────────────────────

export function PatientNewScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useSync();

  // Re-fetch settings every time this screen gains focus so the published
  // schema is always current (handles both fresh mounts and returning to screen).
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    }, [queryClient])
  );

  // Reset all form state on every focus so the form always starts fresh.
  useFocusEffect(
    useCallback(() => {
      setValues({});
      setErrors({});
      setStandardFileState({});
      setRepeatableFileState({});
      setRepeatableRows({});
      setSaving(false);
      setShowSuccess(false);
      setDatePickerCtx(null);
      setActiveDropdownField(null);
      setActiveRelationFieldId(null);
      setRepeatableDropdownCtx(null);
      setRepeatableRelationCtx(null);
      activeRelationFieldIdRef.current = null;
      repeatableRelationCtxRef.current = null;
    }, [])
  );

  const pharmacistSheetRef = useRef<BottomSheetModal>(null);
  const dropdownSheetRef = useRef<BottomSheetModal>(null);

  // Track which field opened the dropdown/pharmacist picker so we know where
  // to write the selected value — handles both standard and repeatable contexts.
  const [activeDropdownField, setActiveDropdownField] = useState<FieldSchema | null>(null);
  const [activeRelationFieldId, setActiveRelationFieldId] = useState<string | null>(null);

  // When a picker is opened from inside a repeatable row, store the row context
  // so the selection is written into the correct row instead of global values.
  const [repeatableDropdownCtx, setRepeatableDropdownCtx] = useState<{
    sectionId: string;
    rowIndex: number;
  } | null>(null);
  const [repeatableRelationCtx, setRepeatableRelationCtx] = useState<{
    sectionId: string;
    rowIndex: number;
    fieldId: string;
  } | null>(null);

  // Refs mirror the two relation-picker context variables so that the onPress
  // callbacks inside the BottomSheetModal portal always read the *latest* value
  // rather than the value captured by a potentially-stale closure.
  const activeRelationFieldIdRef = useRef<string | null>(null);
  const repeatableRelationCtxRef = useRef<{ sectionId: string; rowIndex: number; fieldId: string } | null>(null);

  // Date picker context — tracks which field opened the picker.
  // sectionId + rowIndex are set only for repeatable rows.
  const [datePickerCtx, setDatePickerCtx] = useState<{
    fieldId: string;
    sectionId?: string;
    rowIndex?: number;
    date: Date;
  } | null>(null);

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const { animatedStyle: shakeStyle, shake } = useShakeAnimation();
  const anims = useStaggerFadeIn(6);

  // File state — tracked separately from text values so we can upload on save.
  const [standardFileState, setStandardFileState] = useState<Record<string, MobileFileFieldState>>({});
  const [repeatableFileState, setRepeatableFileState] = useState<Record<string, Array<Record<string, MobileFileFieldState>>>>({});

  // Generic repeatable rows keyed by section ID.
  const [repeatableRows, setRepeatableRows] = useState<Record<string, Array<Record<string, string>>>>({});

  const { data: settings } = useQuery({ queryKey: queryKeys.settings, queryFn: getSettings });
  const { data: pharmacists } = usePharmacists();

  const schema: FormSchema = settings?.formConfig?.schema ?? buildDefaultTemplate();

  // ── Standard field state helpers ────────────────────────────────────────────

  function setValue(fieldId: string, val: string) {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
    if (errors[fieldId]) setErrors((prev) => ({ ...prev, [fieldId]: '' }));
  }

  // ── Repeatable row helpers ───────────────────────────────────────────────────

  function addRow(sectionId: string) {
    setRepeatableRows((prev) => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] ?? []), {}]
    }));
    const section = schema.sections.find((s) => s.id === sectionId);
    if (section?.type === 'repeatable') {
      const fileFields = section.fields.filter((f) => f.type === 'file');
      if (fileFields.length > 0) {
        const newRowState: Record<string, MobileFileFieldState> = {};
        for (const field of fileFields) {
          newRowState[field.id] = { existing: [], pending: [] };
        }
        setRepeatableFileState((prev) => ({
          ...prev,
          [sectionId]: [...(prev[sectionId] ?? []), newRowState]
        }));
      }
    }
  }

  function removeRow(sectionId: string, rowIndex: number) {
    setRepeatableRows((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).filter((_, i) => i !== rowIndex)
    }));
    setRepeatableFileState((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).filter((_, i) => i !== rowIndex)
    }));
  }

  function setRowValue(sectionId: string, rowIndex: number, fieldId: string, val: string) {
    setRepeatableRows((prev) => {
      const rows = [...(prev[sectionId] ?? [])];
      rows[rowIndex] = { ...rows[rowIndex], [fieldId]: val };
      return { ...prev, [sectionId]: rows };
    });
  }

  // ── Date picker helpers ──────────────────────────────────────────────────────

  function writeDateValue(formatted: string) {
    const ctx = datePickerCtx;
    if (!ctx) return;
    if (ctx.sectionId !== undefined && ctx.rowIndex !== undefined) {
      setRowValue(ctx.sectionId, ctx.rowIndex, ctx.fieldId, formatted);
    } else {
      setValue(ctx.fieldId, formatted);
    }
  }

  // ── File picker helpers ──────────────────────────────────────────────────────

  const MAX_FILE_BYTES = 10 * 1024 * 1024;

  async function handlePickFile(fieldId: string) {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true });
      if (result.canceled) return;
      const rejected = result.assets.filter((a) => a.size && a.size > MAX_FILE_BYTES);
      const valid = result.assets.filter((a) => !a.size || a.size <= MAX_FILE_BYTES);
      if (rejected.length > 0) {
        Alert.alert('Files too large', `The following file(s) exceed 10 MB and were skipped:\n${rejected.map((a) => `• ${a.name}`).join('\n')}`);
      }
      if (valid.length === 0) return;
      const newPending: MobilePendingFile[] = valid.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? undefined, name: a.name }));
      setStandardFileState((prev) => ({
        ...prev,
        [fieldId]: { existing: [], pending: [...(prev[fieldId]?.pending ?? []), ...newPending] }
      }));
    } catch {
      Alert.alert('File error', 'Could not open the file picker. Please try again.');
    }
  }

  async function handlePickFileForRow(sectionId: string, rowIndex: number, fieldId: string) {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true });
      if (result.canceled) return;
      const rejected = result.assets.filter((a) => a.size && a.size > MAX_FILE_BYTES);
      const valid = result.assets.filter((a) => !a.size || a.size <= MAX_FILE_BYTES);
      if (rejected.length > 0) {
        Alert.alert('Files too large', `The following file(s) exceed 10 MB and were skipped:\n${rejected.map((a) => `• ${a.name}`).join('\n')}`);
      }
      if (valid.length === 0) return;
      const newPending: MobilePendingFile[] = valid.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? undefined, name: a.name }));
      setRepeatableFileState((prev) => {
        const rows = [...(prev[sectionId] ?? [])];
        rows[rowIndex] = {
          ...(rows[rowIndex] ?? {}),
          [fieldId]: { existing: [], pending: [...(rows[rowIndex]?.[fieldId]?.pending ?? []), ...newPending] }
        };
        return { ...prev, [sectionId]: rows };
      });
    } catch {
      Alert.alert('File error', 'Could not open the file picker. Please try again.');
    }
  }

  function handleRemovePendingFile(fieldId: string, index: number) {
    setStandardFileState((prev) => ({
      ...prev,
      [fieldId]: { existing: [], pending: (prev[fieldId]?.pending ?? []).filter((_, i) => i !== index) }
    }));
  }

  function handleRemovePendingFileForRow(sectionId: string, rowIndex: number, fieldId: string, index: number) {
    setRepeatableFileState((prev) => {
      const rows = [...(prev[sectionId] ?? [])];
      const current = rows[rowIndex]?.[fieldId];
      rows[rowIndex] = {
        ...(rows[rowIndex] ?? {}),
        [fieldId]: { existing: [], pending: (current?.pending ?? []).filter((_, i) => i !== index) }
      };
      return { ...prev, [sectionId]: rows };
    });
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    schema.sections.forEach((section) => {
      if (section.type === 'repeatable') return;
      section.fields.forEach((field) => {
        if (field.required && !values[field.id]?.trim()) {
          newErrors[field.id] = `${field.label} is required`;
        }
      });
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── File helpers ─────────────────────────────────────────────────────────────

  function hasAnyPendingFiles(): boolean {
    if (Object.values(standardFileState).some((s) => s.pending.length > 0)) return true;
    return Object.values(repeatableFileState).some((rows) => rows.some((row) => Object.values(row).some((s) => s.pending.length > 0)));
  }

  // Online: upload pending files and overlay returned URLs into base sections.
  async function buildSectionsWithFileUploads(
    patientId: string,
    baseSections: ReturnType<typeof buildCustomFieldsSections>
  ): Promise<ReturnType<typeof buildCustomFieldsSections>> {
    return Promise.all(
      baseSections.map(async (section) => {
        const schemaSection = schema.sections.find((s) => s.id === section.name);
        if (!schemaSection) return section;
        const fileFields = schemaSection.fields.filter((f) => f.type === 'file');
        if (fileFields.length === 0) return section;

        if (schemaSection.type === 'standard') {
          const fieldsRow: Record<string, unknown> = { ...(section.fields[0] ?? {}) };
          for (const field of fileFields) {
            const fState = standardFileState[field.id] ?? { existing: [], pending: [] };
            const uploaded = await Promise.all(fState.pending.map((f) => uploadPatientDocument(patientId, f)));
            fieldsRow[field.id] = [...fState.existing, ...uploaded];
          }
          return { name: section.name, fields: [fieldsRow] };
        }

        const rowFileStates = repeatableFileState[section.name] ?? [];
        const fields = await Promise.all(
          section.fields.map(async (rowData, idx) => {
            const rowFState = rowFileStates[idx] ?? {};
            const merged: Record<string, unknown> = { ...rowData };
            for (const field of fileFields) {
              const fstate = rowFState[field.id] ?? { existing: [], pending: [] };
              const uploaded = await Promise.all(fstate.pending.map((f) => uploadPatientDocument(patientId, f)));
              merged[field.id] = [...fstate.existing, ...uploaded];
            }
            return merged;
          })
        );
        return { name: section.name, fields };
      })
    );
  }

  // Offline: copy pending files locally and overlay PendingFileRef placeholders.
  async function buildSectionsWithPlaceholders(baseSections: ReturnType<typeof buildCustomFieldsSections>): Promise<{
    sections: ReturnType<typeof buildCustomFieldsSections>;
    fileQueue: Array<{ localPath: string; fileName: string; mimeType: string }>;
  }> {
    const fileQueue: Array<{ localPath: string; fileName: string; mimeType: string }> = [];
    const dir = `${FileSystem.documentDirectory ?? ''}pending-uploads/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const sections = await Promise.all(
      baseSections.map(async (section) => {
        const schemaSection = schema.sections.find((s) => s.id === section.name);
        if (!schemaSection) return section;
        const fileFields = schemaSection.fields.filter((f) => f.type === 'file');
        if (fileFields.length === 0) return section;

        if (schemaSection.type === 'standard') {
          const fieldsRow: Record<string, unknown> = { ...(section.fields[0] ?? {}) };
          for (const field of fileFields) {
            const fState = standardFileState[field.id] ?? { existing: [], pending: [] };
            const pendingRefs: PendingFileRef[] = [];
            for (const f of fState.pending) {
              const localPath = `${dir}${generateLocalId()}_${f.name}`;
              await FileSystem.copyAsync({ from: f.uri, to: localPath });
              pendingRefs.push({ name: f.name, localPath, pending: true });
              fileQueue.push({ localPath, fileName: f.name, mimeType: f.mimeType ?? 'application/octet-stream' });
            }
            fieldsRow[field.id] = [...fState.existing, ...pendingRefs];
          }
          return { name: section.name, fields: [fieldsRow] };
        }

        const rowFileStates = repeatableFileState[section.name] ?? [];
        const fields = await Promise.all(
          section.fields.map(async (rowData, idx) => {
            const rowFState = rowFileStates[idx] ?? {};
            const merged: Record<string, unknown> = { ...rowData };
            for (const field of fileFields) {
              const fstate = rowFState[field.id] ?? { existing: [], pending: [] };
              const pendingRefs: PendingFileRef[] = [];
              for (const f of fstate.pending) {
                const localPath = `${dir}${generateLocalId()}_${f.name}`;
                await FileSystem.copyAsync({ from: f.uri, to: localPath });
                pendingRefs.push({ name: f.name, localPath, pending: true });
                fileQueue.push({ localPath, fileName: f.name, mimeType: f.mimeType ?? 'application/octet-stream' });
              }
              merged[field.id] = [...fstate.existing, ...pendingRefs];
            }
            return merged;
          })
        );
        return { name: section.name, fields };
      })
    );

    return { sections, fileQueue };
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validate()) {
      shake();
      return;
    }

    if (!hasAttendedByValue(schema, values, repeatableRows)) {
      Alert.alert('Missing field', 'Please select an "Attended by" pharmacist before saving.');
      return;
    }

    setSaving(true);
    try {
      const baseSections = buildCustomFieldsSections(schema, values, repeatableRows);
      const basePayload: CreatePatientPayload = {
        fullName: values['core-full-name'] ?? '',
        age: parseInt(values['core-age'] ?? '0', 10),
        phoneNumber: values['core-phone-number'] ?? '',
        customFields: { sections: baseSections }
      };
      const hasPending = hasAnyPendingFiles();

      let patient: IPatient;

      if (isOnline) {
        patient = await createPatient(basePayload, user?.id ?? '');
        if (hasPending) {
          const sectionsWithFiles = await buildSectionsWithFileUploads(patient.id, baseSections);
          await updatePatient(patient.id, { customFields: { sections: sectionsWithFiles } });
        }
      } else if (hasPending) {
        const { sections, fileQueue } = await buildSectionsWithPlaceholders(baseSections);
        patient = await createPatient({ ...basePayload, customFields: { sections } }, user?.id ?? '');
        for (const qEntry of fileQueue) {
          await syncQueue.enqueue({ operationType: 'UPLOAD_FILE', entityId: patient.id, payload: { ...qEntry, localPatientId: patient.id } });
        }
      } else {
        patient = await createPatient(basePayload, user?.id ?? '');
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.navigate('Patients', { screen: 'PatientDetail', params: { patientId: patient.id } });
      }, 700);
    } catch (err) {
      setSaving(false);
      Alert.alert('Could not save patient', getApiErrorMessage(err));
    }
  }

  // ── Standard section field renderer ─────────────────────────────────────────

  function renderField(field: FieldSchema) {
    // Relation — pharmacist picker
    if (field.type === 'relation') {
      const selectedName = values[field.id] ?? '';
      return (
        <View key={field.id} style={styles.fieldWrap}>
          <Pressable
            style={[styles.fieldBox, styles.fieldBoxSelect, errors[field.id] ? styles.fieldBoxError : null]}
            onPress={() => {
              activeRelationFieldIdRef.current = field.id;
              repeatableRelationCtxRef.current = null;
              setActiveRelationFieldId(field.id);
              setRepeatableRelationCtx(null);
              pharmacistSheetRef.current?.present();
            }}
          >
            <View style={styles.fieldBoxSelectLeft}>
              <Text style={styles.fieldBoxLabel}>
                {field.label}
                {field.required ? ' *' : ''}
              </Text>
              <Text style={[styles.fieldBoxInput, !selectedName && styles.fieldBoxInputPlaceholder]}>{selectedName || 'Select pharmacist...'}</Text>
            </View>
            <ChevronDown size={16} color={colors.textMuted} />
          </Pressable>
          {errors[field.id] ? <Text style={styles.errorText}>{errors[field.id]}</Text> : null}
        </View>
      );
    }

    // Dropdown — tappable select
    if (field.type === 'dropdown') {
      const selectedVal = values[field.id] ?? '';
      return (
        <View key={field.id} style={styles.fieldWrap}>
          <Pressable
            style={[styles.fieldBox, styles.fieldBoxSelect, errors[field.id] ? styles.fieldBoxError : null]}
            onPress={() => {
              setActiveDropdownField(field);
              setRepeatableDropdownCtx(null);
              dropdownSheetRef.current?.present();
            }}
          >
            <View style={styles.fieldBoxSelectLeft}>
              <Text style={styles.fieldBoxLabel}>
                {field.label}
                {field.required ? ' *' : ''}
              </Text>
              <Text style={[styles.fieldBoxInput, !selectedVal && styles.fieldBoxInputPlaceholder]}>
                {selectedVal || field.placeholder || 'Select...'}
              </Text>
            </View>
            <ChevronDown size={16} color={colors.textMuted} />
          </Pressable>
          {errors[field.id] ? <Text style={styles.errorText}>{errors[field.id]}</Text> : null}
        </View>
      );
    }

    // Date — native calendar picker
    if (field.type === 'date') {
      const selectedDate = values[field.id] ?? '';
      return (
        <View key={field.id} style={styles.fieldWrap}>
          <Pressable
            style={[styles.fieldBox, styles.fieldBoxSelect, errors[field.id] ? styles.fieldBoxError : null]}
            onPress={() => setDatePickerCtx({ fieldId: field.id, date: new Date() })}
          >
            <View style={styles.fieldBoxSelectLeft}>
              <Text style={styles.fieldBoxLabel}>
                {field.label}
                {field.required ? ' *' : ''}
              </Text>
              <Text style={[styles.fieldBoxInput, !selectedDate && styles.fieldBoxInputPlaceholder]}>
                {selectedDate ? formatDateForDisplay(selectedDate) : 'Select date...'}
              </Text>
            </View>
            <CalendarDays size={16} color={colors.textMuted} />
          </Pressable>
          {errors[field.id] ? <Text style={styles.errorText}>{errors[field.id]}</Text> : null}
        </View>
      );
    }

    // File — document / image picker (multi-file)
    if (field.type === 'file') {
      const pendingFiles = standardFileState[field.id]?.pending ?? [];
      const hasAny = pendingFiles.length > 0;
      return (
        <View key={field.id} style={{ gap: 6 }}>
          <Text style={styles.fieldBoxLabel}>
            {field.label}
            {field.required ? ' *' : ''}
          </Text>
          {pendingFiles.map((f, i) => (
            <View key={`pend-${i}`} style={styles.fileChipRow}>
              <Text style={styles.fileChipName} numberOfLines={1}>
                {f.name}
              </Text>
              <Pressable onPress={() => handleRemovePendingFile(field.id, i)} hitSlop={8}>
                <X size={14} color={colors.accent} />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.fileField} onPress={() => handlePickFile(field.id)}>
            <View style={styles.fileFieldLeft}>
              <Text style={[styles.fieldBoxInput, !hasAny && styles.fieldBoxInputPlaceholder]}>{hasAny ? 'Add more files' : 'Add files'}</Text>
            </View>
            <Upload size={16} color={hasAny ? colors.accent : colors.textMuted} />
          </Pressable>
        </View>
      );
    }

    // All others — editable field box
    return (
      <NewFieldBox
        key={field.id}
        label={`${field.label}${field.required ? ' *' : ''}`}
        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
        value={values[field.id] ?? ''}
        onChangeText={(v) => setValue(field.id, v)}
        error={errors[field.id]}
        multiline={field.type === 'textarea'}
        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
      />
    );
  }

  // ── Repeatable row field renderer ────────────────────────────────────────────
  // sectionId + rowIndex are required so pickers know where to write back.

  function renderRepeatableField(
    field: FieldSchema,
    rowValues: Record<string, string>,
    onChangeField: (fieldId: string, val: string) => void,
    sectionId: string,
    rowIndex: number
  ) {
    // Relation — pharmacist picker with repeatable context
    if (field.type === 'relation') {
      const selectedName = rowValues[field.id] ?? '';
      return (
        <View key={field.id} style={styles.fieldWrap}>
          <Pressable
            style={[styles.fieldBox, styles.fieldBoxSelect]}
            onPress={() => {
              repeatableRelationCtxRef.current = { sectionId, rowIndex, fieldId: field.id };
              activeRelationFieldIdRef.current = null;
              setRepeatableRelationCtx({ sectionId, rowIndex, fieldId: field.id });
              setActiveRelationFieldId(null);
              pharmacistSheetRef.current?.present();
            }}
          >
            <View style={styles.fieldBoxSelectLeft}>
              <Text style={styles.fieldBoxLabel}>{field.label}</Text>
              <Text style={[styles.fieldBoxInput, !selectedName && styles.fieldBoxInputPlaceholder]}>{selectedName || 'Select pharmacist...'}</Text>
            </View>
            <ChevronDown size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      );
    }

    // Dropdown — picker sheet with repeatable context
    if (field.type === 'dropdown') {
      const selectedVal = rowValues[field.id] ?? '';
      return (
        <View key={field.id} style={styles.fieldWrap}>
          <Pressable
            style={[styles.fieldBox, styles.fieldBoxSelect]}
            onPress={() => {
              setActiveDropdownField(field);
              setRepeatableDropdownCtx({ sectionId, rowIndex });
              dropdownSheetRef.current?.present();
            }}
          >
            <View style={styles.fieldBoxSelectLeft}>
              <Text style={styles.fieldBoxLabel}>{field.label}</Text>
              <Text style={[styles.fieldBoxInput, !selectedVal && styles.fieldBoxInputPlaceholder]}>
                {selectedVal || field.placeholder || 'Select...'}
              </Text>
            </View>
            <ChevronDown size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      );
    }

    // Date — native calendar picker with repeatable context
    if (field.type === 'date') {
      const selectedDate = rowValues[field.id] ?? '';
      return (
        <View key={field.id} style={styles.fieldWrap}>
          <Pressable
            style={[styles.fieldBox, styles.fieldBoxSelect]}
            onPress={() => setDatePickerCtx({ fieldId: field.id, sectionId, rowIndex, date: new Date() })}
          >
            <View style={styles.fieldBoxSelectLeft}>
              <Text style={styles.fieldBoxLabel}>{field.label}</Text>
              <Text style={[styles.fieldBoxInput, !selectedDate && styles.fieldBoxInputPlaceholder]}>
                {selectedDate ? formatDateForDisplay(selectedDate) : 'Select date...'}
              </Text>
            </View>
            <CalendarDays size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      );
    }

    // File — document / image picker with repeatable context (multi-file)
    if (field.type === 'file') {
      const pendingFiles = (repeatableFileState[sectionId] ?? [])[rowIndex]?.[field.id]?.pending ?? [];
      const hasAny = pendingFiles.length > 0;
      return (
        <View key={field.id} style={{ gap: 6 }}>
          <Text style={styles.fieldBoxLabel}>{field.label}</Text>
          {pendingFiles.map((f, i) => (
            <View key={`pend-${i}`} style={styles.fileChipRow}>
              <Text style={styles.fileChipName} numberOfLines={1}>
                {f.name}
              </Text>
              <Pressable onPress={() => handleRemovePendingFileForRow(sectionId, rowIndex, field.id, i)} hitSlop={8}>
                <X size={14} color={colors.accent} />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.fileField} onPress={() => handlePickFileForRow(sectionId, rowIndex, field.id)}>
            <View style={styles.fileFieldLeft}>
              <Text style={[styles.fieldBoxInput, !hasAny && styles.fieldBoxInputPlaceholder]}>{hasAny ? 'Add more files' : 'Add files'}</Text>
            </View>
            <Upload size={16} color={hasAny ? colors.accent : colors.textMuted} />
          </Pressable>
        </View>
      );
    }

    // All others — editable field box
    return (
      <NewFieldBox
        key={field.id}
        label={field.label}
        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
        value={rowValues[field.id] ?? ''}
        onChangeText={(v) => onChangeField(field.id, v)}
        multiline={field.type === 'textarea'}
        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
      />
    );
  }

  // ── Repeatable section renderer ──────────────────────────────────────────────

  function renderRepeatableSection(section: SectionSchema) {
    const rows = repeatableRows[section.id] ?? [];
    const rowLabel = section.rowLabel ?? 'Item';
    const addLabel = section.addButtonLabel ?? 'Add another';

    return (
      <View key={section.id} style={styles.section}>
        <View style={styles.prescriptionsHeader}>
          <Text style={styles.sectionTitle}>{section.name}</Text>
          <Pressable onPress={() => addRow(section.id)}>
            <Text style={styles.addRxText}>+ {addLabel}</Text>
          </Pressable>
        </View>

        {rows.length === 0 ? (
          <View style={styles.prescriptionsEmpty}>
            <Text style={styles.prescriptionsEmptyTitle}>No {rowLabel.toLowerCase()}s added yet</Text>
            <Text style={styles.prescriptionsEmptyBody}>Tap &quot;+ {addLabel}&quot; to add the first one.</Text>
          </View>
        ) : (
          rows.map((rowValues, rowIndex) => (
            <View key={rowIndex} style={styles.rxRow}>
              <View style={styles.rxCard}>
                <Text style={styles.rxRowLabel}>
                  {rowLabel} {rowIndex + 1}
                </Text>
                {section.fields.map((field) =>
                  renderRepeatableField(field, rowValues, (fieldId, val) => setRowValue(section.id, rowIndex, fieldId, val), section.id, rowIndex)
                )}
              </View>
              <Pressable onPress={() => removeRow(section.id, rowIndex)} style={styles.rxRemove}>
                <X size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  // Derive selected values for picker highlight indicators
  const currentRelationValue = repeatableRelationCtx
    ? (repeatableRows[repeatableRelationCtx.sectionId]?.[repeatableRelationCtx.rowIndex]?.[repeatableRelationCtx.fieldId] ?? '')
    : (values[activeRelationFieldId ?? ''] ?? '');

  const currentDropdownValue = repeatableDropdownCtx
    ? (repeatableRows[repeatableDropdownCtx.sectionId]?.[repeatableDropdownCtx.rowIndex]?.[activeDropdownField?.id ?? ''] ?? '')
    : (values[activeDropdownField?.id ?? ''] ?? '');

  return (
    <ScreenWrapper hasTabBar>
      <KeyboardAvoidingWrapper>
        {/* Nav bar */}
        <Animated.View style={[styles.navBar, anims[0]]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={16} color={colors.accent} />
          </Pressable>
          <Text style={styles.navTitle}>New Patient</Text>
          <View style={styles.navSpacer}>
            <OfflineIcon />
          </View>
        </Animated.View>

        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {schema.sections.map((section, index) => {
              const animStyle = anims[Math.min(index + 1, 4)];
              if (section.type === 'repeatable') {
                return (
                  <Animated.View key={section.id} style={animStyle}>
                    {renderRepeatableSection(section)}
                  </Animated.View>
                );
              }
              return (
                <Animated.View key={section.id} style={animStyle}>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.name}</Text>
                    {section.fields.map((field) => renderField(field))}
                  </View>
                </Animated.View>
              );
            })}

            {/* Actions */}
            <Animated.View style={[styles.actions, anims[5]]}>
              <Text style={styles.actionsLabel}>Actions</Text>
              <Animated.View style={shakeStyle}>
                <Button title="Save Patient" onPress={handleSubmit} loading={saving} disabled={saving} />
              </Animated.View>
              <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
          <LinearGradient colors={['rgba(245,242,233,0)', '#F5F2E9']} style={styles.scrollFade} pointerEvents="none" />
        </View>
      </KeyboardAvoidingWrapper>

      {/* ── Date picker ──────────────────────────────────────────────────────── */}
      {/* Android: render DateTimePicker conditionally — the OS shows it as a  */}
      {/* native dialog automatically, no wrapper needed.                       */}
      {/* iOS: wrap in a transparent Modal with a bottom sheet + Done button.   */}

      {datePickerCtx && Platform.OS === 'android' && (
        <DateTimePicker
          value={datePickerCtx.date}
          mode="date"
          display="default"
          onChange={(event, date) => {
            if (event.type === 'dismissed') {
              setDatePickerCtx(null);
              return;
            }
            if (date) {
              writeDateValue(date.toISOString().split('T')[0]);
            }
            setDatePickerCtx(null);
          }}
        />
      )}

      {datePickerCtx && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" onRequestClose={() => setDatePickerCtx(null)}>
          <Pressable style={styles.datePickerBackdrop} onPress={() => setDatePickerCtx(null)} />
          <View style={styles.datePickerSheet}>
            <View style={styles.datePickerHeader}>
              <Pressable onPress={() => setDatePickerCtx(null)}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  writeDateValue(datePickerCtx.date.toLocaleDateString('en-GB'));
                  setDatePickerCtx(null);
                }}
              >
                <Text style={styles.datePickerDone}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={datePickerCtx.date}
              mode="date"
              display="spinner"
              onChange={(_, date) => {
                if (date) setDatePickerCtx((prev) => (prev ? { ...prev, date } : null));
              }}
              style={styles.datePickerWheel}
            />
          </View>
        </Modal>
      )}

      {/* Pharmacist picker — shared between standard relation fields and repeatable rows */}
      <BottomSheetWrapper ref={pharmacistSheetRef} snapPoints={PHARMACIST_SNAP} onClose={() => pharmacistSheetRef.current?.dismiss()}>
        <View style={styles.pickerContent}>
          <Text style={styles.pickerTitle}>Select Pharmacist</Text>
          {(pharmacists ?? []).map((p) => (
            <Pressable
              key={p.id}
              style={[styles.pickerRow, currentRelationValue === p.name && styles.pickerRowActive]}
              onPress={() => {
                const relCtx = repeatableRelationCtxRef.current;
                if (relCtx) {
                  setRowValue(relCtx.sectionId, relCtx.rowIndex, relCtx.fieldId, p.name);
                  setRepeatableRelationCtx(null);
                  repeatableRelationCtxRef.current = null;
                } else {
                  setValue(activeRelationFieldIdRef.current ?? 'core-attended-to-by', p.name);
                  setActiveRelationFieldId(null);
                  activeRelationFieldIdRef.current = null;
                }
                pharmacistSheetRef.current?.dismiss();
              }}
            >
              <Text style={[styles.pickerRowText, currentRelationValue === p.name && styles.pickerRowTextActive]}>{p.name}</Text>
              {currentRelationValue === p.name && <Check size={16} color={colors.accent} />}
            </Pressable>
          ))}
          {(!pharmacists || pharmacists.length === 0) && <Text style={styles.pickerEmpty}>No pharmacists added yet.</Text>}
        </View>
      </BottomSheetWrapper>

      {/* Dropdown picker — shared between standard dropdown fields and repeatable rows */}
      <BottomSheetWrapper ref={dropdownSheetRef} snapPoints={DROPDOWN_SNAP} onClose={() => dropdownSheetRef.current?.dismiss()}>
        <View style={styles.pickerContent}>
          <Text style={styles.pickerTitle}>{activeDropdownField?.label ?? 'Select'}</Text>
          {(activeDropdownField?.options ?? []).map((opt) => (
            <Pressable
              key={opt}
              style={[styles.pickerRow, currentDropdownValue === opt && styles.pickerRowActive]}
              onPress={() => {
                if (activeDropdownField) {
                  if (repeatableDropdownCtx) {
                    setRowValue(repeatableDropdownCtx.sectionId, repeatableDropdownCtx.rowIndex, activeDropdownField.id, opt);
                    setRepeatableDropdownCtx(null);
                  } else {
                    setValue(activeDropdownField.id, opt);
                  }
                  setActiveDropdownField(null);
                  dropdownSheetRef.current?.dismiss();
                }
              }}
            >
              <Text style={[styles.pickerRowText, currentDropdownValue === opt && styles.pickerRowTextActive]}>{opt}</Text>
              {currentDropdownValue === opt && <Check size={16} color={colors.accent} />}
            </Pressable>
          ))}
        </View>
      </BottomSheetWrapper>

      <SuccessCheck visible={showSuccess} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#D8D1C1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  navTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text
  },
  navSpacer: {
    width: 36,
    height: 36
  },

  // Scroll
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

  // Repeatable section header row
  prescriptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  addRxText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent
  },

  // Empty state
  prescriptionsEmpty: {
    backgroundColor: colors.inputFill,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6C7',
    padding: 14,
    gap: 8
  },
  prescriptionsEmptyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text
  },
  prescriptionsEmptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: '#5F5A53'
  },

  // Field box (label inside)
  fieldWrap: { gap: 4 },
  fieldBox: {
    backgroundColor: colors.inputFill,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6C7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4
  },
  fieldBoxMulti: { gap: 6 },
  fieldBoxError: { borderColor: colors.error },
  fieldBoxLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },
  fieldBoxInput: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
    padding: 0
  },
  fieldBoxInputMulti: {
    fontSize: 14,
    lineHeight: 19,
    minHeight: 60
  },
  fieldBoxInputPlaceholder: { color: colors.textMuted },

  // Select / icon row layout
  fieldBoxSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 0
  },
  fieldBoxSelectLeft: {
    flex: 1,
    gap: 4
  },

  // File upload field (dashed border card)
  fileField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputFill,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DDD6C7',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12
  },
  fileFieldLeft: {
    flex: 1,
    gap: 4
  },
  fileChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6
  },
  fileChipName: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accent
  },

  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error
  },

  // Repeatable row
  rxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm
  },
  rxCard: {
    flex: 1,
    backgroundColor: colors.inputFill,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6C7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10
  },
  rxRowLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },
  rxRemove: {
    paddingTop: 14,
    padding: spacing.xs
  },

  // Actions
  actions: { gap: 10 },
  actionsLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
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
  },

  // Date picker — iOS modal bottom sheet
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  datePickerSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  datePickerCancel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted
  },
  datePickerDone: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.accent
  },
  datePickerWheel: {
    width: '100%'
  },

  // Picker sheet (pharmacist / dropdown)
  pickerContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.xs
  },
  pickerTitle: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.sm
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: 10
  },
  pickerRowActive: {
    backgroundColor: colors.activeNavBg
  },
  pickerRowText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text
  },
  pickerRowTextActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.accent
  },
  pickerEmpty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg
  },
  scrollFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 }
});
