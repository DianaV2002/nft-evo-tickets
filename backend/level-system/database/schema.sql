-- Level System Database Schema

-- Users table - stores wallet addresses and their level data
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT UNIQUE NOT NULL,
  total_points INTEGER DEFAULT 0,
  current_level TEXT DEFAULT '🌱 Seed Planter',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity types table - defines point values for each activity
CREATE TABLE IF NOT EXISTS activity_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activities table - tracks all user activities
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  activity_type_id INTEGER NOT NULL,
  points_earned INTEGER NOT NULL,
  transaction_signature TEXT UNIQUE,
  metadata TEXT, -- JSON string for additional data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_type_id) REFERENCES activity_types(id),
  FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);

-- Scanner state table - tracks last scanned block/signature
CREATE TABLE IF NOT EXISTS scanner_state (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row
  last_scanned_signature TEXT,
  last_scan_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  scan_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_wallet ON activities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_activities_signature ON activities(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

-- Insert default activity types
INSERT OR IGNORE INTO activity_types (name, description, points) VALUES
  ('TICKET_MINTED', 'Minted a new ticket NFT', 100),
  ('TICKET_PURCHASED', 'Purchased a ticket from marketplace', 150),
  ('TICKET_SCANNED', 'Attended an event (ticket scanned)', 200),
  ('TICKET_COLLECTIBLE', 'Upgraded ticket to collectible', 50),
  ('EVENT_CREATED', 'Created a new event', 300);

-- Initialize scanner state
INSERT OR IGNORE INTO scanner_state (id, scan_count) VALUES (1, 0);
