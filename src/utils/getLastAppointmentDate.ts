import type { IPatient } from '../types';

export function parseDateString(val: string): number | null {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val).getTime();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    const [day, month, year] = val.split('/');
    return new Date(`${year}-${month}-${day}`).getTime();
  }
  return null;
}

export function formatDateForDisplay(val: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  }
  return val;
}

export function getLastAppointmentDate(patient: IPatient): string | null {
  let latest: string | null = null;
  for (const section of patient.customFields?.sections ?? []) {
    for (const fields of section.fields) {
      const val = fields['core-appointment-date'];
      if (typeof val === 'string' && val && (!latest || val > latest)) {
        latest = val;
      }
    }
  }
  return latest;
}

export function getAllAppointmentDates(patient: IPatient): string[] {
  const dates: string[] = [];
  for (const section of patient.customFields?.sections ?? []) {
    for (const fields of section.fields) {
      const val = fields['core-appointment-date'];
      if (typeof val === 'string' && val) dates.push(val);
    }
  }
  return dates;
}
