import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import {
  InventoryService,
  InventoryItem,
  Filters,
} from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/shared/notification.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, NgIconsModule, FilterBarComponent],
  templateUrl: './inventory-list.component.html',
})
export class InventoryListComponent implements OnInit {
  products: InventoryItem[] = [];
  pagedProducts: InventoryItem[] = [];
  currentPage = 1;
  pageSize = 5;

  constructor(
    private inventoryService: InventoryService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadInventory();
  }

  loadInventory(filters?: Filters) {
    this.inventoryService.getInventory(filters).subscribe({
      next: (data) => {
        this.products = data;
        this.setPage(1);
        this.notificationService.checkNotifications(data);
      },
      error: () =>
        this.notificationService.showError('Error al cargar inventario'),
    });
  }

  setPage(page: number) {
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedProducts = this.products.slice(start, end);
  }

  get totalPages() {
    return Math.ceil(this.products.length / this.pageSize);
  }

  applyFilters(filters: Filters) {
    this.loadInventory(filters);
  }
}
