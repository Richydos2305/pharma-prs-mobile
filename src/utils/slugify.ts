function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export const RESERVED_PREFIX = 'core-';

export const RESERVED_IDS = new Set([
  'core-full-name',
  'core-age',
  'core-phone-number',
  'core-address',
  'core-appointment-date',
  'core-attended-to-by',
  'core-notes',
  'core-prescriptions',
  'core-prescription-text',
  'personal-info'
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlugId(name: string, existingIds: Iterable<string>): string {
  const existing = new Set(existingIds);
  let base = slugify(name);

  if (!base) return uid();

  if (base.startsWith(RESERVED_PREFIX) || RESERVED_IDS.has(base)) {
    base = `custom-${base}`;
  }

  if (!existing.has(base)) return base;

  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
