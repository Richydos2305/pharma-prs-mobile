/** Generates a short random ID (uid() is private in formBuilder.ts and cannot be imported from there). */
export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}
