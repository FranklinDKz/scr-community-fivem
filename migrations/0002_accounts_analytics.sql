ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'discord';
ALTER TABLE users ADD COLUMN last_login_at TEXT;
ALTER TABLE users ADD COLUMN last_login_ip TEXT;
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

ALTER TABLE orders ADD COLUMN provider TEXT NOT NULL DEFAULT 'mercadopago';
ALTER TABLE orders ADD COLUMN provider_updated_at TEXT;

CREATE TABLE page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_page_views_created ON page_views(created_at);
CREATE INDEX idx_page_views_user ON page_views(user_id, created_at);
CREATE INDEX idx_page_views_visitor ON page_views(visitor_hash, created_at);
