-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    reset_token VARCHAR(255),
    reset_token_expiry DATETIME,
    avatar VARCHAR(255),
    member_since DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
    product_code VARCHAR(50) PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    entries REAL DEFAULT 0,
    exits REAL DEFAULT 0,
    stock REAL DEFAULT 0,
    stock_limit REAL,
    product_unit VARCHAR(50),
    warehouse VARCHAR(100),
    entity VARCHAR(100),
    product_description TEXT,
    unit_price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    entity VARCHAR(100) NOT NULL,
    warehouse VARCHAR(100) NOT NULL,
    supplier VARCHAR(100) NOT NULL,
    document VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_products table
CREATE TABLE IF NOT EXISTS purchase_products (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id)
);

-- Create movements table
CREATE TABLE IF NOT EXISTS movements (
    id TEXT PRIMARY KEY,
    movement_type VARCHAR(20) NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    quantity REAL NOT NULL,
    reason TEXT,
    label VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    purchase_id TEXT,
    FOREIGN KEY (product_code) REFERENCES inventory(product_code),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id)
);

-- Create reception_reports table
CREATE TABLE IF NOT EXISTS reception_reports (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL,
    details TEXT NOT NULL,
    created_by_name VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id)
);

-- Create delivery_reports table
CREATE TABLE IF NOT EXISTS delivery_reports (
    id TEXT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    entity VARCHAR(100),
    warehouse VARCHAR(100),
    document VARCHAR(50),
    products TEXT,
    date DATETIME,
    report_type VARCHAR(20) DEFAULT 'delivery',
    reason TEXT,
    created_by_name VARCHAR(100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_inventory_product_name ON inventory(product_name);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse);
CREATE INDEX IF NOT EXISTS idx_purchases_entity ON purchases(entity);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_product_code ON movements(product_code);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reception_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_delivery_reports_date ON delivery_reports(date);
