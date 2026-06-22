import { useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { CalendarDays, Check, ChevronDown, ChevronLeft, Lock, Upload, X } from 'lucide-react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getPatient, updatePatient, uploadPatientDocument } from '../../api/patients';
import { getApiErrorMessage } from '../../utils/apiError';
import { listPharmacists } from '../../api/pharmacists';
import { getSettings } from '../../api/settings';
import { queryKeys } from '../../api/queryKeys';
import Animated from 'react-native-reanimated';
import { BottomSheetWrapper, Button, SuccessCheck } from '../../components/ui';
import { useShakeAnimation } from '../../hooks/useShakeAnimation';
import { KeyboardAvoidingWrapper, ScreenWrapper } from '../../components/layout';
import { DeletePatientSheet } from '../../components/patients/DeletePatientSheet';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { buildDefaultTemplate } from '../../types/formBuilder';
import type { FieldSchema, FormSchema, SectionSchema } from '../../types/formBuilder';
import type { IPatient, PatientCustomFieldsSection, UpdatePatientPayload } from '../../types';
import type { PatientsStackParamList } from '../../navigation/types';
import {
  buildCustomFieldsSections,
  hasAttendedByValue,
  hydrateRepeatableFileState,
  hydrateRepeatableSectionRows,
  hydrateStandardFileState,
  hydrateStandardSectionValues
} from '../../utils/patientFormSerialization';
import type { MobileFileFieldState, MobilePendingFile } from '../../utils/patientFormSerialization';

type Props = NativeStackScreenProps<PatientsStackParamList, 'PatientEdit'>;

const PHARMACIST_SNAP = ['65%'];
const DROPDOWN_SNAP = ['40%'];

// ── EditFieldBox — label + TextInput inside a single box ─────────────────────

interface EditFieldBoxProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  error?: string;
  placeholder?: string;
}

function EditFieldBox({ label, value, onChangeText, multiline, keyboardType, error, placeholder }: EditFieldBoxProps) {
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

// ── Inner form — only mounts after patient loads ──────────────────────────────

interface EditFormProps {
  patient: IPatient;
  schema: FormSchema;
  navigation: Props['navigation'];
  patientId: string;
}

function EditForm({ patient, schema, navigation, patientId }: EditFormProps) {
  const queryClient = useQueryClient();
  const deleteSheetRef = useRef<BottomSheetModal>(null);
  const pharmacistSheetRef = useRef<BottomSheetModal>(null);
  const dropdownSheetRef = useRef<BottomSheetModal>(null);

  const [activeDropdownField, setActiveDropdownField] = useState<FieldSchema | null>(null);

  // Repeatable-row context for the dropdown / pharmacist pickers.
  const [repeatableDropdownCtx, setRepeatableDropdownCtx] = useState<{
    sectionId: string;
    rowIndex: number;
  } | null>(null);
  const [repeatableRelationCtx, setRepeatableRelationCtx] = useState<{
    sectionId: string;
    rowIndex: number;
    fieldId: string;
  } | null>(null);
  const repeatableRelationCtxRef = useRef<{ sectionId: string; rowIndex: number; fieldId: string } | null>(null);

  // Date picker context — tracks which field opened the picker.
  // sectionId + rowIndex are set only for repeatable rows.
  const [datePickerCtx, setDatePickerCtx] = useState<{
    fieldId: string;
    sectionId?: string;
    rowIndex?: number;
    date: Date;
  } | null>(null);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    schema.sections.forEach((section) => {
      if (section.type === 'repeatable') return;
      Object.assign(initial, hydrateStandardSectionValues(section, patient));
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const { animatedStyle: shakeStyle, shake } = useShakeAnimation();

  // File state — tracked separately from text values so we can upload on save.
  // standardFileState: fieldId → { existing: FileMetadata[], pending: picked file | null }
  // repeatableFileState: sectionId → row[] → fieldId → { existing, pending }
  const [standardFileState, setStandardFileState] = useState<Record<string, MobileFileFieldState>>(() => hydrateStandardFileState(schema, patient));
  const [repeatableFileState, setRepeatableFileState] = useState<Record<string, Array<Record<string, MobileFileFieldState>>>>(() =>
    hydrateRepeatableFileState(schema, patient)
  );

  // Generic repeatable rows keyed by section ID, hydrated from the patient's
  // saved customFields.sections.
  const [repeatableRows, setRepeatableRows] = useState<Record<string, Array<Record<string, string>>>>(() => {
    const initial: Record<string, Array<Record<string, string>>> = {};
    schema.sections.forEach((section) => {
      if (section.type !== 'repeatable') return;
      initial[section.id] = hydrateRepeatableSectionRows(section, patient);
    });
    return initial;
  });

  // How many rows each repeatable section had at hydration time — rows at or
  // beyond this index were added during this edit session, so their "Attended
  // To By" field is editable; rows before it are locked.
  const [existingRowCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    schema.sections.forEach((section) => {
      if (section.type !== 'repeatable') return;
      counts[section.id] = hydrateRepeatableSectionRows(section, patient).length;
    });
    return counts;
  });

  const { data: pharmacists } = useQuery({ queryKey: queryKeys.pharmacists, queryFn: listPharmacists });

  const { mutateAsync } = useMutation({
    mutationFn: (payload: UpdatePatientPayload) => updatePatient(patientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.goBack();
      }, 700);
    }
  });

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
          newRowState[field.id] = { existing: [], pending: null };
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
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > MAX_FILE_BYTES) {
          Alert.alert('File too large', `"${asset.name}" is ${(asset.size / (1024 * 1024)).toFixed(1)} MB. Files must be under 10 MB.`);
          return;
        }
        const pending: MobilePendingFile = { uri: asset.uri, mimeType: asset.mimeType ?? undefined, name: asset.name };
        setStandardFileState((prev) => ({
          ...prev,
          [fieldId]: { existing: prev[fieldId]?.existing ?? [], pending }
        }));
      }
    } catch {
      Alert.alert('File error', 'Could not open the file picker. Please try again.');
    }
  }

  async function handlePickFileForRow(sectionId: string, rowIndex: number, fieldId: string) {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > MAX_FILE_BYTES) {
          Alert.alert('File too large', `"${asset.name}" is ${(asset.size / (1024 * 1024)).toFixed(1)} MB. Files must be under 10 MB.`);
          return;
        }
        const pending: MobilePendingFile = { uri: asset.uri, mimeType: asset.mimeType ?? undefined, name: asset.name };
        setRepeatableFileState((prev) => {
          const rows = [...(prev[sectionId] ?? [])];
          rows[rowIndex] = {
            ...(rows[rowIndex] ?? {}),
            [fieldId]: { existing: rows[rowIndex]?.[fieldId]?.existing ?? [], pending }
          };
          return { ...prev, [sectionId]: rows };
        });
      }
    } catch {
      Alert.alert('File error', 'Could not open the file picker. Please try again.');
    }
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    schema.sections.forEach((section) => {
      if (section.type === 'repeatable') {
        const rows = repeatableRows[section.id] ?? [];
        const existingCount = existingRowCounts[section.id] ?? 0;
        rows.forEach((row, rowIndex) => {
          section.fields.forEach((field) => {
            if (field.type === 'relation') {
              // Locked (existing) rows can't be edited, so don't block save
              // on them — only newly-added rows enforce the requirement.
              if (rowIndex < existingCount) return;
              if (field.required && !row[field.id]?.trim()) {
                newErrors[`${section.id}:${rowIndex}:${field.id}`] = `${field.label} is required`;
              }
              return;
            }
            if (field.required && !row[field.id]?.trim()) {
              newErrors[`${section.id}:${rowIndex}:${field.id}`] = `${field.label} is required`;
            }
          });
        });
        return;
      }
      section.fields.forEach((field) => {
        if (field.type === 'relation') return;
        if (field.required && !values[field.id]?.trim()) {
          newErrors[field.id] = `${field.label} is required`;
        }
      });
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Upload helper: merges existing + newly-uploaded files into sections ──────

  async function buildSectionsWithFiles(baseSections: PatientCustomFieldsSection[]): Promise<PatientCustomFieldsSection[]> {
    return Promise.all(
      baseSections.map(async (section) => {
        const schemaSection = schema.sections.find((s) => s.id === section.name);
        if (!schemaSection) return section;
        const fileFields = schemaSection.fields.filter((f) => f.type === 'file');
        if (fileFields.length === 0) return section;

        if (schemaSection.type === 'standard') {
          const fieldsRow: Record<string, unknown> = { ...(section.fields[0] ?? {}) };
          for (const field of fileFields) {
            const fState = standardFileState[field.id] ?? { existing: [], pending: null };
            const uploaded = fState.pending ? [await uploadPatientDocument(patientId, fState.pending)] : [];
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
              const fstate = rowFState[field.id] ?? { existing: [], pending: null };
              const uploaded = fstate.pending ? [await uploadPatientDocument(patientId, fstate.pending)] : [];
              merged[field.id] = [...fstate.existing, ...uploaded];
            }
            return merged;
          })
        );
        return { name: section.name, fields };
      })
    );
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
      const sections = await buildSectionsWithFiles(baseSections);
      await mutateAsync({
        fullName: values['core-full-name'],
        age: parseInt(values['core-age'] ?? '0', 10),
        phoneNumber: values['core-phone-number'],
        customFields: { sections }
      });
    } catch (err) {
      setSaving(false);
      Alert.alert('Could not save patient', getApiErrorMessage(err));
    }
  }

  // ── Standard section field renderer ─────────────────────────────────────────

  function renderField(field: FieldSchema) {
    // Relation (Attended To By) — read-only, locked. Only one pharmacist per
    // standard section, fixed at creation.
    if (field.type === 'relation') {
      const val = values[field.id] ?? '';
      return (
        <View key={field.id} style={styles.fieldBoxLocked}>
          <View style={styles.fieldBoxLockedLeft}>
            <Text style={styles.fieldBoxLabel}>{field.label}</Text>
            <Text style={styles.fieldBoxLockedValue}>{val || '—'}</Text>
          </View>
          <Lock size={16} color={colors.textLight} />
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
              <Text style={[styles.fieldBoxInput, !selectedDate && styles.fieldBoxInputPlaceholder]}>{selectedDate || 'Select date...'}</Text>
            </View>
            <CalendarDays size={16} color={colors.textMuted} />
          </Pressable>
          {errors[field.id] ? <Text style={styles.errorText}>{errors[field.id]}</Text> : null}
        </View>
      );
    }

    // File — document / image picker
    if (field.type === 'file') {
      const fState = standardFileState[field.id];
      const displayName = fState?.pending?.name ?? fState?.existing[0]?.name ?? null;
      return (
        <Pressable key={field.id} style={styles.fileField} onPress={() => handlePickFile(field.id)}>
          <View style={styles.fileFieldLeft}>
            <Text style={styles.fieldBoxLabel}>
              {field.label}
              {field.required ? ' *' : ''}
            </Text>
            <Text style={[styles.fieldBoxInput, !displayName && styles.fieldBoxInputPlaceholder]} numberOfLines={1}>
              {displayName ?? 'Tap to upload file'}
            </Text>
          </View>
          <Upload size={16} color={displayName ? colors.accent : colors.textMuted} />
        </Pressable>
      );
    }

    // All others — editable field box
    return (
      <EditFieldBox
        key={field.id}
        label={`${field.label}${field.required ? ' *' : ''}`}
        value={values[field.id] ?? ''}
        onChangeText={(v) => setValue(field.id, v)}
        multiline={field.type === 'textarea'}
        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        error={errors[field.id]}
        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
      />
    );
  }

  // ── Repeatable row field renderer ────────────────────────────────────────────
  // sectionId + rowIndex are required so pickers know where to write back, and
  // so the relation field can tell existing rows (locked) from new ones (editable).

  function renderRepeatableField(
    field: FieldSchema,
    rowValues: Record<string, string>,
    onChangeField: (fieldId: string, val: string) => void,
    sectionId: string,
    rowIndex: number
  ) {
    // Relation — locked for rows that existed before this edit session,
    // editable pharmacist picker for newly-added rows.
    if (field.type === 'relation') {
      const val = rowValues[field.id] ?? '';
      const isExisting = rowIndex < (existingRowCounts[sectionId] ?? 0);

      if (isExisting) {
        return (
          <View key={field.id} style={styles.fieldBoxLocked}>
            <View style={styles.fieldBoxLockedLeft}>
              <Text style={styles.fieldBoxLabel}>{field.label}</Text>
              <Text style={styles.fieldBoxLockedValue}>{val || '—'}</Text>
            </View>
            <Lock size={16} color={colors.textLight} />
          </View>
        );
      }

      return (
        <View key={field.id} style={styles.fieldWrap}>
          <Pressable
            style={[styles.fieldBox, styles.fieldBoxSelect]}
            onPress={() => {
              repeatableRelationCtxRef.current = { sectionId, rowIndex, fieldId: field.id };
              setRepeatableRelationCtx({ sectionId, rowIndex, fieldId: field.id });
              pharmacistSheetRef.current?.present();
            }}
          >
            <View style={styles.fieldBoxSelectLeft}>
              <Text style={styles.fieldBoxLabel}>{field.label}</Text>
              <Text style={[styles.fieldBoxInput, !val && styles.fieldBoxInputPlaceholder]}>{val || 'Select pharmacist...'}</Text>
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
              <Text style={[styles.fieldBoxInput, !selectedDate && styles.fieldBoxInputPlaceholder]}>{selectedDate || 'Select date...'}</Text>
            </View>
            <CalendarDays size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      );
    }

    // File — document / image picker with repeatable context
    if (field.type === 'file') {
      const fState = (repeatableFileState[sectionId] ?? [])[rowIndex]?.[field.id];
      const displayName = fState?.pending?.name ?? fState?.existing[0]?.name ?? null;
      return (
        <Pressable key={field.id} style={styles.fileField} onPress={() => handlePickFileForRow(sectionId, rowIndex, field.id)}>
          <View style={styles.fileFieldLeft}>
            <Text style={styles.fieldBoxLabel}>{field.label}</Text>
            <Text style={[styles.fieldBoxInput, !displayName && styles.fieldBoxInputPlaceholder]} numberOfLines={1}>
              {displayName ?? 'Tap to upload file'}
            </Text>
          </View>
          <Upload size={16} color={displayName ? colors.accent : colors.textMuted} />
        </Pressable>
      );
    }

    // All others — editable field box
    return (
      <EditFieldBox
        key={field.id}
        label={field.label}
        value={rowValues[field.id] ?? ''}
        onChangeText={(v) => onChangeField(field.id, v)}
        multiline={field.type === 'textarea'}
        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
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

  const currentRelationValue = repeatableRelationCtx
    ? (repeatableRows[repeatableRelationCtx.sectionId]?.[repeatableRelationCtx.rowIndex]?.[repeatableRelationCtx.fieldId] ?? '')
    : '';

  const currentDropdownValue = repeatableDropdownCtx
    ? (repeatableRows[repeatableDropdownCtx.sectionId]?.[repeatableDropdownCtx.rowIndex]?.[activeDropdownField?.id ?? ''] ?? '')
    : (values[activeDropdownField?.id ?? ''] ?? '');

  return (
    <>
      <KeyboardAvoidingWrapper>
        {/* Nav bar */}
        <View style={styles.navBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={16} color={colors.accent} />
          </Pressable>
          <Text style={styles.navTitle}>Edit Patient</Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {schema.sections.map((section) => {
            if (section.type === 'repeatable') {
              return renderRepeatableSection(section);
            }
            return (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.name}</Text>
                {section.fields.map((field) => renderField(field))}
              </View>
            );
          })}

          {/* Actions */}
          <View style={styles.actions}>
            <Text style={styles.actionsLabel}>Actions</Text>
            <Animated.View style={shakeStyle}>
              <Button title="Update Patient" onPress={handleSubmit} loading={saving} disabled={saving} />
            </Animated.View>
            <Pressable onPress={() => deleteSheetRef.current?.present()} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.85 }]}>
              <Text style={styles.deleteBtnText}>Delete Patient</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingWrapper>

      {/* ── Date picker ──────────────────────────────────────────────────────── */}
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
              writeDateValue(date.toLocaleDateString('en-GB'));
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

      {/* Pharmacist picker — only used for editable repeatable-row relation fields */}
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

      <DeletePatientSheet
        ref={deleteSheetRef}
        patientId={patientId}
        onClose={() => deleteSheetRef.current?.dismiss()}
        onDeleted={() => navigation.goBack()}
      />

      <SuccessCheck visible={showSuccess} />
    </>
  );
}

// ── Outer shell — handles loading gate ───────────────────────────────────────

export function PatientEditScreen({ route, navigation }: Props) {
  const { patientId } = route.params;

  const { data: patient } = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => getPatient(patientId)
  });

  const { data: settings } = useQuery({ queryKey: queryKeys.settings, queryFn: getSettings });

  return (
    <ScreenWrapper>
      {patient ? (
        <EditForm
          patient={patient}
          schema={patient.formSnapshot ? (patient.formSnapshot as unknown as FormSchema) : (settings?.formConfig?.schema ?? buildDefaultTemplate())}
          navigation={navigation}
          patientId={patientId}
        />
      ) : (
        <View style={styles.loadingPlaceholder} />
      )}
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

  // Field box (editable, label inside)
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

  // Locked field (relation type — read-only)
  fieldBoxLocked: {
    backgroundColor: '#F5F1E8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD6C7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  fieldBoxLockedLeft: { gap: 4 },
  fieldBoxLockedValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#5F5A53'
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
  }
});
