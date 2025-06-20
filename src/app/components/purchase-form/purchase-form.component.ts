import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIconsModule } from '@ng-icons/core';
import { PurchasesService } from '../../services/purchases/purchases.service';
import { NotificationService } from '../../services/shared/notification.service';

@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconsModule], // Solo NgIconsModule
  templateUrl: './purchase-form.component.html',
})
export class PurchaseFormComponent {
  purchaseForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private purchasesService: PurchasesService,
    private notificationService: NotificationService
  ) {
    this.purchaseForm = this.fb.group({
      entity: ['', Validators.required],
      warehouse: ['', Validators.required],
      supplier: ['', Validators.required],
      document: ['', Validators.required],
      products: this.fb.array([]),
    });

    // Agrega un producto por defecto al iniciar
    this.addProduct();
  }

  get products() {
    return this.purchaseForm.get('products') as FormArray;
  }

  addProduct() {
    this.products.push(
      this.fb.group({
        code: ['', Validators.required],
        description: ['', Validators.required],
        unit: ['', Validators.required], // <-- Nuevo campo
        quantity: [0, [Validators.required, Validators.min(1)]],
        unitPrice: [0, [Validators.required, Validators.min(0)]],
        amount: [0, [Validators.required, Validators.min(0)]], // <-- Nuevo campo
        expirationDate: [''],
      })
    );
  }

  onSubmit() {
    console.log('Datos enviados al backend:', this.purchaseForm.value); // <-- Aquí ves el objeto completo
    if (this.purchaseForm.valid) {
      this.purchasesService.createPurchase(this.purchaseForm.value).subscribe({
        next: () => {
          this.notificationService.showSuccess(
            'Compra registrada exitosamente'
          );
          this.purchaseForm.reset();
        },
        error: () =>
          this.notificationService.showError('Error al registrar la compra'),
      });
    } else {
      this.notificationService.showError(
        'Por favor, completa todos los campos obligatorios'
      );
    }
  }
}

