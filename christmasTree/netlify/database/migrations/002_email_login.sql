-- Existing identity rows and session cookies remain valid while an owner binds
-- an email address. No tree, letter, or ownership identifier is rewritten.
CREATE TABLE account_profiles (
  user_id text PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20)
);
INSERT INTO account_profiles (user_id, name) SELECT owner_id, name FROM trees;
CREATE TABLE email_identities (
  email_key text PRIMARY KEY,
  subject text UNIQUE REFERENCES wechat_accounts(subject)
);
CREATE TABLE email_login_challenges (
  id text PRIMARY KEY,
  email_key text NOT NULL,
  code_hash text NOT NULL,
  created_at double precision NOT NULL,
  expires_at double precision NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  delivered boolean NOT NULL DEFAULT false,
  consumed_at double precision,
  link_subject text,
  link_user_id text,
  session_binding text
);
CREATE INDEX email_challenge_email ON email_login_challenges(email_key);
CREATE INDEX email_challenge_expiry ON email_login_challenges(expires_at);
CREATE TABLE email_rate_limits (
  bucket text PRIMARY KEY,
  hits integer NOT NULL,
  resets_at double precision NOT NULL
);
