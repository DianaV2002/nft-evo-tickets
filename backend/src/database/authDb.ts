const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.AUTH_DB_PATH || path.join(__dirname, 'auth.db');
const SCHEMA_PATH = path.join(__dirname, 'auth-schema.sql');

let db: any;


export function initializeAuthDatabase(): any {
  const dbExists = fs.existsSync(DB_PATH);

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better performance

  if (!dbExists) {
    console.log('Creating new authentication database and schema...');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
    console.log('Authentication database initialized successfully');
  }

  return db;
}

export function getAuthDatabase(): any {
  if (!db) {
    db = initializeAuthDatabase();
  }
  return db;
}

export function closeAuthDatabase(): void {
  if (db) {
    db.close();
  }
}

export { Database };
