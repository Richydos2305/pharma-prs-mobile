import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('DB not initialized — call db.init() first');
  return _db;
}

export async function init(): Promise<void> {
  _db = await SQLite.openDatabaseAsync('pharmaprs.db');

  // WAL allows concurrent reads during a write — must be set outside a transaction
  await _db.execAsync('PRAGMA journal_mode=WAL');

  const versionRow = await _db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const storedVersion = versionRow?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version > storedVersion) {
      await _db.withTransactionAsync(() => migration.up(_db!));
      await _db.execAsync(`PRAGMA user_version = ${migration.version}`);
    }
  }
}
