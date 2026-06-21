// ─── Field ───────────────────────────────────────────────────────────────────

export type FieldType = 'short_text' | 'number' | 'date' | 'textarea' | 'dropdown' | 'file' | 'relation';

export interface FieldSchema {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[]; // for dropdown
  /** If true the field cannot be deleted (core locked fields) */
  locked?: boolean;
}

// ─── Section ─────────────────────────────────────────────────────────────────

export type SectionType = 'standard' | 'repeatable';

export interface SectionSchema {
  id: string;
  name: string;
  type: SectionType;
  /** If true the section cannot be deleted or moved (Personal Information) */
  locked?: boolean;
  fields: FieldSchema[];
  /** Repeatable-only: label for a single row instance, e.g. "Prescription" */
  rowLabel?: string;
  /** Repeatable-only: label for the add-another button, e.g. "Add another prescription" */
  addButtonLabel?: string;
}

// ─── Form ────────────────────────────────────────────────────────────────────

export type FormStatus = 'draft' | 'published';

export interface FormSchema {
  id: string;
  name: string;
  status: FormStatus;
  sections: SectionSchema[];
}

// ─── Preview state (live values while previewing) ────────────────────────────

export type FieldValue = string | string[] | null;

export interface RepeatableRowValues {
  rowId: string;
  values: Record<string, FieldValue>;
}

export interface SectionPreviewState {
  sectionId: string;
  /** Standard section: single record */
  values?: Record<string, FieldValue>;
  /** Repeatable section: ordered rows */
  rows?: RepeatableRowValues[];
}

// ─── Default templates ───────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export const PERSONAL_INFO_SECTION: SectionSchema = {
  id: 'personal-info',
  name: 'Personal Info',
  type: 'standard',
  locked: true,
  fields: [
    { id: 'core-full-name', label: 'Full Name', type: 'short_text', required: true, locked: true },
    { id: 'core-age', label: 'Age', type: 'number', required: true, locked: true },
    { id: 'core-phone-number', label: 'Phone Number', type: 'short_text', required: true, locked: true },
    { id: 'core-address', label: 'Home Address', type: 'short_text', required: false }
  ]
};

export const PRESCRIPTIONS_SECTION: SectionSchema = {
  id: 'core-prescriptions',
  name: 'Prescriptions',
  type: 'repeatable',
  rowLabel: 'Prescription',
  addButtonLabel: 'Add another prescription',
  fields: [{ id: 'core-prescription-text', label: 'Prescription', type: 'textarea', required: false }]
};

export const MEDICAL_INFO_SECTION: SectionSchema = {
  id: 'medical-info',
  name: 'Medical History',
  type: 'standard',
  fields: [
    { id: 'core-appointment-date', label: 'Appointment Date', type: 'date', required: false },
    { id: 'core-attended-to-by', label: 'Attended To By', type: 'relation', required: true, locked: true },
    { id: 'core-notes', label: 'Notes', type: 'textarea', required: false }
  ]
};

// ─── Preset sections ─────────────────────────────────────────────────────────

export const PRESET_ALLERGIES_SECTION: Omit<SectionSchema, 'id'> = {
  name: 'Allergies',
  type: 'repeatable',
  rowLabel: 'Allergy',
  addButtonLabel: 'Add another allergy',
  fields: [
    { id: uid(), label: 'Allergy', type: 'short_text', required: true },
    { id: uid(), label: 'Reaction', type: 'short_text', required: false },
    { id: uid(), label: 'Severity', type: 'dropdown', required: false, options: ['Mild', 'Moderate', 'Severe'] },
    { id: uid(), label: 'Notes', type: 'textarea', required: false }
  ]
};

// ─── Starter templates ────────────────────────────────────────────────────────

export function buildDefaultTemplate(): FormSchema {
  return {
    id: uid(),
    name: 'Patient Form',
    status: 'draft',
    sections: [
      { ...PERSONAL_INFO_SECTION, id: 'personal-info', fields: PERSONAL_INFO_SECTION.fields.map((f) => ({ ...f })) },
      { ...MEDICAL_INFO_SECTION, id: uid(), fields: MEDICAL_INFO_SECTION.fields.map((f) => ({ ...f })) },
      { ...PRESCRIPTIONS_SECTION, fields: PRESCRIPTIONS_SECTION.fields.map((f) => ({ ...f })) }
    ]
  };
}

export function buildConsultationTemplate(): FormSchema {
  return {
    id: uid(),
    name: 'Consultation Intake',
    status: 'draft',
    sections: [
      { ...PERSONAL_INFO_SECTION, id: 'personal-info', fields: PERSONAL_INFO_SECTION.fields.map((f) => ({ ...f })) },
      {
        id: uid(),
        name: 'Medical Information',
        type: 'standard',
        fields: [...MEDICAL_INFO_SECTION.fields.map((f) => ({ ...f })), { id: uid(), label: 'Consultation Fee', type: 'number', required: false }]
      },
      { ...PRESCRIPTIONS_SECTION, fields: PRESCRIPTIONS_SECTION.fields.map((f) => ({ ...f })) }
    ]
  };
}

export function buildFollowUpTemplate(): FormSchema {
  return {
    id: uid(),
    name: 'Follow-up Visit',
    status: 'draft',
    sections: [
      { ...PERSONAL_INFO_SECTION, id: 'personal-info', fields: PERSONAL_INFO_SECTION.fields.map((f) => ({ ...f })) },
      {
        id: uid(),
        name: 'Medical Information',
        type: 'repeatable',
        rowLabel: 'Visit',
        addButtonLabel: 'Add another visit',
        fields: [...MEDICAL_INFO_SECTION.fields.map((f) => ({ ...f })), { id: uid(), label: 'Lab Results', type: 'file', required: false }]
      },
      { ...PRESCRIPTIONS_SECTION, fields: PRESCRIPTIONS_SECTION.fields.map((f) => ({ ...f })) }
    ]
  };
}

export const STARTER_TEMPLATES = [
  { key: 'default', label: 'Default Intake', description: 'Personal info, medical history & prescriptions', build: buildDefaultTemplate },
  { key: 'consultation', label: 'Consultation Intake', description: 'Default template plus consultation fee', build: buildConsultationTemplate },
  { key: 'followup', label: 'Follow-up Visit', description: 'Default template plus lab results upload', build: buildFollowUpTemplate }
] as const;
