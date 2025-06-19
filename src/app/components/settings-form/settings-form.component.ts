import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { SettingsService } from '../../services/settings/settings.service';
import { NotificationService } from '../../services/shared/notification.service';

@Component({
  selector: 'app-settings-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIcon],
  templateUrl: './settings-form.component.html',
})
export class SettingsFormComponent implements OnInit {
  settingsForm: FormGroup;
  products: any[] = [];
  pagedProducts: any[] = [];
  currentPage = 1;
  pageSize = 8;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private notificationService: NotificationService
  ) {
    this.settingsForm = this.fb.group({
      productId: ['', Validators.required],
      stockLimit: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    this.settingsService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.setPage(1);
      },
      error: () =>
        this.notificationService.showError('Error al cargar productos'),
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

  onSubmit() {
    if (this.settingsForm.valid) {
      this.settingsService.setStockLimit(this.settingsForm.value).subscribe({
        next: () =>
          this.notificationService.showSuccess('Límite de stock actualizado'),
        error: () =>
          this.notificationService.showError('Error al actualizar límite'),
      });
    }
  }

  resetLimit(productId: string) {
    this.settingsService.resetStockLimit(productId).subscribe({
      next: () => {
        this.notificationService.showSuccess('Límite reestablecido');
        // Recarga la lista de productos para actualizar la tabla
        this.settingsService.getProducts().subscribe({
          next: (data) => (this.products = data),
        });
      },
      error: () =>
        this.notificationService.showError('Error al reestablecer límite'),
    });
  }
}
