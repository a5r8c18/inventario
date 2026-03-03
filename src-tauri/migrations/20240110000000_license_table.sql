-- Create license table for application licensing
CREATE TABLE IF NOT EXISTS license (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT NOT NULL,
    activated_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    activated_by TEXT
);

-- Insert initial license (1 year from installation)
INSERT INTO license (license_key, activated_at, expires_at, status, activated_by)
VALUES (
    'INV-INITIAL-INSTALL',
    datetime('now'),
    datetime('now', '+1 year'),
    'active',
    'system'
);
