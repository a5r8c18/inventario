import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgIcon, NgIconsModule } from '@ng-icons/core';
import { SettingsService } from '../../services/settings/settings.service';
import { NotificationService } from '../../services/shared/notification.service';
import { CompanyStateService } from '../../services/companies/company-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgIcon, NgIconsModule],
  templateUrl: './settings-form.component.html',
})
export class SettingsFormComponent implements OnInit, OnDestroy {
  settingsForm: FormGroup;
  products: any[] = [];
  pagedProducts: any[] = [];
  currentPage = 1;
  pageSize = 8;
  private companyChangeSubscription: Subscription | undefined;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private companyStateService: CompanyStateService
  ) {
    this.settingsForm = this.fb.group({
      productId: ['', Validators.required],
      stockLimit: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    this.loadProducts();
    
    // Subscribe to company changes
    this.companyChangeSubscription = this.companyStateService.activeCompany$.subscribe(() => {
      this.loadProducts();
    });
  }

  private loadProducts() {
    this.settingsService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.setPage(1);
      },
      error: () =>
        this.notificationService.showError('Error al cargar productos'),
    });
  }

  ngOnDestroy() {
    if (this.companyChangeSubscription) {
      this.companyChangeSubscription.unsubscribe();
    }
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
