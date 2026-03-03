import { Injectable, Injector } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';

import { ErrorHandlerService } from './error-handler.service';

import { UserService } from './auth/user.service';



// Importar tipos del backend

import {

  Inventory, CreateInventoryDto, UpdateInventoryDto,

  Purchase, PurchaseProduct, PurchaseWithProducts, CreatePurchaseDto,

  Movement, MovementWithDetails, CreateMovementDto, CreateExitMovementDto, CreateReturnMovementDto,

  LoginRequest, SignupRequest, AuthResponse, User,

  DashboardStats, SystemSettings, UpdateSystemSettingsDto,

  MovementStatistics, ApiResponse,

  Company, CreateCompanyDto, UpdateCompanyDto,

  FixedAsset, CreateFixedAssetDto, UpdateFixedAssetDto,

  FixedAssetDepreciation, DepreciationGroup

} from '../../types/backend-models';



// Interfaces legacy para compatibilidad

export interface Producto {

  id: number;

  nombre: string;

  descripcion?: string;

  cantidad: number;

  precio: number;

  categoria: string;

  proveedor?: string;

  fecha_ingreso?: string;

}



export interface Venta {

  id: number;

  productos: ItemVenta[];

  cliente?: string;

  total: number;

  fecha: string;

  vendedor: string;

}



export interface ItemVenta {

  producto_id: number;

  cantidad: number;

  precio_unitario: number;

  subtotal: number;

}



export interface MovimientoInventario {

  id: number;

  producto_id: number;

  tipo: string; // "entrada" o "salida"

  cantidad: number;

  motivo: string;

  fecha: string;

  usuario: string;

}



@Injectable({

  providedIn: 'root'

})

export class TauriService {



  constructor(private injector: Injector) { 

    console.log('🔍 TauriService inicializado');

    console.log('🔍 ¿Está en desktop?', this.isDesktop());

  }



  // Get UserService lazily to avoid circular dependency

  private getUserService(): UserService {

    return this.injector.get(UserService);

  }



  // Get current user name

  async getCurrentUser(): Promise<string> {

    const userService = this.getUserService();

    const userName = await userService.getCurrentUserName();

    console.log('🔍 TauriService - Usuario actual:', userName);

    console.log('🔍 TauriService - UserService disponible:', !!userService);

    return userName || 'Usuario';

  }



  // Detectar si estamos en modo desktop (Tauri) o web

  isDesktop(): boolean {

    // Verificación robusta para producción

    try {

      return typeof window !== 'undefined' && 

             (window.__TAURI__ || 

              typeof (window as any).__TAURI_INTERNALS__ !== 'undefined');

    } catch {

      return false;

    }

  }



  // Productos

  async obtenerProductos(): Promise<Producto[]> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('obtener_productos');

      } catch (error) {

        console.error('Error en modo desktop:', error);

        return this.getProductosMock();

      }

    } else {

      return this.getProductosMock();

    }

  }



  async agregarProducto(producto: Producto): Promise<string> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('agregar_producto', { producto });

      } catch (error) {

        console.error('Error en modo desktop:', error);

        return 'Producto agregado (modo mock)';

      }

    } else {

      return 'Producto agregado (modo web)';

    }

  }



  async actualizarProducto(id: number, producto: Producto): Promise<string> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('actualizar_producto', { id, producto });

      } catch (error) {

        console.error('Error en modo desktop:', error);

        return 'Producto actualizado (modo mock)';

      }

    } else {

      return 'Producto actualizado (modo web)';

    }

  }



  async eliminarProducto(id: number): Promise<string> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('eliminar_producto', { id });

      } catch (error) {

        console.error('Error en modo desktop:', error);

        return 'Producto eliminado (modo mock)';

      }

    } else {

      return 'Producto eliminado (modo web)';

    }

  }



  // Ventas

  async registrarVenta(venta: Venta): Promise<string> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('registrar_venta', { venta });

      } catch (error) {

        console.error('Error en modo desktop:', error);

        return 'Venta registrada (modo mock)';

      }

    } else {

      return 'Venta registrada (modo web)';

    }

  }



  // Exportación

  async exportarACsv(productos: Producto[]): Promise<string> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('exportar_a_csv', { productos });

      } catch (error) {

        console.error('Error en modo desktop:', error);

        return this.exportarCSVMock(productos);

      }

    } else {

      return this.exportarCSVMock(productos);

    }

  }



  async abrirCarpetaDocumentos(): Promise<void> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('abrir_carpeta_documentos');

      } catch (error) {

        console.error('Error en modo desktop:', error);

      }

    } else {

      console.log('Abrir carpeta no disponible en modo web');

    }

  }



  // Backup

  async guardarBackup(): Promise<string> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('guardar_backup');

      } catch (error) {

        console.error('Error en modo desktop:', error);

        return 'Backup creado (modo mock)';

      }

    } else {

      return 'Backup creado (modo web)';

    }

  }



  // Conexión con backend externo

  async conectarBackendExterno(url: string, datos: any): Promise<string> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('conectar_backend_externo', { url, datos });

      } catch (error) {

        console.error('Error en modo desktop:', error);

        return 'Conexión simulada (modo mock)';

      }

    } else {

      try {

        const response = await fetch(url, {

          method: 'POST',

          headers: {

            'Content-Type': 'application/json',

          },

          body: JSON.stringify(datos)

        });

        return await response.text();

      } catch (error) {

        console.error('Error en modo web:', error);

        return 'Error de conexión (modo web)';

      }

    }

  }



  async verificarConexionBackend(url: string): Promise<boolean> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('verificar_conexion_backend', { url });

      } catch (error) {

        console.error('Error en modo desktop:', error);

        return false;

      }

    } else {

      try {

        const response = await fetch(url);

        return response.ok;

      } catch (error) {

        console.error('Error en modo web:', error);

        return false;

      }

    }

  }



  // Reportes

  async generarReporteInventario(fechaInicio: string, fechaFin: string): Promise<any> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('generar_reporte_inventario', { 

          fechaInicio, 

          fechaFin 

        });

      } catch (error) {

        console.error('Error en modo desktop:', error);

        return this.generarReporteMock(fechaInicio, fechaFin);

      }

    } else {

      return this.generarReporteMock(fechaInicio, fechaFin);

    }

  }



  // ========== INVENTARIO MODERNO ==========

  async getInventory(filters?: any): Promise<Inventory[]> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_inventory', { filters });

      } catch (error) {

        console.error('Error en get_inventory:', error);

        return this.getInventoryMock();

      }

    } else {

      return this.getInventoryMock();

    }

  }



  async createInventoryItem(item: CreateInventoryDto): Promise<Inventory> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('create_inventory_item', { item });

      } catch (error) {

        console.error('Error en create_inventory_item:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async updateInventoryItem(id: string, item: UpdateInventoryDto): Promise<Inventory> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('update_inventory_item', { id, item });

      } catch (error) {

        console.error('Error en update_inventory_item:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async deleteInventoryItem(id: string): Promise<void> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('delete_inventory_item', { id });

      } catch (error) {

        console.error('Error en delete_inventory_item:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  // ========== COMPRAS ==========

  async getPurchases(): Promise<PurchaseWithProducts[]> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_purchases');

      } catch (error) {

        console.error('Error en get_purchases:', error);

        return [];

      }

    } else {

      return [];

    }

  }



  async createPurchase(purchase: CreatePurchaseDto): Promise<PurchaseWithProducts> {

    if (this.isDesktop()) {

      try {

        console.log('🔄 Enviando datos de createPurchase a Tauri:', purchase);

        

        // Get current user name

        const currentUser = await this.getCurrentUser();

        console.log('👤 Usuario actual en createPurchase:', currentUser);

        

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        

        // Add timeout to prevent hanging

        const result = await Promise.race([

          invoke('create_purchase', { purchase, user_name: currentUser }),

          new Promise((_, reject) => 

            setTimeout(() => reject(new Error('Timeout after 30 seconds')), 30000)

          )

        ]);

        

        console.log('✅ Respuesta de createPurchase (Tauri):', result);

        return result as PurchaseWithProducts;

      } catch (error: any) {

        console.error('❌ Error en create_purchase:', error);

        console.error('❌ Error details:', {

          message: error?.message,

          stack: error?.stack,

          name: error?.name,

          toString: error?.toString()

        });

        

        // Don't throw error that could crash the app, return a mock response

        throw new Error(`Error al crear compra: ${error?.message || 'Error desconocido'}`);

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async updatePurchase(id: string, purchase: CreatePurchaseDto): Promise<PurchaseWithProducts> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('update_purchase', { id, purchase });

      } catch (error) {

        console.error('Error en update_purchase:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async deletePurchase(id: string): Promise<void> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('delete_purchase', { id });

      } catch (error) {

        console.error('Error en delete_purchase:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async getPurchaseById(id: string): Promise<PurchaseWithProducts> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_purchase_by_id', { id });

      } catch (error) {

        console.error('Error en get_purchase_by_id:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  // ========== MOVIMIENTOS ==========

  async getMovements(): Promise<MovementWithDetails[]> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_movements');

      } catch (error) {

        console.error('Error en get_movements:', error);

        return [];

      }

    } else {

      return [];

    }

  }



  async createMovementExit(movement: CreateExitMovementDto): Promise<Movement> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('create_movement_exit', { createDto: movement });

      } catch (error) {

        console.error('Error en create_movement_exit:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async createMovementReturn(movement: CreateReturnMovementDto): Promise<Movement[]> {

    if (this.isDesktop()) {

      try {

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('create_movement_return', { 

          purchaseId: movement.purchase_id, 

          reason: movement.reason,

          userName: movement.user_name || null

        });

      } catch (error) {

        console.error('Error en create_movement_return:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async createDirectEntry(movement: CreateMovementDto): Promise<Movement> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('create_direct_entry', { movement });

      } catch (error) {

        console.error('Error en create_direct_entry:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async deleteMovement(id: string): Promise<void> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('delete_movement', { id });

      } catch (error) {

        console.error('Error en delete_movement:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async getMovementStatistics(days: number): Promise<MovementStatistics> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_movement_statistics', { days });

      } catch (error) {

        console.error('Error en get_movement_statistics:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  // ========== AUTENTICACIÓN ==========

  async login(credentials: { email: string, password: string }): Promise<AuthResponse> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        // Convertir email a username para compatibilidad con backend

        const loginData = { email: credentials.email, password: credentials.password };

        return await invoke('login', loginData);

      } catch (error: any) {

        console.error('Error en login:', error);

        

        // Si es un error de comando no encontrado, intentar reintentar después de un breve delay

        if (error?.message?.includes('Command login not found') || error?.message?.includes('not found')) {

          console.log('Comando no disponible, reintentando en 2 segundos...');

          await new Promise(resolve => setTimeout(resolve, 2000));

          

          try {

            const { invoke } = await import('@tauri-apps/api/core');

            const loginData = { email: credentials.email, password: credentials.password };

            return await invoke('login', loginData);

          } catch (retryError) {

            console.error('Error en reintento de login:', retryError);

            throw retryError;

          }

        }

        

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async signup(userData: { 

    firstName: string, 

    lastName: string, 

    company: string, 

    email: string, 

    phone: string, 

    password: string 

  }): Promise<AuthResponse> {

    if (this.isDesktop()) {

      try {

        console.log('Enviando datos de signup a Tauri:', userData);

        

        // Intentar import dinámico primero

        try {

          const { invoke } = await import('@tauri-apps/api/core');

          const result = await invoke('signup', userData);

          console.log('Respuesta de signup (Tauri):', result);

          return result as AuthResponse;

        } catch (importError) {

          // Fallback directo a window.__TAURI__.core

          console.warn('Import dinámico falló, usando fallback directo:', importError);

          const invoke = (window as any).__TAURI__?.core?.invoke;

          if (!invoke) {

            throw new Error('API de Tauri no disponible');

          }

          const result = await invoke('signup', userData);

          console.log('Respuesta de signup (fallback):', result);

          return result as AuthResponse;

        }

      } catch (error) {

        console.error('Error en signup (Tauri):', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async resetPasswordDirect(email: string, newPassword: string): Promise<string> {

    if (this.isDesktop()) {

      try {

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('reset_password_direct', { email, newPassword });

      } catch (error: any) {

        console.error('Error en resetPasswordDirect:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async logout(): Promise<void> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('logout');

      } catch (error: any) {

        console.error('Error en logout:', error);

        

        // Si es un error de comando no encontrado, intentar reintentar después de un breve delay

        if (error?.message?.includes('Command logout not found') || error?.message?.includes('not found')) {

          console.log('Comando logout no disponible, reintentando en 2 segundos...');

          await new Promise(resolve => setTimeout(resolve, 2000));

          

          try {

            const { invoke } = await import('@tauri-apps/api/core');

            return await invoke('logout');

          } catch (retryError) {

            console.error('Error en reintento de logout:', retryError);

            throw retryError;

          }

        }

        

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  // ========== REPORTES AVANZADOS ==========

  async exportToExcel(reportType: string): Promise<ArrayBuffer> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        const data = await invoke('export_to_excel', { reportType });

        return data as ArrayBuffer;

      } catch (error) {

        console.error('Error en export_to_excel:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async exportToPdf(reportType: string): Promise<ArrayBuffer> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        const data = await invoke('export_to_pdf', { reportType });

        return data as ArrayBuffer;

      } catch (error) {

        console.error('Error en export_to_pdf:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async getReports(): Promise<any> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_reports');

      } catch (error) {

        console.error('Error en get_reports:', error);

        return null;

      }

    } else {

      return null;

    }

  }



  async getDashboardStats(): Promise<DashboardStats> {

    if (this.isDesktop()) {

      try {

        console.log('📊 TauriService - Invocando get_dashboard_stats en backend Rust');

        

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        const result = await invoke('get_dashboard_stats');

        

        console.log('📊 TauriService - Respuesta recibida del backend:', result);

        return result as DashboardStats;

      } catch (error) {

        console.error('❌ TauriService - Error en get_dashboard_stats:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  // ========== LÍMITES DE STOCK ==========

  async setStockLimit(productCode: string, stockLimit: number): Promise<any> {

    if (this.isDesktop()) {

      try {

        console.log('📊 TauriService - Estableciendo límite de stock:', productCode, stockLimit);

        

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        const result = await invoke('set_stock_limit', { productCode, stockLimit });

        

        console.log('📊 TauriService - Límite de stock establecido:', result);

        return result;

      } catch (error) {

        console.error('❌ TauriService - Error en set_stock_limit:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async removeStockLimit(productCode: string): Promise<string> {

    if (this.isDesktop()) {

      try {

        console.log('📊 TauriService - Eliminando límite de stock:', productCode);

        

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        const result = await invoke('remove_stock_limit', { productCode });

        

        console.log('📊 TauriService - Límite de stock eliminado:', result);

        return result as string;

      } catch (error) {

        console.error('❌ TauriService - Error en remove_stock_limit:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async getStockLimits(): Promise<any[]> {

    if (this.isDesktop()) {

      try {

        console.log('📊 TauriService - Obteniendo límites de stock');

        

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        const result = await invoke('get_stock_limits');

        

        console.log('📊 TauriService - Límites de stock obtenidos:', result);

        return result as any[];

      } catch (error) {

        console.error('❌ TauriService - Error en get_stock_limits:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  // ========== CONFIGURACIÓN ==========

  async getCurrentUserProfile(): Promise<any> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        const result = await invoke('get_user_profile');

        console.log('Perfil de usuario desde Tauri:', result);

        return result;

      } catch (error) {

        console.error('Error en getCurrentUserProfile:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async getUserProfile(): Promise<any> {

    if (this.isDesktop()) {

      try {

        console.log('Obteniendo perfil de usuario desde Tauri...');

        

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        const result = await invoke('get_user_profile');

        console.log('Respuesta de get_user_profile (Tauri):', result);

        return result;

      } catch (error: any) {

        console.error('Error en get_user_profile:', error);

        

        // Si es un error de comando no encontrado, intentar reintentar después de un breve delay

        if (error?.message?.includes('Command get_user_profile not found') || error?.message?.includes('not found')) {

          console.log('Comando get_user_profile no disponible, reintentando en 2 segundos...');

          await new Promise(resolve => setTimeout(resolve, 2000));

          

          try {

            const { invoke } = await import('@tauri-apps/api/core');

            const result = await invoke('get_user_profile');

            console.log('Respuesta de get_user_profile (reintento):', result);

            return result;

          } catch (retryError) {

            console.error('Error en reintento de get_user_profile:', retryError);

            throw retryError;

          }

        }

        

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async updateAvatar(file: File): Promise<any> {

    if (this.isDesktop()) {

      try {

        console.log('Actualizando avatar desde Tauri...');

        

        // Convert file to base64 or bytes for Tauri

        const arrayBuffer = await file.arrayBuffer();

        const uint8Array = new Uint8Array(arrayBuffer);

        

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        const result = await invoke('update_avatar', {

          fileName: file.name,

          fileType: file.type,

          fileData: Array.from(uint8Array)

        });

        console.log('Respuesta de update_avatar (Tauri):', result);

        return result;

      } catch (error: any) {

        console.error('Error en update_avatar:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async getSystemSettings(): Promise<SystemSettings> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_system_settings');

      } catch (error) {

        console.error('Error en get_system_settings:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  async updateSystemSettings(settings: UpdateSystemSettingsDto): Promise<SystemSettings> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('update_system_settings', { updateDto: settings });

      } catch (error) {

        console.error('Error en update_system_settings:', error);

        throw error;

      }

    } else {

      throw new Error('No implementado en modo web');

    }

  }



  // Métodos mock para modo web

  private getInventoryMock(): Inventory[] {

    return [

      {

        id: "1",

        product_code: "LAP001",

        product_name: "Laptop Dell XPS",

        product_description: "Laptop de 15 pulgadas, 16GB RAM",

        stock: 5,

        unit_price: 1299.99,

        warehouse: "Principal",

        entity: "Tecnología",

        stock_limit: 10,

        created_at: "2024-01-15T10:00:00Z"

      },

      {

        id: "2", 

        product_code: "MOU001",

        product_name: "Mouse Inalámbrico",

        product_description: "Mouse ergonómico inalámbrico",

        stock: 50,

        unit_price: 29.99,

        warehouse: "Principal",

        entity: "Accesorios",

        stock_limit: 20,

        created_at: "2024-01-20T10:00:00Z"

      }

    ];

  }



  private getProductosMock(): Producto[] {

    return [

      {

        id: 1,

        nombre: "Laptop Dell XPS",

        descripcion: "Laptop de 15 pulgadas, 16GB RAM",

        cantidad: 5,

        precio: 1299.99,

        categoria: "Electrónica",

        proveedor: "Dell Inc.",

        fecha_ingreso: "2024-01-15"

      },

      {

        id: 2,

        nombre: "Mouse Inalámbrico",

        descripcion: "Mouse ergonómico inalámbrico",

        cantidad: 50,

        precio: 29.99,

        categoria: "Accesorios",

        proveedor: "Logitech",

        fecha_ingreso: "2024-01-20"

      }

    ];

  }



  private exportarCSVMock(productos: Producto[]): string {

    let contenido = "ID,Nombre,Descripción,Cantidad,Precio,Categoría,Proveedor,Fecha Ingreso\n";

    

    productos.forEach(producto => {

      const descripcion = producto.descripcion || '';

      const proveedor = producto.proveedor || '';

      const fecha = producto.fecha_ingreso || '';

      

      contenido += `${producto.id},${producto.nombre},"${descripcion}",${producto.cantidad},${producto.precio},${producto.categoria},"${proveedor}",${fecha}\n`;

    });

    

    // En modo web, descargar como archivo

    const blob = new Blob([contenido], { type: 'text/csv' });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = 'inventario_exportado.csv';

    a.click();

    window.URL.revokeObjectURL(url);

    

    return 'Archivo CSV descargado';

  }



  private generarReporteMock(fechaInicio: string, fechaFin: string): any {

    return {

      fecha_generacion: new Date().toISOString(),

      periodo: {

        inicio: fechaInicio,

        fin: fechaFin

      },

      estadisticas: {

        total_productos: 2,

        total_valor_inventario: 14599.90,

        productos_bajo_stock: 0

      },

      productos_bajo_stock: []

    };

  }



  // Métodos para control de ventana (solo desktop)

  async getVersion(): Promise<string> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_app_version');

      } catch (error) {

        return '1.0.0';

      }

    } else {

      return 'Web Version';

    }

  }



  async minimizarVentana(): Promise<void> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('minimize_window');

      } catch (error) {

        console.error('Error minimizing window:', error);

      }

    }

  }



  async maximizarVentana(): Promise<void> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('maximize_window');

      } catch (error) {

        console.error('Error maximizing window:', error);

      }

    }

  }



  async cerrarVentana(): Promise<void> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('close_window');

      } catch (error) {

        console.error('Error closing window:', error);

      }

    }

  }



  async createInvoice(invoice: any): Promise<any> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('create_invoice', { invoice });

      } catch (error) {

        console.error('Error en create_invoice:', error);

        throw error;

      }

    } else {

      throw new Error('createInvoice solo disponible en modo desktop');

    }

  }



  async getInvoices(filters?: any): Promise<any> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_invoices', { filters });

      } catch (error) {

        console.error('Error en getInvoices:', error);

        throw error;

      }

    } else {

      throw new Error('getInvoices solo disponible en modo desktop');

    }

  }



  async getInvoiceById(id: string): Promise<any> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_invoice_by_id', { invoiceId: id });

      } catch (error) {

        console.error('Error en getInvoiceById:', error);

        throw error;

      }

    } else {

      throw new Error('getInvoiceById solo disponible en modo desktop');

    }

  }



  async updateInvoiceStatus(id: string, status: string): Promise<any> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('update_invoice_status', { invoiceId: id, status: status });

      } catch (error) {

        console.error('Error en updateInvoiceStatus:', error);

        throw error;

      }

    } else {

      throw new Error('updateInvoiceStatus solo disponible en modo desktop');

    }

  }



  // Método para limpiar la base de datos

  async cleanDatabase(): Promise<string> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('limpiar_base_datos');

      } catch (error) {

        console.error('Error en cleanDatabase:', error);

        throw error;

      }

    } else {

      throw new Error('cleanDatabase solo disponible en modo desktop');

    }

  }



  // === Licencia ===

  async getLicenseStatus(): Promise<any> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('get_license_status');

      } catch (error) {

        console.error('Error en getLicenseStatus:', error);

        throw error;

      }

    } else {

      throw new Error('getLicenseStatus solo disponible en modo desktop');

    }

  }



  async activateLicense(licenseKey: string): Promise<any> {

    if (this.isDesktop()) {

      try {

        // @ts-ignore - Tauri API disponible solo en desktop

        const { invoke } = await import('@tauri-apps/api/core');

        return await invoke('activate_license', { licenseKey: licenseKey });

      } catch (error) {

        console.error('Error en activateLicense:', error);

        throw error;

      }

    } else {

      throw new Error('activateLicense solo disponible en modo desktop');

    }

  }

  // ═══════════════════════════════════════════════════════════
  // === EMPRESAS ===
  // ═══════════════════════════════════════════════════════════

  private async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    // @ts-ignore
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke(command, args);
  }

  async getCompanies(): Promise<Company[]> {
    return this.invoke<Company[]>('get_companies');
  }

  async getCompany(id: number): Promise<Company> {
    return this.invoke<Company>('get_company', { id });
  }

  async getActiveCompany(): Promise<Company> {
    return this.invoke<Company>('get_active_company');
  }

  async setActiveCompany(companyId: number): Promise<Company> {
    return this.invoke<Company>('set_active_company', { companyId });
  }

  async createCompany(dto: CreateCompanyDto): Promise<Company> {
    return this.invoke<Company>('create_company', { dto });
  }

  async updateCompany(id: number, dto: UpdateCompanyDto): Promise<Company> {
    return this.invoke<Company>('update_company', { id, dto });
  }

  async deleteCompany(id: number): Promise<void> {
    return this.invoke<void>('delete_company', { id });
  }

  async getImageAsBase64(path: string): Promise<string> {
    return this.invoke<string>('get_image_as_base64', { path });
  }

  // ═══════════════════════════════════════════════════════════
  // === ACTIVOS FIJOS ===
  // ═══════════════════════════════════════════════════════════

  async getFixedAssets(): Promise<FixedAsset[]> {
    return this.invoke<FixedAsset[]>('get_fixed_assets');
  }

  async getFixedAsset(id: number): Promise<FixedAsset> {
    return this.invoke<FixedAsset>('get_fixed_asset', { id });
  }

  async createFixedAsset(dto: CreateFixedAssetDto): Promise<FixedAsset> {
    return this.invoke<FixedAsset>('create_fixed_asset', { dto });
  }

  async updateFixedAsset(id: number, dto: UpdateFixedAssetDto): Promise<FixedAsset> {
    return this.invoke<FixedAsset>('update_fixed_asset', { id, dto });
  }

  async deleteFixedAsset(id: number): Promise<void> {
    return this.invoke<void>('delete_fixed_asset', { id });
  }

  async calculateDepreciation(year?: number): Promise<FixedAssetDepreciation[]> {
    return this.invoke<FixedAssetDepreciation[]>('calculate_depreciation', { year: year ?? null });
  }

  async getDepreciationCatalog(): Promise<DepreciationGroup[]> {
    return this.invoke<DepreciationGroup[]>('get_depreciation_catalog');
  }

  // ═══════════════════════════════════════════════════════════
  // === HISTORIAL DE MOVIMIENTOS POR PRODUCTO ===
  // ═══════════════════════════════════════════════════════════

  async getProductMovementHistory(productCode: string): Promise<MovementWithDetails[]> {
    return this.invoke<MovementWithDetails[]>('get_product_movement_history', { productCode });
  }

}

