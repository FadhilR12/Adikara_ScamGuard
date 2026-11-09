import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../env';

export type DB = Database.Database;

export function openDb(file = env.databasePath): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(path.join(import.meta.dirname, 'schema.sql'), 'utf8'));
  try {
    const cols = db.pragma('table_info(incident_reports)') as { name: string }[];
    const colNames = new Set(cols.map((c) => c.name));
    if (!colNames.has('perpetrator_name')) db.exec('ALTER TABLE incident_reports ADD COLUMN perpetrator_name TEXT');
    if (!colNames.has('perpetrator_handle')) db.exec('ALTER TABLE incident_reports ADD COLUMN perpetrator_handle TEXT');
    if (!colNames.has('perpetrator_phone')) db.exec('ALTER TABLE incident_reports ADD COLUMN perpetrator_phone TEXT');
  } catch {
    // Abaikan jika tabel belum ada atau error migrasi ringan
  }
  return db;
}
