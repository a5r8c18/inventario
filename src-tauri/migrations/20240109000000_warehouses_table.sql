-- Create warehouses table for persistent warehouse management
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    manager TEXT,
    phone TEXT,
    is_active INTEGER DEFAULT 1
);
