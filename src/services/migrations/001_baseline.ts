import type { Migration } from './types';

export const migration001: Migration = {
  version: 1,
  up: async (db) => {
    await db.execAsync(`
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
    await db.execAsync(`
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
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        userId TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_pharmacists (
        userId TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);
  }
};
