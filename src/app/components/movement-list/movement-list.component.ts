import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { MovementsService, MovementItem, Filters } from '../../services/movements/movements.service';
import { NotificationService } from '../../services/shared/notification.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';

@Component({
  selector: 'app-movement-list',
  standalone: true,
  imports: [CommonModule, NgIconsModule, FilterBarComponent],
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

  openReturnModal(movement: any) {
    // Verificar si el movimiento es válido para devolución
    if (!movement || !movement.purchase || !movement.purchase.id) {
      this.notificationService.showError(
        'Este movimiento no puede ser devuelto'
      );
      return;
    }

    const comment = prompt('Ingrese el comentario para la devolución:');
    if (comment) {
      this.movementsService
        .createReturn(movement.purchase.id, comment)
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Devolución registrada');
            this.loadMovements();
          },
          error: (error) => {
            console.error('Error en devolución:', error);
            this.notificationService.showError(
              error.error?.message || 'Error al registrar devolución'
            );
          },
        });
    } else {
      this.notificationService.showError(
        'El comentario es obligatorio para la devolución'
      );
    }
  }
  openExitModal(movement: any) {
    const cantidad = prompt('Ingrese la cantidad a dar de salida:', '1');
    const cantidadNum = Number(cantidad);
    if (!cantidad || isNaN(cantidadNum) || cantidadNum <= 0) {
      this.notificationService.showError('Cantidad inválida');
      return;
    }
    
    // Verificar si la cantidad de salida no supera el stock disponible
    if (cantidadNum > movement.stock) {
      this.notificationService.showError(
        `No hay suficiente stock para esta salida. Stock disponible: ${movement.stock}`
      );
      return;
    }
    const comment =
      prompt('Ingrese un comentario para la salida:') || 'Sin comentario';
    this.movementsService
      .registerExit({
        productCode: movement.product?.productCode,
        quantity: cantidadNum,
        label: 'Salida de inventario',
      })
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Salida registrada');
          this.loadMovements();
        },
        error: () =>
          this.notificationService.showError('Error al registrar salida'),
      });
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
