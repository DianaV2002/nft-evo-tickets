-- Authentication Database Schema

-- Users table - stores wallet addresses and basic user info
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Authentication table - stores user authentication data
CREATE TABLE IF NOT EXISTS user_auth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT UNIQUE NOT NULL,
  auth_method TEXT NOT NULL CHECK (auth_method IN ('wallet', 'email', 'google', 'facebook')),
  email TEXT,
  password_hash TEXT, -- Only for email auth
  name TEXT,
  avatar_url TEXT,
  social_provider_id TEXT, -- Provider-specific user ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_auth_wallet ON user_auth(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_auth_email ON user_auth(email);
CREATE INDEX IF NOT EXISTS idx_user_auth_method ON user_auth(auth_method);
