import type { FormSchema, SectionSchema } from '../types/formBuilder';
import type { FileMetadata, IPatient, PatientCustomFieldsSection } from '../types';

export const CORE_TOP_LEVEL: Record<string, string> = {
  'core-full-name': 'fullName',
  'core-age': 'age',
  'core-phone-number': 'phoneNumber'
};

export const ATTENDED_BY_FIELD_ID = 'core-attended-to-by';

export type MobilePendingFile = { uri: string; mimeType?: string; name: string };
export type MobileFileFieldState = { existing: FileMetadata[]; pending: MobilePendingFile[] };

export function findPatientSection(patient: IPatient, sectionId: string): PatientCustomFieldsSection | undefined {
  return patient.customFields?.sections?.find((s) => s.name === sectionId);
}

export function hydrateStandardSectionValues(section: SectionSchema, patient: IPatient): Record<string, string> {
  const match = findPatientSection(patient, section.id);
  const out: Record<string, string> = {};
  section.fields.forEach((field) => {
    const coreKey = CORE_TOP_LEVEL[field.id];
    if (coreKey) {
      out[field.id] = String((patient as unknown as Record<string, unknown>)[coreKey] ?? '');
      return;
    }
    // File fields are managed separately via file state — skip them here.
    if (field.type === 'file') {
      out[field.id] = '';
      return;
    }
    const raw = match?.fields?.[0]?.[field.id];
    out[field.id] = raw == null ? '' : String(raw);
  });
  return out;
}

export function hydrateRepeatableSectionRows(section: SectionSchema, patient: IPatient): Array<Record<string, string>> {
  const match = findPatientSection(patient, section.id);
  const rows = match?.fields ?? [];
  return rows.map((row) => {
    const out: Record<string, string> = {};
    section.fields.forEach((field) => {
      // File fields are managed separately via file state — skip them here.
      if (field.type === 'file') {
        out[field.id] = '';
        return;
      }
      const raw = row[field.id];
      out[field.id] = raw == null ? '' : String(raw);
    });
    return out;
  });
}

export function hydrateStandardFileState(schema: FormSchema, patient: IPatient): Record<string, MobileFileFieldState> {
  const state: Record<string, MobileFileFieldState> = {};
  for (const section of schema.sections) {
    if (section.type !== 'standard') continue;
    const match = findPatientSection(patient, section.id);
    const row = match?.fields?.[0];
    for (const field of section.fields) {
      if (field.type !== 'file') continue;
      const val = row?.[field.id];
      state[field.id] = {
        existing: Array.isArray(val) ? (val as FileMetadata[]) : [],
        pending: []
      };
    }
  }
  return state;
}

export function hydrateRepeatableFileState(schema: FormSchema, patient: IPatient): Record<string, Array<Record<string, MobileFileFieldState>>> {
  const state: Record<string, Array<Record<string, MobileFileFieldState>>> = {};
  for (const section of schema.sections) {
    if (section.type !== 'repeatable') continue;
    const fileFields = section.fields.filter((f) => f.type === 'file');
    if (fileFields.length === 0) continue;
    const match = findPatientSection(patient, section.id);
    const rows = match?.fields ?? [];
    state[section.id] = rows.map((row) => {
      const rowState: Record<string, MobileFileFieldState> = {};
      for (const field of fileFields) {
        const val = row[field.id];
        rowState[field.id] = {
          existing: Array.isArray(val) ? (val as FileMetadata[]) : [],
          pending: []
        };
      }
      return rowState;
    });
  }
  return state;
}

export function buildCustomFieldsSections(
  schema: FormSchema,
  values: Record<string, string>,
  repeatableRows: Record<string, Array<Record<string, string>>>
): PatientCustomFieldsSection[] {
  return schema.sections.map((section) => {
    if (section.type === 'repeatable') {
      const rows = repeatableRows[section.id] ?? [];
      return {
        name: section.id,
        fields: rows.map((row) => {
          const out: Record<string, unknown> = {};
          section.fields.forEach((field) => {
            if (field.type === 'file') return;
            out[field.id] = row[field.id] ?? '';
          });
          return out;
        })
      };
    }
    const out: Record<string, unknown> = {};
    section.fields.forEach((field) => {
      if (CORE_TOP_LEVEL[field.id]) return;
      if (field.type === 'file') return;
      out[field.id] = values[field.id] ?? '';
    });
    return { name: section.id, fields: [out] };
  });
}

export function hasAttendedByValue(
  schema: FormSchema,
  values: Record<string, string>,
  repeatableRows: Record<string, Array<Record<string, string>>>
): boolean {
  for (const section of schema.sections) {
    if (section.type === 'repeatable') {
      const rows = repeatableRows[section.id] ?? [];
      for (const field of section.fields) {
        if (field.type !== 'relation') continue;
        if (rows.some((row) => row[field.id]?.trim())) return true;
      }
    } else {
      for (const field of section.fields) {
        if (field.type !== 'relation') continue;
        if (values[field.id]?.trim()) return true;
      }
    }
  }
  return false;
}

// Drops repeatable rows the user never actually filled in (every non-file
// field blank and no attached files) so an untouched default row doesn't get
// persisted as a phantom record. Filters repeatableRows and repeatableFileState
// in lockstep so row indices stay aligned for file-upload lookups.
export function stripBlankRepeatableRows(
  schema: FormSchema,
  repeatableRows: Record<string, Array<Record<string, string>>>,
  repeatableFileState: Record<string, Array<Record<string, MobileFileFieldState>>>
): {
  rows: Record<string, Array<Record<string, string>>>;
  fileState: Record<string, Array<Record<string, MobileFileFieldState>>>;
} {
  const rows: Record<string, Array<Record<string, string>>> = {};
  const fileState: Record<string, Array<Record<string, MobileFileFieldState>>> = {};

  for (const section of schema.sections) {
    if (section.type !== 'repeatable') continue;

    const textFields = section.fields.filter((f) => f.type !== 'file');
    const fileFields = section.fields.filter((f) => f.type === 'file');
    const sectionRows = repeatableRows[section.id] ?? [];
    const sectionFileRows = repeatableFileState[section.id] ?? [];

    const keptRows: Array<Record<string, string>> = [];
    const keptFileRows: Array<Record<string, MobileFileFieldState>> = [];

    sectionRows.forEach((row, i) => {
      const fileRow = sectionFileRows[i] ?? {};
      const hasText = textFields.some((f) => row[f.id]?.trim());
      const hasFile = fileFields.some((f) => (fileRow[f.id]?.existing.length ?? 0) > 0 || (fileRow[f.id]?.pending.length ?? 0) > 0);
      if (!hasText && !hasFile) return;
      keptRows.push(row);
      keptFileRows.push(fileRow);
    });

    rows[section.id] = keptRows;
    fileState[section.id] = keptFileRows;
  }

  return { rows, fileState };
}
