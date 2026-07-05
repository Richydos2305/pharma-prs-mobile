import { migration001 } from './001_baseline';
import type { Migration } from './types';

export const migrations: Migration[] = [migration001].sort((a, b) => a.version - b.version);
