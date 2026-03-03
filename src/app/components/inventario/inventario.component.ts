import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TauriService, Producto } from '../../services/tauri.service';
import { InventarioService } from '../../services/inventario.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent implements OnInit {
  productos: Producto[] = [];
  cargando = false;
  esDesktop = false;

  constructor(
    private tauriService: TauriService,
    private inventarioService: InventarioService
  ) {
    this.esDesktop = this.tauriService.isDesktop();
  }

  ngOnInit(): void {
    this.cargarProductos();
    this.suscribirseACambios();
  }

  private cargarProductos(): void {
    this.cargando = true;
    this.inventarioService.obtenerProductos()
      .then(productos => {
        this.productos = productos;
      })
      .catch(error => {
        console.error('Error cargando productos:', error);
      })
      .finally(() => {
        this.cargando = false;
      });
  }

  private suscribirseACambios(): void {
    this.inventarioService.productos$.subscribe(productos => {
      this.productos = productos;
    });

    this.inventarioService.cargando$.subscribe(cargando => {
      this.cargando = cargando;
    });
  }

  async agregarProducto(): Promise<void> {
    const nuevoProducto: Producto = {
      id: Date.now(), // ID temporal
      nombre: 'Nuevo Producto',
      descripcion: 'Descripción del producto',
      cantidad: 10,
      precio: 99.99,
      categoria: 'General',
      proveedor: 'Proveedor Ejemplo',
      fecha_ingreso: new Date().toISOString().split('T')[0]
    };

    try {
      await this.inventarioService.agregarProducto(nuevoProducto);
      console.log('Producto agregado exitosamente');
    } catch (error) {
      console.error('Error agregando producto:', error);
    }
  }

  async eliminarProducto(id: number): Promise<void> {
    try {
      await this.inventarioService.eliminarProducto(id);
      console.log('Producto eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando producto:', error);
    }
  }

  async exportarInventario(): Promise<void> {
    try {
      const resultado = await this.inventarioService.exportarInventario();
      console.log('Exportación:', resultado);
    } catch (error) {
      console.error('Error exportando inventario:', error);
    }
  }

  async crearBackup(): Promise<void> {
    try {
      const resultado = await this.inventarioService.crearBackup();
      console.log('Backup:', resultado);
    } catch (error) {
      console.error('Error creando backup:', error);
    }
  }

  async abrirCarpetaDocumentos(): Promise<void> {
    try {
      await this.inventarioService.abrirCarpetaDocumentos();
    } catch (error) {
      console.error('Error abriendo carpeta:', error);
    }
  }

  async minimizarVentana(): Promise<void> {
    try {
      await this.tauriService.minimizarVentana();
    } catch (error) {
      console.error('Error minimizando ventana:', error);
    }
  }

  getVersion(): string {
    return this.esDesktop ? 'Desktop' : 'Web';
  }

  getTotalProductos(): number {
    return this.inventarioService.getTotalProductos();
  }

  getTotalValor(): number {
    return this.inventarioService.getTotalValorInventario();
  }

  getProductosBajoStock(): Producto[] {
    return this.inventarioService.getProductosBajoStock();
  }
}
