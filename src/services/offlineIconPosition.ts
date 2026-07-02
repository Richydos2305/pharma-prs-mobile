type MeasureFn = () => Promise<{ x: number; y: number } | null>;

let _measureFn: MeasureFn | null = null;

export function registerIconMeasure(fn: MeasureFn | null): void {
  _measureFn = fn;
}

export async function measureIcon(): Promise<{ x: number; y: number } | null> {
  if (!_measureFn) return null;
  return _measureFn();
}
