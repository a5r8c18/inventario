// 📋 Interfaces TypeScript consistentes con el backend Rust

// ========== INVENTARIO ==========
export interface Inventory {
  id: string;
  product_code: string;
  product_name: string;
  product_description?: string;
  stock: number;
  unit_price?: number;
  warehouse?: string;
  entity?: string;
  stock_limit?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateInventoryDto {
  product_code: string;
  product_name: string;
  product_description?: string;
  stock: number;
  unit_price?: number;
  warehouse?: string;
  entity?: string;
  stock_limit?: number;
}

export interface UpdateInventoryDto {
  product_name?: string;
  product_description?: string;
  stock?: number;
  unit_price?: number;
  warehouse?: string;
  entity?: string;
  stock_limit?: number;
}

// ========== COMPRAS ==========
export interface Purchase {
  id: string;
  entity: string;
  warehouse: string;
  supplier: string;
  document: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface PurchaseProduct {
  id: string;
  purchase_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PurchaseWithProducts {
  purchase: Purchase;
  products: PurchaseProduct[];
}

export interface CreatePurchaseDto {
  entity: string;
  warehouse: string;
  supplier: string;
  document: string;
  products: CreatePurchaseProductDto[];
}

export interface CreatePurchaseProductDto {
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

// ========== MOVIMIENTOS ==========
export interface Movement {
  id: string;
  movement_type: string; // "entry" or "exit"
  product_code: string;
  quantity: number;
  reason?: string;
  label?: string;
  user_name?: string;
  created_at: string;
  purchase_id?: string;
}

export interface MovementWithDetails {
  id: string;
  movement_type: string;
  product_code: string;
  quantity: number;
  reason?: string;
  label?: string;
  user_name?: string;
  created_at: string;
  purchase_id?: string;
  product_name?: string;
  product_description?: string;
  product_unit?: string;
  unit_price?: number;
  entity?: string;
  warehouse?: string;
  stock?: number;
  entries?: number;
  exits?: number;
}

export interface CreateMovementDto {
  product_code: string;
  movement_type: string;
  quantity: number;
  reason?: string;
  label?: string;
  user_name?: string;
  purchase_id?: string;
}

export interface CreateExitMovementDto {
  product_code: string;
  quantity: number;
  reason?: string;
  label?: string;
  user_name?: string;
  unit_price?: number;
}

export interface CreateReturnMovementDto {
  purchase_id: string;
  reason: string;
  user_name?: string;
}

// ========== AUTENTICACIÓN ==========
export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  created_at: string;
}

// ========== REPORTES ==========
export interface ReceptionReport {
  id: string;
  supplier: string;
  document_number: string;
  received_at: string;
  total_products: number;
  status: string;
}

export interface DeliveryReport {
  id: string;
  client: string;
  document_number: string;
  delivered_at: string;
  total_products: number;
  status: string;
}

export interface DashboardStats {
  total_products: number;
  total_purchases: number;
  total_movements: number;
  low_stock_products: number;
  recent_purchases: number;
  recent_movements: number;
  // Datos para gráficos - camelCase desde backend Rust
  productNames: string[];
  stockLevels: number[];
  stockLimits: number[];
  entriesData: number[];
  exitsData: number[];
}

// ========== CONFIGURACIÓN ==========
export interface SystemSettings {
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  default_warehouse?: string;
  default_currency?: string;
  tax_rate?: number;
  low_stock_alert_threshold?: number;
  backup_frequency_days?: number;
  auto_backup_enabled?: boolean;
}

export interface UpdateSystemSettingsDto {
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  default_warehouse?: string;
  default_currency?: string;
  tax_rate?: number;
  low_stock_alert_threshold?: number;
  backup_frequency_days?: number;
  auto_backup_enabled?: boolean;
}

// ========== UTILIDADES ==========
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FilterInventoryDto {
  product_name?: string;
  warehouse?: string;
  entity?: string;
  min_stock?: number;
  max_stock?: number;
}

export interface MovementStatistics {
  period_days: number;
  movements_by_type: Array<{ movement_type: string; count: number }>;
  top_products: Array<{ product_code: string; count: number }>;
}

// ========== EMPRESAS ==========
export interface Company {
  id: number;
  name: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_path?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateCompanyDto {
  name: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_path?: string;
}

export interface UpdateCompanyDto {
  name?: string;
  tax_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_path?: string;
  is_active?: boolean;
}

// ========== ACTIVOS FIJOS ==========
export interface FixedAsset {
  id: number;
  company_id: number;
  asset_code: string;
  name: string;
  description?: string;
  group_number: number;
  subgroup: string;
  subgroup_detail?: string;
  depreciation_rate: number;
  acquisition_value: number;
  current_value: number;
  acquisition_date: string;
  location?: string;
  responsible_person?: string;
  status: string; // 'active' | 'disposed' | 'transferred'
  created_at: string;
  updated_at?: string;
}

export interface CreateFixedAssetDto {
  asset_code: string;
  name: string;
  description?: string;
  group_number: number;
  subgroup: string;
  subgroup_detail?: string;
  acquisition_value: number;
  acquisition_date: string;
  location?: string;
  responsible_person?: string;
}

export interface UpdateFixedAssetDto {
  name?: string;
  description?: string;
  location?: string;
  responsible_person?: string;
  status?: string;
}

export interface FixedAssetDepreciation {
  id: number;
  asset_id: number;
  company_id: number;
  year: number;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  created_at: string;
}

export interface DepreciationSubgroup {
  name: string;
  rate: number;
}

export interface DepreciationGroup {
  group_number: number;
  group_name: string;
  subgroups: DepreciationSubgroup[];
}
