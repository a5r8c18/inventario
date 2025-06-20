import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { NgIconsModule } from '@ng-icons/core';
import { PurchasesService } from '../../services/purchases/purchases.service';
import { NotificationService } from '../../services/shared/notification.service';

@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconsModule],
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
      products: this.fb.array<FormGroup>([]), // Especificar que el FormArray contiene FormGroup
    });

    this.addProduct();
  }

  // Getter con tipado explícito para devolver FormArray<FormGroup>
  get products(): FormArray<FormGroup> {
    return this.purchaseForm.get('products') as FormArray<FormGroup>;
  }

  // Custom validator for expirationDate
  private dateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Allow empty value (optional)
    }
    const date = new Date(control.value);
    return isNaN(date.getTime()) ? { invalidDate: true } : null;
  }

  addProduct() {
    const productGroup = this.fb.group({
      code: ['', Validators.required],
      description: ['', Validators.required],
      unit: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      amount: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
      expirationDate: ['', this.dateValidator], // Optional with date validation
    });

    this.products.push(productGroup);
    this.subscribeToProductChanges(productGroup);
  }

  private subscribeToProductChanges(product: FormGroup) {
    product.get('quantity')?.valueChanges.subscribe(() => this.updateAmount(product));
    product.get('unitPrice')?.valueChanges.subscribe(() => this.updateAmount(product));
  }

  private updateAmount(product: FormGroup) {
    const quantity = product.get('quantity')?.value || 0;
    const unitPrice = product.get('unitPrice')?.value || 0;
    const amount = quantity * unitPrice;
    product.get('amount')?.setValue(amount, { emitEvent: false });
  }

  onSubmit() {
    if (this.purchaseForm.valid) {
      // Enable amount fields and transform expirationDate
      this.products.controls.forEach((product) => {
        product.get('amount')?.enable({ emitEvent: false });
        // Transform expirationDate: empty string to null, valid date to ISO string
        const expirationDate = product.get('expirationDate')?.value;
        if (!expirationDate) {
          product.get('expirationDate')?.setValue(null, { emitEvent: false });
        } else {
          const date = new Date(expirationDate);
          if (!isNaN(date.getTime())) {
            product.get('expirationDate')?.setValue(date.toISOString(), { emitEvent: false });
          }
        }
      });

      console.log('Datos enviados al backend:', this.purchaseForm.value);
      this.purchasesService.createPurchase(this.purchaseForm.value).subscribe({
        next: () => {
          this.notificationService.showSuccess('Compra registrada exitosamente');
          this.purchaseForm.reset();
          this.products.clear();
          this.addProduct();
        },
        error: (error) => {
          console.error('Error al registrar la compra:', error);
          this.notificationService.showError('Error al registrar la compra');
        },
      });
    } else {
      this.notificationService.showError('Por favor, completa todos los campos obligatorios');
    }
  }
  removeProduct(index: number) {
    this.products.removeAt(index);
  }
}