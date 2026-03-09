import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { Subscription } from 'rxjs';
import {
  InventoryService,
  InventoryItem,
  Filters,
} from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/shared/notification.service';
import { TauriService } from '../../services/tauri.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, NgIconsModule, FilterBarComponent],
  templateUrl: './inventory-list.component.html',
})
export class InventoryListComponent implements OnInit, OnDestroy {
  products: InventoryItem[] = [];
  pagedProducts: InventoryItem[] = [];
  currentPage = 1;
  pageSize = 5;
  private refreshSubscription: Subscription | undefined;

  constructor(
    private inventoryService: InventoryService,
    private notificationService: NotificationService,
    private tauriService: TauriService
  ) {}

  ngOnInit() {
    this.loadInventory();
    // Subscribe to refresh events
    this.refreshSubscription = this.notificationService.refresh$.subscribe(() => {
      this.loadInventory();
    });
  }

  loadInventory(filters?: Filters) {
    this.inventoryService.getInventory(filters).subscribe({
      next: (data) => {
        // Ensure data is always an array
        this.products = Array.isArray(data) ? data : [];
        this.setPage(1);
        this.notificationService.checkNotifications(this.products);
      },
      error: () =>
        this.notificationService.showError('Error al cargar inventario'),
    });
  }

  setPage(page: number) {
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    // Ensure products is an array before calling slice
    this.pagedProducts = Array.isArray(this.products) ? this.products.slice(start, end) : [];
  }

  get totalPages() {
    return Math.ceil(this.products.length / this.pageSize);
  }

  applyFilters(filters: Filters) {
    this.loadInventory(filters);
  }

  async exportToExcel() {
    try {
      const blob = await this.tauriService.exportToExcel('inventory');
      
      // Descargar archivo directamente como en los otros componentes
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.notificationService.showSuccess('Inventario exportado a Excel correctamente');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.notificationService.showError('Error al exportar a Excel');
    }
  }

  async exportToPdf() {
    try {
      const arrayBuffer = await this.tauriService.exportToPdf('inventory');
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.notificationService.showSuccess('Inventario exportado a PDF correctamente');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      this.notificationService.showError('Error al exportar a PDF');
    }
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }
}

