CREATE TABLE trees (
  id text PRIMARY KEY,
  owner_id text NOT NULL UNIQUE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20),
  created_at double precision NOT NULL
);
CREATE TABLE gifts (
  id text PRIMARY KEY,
  tree_id text NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  kind integer NOT NULL CHECK (kind >= 0 AND kind < 30),
  slot integer NOT NULL CHECK (slot >= 0 AND slot < 30),
  signature text NOT NULL CHECK (char_length(signature) <= 20),
  anonymous integer NOT NULL CHECK (anonymous IN (0, 1)),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 500),
  created_at double precision NOT NULL,
  UNIQUE (tree_id, sender_id),
  UNIQUE (tree_id, slot)
);
CREATE TABLE wechat_accounts (
  subject text PRIMARY KEY,
  user_id text NOT NULL UNIQUE
);
CREATE TABLE wechat_login_tokens (
  token_hash text PRIMARY KEY,
  subject text NOT NULL REFERENCES wechat_accounts(subject),
  message_id text NOT NULL UNIQUE,
  expires_at double precision NOT NULL,
  consumed_at double precision
);
CREATE INDEX wechat_login_expiry ON wechat_login_tokens(expires_at);
CREATE TABLE wechat_sessions (
  token_hash text PRIMARY KEY,
  subject text NOT NULL REFERENCES wechat_accounts(subject),
  created_at double precision NOT NULL,
  expires_at double precision NOT NULL
);
CREATE INDEX wechat_session_expiry ON wechat_sessions(expires_at);
CREATE TABLE migration_receipts (
  nonce text PRIMARY KEY,
  user_id text NOT NULL,
  consumed_at double precision NOT NULL
);
