CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_key TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  email_key TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  verify_token_hash TEXT,
  verify_expires_at TIMESTAMPTZ,
  reset_token_hash TEXT,
  reset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

-- Allow username-only signups while retaining any legacy email values privately.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email_key DROP NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS player_saves (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS city_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS city_messages_created_idx ON city_messages (created_at);
CREATE INDEX IF NOT EXISTS direct_messages_pair_idx ON direct_messages (sender_id, recipient_id, created_at);
