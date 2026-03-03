-- Create system_settings table for persistent configuration
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default settings
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('company_name', 'Mi Empresa');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('company_address', 'Dirección de la empresa');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('company_phone', '+1234567890');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('company_email', 'contacto@empresa.com');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('default_warehouse', 'Principal');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('default_currency', 'USD');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('tax_rate', '15.0');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('low_stock_alert_threshold', '10.0');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('backup_frequency_days', '7');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('auto_backup_enabled', 'true');
