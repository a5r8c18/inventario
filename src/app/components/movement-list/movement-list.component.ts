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
    if (!movement || !movement.purchase) {
      this.notificationService.showError('Este movimiento no tiene una compra asociada');
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
          error: () =>
            this.notificationService.showError('Error al registrar devolución'),
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
    const label =
      prompt('Ingrese un comentario para la salida (opcional):') || '';
    this.movementsService
      .registerExit({
        productCode: movement.product?.productCode,
        quantity: cantidadNum,
        label,
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
      this.notificationService.showError('Código inválido');
      return;
    }
    // Aquí podrías consultar si el producto existe en inventario
    // Si no existe, pide nombre y descripción
    const productName = prompt('Ingrese el nombre del producto:');
    const productDescription = prompt('Ingrese la descripción del producto:');
    const quantityStr = prompt('Ingrese la cantidad a ingresar:', '1');
    const quantity = Number(quantityStr);
    if (!quantityStr || isNaN(quantity) || quantity <= 0) {
      this.notificationService.showError('Cantidad inválida');
      return;
    }
    const label =
      prompt('Ingrese un comentario para la entrada (opcional):') || '';
    this.movementsService
      .registerDirectEntry({
        productCode,
        productName,
        productDescription,
        quantity,
        label,
      })
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Entrada registrada');
          this.loadMovements();
        },
        error: () =>
          this.notificationService.showError('Error al registrar entrada'),
      });
  }
}

