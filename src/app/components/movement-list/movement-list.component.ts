import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconsModule, provideIcons } from '@ng-icons/core';
import {
  lucideRotateCcw,
  lucideFileText,
  lucideX,
  lucideCircleAlert,
  lucidePackage,
} from '@ng-icons/lucide';
import {
  MovementsService,
  MovementItem,
  Filters,
} from '../../services/movements/movements.service';
import { Subscription } from 'rxjs';
import { InventoryService } from '../../services/inventory/inventory.service';
import { NotificationService } from '../../services/shared/notification.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-movement-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIconsModule,
    FilterBarComponent,
    ModalComponent,
  ],
  providers: [
    provideIcons({
      lucideRotateCcw,
      lucideFileText,
      lucideX,
      lucideCircleAlert,
      lucidePackage,
    }),
  ],
  templateUrl: './movement-list.component.html',
})
export class MovementListComponent implements OnInit, OnDestroy {
  private refreshSub!: Subscription;
  movements: any[] = [];
  pagedMovements: any[] = [];
  currentPage = 1;
  pageSize = 5;

  // Modal states
  isConfirmReturnModalOpen = false;
  isReturnModalOpen = false;
  returnComment = '';
  selectedMovementForReturn: any = null;

  // Direct Entry Modal states
  isDirectEntryModalOpen = false;
  directEntryData = {
    productCode: '',
    productName: '',
    productDescription: '',
    quantity: 1,
    label: '',
  };

  // Exit Modal states
  isExitModalOpen = false;
  selectedMovementForExit: any = null;
  exitData = {
    quantity: 1,
    label: '',
    entity: '',
    warehouse: '',
    unitPrice: 0,
    unit: '',
  };

  constructor(
    private movementsService: MovementsService,
    private inventoryService: InventoryService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadMovements();
    this.refreshSub = this.notificationService.refresh$.subscribe(() => this.loadMovements());
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
  }

  loadMovements(filters?: Filters) {
    this.movementsService.getMovements(filters).subscribe({
      next: (data) => {
        console.log('Received movements:', data);
        this.movements = data;
        this.setPage(1);
      },
      error: () =>
        this.notificationService.showError('Error al cargar movimientos'),
    });
  }

  setPage(page: number) {
    this.currentPage = page;
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedMovements = this.movements.slice(start, end);
  }

  get totalPages() {
    return Math.ceil(this.movements.length / this.pageSize);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  translateComment(comment: string): string {
    if (!comment) return 'Sin comentario';
    
    // Translate common English patterns to Spanish
    const translations: { [key: string]: string } = {
      'Purchase entry:': 'Entrada de compra:',
      'Direct entry:': 'Entrada directa:',
      'Exit:': 'Salida:',
      'Exit to': 'Salida a',
      'Return:': 'Devolución:',
      'Purchase return:': 'Devolución de compra:',
      '- venta': '- venta',
      'dede': 'dede'
    };
    
    let translatedComment = comment;
    Object.entries(translations).forEach(([english, spanish]) => {
      translatedComment = translatedComment.replace(english, spanish);
    });
    
    return translatedComment;
  }

  applyFilters(filters: Filters) {
    this.loadMovements(filters);
  }

  openReturnModal(movement: any) {
    // Verificar si el movimiento es de tipo 'entry' (entrada)
    if (movement.type !== 'entry') {
      this.notificationService.showError(
        'Solo se pueden devolver movimientos de entrada'
      );
      return;
    }

    // Verificar si hay una compra asociada
    if (!movement.purchaseId) {
      this.notificationService.showError(
        'Este movimiento no tiene una compra asociada'
      );
      return;
    }

    // Abrir modal de confirmación
    this.selectedMovementForReturn = movement;
    this.isConfirmReturnModalOpen = true;
  }

  closeConfirmReturnModal() {
    this.isConfirmReturnModalOpen = false;
    this.selectedMovementForReturn = null;
  }

  confirmReturnAction() {
    this.isConfirmReturnModalOpen = false;
    this.returnComment = '';
    this.isReturnModalOpen = true;
  }

  closeReturnModal() {
    this.isReturnModalOpen = false;
    this.returnComment = '';
    this.selectedMovementForReturn = null;
  }

  confirmReturn() {
    if (!this.returnComment || this.returnComment.trim() === '') {
      this.notificationService.showError(
        'El comentario es obligatorio para la devolución'
      );
      return;
    }

    this.movementsService
      .createReturn(
        this.selectedMovementForReturn.purchaseId,
        this.returnComment
      )
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Devolución registrada');
          this.loadMovements();
          this.closeReturnModal();
          // Refrescar notificaciones después de la devolución
          this.refreshStockNotifications();
        },
        error: () => {
          this.notificationService.showError('Error al registrar devolución');
        },
      });
  }

  /**
   * Refresca las notificaciones de stock consultando el inventario actualizado
   */
  private refreshStockNotifications() {
    this.inventoryService.getInventory().subscribe({
      next: (inventory) => {
        this.notificationService.refreshNotifications(inventory);
      },
      error: () => {
        console.error('Error al refrescar notificaciones de inventario');
      },
    });
  }
  openExitModal(movement: any) {
    this.selectedMovementForExit = movement;
    this.exitData = {
      quantity: 1,
      label: '',
      entity: movement.product?.entity || '',
      warehouse: movement.product?.warehouse || '',
      unitPrice: movement.product?.unitPrice || 0, // Costo de entrada (solo lectura)
      unit: movement.product?.productUnit || '',
    };
    this.isExitModalOpen = true;
  }

  closeExitModal() {
    this.isExitModalOpen = false;
    this.selectedMovementForExit = null;
    this.exitData = {
      quantity: 1,
      label: '',
      entity: '',
      warehouse: '',
      unitPrice: 0,
      unit: '',
    };
  }

  async confirmExit() {
    if (!this.exitData.quantity || this.exitData.quantity <= 0) {
      this.notificationService.showError('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      await this.movementsService.registerExit({
        productCode: this.selectedMovementForExit.product?.productCode,
        quantity: this.exitData.quantity,
        reason: this.exitData.label,
        entity: this.exitData.entity,
        warehouse: this.exitData.warehouse,
        unit: this.exitData.unit,
      });

      this.notificationService.showSuccess('Salida registrada');
      this.loadMovements();
      this.closeExitModal();
      // Refrescar notificaciones después de la salida
      this.refreshStockNotifications();
    } catch (error) {
      console.error('Error registrando salida:', error);
      this.notificationService.showError('Error al registrar la salida');
    }
  }

  openDirectEntryModal() {
    this.directEntryData = {
      productCode: '',
      productName: '',
      productDescription: '',
      quantity: 1,
      label: '',
    };
    this.isDirectEntryModalOpen = true;
  }

  closeDirectEntryModal() {
    this.isDirectEntryModalOpen = false;
    this.directEntryData = {
      productCode: '',
      productName: '',
      productDescription: '',
      quantity: 1,
      label: '',
    };
  }

  confirmDirectEntry() {
    // Validaciones
    if (
      !this.directEntryData.productCode ||
      !this.directEntryData.productCode.trim()
    ) {
      this.notificationService.showError(
        'El código del producto es obligatorio'
      );
      return;
    }

    if (
      !this.directEntryData.productName ||
      !this.directEntryData.productName.trim()
    ) {
      this.notificationService.showError(
        'El nombre del producto es obligatorio'
      );
      return;
    }

    if (!this.directEntryData.quantity || this.directEntryData.quantity <= 0) {
      this.notificationService.showError('La cantidad debe ser mayor a 0');
      return;
    }

    this.movementsService
      .registerDirectEntry({
        productCode: this.directEntryData.productCode,
        productName: this.directEntryData.productName,
        productDescription: this.directEntryData.productDescription,
        quantity: this.directEntryData.quantity,
        label: this.directEntryData.label,
      })
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Entrada registrada');
          this.loadMovements();
          this.closeDirectEntryModal();
          // Refrescar notificaciones después de la entrada
          this.refreshStockNotifications();
        },
        error: () => {
          this.notificationService.showError('Error al registrar entrada');
        },
      });
  }
}
