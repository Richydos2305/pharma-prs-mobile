import * as SQLite from 'expo-sqlite';

const SCHEMA_VERSION = 5;

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('DB not initialized — call db.init() first');
  return _db;
}

export async function init(): Promise<void> {
  _db = await SQLite.openDatabaseAsync('pharmaprs.db');

  // WAL allows concurrent reads during a write — must be set outside a transaction
  await _db.execAsync('PRAGMA journal_mode=WAL');

  // Run migrations for existing installs before creating new tables
  const versionRow = await _db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const storedVersion = versionRow?.user_version ?? 0;

  if (storedVersion < 4) {
    await _db.withTransactionAsync(async () => {
      // Add userId scoping to sync_queue; existing rows default to '' and will be cleared naturally
      await _db!.execAsync("ALTER TABLE sync_queue ADD COLUMN userId TEXT NOT NULL DEFAULT ''");
      // Recreate settings + pharmacists with userId as PK (data repopulates from server on next sync)
      await _db!.execAsync('DROP TABLE IF EXISTS app_settings');
      await _db!.execAsync('CREATE TABLE app_settings (userId TEXT PRIMARY KEY, data TEXT NOT NULL)');
      await _db!.execAsync('DROP TABLE IF EXISTS app_pharmacists');
      await _db!.execAsync('CREATE TABLE app_pharmacists (userId TEXT PRIMARY KEY, data TEXT NOT NULL)');
    });
  }

  if (storedVersion < 5) {
    await _db.withTransactionAsync(async () => {
      // Recreate patients with userId scoping — rows repopulate from server on next sync
      await _db!.execAsync('DROP TABLE IF EXISTS patients');
      await _db!.execAsync(`
        CREATE TABLE patients (
          _id TEXT PRIMARY KEY,
          userId TEXT NOT NULL DEFAULT '',
          fullName TEXT NOT NULL,
          age INTEGER NOT NULL,
          phoneNumber TEXT NOT NULL,
          pharmacistName TEXT NOT NULL DEFAULT '[]',
          customFields TEXT NOT NULL DEFAULT '{"sections":[]}',
          formSnapshot TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          syncStatus TEXT NOT NULL DEFAULT 'synced'
        )
      `);
    });
  }

  await _db.withTransactionAsync(async () => {
    await _db!.execAsync(`
      CREATE TABLE IF NOT EXISTS patients (
        _id TEXT PRIMARY KEY,
        userId TEXT NOT NULL DEFAULT '',
        fullName TEXT NOT NULL,
        age INTEGER NOT NULL,
        phoneNumber TEXT NOT NULL,
        pharmacistName TEXT NOT NULL DEFAULT '[]',
        customFields TEXT NOT NULL DEFAULT '{"sections":[]}',
        formSnapshot TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'synced'
      )
    `);
    await _db!.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        operationType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        failReason TEXT,
        userId TEXT NOT NULL DEFAULT ''
      )
    `);
    await _db!.execAsync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        userId TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);
    await _db!.execAsync(`
      CREATE TABLE IF NOT EXISTS app_pharmacists (
        userId TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);
  });

  await _db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
