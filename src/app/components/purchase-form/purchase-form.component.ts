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
      // Get form values BEFORE disabling the form
      const formValues = this.purchaseForm.value;
      
      console.log('🔍 Formulario válido:', this.purchaseForm.valid);
      console.log('🔍 Valores del formulario:', formValues);
      console.log('🔍 Estado de los campos principales:', {
        entity: this.purchaseForm.get('entity')?.value,
        warehouse: this.purchaseForm.get('warehouse')?.value,
        supplier: this.purchaseForm.get('supplier')?.value,
        document: this.purchaseForm.get('document')?.value
      });
      console.log('🔍 Productos:', this.products.controls.map((product, index) => ({
        index,
        code: product.get('code')?.value,
        description: product.get('description')?.value,
        quantity: product.get('quantity')?.value,
        unitPrice: product.get('unitPrice')?.value,
        unit: product.get('unit')?.value,
        expirationDate: product.get('expirationDate')?.value
      })));

      // Disable form to prevent multiple submissions
      this.purchaseForm.disable();
      
      try {
        // Enable amount fields and transform expirationDate
        this.products.controls.forEach((product) => {
          product.get('amount')?.enable({ emitEvent: false });
          // Transform expirationDate: empty string to null, keep valid date as yyyy-MM-dd
          const expirationDate = product.get('expirationDate')?.value;
          if (!expirationDate) {
            product.get('expirationDate')?.setValue(null, { emitEvent: false });
          } else if (typeof expirationDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) {
            // Already in yyyy-MM-dd format, keep as is to avoid timezone issues
          } else {
            const date = new Date(expirationDate);
            if (!isNaN(date.getTime())) {
              // Use UTC methods to avoid timezone shift
              const year = date.getUTCFullYear();
              const month = String(date.getUTCMonth() + 1).padStart(2, '0');
              const day = String(date.getUTCDate()).padStart(2, '0');
              product.get('expirationDate')?.setValue(`${year}-${month}-${day}`, { emitEvent: false });
            }
          }
        });

        console.log('Datos enviados al backend:', formValues);
        
        this.purchasesService.createPurchase(formValues).subscribe({
          next: (response) => {
            console.log('✅ Compra registrada exitosamente:', response);
            this.notificationService.showSuccess('Compra registrada exitosamente');
            this.notificationService.notifyRefresh(); // Notify other components to refresh
            this.resetForm();
          },
          error: (error) => {
            console.error('❌ Error al registrar la compra:', error);
            console.error('❌ Error details:', {
              message: error?.message,
              stack: error?.stack,
              name: error?.name,
              toString: error?.toString()
            });
            
            // Re-enable form
            this.purchaseForm.enable();
            
            // Show user-friendly error message
            const errorMessage = error?.message || 'Error desconocido al registrar la compra';
            this.notificationService.showError(errorMessage);
          },
          complete: () => {
            console.log('🔄 Purchase creation process completed');
          }
        });
      } catch (error) {
        console.error('❌ Error in onSubmit method:', error);
        this.purchaseForm.enable();
        this.notificationService.showError('Error inesperado al procesar la compra');
      }
    } else {
      this.notificationService.showError('Por favor, completa todos los campos obligatorios');
      this.markFormGroupTouched(this.purchaseForm);
    }
  }

  private resetForm() {
    try {
      this.purchaseForm.reset();
      this.products.clear();
      this.addProduct();
    } catch (error) {
      console.error('❌ Error resetting form:', error);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }
  removeProduct(index: number) {
    this.products.removeAt(index);
  }
}