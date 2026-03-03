import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TauriService, Producto, Venta, MovimientoInventario } from './tauri.service';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private productosSubject = new BehaviorSubject<Producto[]>([]);
  private ventasSubject = new BehaviorSubject<Venta[]>([]);
  private movimientosSubject = new BehaviorSubject<MovimientoInventario[]>([]);
  private cargandoSubject = new BehaviorSubject<boolean>(false);

  productos$ = this.productosSubject.asObservable();
  ventas$ = this.ventasSubject.asObservable();
  movimientos$ = this.movimientosSubject.asObservable();
  cargando$ = this.cargandoSubject.asObservable();

  constructor(private tauriService: TauriService) {
    this.cargarDatosIniciales();
  }

  private async cargarDatosIniciales() {
    this.cargandoSubject.next(true);
    try {
      const productos = await this.tauriService.obtenerProductos();
      this.productosSubject.next(productos);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      this.cargandoSubject.next(false);
    }
  }

  // Productos
  async obtenerProductos(): Promise<Producto[]> {
    try {
      const productos = await this.tauriService.obtenerProductos();
      this.productosSubject.next(productos);
      return productos;
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  }

  async agregarProducto(producto: Producto): Promise<void> {
    this.cargandoSubject.next(true);
    try {
      await this.tauriService.agregarProducto(producto);
      await this.obtenerProductos(); // Recargar lista
    } catch (error) {
      console.error('Error agregando producto:', error);
      throw error;
    } finally {
      this.cargandoSubject.next(false);
    }
  }

  async actualizarProducto(id: number, producto: Producto): Promise<void> {
    this.cargandoSubject.next(true);
    try {
      await this.tauriService.actualizarProducto(id, producto);
      await this.obtenerProductos(); // Recargar lista
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    } finally {
      this.cargandoSubject.next(false);
    }
  }

  async eliminarProducto(id: number): Promise<void> {
    this.cargandoSubject.next(true);
    try {
      await this.tauriService.eliminarProducto(id);
      await this.obtenerProductos(); // Recargar lista
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    } finally {
      this.cargandoSubject.next(false);
    }
  }

  // Ventas
  async registrarVenta(venta: Venta): Promise<void> {
    this.cargandoSubject.next(true);
    try {
      await this.tauriService.registrarVenta(venta);
      // Aquí podrías recargar las ventas si es necesario
    } catch (error) {
      console.error('Error registrando venta:', error);
      throw error;
    } finally {
      this.cargandoSubject.next(false);
    }
  }

  // Exportación
  async exportarInventario(): Promise<string> {
    try {
      const productos = this.productosSubject.value;
      return await this.tauriService.exportarACsv(productos);
    } catch (error) {
      console.error('Error exportando inventario:', error);
      throw error;
    }
  }

  // Backup
  async crearBackup(): Promise<string> {
    try {
      return await this.tauriService.guardarBackup();
    } catch (error) {
      console.error('Error creando backup:', error);
      throw error;
    }
  }

  // Reportes
  async generarReporteInventario(fechaInicio: string, fechaFin: string): Promise<any> {
    try {
      return await this.tauriService.generarReporteInventario(fechaInicio, fechaFin);
    } catch (error) {
      console.error('Error generando reporte:', error);
      throw error;
    }
  }

  // Utilidades
  async abrirCarpetaDocumentos(): Promise<void> {
    try {
      await this.tauriService.abrirCarpetaDocumentos();
    } catch (error) {
      console.error('Error abriendo carpeta de documentos:', error);
      throw error;
    }
  }

  // Métodos para obtener estado actual
  getProductos(): Producto[] {
    return this.productosSubject.value;
  }

  getProductoById(id: number): Producto | undefined {
    return this.productosSubject.value.find(p => p.id === id);
  }

  getProductosBajoStock(limite: number = 10): Producto[] {
    return this.productosSubject.value.filter(p => p.cantidad < limite);
  }

  getTotalValorInventario(): number {
    return this.productosSubject.value.reduce((total, p) => total + (p.precio * p.cantidad), 0);
  }

  getTotalProductos(): number {
    return this.productosSubject.value.length;
  }

  isCargando(): boolean {
    return this.cargandoSubject.value;
  }
}
