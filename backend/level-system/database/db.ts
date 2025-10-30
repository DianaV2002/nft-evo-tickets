import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.LEVEL_DB_PATH || path.join(__dirname, 'level-system.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db: Database.Database;

export function initializeDatabase(): Database.Database {
  const dbExists = fs.existsSync(DB_PATH);

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better performance

  if (!dbExists) {
    console.log('Creating new database and schema...');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    console.log('Database initialized successfully');
  }

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}

// Export for convenience
export { Database };
