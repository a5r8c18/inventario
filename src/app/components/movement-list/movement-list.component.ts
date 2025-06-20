import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconsModule } from '@ng-icons/core';
import { MovementsService, MovementItem, Filters } from '../../services/movements/movements.service';
import { NotificationService } from '../../services/shared/notification.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-movement-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconsModule, FilterBarComponent, ModalComponent],
  templateUrl: './movement-list.component.html',
})
export class MovementListComponent implements OnInit {
  movements: any[] = [];
  pagedMovements: any[] = [];
  currentPage = 1;
  pageSize = 5;

  constructor(
    private movementsService: MovementsService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadMovements();
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

  applyFilters(filters: Filters) {
    this.loadMovements(filters);
  }

  selectedMovement: MovementItem | null = null;
  returnComment: string = '';
  isReturnModalOpen = false;
  isExitModalOpen = false;
  exitQuantity: number | null = null;

  openReturnModal(movement: MovementItem) {
    this.selectedMovement = movement;
    this.returnComment = '';
    this.isReturnModalOpen = true;
  }

  confirmReturn() {
    if (!this.returnComment.trim()) {
      this.notificationService.showError('El comentario es obligatorio');
      return;
    }

    if (!this.selectedMovement?.purchase?.id) {
      this.notificationService.showError('El movimiento seleccionado no tiene información de compra válida');
      return;
    }

    this.movementsService
      .createReturn(this.selectedMovement.purchase.id, this.returnComment)
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Devolución registrada');
          this.selectedMovement = null;
          this.returnComment = '';
          this.isReturnModalOpen = false;
          this.loadMovements();
        },
        error: () =>
          this.notificationService.showError('Error al registrar devolución'),
      });
  }

  openExitModal(movement: MovementItem) {
    const cantidad = prompt('Ingrese la cantidad a dar de salida:', '1');
    const cantidadNum = Number(cantidad);
    
    if (!cantidad || isNaN(cantidadNum) || cantidadNum <= 0) {
      this.notificationService.showError('Cantidad inválida');
      return;
    }

    if (!movement.stock || cantidadNum > movement.stock) {
      this.notificationService.showError('La cantidad no puede superar el stock disponible');
      return;
    }

    this.selectedMovement = movement;
    this.exitQuantity = cantidadNum;
    this.isExitModalOpen = true;
  }

  confirmExit() {
    if (!this.selectedMovement || this.exitQuantity === null) return;

    const label = prompt('Ingrese un comentario para la salida:') || 'Sin comentario';
    if (!label) {
      this.notificationService.showError('Por favor ingrese un comentario');
      return;
    }

    this.movementsService.registerExit({
      productCode: this.selectedMovement.product.productCode,
      quantity: this.exitQuantity,
      label: label
    }).subscribe(
      () => {
        this.notificationService.showSuccess('Salida registrada');
        this.selectedMovement = null;
        this.exitQuantity = null;
        this.isExitModalOpen = false;
        this.loadMovements();
      },
      (error) => {
        this.notificationService.showError(error.message || 'Error al registrar salida');
      }
    );
  }

  openDirectEntryModal() {
    const productCode = prompt('Ingrese el código del producto:');
    if (!productCode) {
      this.notificationService.showError('El código del producto es requerido');
      return;
    }
    const quantity = prompt('Ingrese la cantidad:', '1');
    const quantityNum = Number(quantity);
    if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
      this.notificationService.showError('Cantidad inválida');
      return;
    }
    const comment = prompt('Ingrese un comentario para la entrada directa:') || 'Sin comentario';
    this.movementsService
      .registerDirectEntry({
        productCode,
        quantity: quantityNum,
        comment,
      })
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Entrada directa registrada');
          this.loadMovements();
        },
        error: () =>
          this.notificationService.showError('Error al registrar entrada directa'),
      });
  }
}
