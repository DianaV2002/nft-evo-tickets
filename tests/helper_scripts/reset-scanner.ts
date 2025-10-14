#!/usr/bin/env tsx
import Database from 'better-sqlite3';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Reset scanner state to start scanning from scratch
 * This will make the scanner re-process recent transactions
 * Duplicates will be skipped automatically
 */

console.log('🔄 Resetting scanner state...\n');

try {
  const DB_PATH = process.env.LEVEL_DB_PATH || path.join(__dirname, '../backend/level-system/database/level-system.db');

  const db = new Database(DB_PATH);

  // Reset scanner state
  db.prepare(`
    UPDATE scanner_state
    SET last_scanned_signature = NULL,
        last_scan_time = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run();

  console.log('✅ Scanner state reset successfully!');
  console.log('   Next scan will process recent transactions');
  console.log('   (Duplicates will be automatically skipped)\n');

  // Show current state
  const state = db.prepare('SELECT * FROM scanner_state WHERE id = 1').get() as any;
  console.log('Current scanner state:');
  console.log('  - Last scanned signature:', state.last_scanned_signature || 'None (will scan from latest)');
  console.log('  - Last scan time:', state.last_scan_time);
  console.log('  - Total scans:', state.scan_count);
  console.log();

  db.close();

} catch (error) {
  console.error('❌ Error resetting scanner:', error);
  process.exit(1);
}
