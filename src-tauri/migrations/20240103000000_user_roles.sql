-- Add role and is_active columns to users table
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'usuario';
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Update existing users to have admin role and be active
UPDATE users SET role = 'admin', is_active = TRUE WHERE role IS NULL OR is_active IS NULL;
